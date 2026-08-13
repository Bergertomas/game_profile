"use client";

import { useState, type CSSProperties } from "react";
import type { DimensionView, ProfileView } from "@/lib/profile/build";
import { accentFor, citationsFor, pad2 } from "@/lib/design-lab/profile";
import {
  BLOCK_ORDER,
  CONFIDENCE_LABEL,
  EVIDENCE_MATURITY_LABEL,
  EVIDENCE_MATURITY_MEANING,
  EVIDENCE_STATUS_LABEL,
  PRE_RELEASE_NOTICE,
  SOURCE_CATEGORY_LABEL,
  blockHeadings,
} from "@/lib/profile/vocabulary";
import { formatDate, formatYear } from "@/lib/format";
import { provenanceLabel } from "@/lib/profile/provenance";
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
 * DIRECTION D — Editorial Instrument
 *
 * The consolidated direction. A premium editorial document that behaves like a
 * precise measurement tool — not a collage of A, B and C.
 *
 * Kept from A: editorial hierarchy, condensed display type, Newsreader prose,
 * evidence as marginalia, and the leader-dot index rhythm on every score row.
 * Kept from B: radar clarity, one shared measurement scale, hard alignment,
 * tabular numerals, and explicit derivation/confidence language.
 * Kept from C: composition that breathes, and the title/visual relationship —
 * the identity block and the instrument read as one spread.
 *
 * Rejected: B's fully boxed dashboard density (nothing here is in a box —
 * there is not one bordered container in the direction), C's dark field and
 * plate-first hierarchy, and C's authored forest plate. We hold no licence to
 * this or any game's key art, so Direction D ships with no game image at all
 * rather than placeholder illustration.
 *
 * This component is a reusable ProfileView presentation. It reads nothing but
 * the profile it is handed: no game title, platform, mode, date, evidence text
 * or score is written into it.
 */
