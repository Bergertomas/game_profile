import Link from "next/link";
import type { CSSProperties } from "react";
import { ArtworkImage } from "@/components/home/ArtworkImage";
import { ShapeFragment } from "@/components/home/ShapeFragment";
import { ProfileRadar } from "@/components/profile/radar";
import { MARK } from "@/components/profile/radar-layout";
import { SearchField } from "@/components/search/SearchField";
import { PRIMARY_SEARCH_ATTRIBUTE } from "@/lib/search/primary-field";
import { accentFor } from "@/lib/profile/accent";
import { coverArtworkFor, creditLineFor } from "@/lib/profile/artwork";
import type { ProfileView } from "@/lib/profile/build";
import { EVIDENCE_STATUS_LABEL } from "@/lib/profile/vocabulary";
import { profilePath } from "@/lib/site";
import "./home-opening.css";

/**
 * THE OPENING — the accepted A1/A2 Rev 5.1 composition (ADR 0030), measured
 * from the Fable **Should I Play - Canonical Screens** artifact.
 *
 * ── What the accepted composition is ───────────────────────────────────────
 *
 * Two parts, in this order at every width:
 *
 *  1. THE HERO. The proposition — "Should you play it?" with its lead — beside
 *     (desktop) or above (phone) a three-game artwork mosaic: one game at
 *     scale in the left column, two stacked beside it, every tile carrying its
 *     own integrated Game Profile fingerprint. 560×420 on the specimen, 360
 *     tall here so Search gains prominence (ADR 0030 owner refinement);
 *     390-wide × 250 on the phone.
 *  2. THE CONSOLE. A full-width panel under the hero carrying the journey
 *     switcher — Search / Compare / What should I play? as pills, Search
 *     selected — and, as the selected journey's panel, the Search field with
 *     its cyan Search action. Search is dominant by being the one thing on the
 *     page you can type into and the journey the console is already open on.
 *
 * At 390×667 the header, the whole hero and the Search field fit the first
 * viewport without a scroll (handoff §3.4, matrix H-01); artwork depth gives
 * way before text or Search ever does.
 *
 * ── Specimen facts that are not publication truth ──────────────────────────
 *
 * The artifact's commitment bands ("Substantial · 25–40 h"), its roster, its
 * dates and its artwork are illustrative (ADR 0030). Each tile shows only what
 * the published record carries: the title, the one-line experience where the
 * tile has room for it, and the evidence status. No band is fabricated.
 *
 * ── What is deliberately not here ──────────────────────────────────────────
 *
 * No ranking, no winner, no aggregate, no popularity, no trending, and no
 * controls for journeys that do not exist. Compare exists (Slice 4) and is a
 * real link to `/compare`; "What should I play?" is named as quiet text and
 * the console's footnote says why, because a pill that goes nowhere is worse
 * than an honest label.
 */

export interface HomeOpeningProps {
  readonly profiles: readonly ProfileView[];
}

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
      <div className="sip-open__hero">
        <div className="sip-open__lede">
          <p className="sip-note sip-open__eyebrow">Make the shape visible</p>

          <h1 id="opening" className="sip-display sip-open__headline">
            Should you play it?
          </h1>

          <p className="sip-open__lead">
            See the shape of the experience across eight dimensions — then
            decide whether it fits the way you play.
          </p>
          <p className="sip-open__sub">
            The pull, the tax and the trade-offs. No overall score.
          </p>
        </div>

        <Mosaic featured={featured} />
      </div>

      <div className="sip-open__console-wrap">
        <div className="sip-open__console">
          <Journeys />

          {/* The attribute is what `/` looks for anywhere on the site: with a
              field on the page, the key focuses it instead of opening the
              header dialog over the top of it. The index comes from the public
              layout's provider, so one copy is serialised per document. */}
          <div className="sip-open__search" {...{ [PRIMARY_SEARCH_ATTRIBUTE]: "" }}>
            <SearchField variant="inline" />
          </div>

          <p className="sip-open__foot">
            {profiles.length === 1
              ? "One published Game Profile"
              : `${profiles.length} published Game Profiles`}{" "}
            · a miss answers honestly. Compare opens on its own page;{" "}
            <em>What should I play?</em> is not built yet, so it is named, not
            offered.
          </p>
        </div>

        {/* Preview builds only: the rights notice for review-clearance art in
            the mosaic (ADR 0012). After the console, so an accountability line
            never displaces the composition it annotates. */}
        {notice && <p className="sip-open__rights">{creditLineFor(notice)}</p>}
      </div>
    </section>
  );
}

/** The exact journey labels, in their accepted rank order (handoff §5.2). */
const JOURNEYS = ["Search", "Compare", "What should I play?"] as const;

