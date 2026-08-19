import { afterAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";
import * as t from "@/lib/db/schema";
import type { AdminTransaction } from "@/lib/admin/db";
import * as write from "@/lib/admin/evaluation-write";
import { publishEvaluation } from "@/lib/admin/publication";

/**
 * Publication is serialized against concurrent editorial mutation.
 *
 * ── The window this exists to prove closed ─────────────────────────────────
 *
 * Publication validates a draft and then finalizes it. If nothing holds a
 * conflicting lock across both halves, an ordinary editorial write can commit
 * in between, and the row that becomes Published is not the row that passed the
 * gate.
 *
 * The database catches the part it knows about — `assert_published_evaluation_
 * complete` re-reads the children, so a newly created *gap* is still refused.
 * It has no opinion at all about prose, which is why these tests use prose: a
 * banned phrase is invisible to every constraint and visible to the gate.
 *
 * ── Why this cannot be written sequentially ────────────────────────────────
 *
 * Two real connections, and one transaction is deliberately left open while the
 * other runs. `trg_evaluation_child_immutable` takes `FOR SHARE` on the owning
 * evaluation before permitting a child write, so an editor holds a share lock
 * on the evaluation row from its INSERT until it commits. `publishEvaluation`
 * takes `FOR UPDATE` on that same row before it reads anything, which conflicts.
 *
 * WITHOUT that `FOR UPDATE`, the FIRST test fails in a specific and instructive
 * way: the publisher's readiness reads take no locks, so they see the pre-insert
 * snapshot, pass, and the publisher blocks at its status UPDATE instead. When
 * the editor commits, the UPDATE proceeds and the evaluation is published
 * carrying a banned phrase that nothing ever validated. That test is the
 * non-vacuous one, and removing the lock is how it is checked.
 *
 * The second test does NOT distinguish the two designs, and saying so is the
 * point of this paragraph. Publication's status UPDATE takes a row lock of its
 * own, so a second publisher blocks either way; what that test pins is that
 * mutual exclusion exists at all and that neither publisher half-applies. Where
 * the lock is taken is the first test's business.
 *
 * ── Nothing commits ────────────────────────────────────────────────────────
 *
 * These run against the shared seeded corpus, so every transaction rolls back,
 * and the one committed fixture row — a revision, which both connections must
 * genuinely see — is deleted in a `finally`.
 *
 * An earlier version let a publication commit in order to assert "exactly one
 * of two wins". It corrupted the fixtures whenever anything went wrong, and the
 * damage surfaced as failures in later, unrelated files pointing nowhere near
 * the cause. The `afterAll` below is the standing guard against that returning.
 */

const URL = process.env.DATABASE_URL;
if (!URL) throw new Error("DATABASE_URL is required for the db-read suite.");

/** Independent connections: the point is that they are not the same session. */
const editorClient = postgres(URL, { max: 1, onnotice: () => {} });
const publisherClient = postgres(URL, { max: 1, onnotice: () => {} });
const observerClient = postgres(URL, { max: 1, onnotice: () => {} });
const editorDb = drizzle(editorClient, { schema });
const publisherDb = drizzle(publisherClient, { schema });

afterAll(async () => {
  try {
    const [counts] = await observerClient<
      { published: string; superseded: string; drafts: string }[]
    >`
      SELECT
        count(*) FILTER (WHERE status = 'published')  AS published,
        count(*) FILTER (WHERE status = 'superseded') AS superseded,
        count(*) FILTER (WHERE status IN ('draft', 'review')) AS drafts
      FROM evaluations
    `;
    if (counts!.superseded !== "0" || counts!.drafts !== "0") {
      throw new Error(
        `This suite left the seeded corpus modified: ${counts!.published} published, ` +
          `${counts!.superseded} superseded, ${counts!.drafts} draft/review. ` +
          "Restore it before trusting any other db-read result.",
      );
    }
  } finally {
    await Promise.all([
      editorClient.end({ timeout: 5 }),
      publisherClient.end({ timeout: 5 }),
      observerClient.end({ timeout: 5 }),
    ]);
  }
});

/** Thrown to roll a transaction back once it has proved what it needed to. */
class Rollback extends Error {}

const BANNED = "You will love every minute of this one.";

/** How long a test may take. Generously above the polling bounds below. */
const TIMEOUT = 30_000;

/** Wait until `pid` is actually blocked on a lock, rather than guessing. */
async function waitUntilBlocked(pid: number): Promise<boolean> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const rows = await observerClient`
      SELECT wait_event_type FROM pg_stat_activity WHERE pid = ${pid}
    `;
    if (rows[0]?.wait_event_type === "Lock") return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

/**
 * A committed revision, deleted afterwards whatever happens.
 *
 * Committed because two connections have to see the same row, which is the
 * whole premise. Deletable because nothing here ever publishes it — a published
 * row is immutable by trigger and could not be cleaned up at all.
 */
async function withCommittedRevision(
  body: (revisionId: string, scopeLabel: string) => Promise<void>,
): Promise<void> {
  const source = (
    await observerClient<{ id: string; label: string }[]>`
      SELECT e.id, s.label
        FROM evaluations e
        JOIN profile_scopes s ON s.id = e.scope_id
       WHERE e.status = 'published'
       LIMIT 1
    `
  )[0]!;
  const sourceId = source.id;

  const revisionId = await editorDb.transaction((tx) =>
    write.createRevision(
      tx as unknown as AdminTransaction,
      sourceId,
      "editor@example.com",
      "Concurrency fixture",
    ),
  );

  try {
    await body(revisionId, source.label);
  } finally {
    await observerClient`DELETE FROM evaluations WHERE id = ${revisionId}`;
  }
}

/**
 * Run `assertions` with two transactions in flight, and guarantee both are
 * settled before returning.
 *
 * The `finally` is the important part. A failing assertion must not leave a
 * transaction open: the fixture delete would then block on its locks, time the
 * test out, and cascade into every later file — which is exactly how the first
 * draft of this suite failed.
 */
async function withBothSettled(
  release: () => void,
  inFlight: readonly Promise<unknown>[],
  assertions: () => Promise<void>,
): Promise<void> {
  try {
    await assertions();
  } finally {
    release();
    await Promise.allSettled(inFlight);
  }
}

describe("Publication serializes against editorial mutation", () => {
  it("refuses to finalize a snapshot an editor changed after the gate read it", async () => {
    await withCommittedRevision(async (revisionId, scopeLabel) => {
      const publisherPid = (
        await publisherClient<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      )[0]!.pid;

      let releaseEditor!: () => void;
      const editorHolding = new Promise<void>((resolve) => {
        releaseEditor = resolve;
      });

      // The editor writes a child row and holds its transaction open. The share
      // lock on the evaluation row is held from the INSERT until it commits.
      /*
       * The editor must hold its share lock BEFORE the publisher starts.
       *
       * Without this signal the two race: if the publisher reaches its
       * `FOR UPDATE` first it simply succeeds, the editor blocks instead, and
       * the poll below watches a connection that is never going to wait —
       * failing after the full polling window with a timeout rather than a
       * diagnosis. Starting the publisher only once the editor is holding makes
       * the interleaving the one this test is about.
       */
      let editorHolding2!: () => void;
      const editorIsHolding = new Promise<void>((resolve) => {
        editorHolding2 = resolve;
      });

      const editorTransaction = editorDb.transaction(async (tx) => {
        await tx.insert(t.profileBlocks).values({
          evaluationId: revisionId,
          blockType: "know_before",
          itemOrder: 900,
          text: BANNED,
        });
        editorHolding2();
        await editorHolding;
      });

      await editorIsHolding;

      let refusal: string | null = null;
      let published = false;
      const publication = publisherDb
        .transaction(async (tx) => {
          await publishEvaluation(
            tx as unknown as AdminTransaction,
            revisionId,
            { spoilerReviewed: true, scopeConfirmation: scopeLabel },
          );
          // Reaching here means the gate passed — the failure this test exists
          // to catch. Roll back regardless, so the fixture stays deletable.
          published = true;
          throw new Rollback();
        })
        .catch((error: unknown) => {
          if (error instanceof Rollback) return;
          refusal = error instanceof Error ? error.message : String(error);
        });

      await withBothSettled(
        releaseEditor,
        [editorTransaction, publication],
        async () => {
          // Genuinely blocked, not merely slow. Asserted rather than assumed,
          // because if it is false the rest of the test proves nothing.
          expect(await waitUntilBlocked(publisherPid)).toBe(true);
        },
      );

      // The publisher resumed after the editor committed, re-read the row it
      // had locked, and found prose the gate rejects. Without the lock it would
      // have validated the pre-insert snapshot and published this.
      expect(published).toBe(false);
      expect(refusal).toContain("not ready to publish");

      const status = (
        await observerClient<{ status: string }[]>`
          SELECT status FROM evaluations WHERE id = ${revisionId}
        `
      )[0]!.status;
      expect(status).toBe("draft");
    });
  }, TIMEOUT);

  /**
   * Two Publish submissions for one evaluation cannot interleave.
   *
   * What the loser is TOLD is not a concurrency question, and is asserted
   * without concurrency by "refuses an evaluation that is already published" in
   * publication.test.ts. What needs two connections is the mutual exclusion
   * itself, observed in `pg_stat_activity` rather than inferred from an outcome.
   */
  it("blocks a second publisher while the first holds the evaluation", async () => {
    await withCommittedRevision(async (revisionId, scopeLabel) => {
      const publisherPid = (
        await publisherClient<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      )[0]!.pid;

      let releaseFirst!: () => void;
      const firstHolding = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });

      // Same determinism as above: the first publisher must already hold the
      // row before the second one starts, or the two simply race and the poll
      // watches whichever connection happens to have lost.
      let firstIsHolding!: () => void;
      const firstReady = new Promise<void>((resolve) => {
        firstIsHolding = resolve;
      });

      const first = editorDb
        .transaction(async (tx) => {
          await publishEvaluation(
            tx as unknown as AdminTransaction,
            revisionId,
            { spoilerReviewed: true, scopeConfirmation: scopeLabel },
          );
          firstIsHolding();
          await firstHolding;
          throw new Rollback();
        })
        .catch((error: unknown) => {
          if (!(error instanceof Rollback)) throw error;
        });

      await firstReady;

      const second = publisherDb
        .transaction(async (tx) => {
          await publishEvaluation(
            tx as unknown as AdminTransaction,
            revisionId,
            { spoilerReviewed: true, scopeConfirmation: scopeLabel },
          );
          throw new Rollback();
        })
        .catch((error: unknown) => {
          if (!(error instanceof Rollback)) throw error;
        });

      await withBothSettled(releaseFirst, [first, second], async () => {
        expect(await waitUntilBlocked(publisherPid)).toBe(true);
      });

      // Nothing committed: the fixture is still a draft and still deletable.
      const status = (
        await observerClient<{ status: string }[]>`
          SELECT status FROM evaluations WHERE id = ${revisionId}
        `
      )[0]!.status;
      expect(status).toBe("draft");
    });
  }, TIMEOUT);
});