export function DirectionD({ profile }: { profile: ProfileView }) {
  // The open row keeps its axis marked on the radar; pointer and keyboard may
  // borrow the marker while they are on a different row, then hand it back.
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const active = hovered ?? focused ?? open;

  const { game, evaluation } = profile;
  const headings = blockHeadings(evaluation.evidenceStatus);
  const accent = accentFor(game.slug);
  const preRelease = evaluation.evidenceStatus === "pre_release";

  return (
    <div
      className="dl-d min-h-screen"
      style={{ "--dl-accent": accent } as CSSProperties}
    >
      <div className="mx-auto w-full max-w-[74rem] px-4 pb-14 sm:px-8">
        {/* Running head ------------------------------------------------- */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--dl-rule)] py-2.5">
          <span className="dl-d__label">Game Profile · Experience assessment</span>
          <span className="dl-d__label">
            Rubric v{evaluation.rubricVersion} ·{" "}
            {provenanceLabel(evaluation.scoreProvenance)}
          </span>
        </div>

        <div className="dl-d__top">
          {/* ============================================================ */}
          {/* 1 — Identity, status, confidence, scope, experience summary  */}
          {/* ============================================================ */}
          <header className="dl-d__identity pt-6 sm:pt-10">
            <p className="dl-d__label dl-d__label--accent">
              {[
                EVIDENCE_STATUS_LABEL[evaluation.evidenceStatus],
                `${CONFIDENCE_LABEL[evaluation.confidence]} confidence`,
                `Checked ${formatDate(evaluation.evidenceCutoffAt)}`,
              ].join(" · ")}
            </p>

            <h1 className="dl-d__display mt-2.5 text-[3rem] sm:text-[4.25rem] lg:text-[5.25rem]">
              {game.canonicalTitle}
            </h1>

            <p className="dl-d__label mt-3">
              {[
                game.developerText,
                game.publisherText,
                formatYear(game.firstReleaseDate),
              ].join(" · ")}
            </p>

            {/* The lede. What this is to play, not whether it is good. */}
            <p className="mt-4 max-w-[36rem] text-[1rem] leading-[1.55] text-[var(--dl-ink-soft)] sm:text-[1.0625rem]">
              {evaluation.oneLineExperience}
            </p>

            {preRelease && (
              <p className="mt-4 max-w-[36rem] border-l-2 border-[var(--dl-accent)] pl-3 text-[0.9375rem] leading-relaxed text-[var(--dl-ink-soft)]">
                {PRE_RELEASE_NOTICE}
              </p>
            )}
          </header>

          {/* Scope register. Mandatory context (Rubric §1: an unscoped score is
              not a valid score), set as a compact tabular rail. It sits beside
              the title on desktop and directly under the numbers it scopes on a
              phone, which is the only place it can go without pushing the
              silhouette off the first screen. */}
          <dl className="dl-d__register mt-8 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-[var(--dl-rule)] pt-4 lg:mt-0 lg:grid-cols-1 lg:gap-y-3.5 lg:border-t-0 lg:border-l lg:pt-1 lg:pl-6">
            {[
              ["Edition", evaluation.scope.edition],
              ["Mode", evaluation.scope.mode],
              ["Platforms", evaluation.scope.platforms.join(", ")],
              ["Build", evaluation.scope.buildOrPatch],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="dl-d__label">{term}</dt>
                <dd className="mt-0.5 text-[0.875rem] leading-snug text-[var(--dl-ink)]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {/* ============================================================ */}
          {/* 2 — The instrument: radar and eight exact rows, one device    */}
          {/* ============================================================ */}
          <section
            aria-labelledby="dl-d-profile"
            className="dl-d__instrument mt-8 border-t-[1.5px] border-[var(--dl-rule-strong)] pt-3 sm:mt-10"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 id="dl-d-profile" className="dl-d__label dl-d__label--ink">
                The profile
              </h2>
              <span className="dl-d__label">
                Eight independent axes · each 0–10 · no overall score
              </span>
            </div>

            <div className="mt-5 lg:grid lg:grid-cols-[21rem_minmax(0,1fr)] lg:gap-x-10 xl:grid-cols-[26rem_minmax(0,1fr)]">
              <figure className="m-0 lg:sticky lg:top-6 lg:self-start">
                {/* Left-aligned with the caption and everything else on the
                    page; the radar only fills its column once it has one. */}
                <div className="w-full max-w-[27rem] lg:max-w-none">
                  {/* Two geometries swapped by CSS at 640px, so phone labels
                      render around 11px rather than 7px. */}
                  <div className="sm:hidden">
                    <RadarD profile={profile} active={active} layout={COMPACT} />
                  </div>
                  <div className="hidden sm:block">
                    <RadarD
                      profile={profile}
                      active={active}
                      layout={full({
                        width: 500,
                        height: 400,
                        center: { x: 250, y: 198 },
                        radius: 116,
                        labelRadius: 138,
                        nameSize: 14,
                        valueSize: 20,
                      })}
                    />
                  </div>
                </div>
                {/* The polygon is aria-hidden, so its text equivalent lives
                    here rather than being lost. */}
                <span className="dl-sr">{profile.shapeDescription}</span>
                <figcaption className="mt-3 max-w-[27rem] text-[0.875rem] leading-relaxed text-[var(--dl-ink-quiet)] lg:max-w-none">
                  The rings are the same 0–10 scale the rows are measured
                  against. Each axis is read on its own; no total is derived from
                  the enclosed area.
                </figcaption>
              </figure>

              <div className="mt-8 lg:mt-0">
                {/* Column head. The graduations are declared once here and
                    every row below is measured against them — one shared
                    scale. */}
                <div className="hidden border-b-[1.5px] border-[var(--dl-rule-strong)] pb-1.5 sm:grid sm:grid-cols-[1.75rem_minmax(0,1fr)_7rem_5.5rem_3.75rem] sm:items-end sm:gap-x-3 sm:px-2">
                  <span className="dl-d__label" aria-hidden="true">
                    #
                  </span>
                  <span className="dl-d__label">Dimension</span>
                  <ScaleGraduations />
                  <span className="dl-d__label text-right">Score</span>
                  <span className="dl-d__label">Conf.</span>
                </div>
                <div className="dl-d__label mt-1 flex justify-between sm:hidden">
                  <span>Dimension</span>
                  <span>Score · Confidence</span>
                </div>

                <ol className="mt-0 list-none border-b-[1.5px] border-[var(--dl-rule-strong)] p-0">
                  {profile.dimensions.map((view, index) => (
                    <MeasurementRow
                      key={view.dimension.key}
                      index={index}
                      view={view}
                      profile={profile}
                      isActive={active === view.dimension.key}
                      isOpen={open === view.dimension.key}
                      onHover={setHovered}
                      onFocus={setFocused}
                      onToggle={(key) => setOpen(open === key ? null : key)}
                    />
                  ))}
                </ol>

                <p className="mt-3 max-w-[42rem] text-[0.9375rem] leading-relaxed text-[var(--dl-ink-soft)]">
                  {readingNote(profile)}
                </p>
                <p className="dl-d__label mt-2">
                  Every total is derived from five subcriteria, never entered by
                  hand. Open any row for the derivation.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ============================================================== */}
        {/* 3 — Primary pull and primary risk                              */}
        {/* ============================================================== */}
        <section className="mt-10 border-t-[1.5px] border-[var(--dl-rule-strong)] pt-5">
          <div className="grid gap-x-12 gap-y-6 md:grid-cols-2">
            {(
              [
                ["Primary pull", evaluation.primaryPull, true],
                ["Primary risk", evaluation.primaryRisk, false],
              ] as const
            ).map(([label, text, isPull]) => (
              <div key={label}>
                <h2
                  className={`dl-d__label ${
                    isPull ? "dl-d__label--accent" : "dl-d__label--ink"
                  }`}
                >
                  {label}
                </h2>
                <p className="mt-2 max-w-[34rem] text-[1.0625rem] leading-[1.55]">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================== */}
        {/* 4 — Recommendations, evidence, provenance                      */}
        {/* ============================================================== */}
        <section className="mt-10 border-t-[1.5px] border-[var(--dl-rule-strong)] pt-5">
          <h2 className="dl-d__label dl-d__label--ink">Who this is for</h2>
          <div className="mt-4 grid gap-x-10 gap-y-7 lg:grid-cols-3">
            {BLOCK_ORDER.map((type, i) => (
              <section key={type}>
                <div className="flex items-baseline gap-2.5 border-b border-[var(--dl-rule)] pb-1.5">
                  <span className="dl-d__num text-[0.875rem] text-[var(--dl-accent)]">
                    {pad2(i + 1)}
                  </span>
                  <h3 className="dl-d__display text-[1.0625rem]">
                    {headings[type].title}
                  </h3>
                </div>
                <p className="dl-d__label mt-1.5">{headings[type].note}</p>
                <ul className="mt-2.5 list-none space-y-2 p-0">
                  {evaluation.blocks[type].map((item) => (
                    <li
                      key={item}
                      className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-2 text-[0.9375rem] leading-snug text-[var(--dl-ink-soft)]"
                    >
                      <span
                        aria-hidden="true"
                        className="text-[var(--dl-ink-quiet)]"
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

          <div className="mt-9 grid gap-x-10 gap-y-7 border-t border-[var(--dl-rule)] pt-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <h3 className="dl-d__label dl-d__label--ink">Traits</h3>
              <p className="mt-2 max-w-[38rem] text-[0.9375rem] leading-relaxed text-[var(--dl-ink-soft)]">
                {profile.tags.map((tag, i) => (
                  <span key={tag.definition.key}>
                    {i > 0 && " · "}
                    <span className="text-[var(--dl-ink)]">
                      {tag.definition.label}
                    </span>
                    {tag.intensity && (
                      <span className="dl-d__label"> {tag.intensity}</span>
                    )}
                  </span>
                ))}
              </p>

              {evaluation.platformWarning && (
                <div className="mt-6">
                  <h3 className="dl-d__label dl-d__label--accent">
                    Platform variance
                  </h3>
                  <p className="mt-1.5 max-w-[38rem] text-[0.9375rem] leading-relaxed text-[var(--dl-ink-soft)]">
                    {evaluation.platformWarning}
                  </p>
                </div>
              )}

              {evaluation.evidenceMaturity && (
                <div className="mt-6">
                  <h3 className="dl-d__label dl-d__label--ink">
                    Evidence maturity ·{" "}
                    {EVIDENCE_MATURITY_LABEL[evaluation.evidenceMaturity]}
                  </h3>
                  <p className="mt-1.5 max-w-[38rem] text-[0.9375rem] leading-relaxed text-[var(--dl-ink-soft)]">
                    {EVIDENCE_MATURITY_MEANING[evaluation.evidenceMaturity]}
                  </p>
                </div>
              )}

              <div className="mt-6">
                <h3 className="dl-d__label dl-d__label--ink">Provenance</h3>
                <dl className="mt-2 max-w-[38rem] space-y-1.5">
                  {[
                    ["Scores", provenanceLabel(evaluation.scoreProvenance)],
                    ["Release context", evaluation.releaseContext],
                    [
                      "Evidence cut-off",
                      formatDate(evaluation.evidenceCutoffAt),
                    ],
                    [
                      "Ledger",
                      evaluation.evidenceLedger === "pending"
                        ? "Individual source records pending"
                        : "Source records held",
                    ],
                    ...(evaluation.publishedAt
                      ? [["Published", formatDate(evaluation.publishedAt)]]
                      : []),
                  ].map(([term, value]) => (
                    <div
                      key={term}
                      className="flex items-baseline gap-2 text-[0.9375rem]"
                    >
                      <dt className="dl-d__label shrink-0">{term}</dt>
                      <span
                        aria-hidden="true"
                        className="dl-d__leader"
                      />
                      <dd className="shrink-0 text-[var(--dl-ink-soft)]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {evaluation.scoreProvenance.note && (
                  <p className="mt-2 max-w-[38rem] text-[0.9375rem] leading-relaxed text-[var(--dl-ink-soft)]">
                    {evaluation.scoreProvenance.note}
                  </p>
                )}
              </div>
            </div>

            {/* Evidence apparatus, set as marginalia (A) with B's explicit
                language about what a source is and is not. */}
            <div className="lg:border-l lg:border-[var(--dl-rule)] lg:pl-6">
              <h3 className="dl-d__label dl-d__label--ink">Evidence</h3>
              <ol className="mt-2.5 list-none space-y-2.5 p-0">
                {evaluation.sources.map((source, i) => (
                  <li
                    key={source.id}
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2"
                  >
                    <span className="dl-d__mark text-[var(--dl-accent)]">
                      {pad2(i + 1)}
                    </span>
                    <span className="text-[0.9375rem] leading-snug text-[var(--dl-ink-soft)]">
                      {source.title}
                      <span className="dl-d__label"> Tier {source.tier}</span>
                    </span>
                  </li>
                ))}
              </ol>

              {evaluation.evidenceLedger === "populated" ? (
                <dl className="mt-4 space-y-1.5 border-t border-[var(--dl-rule)] pt-3">
                  {profile.evidence.categoryCounts.map(({ category, count }) => (
                    <div
                      key={category}
                      className="flex items-baseline gap-2 text-[0.9375rem]"
                    >
                      <dt className="dl-d__label shrink-0">
                        {SOURCE_CATEGORY_LABEL[category]}
                      </dt>
                      <span
                        aria-hidden="true"
                        className="dl-d__leader"
                      />
                      <dd className="dl-d__num shrink-0 text-[0.875rem]">
                        {count}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-4 border-t border-[var(--dl-rule)] pt-3 text-[0.9375rem] leading-relaxed text-[var(--dl-ink-soft)]">
                  The evidence ledger holds these classes of source, not yet the
                  individual records behind them. No source count is published
                  until it does.
                </p>
              )}
              <p className="dl-d__label mt-3">
                Sources are evidence, not votes. Nothing here is averaged.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ========================================================================== */

/**
 * One measurement row: index, name, leader dots, the shared 0–10 scale, the
 * exact value and its confidence — then the derivation, opened in place.
 */
function MeasurementRow({
  index,
  view,
  profile,
  isActive,
  isOpen,
  onHover,
  onFocus,
  onToggle,
}: {
  index: number;
  view: DimensionView;
  profile: ProfileView;
  isActive: boolean;
  isOpen: boolean;
  onHover: (key: string | null) => void;
  onFocus: (key: string | null) => void;
  onToggle: (key: string) => void;
}) {
  const { dimension, display, score, subcriteria, confidence } = view;
  const citations = citationsFor(profile, dimension.key as DimensionKey);
  const panelId = `dl-d-why-${dimension.key}`;
  const notScored = score.kind === "insufficient";

  return (
    <li>
      <button
        type="button"
        className="dl-d__row"
        data-active={isActive}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onToggle(dimension.key)}
        onMouseEnter={() => onHover(dimension.key)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onFocus(dimension.key)}
        onBlur={() => onFocus(null)}
      >
        <span className="dl-d__row-index dl-d__num text-[0.8125rem] text-[var(--dl-ink-quiet)]">
          {pad2(index + 1)}
        </span>

        {/* Below 640px the leader is dropped and the name may wrap: the label
            for a number must never be clipped to protect a decorative rhythm. */}
        <span className="dl-d__row-name flex min-w-0 items-baseline gap-2">
          <span className="text-[0.9375rem] font-medium text-[var(--dl-ink)] sm:truncate">
            {dimension.name}
          </span>
          {citations.length > 0 && (
            <span className="dl-d__cite shrink-0">
              {citations.map(pad2).join(",")}
            </span>
          )}
          <span aria-hidden="true" className="dl-d__leader hidden sm:block" />
        </span>

        <span className="dl-d__row-scale">
          <ScaleReading score={score} />
        </span>

        <span className="dl-d__row-value flex items-baseline gap-2.5 sm:justify-end">
          {notScored ? (
            <span className="dl-d__label dl-d__label--ink whitespace-nowrap">
              Not scored
            </span>
          ) : (
            <span className="dl-d__num text-[1.0625rem]">{display}</span>
          )}
          <span className="dl-d__label sm:hidden">
            {CONFIDENCE_LABEL[confidence]}
          </span>
        </span>

        <span className="dl-d__row-confidence dl-d__label hidden sm:block">
          {CONFIDENCE_LABEL[confidence]}
        </span>

        <span className="dl-sr">Why this score?</span>
      </button>

      <div id={panelId} hidden={!isOpen} className="dl-d__panel px-2 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h3 className="dl-d__label dl-d__label--ink">Why this score?</h3>
          <span className="dl-d__label">
            {CONFIDENCE_LABEL[confidence]} confidence in this dimension ·{" "}
            {citations.length > 0
              ? `Evidence ${citations.map(pad2).join(", ")}`
              : "No source linked to this dimension yet"}
          </span>
        </div>

        <p className="mt-2 max-w-[46rem] text-[0.9375rem] leading-relaxed text-[var(--dl-ink-soft)]">
          {dimension.coreQuestion}
        </p>

        <ol className="mt-3 list-none p-0">
          {subcriteria.map((sub, i) => (
            <li
              key={sub.key}
              className="grid grid-cols-[1.75rem_minmax(0,1fr)_3rem] gap-x-3 border-t border-[var(--dl-rule)] py-2.5"
            >
              <span className="dl-d__num text-[0.8125rem] text-[var(--dl-ink-quiet)]">
                {pad2(i + 1)}
              </span>
              <span>
                <span className="block text-[0.9375rem] font-medium">
                  {sub.name}
                </span>
                <span className="mt-1 block max-w-[42rem] text-[0.9375rem] leading-relaxed text-[var(--dl-ink-soft)]">
                  {sub.entry.rationale ||
                    "No evidence available for this subcriterion."}
                </span>
                {sub.entry.platformNote && (
                  <span className="mt-1 block max-w-[42rem] text-[0.875rem] leading-relaxed text-[var(--dl-ink-quiet)]">
                    {sub.entry.platformNote}
                  </span>
                )}
              </span>
              <span className="dl-d__num text-right text-[0.9375rem]">
                {sub.entry.value === "unknown" ? (
                  <span className="dl-d__label">Unknown</span>
                ) : (
                  formatScore(sub.entry.value)
                )}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-2.5 border-t border-[var(--dl-rule)] pt-2.5 text-[0.9375rem] leading-relaxed text-[var(--dl-ink-soft)]">
          {derivationSentence(view)}
        </p>
      </div>
    </li>
  );
}

/**
 * The graduations, declared once above the column. Rows carry only a baseline
 * and their reading, so the eye compares eight readings on one scale.
 */
function ScaleGraduations() {
  return (
    <span className="relative block self-end">
      <span className="dl-d__scale block">
        {[0, 2.5, 5, 7.5, 10].map((level) => (
          <span
            key={level}
            className="dl-d__grad"
            style={{ left: `${(level / 10) * 100}%` }}
          />
        ))}
      </span>
      <span className="dl-d__label mt-0.5 flex justify-between">
        <span>0</span>
        <span>10</span>
      </span>
    </span>
  );
}

/**
 * A reading on the shared scale.
 *
 * Exact: a measured ink rule from zero, closed by an accent tick.
 * Range:  the same rule to the confirmed floor, then a dotted reach to the
 *         ceiling closed by an open tick — the span the unknown subcriterion
 *         could still move the total across.
 * Unknown: a dashed baseline and no reading at all. It is not a zero.
 */
function ScaleReading({ score }: { score: DimensionView["score"] }) {
  if (score.kind === "insufficient") {
    return (
      <span className="dl-d__scale dl-d__scale--unknown block" aria-hidden="true" />
    );
  }

  const low = score.kind === "exact" ? score.score : score.low;
  const high = score.kind === "exact" ? score.score : score.high;

  return (
    <span className="dl-d__scale block" aria-hidden="true">
      <span className="dl-d__measure" style={{ width: `${(low / 10) * 100}%` }} />
      {score.kind === "range" && (
        <span
          className="dl-d__reach"
          style={{
            left: `${(low / 10) * 100}%`,
            width: `${((high - low) / 10) * 100}%`,
          }}
        />
      )}
      <span className="dl-d__tick" style={{ left: `${(low / 10) * 100}%` }} />
      {score.kind === "range" && (
        <span
          className="dl-d__tick dl-d__tick--open"
          style={{ left: `${(high / 10) * 100}%` }}
        />
      )}
    </span>
  );
}

/* ========================================================================== */

/**
 * The radar, unboxed.
 *
 * B's clarity — a legible grid on the same 0–10 scale as the rows, graduations
 * along one bisector — drawn with A's printed register marks and set into open
 * space rather than a plate or a panel. There is no frame, no card and no
 * artwork behind it.
 */
function RadarD({
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
    profile.radar.map((point) => point.value),
  );
  // The compact geometry is only ever rendered below 640px.
  const compact = layout.width <= COMPACT.width;

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      {/* Grid: the same scale the rows are measured against. */}
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
          const on = active === point.key;
          return (
            <line
              key={point.key}
              x1={center.x}
              y1={center.y}
              x2={outer.x}
              y2={outer.y}
              stroke={on ? "var(--dl-accent)" : "var(--dl-rule)"}
              strokeWidth={on ? 1.5 : 0.75}
            />
          );
        })}
      </g>

      {/* Graduations along one bisector, matching the row column head. Two
          marks are enough to declare the scale; four became clutter inside the
          polygon. Dropped at phone size, where they would land near 6px. */}
      {!compact && (
        <g>
          {[5, 10].map((level) => {
            const angle = axisAngleRad(0, count) + Math.PI / count;
            const r = scoreRadius(level, radius);
            const x = center.x + r * Math.cos(angle);
            const y = center.y + r * Math.sin(angle);
            return (
              <text
                key={level}
                x={x + 6}
                y={y + 4}
                fontFamily="JetBrains Mono, monospace"
                fontSize={13}
                fill="var(--dl-ink-quiet)"
              >
                {level}
              </text>
            );
          })}
        </g>
      )}

      {polygon.fillPath && (
        <path
          d={polygon.fillPath}
          fill="var(--dl-accent)"
          fillOpacity={0.1}
          stroke="none"
        />
      )}

      {/* Uncertainty reach: a dotted spur from the confirmed floor to the
          ceiling on any axis published as a range. */}
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
              stroke="var(--dl-ink-quiet)"
              strokeWidth={1.5}
              strokeDasharray="2 3"
            />
          );
        })}
      </g>

      <g className="dl-reveal" fill="none" strokeLinejoin="miter">
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

      {/* Register marks, not data dots. */}
      <g>
        {profile.radar.map((point, index) => {
          if (point.value === null) return null;
          const v = vertexFor(center, radius, index, count, point.value);
          const on = active === point.key;
          const size = on ? 4.5 : 3.25;
          return (
            <rect
              key={point.key}
              x={v.x - size}
              y={v.y - size}
              width={size * 2}
              height={size * 2}
              fill={on ? "var(--dl-accent)" : "var(--dl-ink)"}
              stroke="var(--dl-field)"
              strokeWidth={1}
            />
          );
        })}
        {profile.radar.map((point, index) => {
          if (point.ceiling === null) return null;
          const v = vertexFor(center, radius, index, count, point.ceiling);
          return (
            <rect
              key={`${point.key}-ceiling`}
              x={v.x - 3}
              y={v.y - 3}
              width={6}
              height={6}
              fill="none"
              stroke="var(--dl-ink-quiet)"
              strokeWidth={1.25}
            />
          );
        })}
      </g>

      {/* Axis label and reading, paired at the axis end. */}
      <g>
        {profile.radar.map((point, index) => {
          const place = axisLabelPlacement(center, labelRadius, index, count);
          const on = active === point.key;
          const above = place.vertical === "above";
          const wide = point.value !== null && point.ceiling !== null;
          const size = point.value === null || wide ? valueSize * 0.74 : valueSize;
          return (
            <g key={point.key}>
              <text
                x={place.point.x}
                y={above ? place.point.y - valueSize * 0.74 : place.point.y}
                textAnchor={place.anchor}
                fontFamily="Archivo, system-ui, sans-serif"
                fontSize={nameSize}
                fontWeight={600}
                fill={on ? "var(--dl-ink)" : "var(--dl-ink-quiet)"}
              >
                {point.shortLabel.toUpperCase()}
              </text>
              <text
                x={place.point.x}
                y={above ? place.point.y + valueSize * 0.24 : place.point.y + valueSize}
                textAnchor={place.anchor}
                fontFamily="Archivo, system-ui, sans-serif"
                fontSize={size}
                fontWeight={700}
                fill={on ? "var(--dl-accent)" : "var(--dl-ink)"}
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

/* ========================================================================== */

/**
 * The derived-not-entered explanation, stated in the terms of whichever state
 * the dimension is actually in.
 */
function derivationSentence(view: DimensionView): string {
  const { score, subcriteria } = view;
  const total = subcriteria.length;
  switch (score.kind) {
    case "exact":
      return `Derived, not entered: the ${total} subcriteria above are each scored 0–2 and summed to ${formatScore(
        score.score,
      )}. Change a rationale and the number has to change with it.`;
    case "range":
      return `Derived, not entered: ${
        total - score.unknownCount
      } of ${total} subcriteria sum to ${formatScore(
        score.low,
      )}, and the one with no evidence could add up to 2 more — so the published figure is the range ${formatScore(
        score.low,
      )}–${formatScore(
        score.high,
      )}, not a point value we cannot support.`;
    case "insufficient":
      return `Not scored: ${score.unknownCount} of ${total} subcriteria have no evidence behind them. The ${
        total - score.unknownCount
      } that do sum to ${formatScore(
        score.knownSum,
      )}, but a range that wide would be a guess, so no total is published. Unknown is not zero.`;
  }
}

/**
 * A reading of the silhouette, derived from the profile in hand — the spread
 * between its highest and lowest published axes, and anything left unscored.
 */
function readingNote(profile: ProfileView): string {
  const scored = profile.dimensions.flatMap((view) =>
    view.score.kind === "insufficient"
      ? []
      : [
          {
            name: view.dimension.name,
            display: view.display,
            value: view.score.kind === "exact" ? view.score.score : view.score.low,
          },
        ],
  );
  const unscored = profile.dimensions.filter(
    (view) => view.score.kind === "insufficient",
  );

  if (scored.length === 0) {
    return "No axis on this profile has enough evidence behind it to publish a total yet.";
  }

  const sorted = [...scored].sort((a, b) => b.value - a.value);
  const top = sorted[0]!;
  const bottom = sorted[sorted.length - 1]!;
  const spread = top.value - bottom.value;

  const parts = [
    `${top.name} sits highest at ${top.display} and ${bottom.name} lowest at ${bottom.display} — a spread of ${formatScore(
      spread,
    )} points.`,
    "That distance is the profile: it says what kind of game this is, not how good it is.",
  ];
  if (unscored.length > 0) {
    parts.push(
      `${unscored
        .map((view) => view.dimension.name)
        .join(" and ")} ${
        unscored.length === 1 ? "carries" : "carry"
      } no published total, because the evidence is not there.`,
    );
  }
  return parts.join(" ");
}
