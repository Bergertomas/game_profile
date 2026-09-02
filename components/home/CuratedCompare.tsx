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
 * ── The CTA goes only where a comparison exists ─────────────────────────────
 *
 * `/compare` exists (Slice 4), and its first release compares published
 * PRIMARY profiles only (ADR 0033, 2 September 2026 amendment). The page
 * supplies `compareRouteFor`, which answers the order-preserving pair address
 * for an eligible pair and null for one that names a sibling scope — and for
 * that pair the module says so instead of printing "See the full comparison"
 * over a route that would refuse it. The label is fixed as "See the full
 * comparison" (handoff §2.2; the prototype's "artwork-free" wording is
 * obsolete).
 */
export interface CuratedCompareProps {
  readonly pairs: readonly CuratedPairView[];
  /**
   * The Compare address for a pair, or null where the pair is not eligible
   * for Compare yet. Order is preserved by the caller: left stays left.
   */
  readonly compareRouteFor: (pair: CuratedPairView) => Route | null;
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

                <PairAction pair={pair} route={compareRouteFor(pair)} />
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * The accepted CTA, or the truthful reason there is none: Compare's first
 * release covers each game's main profile, so a pair naming an expansion or
 * mode has no page to open yet. Both Game Profiles are linked above either way.
 */
function PairAction({
  pair,
  route,
}: {
  pair: CuratedPairView;
  route: Route | null;
}) {
  if (!route) {
    return (
      <p className="sip-choosing__deferred">
        Compare covers each game&rsquo;s main profile for now, and this pairing
        names another evaluated experience, so there is no comparison page to
        open yet. Both Game Profiles are linked above.
      </p>
    );
  }
  return (
    <Link className="sip-choosing__cta" href={route}>
      See the full comparison
      <span className="sr-only">
        {" "}
        of {pair.left.game.canonicalTitle} and {pair.right.game.canonicalTitle}
      </span>
    </Link>
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
