import { z } from "zod";
import { getRubric, SUBCRITERION_SCALE, UNKNOWN } from "@/lib/rubric";
import { TAGS } from "@/lib/rubric/tags";
import { CURRENT_RUBRIC_VERSION } from "@/lib/rubric";
import type { DimensionKey, SubcriterionValue } from "@/lib/rubric";

/**
 * What the evaluation forms accept.
 *
 * The rule these follow is the same one the 2B schemas follow: this is not a
 * second copy of the database's constraints, and it is emphatically not the
 * publication gate. Master Plan §8.8 lists what publication will check — a
 * complete score grid, required rationales, every interpretation block — and
 * none of it is required here, because a draft exists precisely so an editor
 * can stop halfway and come back.
 *
 * What is enforced is the part a constraint cannot do well: turning browser
 * strings into rubric values, refusing a score off the half-point scale before
 * Postgres has to, and keeping Unknown distinct from empty.
 */

const optionalText = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const requiredText = (field: string, max = 2000) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, `${field} is required.`).max(max));

const isoDate = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker."));

const optionalIsoDate = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value === "" ? undefined : value))
  .optional()
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker.").optional());

export const confidenceSchema = z.enum(["low", "medium", "high"]);
export const evidenceStatusSchema = z.enum(["verified", "provisional", "pre_release"]);
export const evidenceMaturitySchema = z.enum([
  "announced",
  "showcased",
  "hands_on",
  "review_code",
]);
export const ledgerSchema = z.enum(["populated", "pending"]);
export const provenanceSchema = z.enum(["editorial", "calibration", "derived"]);

/**
 * Evaluation context — the declared scope of what is being evaluated.
 *
 * Rubric §1 makes edition, mode, platforms and build mandatory: a profile that
 * does not say what it evaluated is not falsifiable. They are therefore
 * required to CREATE a draft, which is the one place this schema is strict —
 * and they are exactly the columns Postgres marks NOT NULL, so requiring them
 * here only moves the refusal somewhere an editor can read it.
 */
const contextFields = z.object({
  rubricVersion: z.literal(CURRENT_RUBRIC_VERSION),
  editionScope: requiredText("Edition", 300),
  modeScope: requiredText("Mode", 300),
  /** At least one: "which platforms did you evaluate?" has no empty answer. */
  platformScope: z
    .array(z.string().trim().min(1))
    .min(1, "Name at least one platform this evaluation covers."),
  buildOrPatchScope: requiredText("Build or patch", 300),
  currentStateCutoffAt: optionalIsoDate,
  evidenceCutoffAt: isoDate,
  releaseContext: requiredText("Release context", 120),
  evidenceStatus: evidenceStatusSchema,
  evidenceMaturity: evidenceMaturitySchema.optional(),
  confidence: confidenceSchema,
  evidenceLedger: ledgerSchema,
  scoreProvenance: provenanceSchema,
  calibrationRound: optionalText,
  provenanceNote: optionalText,
});

/**
 * The three cross-field rules Postgres already holds, stated where an editor
 * meets them.
 *
 * Each mirrors a check constraint: `pre_release_declares_maturity`,
 * `pre_release_confidence_ceiling`, and the provenance biconditional. They
 * apply to a DRAFT as much as to a published row, which is why they belong here
 * and not in the 2D publish gate.
 */
export const evaluationContextSchema = contextFields.superRefine((value, ctx) => {
  if (value.evidenceStatus === "pre_release" && !value.evidenceMaturity) {
    ctx.addIssue({
      code: "custom",
      path: ["evidenceMaturity"],
      message:
        'A pre-release profile must say how mature the evidence is. "Pre-release" alone does not tell a reader whether anyone has played it.',
    });
  }
  if (value.evidenceStatus === "pre_release" && value.confidence === "high") {
    ctx.addIssue({
      code: "custom",
      path: ["confidence"],
      message:
        "A pre-release profile cannot claim High overall confidence (Rubric §14). An individual dimension still may.",
    });
  }
  if (value.scoreProvenance === "calibration" && !value.calibrationRound) {
    ctx.addIssue({
      code: "custom",
      path: ["calibrationRound"],
      message: "Calibration provenance must name the round that approved these totals.",
    });
  }
  if (value.scoreProvenance === "derived" && !value.provenanceNote) {
    ctx.addIssue({
      code: "custom",
      path: ["provenanceNote"],
      message:
        "Derived provenance requires a note. A reader is entitled to know the numbers have not been through editorial review.",
    });
  }
});

export type EvaluationContextInput = z.infer<typeof evaluationContextSchema>;

/**
 * A subcriterion value: one of the five rubric steps, `unknown`, or cleared.
 *
 * THREE STATES, and the distinction is load-bearing:
 *
 *   ""        — cleared. The row is deleted; nobody has authored this.
 *   "unknown" — authored, and the evidence does not settle it (Rubric §1).
 *   "0".."2"  — an exact half-point score. `0` is a real score, not an absence.
 *
 * Read off the rubric's own scale rather than a hardcoded list, so a rubric
 * version that changed the scale could not leave this behind.
 */
const SCALE_VALUES = SUBCRITERION_SCALE.map((step) => String(step.value));

export const subcriterionValueSchema = z
  .string()
  .transform((raw) => raw.trim())
  .superRefine((raw, ctx) => {
    if (raw === "" || raw === UNKNOWN || SCALE_VALUES.includes(raw)) return;
    ctx.addIssue({
      code: "custom",
      message: `A score must be one of ${SCALE_VALUES.join(", ")}, or Unknown.`,
    });
  })
  .transform((raw): SubcriterionValue | null => {
    if (raw === "") return null;
    if (raw === UNKNOWN) return UNKNOWN;
    return Number(raw) as SubcriterionValue;
  });

