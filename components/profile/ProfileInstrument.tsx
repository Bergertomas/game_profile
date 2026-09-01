"use client";

import { useId, useState, type CSSProperties } from "react";
import type { DimensionView, RadarPoint } from "@/lib/profile/build";
import type { PlatformProjection } from "@/lib/profile/platform";
import type { EvidenceLedgerState } from "@/lib/profile/types";
import { axisAngleRad, axisLabelPlacement } from "@/lib/radar/geometry";
import { DimensionRow } from "./instrument";
import { GRAPHITE_SKIN, ProfileRadar } from "./radar";
import { PROFILE } from "./radar-layout";

/**
 * THE FULL PROFILE INSTRUMENT: the labelled radar and the eight exact rows.
 *
 * ── The client boundary, and why it is here ─────────────────────────────────
 *
 * This is the interactive leaf of the profile page and the ONLY client
 * component on it. The whole page used to be one `"use client"` component,
 * which meant every rationale, source and block of prose was serialised twice
 * — once as HTML and once as props for hydration — and every new section the
 * accepted profile adds would have grown that payload with it. ADR 0032 asked
 * for the boundary to be revisited inside this slice, where the source-order
 * requirements and the bundle impact can be tested together. It is narrowed to
 * what needs an event handler: the hover/focus link between a row and its
 * axis, and the eight disclosures. Everything else renders on the server.
 *
 * The behaviour the old boundary had is preserved: pointing at or focusing a
 * row lights its axis, and each row opens its rationale. What changed is that
 * the rows now open independently — opening one no longer closes another, so
 * a keyboard reader comparing two dimensions is not fighting the page.
 *
 * ── Two levels, one DOM ─────────────────────────────────────────────────────
 *
 * The radar is drawn once. Its eight labels are HTML text placed around the
 * SVG, so they are real text at a real size — 0.75rem names and 0.9375rem
 * values that grow with the root font — rather than SVG text scaled down with
 * the viewBox to whatever the column allows. That is what holds the 12px floor
 * at 200% zoom, which the old scaled-SVG labels could not.
 *
 * Below the content breakpoint the labels are hidden and the chart becomes a
 * decorative 15rem overview with the exact rows immediately under it, which is
 * the fallback the handoff specifies when "mobile geometry cannot support
 * eight unambiguous labels" (§9.2). Eight two-word names at 12px around a
 * chart do not fit inside a 320px phone without shrinking below the floor, and
 * shrinking below the floor is the one thing the contract forbids.
 *
 * The figure is `aria-hidden` as a whole. The rows beside it are the
 * authoritative, permanent, accessible representation (handoff §9.1); a
 * screen reader gets the shape as one sentence and the values as eight rows,
 * not as eight redundant label nodes and a polygon.
 */
export interface ProfileInstrumentProps {
  readonly dimensions: readonly DimensionView[];
  readonly radar: readonly RadarPoint[];
  readonly ledger: EvidenceLedgerState;
  readonly shapeDescription: string;
  readonly platforms: PlatformProjection;
}

/**
 * Where a label anchors: `--gp-label-radius` is set by the stylesheet as a
 * length derived from the frame — the chart's outer radius plus a small gap —
 * so the eight anchors track the chart at every width and zoom. Each label
 * multiplies it by its own cosine and sine, which are constants of the fixed
 * axis order and are computed here once.
 */
function labelPosition(index: number, count: number): CSSProperties {
  const angle = axisAngleRad(index, count);
  const cos = Math.cos(angle).toFixed(4);
  const sin = Math.sin(angle).toFixed(4);
  return {
    left: `calc(50% + ${cos} * var(--gp-label-radius, 0px))`,
    top: `calc(50% + ${sin} * var(--gp-label-radius, 0px))`,
  };
}

export function ProfileInstrument({
  dimensions,
  radar,
  ledger,
  shapeDescription,
  platforms,
}: ProfileInstrumentProps) {
  const id = useId();
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const active = hovered ?? focused;
  const count = radar.length;

  // The profile's own view is what is drawn. `ProfileRadar` reads `radar` off
  // a `ProfileView`, so the minimal shape it needs is handed to it.
  const view = { radar } as Parameters<typeof ProfileRadar>[0]["profile"];

  return (
    <div className="gp-instrument__grid">
      <div className="gp-instrument__chart">
        <div className="gp-radar" aria-hidden="true">
          <div className="gp-radar__svg">
            <ProfileRadar
              profile={view}
              active={active}
              layout={PROFILE}
              skin={GRAPHITE_SKIN}
            />
          </div>
          {radar.map((point, index) => {
            // Anchor and vertical placement only; the point itself is CSS.
            const place = axisLabelPlacement({ x: 0, y: 0 }, 1, index, count);
            const on = active === point.key;
            return (
              <span
                key={point.key}
                className="gp-radar__label"
                data-anchor={place.anchor}
                data-vertical={place.vertical}
                data-active={on || undefined}
                data-kind={
                  point.value === null
                    ? "insufficient"
                    : point.ceiling === null
                      ? "exact"
                      : "range"
                }
                style={labelPosition(index, count)}
              >
                <span className="gp-radar__name">
                  <span>{point.axisLabel[0]}</span>
                  <span>{point.axisLabel[1]}</span>
                </span>
                <span className="gp-radar__value">{point.display}</span>
              </span>
            );
          })}
        </div>
        {/* The text equivalent of the figure: distribution, never a rating. */}
        <p className="sr-only">{shapeDescription}</p>
      </div>

      <ol className="gp-rows" aria-label="The eight dimensions, exact values">
        {dimensions.map((dimensionView) => (
          <DimensionRow
            key={dimensionView.dimension.key}
            idBase={id}
            view={dimensionView}
            ledger={ledger}
            platforms={platforms}
            isActive={active === dimensionView.dimension.key}
            onHover={setHovered}
            onFocus={setFocused}
          />
        ))}
      </ol>
    </div>
  );
}
