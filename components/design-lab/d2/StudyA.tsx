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
 * D2-A — GAME-LED EDITORIAL
 *
 * The game arrives first, at full width, as itself. A shallow hard crop of real
 * key art carries the title and the essential facts inside the composition;
 * directly beneath it a full-width graphite band holds the experience summary,
 * the profile shape and the eight exact values, so the instrument answers the
 * image on the image's own ground rather than on a sheet of paper.
 *
 * The accent is the red the key art is made of. It runs from the artwork
 * through the polygon to the active row, which is what makes the profile look
 * like it belongs to this game rather than to the template.
 *
 * Everything the first viewport used to carry about method — rubric version,
 * calibration round, evidence cut-off, status and confidence announcements —
 * is now in "How this profile was made" at the foot.
 */
export function StudyA({ profile }: { profile: ProfileView }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const active = hovered ?? focused ?? open;

  const { game, evaluation } = profile;
  const art = evaluationArtFor(game.slug);

  if (!art) {
    throw new Error(
      `D2-A requires evaluation artwork for "${game.slug}" — see public/design-lab/evaluation-art/PROVENANCE.md`,
    );
  }

  const radarSkin: RadarSkin = {
    ring: "rgba(237,235,231,0.13)",
    ringOuter: "rgba(237,235,231,0.42)",
    ringOuterWidth: 1.25,
    spoke: "rgba(237,235,231,0.13)",
    rings: [5, 10],
    fill: "var(--dl-accent-lift)",
    fillOpacity: 0.26,
    stroke: "var(--dl-accent-lift)",
    strokeWidth: 2.5,
    vertex: "var(--dl-accent-lift)",
    vertexEdge: "#191b1f",
    vertexSize: 3.5,
    reach: "var(--dl-bone-soft)",
    label: "var(--dl-bone-quiet)",
    value: "var(--dl-bone)",
    activeLabel: "var(--dl-bone)",
    activeValue: "var(--dl-accent-lift)",
    activeMark: "var(--dl-bone)",
  };

  const rowSkin: RowSkin = {
    wrap: "dl-d2a__row-wrap",
    panel: "dl-d2a__panel",
    accent: "var(--dl-accent-lift)",
    nameColor: "var(--dl-bone)",
    valueColor: "var(--dl-bone)",
    quietColor: "var(--dl-bone-quiet)",
    proseColor: "var(--dl-bone-soft)",
    ruleColor: "rgba(237,235,231,0.16)",
  };

  return (
    <div className="dl-d2a min-h-screen">
      {/* ================================================================= */}
      {/* Identity stage — the game, at full width, as itself.               */}
      {/* ================================================================= */}
      <div className="dl-d2__stage h-[268px] sm:h-[380px] lg:h-[460px]">
        {/* Hard crop, nothing else: object-fit only, no filter, no blur. The
            framing keeps both figures — Wake's face and Anderson beneath him —
            inside the band at every viewport. */}
        <Image
          src={art.src}
          alt={art.alt}
          fill
          priority
          sizes="100vw"
          style={{ objectPosition: "center 32%" }}
        />
        {/* Bottom-edge legibility scrim only. The subject and the entire upper
            frame are untouched — no blur, no full-frame tint. */}
        <div className="dl-d2__scrim" />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-[74rem] px-5 pb-6 sm:px-8 sm:pb-8">
            <h1
              className="dl-d2__display text-[2.75rem] sm:text-[4rem] lg:text-[5rem]"
              style={{ color: "var(--dl-bone)" }}
            >
              {game.canonicalTitle}
            </h1>
            <p
              className="dl-d2__label mt-2.5"
              style={{ color: "var(--dl-bone-soft)" }}
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
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Graphite profile band — experience, shape, eight exact values.     */}
      {/* ================================================================= */}
      <section className="dl-d2a__band" aria-labelledby="d2a-profile">
        <div className="mx-auto w-full max-w-[74rem] px-5 py-7 sm:px-8 sm:py-9">
          <p
            className="dl-d2__prose max-w-[46rem] text-[1.0625rem] sm:text-[1.1875rem]"
            style={{ color: "var(--dl-bone)" }}
          >
            {evaluation.oneLineExperience}
          </p>

          <div className="mt-7 flex items-baseline justify-between gap-4">
            <h2
              id="d2a-profile"
              className="dl-d2__label"
              style={{ color: "var(--dl-bone)" }}
            >
              Profile
            </h2>
            <span
              className="dl-d2__label"
              style={{ color: "var(--dl-bone-quiet)" }}
            >
              8 axes · 0–10 each · no overall score
            </span>
          </div>

          <div className="mt-4 lg:grid lg:grid-cols-[26rem_minmax(0,1fr)] lg:gap-x-12 xl:grid-cols-[29rem_minmax(0,1fr)]">
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

            <ol className="mt-7 list-none p-0 lg:mt-0">
              {profile.dimensions.map((view) => (
                <ScoreRow
                  key={view.dimension.key}
                  view={view}
                  idPrefix="d2a"
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

      <Lower profile={profile} art={art} />
    </div>
  );
}
