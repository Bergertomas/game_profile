/**
 * The calibration and holdout titles the live provider-contract proof must
 * never touch (cohort lock, 2026-09-02; issue #48 §6 and the Item 5 audit).
 *
 * Item 5 proves the staging machinery against a NON-cohort record. Mapping
 * development titles is Item 6 work, one game at a time; holdout titles are
 * never staged into a development context. This guard refuses to print or
 * stage anything about a record whose provider name matches one of these, so
 * a mistyped id cannot turn a contract probe into cohort exposure.
 */

const PROTECTED_TITLE_FRAGMENTS: readonly string[] = [
  "alan wake",
  "battlefield 6",
  "tears of the kingdom",
  "banishers",
  "hellblade",
  "saros",
  "resident evil 4",
  "kingdom come",
  "astro bot",
  "immortals of aveum",
];

function fold(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** True when a provider name looks like a calibration or holdout title. */
export function isProtectedTitle(name: string | null | undefined): boolean {
  if (!name) return false;
  const folded = fold(name);
  return PROTECTED_TITLE_FRAGMENTS.some((fragment) => folded.includes(fragment));
}