function dimensionKeySchema() {
  const keys = getRubric(CURRENT_RUBRIC_VERSION).dimensions.map((d) => d.key);
  return z.string().refine((key): key is DimensionKey => keys.includes(key as DimensionKey), {
    message: "Unknown dimension.",
  });
}

export const subcriterionSchema = z.object({
  dimensionKey: dimensionKeySchema(),
  subcriterionKey: z.string().trim().min(1),
  value: subcriterionValueSchema,
  rationale: optionalText,
  /**
   * Prose context on the canonical score, e.g. "PC is demanding at ray-traced
   * presets". A materially different value on a platform is an override row,
   * not a note (ADR 0015).
   */
  platformNote: optionalText,
  evidenceConfidence: confidenceSchema.optional(),
});

export type SubcriterionInput = z.infer<typeof subcriterionSchema>;

export const dimensionAssessmentSchema = z.object({
  dimensionKey: dimensionKeySchema(),
  confidence: confidenceSchema,
  note: optionalText,
});

export type DimensionAssessmentInput = z.infer<typeof dimensionAssessmentSchema>;

/**
 * A platform override. `value` may be Unknown but never absent: an override row
 * that says nothing is not an override.
 */
export const platformOverrideSchema = z.object({
  dimensionKey: dimensionKeySchema(),
  subcriterionKey: z.string().trim().min(1),
  platformId: z.uuid("Choose a platform."),
  value: subcriterionValueSchema.refine((value) => value !== null, {
    message: "An override needs a value — a score, or Unknown on this platform.",
  }),
  rationale: requiredText("Rationale", 2000),
  evidenceConfidence: confidenceSchema.optional(),
});

export type PlatformOverrideInput = z.infer<typeof platformOverrideSchema>;

export const evidenceTierSchema = z.enum(["A", "B", "C", "D"]);
export const sourceCategorySchema = z.enum([
  "direct_play",
  "critic",
  "technical",
  "specialist_creator",
  "player_signal",
  "first_party",
]);

/**
 * An evidence source.
 *
 * `sourceKey` is identity (ADR 0006) and follows the same shape rules as any
 * other stable key. Titles are deliberately not unique.
 */
export const evidenceSourceSchema = z.object({
  sourceKey: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(
      z
        .string()
        .min(1, "A source key is required.")
        .max(120)
        .regex(
          /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/,
          "Lowercase letters, numbers, hyphens and underscores only — e.g. src_aw2_technical_analysis.",
        ),
    ),
  title: requiredText("Title", 500),
  url: optionalText,
  publisher: optionalText,
  author: optionalText,
  publishedAt: optionalIsoDate,
  accessedAt: optionalIsoDate,
  tier: evidenceTierSchema,
  category: sourceCategorySchema,
  sourceType: optionalText,
});

export type EvidenceSourceInput = z.infer<typeof evidenceSourceSchema>;

/**
 * Mapping a source onto this evaluation.
 *
 * A subcriterion may only be named alongside its dimension — the database
 * enforces the same thing with `evidence_subcriterion_requires_dimension`, and
 * an editor should meet it as a form rule rather than a constraint violation.
 */
export const evidenceLinkSchema = z
  .object({
    evidenceSourceId: z.uuid("Choose a source."),
    dimensionKey: z
      .string()
      .transform((value) => (value.trim() === "" ? undefined : value.trim()))
      .optional()
      .pipe(dimensionKeySchema().optional()),
    subcriterionKey: optionalText,
    platformScope: z.array(z.string().trim().min(1)).optional(),
    note: optionalText,
    /** SOP §6: spoiler-sensitive notes are recorded, never surfaced blind. */
    spoilerSensitive: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.subcriterionKey && !value.dimensionKey) {
      ctx.addIssue({
        code: "custom",
        path: ["subcriterionKey"],
        message:
          "A subcriterion-level mapping has to say which dimension it belongs to.",
      });
    }
  });

export type EvidenceLinkInput = z.infer<typeof evidenceLinkSchema>;

const TAG_KEYS = TAGS.map((tag) => tag.key);

export const tagSelectionSchema = z.object({
  key: z.string().refine((key) => TAG_KEYS.includes(key), {
    message: "That tag is not in the controlled vocabulary.",
  }),
  intensity: z.enum(["low", "medium", "high"]).optional(),
  note: optionalText,
});

export type TagSelectionInput = z.infer<typeof tagSelectionSchema>;

/**
 * The interpretation blocks, by evidence state.
 *
 * Released and pre-release profiles use different vocabulary (Plan §3.6), and
 * the mapping is fixed: the same three block types carry different headings
 * rather than becoming different block types. That keeps a profile's shape
 * stable when a pre-release game launches and its evaluation is revised.
 */
export const BLOCK_HEADINGS = {
  released: {
    great_fit: "Great fit if…",
    know_before: "Know before buying…",
    probably_not: "Probably not for you if…",
  },
  pre_release: {
    great_fit: "Looks promising if…",
    know_before: "Watch before buying…",
    probably_not: "Biggest unknowns…",
  },
} as const;

export const interpretationSchema = z.object({
  oneLineExperience: optionalText,
  primaryPull: optionalText,
  primaryRisk: optionalText,
  platformWarning: optionalText,
  blocks: z.object({
    great_fit: z.array(z.string().trim().min(1)),
    know_before: z.array(z.string().trim().min(1)),
    probably_not: z.array(z.string().trim().min(1)),
  }),
});

export type InterpretationInput = z.infer<typeof interpretationSchema>;
