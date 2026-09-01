import Link from "next/link";
import { CuratedCompare } from "@/components/home/CuratedCompare";
import { EditorialShelves } from "@/components/home/EditorialShelf";
import { HomeOpening } from "@/components/home/HomeOpening";
import { ProfileRail } from "@/components/home/ProfileRail";
import { ProfileRadar } from "@/components/profile/radar";
import { full } from "@/components/profile/radar-layout";
import { CURATED_COMPARISONS } from "@/content/curated-compare";
import { HOME_SHELVES } from "@/content/home-shelves";
import { resolveCuratedPairs } from "@/lib/home/curated-compare";
import { resolveShelves } from "@/lib/home/shelves";
import { listGameProfiles } from "@/lib/data/games";
import { accentFor } from "@/lib/profile/accent";
import type { ProfileView } from "@/lib/profile/build";
import { dimensionsInRadarOrder } from "@/lib/rubric";
import type { CSSProperties } from "react";

/**
 * The front door — the accepted A1/A2 homepage system.
 *
 * The order of the page is the argument, and it is the one ADR 0030 froze:
 *
 *   1. the decision-first proposition, with Search inside it and the three
 *      journeys named — the opening (components/home/HomeOpening.tsx);
 *   2. the general "Start somewhere interesting" poster rail;
 *   3. the authored shelves that follow that rail;
 *   4. "Choosing between…" as a SECONDARY curated module — Compare is never
 *      the default homepage subject;
 *   5. what a Game Profile actually is, for anyone still reading.
 *
 * Search comes first and stays dominant because it is the one journey a
 * visitor with a game in mind can finish. Everything below it is browsing, and
 * browsing is what you offer somebody who did not arrive with a title.
 *
 * ── What is deliberately absent, and why that is the design ────────────────
 *
 * Sections 3 and 4 render nothing today. Both are driven by version-controlled
 * editorial configuration (P0.3), and both configurations ship empty because
 * every entry they could carry is a qualitative editorial claim that only
 * Tomas approves — see content/home-shelves.ts and content/curated-compare.ts.
 * The objective shelves that ARE configured resolve to nothing against a
 * three-profile catalogue, by the rule in lib/home/shelves.ts: a collection
 * that would contain the entire catalogue has selected nothing, and reprinting
 * the rail under a second heading is padding.
 *
 * So the page shows what the corpus can honestly support and no more. That is
 * the accepted composition working correctly, not an unfinished one: the
 * grammar is built, unit-tested and reviewable against labelled fixtures at
 * `/dev/home-states`. Nothing here is fabricated to fill a frame.
 *
 * The warm-paper "In the library" card grid that used to sit here is gone. It
 * was the pre-Gate-A library entrance, and the accepted composition puts the
 * poster rail in its place — two full catalogue listings on one homepage is not
 * a composition anybody accepted. `#catalogue` still resolves: the rail's
 * heading carries the id Search's recovery link points at.
 *
 * The field's index is not built here: the public layout reads it once and
 * provides it to the whole document, so it is serialised once per page rather
 * than once per field.
 */
export default async function HomePage() {
  const profiles = await listGameProfiles();
  const example = profiles[0];

  /*
   * Build time is the only "now" a static artifact has.
   *
   * Rolling ranges and publication windows are resolved here, once, while the
   * page is prerendered — there is no request-time data on the public path
   * (ADR 0017, 0031). A living shelf therefore closes at the first build after
   * its `until` date. Publication triggers a build, which is what keeps the two
   * in step.
   */
  const shelves = resolveShelves(HOME_SHELVES, profiles, new Date());
  const pairs = resolveCuratedPairs(CURATED_COMPARISONS, profiles);

  return (
    <>
      <HomeOpening profiles={profiles} />

      {/* ── The rail. The catalogue, as posters. ─────────────────────────── */}
      <ProfileRail
        heading="Start somewhere interesting"
        headingId="catalogue"
        note={railNote(profiles.length)}
        profiles={profiles}
      />

      <EditorialShelves shelves={shelves} />

      {/* Compare is accepted and unbuilt, so no route is passed and the module
          says so rather than publishing a link to a page that does not exist.
          Slice 4 supplies `compareRouteFor` and the accepted CTA appears. */}
      <CuratedCompare pairs={pairs} />

      {/* ── Now that you have seen the games: what the mark on them means. ── */}
      {example && <ProfileExplainer example={example} />}
    </>
  );
}

