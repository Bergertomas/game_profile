import { useId } from "react";
import type { ProfileView } from "@/lib/profile/build";
import {
  describeOverride,
  type PlatformProjection,
} from "@/lib/profile/platform";
import { CONFIDENCE_LABEL } from "@/lib/profile/vocabulary";

/**
 * Platform detail and experience traits: the structured detail that follows
 * the instrument in the accepted order (brief §6.1 items 7–8).
 *
 * ── Platform and build ──────────────────────────────────────────────────────
 *
 * The status line at the top of the page carries the evaluation-level warning
 * beside the platform facts it qualifies. This section is the itemised record
 * behind it: every subcriterion platform note and every material override,
 * named by dimension and subcriterion, with the base value each override
 * deviates from. It renders only where the record says something varies; a
 * profile with no platform variance shows no heading over nothing.
 *
 * None of it moves a total (ADR 0015). It is what the total does not say.
 */
export function PlatformDetail({
  projection,
}: {
  projection: PlatformProjection;
}) {
  const id = useId();
  if (projection.notes.length === 0 && projection.overrides.length === 0) {
    return null;
  }

  return (
    <section className="gp-detail__section" aria-labelledby={`${id}-platform`}>
      <h2 id={`${id}-platform`} className="gp-kicker">
        Platform and build
      </h2>
      <p className="gp-detail__intro">
        Where the record says the reading varies by platform. The published
        values are the base; none of this changes a total.
      </p>
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
              <strong>{describeOverride(override)}</strong> {override.rationale}
              {override.confidence && (
                <> ({CONFIDENCE_LABEL[override.confidence]} confidence.)</>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Controlled experience tags with their intensity. Descriptive, never a
 * quality signal: "horror" and "sustained tension" say what the game is like,
 * not whether it is good at it.
 */
export function ExperienceTraits({ profile }: { profile: ProfileView }) {
  const id = useId();
  if (profile.tags.length === 0) return null;

  return (
    <section className="gp-detail__section" aria-labelledby={`${id}-traits`}>
      <h2 id={`${id}-traits`} className="gp-kicker">
        Experience traits
      </h2>
      <ul className="gp-traits">
        {profile.tags.map((tag) => (
          <li key={tag.definition.key} className="gp-trait">
            <span className="gp-trait__label">{tag.definition.label}</span>
            {tag.intensity && (
              <span className="gp-trait__intensity"> {tag.intensity}</span>
            )}
            {tag.note && <span className="gp-trait__note"> — {tag.note}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
