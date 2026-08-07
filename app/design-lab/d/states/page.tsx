import { notFound } from "next/navigation";
import { DirectionD } from "@/components/design-lab/DirectionD";
import { LabStrip } from "@/components/design-lab/LabStrip";
import { alanWake2 } from "@/content";
import { buildProfileView } from "@/lib/profile/build";
import type { GameWithEvaluation } from "@/lib/profile/types";

export const metadata = { title: "Direction D — score-state proof" };

/**
 * Development-only proof that Direction D renders every score and confidence
 * state, not only the one the seed corpus happens to contain.
 *
 * The seeded profiles are all fully evidenced and post-release, so they exercise
 * exactly one of the four states. This harness forces the other three by marking
 * individual subcriteria `unknown` on a copy of the Alan Wake 2 fixture, and
 * spreads Low, Medium and High across the dimension confidences. Nothing here is
 * an editorial claim about Alan Wake 2 — it is a rendering fixture, and it says
 * so on the page.
 *
 * States covered:
 *   precise      Story 9.5, Atmosphere 10.0, Craft, Structure, Thematic
 *   range        Agency and Pacing — one unknown subcriterion each
 *   not scored   Execution — three unknown subcriteria
 *   confidence   Low, Medium and High all present, and deliberately not
 *                correlated with the score: Atmosphere is 10.0 at Low.
 *
 * The pre-release evidence status is set too, so the pre-release notice and the
 * "Looks promising if…" block headings are exercised rather than assumed.
 */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();

  const source = alanWake2.evaluation;

  const harness: GameWithEvaluation = {
    game: {
      ...alanWake2.game,
      canonicalTitle: "Score-state proof",
      developerText: "Rendering harness",
      publisherText: "Design lab",
    },
    evaluation: {
      ...source,
      evidenceStatus: "pre_release",
      evidenceMaturity: "hands_on",
      // Plan §9.2: a profile carrying an unscored dimension cannot be High.
      confidence: "medium",
      dimensionConfidence: {
        story: "high",
        thematic: "medium",
        atmosphere: "low",
        craft: "high",
        agency: "medium",
        execution: "low",
        structure: "high",
        pacing: "low",
      },
      oneLineExperience:
        "A rendering fixture, not a game profile. It exists to show how Direction D presents a precise score, a published range, a dimension with no publishable total, and Low, Medium and High confidence side by side.",
      dimensions: {
        ...source.dimensions,
        // One unknown -> published as a 2-point range.
        agency: {
          ...source.dimensions.agency,
          toolset_depth: { value: "unknown", rationale: "" },
        },
        pacing: {
          ...source.dimensions.pacing,
          runtime_justification: { value: "unknown", rationale: "" },
        },
        // Three unknown -> no total published; the polygon breaks at this axis.
        execution: {
          ...source.dimensions.execution,
          gameplay_execution: { value: "unknown", rationale: "" },
          technical_stability: { value: "unknown", rationale: "" },
          consistency: { value: "unknown", rationale: "" },
        },
      },
    },
  };

  return (
    <>
      <div className="border-b border-[#242a32] bg-[#0a0b0d] px-4 py-4 text-[#9a978f] sm:px-8">
        <p className="text-[0.75rem] uppercase text-[#ece7dd]">
          Development fixture — not an evaluation of any game
        </p>
        <p className="mt-1.5 max-w-3xl text-[0.8125rem] leading-relaxed">
          A copy of the Alan Wake 2 fixture with individual subcriteria forced to{" "}
          <em>unknown</em> so every published score state appears at once. Look
          for: <strong>Story 9.5</strong> precise · <strong>Agency</strong> and{" "}
          <strong>Pacing</strong> published as ranges, with a dotted reach on the
          radar and an open tick on the scale · <strong>Execution</strong> not
          scored, with a gap in the polygon and a dashed baseline rather than a
          zero · confidence spanning <strong>Low, Medium and High</strong>, set
          against scores it deliberately does not track —{" "}
          <strong>Atmosphere is 10.0 at Low confidence</strong>.
        </p>
      </div>
      <DirectionD profile={buildProfileView(harness)} />
      <LabStrip current="states" />
    </>
  );
}
