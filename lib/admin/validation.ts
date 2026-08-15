import { z } from "zod";

/**
 * What the editorial forms accept.
 *
 * These schemas are the boundary between a browser's `FormData` — every field
 * of which is a string, and none of which is trustworthy — and the domain.
 * They are deliberately NOT a second copy of the database's constraints: the
 * invariants that matter (one primary scope per game, a primary published under
 * each rubric its siblings publish under, artwork clearance, override
 * materiality) live in Postgres, where they hold against every writer including
 * a migration and a psql session.
 *
 * What lives here is the part a constraint cannot do well: turning blank
 * strings into NULLs, trimming, rejecting a slug shape before it becomes a URL,
 * and producing a message an editor can act on.
 *
 * Phase 2B covers games, their metadata and their profile scopes. Evaluation
 * and score authoring is 2C and is deliberately absent — `lib/validation/
 * evaluation.ts` already owns the publish-time rules for that.
 */

/** Trim, then treat "" as absent. An empty form field is not an empty value. */
const optionalText = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const requiredText = (field: string, max = 500) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, `${field} is required.`)
        .max(max, `${field} must be ${max} characters or fewer.`),
    );

/**
 * A public URL segment.
 *
 * Lowercase, hyphen-separated, no leading/trailing/doubled hyphens. Enforced
 * here rather than left to the unique index because a slug is the game's public
 * address: `/games/Alan Wake 2` is a broken URL long before it is a duplicate
 * one, and the database has no opinion about that.
 */
export const slugSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(1, "Slug is required.")
      .max(120, "Slug must be 120 characters or fewer.")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug may contain lowercase letters, numbers and single hyphens only.",
      ),
  );

/**
 * A scope key.
 *
 * The same shape as a slug and a different thing: it is the stable editorial
 * handle for one evaluated experience, and it appears in the sibling URL
 * `/games/<slug>/<key>`. Renaming one is migration-level identity work
 * (ADR 0014), which is why the editor warns rather than offering it casually.
 */
export const scopeKeySchema = slugSchema;

export const releaseStatusSchema = z.enum([
  "released",
  "upcoming",
  "early_access",
]);

/** An ISO date, or nothing. `<input type="date">` submits "" when cleared. */
const optionalDate = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value === "" ? undefined : value))
  .optional()
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker, or leave it empty.")
      .optional(),
  );

const optionalUrl = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value === "" ? undefined : value))
  .optional()
  .pipe(
    z
      .url("Enter a full URL, including https://.")
      .max(2000, "That URL is too long.")
      .optional(),
  );

export const gameSchema = z.object({
  slug: slugSchema,
  canonicalTitle: requiredText("Title", 300),
  /**
   * The one-sentence factual description of the game. Not the evaluation's
   * `one_line_experience`, which is an editorial judgement belonging to a
   * specific evaluation of a specific scope.
   */
  summary: optionalText,
  developerText: optionalText,
  publisherText: optionalText,
  releaseStatus: releaseStatusSchema,
  firstReleaseDate: optionalDate,
});

export type GameInput = z.infer<typeof gameSchema>;

export const aliasSchema = z.object({
  alias: requiredText("Alias", 300),
  /** e.g. "abbreviation", "regional", "working-title". Free text by design. */
  aliasType: optionalText,
});

export type AliasInput = z.infer<typeof aliasSchema>;

export const gamePlatformSchema = z.object({
  platformId: z.uuid("Choose a platform."),
  releaseDate: optionalDate,
  performanceNotes: optionalText,
});

export type GamePlatformInput = z.infer<typeof gamePlatformSchema>;

export const externalIdSchema = z.object({
  /**
   * Free text, matching the column. A new metadata provider must not require a
   * schema migration, and nothing in the renderer branches on the value
   * (Plan §7.4 — do not let the architecture depend on one supplier).
   */
  provider: requiredText("Provider", 120),
  externalId: requiredText("Provider ID", 200),
  externalUrl: optionalUrl,
});

export type ExternalIdInput = z.infer<typeof externalIdSchema>;

