import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceStrip, EvidenceSummary } from "@/components/EvidenceStrip";
import { JsonLd } from "@/components/JsonLd";
import {
  ExperienceTags,
  PullRisk,
  RecommendationBlocks,
} from "@/components/ProfileBlocks";
import { ProfilePanel } from "@/components/ProfilePanel";
import { TrustLine } from "@/components/TrustLine";
import { getGameProfile, listGameSlugs } from "@/lib/data/games";
import { formatDate } from "@/lib/format";
import {
  linkedEvidenceSummary,
  PRE_RELEASE_NOTICE,
  SOURCE_CATEGORY_LABEL,
} from "@/lib/profile/vocabulary";
import { gameProfileGraph } from "@/lib/seo/structured-data";
import { gameTitle, gameUrl } from "@/lib/site";

/**
 * The canonical game profile page (GP-005).
 *
 * Above the fold order follows Plan §6.1: identity, then the one-line
 * experience, then evidence, then pull and risk. Marketing-style descriptive
 * copy is deliberately pushed below the profile — the first viewport belongs to
 * the purchase decision.
 */

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await listGameSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * Search intent is explicit: the title is the question a person types, and the
 * description is the profile's own one-line answer to it, followed by what the
 * page actually contains. No keyword padding — the page has to earn the click
 * on the strength of the evaluation, which is the whole product thesis.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getGameProfile(slug);
  if (!profile) return { title: "Not found", robots: { index: false } };

  const { game, evaluation } = profile;
  const title = gameTitle(game.canonicalTitle);
  const description = `${evaluation.oneLineExperience} Profiled across eight dimensions — what it does well, what it asks of you, and who it is not for.`;

  return {
    // Absolute: the template would otherwise append the brand a second time.
    title: { absolute: title },
    description,
    // Alternate titles are published as JSON-LD `alternateName`, which search
    // engines actually read. `<meta name="keywords">` is ignored and is left off.
    alternates: { canonical: `/games/${slug}` },
    openGraph: {
      type: "article",
      url: gameUrl(slug),
      title,
      description: evaluation.oneLineExperience,
      publishedTime: evaluation.publishedAt,
      modifiedTime: evaluation.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: evaluation.oneLineExperience,
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
      <JsonLd data={gameProfileGraph(profile)} />

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
        <div className="mb-6 border-b border-line pb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
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
        </div>

        {/* Trust line sits immediately above the numbers, where a reader is
            about to decide how much weight to give them (Plan §6.6). */}
        <div className="mb-8">
          <TrustLine evaluation={evaluation} evidence={profile.evidence} />
          {evaluation.evidenceStatus === "pre_release" && (
            <p className="mt-3 border-l-2 border-brass py-1 pl-3 text-[0.8125rem] leading-relaxed text-bone">
              {PRE_RELEASE_NOTICE}
            </p>
          )}
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
        <RecommendationBlocks
          blocks={evaluation.blocks}
          evidenceStatus={evaluation.evidenceStatus}
        />
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

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-10">
          <EvidenceStrip evaluation={evaluation} />

          <div className="mt-6 lg:mt-0">
            <h3 className="label-micro text-bone-faint">Basis</h3>

            {/* Source-category counts (Plan §6.6, SOP §6). Counts of evidence,
                never votes: the wording is "supported by", never "calculated
                from". Pending ledgers hold classes rather than reconciled
                records, so they must not publish numeric counts. */}
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3">
              {evaluation.evidenceLedger === "populated" &&
                profile.evidence.categoryCounts.map(({ category, count }) => (
                  <div
                    key={category}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <dt className="text-[0.8125rem] text-bone-dim">
                      {SOURCE_CATEGORY_LABEL[category]}
                    </dt>
                    <dd className="tabular text-[0.8125rem] text-bone">
                      {count}
                    </dd>
                  </div>
                ))}
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[0.8125rem] text-bone-dim">Direct play</dt>
                <dd className="text-[0.8125rem] text-bone">
                  {profile.evidence.hasDirectPlay ? "Yes" : "Not yet"}
                </dd>
              </div>
            </dl>

            {evaluation.evidenceLedger === "pending" && (
              <div className="mt-3 text-xs leading-relaxed text-bone-faint">
                <p>
                  {linkedEvidenceSummary(
                    evaluation.evidenceLedger,
                    profile.evidence.totalSources,
                  )}
                </p>
                <p className="mt-1.5">
                  The list below mixes evidence classes with any individual
                  sources already reconciled; it is not yet a complete
                  per-source ledger.
                </p>
              </div>
            )}

            <ul className="mt-5 space-y-3">
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
                  <p className="mt-1 text-xs text-bone-faint">
                    {SOURCE_CATEGORY_LABEL[source.category]}
                    {source.supports && source.supports.length > 0 && (
                      <>
                        {" · supports "}
                        {source.supports.length} dimension
                        {source.supports.length === 1 ? "" : "s"}
                      </>
                    )}
                  </p>
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
