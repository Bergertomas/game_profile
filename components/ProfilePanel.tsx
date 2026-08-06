"use client";

import { useState } from "react";
import type { ProfileView } from "@/lib/profile/build";
import { CONFIDENCE_LABEL } from "@/lib/profile/vocabulary";
import { ProfileRadar } from "./ProfileRadar";
import { ScoreRows } from "./ScoreRows";

/**
 * The profile: silhouette and exact values as a single linked unit.
 *
 * Hovering, tapping or keyboard-focusing either representation highlights the
 * other. That is the point of the pairing — it teaches the mapping between the
 * shape and the numbers, which is the product's whole thesis (Plan §15.2).
 */
export function ProfilePanel({ profile }: { profile: ProfileView }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const active =
    profile.dimensions.find((d) => d.dimension.key === activeKey) ?? null;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,29rem)_minmax(0,1fr)] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,33rem)_minmax(0,1fr)]">
      <figure className="m-0 lg:sticky lg:top-8">
        <ProfileRadar
          points={profile.radar}
          activeKey={activeKey}
          onActiveChange={setActiveKey}
        />

        {/* Readout. Its resting state states the product's core rule, in the
            one place a viewer is most likely to mistake the polygon for a
            grade. */}
        <figcaption className="mt-1 min-h-[4.5rem] border-t border-line pt-3 sm:min-h-[4rem]">
          {active ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="label-micro text-bone">
                  {active.dimension.name}
                </span>
                <span className="tabular text-base font-semibold leading-none text-brass">
                  {active.display}
                  {active.score.kind !== "insufficient" && (
                    <span className="ml-0.5 text-[0.625rem] font-normal text-bone-faint">
                      /10
                    </span>
                  )}
                </span>
              </div>
              <p className="mt-1.5 text-[0.8125rem] leading-snug text-bone-dim">
                {active.dimension.coreQuestion}{" "}
                <span className="text-bone-faint">
                  {CONFIDENCE_LABEL[active.confidence]} confidence.
                </span>
              </p>
            </>
          ) : (
            <p className="text-[0.8125rem] leading-snug text-bone-dim">
              Eight dimensions, each scored 0–10 on its own terms.{" "}
              <span className="text-bone">There is no overall score</span> — the
              shape is the point, not the size.
            </p>
          )}
          <span className="sr-only">{profile.shapeDescription}</span>
        </figcaption>
      </figure>

      <div className="mt-8 lg:mt-0">
        <ScoreRows
          dimensions={profile.dimensions}
          activeKey={activeKey}
          onActiveChange={setActiveKey}
          showSourceCounts={profile.evaluation.evidenceLedger === "populated"}
        />
      </div>
    </div>
  );
}
