import { and, eq } from "drizzle-orm";
import {
  withAuthorizedAdminDatabase,
  type AdminTransaction,
} from "@/lib/admin/db";
import { EditorialRuleError } from "@/lib/admin/errors";
import {
  readEvaluationProfile,
  type ProfileReader,
} from "@/lib/db/read-profiles";
import * as t from "@/lib/db/schema";
import type { GameWithEvaluation } from "@/lib/profile/types";
import {
  evaluationSchema,
  profileScopeSchema,
  validateGameRecord,
} from "@/lib/validation/evaluation";

/**
 * The publish gate, and the publication itself (Master Plan §8.8, Phase 2D).
 *
 * ── Three words, and they are not synonyms (Master Plan §9.8) ──────────────
 *
 *   Published   this evaluation is the scope's current editorial version. A
 *               database fact, true the moment the transaction below commits.
 *   Superseded  preserved editorial history: published once, since replaced.
 *   Live        the deployed production artifact actually serves this version.
 *
 * Nothing in this file can make a profile Live, and nothing in it should say
 * otherwise. Public pages are prerendered, so what production serves is decided
 * by the last successful build — which may predate this publication, and may
 * fail after it. A publication that commits while the next build fails leaves
 * the new version Published and the previous one Live, and the product must not
 * claim otherwise in the meantime.
 *
 * Tracking and displaying that gap is Phase 2D-2. Until it exists, the honest
 * position is that this code knows only about Published, so "live" must not
 * appear in copy or comments here meaning "published".
 *
 * ── This is not where the rules live ───────────────────────────────────────
 *
 * Postgres already refuses to publish a broken profile, and it refuses it
 * against this application, a migration and a psql session alike:
 * `assert_published_evaluation_complete` rejects a grid with gaps,
 * `evaluations_one_published_per_scope_rubric` rejects a second published row
 * in a scope, `trg_evaluation_snapshot_immutable` permits exactly
 * `draft|review -> published` and `published -> superseded`, and ADR 0016's
 * trigger rejects a sibling that publishes before its primary scope.
 *
 * So nothing here is the guarantee. What is missing without this module is a
 * way for an editor to find out *before* pressing Publish, in one list, in
 * sentences — rather than one constraint name at a time, each discovered by
 * failing. The gate is a pre-flight check that happens to duplicate the
 * database's opinion; where the two disagree, the database is right and this
 * file has a bug.
 *
 * That is also why the gate reports every issue it can find instead of
 * stopping at the first: an editor fixing a profile over an afternoon should
 * get the whole list, not a queue of one.
 *
 * ── One evaluation of the rules, not two ───────────────────────────────────
 *
 * The semantic checks are `validateGameRecord`, unchanged and uncopied — the
 * same function the fixture corpus and the seed generator are validated by.
 * A publish gate with its own private notion of a valid profile would drift
 * from the corpus the moment either changed.
 */

export type PublishIssueSeverity = "blocking" | "advisory";

export interface PublishIssue {
  readonly code: string;
  readonly message: string;
  readonly severity: PublishIssueSeverity;
}

export interface PublishReadiness {
  /** Null when the id matches no evaluation. */
  readonly record: GameWithEvaluation | null;
  readonly blocking: readonly PublishIssue[];
  /** Real, but a human decides. Never blocks on its own. */
  readonly advisory: readonly PublishIssue[];
  readonly canPublish: boolean;
}

/**
 * What the editor confirms at the point of publication.
 *
 * Kept as data rather than a checkbox read straight off the form so the reason
 * for each one stays visible here, next to the check it answers.
 */
export interface PublishAttestations {
  /**
   * Master Plan §8.8 lists "no spoiler leakage" as a publication check, and no
   * program can perform it. See `spoilerAdvisories`.
   */
  readonly spoilerReviewed: boolean;
}

/**
 * Whether this evaluation may be published, and everything wrong with it.
 *
 * Takes a reader rather than opening its own, so the same function serves the
 * Publish page (a plain connection) and `publishEvaluation` (inside the
 * transaction that is about to commit). The second case is the one that
 * matters: readiness established on a different connection is readiness
 * established against data the transaction cannot see.
 */
