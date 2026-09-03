import type { ProfileView } from "@/lib/profile/build";
import { buildPolygon, ringPath } from "@/lib/radar/geometry";

/**
 * THE GAME'S OWN OUTLINE, AS A FRAGMENT OF ITS TERRITORY.
 *
 * The artless identity of a game on this product is not a coloured rectangle.
 * It is the accent wash (the sleeve) with the game's own eight-axis outline
 * drawn faint and large across it — the same move the Compare identity stage
 * makes for an artless side (handoff §4.2; drift log E-10), so one game is
 * recognisably itself in the mosaic, on the poster rail and in Compare, with
 * or without a picture.
 *
 * It is decoration, and says so: `aria-hidden`, no labels, no values, and it
 * never stands in for the text. The compact fingerprint beside it and the
 * sentence in the same tile carry the shape as a measurement; this is the
 * signature written large. Painted UNDER any artwork, always, so `loading`,
 * `failed` and `absent` resolve to the authored composition rather than to an
 * empty frame.
 *
 * Same geometry rules as every radar in the product: clockwise from twelve,
 * an unknown axis leaves a bridged gap rather than collapsing to the centre,
 * and no area is ever computed (lib/radar/geometry.ts).
 */
const SIZE = 128;
const CENTER = { x: SIZE / 2, y: SIZE / 2 };
const RADIUS = 56;

export function ShapeFragment({
  profile,
  className,
}: {
  readonly profile: ProfileView;
  readonly className: string;
}) {
  const count = profile.radar.length;
  const polygon = buildPolygon(
    CENTER,
    RADIUS,
    profile.radar.map((point) => point.value),
  );

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={ringPath(CENTER, RADIUS, count, 10)}
        fill="none"
        stroke="var(--sip-accent-lift)"
        strokeOpacity={0.35}
        strokeWidth={0.75}
      />
      <g fill="none" stroke="var(--sip-accent-lift)" strokeWidth={1.75}>
        {polygon.segments.map((segment, index) => (
          <line
            key={index}
            x1={segment.from.x}
            y1={segment.from.y}
            x2={segment.to.x}
            y2={segment.to.y}
            strokeDasharray={segment.bridged ? "2 4" : undefined}
          />
        ))}
      </g>
    </svg>
  );
}
