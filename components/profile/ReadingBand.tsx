import { useId } from "react";
import type { ProfileView } from "@/lib/profile/build";
import {
  describeOverride,
  type PlatformProjection,
} from "@/lib/profile/platform";
import {
  BLOCK_ORDER,
  blockHeadings,
  CONFIDENCE_LABEL,
} from "@/lib/profile/vocabulary";

/**
 * THE WARM READING GROUND — the one paper surface on an otherwise dark
 * product (handoff §2.2 rule 2), after the instrument, in the order the
 * accepted A3–A6 screens set: who the game is for, then experience traits,
 * then the platform warning as an accent-ruled aside beside the scope detail.
 *
 * ── Who this is for ────────────────────────────────────────────────────────
 *
 * The three governed interpretation blocks, as lists, opening this ground —
 * where A3–A6 draw them. Their headings switch with the evidence state (SOP
 * §10.8): a pre-release profile says "Looks promising if…", never "Great fit
 * if…". The frames also carry a one-line summary of each block before the
 * instrument; the record holds nothing shorter than these lists, so that
 * position stays empty rather than carrying composed copy (drift G-02).
 *
 * ── Platform truth, where it changes the decision ───────────────────────────
 *
 * The evaluation-level warning is the accepted composition's aside here, and
 * the itemised record follows it: every subcriterion platform note and every
 * material override, named by dimension and subcriterion, with the base value
 * each override deviates from. None of it moves a total (ADR 0015); it is what
 * the total does not say. The exact row that varies also says so beside its
 * value, so the reader deciding between builds meets it at the number too.
 *
 * The column renders only where the record says something varies; a profile
 * with no platform variance shows no heading over nothing.
 *
 * ── Scope detail ────────────────────────────────────────────────────────────
 *
 * The scope's own summary of what it covers and excludes, where the editor
 * wrote one, and the structured scope facts beneath it. Nothing is composed
 * into prose the record does not carry.
 */
export function ReadingBand({
  profile,
  projection,
}: {
  profile: ProfileView;
  projection: PlatformProjection;
}) {
  const id = useId();
  const { evaluation, scope } = profile;
  const headings = blockHeadings(evaluation.evidenceStatus);
  const hasVariance =
    projection.notes.length > 0 || projection.overrides.length > 0;
  const hasPlatform = projection.warning !== null || hasVariance;

  return (
    <section className="gp-reading" aria-labelledby={`${id}-reading`}>
      <div className="gp-measure">
        <h2 id={`${id}-reading`} className="sr-only">
          Traits, platform and scope
        </h2>

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

        {profile.tags.length > 0 && (
          <div className="gp-traits-row">
            <h3 className="gp-kicker gp-kicker--paper gp-traits-row__label">
              Traits
            </h3>
            {/* Controlled experience tags with their intensity. Descriptive,
                never a quality signal: "horror" and "sustained tension" say
                what the game is like, not whether it is good at it. */}
            <ul className="gp-traits" aria-label="Experience traits">
              {profile.tags.map((tag) => (
                <li key={tag.definition.key} className="gp-trait">
                  <span className="gp-trait__label">
                    {tag.definition.label}
                  </span>
                  {tag.intensity && (
                    <span className="gp-trait__intensity">
                      {" "}
                      {tag.intensity}
                    </span>
                  )}
                  {tag.note && (
                    <span className="gp-trait__note"> — {tag.note}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="gp-reading__grid">
          {hasPlatform && (
            <section
              className="gp-reading__col"
              aria-labelledby={`${id}-platform`}
            >
              <h3 id={`${id}-platform`} className="gp-kicker gp-kicker--accent">
                {projection.warning ? "Platform warning" : "Platform and build"}
              </h3>
              {projection.warning && (
                <p className="sip-prose gp-warning">{projection.warning}</p>
              )}
              {hasVariance && (
                <>
                  <dl className="gp-variance">
                    {projection.notes.map((note) => (
                      <div
                        key={`note-${note.dimensionKey}-${note.subcriterionKey}`}
                        className="gp-variance__item"
                      >
                        <dt>
                          {note.dimensionName} · {note.subcriterionName}
                        </dt>
                        <dd>{note.note}</dd>
                      </div>
                    ))}
                    {projection.overrides.map((override) => (
                      <div
                        key={`override-${override.dimensionKey}-${override.subcriterionKey}-${override.platform.slug}`}
                        className="gp-variance__item"
                        data-override="true"
                      >
                        <dt>
                          {override.dimensionName} · {override.subcriterionName}
                        </dt>
                        <dd>
                          <strong>{describeOverride(override)}</strong>{" "}
                          {override.rationale}
                          {override.confidence && (
                            <>
                              {" "}
                              ({CONFIDENCE_LABEL[override.confidence]}{" "}
                              confidence.)
                            </>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="gp-variance__note">
                    Where the record says the reading varies by platform. The
                    published values are the base; none of this changes a total.
                  </p>
                </>
              )}
            </section>
          )}

          <section className="gp-reading__col" aria-labelledby={`${id}-scope`}>
            <h3 id={`${id}-scope`} className="gp-kicker gp-kicker--paper">
              Scope detail
            </h3>
            {scope.summary && (
              <p className="sip-prose gp-scope-detail">{scope.summary}</p>
            )}
            <p className="gp-scope-detail__facts">
              {evaluation.scope.edition} · {evaluation.scope.mode} ·{" "}
              {evaluation.scope.buildOrPatch}
            </p>
            <p className="gp-scope-detail__facts">
              Platforms covered: {evaluation.scope.platforms.join(", ")}
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
