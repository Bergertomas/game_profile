import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import {
  dimensionsInRadarOrder,
  RUBRIC_V1,
  SUBCRITERION_SCALE,
} from "@/lib/rubric";
import { formatScore } from "@/lib/scoring/derive";
import { methodologyGraph } from "@/lib/seo/structured-data";
import { absoluteUrl } from "@/lib/site";

const OG_DESCRIPTION =
  "Eight fixed dimensions, five subcriteria each, and no overall score. The published rubric every Game Profile is measured against.";

export const metadata: Metadata = {
  title: "How Game Profiles are scored",
  description:
    "The Game Profile methodology: eight fixed dimensions, five subcriteria each, 0–2 per subcriterion summed to a 0–10 total, and deliberately no overall score.",
  alternates: { canonical: "/methodology" },
  openGraph: {
    type: "article",
    url: absoluteUrl("/methodology"),
    title: "How Game Profiles are scored",
    description: OG_DESCRIPTION,
    // Declaring `openGraph` replaces the root object wholesale, so the
    // site-level card has to be named again rather than inherited.
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "How Game Profiles are scored",
    description: OG_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

/**
 * The methodology page renders itself from the typed rubric module, so it can
 * never drift from the scores it explains. Nothing here is hand-transcribed.
 */
export default function MethodologyPage() {
  const dimensions = dimensionsInRadarOrder();

  return (
    <div className="mx-auto w-full max-w-[46rem] px-5 py-12 sm:px-8 sm:py-16">
      <JsonLd data={methodologyGraph(RUBRIC_V1.version)} />
      <span className="sip-label text-ink-quiet">
        Scoring Rubric v{RUBRIC_V1.version} · locked {RUBRIC_V1.lockedAt}
      </span>
      <h1 className="sip-display mt-3 text-[2.25rem] sm:text-[3rem]">
        How these profiles are scored
      </h1>

      <div className="sip-prose mt-8 space-y-5 text-[1.0625rem] text-ink-soft">
        <p>
          Every game is assessed against the same eight dimensions. Each
          dimension has five subcriteria, and each subcriterion is scored{" "}
          <span className="sip-num text-ink">0, 0.5, 1, 1.5 or 2</span>. Those
          five values are summed to produce the dimension&rsquo;s 0–10 total.
          The total is derived, never typed in by hand, so a published number and
          its published reasoning cannot disagree.
        </p>
        <p className="border-l-2 border-ink pl-4 text-ink">
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
        <h2 id="scale-heading" className="sip-display text-[1.5rem]">
          The subcriterion scale
        </h2>
        <dl className="mt-4 divide-y divide-rule border-y border-rule">
          {SUBCRITERION_SCALE.map((step) => (
            <div key={step.value} className="flex gap-4 py-2.5">
              <dt className="sip-num w-10 shrink-0 text-right text-[0.9375rem] text-ink">
                {formatScore(step.value)}
              </dt>
              <dd className="text-[0.9375rem] text-ink-soft">{step.label}</dd>
            </div>
          ))}
        </dl>
        <p className="sip-prose mt-3 text-[0.9375rem] text-ink-quiet">
          Where evidence is genuinely insufficient, a subcriterion is marked
          unknown rather than guessed. One unknown publishes the dimension as a
          range; two or more and no total is published for it. Unknown is never
          treated as zero.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="dimensions-heading">
        <h2 id="dimensions-heading" className="sip-display text-[1.5rem]">
          The eight dimensions
        </h2>
        <p className="sip-prose mt-2 text-[0.9375rem] text-ink-quiet">
          Listed in the fixed order used by every radar and every score table on
          the site.
        </p>

        <ol className="mt-8 list-none space-y-10 p-0">
          {dimensions.map((dimension, index) => (
            <li key={dimension.key}>
              <div className="flex items-baseline gap-3 border-b border-rule pb-2">
                <span className="sip-num text-[0.9375rem] text-ink-quiet">
                  {index + 1}
                </span>
                <h3 className="sip-display text-[1.25rem]">{dimension.name}</h3>
              </div>
              <p className="sip-prose mt-3 text-[1.0625rem] text-ink">
                {dimension.coreQuestion}
              </p>
              <p className="sip-prose mt-2 text-[0.9375rem] text-ink-quiet">
                {dimension.boundary}
              </p>
              <ol className="mt-4 list-none space-y-2 p-0">
                {dimension.subcriteria.map((sub) => (
                  <li
                    key={sub.key}
                    className="grid grid-cols-[1.25rem_1fr] gap-x-3 text-[0.9375rem] leading-relaxed"
                  >
                    <span className="sip-num text-right text-ink-quiet">
                      {sub.displayOrder}
                    </span>
                    <span className="text-ink-soft">
                      <span className="text-ink">{sub.name}.</span>{" "}
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
        <h2 id="evidence-heading" className="sip-display text-[1.5rem]">
          Evidence states
        </h2>
        <dl className="mt-4 divide-y divide-rule border-y border-rule">
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
              <dt className="sip-label text-ink">{label}</dt>
              <dd className="sip-prose mt-1 text-[0.9375rem] text-ink-soft">
                {meaning}
              </dd>
            </div>
          ))}
        </dl>
        <p className="sip-prose mt-3 text-[0.9375rem] text-ink-quiet">
          Confidence — Low, Medium or High — is recorded separately. A status is
          not a score, and neither one is derived from the release date.
        </p>
      </section>
    </div>
  );
}
