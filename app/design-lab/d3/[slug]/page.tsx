import { notFound } from "next/navigation";
import { D3Study } from "@/components/design-lab/d3/Study";
import { designLabProfileFor, designLabSlugs } from "@/lib/design-lab/profile";

/**
 * D3 against every seeded profile.
 *
 * The point of the route is the proof: one grammar, three games that look
 * different because their artwork, accent and profile data differ — not because
 * the layout changed. Redfall in particular has to hold up at 4.0–5.5 without
 * the small polygon looking broken or the artwork implying a verdict.
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
  return <D3Study profile={profile} />;
}
