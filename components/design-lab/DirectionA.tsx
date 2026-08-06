"use client";

import { useState } from "react";
import type { DimensionView, ProfileView } from "@/lib/profile/build";
import {
  citationsFor,
  pad2,
  sourceOrdinals,
} from "@/lib/design-lab/profile";
import { CONFIDENCE_LABEL, blockHeadings, BLOCK_ORDER } from "@/lib/profile/vocabulary";
import { formatDate } from "@/lib/format";
import { formatScore } from "@/lib/scoring/derive";
import {
  axisLabelPlacement,
  buildPolygon,
  pointAt,
  ringPath,
  vertexFor,
} from "@/lib/radar/geometry";
import type { DimensionKey } from "@/lib/rubric";
import { COMPACT, full, type RadarLayout } from "./radar-layout";

/**
 * DIRECTION A — Editorial Dossier
 *
 * Thesis: a researched game file set on paper. The page is a document, not an
 * application. Composition is an asymmetric editorial spread with a true outer
 * margin; the radar is an analytical plate stamped into the masthead rather than
 * a widget in a panel; the measurements run as the page's spine in leader-dot
 * type; evidence lives in the margin and in footnotes.
 *
 * Type system A (brief §6): condensed grotesque for titles, labels and numerals;
 * Newsreader for every piece of prose that has to be read at length.
 */