export async function checkPublishReadiness(
  db: ProfileReader,
  evaluationId: string,
): Promise<PublishReadiness> {
  const record = await readEvaluationProfile(db, evaluationId);
  if (!record) {
    return {
      record: null,
      blocking: [
        {
          code: "unknown_evaluation",
          message: "There is no evaluation with that id.",
          severity: "blocking",
        },
      ],
      advisory: [],
      canPublish: false,
    };
  }

  const blocking: PublishIssue[] = [];

  // Publication state. The database says the same thing, less kindly.
  //
  // This is also §8.8's "no draft/review exposure" check, from the only angle
  // that makes sense at publication time. A draft cannot leak by being
  // previewed — the public reader selects on `status = 'published'` and has no
  // other mode — so the exposure question here is the converse one: whether
  // *this* row is in a state that may become the published one.
  if (record.evaluation.status === "published") {
    blocking.push({
      code: "already_published",
      message:
        "This evaluation is already published. To change a published profile, create a revision — a published snapshot is never edited in place.",
      severity: "blocking",
    });
  }
  if (record.evaluation.status === "superseded") {
    blocking.push({
      code: "superseded_evaluation",
      message:
        "This evaluation is superseded history. It was published once and has been replaced; it cannot be published again.",
      severity: "blocking",
    });
  }

  // Shape first: a record that does not parse cannot be meaningfully checked
  // for meaning, and the semantic pass assumes well-formed input.
  const scopeShape = profileScopeSchema.safeParse(record.scope);
  if (!scopeShape.success) {
    for (const issue of scopeShape.error.issues) {
      blocking.push({
        code: "scope_shape",
        message: `Scope: ${issue.path.join(".") || "(root)"} — ${issue.message}`,
        severity: "blocking",
      });
    }
  }

  const evaluationShape = evaluationSchema.safeParse(record.evaluation);
  if (!evaluationShape.success) {
    for (const issue of evaluationShape.error.issues) {
      blocking.push({
        code: "evaluation_shape",
        message: `${issue.path.join(".") || "(root)"} — ${issue.message}`,
        severity: "blocking",
      });
    }
  }

  // The semantic rules, in one call: rubric coverage, rationales, confidence,
  // evidence maturity, provenance, platform overrides, artwork clearance,
  // supersession chain, editorial language, and the no-aggregate-score rule.
  //
  // Run against the record as publication WOULD LEAVE IT, not as it stands.
  // That is the question §8.8 actually asks — "validate before publication"
  // means validating the result — and asking it of the current state gets a
  // wrong answer for every revision there is: the predecessor is still
  // `published` until the transaction supersedes it, so `validateGameRecord`
  // correctly reports `history_not_superseded` and `multiple_published_
  // evaluations` about a state that publishing is precisely what resolves.
  //
  // Attempted even when the shape check failed, which is the difference between
  // a list and a queue. A bare draft fails three string fields, and gating the
  // semantic pass behind that would report exactly those three — hiding forty
  // unscored subcriteria until an editor had guessed that filling in a one-line
  // summary was what stood between them and the real list.
  //
  // The catch is for the case that motivated the gate originally: these checks
  // assume a well-formed record, and a sufficiently broken one can throw rather
  // than return issues. That degrades to one honest line instead of a stack
  // trace, and the shape errors above still say what to fix.
  try {
    for (const issue of validateGameRecord(asPublished(record))) {
      blocking.push({ ...issue, severity: "blocking" });
    }
  } catch (error) {
    blocking.push({
      code: "validation_incomplete",
      message:
        "The remaining rules could not be checked against this record: " +
        `${error instanceof Error ? error.message : String(error)}. ` +
        "Fix the problems listed above and check again.",
      severity: "blocking",
    });
  }

  return {
    record,
    blocking,
    advisory: spoilerAdvisories(record),
    canPublish: blocking.length === 0,
  };
}

