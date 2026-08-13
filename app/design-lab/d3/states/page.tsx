import { notFound } from "next/navigation";
import { GameProfile } from "@/components/profile/GameProfile";
import { heroArtworkFor } from "@/lib/profile/artwork";
import { buildProfileView } from "@/lib/profile/build";
import { scoreStateFixture } from "@/lib/design-lab/score-states";
import { DESIGN_SURFACES_ENABLED } from "@/lib/site";

export const metadata = { title: "D3 — score-state proof" };

/**
 * Development-only proof that D3 renders every published score state, not only
 * the exact values the seed corpus happens to contain.
 *
 * It renders the PRODUCTION component, so this proves the shipped code rather
 * than a lab copy of it. The equivalent artless proof lives at
 * /dev/radar-states; this one is the same states carrying key art, which is the
 * only thing production cannot show.
 *
 * Uses the same fixture as Direction D's proof
 * (lib/design-lab/score-states.ts), so the two directions are measured against
 * identical data rather than each choosing a flattering one.
 *
 * What D3 does with each state, in both the radar and the rows:
 *
 *   exact       Vertex at the value; solid rule to an accent tick on the ruler;
 *               the number itself in the row.
 *   range       Vertex at the confirmed floor, a dotted spur out to the ceiling
 *               closed by an open register mark; on the ruler, solid to the
 *               floor then dotted to an open tick; the row reads "7.0–9.0".
 *   not scored  No vertex at all and a dashed bridge across the gap; a dashed
 *               ruler baseline with no reading; the row reads "Not scored".
 *
 * Unknown is never plotted at the centre, because zero is a different and much
 * stronger claim than "we do not know" (Rubric §22). There is no fourth
 * representation: every state is one of these three.
 */
export default function Page() {
  // Site environment, not NODE_ENV: the layout above uses the same gate, and
  // a Cloudflare branch preview must show this proof. See lib/site.ts.
  if (!DESIGN_SURFACES_ENABLED) notFound();

  const harness = scoreStateFixture("D3");

  return (
    <>
      <div className="border-b border-[#242a32] bg-[#0a0b0d] px-4 py-4 text-[#9a978f] sm:px-8">
        <p className="text-[0.75rem] uppercase text-[#ece7dd]">
          Development fixture — not an evaluation of any game
        </p>
        <p className="mt-1.5 max-w-3xl text-[0.8125rem] leading-relaxed">
          A copy of the Alan Wake 2 fixture with individual subcriteria forced to{" "}
          <em>unknown</em>, so every published score state appears at once. Look
          for: <strong>Story 9.5</strong> exact · <strong>Agency</strong> and{" "}
          <strong>Pacing</strong> as ranges, with a dotted reach to an open
          register mark on the radar and an open tick on the ruler ·{" "}
          <strong>Execution</strong> not scored, with no vertex, a dashed bridge
          across the polygon and a dashed ruler baseline rather than a zero ·
          confidence spanning <strong>Low, Medium and High</strong>, deliberately
          uncorrelated with the scores — <strong>Atmosphere is 10.0 at Low</strong>.
          Open any row for how the derivation reads in each state.
        </p>
      </div>
      <GameProfile
        profile={buildProfileView(harness)}
        artwork={heroArtworkFor(harness.game)}
      />
    </>
  );
}
