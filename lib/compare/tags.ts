import type { TagIntensity } from "@/lib/rubric/tags";

/**
 * The canonical tag map: what two profiles share, and what is distinctive to
 * each (ADR 0034; handoff §10.4).
 *
 * Tags are compared BY KEY. Two labels that happen to read the same are not
 * the same tag, and a renamed label is still the same tag — the controlled
 * vocabulary in lib/rubric/tags.ts is the identity, and the display string is
 * just how it is currently written.
 *
 * A shared key with two different approved intensities stays shared and
 * exposes both intensities, one per game. It is not "less shared", and it is
 * not a disagreement to resolve. Nothing here counts, scores, percentages or
 * ranks the overlap: the three groups are the whole output.
 */

export interface CompareTag {
  readonly key: string;
  readonly label: string;
  readonly intensity?: TagIntensity;
  /** An approved editorial qualifier on this game's tag, e.g. "PC only." */
  readonly note?: string;
}

export interface SharedTag {
  readonly key: string;
  readonly label: string;
  readonly left: { readonly intensity?: TagIntensity; readonly note?: string };
  readonly right: { readonly intensity?: TagIntensity; readonly note?: string };
  /** Both sides carry an intensity and the two differ. */
  readonly intensitiesDiffer: boolean;
}

export interface TagComparison {
  readonly shared: readonly SharedTag[];
  readonly leftOnly: readonly CompareTag[];
  readonly rightOnly: readonly CompareTag[];
}

export const INTENSITY_LABEL: Readonly<Record<TagIntensity, string>> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Shared and left-only follow the left game's tag order; right-only the right's. */
export function compareTags(
  left: readonly CompareTag[],
  right: readonly CompareTag[],
): TagComparison {
  const rightByKey = new Map(right.map((tag) => [tag.key, tag]));
  const leftKeys = new Set(left.map((tag) => tag.key));

  const shared: SharedTag[] = [];
  const leftOnly: CompareTag[] = [];
  for (const tag of left) {
    const match = rightByKey.get(tag.key);
    if (!match) {
      leftOnly.push(tag);
      continue;
    }
    shared.push({
      key: tag.key,
      label: tag.label,
      left: pick(tag),
      right: pick(match),
      intensitiesDiffer:
        tag.intensity !== undefined &&
        match.intensity !== undefined &&
        tag.intensity !== match.intensity,
    });
  }
  const rightOnly = right.filter((tag) => !leftKeys.has(tag.key));

  return { shared, leftOnly, rightOnly };
}

function pick(tag: CompareTag): SharedTag["left"] {
  return {
    ...(tag.intensity ? { intensity: tag.intensity } : {}),
    ...(tag.note ? { note: tag.note } : {}),
  };
}
