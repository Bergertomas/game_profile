import { notFound } from "next/navigation";
import { ProfilePanel } from "@/components/ProfilePanel";
import { alanWake2 } from "@/content";
import { buildProfileView } from "@/lib/profile/build";
import type { GameWithEvaluation } from "@/lib/profile/types";

/**
 * Development-only harness for the profile states the seed corpus does not
 * contain: a dimension published as a range (one unknown subcriterion) and a
 * dimension with no published total (two or more unknown).
 *
 * These paths are unit-tested in tests/scoring.test.ts, but the rules about how
 * they *look* — "unknown must not collapse to zero", "use a gap or dashed
 * uncertainty treatment" — can only be checked by looking at them.
 */
export default function RadarStatesPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const withUnknowns: GameWithEvaluation = {
    game: { ...alanWake2.game, canonicalTitle: "Unknown-handling harness" },
    evaluation: {
      ...alanWake2.evaluation,
      evidenceStatus: "pre_release",
      confidence: "low",
      dimensions: {
        ...alanWake2.evaluation.dimensions,
        // One unknown -> published as a range.
        pacing: {
          ...alanWake2.evaluation.dimensions.pacing,
          runtime_justification: {
            value: "unknown",
            rationale: "",
          },
        },
        // Three unknown -> no total published; the polygon breaks at this axis.
        agency: {
          ...alanWake2.evaluation.dimensions.agency,
          toolset_depth: { value: "unknown", rationale: "" },
          reward_rhythm: { value: "unknown", rationale: "" },
          capability_balance: { value: "unknown", rationale: "" },
        },
        // Two adjacent unknown axes, to check the dashed bridge spans correctly.
        execution: {
          ...alanWake2.evaluation.dimensions.execution,
          gameplay_execution: { value: "unknown", rationale: "" },
          technical_stability: { value: "unknown", rationale: "" },
        },
      },
    },
  };

  const profile = buildProfileView(withUnknowns);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="display text-2xl text-bone">
        Radar states — unknown &amp; range
      </h1>
      <p className="mt-2 max-w-2xl text-[0.8125rem] leading-relaxed text-bone-dim">
        Pacing has one unknown subcriterion and is published as a range with a
        dashed reach to its ceiling. Agency has three unknown and publishes no
        total. Execution has two unknown. Unknown axes are omitted from the
        outline and bridged with a dashed segment — never plotted at zero.
      </p>
      <div className="mt-10">
        <ProfilePanel profile={profile} />
      </div>
    </div>
  );
}
