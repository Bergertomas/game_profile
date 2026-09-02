import { describe, expect, it } from "vitest";
import { comparePath, pairParam, parsePairParam } from "@/lib/compare/url";

/**
 * The address contract (ADR 0033): `/compare?games=<left>,<right>`, order
 * preserved, never normalised.
 */

describe("parsePairParam", () => {
  it("reads left then right, as written", () => {
    expect(parsePairParam("alan-wake-2,returnal")).toEqual({
      left: "alan-wake-2",
      right: "returnal",
      extra: [],
    });
    expect(parsePairParam("returnal,alan-wake-2")).toEqual({
      left: "returnal",
      right: "alan-wake-2",
      extra: [],
    });
  });

  it("treats a lone slug as the left side", () => {
    expect(parsePairParam("returnal")).toEqual({ left: "returnal", right: null, extra: [] });
    expect(parsePairParam("returnal,")).toEqual({ left: "returnal", right: null, extra: [] });
  });

  it("ignores empty tokens and whitespace, and never invents a side", () => {
    expect(parsePairParam("")).toEqual({ left: null, right: null, extra: [] });
    expect(parsePairParam(null)).toEqual({ left: null, right: null, extra: [] });
    expect(parsePairParam(" , ")).toEqual({ left: null, right: null, extra: [] });
    expect(parsePairParam(" alan-wake-2 , returnal ")).toEqual({
      left: "alan-wake-2",
      right: "returnal",
      extra: [],
    });
  });

  it("keeps exactly two and reports the rest", () => {
    expect(parsePairParam("a,b,c,d")).toEqual({ left: "a", right: "b", extra: ["c", "d"] });
  });

  it("does not alphabetise a self-pair away", () => {
    expect(parsePairParam("returnal,returnal")).toEqual({
      left: "returnal",
      right: "returnal",
      extra: [],
    });
  });
});

describe("comparePath", () => {
  it("writes the launcher, a left-only selection and a pair", () => {
    expect(comparePath()).toBe("/compare");
    expect(comparePath(null, null)).toBe("/compare");
    expect(comparePath("returnal")).toBe("/compare?games=returnal");
    expect(comparePath("alan-wake-2", "returnal")).toBe("/compare?games=alan-wake-2,returnal");
  });

  it("preserves the order it was given", () => {
    expect(comparePath("returnal", "alan-wake-2")).toBe("/compare?games=returnal,alan-wake-2");
  });

  it("round-trips through the parser", () => {
    const tokens = parsePairParam(
      new URL(comparePath("alan-wake-2", "returnal"), "https://shouldiplay.gg").searchParams.get("games"),
    );
    expect(tokens).toEqual({ left: "alan-wake-2", right: "returnal", extra: [] });
  });

  it("keeps the comma literal and encodes only the slugs", () => {
    expect(pairParam("a b", "c")).toBe("a b,c");
    expect(comparePath("a b", "c")).toBe("/compare?games=a%20b,c");
  });
});
