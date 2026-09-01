import { PosterRail } from "@/components/home/PosterRail";
import { ProfilePoster } from "@/components/home/ProfilePoster";
import { coverArtworkFor, creditLineFor } from "@/lib/profile/artwork";
import type { ProfileView } from "@/lib/profile/build";
import "./home-sections.css";

/**
 * A rail of profile posters, assembled on the server.
 *
 * The split is deliberate: everything that needs a browser lives in
 * `PosterRail` (scroll position, the two controls, reduced motion) and
 * everything that reads the corpus stays here, so a rail of thirty posters
 * costs thirty pieces of server-rendered markup rather than thirty components
 * in the client bundle.
 *
 * Artwork credits are collected at rail level rather than printed on every
 * poster: the rights notice belongs to the assets on the page, and repeating an
 * identical line under each of three posters is clutter, not accountability.
 * On production there are none — no artwork is cleared (ADR 0011) — so this is
 * a preview-build affordance that keeps evaluation-basis art from ever
 * appearing without saying what it is.
 */
export interface ProfileRailProps {
  readonly heading: string;
  readonly headingId?: string;
  readonly note: string;
  readonly profiles: readonly ProfileView[];
}

export function ProfileRail({
  heading,
  headingId,
  note,
  profiles,
}: ProfileRailProps) {
  // An empty rail renders nothing at all — no heading over an empty track.
  if (profiles.length === 0) return null;

  const credits = [
    ...new Set(
      profiles
        .map((profile) => coverArtworkFor(profile.game))
        .filter((artwork) => artwork !== null)
        .map(creditLineFor),
    ),
  ];

  return (
    <PosterRail
      heading={heading}
      headingId={headingId}
      note={note}
      credits={credits}
    >
      {profiles.map((profile) => (
        <ProfilePoster
          key={`${profile.game.slug}/${profile.scope.key}`}
          profile={profile}
        />
      ))}
    </PosterRail>
  );
}