/**
 * The record as a successful publication would leave it.
 *
 * Two changes, and both are exactly what `publishEvaluation` is about to do in
 * one transaction: this evaluation becomes `published` and carries a
 * publication date, and the version it supersedes becomes `superseded`.
 *
 * This is a projection for the validator and nothing else — it is never
 * written, never rendered, and never returned to the caller, who gets the real
 * record. Validating a hypothetical is the point: the gate's question is
 * whether the *outcome* is a valid published profile, and a check that examined
 * the current state instead would refuse every revision for the crime of not
 * having happened yet.
 */
function asPublished(record: GameWithEvaluation): GameWithEvaluation {
  const predecessorId = record.evaluation.supersedesEvaluationId;

  return {
    ...record,
    evaluation: {
      ...record.evaluation,
      status: "published",
      // The real value is set by the transaction. Any date satisfies the "a
      // final evaluation records publishedAt" rule; none of the checks compare
      // it to anything.
      publishedAt:
        record.evaluation.publishedAt ?? new Date().toISOString().slice(0, 10),
    },
    history: (record.history ?? []).map((earlier) =>
      earlier.id === predecessorId && earlier.status === "published"
        ? { ...earlier, status: "superseded" as const }
        : earlier,
    ),
  };
}

/**
 * Prose that might be a spoiler — a prompt, not a verdict.
 *
 * §8.8 requires "no spoiler leakage" before publication, and it is worth being
 * plain about what software can contribute here: nothing decisive. Whether a
 * sentence spoils a game depends on what the game withholds and when, which is
 * exactly the knowledge that lives in the editor and not in the record.
 *
 * So this does the only honest version: it surfaces the phrasings that are
 * *usually* worth a second look and asks a person. It is advisory by
 * construction — it never blocks — and publication instead requires an explicit
 * attestation, so the check is recorded as a human judgement rather than
 * dressed up as a machine-verified pass. A gate that claimed to detect spoilers
 * would be worse than none, because it would be believed.
 */
function spoilerAdvisories(record: GameWithEvaluation): PublishIssue[] {
  const patterns: readonly { pattern: RegExp; reason: string }[] = [
    { pattern: /\bspoiler/i, reason: "mentions spoilers directly" },
    { pattern: /\b(the )?end(ing|game)\b/i, reason: "refers to the ending" },
    { pattern: /\bfinal (boss|act|chapter|mission)\b/i, reason: "names a late-game beat" },
    { pattern: /\b(plot )?twist\b/i, reason: "refers to a twist" },
    { pattern: /\bpost-?credits?\b/i, reason: "refers to post-credits content" },
    { pattern: /\breveal(s|ed)?\b/i, reason: "describes a reveal" },
  ];

  const prose = [
    record.evaluation.oneLineExperience,
    record.evaluation.primaryPull,
    record.evaluation.primaryRisk,
    ...Object.values(record.evaluation.blocks).flat(),
  ];

  const issues: PublishIssue[] = [];
  for (const text of prose) {
    const hit = patterns.find((candidate) => candidate.pattern.test(text));
    if (hit) {
      issues.push({
        code: "spoiler_review",
        message: `Worth re-reading before publication — ${hit.reason}: "${text}"`,
        severity: "advisory",
      });
    }
  }
  return issues;
}

/** ENTRYPOINT — readiness for the Publish page, for a verified editor. */
export async function readPublishReadiness(
  evaluationId: string,
): Promise<PublishReadiness> {
  return withAuthorizedAdminDatabase((db) =>
    checkPublishReadiness(db, evaluationId),
  );
}

