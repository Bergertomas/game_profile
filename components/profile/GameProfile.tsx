"use client";

import { useState, type CSSProperties } from "react";
import { formatYear } from "@/lib/format";
import { accentFor } from "@/lib/profile/accent";
import type { ProfileArtwork } from "@/lib/profile/artwork";
import type { ProfileView } from "@/lib/profile/build";
import { PRE_RELEASE_NOTICE } from "@/lib/profile/vocabulary";
import { GameStage } from "./GameStage";
import { ScopeSwitcher, type ScopeLink } from "./ScopeSwitcher";
import { ScoreRow } from "./instrument";
import { GRAPHITE_SKIN, ProfileRadar } from "./radar";
import { ProfileLower } from "./ProfileLower";
import { COMPACT, full } from "./radar-layout";
// The stylesheet travels with the component rather than with one route. It
// used to be imported by app/games/[slug]/page.tsx alone, so the review
// harness at /dev/radar-states rendered the profile completely unstyled — the
// one surface built to prove the uncertainty states could not show them.
import "./profile.css";

/**
 * The public game profile.
 *
 * The game arrives first, at full width, as itself. The profile answers it on a
 * graphite field attached directly to the stage's lower edge, in an accent
 * taken from the game's own identity — so artwork, polygon and active row are
 * visibly the same game.
 *
 * One presentation, every game. Nothing about any specific title, platform,
 * date, score or piece of evidence is written into it, which is what lets a
 * 9.5-across-the-board profile and a 4.0 one read as the same instrument
 * pointed at different games.
 *
 * The interactive layer is hover/focus linking between a score row and its
 * radar axis, plus per-row disclosure. Everything a search engine or a reader
 * without JavaScript needs is in the server-rendered markup: all eight
 * dimension names, all eight exact values, every rationale, the scope and the
 * evidence. Interaction reveals nothing that is not already there.
 */
export function GameProfile({
  profile,
  artwork,
  scopes = [],
}: {
  profile: ProfileView;
  artwork: ProfileArtwork | null;
  /**
   * Every published profile of this game, for sibling navigation. Empty or
   * single-entry for the ordinary one-experience game, where the switcher
   * renders nothing.
   */
  scopes?: readonly ScopeLink[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const active = hovered ?? focused ?? open;

  const { game, evaluation } = profile;
  const accent = accentFor(game.slug);

  return (
    <div
      className="gp"
      data-artless={artwork ? undefined : "true"}
      style={
        {
          "--gp-accent": accent.base,
          "--gp-accent-lift": accent.lift,
          // The radar skin is shared with the card mark, so it reads the
          // system-wide names rather than this page's scoped ones.
          "--sip-accent-lift": accent.lift,
          "--sip-radar-ground": "var(--color-graphite)",
        } as CSSProperties
      }
    >
      <GameStage artwork={artwork} />

      {/* Graphite profile field, attached to the stage ------------------- */}
      <section className="gp__band" aria-labelledby="gp-profile">
        {/* One <h1> in the DOM, placed by viewport: over the picture from
            640px when there is one, on the graphite field otherwise. */}
        <div className="gp__identity">
          <div className="mx-auto w-full max-w-[74rem] px-5 sm:px-8">
            <h1 className="gp__display text-[2.5rem] sm:text-[3.75rem] lg:text-[4.75rem]">
              {game.canonicalTitle}
            </h1>
            <p className="gp__label mt-2">
              {game.developerText} · {formatYear(game.firstReleaseDate)}
            </p>
            <ScopeSwitcher scopes={scopes} gameTitle={game.canonicalTitle} />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[74rem] px-5 pt-4 pb-8 sm:px-8 sm:pt-8 sm:pb-11">
          <p className="gp__prose max-w-[46rem] text-[0.9375rem] text-[var(--gp-bone)] sm:text-[1.125rem]">
            {evaluation.oneLineExperience}
          </p>

          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 sm:mt-7">
            <h2 id="gp-profile" className="gp__label gp__label--bone">
              Profile
            </h2>
            <span className="gp__label">
              8 axes · 0–10 each · no overall score
            </span>
          </div>

          {/* Pre-release uncertainty is stated before the numbers are read,
              not filed at the foot of the page. A provisional profile that
              looks identical to a verified one is the failure mode. */}
          {evaluation.evidenceStatus === "pre_release" && (
            <p className="gp__notice mt-4 max-w-[46rem] text-[0.9375rem]">
              {PRE_RELEASE_NOTICE}
            </p>
          )}

          <div className="mt-3 lg:grid lg:grid-cols-[26rem_minmax(0,1fr)] lg:gap-x-12 xl:grid-cols-[29rem_minmax(0,1fr)]">
            <div>
              {/* Two instances swapped by CSS rather than one scaled SVG: a
                  single chart scaled to phone width renders its labels at
                  ~7px. No resize observer, no layout shift, no hydration
                  mismatch. */}
              <div className="sm:hidden">
                <ProfileRadar
                  profile={profile}
                  active={active}
                  layout={COMPACT}
                  skin={GRAPHITE_SKIN}
                />
              </div>
              <div className="hidden sm:block">
                <ProfileRadar
                  profile={profile}
                  active={active}
                  layout={full({
                    width: 500,
                    height: 400,
                    center: { x: 250, y: 198 },
                    radius: 118,
                    labelRadius: 140,
                    nameSize: 14,
                    valueSize: 20,
                  })}
                  skin={GRAPHITE_SKIN}
                />
              </div>
              {/* The polygon is aria-hidden decoration; this is its text
                  equivalent, and it describes distribution, never a rating. */}
              <span className="gp-sr">{profile.shapeDescription}</span>
            </div>

            <ol className="mt-6 list-none p-0 lg:mt-0">
              {profile.dimensions.map((view) => (
                <ScoreRow
                  key={view.dimension.key}
                  view={view}
                  accent="var(--gp-accent-lift)"
                  ledger={evaluation.evidenceLedger}
                  isActive={active === view.dimension.key}
                  isOpen={open === view.dimension.key}
                  onHover={setHovered}
                  onFocus={setFocused}
                  onToggle={(key) => setOpen(open === key ? null : key)}
                />
              ))}
            </ol>
          </div>
        </div>
      </section>

      <ProfileLower profile={profile} artwork={artwork} />
    </div>
  );
}
