import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDatabase, getDatabase } from "@/lib/db/client";
import { readPublishedProfiles } from "@/lib/db/read-profiles";
import { buildProfileView } from "@/lib/profile/build";
import { RUBRIC_V1 } from "@/lib/rubric";

/**
 * What the public read path resolves, and what it refuses to.
 *
 * The parity suite proves the reader reproduces the approved corpus. This one
 * proves the selection rules around it, against states the seeded corpus does
 * not contain: draft and review evaluations, superseded history, a second
 * current scope, a draft-only scope, and platform overrides.
 *
 * Each test builds its own state inside a transaction it rolls back, so the
 * seeded database is left exactly as `db:setup` made it.
 */

const db = getDatabase();
afterAll(closeDatabase);

/** The published corpus as the page sees it: assembled ProfileViews. */
async function read() {
  const records = await readPublishedProfiles(RUBRIC_V1.version);
  return records.map(buildProfileView);
}

/**
 * Run SQL, read, then undo.
 *
 * A rollback rather than a cleanup script: the immutability triggers make
 * published rows genuinely un-deletable, which is the point of them, so a test
 * that published something could not tidy up after itself any other way.
 */
async function withState<T>(
  setup: string,
  body: () => Promise<T>,
): Promise<T> {
  await db.execute(sql.raw("BEGIN"));
  try {
    // `SET CONSTRAINTS ALL IMMEDIATE` forces the deferred constraint triggers
    // to run here rather than at a COMMIT that never comes. Without it a
    // rolled-back transaction silently skips exactly the invariants these tests
    // exist to prove.
    await db.execute(sql.raw(`${setup}\nSET CONSTRAINTS ALL IMMEDIATE;`));
    return await body();
  } finally {
    await db.execute(sql.raw("ROLLBACK"));
  }
}

/**
 * The message of a rejected query, including the Postgres error underneath.
 *
 * Drizzle wraps a driver error in "Failed query: …", so asserting on the
 * wrapper alone would pass for any failure at all — including the wrong one.
 */
async function rejectionOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    const cause = (error as { cause?: { message?: string } }).cause;
    return `${(error as Error).message} ${cause?.message ?? ""}`;
  }
  throw new Error("expected the query to be rejected, but it succeeded");
}

const RETURNAL_GAME = `(SELECT id FROM games WHERE slug='returnal')`;
const RETURNAL_SCOPE = `(SELECT ps.id FROM profile_scopes ps JOIN games g ON g.id=ps.game_id WHERE g.slug='returnal' AND ps.key='default')`;

/** A complete, publishable evaluation on a named scope of Returnal. */
function completeEvaluation(
  scopeRef: string,
  versionNumber: number,
  status: "draft" | "review" | "published",
): string {
  return `
    INSERT INTO evaluations (
      game_id, scope_id, rubric_version, version_number, edition_scope, mode_scope,
      platform_scope, build_or_patch_scope, status, evidence_status, confidence,
      evidence_cutoff_at, release_context, one_line_experience, primary_pull,
      primary_risk, score_provenance, calibration_round
    ) VALUES (
      ${RETURNAL_GAME}, ${scopeRef}, '1.0', ${versionNumber}, 'Base game', 'Test mode',
      ARRAY['PC'], 'Test build', 'draft', 'verified', 'medium',
      '2026-08-06', 'Post-release', 'A test evaluation.', 'A test pull.',
      'A test risk.', 'calibration', 'round_1'
    );
    INSERT INTO subcriterion_scores (evaluation_id, subcriterion_id, score, rationale)
    SELECT e.id, s.id, 1, 'test rationale'
    FROM evaluations e
    JOIN dimensions d ON d.rubric_version = e.rubric_version
    JOIN subcriteria s ON s.dimension_id = d.id
    WHERE e.scope_id = ${scopeRef} AND e.version_number = ${versionNumber};
    INSERT INTO dimension_assessments (evaluation_id, dimension_id, confidence)
    SELECT e.id, d.id, 'medium'
    FROM evaluations e
    JOIN dimensions d ON d.rubric_version = e.rubric_version
    WHERE e.scope_id = ${scopeRef} AND e.version_number = ${versionNumber};
    INSERT INTO profile_blocks (evaluation_id, block_type, item_order, text)
    SELECT e.id, b.block_type, b.item_order, 'A test bullet.'
    FROM evaluations e,
      (VALUES ('great_fit'::block_type,1),('great_fit',2),('know_before',1),
              ('know_before',2),('probably_not',1),('probably_not',2)) AS b(block_type,item_order)
    WHERE e.scope_id = ${scopeRef} AND e.version_number = ${versionNumber};
    ${
      status === "draft"
        ? ""
        : status === "review"
          ? `UPDATE evaluations SET status='review' WHERE scope_id = ${scopeRef} AND version_number = ${versionNumber};`
          : `UPDATE evaluations SET status='published', published_at=now() WHERE scope_id = ${scopeRef} AND version_number = ${versionNumber};`
    }
  `;
}

