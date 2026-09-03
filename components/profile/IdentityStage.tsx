import { formatDate, formatYear } from "@/lib/format";
import type { ProfileArtwork } from "@/lib/profile/artwork";
import type { ProfileView } from "@/lib/profile/build";
import {
  CONFIDENCE_LABEL,
  EVIDENCE_STATUS_LABEL,
  PRE_RELEASE_NOTICE,
} from "@/lib/profile/vocabulary";
import { GRAPHITE_SKIN, ProfileRadar } from "./radar";
import { MARK } from "./radar-layout";
import { ScopeSwitcher, type ScopeLink } from "./ScopeSwitcher";

/**
 * THE IDENTITY STAGE — the top of the accepted A3–A6 composition (ADR 0032;
 * canonical frames A3–A6 in "Should I Play - Canonical Screens").
 *
 * One stage carries, in this order: the evidence kicker (status, confidence,
 * cut-off), one `h1`, developer and year, the full platform identities, the
 * exact scope/build line, the optional scope switcher, and the one-line
 * experience — the answer to "Should I play this?". On a wide screen all of
 * it sits in the lower band of the stage; on a phone the picture holds only
 * the kicker, title and byline and the rest follows in normal flow. The DOM
 * is the same at every width: nothing is repositioned out of reading order.
 *
 * ── Art-led and artless are the same header ─────────────────────────────────
 *
 * With cleared artwork the stage is the picture, bottom-anchored content and
 * the accepted dual scrim (from the left, and from the bottom). Without it
 * the stage is the authored typographic identity field the accepted A5/A6
 * screens draw: the game's accent as a spine and a wash, the title set
 * condensed, and the game's own profile shape as a quiet emblem. No image-
 * shaped hole is reserved, and the content is identical.
 *
 * The wash is painted under the artwork too, so a slow, blocked or failed
 * image resolves to the authored field rather than to an empty rectangle
 * (handoff §4.2). Artwork uses empty alt text and sits outside the
 * accessibility tree: the title beside it already names the game.
 *
 * ── What the kicker says, and what it does not ──────────────────────────────
 *
 * Verified/Provisional/Pre-release, overall confidence and the evidence
 * cut-off, in words. It does NOT say "Evaluated through": the public meaning
 * and data source of that label are an open decision (Master Plan §17.3, ADR
 * 0032), and the record's own term is used until it is resolved.
 */
export function IdentityStage({
  profile,
  artwork,
  scopes,
}: {
  profile: ProfileView;
  artwork: ProfileArtwork | null;
  scopes: readonly ScopeLink[];
}) {
  const { game, scope, evaluation } = profile;
  const status = evaluation.evidenceStatus;

  // Platforms covered by this evaluation, only where they differ from the
  // game's own list: the platform identities above already name them.
  const gameNames = game.platforms.map((p) => p.name);
  const evaluated = evaluation.scope.platforms;
  const platformsDiffer =
    evaluated.length !== gameNames.length ||
    evaluated.some((name) => !gameNames.includes(name));

  return (
    <header className="gp-identity">
      {artwork ? (
        <div className="gp-stage" aria-hidden="true">
          {/* A plain <img>, not next/image, and deliberately so. Optimising art
              we host is a later decision; wiring `images.remotePatterns` now
              would build a remote-image pipeline into production before there
              is a single cleared URL to put through it (ADR 0011). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artwork.url}
            alt=""
            width={artwork.width}
            height={artwork.height}
            style={{ objectPosition: artwork.objectPosition }}
          />
          <span className="gp-stage__scrim" />
        </div>
      ) : (
        <div className="gp-field" aria-hidden="true">
          {/* The game's own shape as emblem: the accepted artless identity
              field (A5/A6). Decorative — the instrument below states every
              value in text. */}
          <span className="gp-field__emblem">
            <ProfileRadar
              profile={profile}
              active={null}
              layout={MARK}
              skin={GRAPHITE_SKIN}
            />
          </span>
        </div>
      )}

      <div className="gp-identity__lead">
        <div className="gp-measure">
          <p className="gp-kicker gp-kicker--evidence gp-identity__kicker">
            Game Profile
            {!scope.isPrimary && <> · {scope.label}</>}
            {" · "}
            <span className="gp-identity__status" data-status={status}>
              {EVIDENCE_STATUS_LABEL[status]}
            </span>
            {" · "}
            {CONFIDENCE_LABEL[evaluation.confidence]} confidence
            {" · "}
            Evidence cut-off{" "}
            <span className="tabular">
              {formatDate(evaluation.evidenceCutoffAt)}
            </span>
          </p>
          <h1 className="gp-title">{game.canonicalTitle}</h1>
          <p className="gp-byline">
            {game.developerText} ·{" "}
            <span className="tabular">{formatYear(game.firstReleaseDate)}</span>
          </p>
        </div>
      </div>

      <div className="gp-identity__facts">
        <div className="gp-measure">
          <PlatformList platforms={game.platforms} />
          {/* The exact scope the numbers describe, in the structured voice
              (brief §9): an unscoped score is not a valid score (Rubric §1). */}
          <p className="gp-scope">
            <span className="sr-only">Scope: </span>
            {evaluation.scope.edition} · {evaluation.scope.mode} ·{" "}
            {evaluation.scope.buildOrPatch}
            {platformsDiffer && <> · Evaluated on {joinNames(evaluated)}</>}
          </p>
          <ScopeSwitcher scopes={scopes} gameTitle={game.canonicalTitle} />
          <h2 className="sr-only">Should I play this?</h2>
          <p className="sip-prose gp-answer">{evaluation.oneLineExperience}</p>
        </div>
      </div>
    </header>
  );
}

/**
 * Full platform names, as a list. No logos and no abbreviations: no approved
 * platform mark exists yet (Gate B brief §13), and "XSX" is exactly the label
 * the accepted screens refuse. When approved marks arrive they sit beside these
 * names as decoration; the names stay.
 */
function PlatformList({
  platforms,
}: {
  platforms: ProfileView["game"]["platforms"];
}) {
  if (platforms.length === 0) return null;
  return (
    <ul className="gp-platforms" aria-label="Platforms">
      {platforms.map((platform) => (
        <li key={platform.slug}>{platform.name}</li>
      ))}
    </ul>
  );
}

/**
 * Uncertainty is stated before the numbers are read, not filed at the foot of
 * the page. A provisional profile that looks identical to a verified one is
 * the failure mode (Rubric §13, matrix P-09). Words and a rule, never colour
 * alone; it follows the stage as an accent-ruled aside.
 */
export function StatusCaveat({ profile }: { profile: ProfileView }) {
  const status = profile.evaluation.evidenceStatus;
  if (status === "verified") return null;
  return (
    <div className="gp-measure">
      {status === "provisional" ? (
        <p className="gp-caveat" data-status="provisional">
          <strong>Provisional.</strong> Released, but the evidence is
          incomplete, conflicting or still changing. This profile will be
          reassessed.
        </p>
      ) : (
        <p className="gp-caveat" data-status="pre_release">
          <strong>Pre-release.</strong> {PRE_RELEASE_NOTICE}
        </p>
      )}
    </div>
  );
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
