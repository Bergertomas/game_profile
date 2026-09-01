import { formatDate, formatYear } from "@/lib/format";
import type { ProfileArtwork } from "@/lib/profile/artwork";
import type { ProfileView } from "@/lib/profile/build";
import {
  CONFIDENCE_LABEL,
  EVIDENCE_STATUS_LABEL,
  PRE_RELEASE_NOTICE,
} from "@/lib/profile/vocabulary";
import { ScopeSwitcher, type ScopeLink } from "./ScopeSwitcher";

/**
 * THE IDENTITY STAGE, and the scope and status line under it.
 *
 * This is the top of the accepted A3–A6 hierarchy (ADR 0032, handoff §8.1):
 * one `h1` with the game's identity, then the scope, build, platforms and
 * evidence state, all before the decision answer. A reader has to know WHICH
 * evaluated experience of which game they are reading before a single word of
 * judgement, because an unscoped score is not a valid score (Rubric §1).
 *
 * ── Art-led and artless are the same header ─────────────────────────────────
 *
 * The stage is one component with one DOM. With cleared artwork the header
 * paints the hero behind the identity plate and lifts the title into the lower
 * band of the picture over the lightest scrim that clears AA; on a phone the
 * picture is a compact strip above the plate so nothing is set over a face.
 * Without artwork there is no image and no reserved image-shaped hole: the
 * plate itself becomes the typographic identity field — the game's accent as
 * one wash, a spine rule, the title set large, and the same content in the
 * same order (handoff §8.1). Missing art is a rendering state, never missing
 * content, and the two states are asserted to carry identical text.
 *
 * Artwork uses empty alt text and sits outside the accessibility tree: the
 * title beside it already names the game, and a description of the picture
 * would be read before the title on every profile (handoff §4.2).
 *
 * ── What the status line says, and what it does not ────────────────────────
 *
 * Verified/Provisional/Pre-release, overall confidence and the evidence
 * cut-off, in words. It does NOT say "Evaluated": the public meaning and data
 * source of that label are an open decision (Master Plan §17.3, ADR 0032), and
 * silently mapping `evidence_cutoff_at` or `published_at` onto it would settle
 * the question by convenience. "Evidence cut-off" is the term the record
 * already carries and the trust band already uses.
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
  const { game, scope } = profile;

  return (
    <header className="gp-identity">
      {artwork && (
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
      )}

      <div className="gp-identity__plate">
        <div className="gp-measure">
          <p className="sip-note gp-identity__kicker">
            Game Profile
            {!scope.isPrimary && <> · {scope.label}</>}
          </p>
          <h1 className="sip-display gp-title">{game.canonicalTitle}</h1>
          <p className="gp-byline">
            {game.developerText} ·{" "}
            <span className="tabular">{formatYear(game.firstReleaseDate)}</span>
          </p>
          <PlatformList platforms={game.platforms} />
          <ScopeSwitcher scopes={scopes} gameTitle={game.canonicalTitle} />
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
 * Scope, build and evidence state, immediately under the identity and before
 * the answer. Structured information in the structured voice (brief §9): the
 * exact edition, mode and build the numbers describe, and the status and
 * confidence that say how much weight they carry. The platform warning
 * follows the answer it qualifies (see DecisionBand).
 */
export function ScopeStatus({ profile }: { profile: ProfileView }) {
  const { game, evaluation } = profile;
  const status = evaluation.evidenceStatus;

  // Platforms covered by this evaluation, only where they differ from the
  // game's own list: the identity above already names the platforms, and
  // repeating three names two lines apart says nothing.
  const gameNames = game.platforms.map((p) => p.name);
  const evaluated = evaluation.scope.platforms;
  const platformsDiffer =
    evaluated.length !== gameNames.length ||
    evaluated.some((name) => !gameNames.includes(name));

  return (
    <div className="gp-status">
      <div className="gp-measure">
        <dl className="gp-status__list">
          <div className="gp-status__item">
            <dt>Scope</dt>
            <dd>
              {evaluation.scope.edition} · {evaluation.scope.mode} ·{" "}
              {evaluation.scope.buildOrPatch}
              {platformsDiffer && <> · Evaluated on {joinNames(evaluated)}</>}
            </dd>
          </div>
          <div className="gp-status__item">
            <dt>Evidence</dt>
            <dd>
              <span className="gp-status__state" data-status={status}>
                {EVIDENCE_STATUS_LABEL[status]}
              </span>
              {" · "}
              {CONFIDENCE_LABEL[evaluation.confidence]} confidence
              {" · "}
              Evidence cut-off{" "}
              <span className="tabular">
                {formatDate(evaluation.evidenceCutoffAt)}
              </span>
            </dd>
          </div>
        </dl>

        {/* Uncertainty is stated before the numbers are read, not filed at the
            foot of the page. A provisional profile that looks identical to a
            verified one is the failure mode (Rubric §13, matrix P-09). */}
        {status === "provisional" && (
          <p className="gp-caveat" data-status="provisional">
            <strong>Provisional.</strong> Released, but the evidence is
            incomplete, conflicting or still changing. This profile will be
            reassessed.
          </p>
        )}
        {status === "pre_release" && (
          <p className="gp-caveat" data-status="pre_release">
            <strong>Pre-release.</strong> {PRE_RELEASE_NOTICE}
          </p>
        )}
      </div>
    </div>
  );
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
