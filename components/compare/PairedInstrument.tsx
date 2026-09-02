"use client";

import Link from "next/link";
import type { Route } from "next";
import { useId, useState } from "react";
import type { CompareDimension, CompareProfile } from "@/lib/compare";
import type { PairRow, PairView } from "@/lib/compare/pair";
import { RELATIONSHIP_LABEL } from "@/lib/compare/relationship";
import { CONFIDENCE_LABEL } from "@/lib/profile/vocabulary";
import { PairScale } from "./PairScale";

/**
 * THE PAIRED INSTRUMENT: eight permanent rows in canonical order, each with
 * the dimension name, the left game's exact value and confidence, the right
 * game's, and the relation in words (handoff §10.5; matrix C-09, C-10).
 *
 * ── Reading order is the DOM order ──────────────────────────────────────────
 *
 * Name, gloss, LEFT (game, value, confidence), RIGHT (game, value, confidence),
 * then the relation sentence — the order the handoff's accessible group name
 * uses. On a wide screen the relation is placed visually between the two
 * sides; it holds no control, so focus order is untouched (matrix X-12).
 *
 * Each side is bounded by its own edge — solid for the left game, dashed for
 * the right — and named in text, so the two are told apart without colour.
 * Range says both endpoints; Not scored says so and adds that it is not zero.
 *
 * "Details" is an explicit 44px disclosure with `aria-expanded` and
 * `aria-controls`; its panel follows it in DOM order and is always present,
 * hidden with `hidden`. Rows open independently and nothing traps.
 */
export function PairedInstrument({ pair }: { pair: PairView }) {
  const id = useId();
  return (
    <section className="cp-instrument" aria-labelledby={`${id}-heading`}>
      <div className="cp-measure">
        <h2 id={`${id}-heading`} className="cp-kicker">
          The eight dimensions, side by side
        </h2>
        <p className="cp-instrument__rule">
          Fixed order, fixed 0–10 scale, exact values from each Game Profile.
          The relation is written on every row. No dimension is weighted,
          nothing is added up, and there is no overall score.
        </p>
        <ol className="cp-rows" aria-label="The eight dimensions, paired">
          {pair.rows.map((row) => (
            <Row key={row.key} row={row} pair={pair} idBase={id} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function Row({ row, pair, idBase }: { row: PairRow; pair: PairView; idBase: string }) {
  const [open, setOpen] = useState(false);
  const panelId = `${idBase}-${row.key}`;
  const higher =
    row.relationship.kind === "clear" || row.relationship.kind === "close"
      ? row.relationship.higher
      : undefined;

  return (
    <li
      className="cp-row"
      data-relation={row.relationship.kind}
      data-higher={higher}
      data-asymmetric={row.asymmetricConfidence || undefined}
    >
      <div className="cp-row__head">
        <h3 className="cp-row__name">{row.name}</h3>
        <p className="cp-row__gloss">{row.summary}</p>
      </div>

      <div className="cp-row__pair">
        <Side title={pair.left.title} dimension={row.left} varies={row.varies.left} side="left" />
        <Side title={pair.right.title} dimension={row.right} varies={row.varies.right} side="right" />
        <div className="cp-row__relation">
          <PairScale row={row} />
          <p className="cp-row__word">
            <span className="cp-word" data-relation={row.relationship.kind}>
              {RELATIONSHIP_LABEL[row.relationship.kind]}
            </span>
            <span className="sr-only">. </span>
            <span className="cp-row__sentence">{row.relationSentence}</span>
          </p>
        </div>
      </div>

      <button
        type="button"
        className="cp-row__why"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        Details
        <span className="sr-only"> — {row.name}</span>
        <span className="cp-row__chevron" aria-hidden="true">
          ⌄
        </span>
      </button>

      <div id={panelId} hidden={!open} className="cp-row__panel">
        <p className="cp-row__question">{row.question}</p>
        <div className="cp-row__panel-grid">
          <Detail profile={pair.left} dimension={row.left} side="left" />
          <Detail profile={pair.right} dimension={row.right} side="right" />
        </div>
      </div>
    </li>
  );
}

function Side({
  title,
  dimension,
  varies,
  side,
}: {
  title: string;
  dimension: CompareDimension;
  varies: boolean;
  side: "left" | "right";
}) {
  const { score, display, confidence } = dimension;
  return (
    <div className="cp-row__side" data-side={side} data-kind={score.kind} data-confidence={confidence}>
      <span className="cp-row__game">{title}</span>
      <span className="sr-only">: </span>
      <span className="cp-row__value">
        {score.kind === "insufficient" ? (
          <>
            <span className="cp-row__notscored">Not scored</span>
            <span className="sr-only">
              {" "}
              — insufficient evidence; no total is published, and this is not zero
            </span>
          </>
        ) : (
          <>
            <span className="sip-num cp-row__num">{display}</span>
            <span className="sr-only"> out of 10</span>
            {score.kind === "range" && (
              <span className="cp-row__kind">
                {" "}
                range
                <span className="sr-only">, both endpoints published</span>
              </span>
            )}
          </>
        )}
      </span>
      <span className="sr-only">, </span>
      <span className="cp-row__confidence">
        {CONFIDENCE_LABEL[confidence]} confidence
        {varies && <span className="cp-row__varies"> · Varies by platform</span>}
      </span>
      <span className="sr-only">. </span>
    </div>
  );
}

function Detail({
  profile,
  dimension,
  side,
}: {
  profile: CompareProfile;
  dimension: CompareDimension;
  side: "left" | "right";
}) {
  const hasVariance = dimension.notes.length > 0 || dimension.overrides.length > 0;
  return (
    <div className="cp-row__detail" data-side={side}>
      <h4 className="cp-row__detail-name">{profile.title}</h4>
      {dimension.score.kind === "range" && (
        <p className="cp-row__detail-note">
          Published as a range: one subcriterion could not be scored, so the
          total is an interval rather than a point. It is not averaged.
        </p>
      )}
      {dimension.score.kind === "insufficient" && (
        <p className="cp-row__detail-note">
          Not scored: too little evidence to publish a total. This is not a low
          score.
        </p>
      )}
      {hasVariance && (
        <ul className="cp-row__variance">
          {dimension.notes.map((note) => (
            <li key={`note-${note.subcriterion}`}>
              <strong>{note.subcriterion}, platform note.</strong> {note.note}
            </li>
          ))}
          {dimension.overrides.map((override) => (
            <li key={`override-${override.subcriterion}-${override.platform}`}>
              <strong>
                {override.subcriterion}, {override.platform}:
              </strong>{" "}
              {override.value} on this platform, against a base of {override.base}.{" "}
              {override.rationale}
            </li>
          ))}
        </ul>
      )}
      <Link className="cp-link" href={profile.path as Route}>
        Why this score, on the {profile.title} Game Profile
      </Link>
    </div>
  );
}
