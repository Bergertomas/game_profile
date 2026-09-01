import Link from "next/link";
import type { CSSProperties } from "react";
import { ProfileRadar } from "@/components/profile/radar";
import { MARK } from "@/components/profile/radar-layout";
import { SearchField } from "@/components/search/SearchField";
import { PRIMARY_SEARCH_ATTRIBUTE } from "@/lib/search/primary-field";
import { accentFor } from "@/lib/profile/accent";
import { coverArtworkFor, creditLineFor } from "@/lib/profile/artwork";
import type { ProfileView } from "@/lib/profile/build";
import { profilePath } from "@/lib/site";
import "./home-opening.css";

/**
 * THE OPENING. Decision first, artwork in support.
 *
 * ── What the composition is arguing ────────────────────────────────────────
 *
 * "Should you play it?" is the product's question, so it is the page's first
 * line — not a description of a methodology, and not a feature list. Under it
 * sits the one journey that is built, as an open field rather than a link,
 * because form is what ranks the three paths: a field is not a link, and a link
 * is not a question. Search is dominant here by being the only thing on the
 * page you can type into.
 *
 * The artwork is the second argument and never the first. Three real profiles,
 * each carrying its own eight-axis fingerprint, establish in one glance that
 * this is a product about videogames AND that it measures them — which is the
 * whole proposition, made visible rather than claimed. The full-height featured
 * hero was explored and refused; this is the compact composition that replaced
 * it, and it sits BESIDE the decision interface on a wide screen and BELOW it
 * on a narrow one so the field is reachable at 390×667 without scrolling past
 * a picture.
 *
 * ── What is deliberately not here ──────────────────────────────────────────
 *
 * No ranking, no winner, no aggregate, no popularity, no trending, and no
 * controls for journeys that do not exist. Compare and "What should I play?"
 * are named — they are real, accepted, and next — but they are named as text,
 * because a button that goes nowhere is worse than an honest label.
 */

export interface HomeOpeningProps {
  readonly profiles: readonly ProfileView[];
}

/** The exact journey labels, in their accepted rank order. */
const JOURNEYS = ["Search", "Compare", "What should I play?"] as const;

export function HomeOpening({ profiles }: HomeOpeningProps) {
  // Three, and only from what the catalogue actually publishes. Primary scopes
  // first: a mosaic tile is an invitation to a game, and a game's canonical
  // address is the one to invite somebody to.
  const featured = [...profiles]
    .sort((a, b) => Number(b.scope.isPrimary) - Number(a.scope.isPrimary))
    .slice(0, 3);

  const cleared = featured
    .map((profile) => coverArtworkFor(profile.game))
    .filter((artwork) => artwork !== null);
  const notice = cleared.find((artwork) => artwork.clearance !== "production");

  return (
    <section className="sip-open" aria-labelledby="opening">
      <div className="sip-open__grid">
        <div className="sip-open__lede">
          <p className="sip-note sip-open__eyebrow">Make the shape visible</p>

          <h1 id="opening" className="sip-display sip-open__headline">
            Should you play it?
          </h1>

          <p className="sip-prose sip-open__lead">
            See the shape of the experience across eight dimensions — then
            decide whether it fits the way you play.
          </p>
          <p className="sip-prose sip-open__sub">
            The pull, the tax and the trade-offs. No overall score.
          </p>

          {/* The attribute is what `/` looks for anywhere on the site: with a
              field on the page, the key focuses it instead of opening the
              header dialog over the top of it. */}
          <div className="sip-open__search" {...{ [PRIMARY_SEARCH_ATTRIBUTE]: "" }}>
            {/* The index comes from the public layout's provider, so one copy
                is serialised per document rather than one per field. */}
            <SearchField variant="inline" />
          </div>

          <Journeys />
        </div>

        <Mosaic featured={featured} notice={notice ? creditLineFor(notice) : null} />
      </div>
    </section>
  );
}

/**
 * The three paths, named exactly, ranked by form.
 *
 * Search is marked as where you are; the other two are text and say so. They
 * are not tabs, not buttons and not links, because there is nothing behind them
 * yet — and a control that responds to a click by doing nothing teaches a
 * visitor that the product is a mock-up. Naming them costs nothing and is true:
 * both are accepted work and neither is built.
 */
function Journeys() {
  return (
    <div className="sip-open__journeys">
      <ul className="sip-open__paths">
        {JOURNEYS.map((label) => (
          <li
            key={label}
            className={`sip-label sip-open__path${
              label === "Search" ? " is-current" : ""
            }`}
          >
            {label}
            {label === "Search" && (
              <span className="sr-only"> — the journey shown here</span>
            )}
          </li>
        ))}
      </ul>
      <p className="sip-open__paths-note">
        Search is the one you can use today. Compare and{" "}
        <em>What should I play?</em> are the next two journeys and are not built
        yet, so they are named here rather than offered as controls.
      </p>
    </div>
  );
}

