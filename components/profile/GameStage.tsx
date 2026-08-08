import type { ProfileArtwork } from "@/lib/profile/artwork";

/**
 * The identity stage: the game, at full width, before anything else.
 *
 * Two compositions, and the artless one is not a degraded version of the other.
 * Most of a catalogue reaching hundreds of games will not have licensed key
 * art, so "no artwork" has to be a finished state rather than a hole.
 *
 *  - WITH ART. A full-bleed crop, unblurred and unfiltered, framed per image so
 *    the recognisable subject sits in a shallow band. From 640px the title is
 *    lifted into the picture over the minimum corner scrim that clears AA; on a
 *    phone the title moves to the graphite field below, so no type ever covers
 *    a face.
 *
 *  - WITHOUT ART. The stage becomes a short field carrying the game's accent as
 *    a single soft wash, and the title sits on the graphite band at every width
 *    — the phone composition, used everywhere. It reads as a deliberate cover
 *    rather than a missing image, which is the whole requirement.
 *
 * The accent is identity, never quality: a 4.0 game and a 10.0 game get the
 * same treatment (lib/profile/accent.ts).
 */
export function GameStage({ artwork }: { artwork: ProfileArtwork | null }) {
  if (!artwork) {
    return (
      <div
        className="gp__stage gp__stage--bare h-[104px] sm:h-[132px] lg:h-[152px]"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="gp__stage h-[210px] sm:h-[320px] lg:h-[390px]">
      {/*
        A plain <img>, not next/image, and deliberately so. Optimising art we
        host is a later decision; wiring `images.remotePatterns` now would build
        a remote-image pipeline into production before there is a single
        licensed URL to put through it.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={artwork.url}
        alt={artwork.alt}
        style={{ objectPosition: artwork.objectPosition }}
      />
      <div className="gp__scrim" />
    </div>
  );
}
