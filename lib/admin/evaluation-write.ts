import { and, eq, inArray, sql } from "drizzle-orm";
import type { AdminTransaction } from "@/lib/admin/db";
import { assertEvaluationEditable, BLOCK_TYPES } from "@/lib/admin/evaluations";
import { EditorialRuleError } from "@/lib/admin/errors";
import type {
  EvaluationContextInput,
  EvidenceLinkInput,
  EvidenceSourceInput,
  InterpretationInput,
  PlatformOverrideInput,
  SubcriterionInput,
  TagSelectionInput,
} from "@/lib/admin/evaluation-validation";
import * as t from "@/lib/db/schema";
import { UNKNOWN, type DimensionKey, type SubcriterionValue } from "@/lib/rubric";

/**
 * Editorial writes for evaluations.
 *
 * Every function takes a transaction and none of them checks permissions — the
 * Server Action authorises once, at the top, exactly as the 2B write layer
 * does.
 *
 * ── What this file does NOT do ──────────────────────────────────────────────
 *
 * Publish, supersede, or validate for publication. Those are Phase 2D and are
 * absent deliberately: the closest thing here is `createRevision`, which starts
 * a new DRAFT from an existing version and touches its predecessor not at all.
 *
 * ── Unknown is a value, absence is not ──────────────────────────────────────
 *
 * `subcriterion_scores.score` is NULL for Unknown. A subcriterion nobody has
 * authored has NO ROW. Clearing a subcriterion therefore deletes the row rather
 * than nulling the column, or "not yet looked at" would silently become "looked
 * at, cannot say" — which is a published claim about the evidence.
 */

/** Resolve a subcriterion's surrogate id from the rubric keys an editor sees. */
function subcriterionRef(
  rubricVersion: string,
  dimensionKey: DimensionKey,
  subcriterionKey: string,
) {
  return sql`(
    SELECT s.id FROM subcriteria s
      JOIN dimensions d ON d.id = s.dimension_id
     WHERE d.rubric_version = ${rubricVersion}
       AND d.key = ${dimensionKey}
       AND s.key = ${subcriterionKey}
  )`;
}

function dimensionRef(rubricVersion: string, dimensionKey: DimensionKey) {
  return sql`(
    SELECT d.id FROM dimensions d
     WHERE d.rubric_version = ${rubricVersion} AND d.key = ${dimensionKey}
  )`;
}

/** `unknown` becomes NULL; a number stays a number. Never the other way. */
function storedScore(value: SubcriterionValue): string | null {
  return value === UNKNOWN ? null : String(value);
}

/**
 * Start a Draft for a scope.
 *
 * The version number is scope-local and per rubric (ADR 0014): a scope's series
 * counts its own versions, which is what lets two modes of one game publish
 * independently. Computed here rather than supplied, because an editor guessing
 * it is an editor creating a collision.
 */
export async function createDraft(
  tx: AdminTransaction,
  scopeId: string,
  input: EvaluationContextInput,
  createdBy: string,
): Promise<string> {
  const [scope] = await tx
    .select({ gameId: t.profileScopes.gameId })
    .from(t.profileScopes)
    .where(eq(t.profileScopes.id, scopeId))
    .limit(1);
  if (!scope) throw new EditorialRuleError("That profile scope does not exist.");

  const [highest] = await tx
    .select({ value: sql<number>`coalesce(max(version_number), 0)` })
    .from(t.evaluations)
    .where(
      and(
        eq(t.evaluations.scopeId, scopeId),
        eq(t.evaluations.rubricVersion, input.rubricVersion),
      ),
    );

  const [row] = await tx
    .insert(t.evaluations)
    .values({
      gameId: scope.gameId,
      scopeId,
      rubricVersion: input.rubricVersion,
      versionNumber: Number(highest?.value ?? 0) + 1,
      ...contextColumns(input),
      status: "draft",
      createdBy,
    })
    .returning({ id: t.evaluations.id });
  if (!row) throw new Error("Insert returned no evaluation row.");
  return row.id;
}

