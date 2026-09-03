import Link from "next/link";
import { useId, type CSSProperties } from "react";
import { accentFor } from "@/lib/profile/accent";
import type { ProfileArtwork } from "@/lib/profile/artwork";
import type { ProfileView } from "@/lib/profile/build";
import { projectPlatforms } from "@/lib/profile/platform";
import {
  describePractical,
  type PracticalRecords,
} from "@/lib/profile/practical";
import { DecisionBand } from "./DecisionBand";
import { IdentityStage, StatusCaveat } from "./IdentityStage";
import { ProfileInstrument } from "./ProfileInstrument";
import { ReadingBand } from "./ReadingBand";
import type { ScopeLink } from "./ScopeSwitcher";
import { TrustBand } from "./TrustBand";
// The stylesheet travels with the component rather than with one route, so
// every surface that renders the profile — the public page, the admin preview,
// the review harnesses — renders it styled.
import "./profile.css";

/**
 * THE PUBLIC GAME PROFILE — the accepted A3–A6 composition (ADR 0032), as the
 * canonical frames in "Should I Play - Canonical Screens" draw it (see
 * docs/design/Should_I_Play_Canonical_Design_Source.md).
 *
 * One component, every game, both artwork states, both viewports. Nothing
 * about any specific title, platform, date, score or piece of evidence is
 * written into it, which is what lets a 9.5-across-the-board profile and a
 * 4.0 one read as the same instrument pointed at different games.
 *
 * ── The order is the product ────────────────────────────────────────────────
 *
 * The page answers "Should I play this?" before it explains the method, and
 * the DOM order IS the reading order at every width — CSS repositions nothing
 * out of sequence (handoff §8.1, matrix X-12):
 *
 *   1. the identity stage — evidence kicker, one h1, developer, full platform
 *      names, exact scope, and the answer: the one-line experience
 *   2. the pull and the tax, and practical commitment where a record exists
 *   3. the instrument — labelled radar and eight permanent exact rows
 *   4. the warm reading ground — who this is for, traits, platform warning
 *      and scope detail
 *   5. how this profile was made — evidence, scope record, credits
 *
 * The exit (more profiles) is the page's, not the profile's, and follows it in
 * ProfilePage.tsx.
 *
 * ── Server by default ───────────────────────────────────────────────────────
 *
 * This is a server component. The one interactive leaf — the instrument's
 * hover link and disclosures — is `ProfileInstrument`, and it receives only
 * what it needs. See that file for why the boundary is there.
 *
 * ── Artless is complete ─────────────────────────────────────────────────────
 *
 * `artwork` null renders the same content in the same order with the same
 * hierarchy on the typographic identity field. No empty hero, no placeholder,
 * no apology, no reduced section (ADR 0032). Production renders this state on
 * every profile today, because no artwork is cleared (ADR 0011).
 */
export function GameProfile({
  profile,
  artwork,
  scopes = [],
  practical = null,
}: {
  profile: ProfileView;
  artwork: ProfileArtwork | null;
  /**
   * Every published profile of this game, for sibling navigation. Empty or
   * single-entry for the ordinary one-experience game, where the switcher
   * renders nothing.
   */
  scopes?: readonly ScopeLink[];
  /**
   * Approved practical-time records for this scope, or nothing. Each record
   * must be bound to `profile.scope.id`; one for any other scope throws
   * rather than renders. No data path supplies one yet, so the public page
   * passes nothing and the practical band is omitted; the harness proves the
   * grammar with labelled fixtures.
   */
  practical?: PracticalRecords | null;
}) {
  const id = useId();
  const { game } = profile;
  const accent = accentFor(game.slug);
  const platforms = projectPlatforms(profile);
  const practicalFacts = describePractical(practical, profile.scope.id);

  return (
    <article
      className="gp"
      data-art={artwork ? "led" : "less"}
      aria-labelledby={`${id}-title`}
      style={
        {
          "--sip-accent-lift": accent.lift,
          "--sip-accent-base": accent.base,
          "--sip-radar-ground": "var(--color-surface-panel)",
        } as CSSProperties
      }
    >
      <div id={`${id}-title`} className="sr-only">
        Game Profile of {game.canonicalTitle}
      </div>

      <IdentityStage profile={profile} artwork={artwork} scopes={scopes} />
      <StatusCaveat profile={profile} />
      <DecisionBand profile={profile} practical={practicalFacts} />

      <section className="gp-instrument" aria-labelledby={`${id}-instrument`}>
        <div className="gp-measure">
          <div className="gp-panel gp-instrument__panel">
            <div className="gp-instrument__head">
              <h2
                id={`${id}-instrument`}
                className="gp-kicker gp-kicker--evidence"
              >
                The instrument — eight dimensions, 0–10, each answering its own
                question
              </h2>
              <Link href="/methodology" className="gp-instrument__rubric">
                Why these scores — the rubric →
              </Link>
            </div>
            <ProfileInstrument
              dimensions={profile.dimensions}
              radar={profile.radar}
              ledger={profile.evaluation.evidenceLedger}
              shapeDescription={profile.shapeDescription}
              platforms={platforms}
            />
          </div>
        </div>
      </section>

      <ReadingBand profile={profile} projection={platforms} />
      <TrustBand profile={profile} artwork={artwork} />
    </article>
  );
}