export function DirectionA({ profile }: { profile: ProfileView }) {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { game, evaluation } = profile;
  const ordinals = sourceOrdinals(profile);
  const headings = blockHeadings(evaluation.evidenceStatus);

  return (
    <div className="dl-a min-h-screen">
      <div className="mx-auto w-full max-w-[78rem] px-5 sm:px-8">
        {/* Running head ------------------------------------------------- */}
        <div className="flex items-baseline justify-between gap-4 pt-6">
          <span className="dl-a__label">
            Game Profile — Dossier · Alan Wake 2
          </span>
          <span className="dl-a__label">
            Rubric v{evaluation.rubricVersion} · Sheet 1
          </span>
        </div>
        <hr className="dl-a__rule dl-a__rule--strong mt-2" />

        {/* Masthead: title left, analytical plate stamped right ---------- */}
        <header className="grid gap-8 pt-7 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p className="dl-a__label">
              Released {formatDate(game.firstReleaseDate)} · {game.developerText}
            </p>
            <h1
              className="dl-a__display mt-4 text-[3.4rem] sm:text-[5rem] lg:text-[6.1rem]"
              style={{ color: "var(--dl-ink)" }}
            >
              Alan
              <br />
              Wake 2
            </h1>

            <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 sm:max-w-lg">
              {[
                ["Publisher", game.publisherText],
                ["Platforms", game.platforms.map((p) => p.name).join(" · ")],
                ["Edition", evaluation.scope.edition],
                ["Mode", evaluation.scope.mode],
                ["Build", evaluation.scope.buildOrPatch],
                ["Evidence checked", formatDate(evaluation.evidenceCutoffAt)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="dl-a__label">{label}</dt>
                  <dd
                    className="mt-0.5 text-[0.9375rem] leading-snug"
                    style={{ color: "var(--dl-ink)" }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <p
              className="mt-8 max-w-[30rem] text-[1.3rem] leading-[1.45] sm:text-[1.5rem]"
              style={{ color: "var(--dl-ink)" }}
            >
              {evaluation.oneLineExperience}
              <sup className="dl-a__cite">1</sup>
            </p>
          </div>

          <figure className="m-0 lg:col-span-5">
            <div className="dl-a__figure p-4 sm:p-5">
              <div className="sm:hidden">
                <RadarPlateA profile={profile} active={active} layout={COMPACT} />
              </div>
              <div className="hidden sm:block">
                <RadarPlateA profile={profile} active={active} layout={full()} />
              </div>
            </div>
            <figcaption
              className="mt-2 text-[0.8125rem] leading-snug"
              style={{ color: "var(--dl-ink-soft)" }}
            >
              <span className="dl-a__label">Fig. 1</span>{" "}
              Eight-axis profile, fixed clockwise order. Each axis is scored
              independently on its own 0–10 scale;{" "}
              <em>the polygon encloses no meaningful area and no total is derived
              from it.</em>
            </figcaption>
          </figure>
        </header>

        <hr className="dl-a__rule dl-a__rule--strong mt-9" />

        {/* Pull and risk set as genuinely opposing columns, divided by a
            rule rather than boxed into two coloured cards (brief §13). */}
        <section
          className="grid gap-x-10 gap-y-7 py-8 sm:grid-cols-2"
          style={{ color: "var(--dl-ink)" }}
        >
          <div className="sm:pr-10">
            <p className="dl-a__label" style={{ color: "var(--dl-accent)" }}>
              What earns it attention
            </p>
            <p className="mt-2 text-[1.0625rem] leading-relaxed">
              {evaluation.primaryPull}
            </p>
          </div>
          <div
            className="sm:border-l sm:pl-10"
            style={{ borderColor: "var(--dl-rule)" }}
          >
            <p className="dl-a__label">Where it is most likely to lose you</p>
            <p
              className="mt-2 text-[1.0625rem] leading-relaxed"
              style={{ color: "var(--dl-ink-soft)" }}
            >
              {evaluation.primaryRisk}
            </p>
          </div>
        </section>

        <hr className="dl-a__rule dl-a__rule--strong" />

        {/* Measurements — the spine of the document, with outer margin --- */}
        <section className="grid gap-8 py-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-8">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="dl-a__display text-[1.6rem]">The measurements</h2>
              <span className="dl-a__label">
                Five subcriteria each · 0–2 · summed
              </span>
            </div>

            <div className="mt-4">
              {profile.dimensions.map((view) => (
                <ScoreLineA
                  key={view.dimension.key}
                  view={view}
                  profile={profile}
                  isActive={active === view.dimension.key}
                  isOpen={open === view.dimension.key}
                  onHover={setActive}
                  onToggle={(key) => setOpen(open === key ? null : key)}
                />
              ))}
            </div>
          </div>

          {/* Marginalia: the research apparatus, in the outer margin. */}
          <aside
            className="lg:col-span-4"
            style={{ color: "var(--dl-ink-soft)" }}
          >
            <p className="dl-a__label">In the margin</p>
            <div className="mt-3 space-y-4 text-[0.8125rem] leading-relaxed">
              <p>
                <strong style={{ color: "var(--dl-ink)" }}>
                  {CONFIDENCE_LABEL[evaluation.confidence]} confidence overall,
                </strong>{" "}
                but Execution &amp; Polish is held at{" "}
                {CONFIDENCE_LABEL[evaluation.dimensionConfidence.execution]}{" "}
                — console and PC behave differently enough that a single
                platform-agnostic figure would flatter one of them.
                <sup className="dl-a__cite">2</sup>
              </p>
              <p>
                Scores are transcribed from{" "}
                <span style={{ color: "var(--dl-ink)" }}>
                  Calibration Round 1
                </span>
                . The five-part decomposition beneath each measurement is
                engineering work constrained to reproduce those published totals
                exactly.
              </p>
              {evaluation.platformWarning && (
                <p
                  className="border-l-2 pl-3"
                  style={{ borderColor: "var(--dl-accent)" }}
                >
                  <span
                    className="dl-a__label"
                    style={{ color: "var(--dl-accent)" }}
                  >
                    Platform note
                  </span>
                  <br />
                  {evaluation.platformWarning}
                </p>
              )}
              <p>
                Evidence is recorded as classes rather than individual records,
                so no source count is published for this profile.
              </p>
            </div>
          </aside>
        </section>

        <hr className="dl-a__rule dl-a__rule--strong" />

        {/* Interpretation: three ruled sections with hanging labels ------ */}
        <section className="py-8">
          <h2 className="dl-a__display text-[1.6rem]">Is it for you?</h2>
          <div className="mt-5 space-y-6">
            {BLOCK_ORDER.map((type, index) => (
              <div
                key={type}
                className="grid gap-x-8 gap-y-2 border-t pt-4 sm:grid-cols-[13rem_minmax(0,1fr)]"
                style={{ borderColor: "var(--dl-rule)" }}
              >
                <div>
                  <p className="dl-a__num text-[1.1rem]">
                    {pad2(index + 1)}
                  </p>
                  <h3
                    className="dl-a__display mt-1 text-[1.05rem]"
                    style={{ color: "var(--dl-ink)" }}
                  >
                    {headings[type].title}
                  </h3>
                  <p
                    className="mt-1 text-[0.8125rem] leading-snug"
                    style={{ color: "var(--dl-ink-faint)" }}
                  >
                    {headings[type].note}
                  </p>
                </div>
                <ul className="max-w-[38rem] space-y-2">
                  {evaluation.blocks[type].map((item) => (
                    <li
                      key={item}
                      className="text-[1rem] leading-relaxed"
                      style={{ color: "var(--dl-ink)" }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <hr className="dl-a__rule dl-a__rule--strong" />

        {/* Tags as a run-in list, not pills ----------------------------- */}
        <section className="py-7">
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-[13rem_minmax(0,1fr)]">
            <h2 className="dl-a__label">What you are signing up for</h2>
            <p
              className="max-w-[42rem] text-[0.9375rem] leading-relaxed"
              style={{ color: "var(--dl-ink)" }}
            >
              {profile.tags.map((tag, index) => (
                <span key={tag.definition.key}>
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      style={{ color: "var(--dl-rule)" }}
                    >
                      {" · "}
                    </span>
                  )}
                  {tag.definition.label}
                  {tag.intensity && (
                    <span
                      className="dl-a__label ml-1"
                      style={{ color: "var(--dl-accent)" }}
                    >
                      {tag.intensity}
                    </span>
                  )}
                </span>
              ))}
            </p>
          </div>
        </section>

        <hr className="dl-a__rule dl-a__rule--strong" />

        {/* Footnotes — the evidence apparatus proper -------------------- */}
        <section className="py-8">
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-[13rem_minmax(0,1fr)]">
            <div>
              <h2 className="dl-a__label">Sources &amp; provenance</h2>
              <p
                className="mt-2 text-[0.8125rem] leading-snug"
                style={{ color: "var(--dl-ink-faint)" }}
              >
                {evaluation.evidenceStatus === "verified"
                  ? "Verified"
                  : evaluation.evidenceStatus}{" "}
                · Calibration Round 1 · Source records pending
              </p>
            </div>
            <ol className="max-w-[42rem] space-y-3">
              {evaluation.sources.map((source) => (
                <li
                  key={source.id}
                  className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2"
                >
                  <span
                    className="dl-a__num text-[0.8125rem]"
                    style={{ color: "var(--dl-accent)" }}
                  >
                    {pad2(ordinals.get(source.id) ?? 0)}
                  </span>
                  <span
                    className="text-[0.875rem] leading-snug"
                    style={{ color: "var(--dl-ink)" }}
                  >
                    {source.title}
                    <span
                      className="dl-a__label ml-2"
                      style={{ color: "var(--dl-ink-faint)" }}
                    >
                      Tier {source.tier}
                    </span>
                    {source.note && (
                      <span
                        className="mt-1 block text-[0.8125rem] leading-snug"
                        style={{ color: "var(--dl-ink-soft)" }}
                      >
                        {source.note}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <div className="h-10" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function ScoreLineA({
  view,
  profile,
  isActive,
  isOpen,
  onHover,
  onToggle,
}: {
  view: DimensionView;
  profile: ProfileView;
  isActive: boolean;
  isOpen: boolean;
  onHover: (key: string | null) => void;
  onToggle: (key: string) => void;
}) {
  const { dimension, display, subcriteria, confidence } = view;
  const citations = citationsFor(profile, dimension.key as DimensionKey);

  return (
    <div>
      <button
        type="button"
        className="dl-a__row"
        data-active={isActive}
        aria-expanded={isOpen}
        onClick={() => onToggle(dimension.key)}
        onMouseEnter={() => onHover(dimension.key)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(dimension.key)}
        onBlur={() => onHover(null)}
      >
        <span
          className="dl-a__display shrink-0 text-[1.0625rem] sm:text-[1.125rem]"
          style={{ color: "var(--dl-ink)" }}
        >
          {dimension.name}
        </span>
        {citations.length > 0 && (
          <sup className="dl-a__cite shrink-0">
            {citations.map(pad2).join(",")}
          </sup>
        )}
        <span className="dl-a__leader" aria-hidden="true" />
        <span
          className="dl-a__num shrink-0 text-[1.35rem] leading-none"
          style={{ color: "var(--dl-ink)" }}
        >
          {display}
        </span>
        <span className="dl-sr">Why this score?</span>
      </button>

      {isOpen && (
        <div
          className="grid gap-x-6 gap-y-3 pb-5 pl-0 pt-1 sm:grid-cols-[minmax(0,1fr)_11rem]"
          style={{ color: "var(--dl-ink-soft)" }}
        >
          <div>
            <p
              className="max-w-[34rem] text-[0.9375rem] leading-relaxed"
              style={{ color: "var(--dl-ink)" }}
            >
              {dimension.coreQuestion}
            </p>
            <ol className="mt-3 max-w-[38rem]">
              {subcriteria.map((sub, index) => (
                <li
                  key={sub.key}
                  className="border-t py-2"
                  style={{ borderColor: "var(--dl-rule)" }}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="dl-a__num shrink-0 text-[0.75rem]"
                      style={{ color: "var(--dl-ink-faint)" }}
                    >
                      {pad2(index + 1)}
                    </span>
                    <span
                      className="dl-a__display shrink-0 text-[0.9375rem]"
                      style={{ color: "var(--dl-ink)" }}
                    >
                      {sub.name}
                    </span>
                    <span className="dl-a__leader" aria-hidden="true" />
                    <span
                      className="dl-a__num shrink-0 text-[0.9375rem]"
                      style={{ color: "var(--dl-ink)" }}
                    >
                      {sub.entry.value === "unknown"
                        ? "—"
                        : formatScore(sub.entry.value)}
                    </span>
                  </div>
                  <p className="mt-1 max-w-[34rem] pl-6 text-[0.875rem] leading-relaxed">
                    {sub.entry.rationale}
                  </p>
                </li>
              ))}
            </ol>
          </div>
          <div className="text-[0.8125rem] leading-relaxed">
            <p className="dl-a__label">Apparatus</p>
            <p className="mt-2">
              Confidence {CONFIDENCE_LABEL[confidence]}
            </p>
            <p className="mt-1">
              Supported by{" "}
              {citations.length > 0
                ? citations.map((n) => `note ${pad2(n)}`).join(", ")
                : "profile-level evidence"}
            </p>
            <p className="mt-3" style={{ color: "var(--dl-ink-faint)" }}>
              Five subcriteria, each 0–2. Total {display}, derived.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * Radar as an analytical plate: ink line-work on paper, hairline octagon grid,
 * square vertex marks that read as printed register marks rather than data
 * points, values set beside their axis label in condensed numerals.
 */
function RadarPlateA({
  profile,
  active,
  layout,
}: {
  profile: ProfileView;
  active: string | null;
  layout: RadarLayout;
}) {
  const size = { w: layout.width, h: layout.height };
  const { center, radius, labelRadius, nameSize, valueSize } = layout;
  const count = profile.radar.length;
  const polygon = buildPolygon(
    center,
    radius,
    profile.radar.map((p) => p.value),
  );

  return (
    <svg
      viewBox={`0 0 ${size.w} ${size.h}`}
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" strokeWidth={1}>
        {[2.5, 5, 7.5, 10].map((level) => (
          <path
            key={level}
            d={ringPath(center, radius, count, level)}
            stroke="var(--dl-rule)"
            strokeWidth={level === 10 ? 1.1 : 0.85}
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
              stroke="var(--dl-rule)"
            />
          );
        })}
      </g>

      {polygon.fillPath && (
        <path
          d={polygon.fillPath}
          fill="var(--dl-accent)"
          fillOpacity={0.09}
          stroke="none"
        />
      )}
      <g fill="none" strokeLinejoin="round">
        {polygon.segments.map((segment, index) => (
          <line
            key={index}
            x1={segment.from.x}
            y1={segment.from.y}
            x2={segment.to.x}
            y2={segment.to.y}
            stroke="var(--dl-accent)"
            strokeWidth={1.75}
            strokeDasharray={segment.bridged ? "3 4" : undefined}
          />
        ))}
      </g>

      {/* Register marks, not dots. */}
      <g>
        {profile.radar.map((point, index) => {
          if (point.value === null) return null;
          const v = vertexFor(center, radius, index, count, point.value);
          const on = active === point.key;
          const s = on ? 4 : 2.6;
          return (
            <rect
              key={point.key}
              x={v.x - s}
              y={v.y - s}
              width={s * 2}
              height={s * 2}
              fill={on ? "var(--dl-accent)" : "var(--dl-ink)"}
            />
          );
        })}
      </g>

      <g>
        {profile.radar.map((point, index) => {
          const place = axisLabelPlacement(center, labelRadius, index, count);
          const on = active === point.key;
          const above = place.vertical === "above";
          const nameY = above ? place.point.y - valueSize * 0.72 : place.point.y + 2;
          const valueY = above ? place.point.y + valueSize * 0.2 : place.point.y + valueSize;
          return (
            <g key={point.key}>
              <text
                x={place.point.x}
                y={nameY}
                textAnchor={place.anchor}
                fontFamily="Archivo, sans-serif"
                fontSize={nameSize}
                fontWeight={600}
                letterSpacing="0.12em"
                fill={on ? "var(--dl-ink)" : "var(--dl-ink-faint)"}
                style={{ fontStretch: "78%" }}
              >
                {point.shortLabel.toUpperCase()}
              </text>
              <text
                x={place.point.x}
                y={valueY}
                textAnchor={place.anchor}
                fontFamily="Archivo, sans-serif"
                fontSize={valueSize}
                fontWeight={700}
                fill={on ? "var(--dl-accent)" : "var(--dl-ink)"}
                style={{ fontStretch: "75%", fontVariantNumeric: "tabular-nums" }}
              >
                {point.value === null ? "—" : point.display}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
