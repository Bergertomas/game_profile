"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProfileView } from "@/lib/profile/build";
import { evaluationArtFor } from "@/lib/design-lab/evaluation-art";
import { formatYear } from "@/lib/format";
import { COMPACT, full } from "../radar-layout";
import { Lower } from "./Lower";
import { ProfileRadar, ScoreRow, type RadarSkin, type RowSkin } from "./parts";

/**
 * D2-B — PROFILE AS GAME OBJECT
 *
 * The artwork is present but held back: a hard-cropped field bleeding off the
 * right edge of the identity region, clipped by the page rather than framed by
 * it. What dominates is the profile itself, drawn as a solid object with a
 * decisive silhouette rather than as a chart — two grid rings instead of four,
 * no graduations, a filled polygon in the game's own colour and heavy register
 * marks at every vertex.
 *
 * The page moves through three neutral surfaces — page, white instrument panel,
 * trust band — so cadence comes from ground changes instead of ruled divisions.
 *
 * The serif is reserved for editorial interpretation here: the experience
 * summary, the pull and risk statements, and the rationale inside a panel.
 */
export function StudyB({ profile }: { profile: ProfileView }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const active = hovered ?? focused ?? open;

  const { game, evaluation } = profile;
  const art = evaluationArtFor(game.slug);

  if (!art) {
    throw new Error(
      `D2-B requires evaluation artwork for "${game.slug}" — see public/design-lab/evaluation-art/PROVENANCE.md`,
    );
  }

  const radarSkin: RadarSkin = {
    ring: "rgba(22,24,28,0.14)",
    ringOuter: "var(--dl-ink)",
    ringOuterWidth: 1.5,
    spoke: "rgba(22,24,28,0.10)",
    // Two rings, not four. The object should not read as a chart grid.
    rings: [5, 10],
    fill: "var(--dl-accent)",
    fillOpacity: 0.88,
    stroke: "var(--dl-ink)",
    strokeWidth: 2.5,
    vertex: "var(--dl-ink)",
    vertexEdge: "var(--dl-panel)",
    vertexSize: 4.5,
    reach: "var(--dl-ink-quiet)",
    label: "var(--dl-ink-quiet)",
    value: "var(--dl-ink)",
    activeLabel: "var(--dl-ink)",
    activeValue: "var(--dl-accent)",
    activeMark: "var(--dl-ink)",
  };

  const rowSkin: RowSkin = {
    wrap: "dl-d2b__row-wrap",
    panel: "dl-d2b__panel-open",
    accent: "var(--dl-accent)",
    nameColor: "var(--dl-ink)",
    valueColor: "var(--dl-ink)",
    quietColor: "var(--dl-ink-quiet)",
    proseColor: "var(--dl-ink-soft)",
    ruleColor: "#e2e2de",
  };

  return (
    <div className="dl-d2b min-h-screen">
      {/* ================================================================= */}
      {/* Identity — title and experience on the page ground, with the image */}
      {/* field cropped hard and run off the right edge.                     */}
      {/* ================================================================= */}
      <section className="lg:grid lg:grid-cols-[minmax(0,1fr)_38%] lg:items-stretch">
        <div className="flex flex-col justify-center px-5 pt-7 pb-6 sm:px-8 sm:pt-12 lg:py-12 lg:pl-[max(2rem,calc((100vw-74rem)/2+2rem))] lg:pr-10">
          <h1 className="dl-d2__display text-[2.75rem] sm:text-[3.75rem] lg:text-[4.5rem]">
            {game.canonicalTitle}
          </h1>
          <p
            className="dl-d2__label mt-2.5"
            style={{ color: "var(--dl-ink-quiet)" }}
          >
            {game.developerText} · {formatYear(game.firstReleaseDate)}
            {/* Platforms are scope, and scope now lives in the trust block.
                They stay on the stage where there is room for one clean line,
                and drop off it where they would wrap across the picture. */}
            <span className="hidden sm:inline">
              {" · "}
              {evaluation.scope.platforms.join(" · ")}
            </span>
          </p>
          <p
            className="dl-d2__prose mt-4 max-w-[34rem] text-[1.0625rem] sm:text-[1.1875rem]"
            style={{ color: "var(--dl-ink-soft)" }}
          >
            {evaluation.oneLineExperience}
          </p>
        </div>

        {/* No frame, no radius, no shadow, no gutter: the field is clipped by
            the page edge, which is what stops it reading as a split card. */}
        <div className="dl-d2__stage h-[152px] sm:h-[220px] lg:h-auto lg:min-h-[20rem]">
          <Image
            src={art.src}
            alt={art.alt}
            fill
            priority
            sizes="(min-width: 1024px) 38vw, 100vw"
            style={{ objectPosition: "center 30%" }}
          />
        </div>
      </section>

      {/* ================================================================= */}
      {/* The profile, as an object.                                         */}
      {/* ================================================================= */}
      <section className="dl-d2b__panel" aria-labelledby="d2b-profile">
        <div className="mx-auto w-full max-w-[74rem] px-5 py-6 sm:px-8 sm:py-11">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="d2b-profile" className="dl-d2__label">
              Profile
            </h2>
            <span
              className="dl-d2__label"
              style={{ color: "var(--dl-ink-quiet)" }}
            >
              8 axes · 0–10 each · no overall score
            </span>
          </div>

          <div className="mt-4 lg:grid lg:grid-cols-[30rem_minmax(0,1fr)] lg:gap-x-12">
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
                    height: 404,
                    center: { x: 250, y: 200 },
                    radius: 126,
                    labelRadius: 148,
                    nameSize: 14,
                    valueSize: 21,
                  })}
                  skin={radarSkin}
                />
              </div>
              <span className="dl-sr">{profile.shapeDescription}</span>
            </div>

            <ol className="mt-5 list-none p-0 lg:mt-2">
              {profile.dimensions.map((view) => (
                <ScoreRow
                  key={view.dimension.key}
                  view={view}
                  idPrefix="d2b"
                  skin={rowSkin}
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

      <Lower profile={profile} art={art} serifInterpretation />
    </div>
  );
}
