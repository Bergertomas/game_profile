import { notFound } from "next/navigation";
import { GameProfile } from "@/components/profile/GameProfile";
import { heroArtworkFor } from "@/lib/profile/artwork";
import { designLabProfileFor, designLabSlugs } from "@/lib/design-lab/profile";

/**
 * The canonical profile against every seeded game, with evaluation artwork.
 *
 * The proof the route exists for: one grammar, three games that look different
 * because their artwork, accent and profile data differ — not because the
 * layout changed. Redfall in particular has to hold up at 4.0–5.5 without the
 * small polygon looking broken or the artwork implying a verdict.
 *
 * It renders the production component, so what is reviewed here is what ships.
 * The only difference from /games/<slug> is the artwork, which is cleared for
 * internal review and nothing else.
 */
export function generateStaticParams() {
  return designLabSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = designLabProfileFor(slug);
  return {
    title: profile ? `D3 — ${profile.game.canonicalTitle}` : "D3",
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = designLabProfileFor(slug);
  if (!profile) notFound();
  return (
    <GameProfile profile={profile} artwork={heroArtworkFor(profile.game)} />
  );
}
