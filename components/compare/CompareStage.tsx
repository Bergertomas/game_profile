import Link from "next/link";
import type { Route } from "next";
import type { CompareProfile } from "@/lib/compare";
import { formatDate } from "@/lib/format";
import { CONFIDENCE_LABEL, EVIDENCE_STATUS_LABEL } from "@/lib/profile/vocabulary";
import { Fingerprint, PairedRadar } from "./PairedRadar";

/**
 * THE IDENTITY STAGE: two equal territories and the paired radar at their seam
 * (ADR 0034 C1–C4; handoff §10.2; matrix C-03, C-04, C-05).
 *
 * ── One DOM for every artwork state ─────────────────────────────────────────
 *
 * The visual strip comes first and is `aria-hidden` throughout: two artwork
 * fields and the radar over the seam. Each field ALWAYS paints its game's
 * accent wash and fingerprint under the image, so `cleared`, `loading`,
 * `failed` and `absent` resolve to the same authored territory rather than to
 * an empty rectangle, a broken-image glyph or an apology (handoff §4.2). With
 * one side cleared and the other not, both fields keep the same height: the
 * typographic territory has equal weight, and neither reads as the chosen game.
 *
 * Then the two identities, left before right, in words: title, developer,
 * full platform names, scope, evidence state, the profile's own one-line
 * experience, and a real link to the Game Profile. Artwork is decorative
 * because these name the game (matrix C-03).
 *
 * The legend follows both identities and says, in text, which shape is
 * which and that a larger shape is not a better game.
 */
export function CompareStage({
  left,
  right,
}: {
  left: CompareProfile;
  right: CompareProfile | null;
}) {
  const art =
    left.artwork && right?.artwork
      ? "both"
      : left.artwork
        ? "left"
        : right?.artwork
          ? "right"
          : "none";

  return (
    <section className="cp-stage" data-art={art} aria-label="The two games">
      <div className="cp-art" aria-hidden="true">
        <ArtField profile={left} side="left" />
        {right ? (
          <ArtField profile={right} side="right" />
        ) : (
          <div className="cp-art__field cp-art__field--open" data-side="right">
            <span className="cp-art__wash" />
          </div>
        )}
        {right && (
          <div className="cp-seam">
            <PairedRadar left={left} right={right} />
          </div>
        )}
      </div>

      <Identity profile={left} side="left" />
      {right ? (
        <Identity profile={right} side="right" />
      ) : (
        <div className="cp-identity cp-identity--open" data-side="right">
          <p className="cp-kicker">Right</p>
          <p className="cp-identity__open">
            No second game yet. Choose one below to set the comparison; {left.title} stays on the left.
          </p>
        </div>
      )}

      {right && (
        <div className="cp-legend">
          <p className="cp-legend__item" data-side="left">
            <span className="cp-swatch" data-side="left" aria-hidden="true" />
            {left.title}
            <span className="sr-only"> — solid outline, square markers</span>
          </p>
          <p className="cp-legend__item" data-side="right">
            <span className="cp-swatch" data-side="right" aria-hidden="true" />
            {right.title}
            <span className="sr-only"> — dashed outline, round markers</span>
          </p>
          <p className="cp-legend__note">
            Two shapes on the same eight axes and the same 0–10 scale. A larger
            shape is not a better game, and nothing is added up; the exact
            values are in the rows below.
          </p>
        </div>
      )}
    </section>
  );
}

function ArtField({
  profile,
  side,
}: {
  profile: CompareProfile;
  side: "left" | "right";
}) {
  return (
    <div className="cp-art__field" data-side={side}>
      <span className="cp-art__wash" />
      <Fingerprint points={profile.radar} side={side} />
      {profile.artwork && (
        /* A plain <img>, for the reason every other surface gives: art we do
           not host is not put through an image pipeline before a single URL
           is cleared (ADR 0011). Empty alt: the identity beside it names the
           game. `color: transparent` in the stylesheet hides a browser's
           broken-image glyph, so a failed load shows the territory beneath. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={profile.artwork.url}
          alt=""
          width={profile.artwork.width}
          height={profile.artwork.height}
          style={{ objectPosition: profile.artwork.objectPosition }}
        />
      )}
      <span className="cp-art__scrim" />
    </div>
  );
}

function Identity({
  profile,
  side,
}: {
  profile: CompareProfile;
  side: "left" | "right";
}) {
  const { evidence } = profile;
  return (
    <div className="cp-identity" data-side={side}>
      <p className="cp-kicker">
        {side === "left" ? "Left" : "Right"} · Game Profile
      </p>
      <h2 className="sip-display cp-title">{profile.title}</h2>
      <p className="cp-byline">
        {profile.developer}
        {profile.year && (
          <>
            {" · "}
            <span className="tabular">{profile.year}</span>
          </>
        )}
      </p>
      {profile.platforms.length > 0 && (
        <ul className="cp-platforms" aria-label={`Platforms, ${profile.title}`}>
          {profile.platforms.map((platform) => (
            <li key={platform.slug}>{platform.name}</li>
          ))}
        </ul>
      )}
      <dl className="cp-facts">
        <div>
          <dt>Scope</dt>
          <dd>
            {profile.scope.edition} · {profile.scope.mode} ·{" "}
            {profile.scope.buildOrPatch}
          </dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>
            <span className="cp-facts__state" data-status={evidence.status}>
              {EVIDENCE_STATUS_LABEL[evidence.status]}
            </span>
            {" · "}
            {CONFIDENCE_LABEL[evidence.confidence]} confidence · Evidence cut-off{" "}
            <span className="tabular">{formatDate(evidence.cutoffAt)}</span>
          </dd>
        </div>
      </dl>
      {profile.platformWarning && (
        <p className="cp-warning">
          <strong>Platform warning.</strong> {profile.platformWarning}
        </p>
      )}
      <p className="sip-prose cp-identity__line">{profile.oneLineExperience}</p>
      {/* Primary Pull and Primary Risk, aligned side by side as the Compare
          contract asks (Master Plan §5.4) — the profile's own approved
          sentences, under the profile's own labels. */}
      <dl className="cp-pulltax">
        <div>
          <dt>The pull</dt>
          <dd>{profile.primaryPull}</dd>
        </div>
        <div>
          <dt>The tax</dt>
          <dd>{profile.primaryRisk}</dd>
        </div>
      </dl>
      <Link className="cp-identity__link" href={profile.path as Route}>
        Read the Game Profile
        <span className="sr-only"> of {profile.title}</span>
      </Link>
      {profile.artwork && (
        <p className="cp-credit">{profile.artwork.creditLine}</p>
      )}
    </div>
  );
}