/**
 * What puts a profile on the general rail: publication, and nothing else.
 *
 * Stated rather than implied, because a horizontal row of games is the exact
 * shape a reader has learned to read as a chart. It is not one. There is no
 * ranking, no popularity, no editorial preference and no trending signal in
 * this order — it is the catalogue, alphabetically.
 */
function railNote(count: number): string {
  return count === 1
    ? "The one published Game Profile. Not a ranking."
    : `All ${count} published Game Profiles, in catalogue order. Not a ranking, and nothing here moves on its own.`;
}

/**
 * How to read a Game Profile, shown rather than described — on a real profile,
 * with its real numbers, because an abstract diagram of a scoring system is a
 * consultancy slide and this is a site about games.
 *
 * The three points it makes are the three the product actually rests on: fixed
 * axes, shape not size, and no overall score.
 */
function ProfileExplainer({ example }: { example: ProfileView }) {
  const accent = accentFor(example.game.slug);
  const dimensions = dimensionsInRadarOrder();

  return (
    <section
      aria-labelledby="read-a-profile"
      className="bg-graphite text-bone"
      style={
        {
          "--sip-accent-lift": accent.lift,
          "--sip-radar-ground": "var(--color-graphite)",
        } as CSSProperties
      }
    >
      <div className="mx-auto w-full max-w-[82rem] px-4 py-12 sm:px-10 sm:py-16">
        <h2 id="read-a-profile" className="sip-display sip-display--section text-[1.75rem]">
          What you are looking at
        </h2>

        <div className="mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-[26rem_minmax(0,1fr)]">
          <div>
            <ProfileRadar
              profile={example}
              active={null}
              layout={full({
                width: 500,
                height: 400,
                center: { x: 250, y: 198 },
                radius: 118,
                labelRadius: 140,
                nameSize: 14,
                valueSize: 20,
              })}
              skin={EXPLAINER_SKIN}
            />
            <p className="sip-label mt-2 text-center text-bone-quiet">
              {example.game.canonicalTitle}
            </p>
            <span className="sr-only">{example.shapeDescription}</span>
          </div>

          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-1 lg:gap-8">
            <Point n="1" title="The same eight axes, in the same order">
              Clockwise from the top:{" "}
              {dimensions.map((dimension, index) => (
                <span key={dimension.key}>
                  {index > 0 && ", "}
                  <span className="text-bone">{dimension.name}</span>
                </span>
              ))}
              . Never reordered, never weighted, never hidden — which is what
              makes two profiles comparable at a glance.
            </Point>
            <Point n="2" title="Read the shape, not the size">
              A bigger polygon is not a higher rating. It is a game that is
              strong across more of these eight things, which is a different
              claim — and often a less interesting one than a game with one
              enormous spike.
            </Point>
            <Point n="3" title="There is no overall score">
              Not hidden, not computed and withheld: not calculated at all.
              Nothing is derived from the area the shape encloses. Each
              dimension&rsquo;s 0–10 comes from five subcriteria worth 0–2 each,
              and where the evidence will not support a number, the profile says
              so instead of guessing one.{" "}
              <Link
                href="/methodology"
                className="underline decoration-rule-bone-strong underline-offset-[5px] transition-colors duration-150 hover:text-bone hover:decoration-signal"
              >
                How we score
              </Link>
              .
            </Point>
          </div>
        </div>
      </div>
    </section>
  );
}

const EXPLAINER_SKIN = {
  grid: "rgba(237,235,231,0.20)",
  gridOuter: "rgba(237,235,231,0.46)",
  fill: "var(--sip-accent-lift)",
  fillOpacity: 0.35,
  stroke: "var(--sip-accent-lift)",
  vertex: "var(--sip-accent-lift)",
  vertexEdge: "var(--color-graphite)",
  reach: "var(--color-bone-soft)",
  label: "var(--color-bone-quiet)",
  value: "var(--color-bone)",
  activeLabel: "var(--color-bone)",
  activeValue: "var(--sip-accent-lift)",
  activeMark: "var(--color-bone)",
} as const;

function Point({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-rule-bone pt-4">
      <h3 className="sip-label flex items-baseline gap-2.5 text-bone">
        <span className="sip-num text-signal">{n}</span>
        {title}
      </h3>
      <p className="sip-prose mt-2 max-w-[42rem] text-[0.9375rem] text-bone-soft">
        {children}
      </p>
    </div>
  );
}
