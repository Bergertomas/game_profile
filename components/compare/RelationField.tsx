import type { OpeningFact, PairRow, PairView } from "@/lib/compare/pair";
import { RELATIONSHIP_LABEL } from "@/lib/compare/relationship";
import { CONFIDENCE_LABEL } from "@/lib/profile/vocabulary";
import { PairScale } from "./PairScale";

/**
 * THE RELATIONSHIP FIELD: the first prose after identity, and the three
 * distinct structures the accepted direction asks for — the clearest
 * difference, the strongest alignment and the material caveat — before the
 * full instrument (ADR 0034; handoff §10.3; matrix C-06, C-07).
 *
 * ── Every word here is a fact the contracts already support ─────────────────
 *
 * The opening paragraph is the relation summary in the rubric's own dimension
 * names: which game is higher where, what is close, what is equal, what cannot
 * be compared. It names a trade-off because that is what the eight relations
 * are; it never names a winner because nothing here can produce one. No
 * editor has approved a sentence about this pair, so no such sentence is
 * written (ADR 0034: illustrative copy is provisional; P0.3).
 *
 * The three structures are not three identical cards: a Clear difference
 * shows separated endpoints and a long bridge, an Equal row shows converged
 * markers, and the caveat is a list with no bridge at all. Each states its
 * relation in words as well.
 */
export function RelationField({ pair }: { pair: PairView }) {
  return (
    <section className="cp-relations" aria-labelledby="cp-relations">
      <div className="cp-measure">
        <h2 id="cp-relations" className="cp-kicker">
          Where they differ, and where they meet
        </h2>
        <p className="cp-relations__frame">
          Differences and trade-offs — never a winner.
        </p>
        <p className="sip-prose cp-relations__summary">
          <Summary pair={pair} />
        </p>

        <div className="cp-facts-grid">
          {pair.difference && <Fact fact={pair.difference} pair={pair} />}
          {pair.alignment && <Fact fact={pair.alignment} pair={pair} />}
          <article className="cp-fact" data-relation="caveat">
            <h3 className="cp-fact__label">Read with care</h3>
            {pair.caveats.length > 0 ? (
              <ul className="cp-fact__caveats">
                {pair.caveats.map((caveat, index) => (
                  <li key={index} data-kind={caveat.kind}>
                    {caveat.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cp-fact__none">
                Nothing in either record changes how these values should be
                read: both profiles are Verified, the two confidences match on
                every dimension, and neither varies by platform.
              </p>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

/** The trade-off, as the relations state it. Empty groups are not mentioned. */
function Summary({ pair }: { pair: PairView }) {
  const { groups, left, right } = pair;
  const parts: string[] = [];
  if (groups.leftHigher.length > 0) {
    parts.push(`${left.title} is higher on ${names(groups.leftHigher)}`);
  }
  if (groups.rightHigher.length > 0) {
    parts.push(`${right.title} is higher on ${names(groups.rightHigher)}`);
  }
  if (groups.close.length > 0) {
    parts.push(`the two are close on ${names(groups.close)}`);
  }
  if (groups.equal.length > 0) {
    parts.push(`they are equal on ${names(groups.equal)}`);
  }
  if (groups.indeterminate.length > 0) {
    parts.push(
      `no exact difference is claimed on ${names(groups.indeterminate)}, where a value is a range or not scored`,
    );
  }
  if (parts.length === 0) return <>The two profiles carry no comparable values.</>;
  return <>{capitalise(parts.join("; "))}.</>;
}

function names(rows: readonly PairRow[]): string {
  const list = rows.map((row) => row.name);
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Fact({ fact, pair }: { fact: OpeningFact; pair: PairView }) {
  const { row } = fact;
  return (
    <article className="cp-fact" data-relation={row.relationship.kind}>
      <h3 className="cp-fact__label">{fact.label}</h3>
      <p className="cp-fact__dimension">{row.name}</p>
      <div className="cp-fact__pair">
        <Endpoint title={pair.left.title} dimension={row.left} side="left" />
        <Endpoint title={pair.right.title} dimension={row.right} side="right" />
      </div>
      <PairScale row={row} large />
      <p className="cp-fact__relation">
        <span className="cp-word" data-relation={row.relationship.kind}>
          {RELATIONSHIP_LABEL[row.relationship.kind]}
        </span>
        <span className="sr-only">. </span>
        <span className="cp-fact__sentence">{row.relationSentence}</span>
      </p>
    </article>
  );
}

function Endpoint({
  title,
  dimension,
  side,
}: {
  title: string;
  dimension: PairRow["left"];
  side: "left" | "right";
}) {
  return (
    <p className="cp-fact__end" data-side={side}>
      <span className="cp-fact__game">{title}</span>
      <span className="sip-num cp-fact__value">{dimension.display}</span>
      <span className="cp-fact__confidence">
        {CONFIDENCE_LABEL[dimension.confidence]} confidence
      </span>
    </p>
  );
}