/** The columns an editor declares as an evaluation's context (Rubric §1). */
function contextColumns(input: EvaluationContextInput) {
  return {
    editionScope: input.editionScope,
    modeScope: input.modeScope,
    platformScope: input.platformScope,
    buildOrPatchScope: input.buildOrPatchScope,
    currentStateCutoffAt: input.currentStateCutoffAt ?? null,
    evidenceCutoffAt: input.evidenceCutoffAt,
    releaseContext: input.releaseContext,
    evidenceStatus: input.evidenceStatus,
    // Meaningless unless pre-release, and a check constraint enforces the
    // biconditional, so it is cleared rather than left behind.
    evidenceMaturity:
      input.evidenceStatus === "pre_release" ? (input.evidenceMaturity ?? null) : null,
    confidence: input.confidence,
    evidenceLedger: input.evidenceLedger,
    scoreProvenance: input.scoreProvenance,
    calibrationRound:
      input.scoreProvenance === "calibration" ? (input.calibrationRound ?? null) : null,
    provenanceNote:
      input.scoreProvenance === "derived" ? (input.provenanceNote ?? null) : null,
  };
}

export async function updateContext(
  tx: AdminTransaction,
  evaluationId: string,
  input: EvaluationContextInput,
): Promise<void> {
  await assertEvaluationEditable(tx as never, evaluationId);
  // `rubric_version` is deliberately not updatable. Changing it would reinterpret
  // every score already authored against a different set of subcriteria, and the
  // database has a trigger that refuses it outright.
  await tx
    .update(t.evaluations)
    .set(contextColumns(input))
    .where(eq(t.evaluations.id, evaluationId));
}

/**
 * Save one subcriterion.
 *
 * Clearing it removes the row. See the module comment: an absent row is "not
 * authored", a NULL score is "Unknown", and collapsing the two would publish a
 * claim nobody made.
 */
export async function saveSubcriterion(
  tx: AdminTransaction,
  evaluationId: string,
  rubricVersion: string,
  input: SubcriterionInput,
): Promise<void> {
  await assertEvaluationEditable(tx as never, evaluationId);
  const reference = subcriterionRef(
    rubricVersion,
    input.dimensionKey,
    input.subcriterionKey,
  );

  if (input.value === null) {
    await tx.execute(sql`
      DELETE FROM subcriterion_scores
       WHERE evaluation_id = ${evaluationId}
         AND subcriterion_id = ${reference}
    `);
    return;
  }

  await tx.execute(sql`
    INSERT INTO subcriterion_scores
      (evaluation_id, subcriterion_id, score, rationale, platform_note, evidence_confidence)
    VALUES (
      ${evaluationId},
      ${reference},
      ${storedScore(input.value)},
      ${input.rationale ?? null},
      ${input.platformNote ?? null},
      ${input.evidenceConfidence ?? null}
    )
    ON CONFLICT (evaluation_id, subcriterion_id) DO UPDATE SET
      score = EXCLUDED.score,
      rationale = EXCLUDED.rationale,
      platform_note = EXCLUDED.platform_note,
      evidence_confidence = EXCLUDED.evidence_confidence
  `);
}

/** Per-dimension editorial confidence (SOP §5). */
export async function saveDimensionAssessment(
  tx: AdminTransaction,
  evaluationId: string,
  rubricVersion: string,
  dimensionKey: DimensionKey,
  confidence: "low" | "medium" | "high",
  note: string | undefined,
): Promise<void> {
  await assertEvaluationEditable(tx as never, evaluationId);
  await tx.execute(sql`
    INSERT INTO dimension_assessments (evaluation_id, dimension_id, confidence, note)
    VALUES (${evaluationId}, ${dimensionRef(rubricVersion, dimensionKey)}, ${confidence}, ${note ?? null})
    ON CONFLICT (evaluation_id, dimension_id) DO UPDATE SET
      confidence = EXCLUDED.confidence,
      note = EXCLUDED.note
  `);
}

