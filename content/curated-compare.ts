import type { CuratedPairConfig } from "@/lib/home/curated-compare";

/**
 * The approved "Choosing between…" comparisons. Deliberately empty.
 *
 * ── Why there is nothing here ──────────────────────────────────────────────
 *
 * An entry is two editorial claims at once: that these two games are a decision
 * a reader is actually weighing, and that the tension between them is the one
 * named in the sentence. P0 §6 reserves nuanced editorial interpretation for
 * selected curated comparisons, and P0.3 puts every qualitative editorial claim
 * behind Tomas's approval. Nothing in this repository approves a pair or a
 * sentence, and inventing one to fill the accepted composition would publish
 * fabricated editorial content in a module whose entire value is that a person
 * chose it.
 *
 * So the module ships with no entries and renders nothing at all — no heading,
 * no empty track, no placeholder pair. The grammar is built, contract-tested in
 * tests/curated-compare.test.ts and reviewable against labelled fixtures at
 * `/dev/home-states`; what is absent is the data.
 *
 * ── What an entry must carry when one is approved ──────────────────────────
 *
 * Two published profiles, and one sentence naming the trade-off between them.
 * Never a winner, a score, a percentage or a "most compared" claim. The route
 * into full Compare is supplied by the page and is deliberately absent until
 * `/compare` exists (Slice 4) — an entry added before then still renders, and
 * still sends a reader to two real profiles rather than to a dead link.
 */
export const CURATED_COMPARISONS: readonly CuratedPairConfig[] = [];