/**
 * The journey switcher: three pills, named exactly, ranked by form.
 *
 * Search is the filled pill — where you are — and the field below is its
 * panel. Compare is an outlined pill and a real link, because `/compare` is a
 * real page (Slice 4); it stays a link rather than a tab because it opens its
 * own journey rather than switching this region (handoff §5.2 makes the
 * tablist conditional on exactly that). "What should I play?" is quiet text in
 * the same rhythm with no boundary, because there is nothing behind it yet and
 * a control that responds to a click by doing nothing teaches a visitor that
 * the product is a mock-up.
 */
function Journeys() {
  return (
    <ul className="sip-open__paths">
      {JOURNEYS.map((label) => (
        <li
          key={label}
          className={`sip-open__path${label === "Search" ? " is-current" : ""}${
            label === "What should I play?" ? " is-unbuilt" : ""
          }`}
        >
          {label === "Compare" ? (
            <Link className="sip-open__pill sip-open__pill--link" href="/compare">
              Compare
            </Link>
          ) : (
            <span className="sip-open__pill">{label}</span>
          )}
          {label === "Search" && (
            <span className="sr-only"> — the journey shown here</span>
          )}
        </li>
      ))}
    </ul>
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
 * that is nowhere on production: the typographic territory — the game's accent
 * as a wash and its own outline drawn faint and large — is the shipped state,
 * not a fallback waiting to be replaced. A mixed row of covers and territories
 * is the normal, designed condition of this catalogue, and neither state
 * outranks the other.
 */
function Mosaic({ featured }: { featured: readonly ProfileView[] }) {
  if (featured.length === 0) return null;

  return (
    <div className="sip-open__mosaic">
      <ul className="sip-open__tiles">
        {featured.map((profile, position) => (
          <Tile key={profile.game.slug + profile.scope.key} profile={profile} lead={position === 0} />
        ))}
      </ul>

      <p className="sip-open__caption">
        {/* A2's caption, at every width: short enough to hold two lines at
            390 in any Chromium build, which is what keeps the console's
            field inside a 667px first viewport. */}
        Eight-dimension Game Profiles · fixed 0–10 — a bigger shape is not
        better.
      </p>
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
          "--sip-radar-ground": "var(--color-surface-stage)",
        } as CSSProperties
      }
    >
      <div className="sip-open__art">
        {/* The territory is always under the artwork rather than an alternative
            to it, so `cleared`, `loading`, `failed` and `absent` all resolve to
            the same authored composition instead of to an empty black
            rectangle (handoff §4.2). */}
        <span className="sip-open__sleeve" aria-hidden="true" />
        <ShapeFragment profile={profile} className="sip-open__fragment" />
        {cover && (
          /* Leaves the document if it cannot load, so the territory beneath is
             the picture and no broken-image glyph is painted (handoff §4.2). */
          <ArtworkImage
            src={cover.url}
            width={cover.width}
            height={cover.height}
            objectPosition={cover.objectPosition}
          />
        )}
        <span className="sip-open__scrim" aria-hidden="true" />
      </div>

      {/* The plate: text on the left, the integrated fingerprint on the right,
          both on the tile's bottom edge, as the accepted tiles are composed. */}
      <div className="sip-open__plate">
        <div className="sip-open__words">
          <h2 className="sip-open__title">
            <Link href={profilePath(game.slug, profile.scope)}>
              {game.canonicalTitle}
              <span className="sr-only"> — read the Game Profile</span>
            </Link>
          </h2>
          {/* The one-line experience only where the tile has room to set it
              without crowding the fingerprint; the smaller tiles are the game,
              its status and its shape. The sentence is one click away. */}
          {lead && <p className="sip-open__line">{evaluation.oneLineExperience}</p>}
          <p className="sip-open__status">
            <span className="sip-open__evidence">
              {EVIDENCE_STATUS_LABEL[evaluation.evidenceStatus]}
            </span>
            {!profile.scope.isPrimary && <> · {profile.scope.label}</>}
          </p>
        </div>

        <div className="sip-open__fingerprint">
          <ProfileRadar
            profile={profile}
            active={null}
            layout={MARK}
            skin={FINGERPRINT_SKIN}
          />
        </div>
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
  grid: "rgba(242,241,238,0.24)",
  gridOuter: "rgba(242,241,238,0.48)",
  fill: "var(--sip-accent-lift)",
  fillOpacity: 0.28,
  stroke: "var(--sip-accent-lift)",
  vertex: "var(--sip-accent-lift)",
  vertexEdge: "var(--color-surface-stage)",
  reach: "var(--color-text-muted)",
  label: "var(--color-text-quiet)",
  value: "var(--color-text-primary)",
  activeLabel: "var(--color-text-primary)",
  activeValue: "var(--sip-accent-lift)",
  activeMark: "var(--color-text-primary)",
} as const;
