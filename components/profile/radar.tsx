/**
 * The radar. The only one in this product.
 *
 * Not a client component on purpose. It holds no state and takes no events, so
 * a card grid can render thirty of them on the server for the cost of the
 * markup — which is what makes the catalogue affordable at catalogue scale.
 * The interactive half of the instrument (score rows, disclosure, hover
 * linking) lives in ./instrument.tsx, which is a client component and passes
 * its `active` axis down here as a prop.
 *
 * Two things are load-bearing and easy to undo by accident:
 *
 *  - The grid is drawn *over* the polygon fill, not under it. A filled shape
 *    with the geometry hidden behind it reads as a coloured quality badge; with
 *    the rings and eight spokes crossing it, it stays a measurement you can
 *    read a value off.
 *  - The fill is light (around a third). Heavier and the eye starts comparing
 *    enclosed area between games, which is precisely the aggregate score this
 *    product refuses to publish.
 *
 * No value is ever summed, averaged or turned into an area. An unknown axis
 * leaves a gap rather than collapsing to the centre — see lib/radar/geometry.ts.
 *
 * The polygon is `aria-hidden` at every size. It is a picture of numbers that
 * are also present as text, always: the profile page renders all eight exact
 * values beside it, and a card carrying the label-free MARK is obliged to state
 * its values in the card. Nothing here is the only representation of anything.
 */

import type { ProfileView } from "@/lib/profile/build";
import {
  axisLabelPlacement,
  buildPolygon,
  pointAt,
  ringPath,
  vertexFor,
} from "@/lib/radar/geometry";
import type { RadarLayout } from "./radar-layout";

export interface RadarSkin {
  readonly grid: string;
  readonly gridOuter: string;
  readonly fill: string;
  readonly fillOpacity: number;
  readonly stroke: string;
  readonly vertex: string;
  readonly vertexEdge: string;
  readonly reach: string;
  readonly label: string;
  readonly value: string;
  readonly activeLabel: string;
  readonly activeValue: string;
  readonly activeMark: string;
}

/**
 * The skin the graphite measurement field uses, on the profile page and
 * anywhere else a radar sits on a dark ground. Written once so the card mark
 * and the full instrument cannot drift into two different-looking devices.
 */
export const GRAPHITE_SKIN: RadarSkin = {
  grid: "rgba(237,235,231,0.20)",
  gridOuter: "rgba(237,235,231,0.46)",
  fill: "var(--sip-accent-lift)",
  fillOpacity: 0.35,
  stroke: "var(--sip-accent-lift)",
  vertex: "var(--sip-accent-lift)",
  vertexEdge: "var(--sip-radar-ground)",
  reach: "var(--color-bone-soft)",
  label: "var(--color-bone-quiet)",
  value: "var(--color-bone)",
  activeLabel: "var(--color-bone)",
  activeValue: "var(--sip-accent-lift)",
  activeMark: "var(--color-bone)",
};

/** Stroke weights scale with the radar so a 128px mark is not a smudge. */
function weights(layout: RadarLayout) {
  const k = layout.radius / 118;
  return {
    ring: Math.max(0.5, 0.75 * k),
    ringOuter: Math.max(0.75, 1.25 * k),
    spoke: Math.max(0.5, 0.75 * k),
    outline: Math.max(1.5, 2.5 * k),
    reach: Math.max(1.2, 1.75 * k),
    vertex: Math.max(2, 3.5 * k),
  };
}

