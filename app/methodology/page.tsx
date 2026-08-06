import type { Metadata } from "next";
import {
  dimensionsInRadarOrder,
  RUBRIC_V1,
  SUBCRITERION_SCALE,
} from "@/lib/rubric";
import { formatScore } from "@/lib/scoring/derive";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How Game Profile scores games: eight dimensions, five subcriteria each, 0–2 per subcriterion, and no overall score.",
};

/**
 * The methodology page renders itself from the typed rubric module, so it can
 * never drift from the scores it explains. Nothing here is hand-transcribed.
 */
export default function MethodologyPage() {
  const dimensions = dimensionsInRadarOrder();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <span className="label-micro text-bone-faint">
        Scoring Rubric v{RUBRIC_V1.version} · locked {RUBRIC_V1.lockedAt}
      </span>
      <h1 className="display mt-3 text-[2rem] leading-tight text-bone sm:text-[2.75rem]">
        How these profiles are scored
      </h1>

      <div className="mt-8 space-y-5 text-base leading-relaxed text-bone-dim">
        <p>
          Every game is assessed against the same eight dimensions. Each
          dimension has five subcriteria, and each subcriterion is scored{" "}
          <span className="tabular text-bone">0, 0.5, 1, 1.5 or 2</span>. Those
          five values are summed to produce the dimension&rsquo;s 0–10 total.
          The total is derived, never typed in by hand, so a published number and
          its published reasoning cannot disagree.
        </p>
        <p className="border-l-2 border-brass pl-4 text-bone">
          There is no overall Game Profile score. We do not average the eight
          dimensions, and the area of the radar polygon is not a rating. Two
          games with identical averages can be entirely different purchases —
          that is the whole reason this product exists.
        </p>
        <p>
          A score measures the strength and extent of that dimension&rsquo;s
          offering, not universal goodness. A survival sandbox with little
          authored story is not a worse game for scoring low on Story &amp;
          Character Investment; it is a different game, and the profile is there
          to tell you which.
        </p>
      </div>

      <section className="mt-12" aria-labelledby="scale-heading">
        <h2 id="scale-heading" className="display text-xl text-bone">
          The subcriterion scale
        </h2>
        <dl className="mt-4 divide-y divide-line border-y border-line">
          {SUBCRITERION_SCALE.map((step) => (
            <div key={step.value} className="flex gap-4 py-2.5">
              <dt className="tabular w-10 shrink-0 text-right text-sm font-semibold text-brass">
                {formatScore(step.value)}
              </dt>
              <dd className="text-[0.875rem] text-bone-dim">{step.label}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-bone-faint">
          Where evidence is genuinely insufficient, a subcriterion is marked
          unknown rather than guessed. One unknown publishes the dimension as a
          range; two or more and no total is published for it. Unknown is never
          treated as zero.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="dimensions-heading">
        <h2 id="dimensions-heading" className="display text-xl text-bone">
          The eight dimensions
        </h2>
        <p className="mt-2 text-[0.8125rem] text-bone-dim">
          Listed in the fixed order used by every radar and every score table on
          the site.
        </p>

        <ol className="mt-6 space-y-8">
          {dimensions.map((dimension, index) => (
            <li key={dimension.key}>
              <div className="flex items-baseline gap-3 border-b border-line pb-2">
                <span className="tabular text-sm text-bone-faint">
                  {index + 1}
                </span>
                <h3 className="display text-lg text-bone">{dimension.name}</h3>
              </div>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-bone">
                {dimension.coreQuestion}
              </p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-bone-faint">
                {dimension.boundary}
              </p>
              <ol className="mt-4 space-y-2">
                {dimension.subcriteria.map((sub) => (
                  <li
                    key={sub.key}
                    className="grid grid-cols-[1.25rem_1fr] gap-x-3 text-[0.8125rem] leading-relaxed"
                  >
                    <span className="tabular text-right text-bone-faint">
                      {sub.displayOrder}
                    </span>
                    <span className="text-bone-dim">
                      <span className="text-bone">{sub.name}.</span>{" "}
                      {sub.description}
                    </span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12" aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className="display text-xl text-bone">
          Evidence states
        </h2>
        <dl className="mt-4 divide-y divide-line border-y border-line">
          {[
            [
              "Verified",
              "Substantial post-release evidence, and the profile is reasonably stable.",
            ],
            [
              "Provisional",
              "Released, but the evidence is incomplete or conflicting, or the product is still changing quickly.",
            ],
            [
              "Pre-release",
              "Not yet fully available. Preview, demo or first-party evidence only, with conservative scoring and lower confidence.",
            ],
          ].map(([label, meaning]) => (
            <div key={label} className="py-3">
              <dt className="label-micro text-bone">{label}</dt>
              <dd className="mt-1 text-[0.875rem] leading-relaxed text-bone-dim">
                {meaning}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-bone-faint">
          Confidence — Low, Medium or High — is recorded separately. A status is
          not a score, and neither one is derived from the release date.
        </p>
      </section>
    </div>
  );
}
