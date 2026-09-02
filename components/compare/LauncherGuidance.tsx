import Link from "next/link";
import type { Route } from "next";
import type { CompareIndex } from "@/lib/compare";
import { comparePath } from "@/lib/compare/url";

/**
 * What the launcher says on its own — the substantive standalone guidance
 * that makes `/compare` indexable (ADR 0033).
 *
 * Every sentence is a rule the product already enforces or a game it already
 * publishes: what a comparison shows, how a relation is decided, what makes a
 * profile eligible, every eligible game with a real link, and how sharing
 * works. None of it is filler, and none of it is a promise about a pair. It
 * is server-rendered, so it is in the prerendered document before any script
 * runs, and it is what a pair address shows for the instant before the pair
 * is restored.
 */
export function LauncherGuidance({ index }: { index: CompareIndex }) {
  const count = index.profiles.length;
  return (
    <div className="cp-launch__guide">
      <section className="cp-launch__section" aria-labelledby="cp-launch-what">
        <h2 id="cp-launch-what" className="cp-kicker">
          What a comparison shows
        </h2>
        <p className="sip-prose">
          Two Game Profiles on the same eight dimensions, in the same fixed
          order, on the same 0–10 scale. Each row carries both exact values
          with their confidence, and states the relation between them in
          words. Above the rows: the clearest difference, the strongest
          alignment, and anything in either record that changes how the
          numbers should be read. Then the controlled experience tags the two
          share, and the ones distinctive to each.
        </p>
      </section>

      <section className="cp-launch__section" aria-labelledby="cp-launch-how">
        <h2 id="cp-launch-how" className="cp-kicker">
          How a relation is decided
        </h2>
        <dl className="cp-launch__rules">
          <div>
            <dt>Equal</dt>
            <dd>The two exact values are the same.</dd>
          </div>
          <div>
            <dt>Close</dt>
            <dd>The two exact values differ by half a point.</dd>
          </div>
          <div>
            <dt>Clear difference</dt>
            <dd>
              The two exact values differ by a point or more; the row names
              which game is higher on that one dimension.
            </dd>
          </div>
          <div>
            <dt>Indeterminate</dt>
            <dd>
              One value is published as a range or is not scored. A range is
              never collapsed to a midpoint to force a verdict.
            </dd>
          </div>
        </dl>
        <p className="sip-prose">
          Nothing is added up. There is no overall score, no average, no match
          percentage and no winner: a game that is higher on more rows is not
          a better game, only a different one.
        </p>
      </section>

      <section className="cp-launch__section" aria-labelledby="cp-launch-who">
        <h2 id="cp-launch-who" className="cp-kicker">
          What can be compared
        </h2>
        <p className="sip-prose">
          Any two published Game Profiles, each by its main profile. A game we
          recognise but have not profiled cannot be compared, because there is
          nothing to compare it with; the profiles of expansions, modes and
          other evaluated experiences of one game are not yet eligible.{" "}
          {count === 0
            ? "No profile is published in this build."
            : `${count} ${count === 1 ? "profile is" : "profiles are"} eligible today.`}
        </p>
        {count > 0 && (
          <ul className="cp-launch__list">
            {index.profiles.map((profile) => (
              <li key={profile.slug} className="cp-launch__item">
                <Link className="cp-link" href={profile.path as Route}>
                  {profile.title}
                </Link>
                <span className="cp-launch__meta">
                  {" · "}
                  {profile.developer}
                  {profile.year ? ` · ${profile.year}` : ""}
                </span>
                <Link className="cp-launch__start" href={comparePath(profile.slug)}>
                  Start with {profile.title} on the left
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cp-launch__section" aria-labelledby="cp-launch-share">
        <h2 id="cp-launch-share" className="cp-kicker">
          Sharing a comparison
        </h2>
        <p className="sip-prose">
          A comparison has an address that names both games in the order you
          chose them, so a shared link opens the same left and right. Replacing
          one game keeps the other where it is.
        </p>
      </section>
    </div>
  );
}
