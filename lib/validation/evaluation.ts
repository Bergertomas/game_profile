import { z } from "zod";
import { getRubric, UNKNOWN, type DimensionKey } from "@/lib/rubric";
import { isTagKey } from "@/lib/rubric/tags";
import { deriveDimensionScore } from "@/lib/scoring/derive";
import type { Evaluation, GameWithEvaluation } from "@/lib/profile/types";

function isFinalEvaluation(evaluation: Evaluation): boolean {
  return evaluation.status === "published" || evaluation.status === "superseded";
}

/**
 * Publish-gate validation (Plan §13.2 constraints, §14.3 validation checks,
 * §22.3 data QA). These run in tests today and behind the admin Publish button
 * when the editorial system lands.
 */

const subcriterionValue = z.union([
  z.literal(0),
  z.literal(0.5),
  z.literal(1),
  z.literal(1.5),
  z.literal(2),
  z.literal(UNKNOWN),
]);

export const subcriterionEntrySchema = z.object({
  value: subcriterionValue,
  rationale: z.string().min(1),
  platformNote: z.string().optional(),
});

export const evaluationScopeSchema = z.object({
  edition: z.string().min(1),
  mode: z.string().min(1),
  platforms: z.array(z.string().min(1)).min(1),
  buildOrPatch: z.string().min(1),
  currentStateCutoff: z.string().optional(),
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected an ISO date (YYYY-MM-DD)");

export const evaluationSchema = z.object({
  id: z.string().min(1),
  gameId: z.string().min(1),
  rubricVersion: z.literal("1.0"),
  versionNumber: z.number().int().positive(),
  scope: evaluationScopeSchema,
  status: z.enum(["draft", "review", "published", "superseded"]),
  evidenceStatus: z.enum(["verified", "provisional", "pre_release"]),
  evidenceMaturity: z
    .enum(["announced", "showcased", "hands_on", "review_code"])
    .optional(),
  confidence: z.enum(["low", "medium", "high"]),
  dimensionConfidence: z.record(
    z.string(),
    z.enum(["low", "medium", "high"]),
  ),
  evidenceCutoffAt: isoDate,
  releaseContext: z.string().min(1),
  oneLineExperience: z.string().min(1),
  primaryPull: z.string().min(1),
  primaryRisk: z.string().min(1),
  dimensions: z.record(z.string(), z.record(z.string(), subcriterionEntrySchema)),
  blocks: z.object({
    great_fit: z.array(z.string().min(1)),
    know_before: z.array(z.string().min(1)),
    probably_not: z.array(z.string().min(1)),
  }),
  tags: z.array(
    z.object({
      key: z.string().min(1),
      intensity: z.enum(["low", "medium", "high"]).optional(),
      note: z.string().optional(),
    }),
  ),
  sources: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      url: z.string().url().optional(),
      publisher: z.string().optional(),
      author: z.string().optional(),
      publishedAt: isoDate.optional(),
      tier: z.enum(["A", "B", "C", "D"]),
      category: z.enum([
        "direct_play",
        "critic",
        "technical",
        "specialist_creator",
        "player_signal",
        "first_party",
      ]),
      supports: z.array(z.string()).optional(),
      platformScope: z.array(z.string()).optional(),
      note: z.string().optional(),
    }),
  ),
  evidenceLedger: z.enum(["populated", "pending"]),
  scoreProvenance: z.enum([
    "calibration_round_1",
    "calibration_round_2",
    "derived_pending_round_1_reconciliation",
  ]),
  provenanceNote: z.string().optional(),
  publishedAt: isoDate.optional(),
  supersedesEvaluationId: z.string().optional(),
  changeSummary: z.string().optional(),
  platformWarning: z.string().optional(),
});

export interface ValidationIssue {
  readonly code: string;
  readonly message: string;
}

/**
 * Semantic checks that a schema cannot express. Returns every issue rather than
 * throwing on the first, so an editor sees the whole list at once.
 */