/**
 * Publish this evaluation, superseding the version it replaces.
 *
 * ── Why the order is fixed ─────────────────────────────────────────────────
 *
 * `evaluations_one_published_per_game_rubric` is a partial unique index over
 * published rows, so the predecessor must leave `published` before this row
 * enters it. Both statements are in one transaction, and the index is checked
 * per statement, so superseding first is not a race — it is the only order
 * that is ever legal.
 *
 * ── Why the predecessor update sets one column ─────────────────────────────
 *
 * `trg_evaluation_snapshot_immutable` allows `published -> superseded` only
 * when every other column is byte-for-byte unchanged. Touching anything else in
 * that statement — a timestamp, a "superseded_at" convenience — makes the whole
 * publication fail on an immutable-snapshot error. History keeps the wording it
 * was published under, and that includes its metadata.
 *
 * ── Concurrency ────────────────────────────────────────────────────────────
 *
 * Two editors publishing into one scope do not need a lock here. The gate reads
 * inside the transaction, and the unique index rejects the loser at COMMIT with
 * a message `describeDatabaseFailure` turns into a sentence. The finalization
 * trigger also takes a shared advisory lock on the rubric contract, which is
 * what keeps a concurrent rubric edit from redefining the shape mid-publication.
 */
export async function publishEvaluation(
  tx: AdminTransaction,
  evaluationId: string,
  attestations: PublishAttestations,
): Promise<void> {
  /*
   * Lock the target BEFORE reading it, not as a side effect of updating it.
   *
   * This is the difference between validating a snapshot and validating a
   * moving target. `trg_evaluation_child_immutable` takes `FOR SHARE` on the
   * owning evaluation row before it allows any score, assessment, block, tag or
   * evidence-link write. `FOR UPDATE` here conflicts with that share lock, so
   * from this statement onward no child mutation of this evaluation can commit
   * until this transaction ends.
   *
   * Without it the window is real and not theoretical: the readiness reads take
   * no locks at all, so an editor clearing a score in another tab could commit
   * between "the gate passed" and the UPDATE below, and publication would
   * finalize a snapshot nobody validated. The database would still catch the
   * subset it enforces — `assert_published_evaluation_complete` re-reads the
   * children and would reject a newly-created gap — but the app-level rules it
   * does not know about (banned phrasing, aggregate scores, evidence maturity,
   * confidence coherence) would sail through.
   *
   * The existing design already assumes this lock is held: `lock_rubric_contract`
   * explains its fail-fast choice with "publication has already locked its
   * evaluation row". Until now that was only true from the UPDATE onward.
   *
   * Ordering is also what makes two simultaneous Publish submissions safe. The
   * second blocks here, and when the first commits it re-reads the row, finds
   * `published`, and stops at `already_published` rather than racing the partial
   * unique index. A child write that was already waiting behaves the same way:
   * it resumes, sees the finalized status, and gets the immutability refusal it
   * would have got had it arrived a moment later.
   *
   * The predecessor is deliberately NOT locked here. It is reached only by the
   * status-only UPDATE below, which takes its own row lock in a fixed order
   * (target, then predecessor) — and a second publication cannot be inside this
   * section concurrently to take them the other way round.
   */
  const [locked] = await tx
    .select({ id: t.evaluations.id })
    .from(t.evaluations)
    .where(eq(t.evaluations.id, evaluationId))
    .for("update");

  if (!locked) {
    throw new EditorialRuleError("There is no evaluation with that id.");
  }

  const readiness = await checkPublishReadiness(tx, evaluationId);

  if (!readiness.record) {
    throw new EditorialRuleError("There is no evaluation with that id.");
  }

  if (readiness.blocking.length > 0) {
    throw new EditorialRuleError(
      `This profile is not ready to publish (${readiness.blocking.length} ` +
        `${readiness.blocking.length === 1 ? "problem" : "problems"}). ` +
        "Fix them on the Publish page and try again.",
    );
  }

  // The one check a program cannot make for itself. Enforced here rather than
  // in the gate so that it is impossible to publish without it, including from
  // a caller that never rendered the page.
  if (!attestations.spoilerReviewed) {
    throw new EditorialRuleError(
      "Confirm the profile has been read for spoilers before publishing.",
    );
  }

  const predecessorId = readiness.record.evaluation.supersedesEvaluationId;
  if (predecessorId) {
    await tx
      .update(t.evaluations)
      .set({ status: "superseded" })
      .where(
        and(
          eq(t.evaluations.id, predecessorId),
          eq(t.evaluations.status, "published"),
        ),
      );
  }

  await tx
    .update(t.evaluations)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(t.evaluations.id, evaluationId));
}
