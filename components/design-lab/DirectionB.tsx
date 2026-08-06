"use client";

import { useState } from "react";
import type { DimensionView, ProfileView } from "@/lib/profile/build";
import { citationsFor, pad2, sourceOrdinals } from "@/lib/design-lab/profile";
import {
  BLOCK_ORDER,
  CONFIDENCE_LABEL,
  blockHeadings,
} from "@/lib/profile/vocabulary";
import { formatDate } from "@/lib/format";
import { formatScore } from "@/lib/scoring/derive";
import {
  axisAngleRad,
  axisLabelPlacement,
  buildPolygon,
  pointAt,
  ringPath,
  scoreRadius,
  vertexFor,
} from "@/lib/radar/geometry";
import type { DimensionKey } from "@/lib/rubric";
import { COMPACT, full, type RadarLayout } from "./radar-layout";

/**
 * DIRECTION B — Scouting Sheet
 *
 * Thesis: a measuring instrument printed on a single sheet. Everything is
 * tabular, ruled and aligned to one hard measurement column; the radar is the
 * primary anchor rather than an illustration; numerals carry the page.
 *
 * Type system B (brief §6): Space Grotesk for language, JetBrains Mono for every
 * measurement, identifier and piece of metadata. The mono is what makes this
 * read as an instrument rather than an article — and it is doing information
 * work, not decoration.
 *
 * Deliberately *not* a dashboard: no widgets, no cards, no KPI tiles. One sheet,
 * one grid, hairline rules, and a legend.
 */
