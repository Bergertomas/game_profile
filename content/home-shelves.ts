import type { ShelfDefinition } from "@/lib/home/shelves";

/**
 * THE APPROVED HOMEPAGE COLLECTIONS.
 *
 * P0.3 requires "a small version-controlled configuration [that] stores the
 * approved collections, membership, copy, publication window, expiry, and
 * fallback", changed and reviewed like editorial content. This is that file.
 * `lib/home/shelves.ts` is the machine; nothing below is code that decides
 * anything, and nothing here may be generated.
 *
 * ── What may be added here, and by whom ────────────────────────────────────
 *
 * An OBJECTIVE shelf restates a record the corpus already publishes — a
 * publication date, a release date, a supersession. It makes no qualitative
 * claim, so it is safe to configure from the data alone.
 *
 * An EVERGREEN or LIVING shelf is a qualitative editorial claim about which
 * games belong together and why. P0.3 is explicit that Tomas approves every
 * one of those, and that profile data may nominate candidates but no score
 * threshold places a game in a collection. So there are none below: writing
 * "Story first: Alan Wake 2, Returnal" here would be an engineering agent
 * publishing an editorial judgement in the reader's name.
 *
 * This is the same posture `content/search-registry.ts` takes, and for the same
 * reason. The behaviour is built and tested — evergreen membership, living
 * windows, expiry and evergreen fallback are all exercised in
 * tests/home-shelves.test.ts and reviewable at `/dev/home-states` — and what is
 * absent is the DATA. That is a decision, not a gap.
 *
 * ── Dates are build-time ───────────────────────────────────────────────────
 *
 * The public site is a static artifact, so a rolling range and a publication
 * window are both evaluated when the site is built. A living shelf closes at
 * the first build after its `until` date. Publication triggers a build, which
 * is what keeps the two in step; a catalogue left unbuilt for months is the
 * case this cannot fix, and the honest answer to it is to build.
 */
export const HOME_SHELVES: readonly ShelfDefinition[] = [
  {
    id: "newly-profiled",
    kind: "objective",
    heading: "Newly profiled",
    // "Recently published" refers truthfully to publication on Should I Play?,
    // never to the game's release date (P0 §7). The note says which, because
    // those two readings are the one thing a reader could get wrong here, and
    // it deliberately carries no number: a static artifact cannot promise that
    // "the last 120 days" is still measured from today.
    note: "Game Profiles published here recently, newest first. Not a ranking.",
    membership: { rule: "profiled-within-days", days: 120 },
    minimumMembers: 2,
  },
  {
    id: "recently-reassessed",
    kind: "objective",
    heading: "Recently reassessed",
    note: "Profiles republished after a new evaluation replaced an earlier one.",
    membership: { rule: "reassessed" },
    minimumMembers: 2,
  },
  {
    id: "recent-releases",
    kind: "objective",
    heading: "Recent releases in the Field Guide",
    note: "Profiled games that came out in the last year.",
    membership: { rule: "released-within-days", days: 365 },
    minimumMembers: 2,
  },
];
