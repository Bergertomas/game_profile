import { notFound } from "next/navigation";
import { GameCard } from "@/components/GameCard";
import { GameProfile } from "@/components/profile/GameProfile";
import { alanWake2 } from "@/content";
import { buildProfileView } from "@/lib/profile/build";
import { heroArtworkFor } from "@/lib/profile/artwork";
import type { GameWithEvaluation } from "@/lib/profile/types";
import { DESIGN_SURFACES_ENABLED } from "@/lib/site";

/**
 * Review harness for the profile states the seed corpus does not contain.
 *
 * These paths are unit-tested in tests/scoring.test.ts, but the rules about how
 * they *look* — "unknown must not collapse to zero", "a range must be visibly
 * distinct from a precise value" — can only be checked by looking at them.
 *
 * It renders the CANONICAL components, not a harness-only panel. It used to
 * render a second profile implementation with its own radar, which meant the
 * one surface built to prove the uncertainty states was the one surface not
 * showing the code that ships them. Both states are now exercised on the real
 * page and on the real card.
 */
export default function RadarStatesPage() {
  // Site environment, not NODE_ENV: a Cloudflare branch preview is a
  // production-mode build of a non-production site. See lib/site.ts.
  if (!DESIGN_SURFACES_ENABLED) notFound();

  const withUnknowns: GameWithEvaluation = {
    game: { ...alanWake2.game, canonicalTitle: "Unknown-handling harness" },
    scope: alanWake2.scope,
    evaluation: {
      ...alanWake2.evaluation,
      evidenceStatus: "pre_release",
      evidenceMaturity: "hands_on",
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
    <>
      <div className="mx-auto w-full max-w-[74rem] px-5 py-10 sm:px-8">
        <h1 className="sip-display text-[1.75rem]">
          Radar states — unknown &amp; range
        </h1>
        <p className="sip-prose mt-2 max-w-[46rem] text-[0.9375rem] text-ink-soft">
          Pacing has one unknown subcriterion and is published as a range with a
          dashed reach to its ceiling. Agency has three unknown and publishes no
          total. Execution has two unknown. Unknown axes are omitted from the
          outline and bridged with a dashed segment — never plotted at zero.
        </p>

        <h2 className="sip-label mt-8 text-ink-quiet">
          The same profile as a card, with no cover art
        </h2>
        <div className="mt-4 max-w-[20rem]">
          <GameCard profile={profile} />
        </div>
      </div>

      <div className="mt-10">
        <GameProfile
          profile={profile}
          artwork={heroArtworkFor(profile.game)}
        />
      </div>
    </>
  );
}