/**
 * A material platform deviation for one subcriterion (ADR 0015).
 *
 * The base score stays canonical and no override enters a dimension total. The
 * database enforces the rest: a base row must exist, the value must actually
 * differ from it, the platform must be one the game ships on, and the rationale
 * is required — an unexplained divergence is the "single unexplained number"
 * the rubric forbids.
 */
export async function saveOverride(
  tx: AdminTransaction,
  evaluationId: string,
  rubricVersion: string,
  input: PlatformOverrideInput,
): Promise<void> {
  await assertEvaluationEditable(tx as never, evaluationId);
  const reference = subcriterionRef(
    rubricVersion,
    input.dimensionKey,
    input.subcriterionKey,
  );

  await tx.execute(sql`
    INSERT INTO subcriterion_platform_overrides
      (evaluation_id, subcriterion_id, platform_id, score, rationale, evidence_confidence)
    VALUES (
      ${evaluationId}, ${reference}, ${input.platformId},
      ${storedScore(input.value)}, ${input.rationale}, ${input.evidenceConfidence ?? null}
    )
    ON CONFLICT (evaluation_id, subcriterion_id, platform_id) DO UPDATE SET
      score = EXCLUDED.score,
      rationale = EXCLUDED.rationale,
      evidence_confidence = EXCLUDED.evidence_confidence
  `);
}

export async function removeOverride(
  tx: AdminTransaction,
  evaluationId: string,
  rubricVersion: string,
  dimensionKey: DimensionKey,
  subcriterionKey: string,
  platformId: string,
): Promise<void> {
  await assertEvaluationEditable(tx as never, evaluationId);
  await tx.execute(sql`
    DELETE FROM subcriterion_platform_overrides
     WHERE evaluation_id = ${evaluationId}
       AND platform_id = ${platformId}
       AND subcriterion_id = ${subcriterionRef(rubricVersion, dimensionKey, subcriterionKey)}
  `);
}

/**
 * Create or update an evidence source.
 *
 * `source_key` is identity (ADR 0006): titles are not unique — "Digital Foundry
 * performance analysis" describes a hundred articles — so nothing resolves a
 * source by title. A source cited by a final evaluation is frozen by trigger.
 */
export async function upsertEvidenceSource(
  tx: AdminTransaction,
  input: EvidenceSourceInput,
): Promise<string> {
  const [row] = await tx
    .insert(t.evidenceSources)
    .values({
      sourceKey: input.sourceKey,
      title: input.title,
      url: input.url ?? null,
      publisher: input.publisher ?? null,
      author: input.author ?? null,
      publishedAt: input.publishedAt ?? null,
      accessedAt: input.accessedAt ?? null,
      evidenceTier: input.tier,
      sourceCategory: input.category,
      sourceType: input.sourceType ?? null,
    })
    .onConflictDoUpdate({
      target: t.evidenceSources.sourceKey,
      set: {
        title: input.title,
        url: input.url ?? null,
        publisher: input.publisher ?? null,
        author: input.author ?? null,
        publishedAt: input.publishedAt ?? null,
        accessedAt: input.accessedAt ?? null,
        evidenceTier: input.tier,
        sourceCategory: input.category,
        sourceType: input.sourceType ?? null,
      },
    })
    .returning({ id: t.evidenceSources.id });
  if (!row) throw new Error("Insert returned no evidence source row.");
  return row.id;
}

/**
 * Attach a source to this evaluation, optionally narrowed to a dimension or a
 * single subcriterion.
 *
 * The new link goes last. Order is authored (migration 0008) and appending is
 * the only defensible default — inserting a new source into the middle of a
 * sequence somebody arranged would be a decision the editor did not make.
 */