const SECOND_SCOPE = `(SELECT ps.id FROM profile_scopes ps JOIN games g ON g.id=ps.game_id WHERE g.slug='returnal' AND ps.key='wintermute')`;
const CREATE_SECOND_SCOPE = `
  INSERT INTO profile_scopes (game_id, key, label, summary, is_primary, display_order)
  VALUES (${RETURNAL_GAME}, 'wintermute', 'Wintermute', 'A second evaluated experience.', false, 2);
`;

beforeEach(async () => {
  // Every test starts from the seeded state; nothing leaks between them.
  const profiles = await read();
  expect(profiles).toHaveLength(3);
});

describe("Non-public evaluations", () => {
  it("excludes a draft, even at a higher version than the published row", async () => {
    // The reason selection is never "latest": a draft is routinely the newest
    // row in its series and is not public.
    const profiles = await withState(
      completeEvaluation(RETURNAL_SCOPE, 9, "draft"),
      read,
    );
    expect(profiles).toHaveLength(3);
    const returnal = profiles.find((p) => p.game.slug === "returnal")!;
    expect(returnal.evaluation.versionNumber).toBe(1);
    expect(returnal.evaluation.status).toBe("published");
  });

  it("excludes a review-state evaluation", async () => {
    const profiles = await withState(
      completeEvaluation(RETURNAL_SCOPE, 9, "review"),
      read,
    );
    expect(profiles).toHaveLength(3);
    expect(
      profiles.find((p) => p.game.slug === "returnal")!.evaluation
        .versionNumber,
    ).toBe(1);
  });

  it("treats a superseded evaluation as history, not as a current profile", async () => {
    // v1 becomes history and v2 becomes current. One profile, not two, and the
    // superseded row is preserved rather than deleted.
    //
    // Supersede before publishing: the live-row index is a unique *index*, not
    // a deferrable constraint, so the old row has to step aside first. That
    // ordering is the contract, not a test convenience.
    const profiles = await withState(
      `
      SET CONSTRAINTS ALL DEFERRED;
      ${completeEvaluation(RETURNAL_SCOPE, 2, "draft")}
      UPDATE evaluations SET supersedes_evaluation_id =
        (SELECT id FROM evaluations WHERE scope_id = ${RETURNAL_SCOPE} AND version_number = 1)
        WHERE scope_id = ${RETURNAL_SCOPE} AND version_number = 2;
      UPDATE evaluations SET status='superseded'
        WHERE scope_id = ${RETURNAL_SCOPE} AND version_number = 1;
      UPDATE evaluations SET status='published', published_at=now()
        WHERE scope_id = ${RETURNAL_SCOPE} AND version_number = 2;
      `,
      read,
    );
    expect(profiles).toHaveLength(3);
    const returnal = profiles.filter((p) => p.game.slug === "returnal");
    expect(returnal).toHaveLength(1);
    expect(returnal[0]!.evaluation.versionNumber).toBe(2);
  });

  it("excludes an evaluation published under a different rubric version", async () => {
    const profiles = await read();
    for (const profile of profiles) {
      expect(profile.evaluation.rubricVersion).toBe(RUBRIC_V1.version);
    }
  });
});

describe("Several current scopes for one game", () => {
  it("returns one profile per published scope", async () => {
    const profiles = await withState(
      CREATE_SECOND_SCOPE + completeEvaluation(SECOND_SCOPE, 1, "published"),
      read,
    );
    const returnal = profiles.filter((p) => p.game.slug === "returnal");
    expect(returnal.map((p) => p.scope.key).sort()).toEqual([
      "default",
      "wintermute",
    ]);
    // Both are version 1 of their own series, and both are current.
    expect(returnal.every((p) => p.evaluation.versionNumber === 1)).toBe(true);
  });

  it("marks exactly one of them primary", async () => {
    const profiles = await withState(
      CREATE_SECOND_SCOPE + completeEvaluation(SECOND_SCOPE, 1, "published"),
      read,
    );
    const returnal = profiles.filter((p) => p.game.slug === "returnal");
    expect(returnal.filter((p) => p.scope.isPrimary)).toHaveLength(1);
    expect(returnal.find((p) => p.scope.isPrimary)!.scope.key).toBe("default");
  });

  it("does not publish a scope that has only a draft", async () => {
    // A scope is not public merely because somebody created it.
    const profiles = await withState(
      CREATE_SECOND_SCOPE + completeEvaluation(SECOND_SCOPE, 1, "draft"),
      read,
    );
    expect(profiles.filter((p) => p.game.slug === "returnal")).toHaveLength(1);
  });

  it("does not publish an empty scope at all", async () => {
    const profiles = await withState(CREATE_SECOND_SCOPE, read);
    expect(profiles.filter((p) => p.game.slug === "returnal")).toHaveLength(1);
  });
});

