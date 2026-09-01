import { byCodeUnit } from "@/lib/order";
import { normalize } from "./text";
import type { RecognizedEntry } from "./types";

/**
 * The editorial shape of a recognised-but-unprofiled game.
 *
 * Authored by hand in content/search-registry.ts, one row per explicit
 * editorial opt-in. Nothing arrives here from a provider, an import or a
 * catalogue scrape: a row is a claim about our own coverage, and only an editor
 * can make one.
 */
export interface RegisteredGame {
  /** Stable, lowercase-hyphenated, unique across the registry. */
  readonly id: string;
  readonly title: string;
  /** Other names a visitor might type. Optional; empty is normal. */
  readonly aliases?: readonly string[];
  /** Why it is not profiled. Shown to the reader — see the registry file. */
  readonly note: string;
}

/**
 * Turn authored rows into index entries, refusing anything malformed.
 *
 * ── Why this throws rather than skipping ───────────────────────────────────
 *
 * It runs at build time, and every failure it can see is an editing mistake in
 * a file a human just wrote: a duplicate id, a blank note, a title that
 * normalises to nothing. Dropping the row would ship a catalogue quietly
 * missing an entry somebody believed they had added, and the build is the last
 * moment anyone is looking.
 *
 * `slugsToExclude` is the published catalogue's own identity set. A game that
 * has since been profiled must not also appear as "recognised, not profiled" —
 * the registry row is simply stale at that point, and showing both would have
 * the product contradict itself in one listbox.
 */
export function toRecognizedEntries(
  games: readonly RegisteredGame[],
  slugsToExclude: ReadonlySet<string> = new Set(),
): readonly RecognizedEntry[] {
  const seen = new Set<string>();
  const entries: RecognizedEntry[] = [];

  for (const game of games) {
    if (!game.id.trim()) {
      throw new Error(`Search registry: an entry has no id (${game.title}).`);
    }
    if (seen.has(game.id)) {
      throw new Error(`Search registry: duplicate id "${game.id}".`);
    }
    seen.add(game.id);

    if (!game.note.trim()) {
      throw new Error(
        `Search registry: "${game.id}" has no note. A recognised game gets no ` +
          `page, so the note is the whole of what the product says about it.`,
      );
    }

    const terms = uniqueTerms([game.title, ...(game.aliases ?? [])]);
    if (terms.length === 0) {
      throw new Error(
        `Search registry: "${game.id}" has no searchable title.`,
      );
    }

    if (slugsToExclude.has(game.id)) continue;

    entries.push({
      kind: "recognized",
      id: game.id,
      title: game.title,
      note: game.note,
      terms,
    });
  }

  return entries.sort(
    (a, b) => byCodeUnit(a.title, b.title) || byCodeUnit(a.id, b.id),
  );
}

/**
 * Normalised, de-duplicated, deterministically ordered match terms.
 *
 * Sorted rather than left in authored order because the index is serialised
 * into every page: two builds of one catalogue should produce byte-identical
 * output, and an array whose order depends on how somebody typed a list is not
 * that.
 */
export function uniqueTerms(values: readonly string[]): readonly string[] {
  return [
    ...new Set(values.map(normalize).filter((value) => value.length > 0)),
  ].sort(byCodeUnit);
}
