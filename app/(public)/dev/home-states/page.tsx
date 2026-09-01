import { notFound } from "next/navigation";
import { CuratedCompare } from "@/components/home/CuratedCompare";
import { EditorialShelves } from "@/components/home/EditorialShelf";
import { ProfileRail } from "@/components/home/ProfileRail";
import { alanWake2, redfall, returnal } from "@/content";
import { resolveCuratedPairs } from "@/lib/home/curated-compare";
import { resolveShelves, type ShelfDefinition } from "@/lib/home/shelves";
import { buildProfileView } from "@/lib/profile/build";
import type { GameWithEvaluation } from "@/lib/profile/types";
import { DESIGN_SURFACES_ENABLED } from "@/lib/site";

/**
 * Review harness for the Slice 2 homepage states the shipped catalogue cannot
 * reach.
 *
 * Three published profiles cannot produce a rail that overflows, a shelf that
 * selects a subset, a living shelf inside its window, an expired one falling
 * back, or a curated comparison — and the editorial configurations that would
 * produce the last three ship empty on purpose (content/home-shelves.ts,
 * content/curated-compare.ts). Those behaviours are unit-tested, but the rules
 * about how they *look* — "an expired shelf leaves no trace", "a preview never
 * covers the artwork", "both sides of a pair carry equal weight" — can only be
 * checked by looking at them.
 *
 * It renders the CANONICAL components, never a harness-only copy.
 *
 * ── The fixtures are labelled, and that is not decoration ──────────────────
 *
 * Every title below announces itself as a fixture. Nothing on this page may be
 * mistakeable for publication content, because the one failure mode a design
 * harness has is a screenshot of it being read as the product. The numbers,
 * prose and shapes are the real calibration corpus — they are approved content
 * — but the identities are not, and the titles say so.
 *
 * Site environment, not NODE_ENV: a Cloudflare branch preview is a
 * production-mode build of a non-production site. See lib/site.ts.
 */
export default function HomeStatesPage() {
  if (!DESIGN_SURFACES_ENABLED) notFound();

  const catalogue = FIXTURES.map(buildProfileView);
  const [first] = catalogue;

  return (
    <main className="min-h-screen bg-[var(--color-surface-canvas)] text-[var(--color-text-primary)]">
      <Note>
        <strong>Slice 2 state harness.</strong> Labelled fixtures, not published
        profiles. Every collection below is constructed here; the shipped
        editorial configuration is empty by decision.
      </Note>

      <Heading>1 · Rail that overflows — both controls become live</Heading>
      <ProfileRail
        heading="Fixture rail — overflowing"
        note="Eight fixture posters, so the step controls have somewhere to go. Not a ranking."
        profiles={catalogue}
      />

      <Heading>2 · Rail that fits — both controls stay disabled</Heading>
      {first && (
        <ProfileRail
          heading="Fixture rail — one poster"
          note="A rail with nothing to scroll. Both ends are reached, so both controls are disabled."
          profiles={[first]}
        />
      )}

      <Heading>
        3 · Objective shelf that selects a subset of the catalogue
      </Heading>
      <EditorialShelves
        shelves={resolveShelves(
          [
            {
              id: "fixture-objective",
              kind: "objective",
              heading: "Fixture — newly profiled",
              note: "Membership proved by publication date. Newest first, not a ranking.",
              membership: { rule: "profiled-within-days", days: 30 },
              minimumMembers: 2,
            },
          ],
          catalogue,
          new Date("2026-09-01T00:00:00Z"),
        )}
      />

      <Heading>
        4 · Living shelf inside its publication window. Its evergreen fallback
        is configured in its own right, so both are on the page.
      </Heading>
      <EditorialShelves
        shelves={resolveShelves(
          LIVING_FIXTURE,
          catalogue,
          new Date("2026-09-01T00:00:00Z"),
        )}
      />

      <Heading>
        5 · The same living shelf after expiry — the evergreen fallback takes
        its place, and the expired copy leaves no trace
      </Heading>
      <EditorialShelves
        shelves={resolveShelves(
          LIVING_FIXTURE,
          catalogue,
          new Date("2027-01-01T00:00:00Z"),
        )}
      />

      <Heading>
        6 · A shelf below its minimum renders nothing at all — no heading, no
        empty track. The gap under this line is the state.
      </Heading>
      <EditorialShelves
        shelves={resolveShelves(
          [
            {
              id: "fixture-thin",
              kind: "evergreen",
              heading: "Fixture — too thin to publish",
              note: "One member against a minimum of three.",
              members: [{ slug: alanWake2.game.slug }],
              minimumMembers: 3,
            },
          ],
          catalogue,
          new Date("2026-09-01T00:00:00Z"),
        )}
      />

      <Heading>
        7 · Curated comparison with its CTA deferred — full Compare is Slice 4,
        so the module says so instead of publishing a dead route
      </Heading>
      <CuratedCompare
        pairs={resolveCuratedPairs(
          [
            {
              id: "fixture-pair",
              left: { slug: alanWake2.game.slug },
              right: { slug: returnal.game.slug },
              tension:
                "Fixture tension sentence. A real entry names one decision a reader is weighing, never a winner.",
              context: "Fixture context line, shown only when an approved one exists.",
            },
          ],
          catalogue,
        )}
      />
      <Note>
        The CTA-present branch is covered by tests/curated-compare.test.ts. It is
        not shown here because it would need a link to <code>/compare</code>,
        which does not exist until Slice 4, and a harness that publishes a broken
        route teaches the wrong thing.
      </Note>
    </main>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mx-auto max-w-[82rem] px-4 pt-10 pb-2 text-[1rem] font-semibold text-[var(--color-brand-evidence-cyan)] sm:px-10">
      {children}
    </h2>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto max-w-[82rem] px-4 py-6 text-[0.875rem] leading-6 text-[var(--color-text-muted)] sm:px-10">
      {children}
    </p>
  );
}

