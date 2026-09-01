import { describe, expect, it } from "vitest";
import {
  artworkSchema,
  gameSchema,
  parseForm,
  profileScopeSchema,
  slugSchema,
} from "@/lib/admin/validation";

/**
 * What the editorial forms accept.
 *
 * These schemas are deliberately not a second copy of the database's rules —
 * uniqueness, primacy and clearance constraints live in Postgres, where they
 * hold against a migration and a psql session too. What is tested here is the
 * part a constraint cannot do: turning browser strings into domain values, and
 * refusing shapes that would produce a broken public URL.
 */

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const VALID_GAME = {
  slug: "alan-wake-2",
  canonicalTitle: "Alan Wake 2",
  releaseStatus: "released",
};

describe("Slugs", () => {
  it("accepts the shape a public address needs", () => {
    expect(slugSchema.parse("alan-wake-2")).toBe("alan-wake-2");
    expect(slugSchema.parse("  Returnal  ")).toBe("returnal");
  });

  it.each([
    ["a space", "alan wake 2"],
    ["a leading hyphen", "-returnal"],
    ["a trailing hyphen", "returnal-"],
    ["a doubled hyphen", "alan--wake"],
    ["an underscore", "alan_wake"],
    ["a slash, which would invent a route", "games/returnal"],
    ["nothing at all", "   "],
  ])("rejects %s", (_label, value) => {
    expect(slugSchema.safeParse(value).success).toBe(false);
  });
});

describe("The game form", () => {
  it("turns cleared fields into absent values, not empty strings", () => {
    const parsed = parseForm(
      gameSchema,
      form({ ...VALID_GAME, summary: "", developerText: "  ", firstReleaseDate: "" }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    // A cleared <input> submits "", and storing that would make "no developer
    // recorded" indistinguishable from "developer is the empty string".
    expect(parsed.value.summary).toBeUndefined();
    expect(parsed.value.developerText).toBeUndefined();
    expect(parsed.value.firstReleaseDate).toBeUndefined();
  });

  it("reports one message per field, keyed to the field", () => {
    const parsed = parseForm(
      gameSchema,
      form({ slug: "Not A Slug", canonicalTitle: "", releaseStatus: "released" }),
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(Object.keys(parsed.errors).sort()).toEqual(["canonicalTitle", "slug"]);
    expect(parsed.errors.slug).toMatch(/lowercase/i);
  });

  it("rejects a release state outside the enum", () => {
    const parsed = parseForm(
      gameSchema,
      form({ ...VALID_GAME, releaseStatus: "cancelled" }),
    );
    expect(parsed.ok).toBe(false);
  });

  it("rejects a half-typed date rather than storing it", () => {
    const parsed = parseForm(
      gameSchema,
      form({ ...VALID_GAME, firstReleaseDate: "2023" }),
    );
    expect(parsed.ok).toBe(false);
  });
});

describe("The artwork form", () => {
  const VALID_ARTWORK = {
    role: "hero",
    url: "https://images.example.com/aw2-hero.jpg",
    width: "1920",
    height: "1080",
    source: "press-kit",
    clearance: "production",
    basis: "press-kit",
    // Production clearance requires attribution — see the cross-field rule
    // below, and `game_artwork_production_is_attributable` behind it.
    credit: "Remedy Entertainment",
    sourcePage: "https://example.com/press",
  };

  it("accepts a complete rights record", () => {
    const parsed = parseForm(artworkSchema, form(VALID_ARTWORK));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.width).toBe(1920);
    expect(parsed.value.clearance).toBe("production");
  });

  it("accepts the approved editorial-fair-use basis as an explicit audited choice", () => {
    const parsed = parseForm(
      artworkSchema,
      form({ ...VALID_ARTWORK, basis: "editorial-fair-use" }),
    );
    expect(parsed.ok).toBe(true);
  });

  /**
   * The whole of ADR 0011. A bare URL records that an image is reachable and
   * nothing about whether it may be shown, so an asset arrives with clearance
   * and basis or it does not arrive. Neither may have a default.
   */
  it.each(["clearance", "basis"])("refuses artwork with no %s", (field) => {
    const fields = { ...VALID_ARTWORK } as Record<string, string>;
    delete fields[field];
    const parsed = parseForm(artworkSchema, form(fields));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors[field]).toBeDefined();
  });

  /**
   * The database's `game_artwork_production_is_attributable` requires a
   * production-cleared row to carry a credit and a source page: an asset that
   * may appear publicly is a rights position, so it has to be auditable. The
   * form states that as two required fields rather than letting the editor meet
   * it as a raw constraint violation after filling in everything else.
   */
  it.each(["credit", "sourcePage"])(
    "requires %s once artwork is cleared for production",
    (field) => {
      const fields = { ...VALID_ARTWORK } as Record<string, string>;
      delete fields[field];
      const parsed = parseForm(artworkSchema, form(fields));
      expect(parsed.ok).toBe(false);
      if (parsed.ok) return;
      expect(parsed.errors[field]).toBeDefined();
    },
  );

  it("does not demand attribution for an evaluation-only record", () => {
    // Internal surfaces only, so it is held to the looser rule — and requiring
    // a credit here would make recording a reference image needlessly heavy.
    const parsed = parseForm(
      artworkSchema,
      form({
        role: "hero",
        url: "https://images.example.com/reference.jpg",
        width: "1920",
        height: "1080",
        source: "manual",
        clearance: "evaluation",
        basis: "internal-evaluation",
      }),
    );
    expect(parsed.ok).toBe(true);
  });

  it("refuses a clearance value that is not one the renderer knows", () => {
    const parsed = parseForm(
      artworkSchema,
      form({ ...VALID_ARTWORK, clearance: "probably-fine" }),
    );
    expect(parsed.ok).toBe(false);
  });

  it("refuses dimensions that are not real", () => {
    for (const bad of [{ width: "0" }, { height: "-4" }, { width: "wide" }]) {
      expect(parseForm(artworkSchema, form({ ...VALID_ARTWORK, ...bad })).ok).toBe(
        false,
      );
    }
  });
});

describe("The scope form", () => {
  it("accepts a sibling scope", () => {
    const parsed = parseForm(
      profileScopeSchema,
      form({ key: "wintermute", label: "Wintermute", summary: "", displayOrder: "2" }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toMatchObject({ key: "wintermute", displayOrder: 2 });
  });

  it("holds a scope key to the same shape as a slug, because it is a URL segment", () => {
    expect(
      parseForm(
        profileScopeSchema,
        form({ key: "Tower of Sisyphus", label: "Tower", displayOrder: "2" }),
      ).ok,
    ).toBe(false);
  });

  /**
   * `isPrimary` is deliberately not a field. Primacy owns the canonical URL and
   * moving it is a separate, explicit act (ADR 0016) — accepting it here would
   * let a reorder-and-relabel save quietly move a public address.
   */
  it("cannot set primacy, even when the browser sends it", () => {
    const parsed = parseForm(
      profileScopeSchema,
      form({
        key: "wintermute",
        label: "Wintermute",
        displayOrder: "2",
        isPrimary: "true",
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).not.toHaveProperty("isPrimary");
  });
});
