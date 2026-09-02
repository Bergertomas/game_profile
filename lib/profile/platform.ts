import type { SubcriterionValue } from "@/lib/rubric";
import { formatScore } from "@/lib/scoring/derive";
import type { DimensionView, ProfileView } from "./build";
import type { Confidence, Platform } from "./types";

/**
 * Platform truth, projected for the public page.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * Rubric §3 says a material platform difference is recorded rather than hidden
 * inside one unexplained number, and the data model has carried that since
 * ADR 0015: `platformWarning` on the evaluation, `platformNote` on a base
 * subcriterion, and `platformOverrides` beside it. The D3 promotion rendered
 * only the first. A reader deciding between the PC and the console build was
 * shown a number that the record itself says varies, and nothing on the page
 * said so. ADR 0032 names that as a Gate B truthfulness requirement: restore
 * the projection wherever it affects the decision.
 *
 * ── What it does not do ─────────────────────────────────────────────────────
 *
 * It never touches a total. The base subcriterion value is canonical and is the
 * only value that reaches a dimension score (lib/scoring/derive.ts); an
 * override is the exception layer, stated beside it. This module reads the
 * `ProfileView` after derivation and cannot reach back into it — which is the
 * property `tests/platform-projection.test.ts` pins across an override being
 * added.
 */

export interface PlatformNoteProjection {
  readonly dimensionKey: string;
  readonly dimensionName: string;
  readonly subcriterionKey: string;
  readonly subcriterionName: string;
  readonly note: string;
}

export interface PlatformOverrideProjection {
  readonly dimensionKey: string;
  readonly dimensionName: string;
  readonly subcriterionKey: string;
  readonly subcriterionName: string;
  readonly platform: Platform;
  /** The value on this platform. `unknown` is allowed and is never zero. */
  readonly value: SubcriterionValue;
  /** The canonical base value, which the override never replaces. */
  readonly baseValue: SubcriterionValue;
  readonly rationale: string;
  readonly confidence?: Confidence;
}

export interface PlatformProjection {
  /** The evaluation-level performance warning, where the record carries one. */
  readonly warning: string | null;
  readonly notes: readonly PlatformNoteProjection[];
  readonly overrides: readonly PlatformOverrideProjection[];
  /** Whether anything above exists at all — the page's "render or omit". */
  readonly hasMaterial: boolean;
}

/** Everything the record says varies by platform, in fixed radar order. */
export function projectPlatforms(profile: ProfileView): PlatformProjection {
  const notes: PlatformNoteProjection[] = [];
  const overrides: PlatformOverrideProjection[] = [];

  for (const view of profile.dimensions) {
    for (const sub of view.subcriteria) {
      if (sub.entry.platformNote) {
        notes.push({
          dimensionKey: view.dimension.key,
          dimensionName: view.dimension.name,
          subcriterionKey: sub.key,
          subcriterionName: sub.name,
          note: sub.entry.platformNote,
        });
      }
      for (const override of sub.entry.platformOverrides ?? []) {
        overrides.push({
          dimensionKey: view.dimension.key,
          dimensionName: view.dimension.name,
          subcriterionKey: sub.key,
          subcriterionName: sub.name,
          platform: platformNamed(profile, override.platform),
          value: override.value,
          baseValue: sub.entry.value,
          rationale: override.rationale,
          ...(override.confidence ? { confidence: override.confidence } : {}),
        });
      }
    }
  }

  const warning = profile.evaluation.platformWarning?.trim() || null;

  return {
    warning,
    notes,
    overrides,
    hasMaterial: warning !== null || notes.length > 0 || overrides.length > 0,
  };
}

/** The projection narrowed to one dimension, for its exact row. */
export function platformsForDimension(
  projection: PlatformProjection,
  view: DimensionView,
): {
  readonly notes: readonly PlatformNoteProjection[];
  readonly overrides: readonly PlatformOverrideProjection[];
} {
  const key = view.dimension.key;
  return {
    notes: projection.notes.filter((note) => note.dimensionKey === key),
    overrides: projection.overrides.filter((o) => o.dimensionKey === key),
  };
}

/**
 * A platform by slug, with the full public name. Validation refuses an override
 * for a platform the game does not ship on, so the fallback is a defence
 * against a record that bypassed it rather than an expected path — and it
 * still prints something a reader can act on rather than throwing the page.
 */
function platformNamed(profile: ProfileView, slug: string): Platform {
  return (
    profile.game.platforms.find((platform) => platform.slug === slug) ?? {
      slug,
      name: slug,
    }
  );
}

/** "1.0" or "Unknown" — the same words the subcriterion rows use. */
export function formatOverrideValue(value: SubcriterionValue): string {
  return value === "unknown" ? "Unknown" : formatScore(value);
}

/**
 * One override as a sentence: platform, value on it, and the base it deviates
 * from. The base is always named, so a reader never mistakes the deviation
 * for the published figure.
 */
export function describeOverride(override: PlatformOverrideProjection): string {
  return `${override.platform.name}: ${formatOverrideValue(override.value)} on this platform, against a base of ${formatOverrideValue(override.baseValue)}.`;
}