export function DirectionB({ profile }: { profile: ProfileView }) {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { game, evaluation } = profile;
  const ordinals = sourceOrdinals(profile);
  const headings = blockHeadings(evaluation.evidenceStatus);

  const scored = profile.dimensions.filter((d) => d.score.kind === "exact");
  const ranked = [...scored].sort(
    (a, b) =>
      (b.score.kind === "exact" ? b.score.score : 0) -
      (a.score.kind === "exact" ? a.score.score : 0),
  );

  return (
    <div className="dl-b min-h-screen py-5 sm:py-8">
      <div className="mx-auto w-full max-w-[80rem] px-3 sm:px-6">
        <div className="dl-b__sheet">
          {/* Sheet header band --------------------------------------- */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--dl-rule-strong)] px-4 py-2 sm:px-5">
            <span className="dl-b__label">
              Game Profile · Assessment sheet
            </span>
            <span className="dl-b__label">
              Rubric v{evaluation.rubricVersion} · Round 1 · Sheet 1 of 1
            </span>
          </div>

          {/* Identity block: tight tabular metadata -------------------- */}
          <div className="grid gap-x-6 gap-y-4 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <h1 className="dl-b__display text-[2.6rem] sm:text-[3.4rem]">
                Alan Wake 2
              </h1>
              <p className="dl-b__mono mt-1 text-[0.8125rem] text-[var(--dl-ink-soft)]">
                {game.developerText} / {game.publisherText} /{" "}
                {game.firstReleaseDate}
              </p>
              <p className="mt-3 max-w-[38rem] text-[0.9375rem] leading-relaxed text-[var(--dl-ink-soft)]">
                {evaluation.oneLineExperience}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 self-start border-l-0 lg:border-l lg:border-[var(--dl-rule)] lg:pl-5">
              {[
                ["Status", evaluation.evidenceStatus.replace("_", "-")],
                ["Confidence", CONFIDENCE_LABEL[evaluation.confidence]],
                ["Checked", formatDate(evaluation.evidenceCutoffAt)],
                ["Ledger", "Records pending"],
                ["Edition", evaluation.scope.edition],
                ["Mode", "Single-player"],
                ["Platforms", "PS5 / XSX|S / PC"],
                ["Build", "Current retail"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="dl-b__label">{k}</dt>
                  <dd className="dl-b__mono text-[0.75rem] text-[var(--dl-ink)]">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Pull / risk as a ruled band with margin labels ------------- */}
          <div className="border-y border-[var(--dl-rule-strong)]">
            {(
              [
                ["Pull", evaluation.primaryPull, true],
                ["Risk", evaluation.primaryRisk, false],
              ] as const
            ).map(([label, text, accent], i) => (
              <div
                key={label}
                className={`grid gap-x-4 px-4 py-3 sm:grid-cols-[5rem_minmax(0,1fr)] sm:px-5 ${
                  i === 1 ? "border-t border-[var(--dl-rule)]" : ""
                }`}
              >
                <span
                  className="dl-b__label"
                  style={accent ? { color: "var(--dl-accent)" } : undefined}
                >
                  {label}
                </span>
                <p className="max-w-[52rem] text-[0.9375rem] leading-relaxed">
                  {text}
                </p>
              </div>
            ))}
          </div>

          {/* The instrument: radar anchor + measurement table ---------- */}
          <div className="grid lg:grid-cols-[26rem_minmax(0,1fr)]">
            <div className="border-b border-[var(--dl-rule)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
              <div className="flex items-baseline justify-between">
                <span className="dl-b__label">Profile shape</span>
                <span className="dl-b__label">0–10 per axis</span>
              </div>
              <div className="sm:hidden">
                <RadarInstrumentB profile={profile} active={active} layout={COMPACT} />
              </div>
              <div className="hidden sm:block">
                <RadarInstrumentB
                  profile={profile}
                  active={active}
                  layout={full({ width: 440, height: 420, center: { x: 220, y: 205 }, radius: 122, labelRadius: 146, nameSize: 8.5, valueSize: 15 })}
                />
              </div>
              <p className="dl-b__mono mt-3 text-[0.6875rem] leading-relaxed text-[var(--dl-ink-faint)]">
                Axes are independent. No total is derived from the enclosed area.
              </p>

              <div className="mt-4 border-t border-[var(--dl-rule)] pt-3">
                <span className="dl-b__label">Extremes</span>
                <div className="mt-2 space-y-1">
                  {[ranked[0], ranked[ranked.length - 1]].map((d, i) =>
                    d ? (
                      <div
                        key={d.dimension.key}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="dl-b__mono text-[0.75rem] text-[var(--dl-ink-soft)]">
                          {i === 0 ? "MAX" : "MIN"} {d.dimension.name}
                        </span>
                        <span className="dl-b__mono text-[0.8125rem] font-semibold">
                          {d.display}
                        </span>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-x-3 border-b border-[var(--dl-rule-strong)] px-4 py-1.5 sm:grid-cols-[1.75rem_minmax(0,1fr)_10rem_auto] sm:px-5">
                <span className="dl-b__label">#</span>
                <span className="dl-b__label">Dimension</span>
                <span className="dl-b__label hidden sm:block">0 ——— 10</span>
                <span className="dl-b__label">Score · Conf · Ev</span>
              </div>
              {profile.dimensions.map((view, index) => (
                <MeasurementRowB
                  key={view.dimension.key}
                  index={index}
                  view={view}
                  profile={profile}
                  isActive={active === view.dimension.key}
                  isOpen={open === view.dimension.key}
                  onHover={setActive}
                  onToggle={(k) => setOpen(open === k ? null : k)}
                />
              ))}

              {/* Reading note closes the column so the sheet does not end in a
                  void beside the taller radar panel. */}
              <div className="border-t border-[var(--dl-rule-strong)] px-4 py-3 sm:px-5">
                <span className="dl-b__label">Reading</span>
                <p className="mt-1.5 max-w-[46rem] text-[0.875rem] leading-relaxed text-[var(--dl-ink-soft)]">
                  Narrative, atmosphere and craft sit at the top of the scale;
                  agency sits {(10 - 7.5).toFixed(1)} lower than the highest
                  axis. That gap is the profile — a game whose strengths are
                  authorial rather than mechanical. Select any row for its five
                  subcriteria.
                </p>
                <p className="dl-b__mono mt-2 text-[0.6875rem] text-[var(--dl-ink-faint)]">
                  CONF H=High M=Medium L=Low · EV = linked source numbers
                </p>
              </div>
            </div>
          </div>

          {/* Interpretation: three tight columns ---------------------- */}
          <div className="border-t border-[var(--dl-rule-strong)] px-4 py-5 sm:px-5">
            <div className="grid gap-x-6 gap-y-5 lg:grid-cols-3">
              {BLOCK_ORDER.map((type, i) => (
                <section key={type}>
                  <div className="flex items-baseline gap-2 border-b border-[var(--dl-rule)] pb-1.5">
                    <span className="dl-b__mono text-[0.6875rem] text-[var(--dl-accent)]">
                      {pad2(i + 1)}
                    </span>
                    <h3 className="text-[0.9375rem] font-bold">
                      {headings[type].title}
                    </h3>
                  </div>
                  <ul className="mt-2.5 space-y-1.5">
                    {evaluation.blocks[type].map((item) => (
                      <li
                        key={item}
                        className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-1.5 text-[0.875rem] leading-snug text-[var(--dl-ink-soft)]"
                      >
                        <span
                          aria-hidden="true"
                          className="dl-b__mono text-[var(--dl-rule)]"
                        >
                          —
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>

          {/* Traits + legend ------------------------------------------ */}
          <div className="grid gap-x-6 gap-y-4 border-t border-[var(--dl-rule)] px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <span className="dl-b__label">Traits</span>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {profile.tags.map((tag) => (
                  <span
                    key={tag.definition.key}
                    className="dl-b__mono text-[0.75rem] text-[var(--dl-ink-soft)]"
                  >
                    {tag.definition.label}
                    {tag.intensity && (
                      <span className="text-[var(--dl-accent)]">
                        :{tag.intensity.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                ))}
              </div>
              {evaluation.platformWarning && (
                <p className="mt-4 border-l-2 border-[var(--dl-accent)] pl-3 text-[0.8125rem] leading-relaxed text-[var(--dl-ink-soft)]">
                  <span className="dl-b__label text-[var(--dl-accent)]">
                    Platform variance
                  </span>
                  <br />
                  {evaluation.platformWarning}
                </p>
              )}
            </div>

            <div className="lg:border-l lg:border-[var(--dl-rule)] lg:pl-5">
              <span className="dl-b__label">Evidence legend</span>
              <ol className="mt-2 space-y-2">
                {evaluation.sources.map((source) => (
                  <li key={source.id} className="flex gap-2">
                    <span className="dl-b__src shrink-0 self-start">
                      {pad2(ordinals.get(source.id) ?? 0)}
                    </span>
                    <span className="text-[0.8125rem] leading-snug text-[var(--dl-ink-soft)]">
                      {source.title}
                      <span className="dl-b__mono ml-1 text-[0.6875rem] text-[var(--dl-ink-faint)]">
                        [T{source.tier}]
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="dl-b__mono mt-3 text-[0.6875rem] leading-relaxed text-[var(--dl-ink-faint)]">
                Sources are evidence, not votes. Records pending; no count
                published.
              </p>
            </div>
          </div>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function MeasurementRowB({
  index,
  view,
  profile,
  isActive,
  isOpen,
  onHover,
  onToggle,
}: {
  index: number;
  view: DimensionView;
  profile: ProfileView;
  isActive: boolean;
  isOpen: boolean;
  onHover: (k: string | null) => void;
  onToggle: (k: string) => void;
}) {
  const { dimension, display, score, subcriteria, confidence } = view;
  const citations = citationsFor(profile, dimension.key as DimensionKey);
  const value = score.kind === "exact" ? score.score : null;

  return (
    <div>
      <button
        type="button"
        className="dl-b__row"
        data-active={isActive}
        aria-expanded={isOpen}
        onClick={() => onToggle(dimension.key)}
        onMouseEnter={() => onHover(dimension.key)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(dimension.key)}
        onBlur={() => onHover(null)}
      >
        <span className="dl-b__mono text-[0.6875rem] text-[var(--dl-ink-faint)]">
          {pad2(index + 1)}
        </span>
        <span className="min-w-0 truncate text-[0.9375rem] font-medium">
          {dimension.name}
        </span>
        {/* A fixed measurement column: the scale is the same width on every
            row, so the eye reads position against a shared ruler rather than
            comparing eight differently-scaled bars. */}
        <span className="dl-b__track hidden sm:block">
          {value !== null && (
            <>
              <span
                className="dl-b__track-fill"
                style={{ width: `${(value / 10) * 100}%` }}
              />
              <span
                className="dl-b__track-tick"
                style={{ left: `calc(${(value / 10) * 100}% - 1px)` }}
              />
            </>
          )}
        </span>
        <span className="flex items-baseline gap-2">
          <span className="dl-b__mono text-[1.0625rem] font-bold">
            {display}
          </span>
          <span className="dl-b__mono w-4 text-[0.6875rem] text-[var(--dl-ink-faint)]">
            {CONFIDENCE_LABEL[confidence].charAt(0)}
          </span>
          <span className="dl-b__mono w-10 text-right text-[0.6875rem] text-[var(--dl-accent)]">
            {citations.map(pad2).join(" ")}
          </span>
        </span>
        <span className="dl-sr">Why this score?</span>
      </button>

      {isOpen && (
        <div className="border-t border-[var(--dl-rule)] bg-[#f4f6f7] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="dl-b__label">Why this score?</span>
            <span className="dl-b__mono text-[0.6875rem] text-[var(--dl-ink-faint)]">
              CONF {CONFIDENCE_LABEL[confidence].toUpperCase()} · EV{" "}
              {citations.length > 0 ? citations.map(pad2).join(" ") : "—"}
            </span>
          </div>
          <p className="mt-2 max-w-[46rem] text-[0.8125rem] leading-relaxed text-[var(--dl-ink-soft)]">
            {dimension.coreQuestion}
          </p>
          <ol className="mt-3">
            {subcriteria.map((sub, i) => (
              <li
                key={sub.key}
                className="grid grid-cols-[1.75rem_minmax(0,1fr)_3rem] gap-x-3 border-t border-[var(--dl-rule)] py-2"
              >
                <span className="dl-b__mono text-[0.6875rem] text-[var(--dl-ink-faint)]">
                  {pad2(i + 1)}
                </span>
                <span>
                  <span className="block text-[0.875rem] font-medium">
                    {sub.name}
                  </span>
                  <span className="mt-0.5 block max-w-[42rem] text-[0.8125rem] leading-relaxed text-[var(--dl-ink-soft)]">
                    {sub.entry.rationale}
                  </span>
                </span>
                <span className="dl-b__mono text-right text-[0.875rem] font-semibold">
                  {sub.entry.value === "unknown"
                    ? "—"
                    : formatScore(sub.entry.value)}
                </span>
              </li>
            ))}
          </ol>
          <p className="dl-b__mono mt-2 border-t border-[var(--dl-rule)] pt-2 text-[0.6875rem] text-[var(--dl-ink-faint)]">
            Σ 5 × (0–2) = {display} · derived, not entered
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * Radar as instrument dial: heavier grid presence than the other directions,
 * measured tick marks at every half-step on the vertical axis, axis labels as
 * mono legend text, and the polygon drawn as a surveyed outline.
 */
function RadarInstrumentB({
  profile,
  active,
  layout,
}: {
  profile: ProfileView;
  active: string | null;
  layout: RadarLayout;
}) {
  const { center, radius, labelRadius, nameSize, valueSize } = layout;
  const count = profile.radar.length;
  const polygon = buildPolygon(
    center,
    radius,
    profile.radar.map((p) => p.value),
  );

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="mt-2 h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none">
        {[2.5, 5, 7.5, 10].map((level) => (
          <path
            key={level}
            d={ringPath(center, radius, count, level)}
            stroke={level === 10 ? "var(--dl-rule-strong)" : "var(--dl-rule)"}
            strokeWidth={level === 10 ? 1.25 : 0.75}
          />
        ))}
        {profile.radar.map((point, index) => {
          const outer = pointAt(center, radius, index, count);
          return (
            <line
              key={point.key}
              x1={center.x}
              y1={center.y}
              x2={outer.x}
              y2={outer.y}
              stroke={
                active === point.key ? "var(--dl-accent)" : "var(--dl-rule)"
              }
              strokeWidth={active === point.key ? 1.25 : 0.75}
            />
          );
        })}
      </g>

      {/* Tick scale along the bisector — an instrument has a readable scale.
          Dropped at phone size, where the numerals would render around 6px and
          become clutter rather than a scale. */}
      <g style={{ display: layout.nameSize > 10 ? "none" : undefined }}>
        {[2, 4, 6, 8, 10].map((level) => {
          const a = axisAngleRad(0, count) + Math.PI / count;
          const r = scoreRadius(level, radius);
          return (
            <g key={level}>
              <line
                x1={center.x + r * Math.cos(a) - 3}
                y1={center.y + r * Math.sin(a)}
                x2={center.x + r * Math.cos(a) + 3}
                y2={center.y + r * Math.sin(a)}
                stroke="var(--dl-ink-faint)"
                strokeWidth={0.75}
              />
              <text
                x={center.x + r * Math.cos(a) + 7}
                y={center.y + r * Math.sin(a) + 3}
                fontFamily="JetBrains Mono, monospace"
                fontSize={8}
                fill="var(--dl-ink-faint)"
              >
                {level}
              </text>
            </g>
          );
        })}
      </g>

      {polygon.fillPath && (
        <path
          d={polygon.fillPath}
          fill="var(--dl-ink)"
          fillOpacity={0.07}
          stroke="none"
        />
      )}
      <g fill="none" strokeLinejoin="miter">
        {polygon.segments.map((segment, index) => (
          <line
            key={index}
            x1={segment.from.x}
            y1={segment.from.y}
            x2={segment.to.x}
            y2={segment.to.y}
            stroke="var(--dl-ink)"
            strokeWidth={2}
            strokeDasharray={segment.bridged ? "3 4" : undefined}
          />
        ))}
      </g>
      <g>
        {profile.radar.map((point, index) => {
          if (point.value === null) return null;
          const v = vertexFor(center, radius, index, count, point.value);
          const on = active === point.key;
          return (
            <g key={point.key}>
              <circle
                cx={v.x}
                cy={v.y}
                r={on ? 5 : 3}
                fill={on ? "var(--dl-accent)" : "var(--dl-sheet)"}
                stroke="var(--dl-ink)"
                strokeWidth={1.5}
              />
            </g>
          );
        })}
      </g>

      <g>
        {profile.radar.map((point, index) => {
          const place = axisLabelPlacement(center, labelRadius, index, count);
          const on = active === point.key;
          const above = place.vertical === "above";
          return (
            <g key={point.key}>
              <text
                x={place.point.x}
                y={above ? place.point.y - valueSize * 0.72 : place.point.y + 1}
                textAnchor={place.anchor}
                fontFamily="JetBrains Mono, monospace"
                fontSize={nameSize}
                letterSpacing="0.1em"
                fill={on ? "var(--dl-ink)" : "var(--dl-ink-faint)"}
              >
                {point.shortLabel.toUpperCase()}
              </text>
              <text
                x={place.point.x}
                y={above ? place.point.y + valueSize * 0.24 : place.point.y + valueSize}
                textAnchor={place.anchor}
                fontFamily="JetBrains Mono, monospace"
                fontSize={valueSize}
                fontWeight={700}
                fill={on ? "var(--dl-accent)" : "var(--dl-ink)"}
              >
                {point.value === null ? "--" : point.display}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
