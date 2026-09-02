"use client";

import type { CompareIndex } from "@/lib/compare";
import { composePair } from "@/lib/compare/pair";
import type { Side } from "@/lib/compare/relationship";
import type { Selection } from "@/lib/compare/selection";
import { CompareControls } from "./CompareControls";
import { CompareStage } from "./CompareStage";
import { PairedInstrument } from "./PairedInstrument";
import { RelationField } from "./RelationField";
import { TagMap } from "./TagMap";
import "./compare.css";

/**
 * THE COMPARE PAGE, in every state, from a resolved selection (ADR 0034;
 * handoff §10).
 *
 * Empty: the launcher — the substantive guidance the route passes in, and one
 * control. Left-only: one identity, an honest open right side, and the two
 * controls. Both: the accepted composition, in the accepted order —
 *
 *   1. the two identities and the paired radar at their seam;
 *   2. where they differ and where they meet — the relationship field;
 *   3. what they share and what is distinctive — the tag map;
 *   4. the eight dimensions, side by side — the paired instrument;
 *   5. Replace left, Replace right, Copy link.
 *
 * Notices — a self-pair, an unknown or unprofiled or ineligible identity, an
 * extra game — are printed before the composition and leave the valid
 * selection exactly where it was.
 *
 * Pure presentation: the route's client shell owns the address, and the
 * review harness renders this same component against labelled fixtures.
 */
export function CompareView({
  selection,
  index,
  onChoose,
  launcher,
}: {
  selection: Selection;
  index: CompareIndex;
  onChoose: (side: Side, slug: string) => void;
  /** The launcher's standalone guidance, rendered when nothing is selected. */
  launcher?: React.ReactNode;
}) {
  const { left, right, notices } = selection;
  const pair = left && right ? composePair(left, right) : null;

  return (
    <article
      className="cp"
      data-state={pair ? "pair" : left ? "left-only" : "empty"}
      style={
        {
          "--cp-left": left?.accent.lift ?? "var(--color-game-fallback-lift)",
          "--cp-right": right?.accent.lift ?? "var(--color-game-fallback-lift)",
          "--cp-ground": "var(--color-surface-stage)",
        } as React.CSSProperties
      }
    >
      <header className="cp-head">
        <div className="cp-measure">
          <p className="cp-kicker cp-head__kicker">Compare</p>
          <h1 className="sip-display cp-head__title">
            {pair ? (
              <>
                {left!.title}
                <span className="cp-head__and"> and </span>
                {right!.title}
              </>
            ) : (
              "Compare two Game Profiles"
            )}
          </h1>
          <p className="cp-head__lede">
            {pair
              ? "Two published Game Profiles on the same eight dimensions: differences and trade-offs, never a winner."
              : left
                ? `${left.title} is on the left. Choose the right game to see the two side by side.`
                : "Put two published Game Profiles side by side and read where they differ, where they meet, and what each asks of you. There is no winner and no overall score."}
          </p>
        </div>
      </header>

      {notices.length > 0 && (
        <div className="cp-measure">
          <ul className="cp-notices">
            {notices.map((notice, position) => (
              <li
                key={`${notice.kind}-${notice.slug}-${position}`}
                className="cp-notice"
                data-kind={notice.kind}
                role={notice.kind === "self" ? "alert" : undefined}
              >
                {notice.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {left ? (
        <CompareStage left={left} right={right} />
      ) : (
        <div className="cp-launch">
          <div className="cp-measure">{launcher}</div>
        </div>
      )}

      {pair && (
        <>
          <RelationField pair={pair} />
          <TagMap left={pair.left} right={pair.right} tags={pair.tags} />
          <PairedInstrument pair={pair} />
        </>
      )}

      <div className="cp-measure">
        <CompareControls selection={selection} index={index} onChoose={onChoose} />
      </div>
    </article>
  );
}
