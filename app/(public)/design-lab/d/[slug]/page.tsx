import { notFound } from "next/navigation";
import { DirectionD } from "@/components/design-lab/DirectionD";
import { LabStrip } from "@/components/design-lab/LabStrip";
import { designLabProfileFor, designLabSlugs } from "@/lib/design-lab/profile";

/**
 * Direction D against every seeded profile.
 *
 * The point of the route is the proof: if the presentation only works for one
 * game, it is not a presentation, it is a layout for Alan Wake 2. Redfall in
 * particular has to look like a serious document at 4.0–5.5 without the design
 * implying a verdict.
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
    title: profile
      ? `Direction D — ${profile.game.canonicalTitle}`
      : "Direction D",
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
    <>
      <DirectionD profile={profile} />
      <LabStrip current={slug} />
    </>
  );
}
