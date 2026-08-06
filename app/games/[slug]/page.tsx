import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceStrip, EvidenceSummary } from "@/components/EvidenceStrip";
import {
  ExperienceTags,
  PullRisk,
  RecommendationBlocks,
} from "@/components/ProfileBlocks";
import { ProfilePanel } from "@/components/ProfilePanel";
import { getGameProfile, listGameSlugs } from "@/lib/data/games";
import { formatDate } from "@/lib/format";

/**
 * The canonical game profile page (GP-005).
 *
 * Above the fold order follows Plan §6.1: identity, then the one-line
 * experience, then evidence, then pull and risk. Marketing-style descriptive
 * copy is deliberately pushed below the profile — the first viewport belongs to
 * the purchase decision.
 */

export async function generateStaticParams() {
  const slugs = await listGameSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getGameProfile(slug);
  if (!profile) return { title: "Not found" };

  return {
    title: `${profile.game.canonicalTitle} — profile`,
    description: profile.evaluation.oneLineExperience,
    alternates: { canonical: `/games/${slug}` },
    openGraph: {
      title: `${profile.game.canonicalTitle} — Game Profile`,
      description: profile.evaluation.oneLineExperience,
      type: "article",
    },
  };
}

export default async function GameProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getGameProfile(slug);
  if (!profile) notFound();

  const { game, evaluation } = profile;

  return (
    <article>
      {/* ---------------------------------------------------------------- Hero */}
      <div className="hero-wash border-b border-line">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pb-11 sm:pt-10">
          {/* Cover art would sit alongside this block once licensing is
              resolved (Plan §12.3). The layout is designed to read well
              without it rather than to leave a placeholder hole. */}
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-10">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="label-micro text-bone-faint">
                  {game.releaseStatus === "released" ? "Released" : "Upcoming"}
                </span>
                <span className="text-bone-faint">·</span>
                <span className="label-micro tabular text-bone-faint">
                  {formatDate(game.firstReleaseDate)}
                </span>
              </div>

              <h1 className="display mt-3 text-[2.25rem] leading-[1.05] text-bone sm:text-[3.25rem] lg:text-[3.5rem]">
                {game.canonicalTitle}
              </h1>

              <p className="mt-3 text-sm text-bone-dim">
                <span className="text-bone">{game.developerText}</span>
                <span className="px-1.5 text-bone-faint">·</span>
                {game.publisherText}
                <span className="px-1.5 text-bone-faint">·</span>
                {game.platforms.map((p) => p.name).join(", ")}
              </p>

              <p className="display mt-6 max-w-2xl text-xl font-normal leading-snug text-bone sm:text-2xl">
                {evaluation.oneLineExperience}
              </p>
            </div>

            <div className="mt-6 lg:mt-0">
              <EvidenceSummary evaluation={evaluation} />
            </div>
          </div>

          <div className="mt-8 max-w-4xl">
            <PullRisk evaluation={evaluation} />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- Profile */}
      <section
        aria-labelledby="profile-heading"
        className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14"
      >
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line pb-4">
          <h2 id="profile-heading" className="display text-2xl text-bone">
            The profile
          </h2>
          <p className="text-[0.8125rem] text-bone-dim">
            Eight dimensions · scored 0–10 each ·{" "}
            <Link
              href="/methodology"
              className="text-bone underline decoration-line underline-offset-4 transition-colors hover:decoration-brass"
            >
              how these are scored
            </Link>
          </p>
        </div>

        <ProfilePanel profile={profile} />
      </section>

      {/* ------------------------------------------------------ Interpretation */}
      <section
        aria-labelledby="fit-heading"
        className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-14"
      >
        <div className="mb-6 border-b border-line pb-4">
          <h2 id="fit-heading" className="display text-2xl text-bone">
            Is it for you?
          </h2>
          <p className="mt-1 text-[0.8125rem] text-bone-dim">
            Phrased around preferences and tolerances, not player types.
          </p>
        </div>
        <RecommendationBlocks blocks={evaluation.blocks} />
      </section>

      {/* --------------------------------------------------------------- Tags */}
      <section
        aria-labelledby="tags-heading"
        className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-14"
      >
        <div className="mb-6 border-b border-line pb-4">
          <h2 id="tags-heading" className="display text-2xl text-bone">
            What you are signing up for
          </h2>
          <p className="mt-1 text-[0.8125rem] text-bone-dim">
            Traits, not verdicts. These describe the experience rather than
            judge it.
          </p>
        </div>
        <ExperienceTags tags={profile.tags} />
      </section>

      {/* ----------------------------------------------------------- Evidence */}
      <section
        aria-labelledby="evidence-heading"
        className="mx-auto max-w-6xl px-4 pb-16 sm:px-6"
      >
        <div className="mb-6 border-b border-line pb-4">
          <h2 id="evidence-heading" className="display text-2xl text-bone">
            Evidence &amp; scope
          </h2>
          <p className="mt-1 text-[0.8125rem] text-bone-dim">
            What this profile assessed, how confident it is, and on what basis.
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-10">
          <EvidenceStrip evaluation={evaluation} />

          <div className="mt-6 lg:mt-0">
            <h3 className="label-micro text-bone-faint">Basis</h3>
            <ul className="mt-3 space-y-3">
              {evaluation.sources.map((source) => (
                <li key={source.id} className="border-t border-line pt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="label-micro shrink-0 border border-line px-1.5 py-0.5 text-bone-faint">
                      Tier {source.tier}
                    </span>
                    <span className="text-[0.8125rem] leading-snug text-bone">
                      {source.title}
                    </span>
                  </div>
                  {source.note && (
                    <p className="mt-1.5 text-xs leading-relaxed text-bone-faint">
                      {source.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {evaluation.changeSummary && (
              <div className="mt-6 border-t border-line pt-3">
                <h3 className="label-micro text-bone-faint">Revision note</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-bone-dim">
                  {evaluation.changeSummary}
                </p>
              </div>
            )}

            {evaluation.provenanceNote && (
              <div className="mt-6 border-t border-line pt-3">
                <h3 className="label-micro text-brass">Provenance</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-bone-dim">
                  {evaluation.provenanceNote}
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-10 max-w-3xl text-[0.8125rem] leading-relaxed text-bone-faint">
          {game.summary}
        </p>
      </section>
    </article>
  );
}