export function ProfileRadar({
  profile,
  active,
  layout,
  skin,
}: {
  profile: ProfileView;
  active: string | null;
  layout: RadarLayout;
  skin: RadarSkin;
}) {
  const { center, radius, labelRadius, nameSize, valueSize } = layout;
  const count = profile.radar.length;
  const w = weights(layout);
  const polygon = buildPolygon(
    center,
    radius,
    profile.radar.map((point) => point.value),
  );

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      {polygon.fillPath && (
        <path
          d={polygon.fillPath}
          fill={skin.fill}
          fillOpacity={skin.fillOpacity}
          stroke="none"
        />
      )}

      {/* Grid over the fill: the geometry has to survive the colour, or the
          shape stops being a measurement. */}
      <g fill="none">
        {layout.rings.map((level) => (
          <path
            key={level}
            d={ringPath(center, radius, count, level)}
            stroke={level === 10 ? skin.gridOuter : skin.grid}
            strokeWidth={level === 10 ? w.ringOuter : w.ring}
          />
        ))}
        {profile.radar.map((point, index) => {
          const outer = pointAt(center, radius, index, count);
          const on = active === point.key;
          return (
            <line
              key={point.key}
              x1={center.x}
              y1={center.y}
              x2={outer.x}
              y2={outer.y}
              stroke={on ? skin.activeMark : skin.grid}
              strokeWidth={on ? w.spoke * 2.3 : w.spoke}
            />
          );
        })}
      </g>

      {/* Uncertainty reach on any axis published as a range. */}
      <g fill="none">
        {profile.radar.map((point, index) => {
          if (point.value === null || point.ceiling === null) return null;
          const from = vertexFor(center, radius, index, count, point.value);
          const to = vertexFor(center, radius, index, count, point.ceiling);
          return (
            <line
              key={point.key}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={skin.reach}
              strokeWidth={w.reach}
              strokeDasharray="2 3"
            />
          );
        })}
      </g>

      <g className="gp-reveal" fill="none" strokeLinejoin="miter">
        {polygon.segments.map((segment, index) => (
          <line
            key={index}
            x1={segment.from.x}
            y1={segment.from.y}
            x2={segment.to.x}
            y2={segment.to.y}
            stroke={skin.stroke}
            strokeWidth={w.outline}
            strokeDasharray={segment.bridged ? "3 4" : undefined}
          />
        ))}
      </g>

      <g>
        {profile.radar.map((point, index) => {
          if (point.value === null) return null;
          const v = vertexFor(center, radius, index, count, point.value);
          const on = active === point.key;
          const size = on ? w.vertex * 1.4 : w.vertex;
          return (
            <rect
              key={point.key}
              x={v.x - size}
              y={v.y - size}
              width={size * 2}
              height={size * 2}
              fill={on ? skin.activeMark : skin.vertex}
              stroke={skin.vertexEdge}
              strokeWidth={Math.max(0.75, w.ring)}
            />
          );
        })}
        {profile.radar.map((point, index) => {
          if (point.ceiling === null) return null;
          const v = vertexFor(center, radius, index, count, point.ceiling);
          const size = w.vertex;
          return (
            <rect
              key={`${point.key}-ceiling`}
              x={v.x - size}
              y={v.y - size}
              width={size * 2}
              height={size * 2}
              fill="none"
              stroke={skin.reach}
              strokeWidth={w.reach * 0.85}
            />
          );
        })}
      </g>

      {layout.labels && (
        <g>
          {profile.radar.map((point, index) => {
            const place = axisLabelPlacement(center, labelRadius, index, count);
            const on = active === point.key;
            const above = place.vertical === "above";
            const wide = point.value !== null && point.ceiling !== null;
            const size =
              point.value === null || wide ? valueSize * 0.72 : valueSize;
            return (
              <g key={point.key}>
                <text
                  x={place.point.x}
                  y={above ? place.point.y - valueSize * 0.84 : place.point.y}
                  textAnchor={place.anchor}
                  fontFamily="Archivo, system-ui, sans-serif"
                  fontSize={nameSize}
                  fontWeight={600}
                  fill={on ? skin.activeLabel : skin.label}
                >
                  {point.shortLabel.toUpperCase()}
                </text>
                <text
                  x={place.point.x}
                  y={
                    above
                      ? place.point.y + valueSize * 0.32
                      : place.point.y + valueSize
                  }
                  textAnchor={place.anchor}
                  fontFamily="Archivo, system-ui, sans-serif"
                  fontSize={size}
                  fontWeight={700}
                  fill={on ? skin.activeValue : skin.value}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {point.value === null ? "—" : point.display}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}
