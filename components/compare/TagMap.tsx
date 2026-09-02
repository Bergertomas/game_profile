import type { CompareProfile } from "@/lib/compare";
import { INTENSITY_LABEL, type CompareTag, type SharedTag, type TagComparison } from "@/lib/compare/tags";

/**
 * THE CANONICAL TAG MAP: Shared, left-only, right-only (ADR 0034; handoff
 * §10.4; matrix C-08).
 *
 * Three groups, each headed in words with the game or the word "Shared", each
 * bounded by a different edge — a double rule for shared, a solid rule for the
 * left game, a dashed rule for the right — so the grouping survives without
 * colour. Intensities are written; a shared tag whose two intensities differ
 * writes both, one per game. There is no count, no percentage and no verdict:
 * shared does not mean better and distinctive does not mean worse.
 */
export function TagMap({
  left,
  right,
  tags,
}: {
  left: CompareProfile;
  right: CompareProfile;
  tags: TagComparison;
}) {
  return (
    <section className="cp-tags" aria-labelledby="cp-tags">
      <div className="cp-measure">
        <h2 id="cp-tags" className="cp-kicker">
          What they share, and what is distinctive
        </h2>
        <p className="cp-tags__note">
          Controlled experience tags, compared by their canonical key. They
          describe what a player must like or tolerate; sharing one is not a
          point in anyone&rsquo;s favour.
        </p>
        <div className="cp-tags__grid">
          <Group heading={`${left.title} only`} group="left">
            {tags.leftOnly.length > 0 ? (
              <ul className="cp-tags__list">
                {tags.leftOnly.map((tag) => (
                  <Single key={tag.key} tag={tag} />
                ))}
              </ul>
            ) : (
              <p className="cp-tags__empty">No tag is unique to {left.title}.</p>
            )}
          </Group>
          <Group heading="Shared" group="shared">
            {tags.shared.length > 0 ? (
              <ul className="cp-tags__list">
                {tags.shared.map((tag) => (
                  <Shared key={tag.key} tag={tag} left={left} right={right} />
                ))}
              </ul>
            ) : (
              <p className="cp-tags__empty">No shared tags.</p>
            )}
          </Group>
          <Group heading={`${right.title} only`} group="right">
            {tags.rightOnly.length > 0 ? (
              <ul className="cp-tags__list">
                {tags.rightOnly.map((tag) => (
                  <Single key={tag.key} tag={tag} />
                ))}
              </ul>
            ) : (
              <p className="cp-tags__empty">No tag is unique to {right.title}.</p>
            )}
          </Group>
        </div>
      </div>
    </section>
  );
}

function Group({
  heading,
  group,
  children,
}: {
  heading: string;
  group: "left" | "shared" | "right";
  children: React.ReactNode;
}) {
  return (
    <div className="cp-tags__group" data-group={group}>
      <h3 className="cp-tags__heading">{heading}</h3>
      {children}
    </div>
  );
}

function Single({ tag }: { tag: CompareTag }) {
  return (
    <li className="cp-tag">
      <span className="cp-tag__label">{tag.label}</span>
      {tag.intensity && (
        <span className="cp-tag__intensity"> · {INTENSITY_LABEL[tag.intensity]}</span>
      )}
      {tag.note && <span className="cp-tag__note"> · {tag.note}</span>}
    </li>
  );
}

function Shared({
  tag,
  left,
  right,
}: {
  tag: SharedTag;
  left: CompareProfile;
  right: CompareProfile;
}) {
  const sameIntensity =
    tag.left.intensity && tag.right.intensity && !tag.intensitiesDiffer;
  return (
    <li className="cp-tag" data-differs={tag.intensitiesDiffer || undefined}>
      <span className="cp-tag__label">{tag.label}</span>
      {sameIntensity && (
        <span className="cp-tag__intensity"> · {INTENSITY_LABEL[tag.left.intensity!]}</span>
      )}
      {tag.intensitiesDiffer && (
        <span className="cp-tag__intensity">
          {" · "}
          {left.title} {INTENSITY_LABEL[tag.left.intensity!]}
          {" · "}
          {right.title} {INTENSITY_LABEL[tag.right.intensity!]}
        </span>
      )}
      {tag.left.note && (
        <span className="cp-tag__note"> · {left.title}: {tag.left.note}</span>
      )}
      {tag.right.note && (
        <span className="cp-tag__note"> · {right.title}: {tag.right.note}</span>
      )}
    </li>
  );
}
