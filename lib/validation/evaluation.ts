import { z } from "zod";
import { getRubric, UNKNOWN, type DimensionKey } from "@/lib/rubric";
import { isTagKey } from "@/lib/rubric/tags";
import { deriveDimensionScore } from "@/lib/scoring/derive";
import type { Evaluation } from "@/lib/profile/types";

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
  confidence: z.enum(["low", "medium", "high"]),
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
      note: z.string().optional(),
    }),
  ),
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

  let anyProvisionalDimension = false;

  for (const dimension of rubric.dimensions) {
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
      if (score.unknownCount > 1) anyProvisionalDimension = true;
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

  // Plan §9.2 — unknown coverage caps confidence.
  if (anyProvisionalDimension && evaluation.confidence === "high") {
    issues.push({
      code: "confidence_too_high",
      message:
        "Confidence cannot be High while a dimension has more than one unknown subcriterion.",
    });
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

  // Rubric §14 — pre-release profiles must not present false certainty.
  if (evaluation.evidenceStatus === "pre_release") {
    if (evaluation.confidence === "high") {
      issues.push({
        code: "pre_release_confidence",
        message: "A pre-release profile cannot claim High confidence.",
      });
    }
  }

  if (evaluation.status === "published" && !evaluation.publishedAt) {
    issues.push({
      code: "missing_published_at",
      message: "A published evaluation must record publishedAt.",
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
