"use client";

import { useState } from "react";

/**
 * A picture that knows how to fail.
 *
 * Handoff §4.2: `failed` switches to the authored artless composition and
 * shows no broken-image icon. The territory under every tile and poster is
 * always painted, so the only thing a failed load can add is the browser's
 * own glyph — and Chromium paints one for a sized `<img>` even with an empty
 * `alt`. This is the one line of behaviour that removes it: the image leaves
 * the document when it cannot load, and the territory beneath is the picture.
 *
 * It is the only client-side code in the mosaic and the rail's posters, and it
 * holds no state worth serialising: a fresh render starts optimistic again.
 *
 * A plain `<img>`, for the reason every artwork surface gives: art hosted by
 * somebody else is not put through an image pipeline before a single URL is
 * cleared (ADR 0011). Empty alt: the title beside the picture names the game
 * (handoff §4.2), so the image stays outside the accessibility tree.
 */
export function ArtworkImage({
  src,
  width,
  height,
  objectPosition,
  loading,
}: {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly objectPosition: string;
  readonly loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      // A server-rendered image can fail BEFORE React attaches its handlers,
      // and that `error` event is gone by the time hydration runs. The ref
      // callback reads the outcome the element already knows: complete with
      // no intrinsic width is a failed load.
      ref={(element) => {
        if (element && element.complete && element.naturalWidth === 0) {
          setFailed(true);
        }
      }}
      src={src}
      alt=""
      width={width}
      height={height}
      loading={loading}
      style={{ objectPosition }}
      onError={() => setFailed(true)}
    />
  );
}
