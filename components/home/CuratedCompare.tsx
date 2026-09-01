import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties } from "react";
import { ProfileRadar } from "@/components/profile/radar";
import { MARK } from "@/components/profile/radar-layout";
import type { CuratedPairView } from "@/lib/home/curated-compare";
import { accentFor } from "@/lib/profile/accent";
import type { ProfileView } from "@/lib/profile/build";
import { profilePath } from "@/lib/site";
import "./home-sections.css";

/**
 * "CHOOSING BETWEEN…" — the secondary curated module.
 *
 * Secondary is a product decision, not a layout one: Compare never becomes the
 * default homepage subject (ADR 0030), so this sits after the rail and the
 * shelves and is quieter than both.
 *
 * ── The two things it publishes ────────────────────────────────────────────
 *
 * Two named identities, and one authored sentence naming the decision between
 * them. There is no winner, no aggregate, no computed match percentage, no
 * overlap count and no "most compared" — and there is no hidden one either:
 * this component performs no arithmetic on any score at all. Each side carries
 * its own fingerprint as decoration over its own written shape description, so
 * nothing is said by polygon or colour alone.
 *
 * ── The CTA is deferred, and says so ───────────────────────────────────────
 *
 * `/compare` is Slice 4 and does not exist. Two failures were available here
 * and both are refused: linking to it anyway publishes a broken route, and
 * writing "See the full comparison" as inert text implies a destination the
 * product does not have. So when the caller supplies no route, the module
 * states plainly that full Compare is not built and leaves the reader with the
 * two profile links, which are real. When Slice 4 lands, the page passes
 * `compareRouteFor` and the accepted label appears with no change here — the
 * label is fixed as "See the full comparison" (handoff §2.2; the prototype's
 * "artwork-free" wording is obsolete).
 */
export interface CuratedCompareProps {
  readonly pairs: readonly CuratedPairView[];
  /**
   * Destination for a pair, or omitted while full Compare does not exist.
   * Order is preserved by the caller: left stays left.
   */
  readonly compareRouteFor?: (pair: CuratedPairView) => Route;
}

export function CuratedCompare({ pairs, compareRouteFor }: CuratedCompareProps) {
  if (pairs.length === 0) return null;

  return (
    <section className="sip-choosing" aria-labelledby="choosing-between">
      <div className="sip-choosing__inner">
        <h2
          id="choosing-between"
          className="sip-display sip-display--section sip-choosing__heading"
        >
          Choosing between&#8230;
        </h2>
        <p className="sip-choosing__note">
          A small number of decisions worth putting side by side. Editor-chosen,
          never ranked, and never a winner.
        </p>

        <ul className="sip-choosing__list">
          {pairs.map((pair) => (
            <li key={pair.id} className="sip-choosing__entry">
              <article>
                <h3 className="sip-choosing__pair-title">
                  {pair.left.game.canonicalTitle}
                  <span className="sip-choosing__or"> or </span>
                  {pair.right.game.canonicalTitle}
                </h3>

                <div className="sip-choosing__pair">
                  <Identity profile={pair.left} />
                  <Identity profile={pair.right} />
                </div>

                <p className="sip-prose sip-choosing__tension">{pair.tension}</p>
                {pair.context && (
                  <p className="sip-choosing__context">{pair.context}</p>
                )}

                {compareRouteFor ? (
                  <Link
                    className="sip-choosing__cta"
                    href={compareRouteFor(pair)}
                  >
                    See the full comparison
                    <span className="sr-only">
                      {" "}
                      of {pair.left.game.canonicalTitle} and{" "}
                      {pair.right.game.canonicalTitle}
                    </span>
                  </Link>
                ) : (
                  <p className="sip-choosing__deferred">
                    Full Compare is not built yet, so there is no comparison
                    page to open. Both Game Profiles are linked above.
                  </p>
                )}
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * One side of a pair: the game's name as a real link to its canonical profile,
 * its fingerprint, and its shape written out. Both sides use identical markup
 * and identical weight — neither position means "better".
 */
function Identity({ profile }: { profile: ProfileView }) {
  const accent = accentFor(profile.game.slug);

  return (
    <div
      className="sip-choosing__side"
      style={
        {
          "--sip-accent-lift": accent.lift,
          "--sip-radar-ground": "var(--color-surface-panel)",
        } as CSSProperties
      }
    >
      <div className="sip-choosing__mark">
        <ProfileRadar
          profile={profile}
          active={null}
          layout={MARK}
          skin={PAIR_MARK_SKIN}
        />
      </div>
      <p className="sip-choosing__name">
        <Link href={profilePath(profile.game.slug, profile.scope)}>
          {profile.game.canonicalTitle}
          <span className="sr-only"> — read the Game Profile</span>
        </Link>
      </p>
      <p className="sip-choosing__line">
        {profile.evaluation.oneLineExperience}
      </p>
      <span className="sr-only">{profile.shapeDescription}</span>
    </div>
  );
}

const PAIR_MARK_SKIN = {
  grid: "rgba(242,241,238,0.22)",
  gridOuter: "rgba(242,241,238,0.44)",
  fill: "var(--sip-accent-lift)",
  fillOpacity: 0.3,
  stroke: "var(--sip-accent-lift)",
  vertex: "var(--sip-accent-lift)",
  vertexEdge: "var(--color-surface-panel)",
  reach: "var(--color-text-muted)",
  label: "var(--color-text-quiet)",
  value: "var(--color-text-primary)",
  activeLabel: "var(--color-text-primary)",
  activeValue: "var(--sip-accent-lift)",
  activeMark: "var(--color-text-primary)",
} as const;