export function validateEvaluation(evaluation: Evaluation): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const rubric = getRubric(evaluation.rubricVersion);

  // Complete rubric coverage: every dimension, every subcriterion, no strays.
  const expectedKeys = new Set<string>(rubric.dimensions.map((d) => d.key));
  for (const key of Object.keys(evaluation.dimensions)) {
    if (!expectedKeys.has(key)) {
      issues.push({
        code: "unknown_dimension",
        message: `Dimension "${key}" is not part of rubric v${rubric.version}.`,
      });
    }
  }

  let scoredDimensionCount = 0;

  for (const dimension of rubric.dimensions) {
    // SOP §5 / Plan §13.1 — dimension confidence is a required editorial input.
    const dimensionConfidence =
      evaluation.dimensionConfidence[dimension.key as DimensionKey];
    if (!dimensionConfidence) {
      issues.push({
        code: "missing_dimension_confidence",
        message: `Dimension "${dimension.name}" has no confidence rating.`,
      });
    }

    const entries = evaluation.dimensions[dimension.key as DimensionKey];
    if (!entries) {
      issues.push({
        code: "missing_dimension",
        message: `Dimension "${dimension.name}" has no scores.`,
      });
      continue;
    }

    try {
      const values = Object.fromEntries(
        Object.entries(entries).map(([k, v]) => [k, v.value]),
      );
      const score = deriveDimensionScore(dimension, values);
      // Plan §9.2 — unknown coverage caps the confidence of this dimension,
      // not the unrelated overall profile confidence.
      if (score.unknownCount > 1 && dimensionConfidence === "high") {
        issues.push({
          code: "confidence_too_high",
          message: `${dimension.name} cannot have High confidence while more than one subcriterion is unknown.`,
        });
      }
      if (score.kind === "exact") scoredDimensionCount += 1;
    } catch (error) {
      issues.push({
        code: "dimension_shape",
        message: (error as Error).message,
      });
    }

    for (const [key, entry] of Object.entries(entries)) {
      if (entry.value !== UNKNOWN && entry.rationale.trim().length === 0) {
        issues.push({
          code: "missing_rationale",
          message: `${dimension.name} › ${key} is scored but has no rationale.`,
        });
      }
    }
  }

  // Plan §6.3 — 2–5 bullets in each interpretation block.
  for (const [block, items] of Object.entries(evaluation.blocks)) {
    if (items.length < 2 || items.length > 5) {
      issues.push({
        code: "block_length",
        message: `Block "${block}" must contain 2–5 bullets (found ${items.length}).`,
      });
    }
  }

  // Rubric §10 — controlled vocabulary only.
  for (const tag of evaluation.tags) {
    if (!isTagKey(tag.key)) {
      issues.push({
        code: "unknown_tag",
        message: `Tag "${tag.key}" is not in the controlled vocabulary.`,
      });
    }
  }

  // Plan §10.2 — a High-confidence released-game judgement cannot rest on one
  // external review.
  if (
    evaluation.confidence === "high" &&
    evaluation.evidenceStatus !== "pre_release"
  ) {
    const substantive = evaluation.sources.filter(
      (s) => s.tier === "A" || s.tier === "B",
    );
    if (substantive.length < 2) {
      issues.push({
        code: "insufficient_evidence",
        message:
          "High confidence requires at least two Tier A/B sources for a released game.",
      });
    }
  }

  // "Verified" is a public claim that evidence exists. Drafts may be entered
  // before their ledger is assembled, but a final verified profile cannot
  // carry exact editorial judgements with no recorded evidence coverage at all.
  // Superseded rows were published snapshots too; history is not a weaker tier.
  if (
    isFinalEvaluation(evaluation) &&
    evaluation.evidenceStatus === "verified" &&
    evaluation.sources.length === 0
  ) {
    issues.push({
      code: "verified_without_evidence",
      message: "A final Verified evaluation must record evidence coverage.",
    });
  }

  // Rubric §14, SOP §10 — pre-release profiles must not present false certainty.
  if (evaluation.evidenceStatus === "pre_release") {
    if (evaluation.confidence === "high") {
      issues.push({
        code: "pre_release_confidence",
        message:
          "Overall confidence cannot be High for a pre-release profile. Individual dimensions still may.",
      });
    }
    if (!evaluation.evidenceMaturity) {
      issues.push({
        code: "missing_evidence_maturity",
        message:
          'A pre-release profile must declare its evidence maturity: announced, showcased, hands_on or review_code. "Pre-release" alone does not say whether anyone has played it.',
      });
    }
    // SOP §10.3 — first-party-only evidence does not justify a complete
    // eight-dimension numerical profile, however confident it looks.
    if (
      evaluation.evidenceMaturity === "announced" &&
      scoredDimensionCount === rubric.dimensions.length
    ) {
      issues.push({
        code: "announced_full_profile",
        message:
          "An Announced profile rests on first-party material only and cannot publish a precise score for all eight dimensions. Use ranges or unknown.",
      });
    }
    const independent = evaluation.sources.filter(
      (s) => s.category !== "first_party" && (s.tier === "A" || s.tier === "B"),
    );
    if (evaluation.confidence === "medium" && independent.length < 3) {
      issues.push({
        code: "pre_release_evidence_thin",
        message: `A Medium-confidence pre-release profile targets at least 3 substantive independent sources (found ${independent.length}).`,
      });
    }
  } else if (evaluation.evidenceMaturity) {
    issues.push({
      code: "unexpected_evidence_maturity",
      message:
        "Evidence maturity describes pre-release evidence and must not be set on a released profile.",
    });
  }

  // Rubric §10 / Plan §13.1 — evidence links must point at real dimensions.
  const dimensionKeys = new Set<string>(rubric.dimensions.map((d) => d.key));
  for (const source of evaluation.sources) {
    for (const key of source.supports ?? []) {
      if (!dimensionKeys.has(key)) {
        issues.push({
          code: "unknown_supported_dimension",
          message: `Source "${source.title}" claims to support unknown dimension "${key}".`,
        });
      }
    }
  }

  // Source identity is the key, never the title. Two sources may share a title;
  // they may not share a key, or seeding silently merges them.
  const seenKeys = new Set<string>();
  for (const source of evaluation.sources) {
    if (seenKeys.has(source.id)) {
      issues.push({
        code: "duplicate_source_key",
        message: `Evidence source key "${source.id}" is used more than once.`,
      });
    }
    seenKeys.add(source.id);
  }

  // A populated ledger is a claim that individual source records exist. If it
  // has none, the trust line would print a count of zero as though it meant
  // something.
  if (evaluation.evidenceLedger === "populated" && evaluation.sources.length === 0) {
    issues.push({
      code: "empty_populated_ledger",
      message:
        'Evidence ledger is marked "populated" but no sources are recorded.',
    });
  }

  // Supersession must point somewhere real and forward (SOP §10.9).
  if (evaluation.supersedesEvaluationId === evaluation.id) {
    issues.push({
      code: "self_supersession",
      message: "An evaluation cannot supersede itself.",
    });
  }

  if (isFinalEvaluation(evaluation) && !evaluation.publishedAt) {
    issues.push({
      code: "missing_published_at",
      message: "A final evaluation must record publishedAt.",
    });
  }

  // Editorial language guard (Plan §6.3, Rubric §11).
  const proseFields = [
    evaluation.oneLineExperience,
    evaluation.primaryPull,
    evaluation.primaryRisk,
    ...Object.values(evaluation.blocks).flat(),
  ];
  for (const text of proseFields) {
    for (const banned of BANNED_PHRASES) {
      if (banned.pattern.test(text)) {
        issues.push({
          code: "banned_phrase",
          message: `${banned.reason}: "${text}"`,
        });
      }
    }
  }

  return issues;
}

