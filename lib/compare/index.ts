import { formatYear } from "@/lib/format";
import { accentFor, type ProfileAccent } from "@/lib/profile/accent";
import { creditLineFor, heroArtworkFor } from "@/lib/profile/artwork";
import type { ProfileView, RadarPoint } from "@/lib/profile/build";
import {
  formatOverrideValue,
  platformsForDimension,
  projectPlatforms,
} from "@/lib/profile/platform";
import type { Confidence, EvidenceStatus, Platform } from "@/lib/profile/types";
import type { PublicSearchIndex } from "@/lib/search/types";
import type { DimensionScore } from "@/lib/scoring/derive";
import { profilePath } from "@/lib/site";
import type { CompareTag } from "./tags";

/**
 * The Compare index: everything the `/compare` page needs about every
 * profile it may be asked to show, assembled at build time.
 *
 * ── Why this exists, and why it is serialised into one page ────────────────
 *
 * The public path is build-time Postgres only (ADR 0017): the deployed Worker
 * has no database, so `/compare?games=a,b` cannot be rendered on demand from
 * the corpus, and ADR 0033 refuses to prerender every catalogue pair. What
 * remains is what the accepted design brief described — the static launcher
 * restores valid published profiles from the build corpus in the browser and
 * handles stale or invalid keys honestly. This index is that corpus, reduced to
 * what Compare states and nothing it does not: no subcriterion rationales, no
 * source ledger, no fit blocks. Those live on the profile, which every side
 * links to.
 *
 * It grows linearly with the catalogue and is shipped only on `/compare`. At
 * the scale where that matters, a per-profile static document is the next
 * step (Master Plan P2: "dynamic/server Compare if build scale requires it");
 * the shape below is already the shape such a document would have.
 *
 * ── Eligibility is decided here, once ──────────────────────────────────────
 *
 * `profiles` holds PUBLISHED PRIMARY profiles only. That is the whole first-
 * release eligibility rule (ADR 0033, 2 September 2026 amendment): a slug in
 * the URL names a game, a game's public address is its primary profile, and
 * a sibling scope — DLC, expansion, mode — has no place in the accepted
 * `?games=<slug>,<slug>` contract. The selector index still knows sibling and
 * recognised-only entries so the selector can say truthfully why they cannot
 * be chosen, rather than pretending not to know them.
 */

export interface CompareDimension {
  readonly key: string;
  readonly name: string;
  /** The rubric's one-line gloss. */
  readonly summary: string;
  /** The rubric's core question, for the row disclosure. */
  readonly question: string;
  readonly score: DimensionScore;
  /** Pre-formatted: "9.5", "6.0–8.0" or "Not scored". */
  readonly display: string;
  readonly confidence: Confidence;
  readonly notes: readonly { readonly subcriterion: string; readonly note: string }[];
  readonly overrides: readonly {
    readonly subcriterion: string;
    readonly platform: string;
    readonly value: string;
    readonly base: string;
    readonly rationale: string;
  }[];
}

export interface CompareArtwork {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly objectPosition: string;
  readonly credit: string;
  readonly clearance: "production" | "evaluation";
  /** The credit, or the full rights notice for review-only artwork. */
  readonly creditLine: string;
}

export interface CompareProfile {
  readonly slug: string;
  readonly title: string;
  readonly developer: string;
  readonly year: string | null;
  /** The canonical profile address. Truthful, never synthesised. */
  readonly path: string;
  readonly platforms: readonly Platform[];
  readonly scope: {
    readonly label: string;
    readonly edition: string;
    readonly mode: string;
    readonly buildOrPatch: string;
    readonly platforms: readonly string[];
  };
  readonly evidence: {
    readonly status: EvidenceStatus;
    readonly confidence: Confidence;
    readonly cutoffAt: string;
  };
  readonly platformWarning: string | null;
  readonly oneLineExperience: string;
  readonly primaryPull: string;
  readonly primaryRisk: string;
  readonly accent: ProfileAccent;
  /** Cleared artwork, or null. Null on every production build today (ADR 0011). */
  readonly artwork: CompareArtwork | null;
  readonly dimensions: readonly CompareDimension[];
  readonly radar: readonly RadarPoint[];
  readonly tags: readonly CompareTag[];
  readonly shapeDescription: string;
}

export interface CompareIndex {
  /** Eligible for Compare: published primary profiles, in catalogue order. */
  readonly profiles: readonly CompareProfile[];
  /** The Search index, so the selector speaks the same truth Search does. */
  readonly selector: PublicSearchIndex;
}

export function buildCompareIndex(
  profiles: readonly ProfileView[],
  selector: PublicSearchIndex,
): CompareIndex {
  return {
    profiles: profiles.filter((profile) => profile.scope.isPrimary).map(toCompareProfile),
    selector,
  };
}

export function toCompareProfile(view: ProfileView): CompareProfile {
  const { game, scope, evaluation } = view;
  const projection = projectPlatforms(view);
  const artwork = heroArtworkFor(game);

  return {
    slug: game.slug,
    title: game.canonicalTitle,
    developer: game.developerText,
    year: formatYear(game.firstReleaseDate) || null,
    path: profilePath(game.slug, scope),
    platforms: game.platforms,
    scope: {
      label: scope.label,
      edition: evaluation.scope.edition,
      mode: evaluation.scope.mode,
      buildOrPatch: evaluation.scope.buildOrPatch,
      platforms: evaluation.scope.platforms,
    },
    evidence: {
      status: evaluation.evidenceStatus,
      confidence: evaluation.confidence,
      cutoffAt: evaluation.evidenceCutoffAt,
    },
    platformWarning: projection.warning,
    oneLineExperience: evaluation.oneLineExperience,
    primaryPull: evaluation.primaryPull,
    primaryRisk: evaluation.primaryRisk,
    accent: accentFor(game.slug),
    artwork: artwork
      ? {
          url: artwork.url,
          width: artwork.width,
          height: artwork.height,
          objectPosition: artwork.objectPosition,
          credit: artwork.credit,
          clearance: artwork.clearance,
          creditLine: creditLineFor(artwork),
        }
      : null,
    dimensions: view.dimensions.map((dimension) => {
      const variance = platformsForDimension(projection, dimension);
      return {
        key: dimension.dimension.key,
        name: dimension.dimension.name,
        summary: dimension.dimension.summary,
        question: dimension.dimension.coreQuestion,
        score: dimension.score,
        display: dimension.display,
        confidence: dimension.confidence,
        notes: variance.notes.map((note) => ({
          subcriterion: note.subcriterionName,
          note: note.note,
        })),
        overrides: variance.overrides.map((override) => ({
          subcriterion: override.subcriterionName,
          platform: override.platform.name,
          value: formatOverrideValue(override.value),
          base: formatOverrideValue(override.baseValue),
          rationale: override.rationale,
        })),
      };
    }),
    radar: view.radar,
    tags: view.tags.map((tag) => ({
      key: tag.definition.key,
      label: tag.definition.label,
      ...(tag.intensity ? { intensity: tag.intensity } : {}),
      ...(tag.note ? { note: tag.note } : {}),
    })),
    shapeDescription: view.shapeDescription,
  };
}

/** The eligible profile for a slug, or null. */
export function eligibleProfile(
  index: CompareIndex,
  slug: string,
): CompareProfile | null {
  return index.profiles.find((profile) => profile.slug === slug) ?? null;
}