export async function linkEvidence(
  tx: AdminTransaction,
  evaluationId: string,
  rubricVersion: string,
  input: EvidenceLinkInput,
): Promise<void> {
  await assertEvaluationEditable(tx as never, evaluationId);

  const [last] = await tx
    .select({ value: sql<number>`coalesce(max(display_order), 0)` })
    .from(t.evaluationEvidenceLinks)
    .where(eq(t.evaluationEvidenceLinks.evaluationId, evaluationId));

  const dimension = input.dimensionKey
    ? dimensionRef(rubricVersion, input.dimensionKey)
    : sql`NULL`;
  const subcriterion =
    input.dimensionKey && input.subcriterionKey
      ? subcriterionRef(rubricVersion, input.dimensionKey, input.subcriterionKey)
      : sql`NULL`;

  // The query builder rather than raw SQL, because `platform_scope` is a
  // text[] and a raw template binds a JS array as a scalar — Postgres answers
  // `malformed array literal: "PC"`. Drizzle's array codec handles it, and the
  // two rubric lookups still go through as subqueries.
  await tx.insert(t.evaluationEvidenceLinks).values({
    evaluationId,
    evidenceSourceId: input.evidenceSourceId,
    dimensionId: input.dimensionKey ? (dimension as never) : null,
    subcriterionId:
      input.dimensionKey && input.subcriterionKey ? (subcriterion as never) : null,
    platformScope: input.platformScope?.length ? [...input.platformScope] : null,
    note: input.note ?? null,
    spoilerSensitive: input.spoilerSensitive,
    displayOrder: Number(last?.value ?? 0) + 1,
  });
}

export async function unlinkEvidence(
  tx: AdminTransaction,
  evaluationId: string,
  linkId: string,
): Promise<void> {
  await assertEvaluationEditable(tx as never, evaluationId);
  await tx
    .delete(t.evaluationEvidenceLinks)
    .where(
      and(
        eq(t.evaluationEvidenceLinks.id, linkId),
        eq(t.evaluationEvidenceLinks.evaluationId, evaluationId),
      ),
    );
}

/**
 * Move one evidence link up or down.
 *
 * Written as a swap of two positions rather than a renumber of the whole list,
 * so the authored sequence of everything else is untouched.
 */
export async function moveEvidenceLink(
  tx: AdminTransaction,
  evaluationId: string,
  linkId: string,
  direction: "up" | "down",
): Promise<void> {
  await assertEvaluationEditable(tx as never, evaluationId);

  const links = await tx
    .select({
      id: t.evaluationEvidenceLinks.id,
      order: t.evaluationEvidenceLinks.displayOrder,
    })
    .from(t.evaluationEvidenceLinks)
    .where(eq(t.evaluationEvidenceLinks.evaluationId, evaluationId))
    .orderBy(t.evaluationEvidenceLinks.displayOrder);

  const index = links.findIndex((link) => link.id === linkId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= links.length) return;

  const a = links[index]!;
  const b = links[swapWith]!;
  await tx
    .update(t.evaluationEvidenceLinks)
    .set({ displayOrder: b.order })
    .where(eq(t.evaluationEvidenceLinks.id, a.id));
  await tx
    .update(t.evaluationEvidenceLinks)
    .set({ displayOrder: a.order })
    .where(eq(t.evaluationEvidenceLinks.id, b.id));
}

/**
 * Replace the whole tag selection, in the order given.
 *
 * A whole-list write rather than add/remove, because the order IS the payload:
 * the form submits the sequence an editor arranged, and reconciling that with
 * per-row edits would be more machinery for the same result.
 */
export async function setTags(
  tx: AdminTransaction,
  evaluationId: string,
  selections: readonly TagSelectionInput[],
): Promise<void> {
  await assertEvaluationEditable(tx as never, evaluationId);

  await tx
    .delete(t.evaluationTags)
    .where(eq(t.evaluationTags.evaluationId, evaluationId));
  if (selections.length === 0) return;

  const ids = await tx
    .select({ id: t.tags.id, key: t.tags.key })
    .from(t.tags)
    .where(inArray(t.tags.key, selections.map((selection) => selection.key)));
  const byKey = new Map(ids.map((row) => [row.key, row.id]));

  const values = selections.flatMap((selection, index) => {
    const tagId = byKey.get(selection.key);
    if (!tagId) return [];
    return [
      {
        evaluationId,
        tagId,
        intensity: selection.intensity ?? null,
        note: selection.note ?? null,
        displayOrder: index + 1,
      },
    ];
  });
  if (values.length > 0) await tx.insert(t.evaluationTags).values(values);
}

