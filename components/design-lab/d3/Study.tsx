"use client";

import { useState, type CSSProperties } from "react";
import type { ProfileView } from "@/lib/profile/build";
import { evaluationArtFor } from "@/lib/design-lab/evaluation-art";
import { d3AccentFor } from "@/lib/design-lab/profile";
import { formatYear } from "@/lib/format";
import { COMPACT, full } from "../radar-layout";
import { Lower } from "./Lower";
import { ProfileRadar, ScoreRow, type RadarSkin } from "./parts";

/**
 * D3 — GAME-LED PROFILE
 *
 * Built on D2-A. The game arrives first, at full width, as itself; the profile
 * answers it on a graphite field attached directly to the artwork's lower edge.
 * The accent is taken from the key art, so artwork, polygon and active row are
 * visibly the same game.
 *
 * Refinements over D2-A:
 *  - The desktop title stays inside the composition; on a phone the title and
 *    developer/year move onto the graphite field directly below the picture, so
 *    no type covers a subject and no scrim is drawn there at all.
 *  - The stage is 390px on desktop rather than 460, which brings the whole
 *    radar comfortably inside a 1440×1000 viewport.
 *  - Polygon fill is a third rather than a quarter, and the grid is drawn over
 *    it, so the shape reads as a silhouette without becoming a colour badge.
 *  - The experience summary is smaller on a phone: it supports the identity
 *    rather than becoming the headline.
 *
 * One presentation, three games. Nothing about any specific title, platform,
 * date, score or piece of evidence is written into it.
 */
export function D3Study({ profile }: { profile: ProfileView }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const active = hovered ?? focused ?? open;

  const { game, evaluation } = profile;
  const art = evaluationArtFor(game.slug);
  const accent = d3AccentFor(game.slug);

  const radarSkin: RadarSkin = {
    grid: "rgba(237,235,231,0.20)",
    gridOuter: "rgba(237,235,231,0.46)",
    fill: "var(--dl-accent-lift)",
    fillOpacity: 0.35,
    stroke: "var(--dl-accent-lift)",
    vertex: "var(--dl-accent-lift)",
    vertexEdge: "var(--dl-graphite)",
    reach: "var(--dl-bone-soft)",
    label: "var(--dl-bone-quiet)",
    value: "var(--dl-bone)",
    activeLabel: "var(--dl-bone)",
    activeValue: "var(--dl-accent-lift)",
    activeMark: "var(--dl-bone)",
  };

  return (
    <div
      className="dl-d3 min-h-screen"
      style={
        {
          "--dl-accent": accent.base,
          "--dl-accent-lift": accent.lift,
        } as CSSProperties
      }
    >
      {/* Identity stage ------------------------------------------------- */}
      <div className="dl-d3__stage h-[210px] sm:h-[320px] lg:h-[390px]">
        {/*
          Deliberately a plain <img>, not next/image: optimising a remote host
          would need an images.remotePatterns entry in next.config.ts, and that
          configuration would ship to production and outlive the lab. `art` is
          null in a production build, so nothing renders and no third-party URL
          is emitted.
        */}
        {art && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art.url}
            alt={art.alt}
            width={art.intrinsicWidth}
            height={art.intrinsicHeight}
            style={{ objectPosition: art.objectPosition }}
          />
        )}
        <div className="dl-d3__scrim" />
      </div>

      {/* Graphite profile field, attached to the artwork ---------------- */}
      <section className="dl-d3__band" aria-labelledby="dl-d3-profile">
        {/* One <h1>, placed by viewport: over the picture from 640px, on the
            graphite field below it on a phone. */}
        <div className="dl-d3__identity">
          <div className="mx-auto w-full max-w-[74rem] px-5 sm:px-8">
            <h1 className="dl-d3__display text-[2.5rem] sm:text-[3.75rem] lg:text-[4.75rem]">
              {game.canonicalTitle}
            </h1>
            <p className="dl-d3__label mt-2">
              {game.developerText} · {formatYear(game.firstReleaseDate)}
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[74rem] px-5 pt-4 pb-8 sm:px-8 sm:pt-8 sm:pb-11">
          <p className="dl-d3__prose max-w-[46rem] text-[0.9375rem] text-[var(--dl-bone)] sm:text-[1.125rem]">
            {evaluation.oneLineExperience}
          </p>

          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 sm:mt-7">
            <h2 id="dl-d3-profile" className="dl-d3__label dl-d3__label--bone">
              Profile
            </h2>
            <span className="dl-d3__label">
              8 axes · 0–10 each · no overall score
            </span>
          </div>

          <div className="mt-3 lg:grid lg:grid-cols-[26rem_minmax(0,1fr)] lg:gap-x-12 xl:grid-cols-[29rem_minmax(0,1fr)]">
            <div>
              <div className="sm:hidden">
                <ProfileRadar
                  profile={profile}
                  active={active}
                  layout={COMPACT}
                  skin={radarSkin}
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
                  skin={radarSkin}
                />
              </div>
              <span className="dl-sr">{profile.shapeDescription}</span>
            </div>

            <ol className="mt-6 list-none p-0 lg:mt-0">
              {profile.dimensions.map((view) => (
                <ScoreRow
                  key={view.dimension.key}
                  view={view}
                  accent="var(--dl-accent-lift)"
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

      <Lower profile={profile} art={art} />
    </div>
  );
}
