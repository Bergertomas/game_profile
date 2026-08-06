import type { RadarPoint } from "@/lib/profile/build";
import { buildPolygon, pointAt, ringPath } from "@/lib/radar/geometry";

/**
 * Label-free silhouette for cards and comparison grids.
 *
 * Every mini radar uses the same fixed axis order, so shapes are directly
 * comparable across cards. It carries no text of its own — the card states the
 * extremes numerically, so nothing is communicated by shape alone.
 */
export function MiniRadar({
  points,
  className = "",
}: {
  points: readonly RadarPoint[];
  className?: string;
}) {
  const size = 200;
  const center = { x: size / 2, y: size / 2 };
  const radius = 84;
  const count = points.length;
  const polygon = buildPolygon(
    center,
    radius,
    points.map((p) => p.value),
  );

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={`h-auto w-full ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" strokeWidth={1}>
        {[2.5, 5, 7.5, 10].map((level) => (
          <path
            key={level}
            d={ringPath(center, radius, count, level)}
            className={level === 10 ? "stroke-line-strong" : "stroke-line"}
          />
        ))}
        {points.map((point, index) => {
          const outer = pointAt(center, radius, index, count);
          return (
            <line
              key={point.key}
              x1={center.x}
              y1={center.y}
              x2={outer.x}
              y2={outer.y}
              className="stroke-line"
            />
          );
        })}
      </g>

      {polygon.fillPath && (
        <path d={polygon.fillPath} className="fill-brass/12" stroke="none" />
      )}
      <g fill="none" strokeLinejoin="round">
        {polygon.segments.map((segment, index) => (
          <line
            key={index}
            x1={segment.from.x}
            y1={segment.from.y}
            x2={segment.to.x}
            y2={segment.to.y}
            className={segment.bridged ? "stroke-brass/45" : "stroke-brass"}
            strokeWidth={1.75}
            strokeDasharray={segment.bridged ? "3 4" : undefined}
          />
        ))}
      </g>
      <g className="fill-brass">
        {polygon.vertices.map((vertex, index) =>
          vertex ? (
            <circle key={index} cx={vertex.x} cy={vertex.y} r={2.25} />
          ) : null,
        )}
      </g>
    </svg>
  );
}