/**
 * The interpretation an editor writes for a reader.
 *
 * Blocks are replaced wholesale for the same reason tags are: their order is
 * `item_order`, and the form submits a list.
 */
export async function saveInterpretation(
  tx: AdminTransaction,
  evaluationId: string,
  input: InterpretationInput,
): Promise<void> {
  await assertEvaluationEditable(tx as never, evaluationId);

  await tx
    .update(t.evaluations)
    .set({
      oneLineExperience: input.oneLineExperience ?? null,
      primaryPull: input.primaryPull ?? null,
      primaryRisk: input.primaryRisk ?? null,
      platformWarning: input.platformWarning ?? null,
    })
    .where(eq(t.evaluations.id, evaluationId));

  await tx
    .delete(t.profileBlocks)
    .where(eq(t.profileBlocks.evaluationId, evaluationId));

  const rows = BLOCK_TYPES.flatMap((blockType) =>
    (input.blocks[blockType] ?? []).map((text, index) => ({
      evaluationId,
      blockType,
      itemOrder: index + 1,
      text,
    })),
  );
  if (rows.length > 0) await tx.insert(t.profileBlocks).values(rows);
}

/**
 * Start a new Draft from an existing version, copying its content.
 *
 * THE PREDECESSOR IS NOT TOUCHED. `supersedes_evaluation_id` records the link,
 * and the actual supersession — flipping the old row to `superseded` — is a
 * publication act and belongs to Phase 2D. Until then the game keeps publishing
 * exactly what it published before, while the revision is authored beside it.
 *
 * Copies everything an editor would otherwise retype: context, all forty
 * scores with their rationales, per-dimension confidence, platform overrides,
 * tags with their order, evidence links with theirs, and the interpretation.
 */
