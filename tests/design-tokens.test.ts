import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  allTokens,
  cssValueFor,
  TOKENS_PATH,
  varNameFor,
} from "./support/tokens";

const css = readFileSync("app/globals.css", "utf8");

/**
 * THE IMPLEMENTATION AGAINST THE CONTRACT.
 *
 * Every assertion here compares `app/globals.css` to
 * `docs/design/handoff/should-i-play.tokens.v1.json`. None of them reads an
 * expectation back out of the stylesheet, and that is the whole point: the
 * previous token suite did, so a palette that was internally consistent and
 * externally wrong passed it cleanly. An inferred canvas one step too dark, a
 * text step the contract does not contain, a solid border ramp standing in for
 * an alpha one, and an invented radius and motion scale all survived a green
 * run because the test agreed with the code rather than with the design.
 *
 * The three checks below are therefore about DRIFT, in both directions:
 * something the contract has and the code lacks, something the code has that
 * the contract never granted, and something both have under different values.
 */

/** The stylesheet up to the compatibility layer — the canonical region. */
const CANONICAL_REGION = css.slice(
  css.indexOf("@theme {"),
  css.indexOf("COMPATIBILITY LAYER"),
);

/** `--name: value;` declarations in a region, as a map. */
function declarations(region: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of region.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gim)) {
    found.set(match[1]!, match[2]!.trim());
  }
  return found;
}

const canonical = declarations(CANONICAL_REGION);

describe(`every token in ${TOKENS_PATH}`, () => {
  const contract = allTokens();

  it("is a contract worth checking", () => {
    // A guard on the guard: a mis-read JSON would make every assertion below
    // pass over an empty list.
    expect(contract.length).toBeGreaterThan(80);
  });

  it.each(contract.map(([path, token]) => [path.join("."), path, token] as const))(
    "%s is implemented with its exact value",
    (_name, path, token) => {
      const variable = varNameFor(path);
      const expected = cssValueFor(token);
      expect(canonical.has(variable), `${variable} is not declared`).toBe(true);
      expect(canonical.get(variable)).toBe(expected);
    },
  );
});

describe("the canonical region contains nothing the contract did not grant", () => {
  it("declares no variable absent from the token file", () => {
    const granted = new Set(allTokens().map(([path]) => varNameFor(path)));
    const extras = [...canonical.keys()].filter(
      (name) => !granted.has(name) && name !== "--text-micro--line-height",
    );

    // This is the assertion that would have caught `--color-canvas: #08090b`,
    // `--color-text-bright`, the solid border ramp and the 120/180/260ms
    // motion scale. An invented value can only live in the compatibility
    // layer, where its name says what it is.
    expect(extras).toEqual([]);
  });

  it("keeps the compatibility layer out of the canonical namespaces", () => {
    const legacy = declarations(css.slice(css.indexOf("COMPATIBILITY LAYER")));
    const granted = new Set(allTokens().map(([path]) => varNameFor(path)));
    const collisions = [...legacy.keys()].filter((name) => granted.has(name));

    // A legacy name shadowing a contract name would silently redefine the
    // contract for every surface, which is the failure the separation exists
    // to prevent.
    expect(collisions).toEqual([]);
  });

  it("resolves every compatibility alias to an approved token or a legacy value", () => {
    const legacy = declarations(css.slice(css.indexOf("COMPATIBILITY LAYER")));
    const granted = new Set(allTokens().map(([path]) => varNameFor(path)));

    for (const [name, value] of legacy) {
      const reference = value.match(/^var\((--[a-z0-9-]+)\)$/)?.[1];
      if (!reference) continue;
      // An alias may only point INTO the contract. Pointing at another legacy
      // name would let the compatibility layer grow its own private system.
      expect(granted.has(reference), `${name} → ${reference}`).toBe(true);
    }
  });
});

describe("the scales the contract defines are implemented whole", () => {
  /**
   * Floors, not exact counts. The per-token assertions above already prove
   * every entry is implemented; these prove the CONTRACT still has the shape
   * the product was built against, so a truncated or mis-parsed token file
   * fails loudly instead of silently shrinking what gets checked. A scale that
   * legitimately grows raises its floor in the same commit.
   */
  it.each([
    ["colour", "color", 40],
    ["type size", "font.size", 12],
    ["spacing", "space", 12],
    ["size", "size", 12],
    ["radius", "radius", 5],
    ["motion duration", "motion.duration", 5],
    ["breakpoint", "breakpoint", 5],
  ])("implements the whole %s scale", (_label, group, floor) => {
    const inGroup = allTokens().filter(([path]) =>
      path.join(".").startsWith(`${group}.`),
    );
    expect(inGroup.length).toBeGreaterThanOrEqual(floor);
    for (const [path] of inGroup) {
      expect(canonical.has(varNameFor(path)), path.join(".")).toBe(true);
    }
  });
});
