import type { RadarPoint } from "@/lib/profile/build";
import { buildPolygon, pointAt, ringPath } from "@/lib/radar/geometry";

/**
 * The profile silhouette, as a standalone SVG string for social share cards.
 *
 * Satori (which powers `next/og`) cannot render arbitrary JSX SVG, but it does
 * rasterise an `<img>` pointing at an SVG data URI — so the share card reuses
 * the same pure geometry the on-page radar uses rather than approximating it.
 *
 * Like the on-page radar this draws no area figure and no aggregate: unknown
 * axes leave a gap rather than collapsing to the centre.
 */

export const OG_COLORS = {
  ink: "#08090b",
  inkRaised: "#0c0e11",
  line: "#242a32",
  bone: "#ece7dd",
  boneDim: "#a5a299",
  boneFaint: "#6d6b64",
  brass: "#d6a244",
} as const;

export function radarSvg(points: readonly RadarPoint[], size = 420): string {
  const center = { x: size / 2, y: size / 2 };
  const maxRadius = size / 2 - 14;
  const scores = points.map((point) => point.value);
  const { segments, fillPath } = buildPolygon(center, maxRadius, scores);

  const rings = [2, 4, 6, 8, 10]
    .map(
      (level) =>
        `<path d="${ringPath(center, maxRadius, points.length, level)}" fill="none" stroke="${OG_COLORS.line}" stroke-width="1"/>`,
    )
    .join("");

  const spokes = points
    .map((_, index) => {
      const outer = pointAt(center, maxRadius, index, points.length);
      return `<line x1="${center.x}" y1="${center.y}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}" stroke="${OG_COLORS.line}" stroke-width="1"/>`;
    })
    .join("");

  const wash = fillPath
    ? `<path d="${fillPath}" fill="${OG_COLORS.brass}" fill-opacity="0.14"/>`
    : "";

  const outline = segments
    .map(
      (segment) =>
        `<line x1="${segment.from.x.toFixed(2)}" y1="${segment.from.y.toFixed(2)}" x2="${segment.to.x.toFixed(2)}" y2="${segment.to.y.toFixed(2)}" stroke="${OG_COLORS.brass}" stroke-width="3" stroke-linecap="round"${segment.bridged ? ' stroke-dasharray="6 7" stroke-opacity="0.55"' : ""}/>`,
    )
    .join("");

  const vertices = scores
    .map((score, index) => {
      if (score === null) return "";
      const vertex = pointAt(
        center,
        (score / 10) * maxRadius,
        index,
        points.length,
      );
      return `<circle cx="${vertex.x.toFixed(2)}" cy="${vertex.y.toFixed(2)}" r="4.5" fill="${OG_COLORS.brass}"/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rings}${spokes}${wash}${outline}${vertices}</svg>`;
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
