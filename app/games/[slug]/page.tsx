import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameProfile } from "@/components/profile/GameProfile";
import { JsonLd } from "@/components/JsonLd";
import { artworkFor } from "@/lib/profile/artwork";
import { getGameProfile, listGameSlugs } from "@/lib/data/games";
import { gameProfileGraph } from "@/lib/seo/structured-data";
import { gameTitle, gameUrl } from "@/lib/site";
import "./profile.css";

/**
 * The canonical game profile page, and the only public address for a game.
 *
 * The presentation is design direction D3, promoted from the lab after review:
 * the game arrives first at full width, the profile answers it on a graphite
 * field attached to the stage, and everything about how the evaluation was made
 * is collected below rather than salted through the page.
 *
 * What this file owns is the contract around that presentation, and all of it
 * is load-bearing: static generation for every published slug, the canonical
 * URL, search-intent metadata, and the JSON-LD graph — which describes the game
 * and carries no rating of any kind, because there is no overall score to
 * publish (lib/seo/structured-data.ts).
 *
 * Artwork comes from the game record and nowhere else. No seeded game carries
 * any yet, so every page currently renders the artless composition, which is a
 * finished state rather than a gap. See ADR 0011.
 */

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

  return (
    <>
      <JsonLd data={gameProfileGraph(profile)} />
      <GameProfile profile={profile} artwork={artworkFor(profile.game)} />
    </>
  );
}
