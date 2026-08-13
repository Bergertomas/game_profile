import { notFound } from "next/navigation";
import { GameProfile } from "@/components/profile/GameProfile";
import { heroArtworkFor } from "@/lib/profile/artwork";
import { designLabProfileFor } from "@/lib/design-lab/profile";

export const metadata = { title: "D3 — Game-Led Profile" };

/**
 * D3 at its canonical route, rendering Alan Wake 2 so it lines up with the
 * earlier directions for a same-data comparison.
 *
 * THIS RENDERS THE PRODUCTION COMPONENT. D3 won and shipped, so the lab has no
 * D3 of its own to keep: a second copy of the design that is actually live is
 * not a record of anything, it is a fork that drifts. What the route is still
 * worth having is the thing production cannot show — the same page carrying
 * real key art, which is evaluation-clearance and resolves to null on
 * production (ADR 0011). That is a review surface, not a design variant.
 *
 * The earlier directions under /design-lab/a|b|c|d keep their own components,
 * because those are historical alternatives and nothing else renders them.
 *
 * Development and Cloudflare previews only: the /design-lab layout 404s this
 * whole segment on production, where the artwork resolves to null as well.
 */
export default function Page() {
  const profile = designLabProfileFor("alan-wake-2");
  if (!profile) notFound();
  return (
    <GameProfile profile={profile} artwork={heroArtworkFor(profile.game)} />
  );
}
