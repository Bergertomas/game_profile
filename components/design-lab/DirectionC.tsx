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
  axisLabelPlacement,
  buildPolygon,
  pointAt,
  ringPath,
  vertexFor,
} from "@/lib/radar/geometry";
import type { DimensionKey } from "@/lib/rubric";
import { COMPACT, full, type RadarLayout } from "./radar-layout";

/**
 * DIRECTION C — Cinematic Archive
 *
 * Thesis: an archival record of a work. A full-bleed authored plate opens the
 * page, the title breaks its lower edge, and the analysis is set as annotation
 * in open dark fields rather than inside containers. The radar is not boxed at
 * all — it is drawn into the field like a plate illustration.
 *
 * Type: high-contrast serif display (Instrument Serif) against Archivo for
 * support, with mono reserved for archival marks. A third system, deliberately
 * distinct from A's condensed grotesque and B's instrument mono.
 *
 * On imagery: we hold no licence to Alan Wake 2 key art, so the plate is
 * authored from the game's own profile geometry and its accent — light cutting
 * across dark, which is what the game is about. It is a composed tonal field,
 * never a blurred screenshot behind centred marketing copy.
 */
export function DirectionC({ profile }: { profile: ProfileView }) {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { game, evaluation } = profile;
  const ordinals = sourceOrdinals(profile);
  const headings = blockHeadings(evaluation.evidenceStatus);

  return (
    <div className="dl-c min-h-screen">
      {/* Plate ------------------------------------------------------- */}
      <div className="dl-c__plate h-[34vh] min-h-[240px] w-full sm:h-[40vh] lg:h-[46vh]">
        <PlateC profile={profile} />
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <span className="dl-c__mark">Game Profile / Archive</span>
            <span className="dl-c__mark">
              Acc. 001 · Rubric v{evaluation.rubricVersion}
            </span>
          </div>
          {/* Bottom-edge marks are kept to the far right only: the title breaks
              the plate's lower-left edge and must not collide with them. */}
          <div className="flex items-end justify-end">
            <span className="dl-c__mark hidden sm:inline">
              Checked {formatDate(evaluation.evidenceCutoffAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[80rem] px-5 sm:px-8">
        {/* Title breaks the plate edge ------------------------------- */}
        {/* The title breaks the plate's lower edge. `relative` is load-bearing:
            the plate is a positioned element, so an unpositioned heading pulled
            up by a negative margin would paint underneath it. */}
        <header className="relative z-10 -mt-[3.2rem] sm:-mt-[5rem] lg:-mt-[6.5rem]">
          <h1 className="dl-c__display text-[3.6rem] leading-[0.86] sm:text-[6rem] lg:text-[8rem]">
            Alan Wake 2
          </h1>
          <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="text-[0.9375rem] text-[var(--dl-bone-soft)]">
              {game.developerText}
            </span>
            <span className="dl-c__mark">
              {formatDate(game.firstReleaseDate)}
            </span>
            <span className="dl-c__mark">
              {game.platforms.map((p) => p.name).join(" · ")}
            </span>
            <span className="dl-c__mark">
              Plate I — profile geometry, eight axes
            </span>
          </div>
        </header>

        {/* Lede + archival annotation column ------------------------- */}
        <section className="mt-10 grid max-w-[62rem] gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <div>
            <p className="max-w-[36rem] text-[1.3rem] leading-[1.5] sm:text-[1.5rem]">
              {evaluation.oneLineExperience}
            </p>

            <div className="mt-9 space-y-7">
              <div>
                <span
                  className="dl-c__mark"
                  style={{ color: "var(--dl-accent)" }}
                >
                  The pull
                </span>
                <p className="mt-2 max-w-[38rem] text-[1.0625rem] leading-relaxed">
                  {evaluation.primaryPull}
                </p>
              </div>
              <hr className="dl-c__rule max-w-[38rem]" />
              <div>
                <span className="dl-c__mark">The risk</span>
                <p className="mt-2 max-w-[38rem] text-[1.0625rem] leading-relaxed text-[var(--dl-bone-soft)]">
                  {evaluation.primaryRisk}
                </p>
              </div>
            </div>
          </div>

          <aside className="lg:border-l lg:border-[var(--dl-rule)] lg:pl-6">
            <span className="dl-c__mark">Record</span>
            <dl className="mt-3 space-y-3">
              {[
                ["Status", evaluation.evidenceStatus === "verified" ? "Verified" : evaluation.evidenceStatus],
                ["Confidence", CONFIDENCE_LABEL[evaluation.confidence]],
                ["Provenance", "Calibration Round 1"],
                ["Ledger", "Source records pending"],
                ["Edition", evaluation.scope.edition],
                ["Mode", evaluation.scope.mode],
                ["Build", evaluation.scope.buildOrPatch],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="dl-c__mark">{k}</dt>
                  <dd className="mt-0.5 text-[0.875rem] leading-snug">{v}</dd>
                </div>
              ))}
            </dl>
            {evaluation.platformWarning && (
              <p className="mt-5 border-t border-[var(--dl-rule)] pt-3 text-[0.8125rem] leading-relaxed text-[var(--dl-bone-soft)]">
                <span
                  className="dl-c__mark"
                  style={{ color: "var(--dl-accent)" }}
                >
                  Platform
                </span>
                <br />
                {evaluation.platformWarning}
              </p>
            )}
          </aside>
        </section>

        {/* Radar drawn into the field, unboxed ----------------------- */}
        <section className="mt-16">
          <div className="flex items-baseline justify-between border-b border-[var(--dl-rule)] pb-2">
            <h2 className="dl-c__display text-[1.9rem]">The shape</h2>
            <span className="dl-c__mark">
              Eight axes · independent · no total
            </span>
          </div>

          <div className="grid items-start gap-x-12 gap-y-8 pt-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <div>
              <div className="sm:hidden">
                <RadarFieldC profile={profile} active={active} layout={COMPACT} />
              </div>
              <div className="hidden sm:block">
                <RadarFieldC
                  profile={profile}
                  active={active}
                  layout={full({ width: 460, height: 450, center: { x: 230, y: 218 }, radius: 128, labelRadius: 152, nameSize: 8, valueSize: 22 })}
                />
              </div>
            </div>

            <div>
              {profile.dimensions.map((view) => (
                <AnnotationRowC
                  key={view.dimension.key}
                  view={view}
                  profile={profile}
                  isActive={active === view.dimension.key}
                  isOpen={open === view.dimension.key}
                  onHover={setActive}
                  onToggle={(k) => setOpen(open === k ? null : k)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Interpretation as sequential ruled sections --------------- */}
        <section className="mt-16">
          <div className="flex items-baseline justify-between border-b border-[var(--dl-rule)] pb-2">
            <h2 className="dl-c__display text-[1.9rem]">Is it for you?</h2>
            <span className="dl-c__mark">Preferences, not player types</span>
          </div>
          {BLOCK_ORDER.map((type, i) => (
            <div
              key={type}
              className="grid gap-x-12 gap-y-3 border-b border-[var(--dl-rule)] py-7 lg:grid-cols-[16rem_minmax(0,1fr)]"
            >
              <div>
                <span className="dl-c__mark">{pad2(i + 1)}</span>
                <h3 className="dl-c__display mt-1 text-[1.5rem]">
                  {headings[type].title}
                </h3>
              </div>
              <ul className="max-w-[40rem] space-y-3">
                {evaluation.blocks[type].map((item) => (
                  <li
                    key={item}
                    className="text-[1.0625rem] leading-relaxed text-[var(--dl-bone-soft)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* Traits + sources ----------------------------------------- */}
        <section className="mt-14 grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <span className="dl-c__mark">Signing up for</span>
            <p className="mt-3 max-w-[40rem] text-[1.0625rem] leading-relaxed">
              {profile.tags.map((tag, i) => (
                <span key={tag.definition.key}>
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="text-[var(--dl-bone-faint)]"
                    >
                      {" / "}
                    </span>
                  )}
                  {tag.definition.label}
                  {tag.intensity && (
                    <span
                      className="dl-c__mark ml-1"
                      style={{ color: "var(--dl-accent)" }}
                    >
                      {tag.intensity}
                    </span>
                  )}
                </span>
              ))}
            </p>
          </div>
          <div>
            <span className="dl-c__mark">Sources</span>
            <ol className="mt-3 space-y-3">
              {evaluation.sources.map((source) => (
                <li
                  key={source.id}
                  className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 border-t border-[var(--dl-rule)] pt-2"
                >
                  <span
                    className="dl-c__mark"
                    style={{ color: "var(--dl-accent)" }}
                  >
                    {pad2(ordinals.get(source.id) ?? 0)}
                  </span>
                  <span className="text-[0.875rem] leading-snug text-[var(--dl-bone-soft)]">
                    {source.title}
                    <span className="dl-c__mark ml-2">Tier {source.tier}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <div className="h-16" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function AnnotationRowC({
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
  onHover: (k: string | null) => void;
  onToggle: (k: string) => void;
}) {
  const { dimension, display, subcriteria, confidence } = view;
  const citations = citationsFor(profile, dimension.key as DimensionKey);

  return (
    <div>
      <button
        type="button"
        className="dl-c__row"
        data-active={isActive}
        aria-expanded={isOpen}
        onClick={() => onToggle(dimension.key)}
        onMouseEnter={() => onHover(dimension.key)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(dimension.key)}
        onBlur={() => onHover(null)}
      >
        <span className="min-w-0">
          <span className="block text-[1.0625rem] leading-tight">
            {dimension.name}
          </span>
          <span className="dl-c__mark mt-1 block">
            {CONFIDENCE_LABEL[confidence]} confidence
            {citations.length > 0 && ` · ${citations.map(pad2).join(" ")}`}
          </span>
        </span>
        <span
          className="dl-c__num text-[2rem] leading-none"
          style={{ color: isActive ? "var(--dl-accent)" : "var(--dl-bone)" }}
        >
          {display}
        </span>
        <span className="dl-sr">Why this score?</span>
      </button>

      {isOpen && (
        <div className="pb-6 pt-1">
          <p className="dl-c__mark">Why this score?</p>
          <p className="mt-2 max-w-[36rem] text-[0.9375rem] leading-relaxed text-[var(--dl-bone-soft)]">
            {dimension.coreQuestion}
          </p>
          <ol className="mt-4 max-w-[40rem]">
            {subcriteria.map((sub, i) => (
              <li
                key={sub.key}
                className="border-t border-[var(--dl-rule)] py-3"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[0.9375rem]">
                    <span className="dl-c__mark mr-2">{pad2(i + 1)}</span>
                    {sub.name}
                  </span>
                  <span className="dl-c__num shrink-0 text-[1.15rem]">
                    {sub.entry.value === "unknown"
                      ? "—"
                      : formatScore(sub.entry.value)}
                  </span>
                </div>
                <p className="mt-1.5 max-w-[34rem] text-[0.875rem] leading-relaxed text-[var(--dl-bone-soft)]">
                  {sub.entry.rationale}
                </p>
              </li>
            ))}
          </ol>
          <p className="dl-c__mark mt-3">
            Five subcriteria, 0–2 each · total {display} derived
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * Radar drawn straight into the dark field: no frame, no panel. The grid is
 * barely present, the polygon carries a soft accent wash, and the numerals sit
 * at the axis ends in the display serif so the chart reads as plate artwork
 * rather than a chart component.
 */
function RadarFieldC({
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
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="dl-c-wash" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--dl-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--dl-accent)" stopOpacity="0.04" />
        </radialGradient>
      </defs>

      <g fill="none">
        {[2.5, 5, 7.5, 10].map((level) => (
          <path
            key={level}
            d={ringPath(center, radius, count, level)}
            stroke="var(--dl-rule)"
            strokeWidth={level === 10 ? 1 : 0.6}
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
              strokeWidth={active === point.key ? 1 : 0.6}
            />
          );
        })}
      </g>

      {polygon.fillPath && (
        <path d={polygon.fillPath} fill="url(#dl-c-wash)" stroke="none" />
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
            strokeWidth={1.5}
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
            <circle
              key={point.key}
              cx={v.x}
              cy={v.y}
              r={on ? 4.5 : 2}
              fill="var(--dl-accent)"
            />
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
                y={above ? place.point.y - valueSize * 0.62 : place.point.y}
                textAnchor={place.anchor}
                fontFamily="JetBrains Mono, monospace"
                fontSize={nameSize}
                letterSpacing="0.18em"
                fill={on ? "var(--dl-bone)" : "var(--dl-bone-faint)"}
              >
                {point.shortLabel.toUpperCase()}
              </text>
              <text
                x={place.point.x}
                y={above ? place.point.y + valueSize * 0.22 : place.point.y + valueSize * 0.86}
                textAnchor={place.anchor}
                fontFamily="Instrument Serif, Georgia, serif"
                fontSize={valueSize}
                fill={on ? "var(--dl-accent)" : "var(--dl-bone)"}
                style={{ fontVariantNumeric: "tabular-nums" }}
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

/* ------------------------------------------------------------------------ */

/**
 * The plate. Authored, not licensed: a tonal field built from the game's own
 * profile geometry at monumental scale, cut by a shaft of light. Cropped hard
 * by the frame so it reads as a composed image rather than a centred chart.
 */
function PlateC({ profile }: { profile: ProfileView }) {
  // Deliberately off-canvas: only the right arc of the geometry enters the
  // frame, registered over the image like an overlay on an archive print. A
  // centred, fully-visible polygon here would just be wallpaper.
  const center = { x: 130, y: 290 };
  const radius = 400;
  const count = profile.radar.length;
  const polygon = buildPolygon(
    center,
    radius,
    profile.radar.map((p) => p.value),
  );

  return (
    <>
      <svg
        viewBox="0 0 1200 560"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="dl-c-shaft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0d9a8" stopOpacity="0.34" />
            <stop offset="55%" stopColor="#c8641e" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#0a0908" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="dl-c-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0908" stopOpacity="0" />
            <stop offset="100%" stopColor="#0a0908" stopOpacity="0.96" />
          </linearGradient>
          <linearGradient id="dl-c-fog" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8d7a5e" stopOpacity="0" />
            <stop offset="60%" stopColor="#8d7a5e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8d7a5e" stopOpacity="0" />
          </linearGradient>
          <filter id="dl-c-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>

        <rect width="1200" height="560" fill="#0d0b0a" />

        {/* Two shafts cutting the dark — the game's own subject, and the reason
            the plate is a composed field rather than a blurred screenshot. */}
        <path d="M690 -40 L900 -40 L1160 600 L520 600 Z" fill="url(#dl-c-shaft)" />
        <path
          d="M1010 -40 L1080 -40 L1240 600 L1010 600 Z"
          fill="url(#dl-c-shaft)"
          opacity="0.55"
        />

        {/* A stand of trees against the light. Deterministic, so the server and
            client render identically. This is the whole point of the plate: an
            authored image that says Pacific Northwest at night without using a
            single frame of licensed key art. */}
        <g fill="#050403">
          {Array.from({ length: 54 }, (_, i) => {
            const seed = (i * 2654435761) % 1000;
            const x = i * 23 - 20 + (seed % 17);
            const width = 5 + (seed % 19);
            const top = 120 + ((seed * 7) % 240);
            const lean = ((seed % 9) - 4) * 0.6;
            return (
              <path
                key={i}
                d={`M${x} 560 L${x + lean} ${top} L${x + width + lean} ${top} L${x + width} 560 Z`}
                opacity={0.55 + (seed % 40) / 100}
              />
            );
          })}
        </g>

        {/* Ground fog lifting between the trunks. */}
        <rect
          y="330"
          width="1200"
          height="230"
          fill="url(#dl-c-fog)"
          opacity="0.55"
        />

        {/* Profile geometry registered over the image, entering from the left
            edge only. Faint: it is a mark on the plate, not the subject. */}
        <g opacity="0.62">
          <g fill="none" opacity="0.55">
            {[5, 7.5, 10].map((level) => (
              <path
                key={level}
                d={ringPath(center, radius, count, level)}
                stroke="#4a4038"
                strokeWidth={0.9}
              />
            ))}
          </g>
          <g fill="none">
            {polygon.segments.map((segment, index) => (
              <line
                key={index}
                x1={segment.from.x}
                y1={segment.from.y}
                x2={segment.to.x}
                y2={segment.to.y}
                stroke="#d9a04a"
                strokeWidth={1.75}
                strokeOpacity={0.7}
              />
            ))}
          </g>
        </g>

        {/* Archive perforation along both edges. */}
        <g opacity="0.45">
          {Array.from({ length: 48 }, (_, i) => (
            <line
              key={`t${i}`}
              x1={i * 25 + 12}
              y1={0}
              x2={i * 25 + 12}
              y2={i % 4 === 0 ? 11 : 5}
              stroke="#6d665b"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 48 }, (_, i) => (
            <line
              key={`b${i}`}
              x1={i * 25 + 12}
              y1={560}
              x2={i * 25 + 12}
              y2={i % 4 === 0 ? 549 : 555}
              stroke="#6d665b"
              strokeWidth={1}
            />
          ))}
        </g>

        <rect width="1200" height="560" fill="url(#dl-c-floor)" />
      </svg>

      <svg
        className="dl-c__plate-grain h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        <rect width="100%" height="100%" filter="url(#dl-c-grain)" opacity="0.32" />
      </svg>
    </>
  );
}