export async function createRevision(
  tx: AdminTransaction,
  sourceEvaluationId: string,
  createdBy: string,
  changeSummary: string,
): Promise<string> {
  const [source] = await tx
    .select()
    .from(t.evaluations)
    .where(eq(t.evaluations.id, sourceEvaluationId))
    .limit(1);
  if (!source) throw new EditorialRuleError("That evaluation does not exist.");

  const [open] = await tx
    .select({ id: t.evaluations.id })
    .from(t.evaluations)
    .where(
      and(
        eq(t.evaluations.scopeId, source.scopeId),
        inArray(t.evaluations.status, ["draft", "review"]),
      ),
    )
    .limit(1);
  if (open) {
    throw new EditorialRuleError(
      "This scope already has an evaluation in progress. Finish or discard it before starting another revision — two open drafts for one evaluated experience is two answers to the same question.",
    );
  }

  const [highest] = await tx
    .select({ value: sql<number>`coalesce(max(version_number), 0)` })
    .from(t.evaluations)
    .where(
      and(
        eq(t.evaluations.scopeId, source.scopeId),
        eq(t.evaluations.rubricVersion, source.rubricVersion),
      ),
    );

  const [created] = await tx
    .insert(t.evaluations)
    .values({
      gameId: source.gameId,
      scopeId: source.scopeId,
      rubricVersion: source.rubricVersion,
      versionNumber: Number(highest?.value ?? 0) + 1,
      editionScope: source.editionScope,
      modeScope: source.modeScope,
      platformScope: source.platformScope,
      buildOrPatchScope: source.buildOrPatchScope,
      currentStateCutoffAt: source.currentStateCutoffAt,
      evidenceCutoffAt: source.evidenceCutoffAt,
      releaseContext: source.releaseContext,
      status: "draft",
      evidenceStatus: source.evidenceStatus,
      evidenceMaturity: source.evidenceMaturity,
      confidence: source.confidence,
      evidenceLedger: source.evidenceLedger,
      // A revision is ordinary editorial work even when its predecessor came
      // out of a calibration round: nobody re-ran the round (ADR 0005).
      scoreProvenance: "editorial",
      calibrationRound: null,
      provenanceNote: null,
      oneLineExperience: source.oneLineExperience,
      primaryPull: source.primaryPull,
      primaryRisk: source.primaryRisk,
      platformWarning: source.platformWarning,
      supersedesEvaluationId: source.id,
      changeSummary,
      createdBy,
    })
    .returning({ id: t.evaluations.id });
  if (!created) throw new Error("Insert returned no evaluation row.");

  const target = created.id;
  await tx.execute(sql`
    INSERT INTO subcriterion_scores
      (evaluation_id, subcriterion_id, score, rationale, platform_note, evidence_confidence)
    SELECT ${target}, subcriterion_id, score, rationale, platform_note, evidence_confidence
      FROM subcriterion_scores WHERE evaluation_id = ${sourceEvaluationId}
  `);
  await tx.execute(sql`
    INSERT INTO dimension_assessments (evaluation_id, dimension_id, confidence, note)
    SELECT ${target}, dimension_id, confidence, note
      FROM dimension_assessments WHERE evaluation_id = ${sourceEvaluationId}
  `);
  await tx.execute(sql`
    INSERT INTO subcriterion_platform_overrides
      (evaluation_id, subcriterion_id, platform_id, score, rationale, evidence_confidence)
    SELECT ${target}, subcriterion_id, platform_id, score, rationale, evidence_confidence
      FROM subcriterion_platform_overrides WHERE evaluation_id = ${sourceEvaluationId}
  `);
  await tx.execute(sql`
    INSERT INTO profile_blocks (evaluation_id, block_type, item_order, text)
    SELECT ${target}, block_type, item_order, text
      FROM profile_blocks WHERE evaluation_id = ${sourceEvaluationId}
  `);
  await tx.execute(sql`
    INSERT INTO evaluation_tags (evaluation_id, tag_id, intensity, note, display_order)
    SELECT ${target}, tag_id, intensity, note, display_order
      FROM evaluation_tags WHERE evaluation_id = ${sourceEvaluationId}
  `);
  await tx.execute(sql`
    INSERT INTO evaluation_evidence_links
      (evaluation_id, evidence_source_id, dimension_id, subcriterion_id,
       platform_scope, note, spoiler_sensitive, display_order)
    SELECT ${target}, evidence_source_id, dimension_id, subcriterion_id,
           platform_scope, note, spoiler_sensitive, display_order
      FROM evaluation_evidence_links WHERE evaluation_id = ${sourceEvaluationId}
  `);

  return target;
}

/**
 * Discard a draft.
 *
 * Only a draft: `review` is a state somebody else is looking at, and published
 * or superseded rows are preserved history the database will not delete anyway.
 */
export async function deleteDraft(
  tx: AdminTransaction,
  evaluationId: string,
): Promise<void> {
  const [row] = await tx
    .select({ status: t.evaluations.status })
    .from(t.evaluations)
    .where(eq(t.evaluations.id, evaluationId))
    .limit(1);
  if (!row) return;
  if (row.status !== "draft") {
    throw new EditorialRuleError(
      `Only a draft can be discarded. This evaluation is ${row.status}.`,
    );
  }
  await tx.delete(t.evaluations).where(eq(t.evaluations.id, evaluationId));
}

/** Move an evaluation between the two working states. Not publication. */
export async function setWorkingStatus(
  tx: AdminTransaction,
  evaluationId: string,
  status: "draft" | "review",
): Promise<void> {
  await assertEvaluationEditable(tx as never, evaluationId);
  await tx
    .update(t.evaluations)
    .set({ status })
    .where(eq(t.evaluations.id, evaluationId));
}
