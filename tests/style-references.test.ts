import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * EVERY `var(--x)` IN THE SLICE-1 STYLESHEETS RESOLVES TO SOMETHING.
 *
 * ── The failure this exists to catch ───────────────────────────────────────
 *
 * `.sip-search__meta` and `.sip-search__go` referenced `--text-note`, a token
 * from the inferred scale that the literal contract promotion deleted. CSS does
 * not error on an undefined custom property: `font-size: var(--text-note)`
 * is simply invalid at computed-value time, so both rows fell back to the
 * inherited 16px and looked like a slightly loose design rather than a bug.
 *
 * Nothing else could have found it. The token tests check that the CONTRACT is
 * transcribed, not that the stylesheets only spend what it defines. The 12px
 * floor test measures painted text and 16px clears the floor comfortably. A
 * dangling reference is invisible from both ends, which is exactly why it needs
 * its own check.
 *
 * ── What counts as defined ─────────────────────────────────────────────────
 *
 * A reference resolves if the name is declared in `app/globals.css` (the
 * contract or the compatibility layer), declared in the same component sheet
 * (a local role alias), or injected at runtime from a component's inline
 * style. The third set is DERIVED from the components rather than hard-coded,
 * so the allowance covers exactly what is really injected and cannot be widened
 * by adding a name to a list here.
 */

const GLOBALS = "app/globals.css";

/** The stylesheets the public homepage, Search and profile slices own. */
const SHEETS = [
  "components/site-chrome.css",
  "components/search/search.css",
  "components/home/home-opening.css",
  "components/home/home-sections.css",
  "components/profile/profile.css",
  "components/compare/compare.css",
] as const;

/** `--name:` declarations in a stylesheet. */
function declaredIn(source: string): Set<string> {
  return new Set(
    [...source.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((match) => match[1]!),
  );
}

/** `var(--name)` and `var(--name, fallback)` references in a stylesheet. */
function referencedIn(source: string): Set<string> {
  return new Set(
    [...source.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map((match) => match[1]!),
  );
}

function tsxUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) return tsxUnder(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

/**
 * Custom properties set through an inline `style` object by the components that
 * own these stylesheets.
 *
 * These are legitimately undefined in CSS — a per-game accent has no static
 * value — and they are the only names a stylesheet may reference without a
 * declaration behind it.
 *
 * Scoped to the directories that own the sheets above, deliberately. Scanning
 * every component would let a sheet reference a design-lab variable
 * unchallenged, purely because some other surface happens to inject one. The
 * allowance has to be as narrow as the sheets it covers.
 */
const OWNING_COMPONENTS = [
  "components/home",
  "components/search",
  "components/profile",
  "components/compare",
] as const;

function runtimeInjected(): Set<string> {
  const injected = new Set<string>();
  for (const directory of OWNING_COMPONENTS) {
    for (const file of tsxUnder(directory)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/"(--[a-z0-9-]+)"\s*:/g)) {
        injected.add(match[1]!);
      }
    }
  }
  return injected;
}

const globals = declaredIn(readFileSync(GLOBALS, "utf8"));
const injected = runtimeInjected();

describe("runtime-injected custom properties", () => {
  it("are discovered from the components, not declared here", () => {
    // A guard on the guard: a broken scan would make the allowance empty and
    // the assertions below would then flag legitimate accent variables.
    expect(injected.size).toBeGreaterThan(0);
    expect([...injected].sort()).toEqual([
      "--cp-ground",
      "--cp-left",
      "--cp-left-base",
      "--cp-right",
      "--cp-right-base",
      "--sip-accent-base",
      "--sip-accent-lift",
      "--sip-radar-ground",
    ]);
  });
});

describe.each(SHEETS)("%s", (sheet) => {
  const source = readFileSync(sheet, "utf8");
  const local = declaredIn(source);

  it("references no undefined custom property", () => {
    const dangling = [...referencedIn(source)].filter(
      (name) => !globals.has(name) && !local.has(name) && !injected.has(name),
    );

    // The assertion that would have caught `--text-note`: a name spent here
    // that nothing anywhere defines.
    expect(dangling).toEqual([]);
  });

  it("references enough to be worth checking", () => {
    expect(referencedIn(source).size).toBeGreaterThan(10);
  });
});

describe("the detector itself", () => {
  /**
   * Proving the check fails on the real defect, rather than trusting that it
   * would. The fixture is the exact shape of the bug — a token name deleted by
   * the contract promotion, still spent by a rule.
   */
  it("catches a reference to a deleted token", () => {
    const broken = `.sip-search__meta { font-size: var(--text-note); }`;
    const dangling = [...referencedIn(broken)].filter(
      (name) => !globals.has(name) && !injected.has(name),
    );
    expect(dangling).toEqual(["--text-note"]);
  });

  it("accepts a contract token, a local alias and an injected accent", () => {
    const fine = `
      .a { --local-alias: 1rem; font-size: var(--text-small); }
      .b { padding: var(--local-alias); color: var(--sip-accent-lift); }
    `;
    const dangling = [...referencedIn(fine)].filter(
      (name) =>
        !globals.has(name) && !declaredIn(fine).has(name) && !injected.has(name),
    );
    expect(dangling).toEqual([]);
  });
});
