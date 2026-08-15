import { notFound } from "next/navigation";
import { DirectionD } from "@/components/design-lab/DirectionD";
import { LabStrip } from "@/components/design-lab/LabStrip";
import { buildProfileView } from "@/lib/profile/build";
import { scoreStateFixture } from "@/lib/design-lab/score-states";
import { DESIGN_SURFACES_ENABLED } from "@/lib/site";

export const metadata = { title: "Direction D — score-state proof" };

/**
 * Development-only proof that Direction D renders every score and confidence
 * state, not only the one the seed corpus happens to contain.
 *
 * The fixture itself lives in lib/design-lab/score-states.ts and is shared with
 * D3's proof, so both directions are measured against identical data.
 */
export default function Page() {
  // Site environment, not NODE_ENV: the layout above uses the same gate, and
  // a Cloudflare branch preview must show this proof. See lib/site.ts.
  if (!DESIGN_SURFACES_ENABLED) notFound();

  const harness = scoreStateFixture("Direction D");

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