export const artworkRoleSchema = z.enum(["cover", "hero"]);
export const artworkClearanceSchema = z.enum(["production", "evaluation"]);
export const artworkBasisSchema = z.enum([
  "licence",
  "provider-terms",
  "press-kit",
  "permission",
  "internal-evaluation",
]);

/**
 * An artwork record, which is a rights record that happens to carry a URL.
 *
 * `clearance` and `basis` are required and have no default. That is the whole
 * design of ADR 0011: a bare URL records that an image is *reachable* and
 * nothing about whether it may be shown, so anything fetchable looks usable.
 * An editor pasting a URL must answer both questions in the same act.
 *
 * `width` and `height` are required because the stage composition needs the
 * intrinsic ratio to avoid layout shift, and because an image whose dimensions
 * nobody checked is usually one nobody looked at.
 */
const artworkFields = z.object({
  role: artworkRoleSchema,
  url: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.url("Enter the full image URL, including https://.")),
  width: z.coerce.number().int().positive("Width must be a positive number."),
  height: z.coerce.number().int().positive("Height must be a positive number."),
  altText: optionalText,
  focus: optionalText,
  source: requiredText("Source", 120),
  externalId: optionalText,
  clearance: artworkClearanceSchema,
  basis: artworkBasisSchema,
  credit: optionalText,
  sourcePage: optionalUrl,
  retrievedAt: optionalDate,
});

/**
 * Production clearance carries an extra obligation, and the editor states it.
 *
 * `game_artwork_production_is_attributable` requires a production-cleared row
 * to name who to credit and where the asset came from: it is a rights position
 * somebody took, so it has to be auditable. An evaluation-clearance record is
 * internal and is held to the looser rule.
 *
 * The database already refuses without them. This exists so an editor meets the
 * rule as two required fields with a reason, rather than as
 * "new row for relation game_artwork violates check constraint
 * game_artwork_production_is_attributable" after filling in the whole form.
 */
export const artworkSchema = artworkFields.superRefine((value, ctx) => {
  if (value.clearance !== "production") return;

  if (!value.credit) {
    ctx.addIssue({
      code: "custom",
      path: ["credit"],
      message:
        "Production-cleared artwork must name the rights holder to credit.",
    });
  }
  if (!value.sourcePage) {
    ctx.addIssue({
      code: "custom",
      path: ["sourcePage"],
      message:
        "Production-cleared artwork must record the page the asset came from, so the rights position is auditable.",
    });
  }
});

export type ArtworkInput = z.infer<typeof artworkSchema>;

export const profileScopeSchema = z.object({
  key: scopeKeySchema,
  label: requiredText("Label", 200),
  summary: optionalText,
  displayOrder: z.coerce
    .number()
    .int()
    .min(0, "Order must be zero or greater.")
    .max(9999, "Order must be 9999 or less."),
});

export type ProfileScopeInput = z.infer<typeof profileScopeSchema>;

/**
 * Parse `FormData` against a schema.
 *
 * Returns field-keyed messages rather than throwing, because every one of these
 * failures is something an editor mistyped and should see next to the field
 * they typed it in. A thrown `ZodError` in a Server Action is an error page.
 *
 * A failure also carries `values`: the raw strings that were submitted. React
 * 19 resets an uncontrolled form once its action resolves, so without echoing
 * them back, a single bad field empties every other one the editor had filled
 * in — including a long artwork record. See `ActionForm`.
 */
export function parseForm<T extends z.ZodType>(
  schema: T,
  form: FormData,
):
  | { ok: true; value: z.infer<T>; values: Record<string, string> }
  | { ok: false; errors: FieldErrors; values: Record<string, string> } {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") raw[key] = value;
  }

  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") values[key] = value;
  }

  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data, values };

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path.map(String).join(".") || "_";
    errors[field] ??= issue.message;
  }
  return { ok: false, errors, values };
}

/** One message per field — the first. A field with three problems has one fix. */
export type FieldErrors = Record<string, string>;