/**
 * Three profiles, three fingerprints.
 *
 * Every tile is a real published profile at its real address, and every tile
 * states its own values in text — the polygon is `aria-hidden` and the sentence
 * beside it carries the same claim. Nothing on this page is communicated by
 * shape or colour alone.
 *
 * Artwork appears only where clearance data permits it (ADR 0011), and today
 * that is nowhere on production: the typographic sleeve is the shipped state,
 * not a fallback waiting to be replaced. A mixed row of covers and sleeves is
 * the normal, designed condition of this catalogue, and neither state outranks
 * the other.
 */
function Mosaic({
  featured,
  notice,
}: {
  featured: readonly ProfileView[];
  notice: string | null;
}) {
  if (featured.length === 0) return null;

  return (
    <div className="sip-open__mosaic">
      <ul className="sip-open__tiles">
        {featured.map((profile, position) => (
          <Tile key={profile.game.slug + profile.scope.key} profile={profile} lead={position === 0} />
        ))}
      </ul>

      <p className="sip-open__caption">
        {featured.length === 1
          ? "One published Game Profile"
          : `${featured.length} independent Game Profiles`}{" "}
        — eight dimensions on a fixed 0–10 scale. Each shape is one game, and a
        bigger shape is not a better game.
      </p>

      {notice && <p className="sip-open__rights">{notice}</p>}
    </div>
  );
}

function Tile({ profile, lead }: { profile: ProfileView; lead: boolean }) {
  const { game, evaluation } = profile;
  const cover = coverArtworkFor(game);
  const accent = accentFor(game.slug);

  return (
    <li
      className={`sip-open__tile${lead ? " is-lead" : ""}${
        cover ? "" : " is-artless"
      }`}
      style={
        {
          "--sip-accent-lift": accent.lift,
          "--sip-radar-ground": "var(--color-stage)",
        } as CSSProperties
      }
    >
      <div className="sip-open__art">
        {/* The sleeve is always under the artwork rather than an alternative to
            it, so `cleared`, `loading`, `failed` and `absent` all resolve to the
            same authored composition instead of to an empty black rectangle
            (handoff §4.2). */}
        <span className="sip-open__sleeve" aria-hidden="true" />
        {cover && (
          /* A plain <img>, for the reason GameCard gives: optimising art hosted
             by somebody else would need a remotePatterns entry that would ship
             to production and outlive its reason (ADR 0011). */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cover.url}
            alt={cover.alt}
            width={cover.width}
            height={cover.height}
            style={{ objectPosition: cover.objectPosition }}
          />
        )}
        <span className="sip-open__scrim" aria-hidden="true" />
      </div>

      <div className="sip-open__plate">
        <h2 className="sip-open__title">
          <Link href={profilePath(game.slug, profile.scope)}>
            {game.canonicalTitle}
            <span className="sr-only"> — read the Game Profile</span>
          </Link>
        </h2>
        <p className="sip-open__line">{evaluation.oneLineExperience}</p>
        <p className="sip-note sip-open__cue">Game Profile · 8 dimensions · 0–10</p>
      </div>

      <div className="sip-open__fingerprint">
        <ProfileRadar
          profile={profile}
          active={null}
          layout={MARK}
          skin={FINGERPRINT_SKIN}
        />
      </div>

      {/* The words are the instrument. Same sentence the card and the profile
          page use, generated by the same function. */}
      <span className="sr-only">{profile.shapeDescription}</span>
    </li>
  );
}

/**
 * The fingerprint's skin on the cinema ground.
 *
 * The same grammar as every other radar in the product — grid drawn over the
 * fill, light fill, vertex markers — at mosaic scale. The accent is the game's
 * own identity and never its quality.
 */
const FINGERPRINT_SKIN = {
  grid: "rgba(237,235,231,0.24)",
  gridOuter: "rgba(237,235,231,0.48)",
  fill: "var(--sip-accent-lift)",
  fillOpacity: 0.32,
  stroke: "var(--sip-accent-lift)",
  vertex: "var(--sip-accent-lift)",
  vertexEdge: "var(--color-cinema)",
  reach: "var(--color-bone-soft)",
  label: "var(--color-bone-quiet)",
  value: "var(--color-bone)",
  activeLabel: "var(--color-bone)",
  activeValue: "var(--sip-accent-lift)",
  activeMark: "var(--color-bone)",
} as const;