/**
 * A living shelf and the evergreen shelf that replaces it once its window
 * closes. Both are needed to show state 5: the fallback must already exist as
 * a configured collection, which is what `assertShelvesAreWellFormed` requires.
 */
const LIVING_FIXTURE: readonly ShelfDefinition[] = [
  {
    id: "fixture-living",
    kind: "living",
    heading: "Fixture — living collection",
    note: "Time-bounded authored membership. Closes at the first build after its window.",
    members: [{ slug: returnal.game.slug }, { slug: redfall.game.slug }],
    window: { from: "2026-08-01", until: "2026-09-30" },
    fallbackId: "fixture-evergreen",
    minimumMembers: 2,
  },
  {
    id: "fixture-evergreen",
    kind: "evergreen",
    heading: "Fixture — evergreen fallback",
    note: "Durable authored membership, standing in once the living window closes.",
    members: [{ slug: alanWake2.game.slug }, { slug: returnal.game.slug }],
    minimumMembers: 2,
  },
];

/**
 * Eight fixture profiles from three real evaluations.
 *
 * Same approved numbers, prose and shapes; different, obviously-synthetic
 * identities and distinct scope keys so each poster is a separate list item
 * with its own address. One carries a deliberately punishing title, because a
 * rail that only ever sees short names is a rail nobody has tested.
 */
const LONG_TITLE =
  "Fixture — a deliberately long game title that has to wrap inside a poster without pushing the page sideways";

function fixture(
  base: GameWithEvaluation,
  title: string,
  scopeKey: string,
  publishedAt: string,
): GameWithEvaluation {
  return {
    ...base,
    game: { ...base.game, canonicalTitle: title },
    scope: { ...base.scope, key: scopeKey },
    evaluation: { ...base.evaluation, publishedAt },
  };
}

const FIXTURES: readonly GameWithEvaluation[] = [
  fixture(alanWake2, "Fixture 1 — art-led narrative", "fx-1", "2026-08-30"),
  fixture(returnal, "Fixture 2 — systems and execution", "fx-2", "2026-08-28"),
  fixture(redfall, "Fixture 3 — provisional evidence", "fx-3", "2026-08-25"),
  fixture(alanWake2, LONG_TITLE, "fx-4", "2026-08-20"),
  fixture(returnal, "Fixture 5", "fx-5", "2026-07-01"),
  fixture(redfall, "Fixture 6", "fx-6", "2026-06-01"),
  fixture(alanWake2, "Fixture 7", "fx-7", "2026-05-01"),
  fixture(returnal, "Fixture 8", "fx-8", "2026-04-01"),
];
