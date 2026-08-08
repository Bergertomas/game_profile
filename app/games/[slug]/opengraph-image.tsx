import { ImageResponse } from "next/og";
import { getGameProfile, listGameSlugs } from "@/lib/data/games";
import type { DimensionView } from "@/lib/profile/build";
import { OG_COLORS, radarSvg, svgDataUri } from "@/lib/seo/og-radar";
import { SITE_NAME } from "@/lib/site";

/**
 * The share card for a game profile.
 *
 * Prerendered at build time for every published slug, so it ships as a static
 * asset and costs nothing at request time on Cloudflare Workers.
 *
 * It shows the silhouette and names the two strongest dimensions by their own
 * 0–10 figures. It must never show a total, an average, or a "score out of" —
 * naming the two highest axes is a description of the shape, not a rating of
 * the game (asserted in tests/seo.test.ts).
 */

export const alt = "Game Profile share card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamicParams = false;

export function generateStaticParams() {
  return listGameSlugs().then((slugs) => slugs.map((slug) => ({ slug })));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getGameProfile(slug);
  if (!profile) return new Response("Not found", { status: 404 });

  const { game, evaluation } = profile;

  const strongest = [...profile.dimensions]
    .filter((view) => view.score.kind !== "insufficient")
    .sort((a, b) => lowerBound(b) - lowerBound(a))
    .slice(0, 2);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: OG_COLORS.ink,
          color: OG_COLORS.bone,
          padding: 64,
          borderTop: `10px solid ${OG_COLORS.brass}`,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            paddingRight: 48,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 24,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: OG_COLORS.brass,
              }}
            >
              {SITE_NAME}
            </div>
            <div
              style={{
                fontSize: game.canonicalTitle.length > 26 ? 62 : 78,
                lineHeight: 1.05,
                marginTop: 22,
              }}
            >
              {game.canonicalTitle}
            </div>
            <div
              style={{
                fontSize: 26,
                lineHeight: 1.4,
                marginTop: 22,
                color: OG_COLORS.boneDim,
              }}
            >
              {truncate(evaluation.oneLineExperience, 120)}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 28 }}>
              {strongest.map((view) => (
                <div
                  key={view.dimension.key}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <span style={{ fontSize: 20, color: OG_COLORS.boneFaint }}>
                    {view.dimension.name}
                  </span>
                  <span style={{ fontSize: 34, color: OG_COLORS.brass }}>
                    {view.display}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                marginTop: 14,
                paddingTop: 18,
                borderTop: `1px solid ${OG_COLORS.line}`,
                color: OG_COLORS.boneFaint,
              }}
            >
              shouldiplay.gg · eight dimensions · no overall score
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {/* Satori's own element, not the DOM's: next/image has no meaning
              inside an ImageResponse. */}
          <img
            src={svgDataUri(radarSvg(profile.radar, 420))}
            width={420}
            height={420}
            alt=""
          />
        </div>
      </div>
    ),
    size,
  );
}

/** Orders dimensions conservatively: a range sorts by its floor, never its top. */
function lowerBound({ score }: DimensionView): number {
  if (score.kind === "exact") return score.score;
  if (score.kind === "range") return score.low;
  return -1;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(" ", max))}…`;
}
