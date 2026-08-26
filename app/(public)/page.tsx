import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { ProfileRadar } from "@/components/profile/radar";
import { full } from "@/components/profile/radar-layout";
import { listGameProfiles } from "@/lib/data/games";
import { accentFor } from "@/lib/profile/accent";
import type { ProfileView } from "@/lib/profile/build";
import { dimensionsInRadarOrder } from "@/lib/rubric";
import type { CSSProperties } from "react";

/**
 * The front door.
 *
 * It is a LIBRARY ENTRANCE, not a landing page. The order of the page is the
 * argument: the proposition in two lines, then the games, then — for anyone
 * curious enough to have scrolled past a shelf of covers — what a Game Profile
 * actually is.
 *
 * That order is deliberate and was the main thing wrong with the previous
 * homepage, which explained the methodology at length above three small
 * report-shaped cards. Methodology is why this product is worth trusting; it is
 * not why anyone arrives. Curiosity should pull a visitor into the rigour, not
 * the other way round. Somebody should get here and think "what does that game
 * look like", not "I understand the analytical framework".
 *
 * What is deliberately NOT here: a feature triptych, a gradient hero, a
 * newsletter box, statistics about ourselves, or navigation to rooms that do
 * not exist. Search, Discover and Compare are real plans and are not built.
 */
export default async function HomePage() {
  const profiles = await listGameProfiles();
  const example = profiles[0];

  return (
    <>
      {/* ── The proposition. Two lines, then out of the way. ──────────────── */}
      <section className="border-b border-rule">
        <div className="mx-auto w-full max-w-[74rem] px-5 py-12 sm:px-8 sm:py-16">
          <h1 className="sip-display max-w-[20ch] text-[2.5rem] sm:text-[3.5rem] lg:text-[4.25rem]">
            Not just whether a game is good.
          </h1>
          <p className="sip-prose mt-5 max-w-[46rem] text-[1.25rem] leading-[1.45] text-ink sm:text-[1.5rem]">
            <em>What kind of good is it?</em> Every game here gets a Game
            Profile: the same eight dimensions, scored 0–10 each against a
            published rubric, so you can see what a game is actually good at —
            and what might make it wrong for you.
          </p>
          <p className="sip-prose mt-4 max-w-[46rem] text-[1.0625rem] text-ink-soft">
            We never average them into an overall score. One game can stand out
            through story and atmosphere while another earns its shape through
            precise action and craft. Those are different experiences—and
            different reasons to play.
          </p>
        </div>
      </section>

      {/* ── The shelf. The reason the page exists. ────────────────────────── */}
      <section aria-labelledby="catalogue" className="border-b border-rule">
        <div className="mx-auto w-full max-w-[74rem] px-5 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="catalogue" className="sip-display text-[1.75rem]">
              In the library
            </h2>
            <p className="sip-label text-ink-quiet">
              {profiles.length} profiles · Rubric v1.0
            </p>
          </div>

          <ul className="mt-8 grid list-none grid-cols-1 gap-x-6 gap-y-10 p-0 min-[30rem]:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-3">
            {profiles.map((profile) => (
              <li key={profile.game.slug} className="flex min-w-0">
                <GameCard profile={profile} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Now that you have seen the games: what the mark on them means. ── */}
      {example && <ProfileExplainer example={example} />}
    </>
  );
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
      <div className="mx-auto w-full max-w-[74rem] px-5 py-12 sm:px-8 sm:py-16">
        <h2 id="read-a-profile" className="sip-display text-[1.75rem]">
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
