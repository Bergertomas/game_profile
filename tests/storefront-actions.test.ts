import { describe, expect, it } from "vitest";
import {
  toPublicStorefrontAction,
  validateStorefrontDestination,
  type StorefrontDestination,
} from "@/lib/commerce/storefront";

const ORDINARY: StorefrontDestination = {
  id: "steam-aw2",
  gameId: "alan-wake-2",
  platform: "pc",
  region: "global",
  storefront: "Steam",
  officialUrl: "https://store.steampowered.com/app/1087100/",
  relationship: "ordinary",
  availability: "verified",
  source: "steam",
  verifiedAt: "2026-08-26T12:00:00Z",
};

describe("The launch official action layer", () => {
  it("uses an ordinary verified destination without requiring monetization", () => {
    expect(toPublicStorefrontAction(ORDINARY)).toMatchObject({
      href: ORDINARY.officialUrl,
      ordinaryHref: ORDINARY.officialUrl,
      relationship: "ordinary",
    });
  });

  it("retains the ordinary destination and disclosure behind an affiliate link", () => {
    const action = toPublicStorefrontAction({
      ...ORDINARY,
      relationship: "affiliate",
      affiliateUrl: "https://example.com/affiliate/aw2",
      disclosure: "Should I Play? may earn a commission from this link.",
    });
    expect(action).toMatchObject({
      href: "https://example.com/affiliate/aw2",
      ordinaryHref: ORDINARY.officialUrl,
      relationship: "affiliate",
    });
  });

  it("hides unavailable or unverifiable destinations", () => {
    expect(
      toPublicStorefrontAction({ ...ORDINARY, availability: "unknown" }),
    ).toBeNull();
  });

  it("removes a destination once its explicit verification window expires", () => {
    expect(
      toPublicStorefrontAction(
        { ...ORDINARY, staleAfter: "2026-09-01T00:00:00Z" },
        "2026-09-01T00:00:00Z",
      ),
    ).toBeNull();
  });

  it("refuses a staleness deadline that predates verification", () => {
    expect(
      validateStorefrontDestination({
        ...ORDINARY,
        staleAfter: "2026-08-25T00:00:00Z",
      }),
    ).toContain("staleAfter must be later than verifiedAt.");
  });

  it("refuses an undisclosed affiliate destination", () => {
    expect(
      validateStorefrontDestination({
        ...ORDINARY,
        relationship: "affiliate",
        affiliateUrl: "https://example.com/affiliate/aw2",
      }),
    ).toContain("An affiliate destination requires public disclosure.");
  });
});
