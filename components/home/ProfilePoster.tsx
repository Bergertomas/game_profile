import Link from "next/link";
import type { CSSProperties } from "react";
import { ArtworkImage } from "@/components/home/ArtworkImage";
import { PosterPreview } from "@/components/home/PosterPreview";
import { ShapeFragment } from "@/components/home/ShapeFragment";
import { ProfileRadar } from "@/components/profile/radar";
import { MARK } from "@/components/profile/radar-layout";
import { formatYear } from "@/lib/format";
import { accentFor } from "@/lib/profile/accent";
import { coverArtworkFor } from "@/lib/profile/artwork";
import type { ProfileView } from "@/lib/profile/build";
import { EVIDENCE_STATUS_LABEL } from "@/lib/profile/vocabulary";
import { profilePath } from "@/lib/site";

/**
 * ONE POSTER ON A RAIL.
 *
 * A poster is a game first: its artwork, its name, and one control that says
 * more. It carries exactly one canonical destination — the profile at its
 * canonical address — and one optional disclosure beside it, never nested
 * inside it.
 *
 * ── Art-led and artless are the same component ─────────────────────────────
 *
 * Production publishes no cleared artwork today (ADR 0011), so every poster the
 * public site renders is the authored territory, and that is a designed edition
 * rather than a hole: the game's own accent as a wash with a spine, its own
 * eight-axis outline drawn faint and large across it (ShapeFragment), and the
 * same frame, the same plate and the same controls as a poster carrying key
 * art. Neither state outranks the other and a mixed rail is the normal
 * condition of this catalogue. Nothing is fabricated to fill the frame.
 *
 * ── What the preview may say ───────────────────────────────────────────────
 *
 * Only fields the published evaluation already carries: the one-line
 * experience, the primary pull and the primary risk — the same three the
 * profile page publishes, under the same labels. No commitment band, no
 * session length, no store claim, no score summary and no invented copy. If a
 * fact has no approved record it is absent, not guessed.
 *
 * The fingerprint is decorative here and says so: the eight exact values are a
 * click away on the profile the title links to, which is the precision
 * equivalent the handoff requires (§7.1). The rail's non-visual reading of the
 * shape is still present as text, as it is on every other surface.
 */
export function ProfilePoster({ profile }: { profile: ProfileView }) {
  const { game, evaluation } = profile;
  const cover = coverArtworkFor(game);
  const accent = accentFor(game.slug);

  return (
    <li
      className={`sip-poster${cover ? "" : " is-artless"}`}
      style={
        {
          "--sip-accent-lift": accent.lift,
          "--sip-radar-ground": "var(--color-surface-stage)",
        } as CSSProperties
      }
    >
      <article className="sip-poster__card">
        <div className="sip-poster__art">
          {/* The sleeve is ALWAYS under the artwork, not an alternative to it.
              `cleared`, `loading`, `failed` and `absent` then resolve to the
              same authored composition instead of to an empty black rectangle:
              a frame waiting for a slow image shows the game's own identity,
              and one whose image never arrives keeps it (handoff §4.2). */}
          <span className="sip-poster__sleeve" aria-hidden="true" />
          <ShapeFragment profile={profile} className="sip-poster__fragment" />
          {cover && (
            /* Leaves the document if it cannot load, so the territory beneath
               is the picture and no broken-image glyph is painted (handoff
               §4.2). Lazy: the rail may hold many posters. */
            <ArtworkImage
              src={cover.url}
              width={cover.width}
              height={cover.height}
              objectPosition={cover.objectPosition}
              loading="lazy"
            />
          )}
          <span className="sip-poster__scrim" aria-hidden="true" />
          <div className="sip-poster__mark">
            <ProfileRadar
              profile={profile}
              active={null}
              layout={MARK}
              skin={POSTER_MARK_SKIN}
            />
          </div>
        </div>

        <div className="sip-poster__plate">
          <h3 className="sip-poster__title">
            <Link href={profilePath(game.slug, profile.scope)}>
              {game.canonicalTitle}
              <span className="sr-only"> — read the Game Profile</span>
            </Link>
          </h3>
          <p className="sip-poster__meta">
            {game.developerText} ·{" "}
            <span className="tabular">{formatYear(game.firstReleaseDate)}</span>
            {evaluation.evidenceStatus !== "verified" && (
              <> · {EVIDENCE_STATUS_LABEL[evaluation.evidenceStatus]}</>
            )}
            {!profile.scope.isPrimary && <> · {profile.scope.label}</>}
          </p>
        </div>
      </article>

      <PosterPreview title={game.canonicalTitle}>
        <dl className="sip-poster__facts">
          <div>
            <dt>What it is</dt>
            <dd>{evaluation.oneLineExperience}</dd>
          </div>
          <div>
            <dt>Primary pull</dt>
            <dd>{evaluation.primaryPull}</dd>
          </div>
          <div>
            <dt>Primary risk</dt>
            <dd>{evaluation.primaryRisk}</dd>
          </div>
        </dl>
      </PosterPreview>

      {/* The text equivalent of the mark: distribution, never a rating, and the
          same sentence the card and the profile page use. */}
      <span className="sr-only">{profile.shapeDescription}</span>
    </li>
  );
}

/**
 * The mark's skin on the poster's cinema ground — the same grammar as every
 * other radar in the product, at poster scale. The accent is the game's
 * identity and never its quality.
 */
const POSTER_MARK_SKIN = {
  grid: "rgba(242,241,238,0.24)",
  gridOuter: "rgba(242,241,238,0.48)",
  fill: "var(--sip-accent-lift)",
  fillOpacity: 0.32,
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