/**
 * Phrases the style rules forbid (Plan §6.3, Rubric §11). These encode the
 * "don't declare player identity, don't declare objective truth" rules.
 */
const BANNED_PHRASES: readonly { pattern: RegExp; reason: string }[] = [
  { pattern: /\byou will love\b/i, reason: "Never write “you will love”" },
  { pattern: /\bobjectively\b/i, reason: "Avoid “objectively”" },
  { pattern: /\bcasual gamers?\b/i, reason: "Do not declare player identity" },
  { pattern: /\bhardcore gamers?\b/i, reason: "Do not declare player identity" },
  { pattern: /\breal fans?\b/i, reason: "Do not declare player identity" },
  {
    pattern: /\bone of the best games ever\b/i,
    reason: "Avoid universal superlatives",
  },
];

/**
 * Lineage checks that need the whole game record rather than one evaluation
 * (SOP §10.9: preserve the old profile, create a new one, link them).
 */
export function validateGameRecord(
  record: GameWithEvaluation,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const history = record.history ?? [];
  const chain = [...history, record.evaluation];
  const selectedRubric = record.evaluation.rubricVersion;

  const ids = new Set<string>();
  const versions = new Set<number>();
  for (const evaluation of chain) {
    if (ids.has(evaluation.id)) {
      issues.push({
        code: "duplicate_evaluation_id",
        message: `Evaluation id "${evaluation.id}" appears more than once.`,
      });
    }
    ids.add(evaluation.id);

    if (versions.has(evaluation.versionNumber)) {
      issues.push({
        code: "duplicate_version_number",
        message: `Version ${evaluation.versionNumber} appears more than once for ${record.game.slug} under rubric ${selectedRubric}.`,
      });
    }
    versions.add(evaluation.versionNumber);

    if (evaluation.gameId !== record.game.id) {
      issues.push({
        code: "evaluation_game_mismatch",
        message: `Evaluation "${evaluation.id}" belongs to game "${evaluation.gameId}", not "${record.game.id}".`,
      });
    }

    if (evaluation.rubricVersion !== selectedRubric) {
      issues.push({
        code: "history_rubric_mismatch",
        message: `Evaluation "${evaluation.id}" uses rubric ${evaluation.rubricVersion}; this public record selects rubric ${selectedRubric}. Keep each rubric lineage in a separate record.`,
      });
    }
  }

  // Exactly one live evaluation (Plan §13.2).
  // A GameWithEvaluation is one selected rubric lineage. The database may keep
  // one live row for several rubric versions during a migration, but each is a
  // separate record and the public data boundary chooses one explicitly.
  const published = chain.filter((e) => e.status === "published");
  if (published.length > 1) {
    issues.push({
      code: "multiple_published_evaluations",
      message: `${record.game.slug} has ${published.length} published evaluations in the selected rubric lineage; only one may be live.`,
    });
  }

  for (const superseded of history) {
    if (superseded.status !== "superseded") {
      issues.push({
        code: "history_not_superseded",
        message: `Historical evaluation "${superseded.id}" has status "${superseded.status}"; it must be "superseded".`,
      });
    }
    if (superseded.versionNumber >= record.evaluation.versionNumber) {
      issues.push({
        code: "history_version_not_earlier",
        message: `Historical evaluation "${superseded.id}" (version ${superseded.versionNumber}) is not earlier than the current version ${record.evaluation.versionNumber}.`,
      });
    }
  }

  // ---------------------------------------------------------------------
  // Every edge of the chain, not just the newest one.
  //
  // Checking only the current evaluation's link leaves a three-version chain
  // free to have a broken, skipped or reversed link in its middle — and the
  // seed generator would then have to guess what was meant. Ordered by version,
  // the oldest evaluation supersedes nothing and every later one supersedes
  // exactly its immediate predecessor.
  // ---------------------------------------------------------------------
  const ordered = [...chain].sort((a, b) => a.versionNumber - b.versionNumber);
  const byId = new Map(chain.map((e) => [e.id, e]));

  ordered.forEach((evaluation, index) => {
    const link = evaluation.supersedesEvaluationId;
    const predecessor = index === 0 ? null : ordered[index - 1]!;

    if (!predecessor) {
      if (link) {
        issues.push({
          code: "oldest_evaluation_supersedes",
          message: `Evaluation "${evaluation.id}" is the oldest in the chain but claims to supersede "${link}".`,
        });
      }
      return;
    }

    if (!link) {
      issues.push({
        code: "missing_supersession_link",
        message: `Evaluation "${evaluation.id}" (version ${evaluation.versionNumber}) does not record what it supersedes; it should supersede "${predecessor.id}".`,
      });
      return;
    }

    const target = byId.get(link);
    if (!target) {
      issues.push({
        code: "dangling_supersession_link",
        message: `Evaluation "${evaluation.id}" supersedes "${link}", which is not part of this game's chain.`,
      });
      return;
    }

    if (target.gameId !== evaluation.gameId) {
      issues.push({
        code: "cross_game_supersession",
        message: `Evaluation "${evaluation.id}" supersedes "${link}", which belongs to a different game.`,
      });
      return;
    }

    if (target.rubricVersion !== evaluation.rubricVersion) {
      issues.push({
        code: "cross_rubric_supersession",
        message: `Evaluation "${evaluation.id}" under rubric ${evaluation.rubricVersion} supersedes "${link}" under rubric ${target.rubricVersion}.`,
      });
      return;
    }

    if (target.versionNumber >= evaluation.versionNumber) {
      issues.push({
        code: "supersession_not_forward",
        message: `Evaluation "${evaluation.id}" (version ${evaluation.versionNumber}) supersedes version ${target.versionNumber}, which is not earlier.`,
      });
      return;
    }

    if (target.id !== predecessor.id) {
      issues.push({
        code: "supersession_skips_history",
        message: `Evaluation "${evaluation.id}" supersedes "${link}" (version ${target.versionNumber}) rather than its immediate predecessor "${predecessor.id}" (version ${predecessor.versionNumber}).`,
      });
    }
  });

  for (const evaluation of chain) {
    issues.push(...validateEvaluation(evaluation));
  }

  return issues;
}

export function assertValidGameRecord(record: GameWithEvaluation): void {
  for (const evaluation of [...(record.history ?? []), record.evaluation]) {
    evaluationSchema.parse(evaluation);
  }
  const issues = validateGameRecord(record);
  if (issues.length > 0) {
    throw new Error(
      `Game record ${record.game.slug} failed validation:\n` +
        issues.map((i) => `  [${i.code}] ${i.message}`).join("\n"),
    );
  }
}

export function assertValidEvaluation(evaluation: Evaluation): void {
  evaluationSchema.parse(evaluation);
  const issues = validateEvaluation(evaluation);
  if (issues.length > 0) {
    throw new Error(
      `Evaluation ${evaluation.id} failed validation:\n` +
        issues.map((i) => `  [${i.code}] ${i.message}`).join("\n"),
    );
  }
}
