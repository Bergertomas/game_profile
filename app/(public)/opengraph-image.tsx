import { ImageResponse } from "next/og";
import { OG_COLORS } from "@/lib/seo/og-radar";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/** The site-level share card, used for the home page and as the global default. */

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: OG_COLORS.ink,
          color: OG_COLORS.bone,
          padding: 72,
          borderTop: `10px solid ${OG_COLORS.brass}`,
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: OG_COLORS.brass,
          }}
        >
          {SITE_NAME}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, lineHeight: 1.1 }}>
            Not just whether a game is good.
          </div>
          <div style={{ fontSize: 68, lineHeight: 1.1, color: OG_COLORS.brass }}>
            {SITE_TAGLINE}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 24,
            paddingTop: 22,
            borderTop: `1px solid ${OG_COLORS.line}`,
            color: OG_COLORS.boneFaint,
          }}
        >
          shouldiplay.gg · every game profiled across eight dimensions · no
          overall score
        </div>
      </div>
    ),
    size,
  );
}