describe("The primary-scope invariant", () => {
  it("refuses to move primacy to a scope with nothing published", async () => {
    // Otherwise /games/returnal would 404 while a sibling URL resolved — and
    // the bare game URL is the one people link, share and search for.
    const message = await rejectionOf(() =>
      withState(
        `
        ${CREATE_SECOND_SCOPE}
        UPDATE profile_scopes SET is_primary = false
          WHERE game_id = ${RETURNAL_GAME} AND key = 'default';
        UPDATE profile_scopes SET is_primary = true
          WHERE game_id = ${RETURNAL_GAME} AND key = 'wintermute';
        `,
        read,
      ),
    );
    expect(message).toMatch(/publishes nothing under that rubric/);
  });

  it("refuses two primary scopes for one game", async () => {
    const message = await rejectionOf(() =>
      withState(
        `
        INSERT INTO profile_scopes (game_id, key, label, is_primary, display_order)
        VALUES (${RETURNAL_GAME}, 'second', 'Second', true, 2);
        `,
        read,
      ),
    );
    expect(message).toMatch(/profile_scopes_one_primary_per_game/);
  });

  it("does not change which scope is primary when display_order changes", async () => {
    // The whole reason primacy is an explicit column: reordering a listing must
    // never move a canonical URL.
    const profiles = await withState(
      `
      ${CREATE_SECOND_SCOPE}
      ${completeEvaluation(SECOND_SCOPE, 1, "published")}
      UPDATE profile_scopes SET display_order = 99
        WHERE game_id = ${RETURNAL_GAME} AND key = 'default';
      UPDATE profile_scopes SET display_order = 1
        WHERE game_id = ${RETURNAL_GAME} AND key = 'wintermute';
      `,
      read,
    );
    const returnal = profiles.filter((p) => p.game.slug === "returnal");
    expect(returnal.find((p) => p.scope.isPrimary)!.scope.key).toBe("default");
    expect(returnal.find((p) => p.scope.key === "default")!.scope.displayOrder)
      .toBe(99);
  });
});

describe("Platform overrides", () => {
  const STABILITY = `(SELECT s.id FROM subcriteria s JOIN dimensions d ON d.id=s.dimension_id WHERE d.rubric_version='1.0' AND d.key='execution' AND s.key='technical_stability')`;

  it("reaches the model without moving the canonical dimension total", async () => {
    // The immutability trigger is suspended for this transaction only. It is
    // the sole way to observe a *published* profile carrying an override, and
    // the whole thing is rolled back — a real override arrives on a new
    // evaluation version, which is exactly what that trigger enforces.
    const profiles = await withState(
      `
      ALTER TABLE subcriterion_platform_overrides
        DISABLE TRIGGER subcriterion_platform_overrides_snapshot_immutable;
      INSERT INTO subcriterion_platform_overrides
        (evaluation_id, subcriterion_id, platform_id, score, rationale)
      SELECT e.id, ${STABILITY}, (SELECT id FROM platforms WHERE slug='pc'), 0.5,
             'A materially worse reading on PC.'
      FROM evaluations e
      WHERE e.scope_id = ${RETURNAL_SCOPE} AND e.version_number = 1;
      `,
      read,
    );

    const returnal = profiles.find((p) => p.game.slug === "returnal")!;
    const execution = returnal.dimensions.find(
      (d) => d.dimension.key === "execution",
    )!;
    const stability = execution.subcriteria.find(
      (s) => s.key === "technical_stability",
    )!;

    // The override is visible to the model…
    expect(stability.entry.platformOverrides).toEqual([
      {
        platform: "pc",
        value: 0.5,
        rationale: "A materially worse reading on PC.",
      },
    ]);
    // …the canonical base value is untouched…
    expect(stability.entry.value).toBe(2);
    // …and so is the published dimension total. This is the load-bearing one:
    // an override that moved a total would be a second, competing profile.
    expect(execution.display).toBe("9.5");
  });

  it("leaves a profile with no overrides carrying none", async () => {
    const returnal = (await read()).find((p) => p.game.slug === "returnal")!;
    for (const view of returnal.dimensions) {
      for (const sub of view.subcriteria) {
        expect(sub.entry.platformOverrides).toBeUndefined();
      }
    }
  });
});
