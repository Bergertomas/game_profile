import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { deployAvailability } from "@/lib/deploy/config";

/**
 * The Cloudflare credential stays on the server, and no test can spend it.
 *
 * Two separate guarantees, both of which fail silently if nobody checks:
 *
 *   1. `CLOUDFLARE_API_TOKEN` is read in exactly one module and never reaches a
 *      client component, so it cannot be substituted into a browser bundle.
 *      Next inlines `process.env.X` textually wherever it appears, so a single
 *      reference from a `"use client"` file publishes the value to every
 *      visitor — there is no runtime error, no warning, and nothing to notice.
 *   2. No test imports the module that supplies the real `fetch`, so no test
 *      run can reach the live Cloudflare API — not even one that gets its
 *      mocking wrong.
 *
 * ── Why this reads source rather than the built bundle ────────────────────
 *
 * The repository's habit is to check the artefact rather than the intent
 * (`scripts/check-build-containment.ts`), and that is the better instinct. It
 * does not work for this particular leak: Next SUBSTITUTES `process.env.X` with
 * the literal value, so a leaked credential appears in a client bundle as an
 * anonymous string with the variable name nowhere in sight. Scanning output for
 * the name would pass while the secret sat in it; scanning for the value would
 * require the real credential to be present wherever the check runs, which is
 * precisely what CI must not have.
 *
 * So the enforceable guarantee is the one below: the name appears in exactly
 * one server module, and no file that opts into the browser references it or
 * anything that holds it. Stated plainly because the weaker guarantee should
 * not be mistaken for the stronger one.
 */

const ROOT = join(__dirname, "..", "..");

const SOURCE_ROOTS = ["app", "components", "lib", "scripts"] as const;

/** Names that must never be substituted into anything a browser downloads. */
const SERVER_ONLY_ENV = [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_BUILDS_TRIGGER_ID",
  "CLOUDFLARE_WORKER_TAG",
  "ADMIN_DATABASE_URL",
  "DATABASE_URL",
] as const;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function rel(file: string): string {
  return relative(ROOT, file).replaceAll("\\", "/");
}

function sourceFiles(): string[] {
  return SOURCE_ROOTS.flatMap((root) =>
    walk(join(ROOT, root)).filter((file) => /\.(ts|tsx|mjs)$/.test(file)),
  );
}

function read(file: string): string {
  return readFileSync(file, "utf8");
}

/** Files that opt into running in the browser. */
function clientFiles(): string[] {
  return sourceFiles().filter((file) =>
    /^\s*["']use client["']/.test(read(file)),
  );
}

describe("The Cloudflare credential never leaves the server", () => {
  it("is read in exactly one module", () => {
    const readers = sourceFiles().filter((file) =>
      /CLOUDFLARE_API_TOKEN/.test(read(file)),
    );
    // The runbook and the ADR name it too, but those are documents. In source,
    // one reader means one place to audit and one place that can leak it.
    expect(readers.map(rel)).toEqual(["lib/deploy/config.ts"]);
  });

  it("keeps every server-only variable out of client components", () => {
    const offenders: string[] = [];
    for (const file of clientFiles()) {
      const text = read(file);
      for (const name of SERVER_ONLY_ENV) {
        if (text.includes(name)) offenders.push(`${rel(file)}: ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the deployment client and its config out of client components", () => {
    const offenders: string[] = [];
    for (const file of clientFiles()) {
      const text = read(file);
      for (const specifier of [
        "@/lib/deploy/config",
        "@/lib/deploy/cloudflare",
        "@/lib/deploy/transport",
        "@/lib/admin/deployments",
      ]) {
        if (text.includes(specifier)) {
          offenders.push(`${rel(file)}: ${specifier}`);
        }
      }
    }
    // `components/admin/DeploymentControls.tsx` is a client component and takes
    // its server actions as props for exactly this reason: a bound action is a
    // reference the browser can invoke, not code the browser can read.
    expect(offenders).toEqual([]);
  });

  it("never returns the credential from an exported type", () => {
    // `DeployConfig` carries the token, so anything handing one to a page is a
    // step away from rendering it. Only these two may see it.
    const holders = sourceFiles().filter((file) =>
      /\bDeployConfig\b/.test(read(file)),
    );
    expect(holders.map(rel).sort()).toEqual([
      "lib/deploy/cloudflare.ts",
      "lib/deploy/config.ts",
    ]);
  });
});

describe("No test can reach the real Cloudflare API", () => {
  it("leaves the live transport unimported by every test", () => {
    const tests = walk(join(ROOT, "tests")).filter((file) =>
      /\.(ts|tsx)$/.test(file),
    );
    const offenders = tests.filter((file) =>
      // This file names the module in prose above; the import form is what
      // would actually reach the network.
      /from ["']@\/lib\/deploy\/transport["']/.test(read(file)),
    );
    expect(offenders.map(rel)).toEqual([]);
  });

  it("gives the client no default transport to fall back to", () => {
    // `typeof globalThis.fetch` in the transport interface is a type, and
    // fine. What must not exist is an actual *call* to the global, or a default
    // that supplies one — either would make forgetting the mock silently
    // correct-looking, and the mistake would only surface as a real production
    // build somebody did not ask for.
    for (const path of ["lib/deploy/cloudflare.ts", "lib/deploy/verify.ts"]) {
      const text = read(join(ROOT, path));
      expect(text, `${path} calls the global fetch`).not.toMatch(
        /globalThis\.fetch\s*\(/,
      );
      expect(text, `${path} defaults its transport`).not.toMatch(
        /(=|\?\?)\s*globalThis\.fetch\b(?!\s*[;,)])/,
      );
    }

    // And the one module that does supply the real network supplies only that.
    const transport = read(join(ROOT, "lib/deploy/transport.ts"));
    expect(transport).toMatch(/globalThis\.fetch\s*\(/);
  });
});

describe("Deployment fails closed when unconfigured", () => {
  it("is unavailable with an empty environment", () => {
    expect(deployAvailability({})).toEqual({
      available: false,
      reason: "no-api-token",
    });
  });

  it("names each missing piece in turn rather than half-configuring", () => {
    expect(deployAvailability({ CLOUDFLARE_API_TOKEN: "t" })).toMatchObject({
      available: false,
      reason: "no-account-id",
    });
    expect(
      deployAvailability({ CLOUDFLARE_API_TOKEN: "t", CLOUDFLARE_ACCOUNT_ID: "a" }),
    ).toMatchObject({ available: false, reason: "no-trigger-id" });
  });

  it("treats blank values as absent", () => {
    expect(
      deployAvailability({
        CLOUDFLARE_API_TOKEN: "   ",
        CLOUDFLARE_ACCOUNT_ID: "a",
        CLOUDFLARE_BUILDS_TRIGGER_ID: "t",
      }),
    ).toMatchObject({ available: false, reason: "no-api-token" });
  });

  /**
   * The worker tag is optional, and it must stay optional: it buys build-status
   * diagnostics, and Live is proven by the manifest. Making it required would
   * also force the token to carry Workers Scripts: Read, which is the
   * permission configuring the tag exists to avoid.
   */
  it("is available without a worker tag", () => {
    const availability = deployAvailability({
      CLOUDFLARE_API_TOKEN: "token",
      CLOUDFLARE_ACCOUNT_ID: "account",
      CLOUDFLARE_BUILDS_TRIGGER_ID: "trigger",
    });
    expect(availability.available).toBe(true);
    expect(availability.available && availability.config.workerTag).toBeNull();
  });
});
