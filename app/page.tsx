import Link from "next/link";
import { EvidenceBadge } from "@/components/EvidenceStrip";
import { MiniRadar } from "@/components/MiniRadar";
import { listGameProfiles } from "@/lib/data/games";
import type { DimensionView, ProfileView } from "@/lib/profile/build";
import { dimensionsInRadarOrder } from "@/lib/rubric";

/**
 * Index for the vertical slice.
 *
 * Its job is the first success criterion: three deliberately contrasting games
 * should look like three different kinds of game before anyone reads a word of
 * explanation. The full home page (search, collections, featured releases) is
 * Phase 3 and deliberately not built here.
 */
export default async function HomePage() {
  const profiles = await listGameProfiles();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="max-w-2xl">
        <h1 className="display text-[2rem] leading-[1.1] text-bone sm:text-[2.75rem]">
          Not just whether a game is good.
          <br />
          <span className="text-brass">What kind of good is it?</span>
        </h1>
        <p className="mt-5 text-base leading-relaxed text-bone-dim">
          Every game here is described across the same eight dimensions, scored
          0–10 each against a published rubric. We do not average them into an
          overall score, because an 87 can describe a beautifully written but
          clumsy RPG or a nearly storyless, mechanically perfect action game —
          and those are completely different purchases.
        </p>
      </section>

      <section aria-labelledby="catalog-heading" className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line pb-4">
          <h2 id="catalog-heading" className="display text-xl text-bone">
            Three shapes
          </h2>
          <p className="max-w-md text-[0.8125rem] leading-snug text-bone-dim sm:text-right">
            Same eight axes in the same order on every profile. Compare the{" "}
            <span className="text-bone">shape, not the size</span> — a bigger
            polygon is not a higher rating.
          </p>
        </div>

        <AxisLegend />

        <ul className="mt-8 grid gap-px bg-line md:grid-cols-3">
          {profiles.map((profile) => (
            <li key={profile.game.slug} className="bg-ink-950">
              <ProfileCard profile={profile} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Names the fixed axis order once, so the label-free card radars are readable. */
function AxisLegend() {
  const dimensions = dimensionsInRadarOrder();
  return (
    <div className="mt-6 border border-line bg-ink-900/60 px-3 py-3 sm:px-4">
      <span className="label-micro text-bone-faint">
        Axis order · clockwise from top
      </span>
      <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {dimensions.map((dimension, index) => (
          <li
            key={dimension.key}
            className="flex items-baseline gap-1.5 text-[0.8125rem] text-bone-dim"
          >
            <span className="tabular text-[0.6875rem] text-bone-faint">
              {index + 1}
            </span>
            {dimension.name}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProfileCard({ profile }: { profile: ProfileView }) {
  const scored = profile.dimensions.filter(
    (d) => d.score.kind !== "insufficient",
  );
  const sorted = [...scored].sort((a, b) => scoreOf(b) - scoreOf(a));
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];

  return (
    <Link
      href={`/games/${profile.game.slug}`}
      className="group flex h-full flex-col p-5 transition-colors hover:bg-ink-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="display text-xl leading-tight text-bone">
            {profile.game.canonicalTitle}
          </h3>
          <p className="mt-1 text-[0.8125rem] text-bone-faint">
            {profile.game.developerText} ·{" "}
            <span className="tabular">
              {profile.game.firstReleaseDate.slice(0, 4)}
            </span>
          </p>
        </div>
        <EvidenceBadge
          status={profile.evaluation.evidenceStatus}
          className="shrink-0"
        />
      </div>

      <div className="mx-auto mt-5 w-full max-w-[15rem]">
        <MiniRadar points={profile.radar} />
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-line pt-4">
        {highest && <Extreme label="Highest" view={highest} />}
        {lowest && <Extreme label="Lowest" view={lowest} />}
      </dl>

      <p className="mt-4 text-[0.8125rem] leading-relaxed text-bone-dim">
        {profile.evaluation.oneLineExperience}
      </p>

      <span className="label-micro mt-auto inline-block pt-5 text-bone-faint transition-colors group-hover:text-brass">
        Full profile →
      </span>
    </Link>
  );
}

function Extreme({ label, view }: { label: string; view: DimensionView }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="truncate text-[0.8125rem] text-bone-dim">
        <span className="label-micro mr-2 text-bone-faint">{label}</span>
        {view.dimension.name}
      </dt>
      <dd className="tabular shrink-0 text-sm font-semibold text-brass">
        {view.display}
      </dd>
    </div>
  );
}

function scoreOf(view: DimensionView): number {
  return view.score.kind === "exact"
    ? view.score.score
    : view.score.kind === "range"
      ? view.score.low
      : -1;
}
