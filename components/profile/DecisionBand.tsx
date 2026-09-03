import { useId } from "react";
import type { ProfileView } from "@/lib/profile/build";
import type { PracticalFacts } from "@/lib/profile/practical";
import { hasPracticalFacts } from "@/lib/profile/practical";

/**
 * THE DECISION, before the instrument.
 *
 * The accepted profile answers "Should I play this?" before it explains how the
 * answer was made (ADR 0032). The one-line experience sits in the identity
 * stage; this band is what follows it in the accepted A3–A6 order, on the
 * dark ground: the balanced pair the public calls the pull and the tax, then
 * — only where an approved record exists — what it asks of a reader's time,
 * then who it is for.
 *
 * ── The pull and the tax ────────────────────────────────────────────────────
 *
 * These are the public rendering of the governed Primary Pull and Primary Risk
 * fields (brief §5.1, handoff §8.2). Neither is a score. "The tax" is the
 * load-bearing friction a player must accept to get the pull; it is not a
 * penalty, and the two are set as equal columns so the page never reads as a
 * verdict with a footnote.
 *
 * ── Fit guidance is not here ────────────────────────────────────────────────
 *
 * A3–A6 draw the decision twice: a one-line summary of each fit block on this
 * dark ground, and the three full lists on the warm ground after the
 * instrument (`ReadingBand`). The record carries the lists and nothing
 * shorter, and a summary line composed from them would be new editorial
 * content nobody approved — so the lists render once, in the accepted
 * position for lists, and this ground carries no fit summary at all rather
 * than an invented one.
 */
export function DecisionBand({
  profile,
  practical,
}: {
  profile: ProfileView;
  practical: PracticalFacts;
}) {
  const id = useId();
  const { evaluation } = profile;

  return (
    <section className="gp-decision" aria-labelledby={`${id}-decision`}>
      <div className="gp-measure">
        <h2 id={`${id}-decision`} className="sr-only">
          The pull and the tax
        </h2>
        <div className="gp-pulltax">
          <div className="gp-pulltax__side">
            <h3 className="gp-kicker gp-kicker--pull">The pull</h3>
            <p className="sip-prose gp-pulltax__text">
              {evaluation.primaryPull}
            </p>
          </div>
          <div className="gp-pulltax__side gp-pulltax__side--tax">
            <h3 className="gp-kicker">The tax</h3>
            <p className="sip-prose gp-pulltax__text">
              {evaluation.primaryRisk}
            </p>
          </div>
        </div>

        <PracticalCommitment facts={practical} />
      </div>
    </section>
  );
}

/**
 * Total commitment and useful session, as separate facts in the accepted
 * ruled row under the pull/tax pair, where A3–A6 place it — and only when an
 * approved, scope-aware record says so.
 *
 * Practical time is outside the eight dimensions and never a ninth axis (ADR
 * 0027). Today no profile carries a record, so today this renders nothing:
 * not a placeholder, not a row of Unknowns implying a record was consulted,
 * and never the layout specimen the accepted screens were drawn with (ADR
 * 0032). When a record exists, its Unknown states are stated as the word
 * Unknown (handoff §4.1).
 */
export function PracticalCommitment({ facts }: { facts: PracticalFacts }) {
  const id = useId();
  if (!hasPracticalFacts(facts)) return null;

  const rows = [facts.commitment, facts.session, facts.interruption].filter(
    (fact) => fact !== null,
  );

  return (
    <aside className="gp-practical" aria-labelledby={`${id}-practical`}>
      <h3 id={`${id}-practical`} className="sr-only">
        Practical commitment
      </h3>
      <dl className="gp-practical__list">
        {rows.map((fact) => (
          <div
            key={fact.label}
            className="gp-practical__item"
            data-state={fact.state}
          >
            <dt className="gp-kicker">{fact.label}</dt>
            <dd>
              <span className="gp-practical__value">{fact.value}</span>
              {fact.detail && (
                <span className="gp-practical__detail">{fact.detail}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="gp-practical__note">
        Outside the eight dimensions. Time never changes a score.
      </p>
    </aside>
  );
}
