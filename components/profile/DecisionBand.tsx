import { useId } from "react";
import type { ProfileView } from "@/lib/profile/build";
import type { PracticalFacts } from "@/lib/profile/practical";
import { hasPracticalFacts } from "@/lib/profile/practical";
import { BLOCK_ORDER, blockHeadings } from "@/lib/profile/vocabulary";

/**
 * THE DECISION, before the instrument.
 *
 * The accepted profile answers "Should I play this?" before it explains how the
 * answer was made (ADR 0032). The one-line experience sits in the identity
 * stage; this band is what follows it, on the dark ground, in the governed
 * order (handoff §8.1): the balanced pair the public calls the pull and the
 * tax, then who it is for, then — only where an approved record exists —
 * what it asks of a reader's time.
 *
 * ── The pull and the tax ────────────────────────────────────────────────────
 *
 * These are the public rendering of the governed Primary Pull and Primary Risk
 * fields (brief §5.1, handoff §8.2). Neither is a score. "The tax" is the
 * load-bearing friction a player must accept to get the pull; it is not a
 * penalty, and the two are set as equal columns so the page never reads as a
 * verdict with a footnote.
 *
 * ── Who this is for ────────────────────────────────────────────────────────
 *
 * The three governed interpretation blocks, in the semantic position handoff
 * §8.1 fixes: fit guidance (5) before practical commitment (6) and the
 * instrument (7). A3–A6 instead draw a one-line summary of each block here
 * and the full lists on the warm ground after the instrument; the governing
 * record owns semantic order, so the lists render once, here (drift G-02,
 * G-04). Their headings switch with the evidence state (SOP §10.8): a
 * pre-release profile says "Looks promising if…", never "Great fit if…". No
 * summary line is composed from the lists — that would be editorial content
 * nobody approved.
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
  const headings = blockHeadings(evaluation.evidenceStatus);

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

        <div className="gp-fit">
          <h3 id={`${id}-fit`} className="sr-only">
            Who this is for
          </h3>
          <div className="gp-fit__blocks" aria-labelledby={`${id}-fit`}>
            {BLOCK_ORDER.map((type) => (
              <div key={type} className="gp-fit__block" data-block={type}>
                <h4 className="gp-kicker gp-fit__heading">
                  {headings[type].title}
                </h4>
                <ul className="gp-fit__list">
                  {evaluation.blocks[type].map((item) => (
                    <li key={item} className="sip-prose">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <PracticalCommitment facts={practical} />
      </div>
    </section>
  );
}

/**
 * Total commitment and useful session, as separate facts in the accepted
 * ruled row after the fit blocks, where handoff §8.1 places it — and only when
 * an approved, scope-aware record says so.
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
