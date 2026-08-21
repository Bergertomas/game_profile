/**
 * The one stable comparator, in a leaf module so anything may import it.
 *
 * ── Why this is not `localeCompare` ────────────────────────────────────────
 *
 * `String.prototype.localeCompare` answers according to a collation: the
 * runtime's default locale and whichever ICU data the runtime was built with.
 * Node can carry full, small or system ICU; workerd is a different
 * implementation again; and `LANG`/`LC_ALL` change the answer inside one
 * binary. Collations also give punctuation variable weight, so `-` and `_` can
 * be ignorable at primary strength.
 *
 * The same argument rules out `ORDER BY` in Postgres: a `C` database returns
 * "AW2" before "Alan Wake II" and an `en_US.utf8` one returns the reverse. CI
 * runs one and a laptop may run the other.
 *
 * ── Where it is load-bearing ───────────────────────────────────────────────
 *
 *   the manifest digest   `digestEntries` sorts before hashing. The BUILD
 *                         computes that digest and the VERIFIER recomputes it
 *                         in a different process on a different machine. If the
 *                         two sort differently, an honest manifest is refused
 *                         as `digest-mismatch` — the same signal the product
 *                         uses for a tampered one.
 *
 *   catalogue order       the order pages, cards and the sitemap are listed in.
 *                         Two builds of one corpus should be byte-identical.
 *
 *   record canonicalisation  fixture and Postgres reads must agree exactly, and
 *                         a JSON-LD `alternateName` list must not depend on
 *                         which database built the site.
 *
 * ── What it is, and is not ─────────────────────────────────────────────────
 *
 * UTF-16 code-unit order, which is what `<` and `>` on JavaScript strings
 * already do and what `Array.prototype.sort` does by default. It is not a human
 * collation and does not pretend to be: `Z` sorts before `a`. Every value it is
 * applied to is ASCII — slugs, scope keys, uuids, rubric versions, source ids —
 * and for those it is exactly alphabetical. Presentation ordering for a human
 * audience is a presentation concern, to be solved with an explicit locale at
 * the presentation layer, and never inside the digest.
 */
export function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
