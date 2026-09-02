import type { PairRow } from "@/lib/compare/pair";

/**
 * The paired 0–10 reading: one hairline scale, the left game's value as a
 * square, the right game's as a ring, and a bridge between them only when the
 * relation is truthful. Equal converges the two markers on one point; Close
 * draws a short bridge; Clear difference a long one. A Range draws its dotted
 * reach to the ceiling; Not scored draws no marker at all — never a mark at
 * zero.
 *
 * Decorative: the relation is written in words beside it and spoken in the
 * row's reading order. Neither rightward nor larger means better here, and
 * the bridge carries no arrowhead for exactly that reason.
 */
export function PairScale({ row, large = false }: { row: PairRow; large?: boolean }) {
  const kind = row.relationship.kind;
  const left = position(row.left.score);
  const right = position(row.right.score);
  const bridged = kind !== "indeterminate" && left !== null && right !== null;

  return (
    <span
      className={`cp-scale${large ? " cp-scale--large" : ""}`}
      data-relation={kind}
      aria-hidden="true"
    >
      {bridged && (
        <span
          className="cp-scale__bridge"
          style={{
            left: `${Math.min(left, right)}%`,
            width: `${Math.abs(left - right)}%`,
          }}
        />
      )}
      <Reach score={row.left.score} side="left" />
      <Reach score={row.right.score} side="right" />
      {left !== null && (
        <span className="cp-scale__mark" data-side="left" style={{ left: `${left}%` }} />
      )}
      {right !== null && (
        <span className="cp-scale__mark" data-side="right" style={{ left: `${right}%` }} />
      )}
    </span>
  );
}

function position(score: PairRow["left"]["score"]): number | null {
  if (score.kind === "insufficient") return null;
  const value = score.kind === "exact" ? score.score : score.low;
  return (value / 10) * 100;
}

function Reach({
  score,
  side,
}: {
  score: PairRow["left"]["score"];
  side: "left" | "right";
}) {
  if (score.kind !== "range") return null;
  return (
    <span
      className="cp-scale__reach"
      data-side={side}
      style={{
        left: `${(score.low / 10) * 100}%`,
        width: `${((score.high - score.low) / 10) * 100}%`,
      }}
    />
  );
}
