import type { RegisteredGame } from "@/lib/search/registry";

/**
 * The recognised-but-unprofiled registry. Deliberately empty.
 *
 * ── Why there is nothing here ──────────────────────────────────────────────
 *
 * A row in this file is a public editorial claim: "we know this game, we have
 * not profiled it, and here is why". It names a real product to a reader and
 * tells them something about our coverage of it. Nothing in this repository
 * approves any such claim yet — there is no sourced list of launch identities,
 * and inventing one to make the search box feel fuller would publish fabricated
 * editorial content in the one place a visitor is most likely to trust it.
 *
 * So the registry ships empty, and the search index is exactly the catalogue
 * the site actually publishes. A query for a game we have not profiled lands in
 * `unrecognized`, which is honest: today we genuinely do not recognise it.
 *
 * ── The state is built, tested and unreachable, on purpose ─────────────────
 *
 * Emptiness here is not "the feature is missing". `recognized` is a full state
 * in the matcher, the field and the tests (tests/search-registry.test.ts drives
 * it from a fixture registry), so the day an editor adds the first approved
 * entry the behaviour is already proven. What is absent is the DATA, and that
 * is a decision, not a gap.
 *
 * ── What a row may and may not carry ───────────────────────────────────────
 *
 * `note` is shown to the reader. It must state a fact about our coverage and
 * nothing else. "Not yet evaluated" is true; a promised date, a queue position,
 * a ranking or an opinion about the game is not ours to publish here — and a
 * recognised game gets no page, no stub and no route, so this note is the whole
 * of what the product says about it.
 *
 * There is no request or vote control on these rows and must not be one until a
 * real receiver, a stated privacy behaviour and a persistence contract exist. A
 * button that records nothing is a lie told with a click.
 */
export const RECOGNIZED_GAMES: readonly RegisteredGame[] = [];
