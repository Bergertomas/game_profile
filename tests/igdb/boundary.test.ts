import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The boundaries issue #48 §9 requires, proved against the repository rather
 * than asserted in prose:
 *
 *   - no runtime or public dependency on IGDB;
 *   - no auto-publication, no editorial score mutation, from the staging layer;
 *   - artwork stays a candidate: the staging schema cannot express clearance;
 *   - the live probe is opt-in only and unreachable from any aggregate script;
 *   - no committed IGDB source carries a credential-shaped string;
 *   - the migration touches no editorial table.
 */

const tracked = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" }).split("\0").filter(Boolean);
const source = (path: string) => readFileSync(path, "utf8");
const IGDB_IMPORT = /from\s+["']@\/lib\/igdb|from\s+["']\.{1,2}\/(?:[^"']*\/)?igdb\//;

describe("no public or runtime surface reaches the provider layer", () => {
  const publicSurfaces = tracked.filter(
    (path) =>
      /\.(ts|tsx|mts|mjs)$/.test(path) &&
      (path.startsWith("app/") ||
        path.startsWith("components/") ||
        path.startsWith("content/") ||
        path.startsWith("lib/data/") ||
        path.startsWith("lib/profile/") ||
        path.startsWith("lib/search/") ||
        path.startsWith("lib/home/") ||
        path.startsWith("lib/compare/") ||
        path.startsWith("lib/seo/") ||
        path === "lib/db/read-profiles.ts" ||
        path === "lib/db/build-seed.ts"),
  );

  it("finds the surfaces to check", () => {
    expect(publicSurfaces.length).toBeGreaterThan(30);
  });

  it("none of them imports lib/igdb", () => {
    for (const path of publicSurfaces) expect(source(path), path).not.toMatch(IGDB_IMPORT);
  });

  it("lib/igdb imports nothing from Next, the app or the editorial write path", () => {
    const modules = tracked.filter((path) => path.startsWith("lib/igdb/") && path.endsWith(".ts"));
    expect(modules.length).toBeGreaterThan(5);
    for (const path of modules) {
      const text = source(path);
      expect(text, path).not.toMatch(/from\s+["']next/);
      expect(text, path).not.toMatch(/from\s+["']@\/(app|components|content|lib\/data|lib\/profile|lib\/admin\/(write|publication|evaluation-write|deployments))/);
    }
  });
});

describe("the staging writer cannot publish, score or clear", () => {
  const writer = source("lib/igdb/staging-write.ts");

  it("never names an editorial table", () => {
    for (const table of ["evaluations", "subcriterionScores", "subcriterionPlatformOverrides", "gameArtwork", "profileScopes", "deploymentRequests", "evaluationRevisions"]) {
      expect(writer, table).not.toMatch(new RegExp(`\\bt\\.${table}\\b`));
    }
    expect(writer).not.toMatch(/insert\(t\.games\)|update\(t\.games\)|delete\(t\.games\)/);
    expect(writer).not.toMatch(/status:\s*["']published["']/);
  });

  it("writes across the boundary only into game_external_ids, and only on an accepted canonical decision", () => {
    const crossings = writer.match(/t\.gameExternalIds/g) ?? [];
    expect(crossings.length).toBeGreaterThan(0);
    const decide = writer.slice(writer.indexOf("export async function decideIdentityCandidate"));
    expect(decide).toContain('decision.state === "accepted" && candidate.role === "canonical_game"');
    expect(writer.slice(0, writer.indexOf("export async function decideIdentityCandidate"))).not.toMatch(/insert\(t\.gameExternalIds\)/);
  });
});

describe("artwork remains a candidate", () => {
  it("the staging schema has no clearance, basis or credit column and the migration adds none", () => {
    const schema = source("lib/db/schema.ts");
    const stagingSection = schema.slice(schema.indexOf("IGDB staging"));
    expect(stagingSection).not.toMatch(/artworkClearanceEnum\(|artworkBasisEnum\(|text\("credit"\)|text\("basis"\)|"clearance"/);
    const migration = source("lib/db/migrations/0011_igdb_staging.sql");
    expect(migration).not.toMatch(/ALTER TABLE "?(games|evaluations|game_artwork|profile_scopes|subcriterion_scores)"?\s/);
    expect(migration).not.toMatch(/artwork_clearance|artwork_basis/);
    expect(migration).not.toMatch(/\bDROP\b/i);
  });
});

describe("the live probe is manual and credential-safe", () => {
  const probe = source("scripts/igdb/probe.ts");

  it("requires --live, refuses CI and requests no game record", () => {
    expect(probe).toContain('argv.includes("--live")');
    expect(probe).toMatch(/env\.CI \|\| env\.GITHUB_ACTIONS/);
    expect(probe).toContain("Refusing to run: a CI environment was detected");
    expect(probe).toContain('client.count("game_types")');
    expect(probe).not.toMatch(/query\(\s*["']games["']/);
  });

  it("prints only through redaction and never a header, secret or token", () => {
    expect(probe).toContain("redactIgdb(JSON.stringify(report))");
    expect(probe).not.toMatch(/credentials\.(clientId|clientSecret|accessToken)|process\.env\.(IGDB|TWITCH)|console\.log\([^)]*token/);
  });

  it("is not reachable from any aggregate npm script, and no bulk import command exists", () => {
    const pkg = JSON.parse(source("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts["igdb:probe"]).toContain("scripts/igdb/probe.ts");
    for (const [name, command] of Object.entries(pkg.scripts)) {
      if (name === "igdb:probe") continue;
      expect(command, `${name} must not invoke the probe`).not.toContain("igdb/probe");
    }
    for (const command of Object.values(pkg.scripts)) expect(command).not.toMatch(/igdb:(import|sync|refresh|bulk)/);
    expect(source(".github/workflows/ci.yml")).not.toMatch(/igdb:probe|igdb:stage-proof|IGDB_CLIENT/);
  });
});

describe("committed IGDB source carries no credential", () => {
  it("no file under lib/igdb, scripts/igdb or tests/igdb contains a credential-shaped string", () => {
    const files = tracked.filter((path) => /^(lib|scripts|tests)\/igdb\//.test(path));
    expect(files.length).toBeGreaterThan(10);
    for (const path of files) {
      const text = source(path);
      expect(text, path).not.toMatch(/\b[a-z0-9]{30}\b(?![-_])/); // a Twitch client id/secret is 30 lowercase alphanumerics
      expect(text, path).not.toMatch(/Bearer\s+[A-Za-z0-9]{30,}/);
    }
  });

  it("the staging proof fixture names no calibration or holdout title", () => {
    const fixture = source("lib/igdb/fixtures/staging-proof.ts").toLowerCase();
    for (const title of ["alan wake", "battlefield", "zelda", "banishers", "hellblade", "saros", "resident evil", "kingdom come", "astro bot", "immortals"]) {
      expect(fixture).not.toContain(title);
    }
  });
});
