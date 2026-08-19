import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluationStatusEnum } from "@/lib/db/schema";

/**
 * Published is not Live, and nothing anyone reads may say otherwise.
 *
 * Master Plan §9.8 makes three separate states:
 *
 *   Published   the editorial publication transaction committed in Postgres;
 *   Superseded  immutable editorial publication history;
 *   Live        the deployed production artifact actually serves that version.
 *
 * Publication alone never proves the third. Public pages are prerendered, so a
 * version becomes Live only if a later build reads it, verification succeeds,
 * AND that artifact deploys. Any of those can fail or simply not happen — a
 * build that runs and fails changes nothing, and a version can be Published and
 * later Superseded without ever having been served.
 *
 * ── What Phase 2D-2 changed about this guard ──────────────────────────────
 *
 * 2D-1 tracked only Published, so ANY use of "live" in the editorial
 * application was suspicious and the word scan could cover all of it. 2D-2
 * added deployment tracking, and those modules are *about* Live: they read it
 * back from the deployed artifact, derive it, and display it. Holding them to a
 * word allowlist would mean forty entries that bless nothing in particular,
 * which is an allowlist that has stopped meaning anything.
 *
 * So the scan was split rather than widened:
 *
 *   publication surfaces   word-scanned. Here "live" still must not appear
 *                          meaning "published"; these modules have no business
 *                          with deployment at all.
 *   deployment surfaces    exempt from the word scan, and held instead to the
 *                          false-claim layer plus the structural assertions at
 *                          the foot of this file — which are stronger, because
 *                          they check what the code DOES, not how it reads.
 *
 * ── Three layers ──────────────────────────────────────────────────────────
 *
 * The **word scan** forces each new "live" in a publication surface to be
 * looked at. It cannot judge meaning, so on its own it would happily approve a
 * fluent sentence that is wrong — which is exactly what happened: an earlier
 * version of this file allowlisted `/appears on the live site/`, blessing a
 * claim that publishing changes production immediately.
 *
 * The **false-claim layer** names specific wrong sentences as phrases. It runs
 * over a much wider surface — application code, active tests, README, the
 * Master Plan and the accepted ADRs — because the leaks it exists to catch were
 * found in all of those, and three of them contain no "live" at all. Its
 * previous scope covered application code and four documents, which is why
 * "Live-row uniqueness" sat unnoticed in ADR 0014 and "two live published
 * evaluations" in a test name.
 *
 * The **structural layer** is new with 2D-2 and does not read prose at all. It
 * asserts that `live` never becomes an evaluation status, and that exactly one
 * function in the codebase can record production as verified. Wording can be
 * corrected in a commit; a second writer of that event would be a design that
 * had quietly decided a build report is proof.
 *
 * Whole-file matching for the phrases, not line-by-line: several of these were
 * line-wrapped in the prose that carried them.
 */

const ROOT = join(__dirname, "..");

/**
 * Application text an editor reads directly.
 *
 * `lib/validation` belongs here even though it is not under `lib/admin`: its
 * `ValidationIssue` messages render verbatim on the Publish page, so they are
 * editorial copy whatever directory they live in.
 */
const EDITORIAL_SOURCES = [
  "lib/admin",
  "lib/validation",
  "lib/deploy",
  "app/admin",
  "components/admin",
] as const;

/**
 * The surfaces that legitimately talk about Live, exempt from the WORD scan.
 *
 * Exempt from that scan only. Every one of these is still read by the
 * false-claim layer and by the structural assertions, which is where the real
 * guarantees live — the word scan was never able to tell "Live is derived from
 * the artifact's manifest" from "the build succeeded, so it is Live", and those
 * two sentences are the entire question.
 *
 * Adding a file here is a decision that the file's subject IS deployment. It is
 * not a way to quieten a publication surface that has started making claims
 * about production.
 */
const DEPLOYMENT_SOURCES = [
  "lib/admin/deployments.ts",
  "lib/deploy/manifest.ts",
  "lib/deploy/build-manifest.ts",
  "lib/deploy/verify.ts",
  "lib/deploy/cloudflare.ts",
  "lib/deploy/config.ts",
  "lib/deploy/transport.ts",
  "app/admin/deployments/page.tsx",
  "app/admin/deployment-actions.ts",
  "components/admin/DeploymentControls.tsx",
] as const;

/**
 * Current normative prose.
 *
 * Accepted ADRs are included because they are read as current authority, and
 * because two of the leaks this guard now catches were in one. Superseded
 * Master Plans and historical migrations are deliberately absent: their wording
 * is a record of what was decided then, and rewriting it would obscure history
 * rather than correct it.
 */
const NORMATIVE_DOCS = [
  "README.md",
  "docs/Game_Profile_Master_Product_and_Build_Plan_v0.8.md",
  "docs/decisions/0009-final-evaluation-and-rubric-integrity.md",
  "docs/decisions/0014-profile-scopes.md",
  "docs/decisions/0016-canonical-scope-urls.md",
  "docs/decisions/0018-admin-access.md",
  "docs/decisions/0020-publication-preview-and-deploy-trigger.md",
  "docs/decisions/0021-hyperdrive-is-the-deployed-admin-transport.md",
  "docs/decisions/0022-deployment-requests-and-proof-of-live.md",
] as const;

/** This file. Its regexes read as the very prose it forbids. */
const SELF = "tests/published-vs-live.test.ts";

/**
 * Claims that are false under §9.8, as phrases.
 *
 * Every one was real prose in this branch at some point, which is why they are
 * listed rather than described.
 */
const FALSE_CLAIMS: readonly { pattern: RegExp; why: string }[] = [
  // ── Publication presented as deployment ─────────────────────────────────
  {
    pattern: /becomes Live at the next production build/i,
    why: "a build may not run, may fail verification, or may fail to deploy",
  },
  {
    pattern: /a build having run/i,
    why: "a build that runs and fails changes nothing; it must also verify and deploy",
  },
  {
    pattern: /live site the moment/i,
    why: "publication changes the database; production changes on deployment",
  },
  {
    pattern: /\bthe instant\b[^.]{0,60}\bpublish/i,
    why: "nothing about production happens at the instant a publication commits",
  },
  {
    pattern: /When published, this profile would answer at/i,
    why: "owning a canonical path is not the same as production serving it",
  },
  {
    pattern: /would serve if this version were the published one/i,
    why: "implies publication alone changes what production serves",
  },
  {
    pattern: /record of what was public/i,
    why: "Published/Superseded is the editorial record, not proof of serving",
  },

  // ── "Live" used where the rule is about Published rows ──────────────────
  {
    pattern: /\blive[- ]row\b/i,
    why: "the uniqueness rule is over Published rows, not deployed ones",
  },
  {
    pattern: /live published evaluation/i,
    why: "the rule is one Published evaluation per (scope, rubric) lineage",
  },
  {
    pattern: /two live\s+profiles/i,
    why: "two Published profiles; deployment is not what the constraint governs",
  },
  {
    pattern: /\btwo live rows\b/i,
    why: "the rule is Published rows, not deployed ones",
  },
  {
    pattern: /one live (row|evaluation|profile)\b/i,
    why: "the rule is Published rows, not deployed ones",
  },
  {
    pattern: /only one may be live/i,
    why: "the rule is one Published row per (scope, rubric)",
  },
  {
    pattern: /is the live profile for this scope/i,
    why: "the original regression: Published presented as Live",
  },
];

/**
 * Occurrences of the word allowed in the editorial application.
 *
 * Deliberately narrow. Nothing here may bless a claim that publishing changes
 * production — `FALSE_CLAIMS` exists to prevent that, and an allowlist entry
 * contradicting it would silently win.
 */
const ALLOWED = [
  // ── The design token, not a deployment state ────────────────────────────
  // `tone="live"` is a visual weight in components/admin/ui.tsx, applied to
  // published counts, primary-scope pills, cleared artwork and exact scores
  // alike. Renaming it across every admin page would be churn unrelated to
  // this distinction.
  /tone="live"/,
  /tone={[^}]*"live"/,
  /^\s*\? "live"$/,
  /^\s*live:/,
  /"neutral" \| "live"/,

  // ── The verb, not the adjective ─────────────────────────────────────────
  // "the invariants live in Postgres", "this is not where the rules live".
  /\blive[sd]?\s+in\b/,
  /where the rules live\b/,

  // ── Sentences that draw the distinction rather than collapse it ─────────
  /Published and Live/,
  // Wrapped across lines in the publish page, so matched without "becomes".
  /Live only if a later production build/,
  /becomes Live only after a rebuild/,
  /makes a published profile Live is 2D-2/,
  /Live\s+the deployed production artifact/,
  /the new version Published and the previous one Live/,
  /Nothing in this file can make a profile Live/,
  /"live" must (still )?not/,
  /publication versus live deployment/,

  // ── Added with 2D-2, each drawing the distinction rather than blurring it ─
  // publication.ts, saying where Live comes from and that it is not here.
  /Live is derived from evidence read back/,
  // The publish page, explaining why it does not ask about an unpublished row.
  /a draft cannot be Live/,
  // The same page reading the derived status token, not asserting anything.
  /deployment\.status === "live"/,
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function rel(file: string): string {
  return relative(ROOT, file).replaceAll("\\", "/");
}

function editorialFiles(): string[] {
  return EDITORIAL_SOURCES.flatMap((source) =>
    walk(join(ROOT, source)).filter((file) => /\.(ts|tsx)$/.test(file)),
  );
}

/** Editorial files whose subject is publication rather than deployment. */
function publicationFiles(): string[] {
  const exempt = new Set<string>(DEPLOYMENT_SOURCES);
  return editorialFiles().filter((file) => !exempt.has(rel(file)));
}

/**
 * Active tests and their comments — this file excluded, see `SELF`.
 *
 * `.sh` is included, not an oversight to tidy later: `tests/db/regression.sh`
 * is the database contract suite, its `expect`/`reject` labels are the names
 * the run prints, and four of them said "live row" where the rule is about
 * Published rows.
 */
function testFiles(): string[] {
  return walk(join(ROOT, "tests"))
    .filter((file) => /\.(ts|tsx|sh)$/.test(file))
    .filter((file) => rel(file) !== SELF);
}

/**
 * Schema and migration-adjacent source whose comments describe the rules.
 *
 * `lib/db/schema.ts` is not editorial copy — nobody reads it in the admin — but
 * it is current normative prose about what the constraints mean, and it said
 * "keyed the live row on the game". Migrations themselves stay out: their
 * comments are a record of what was decided at the time.
 */
const SCHEMA_PROSE = ["lib/db/schema.ts", "lib/db/read-profiles.ts"] as const;

function read(file: string): string {
  return readFileSync(file, "utf8");
}

describe("Published is not Live", () => {
  it("uses no unreviewed 'live' wording anywhere an editor reads", () => {
    const offenders: string[] = [];
    for (const file of publicationFiles()) {
      read(file)
        .split("\n")
        .forEach((line, index) => {
          if (!/\blive\b/i.test(line)) return;
          if (ALLOWED.some((pattern) => pattern.test(line))) return;
          offenders.push(`${rel(file)}:${index + 1}: ${line.trim()}`);
        });
    }

    // A failure here is not necessarily a bug — it is a sentence nobody has
    // checked against §9.8. Reword it to mean Published, or add it to ALLOWED
    // once it genuinely draws the distinction. Never add one that does not.
    expect(offenders).toEqual([]);
  });

  it("makes none of the false claims, in application code, tests, or current docs", () => {
    const sources = [
      ...editorialFiles(),
      ...testFiles(),
      ...SCHEMA_PROSE.map((file) => join(ROOT, file)),
      ...NORMATIVE_DOCS.map((doc) => join(ROOT, doc)),
    ];

    const offenders: string[] = [];
    for (const file of sources) {
      const text = read(file);
      for (const claim of FALSE_CLAIMS) {
        if (claim.pattern.test(text)) {
          offenders.push(`${rel(file)}: ${claim.pattern} — ${claim.why}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("tells the editor plainly that publishing does not deploy", () => {
    const publishPage = read(
      join(ROOT, "app/admin/evaluations/[id]/publish/page.tsx"),
    );

    expect(publishPage).toContain(
      "Publishing changes the database, not the site",
    );
    // The qualification is the point: not "at the next build", but only if one
    // runs, verifies AND deploys.
    expect(publishPage).toMatch(/becomes\s+Live only if a later production build/);
    expect(publishPage).toMatch(/verification succeeds/);
    expect(publishPage).toMatch(/deploys successfully/);

    // The shorter status notice must carry the same three conditions as the
    // detailed one below it, or an editor reading only the top of the page gets
    // a weaker claim than the page actually makes.
    expect(publishPage).toMatch(
      /needs a later production build to read it, verify, and deploy successfully/,
    );
  });

  it("keeps the publication module's own terminology contract", () => {
    const publication = read(join(ROOT, "lib/admin/publication.ts"));
    expect(publication).toMatch(
      /Published\s+this evaluation is the scope's current editorial version/,
    );
    expect(publication).toMatch(/Live\s+the deployed production artifact/);
  });

  it("describes the preview as prospective about the corpus, not production", () => {
    const preview = read(join(ROOT, "lib/admin/preview.ts"));
    expect(preview).toMatch(/database corpus/i);
    expect(preview).toMatch(/does not change what production serves/i);
  });

  it("does not present Published or Superseded rows as proof of serving", () => {
    const history = read(
      join(ROOT, "app/admin/scopes/[scopeId]/history/page.tsx"),
    );
    expect(history).toMatch(/editorial publication\s+record/);
    expect(history).toMatch(/not the same\s+as having been served/);
  });
});

describe("A non-public rubric generation is not called earlier", () => {
  /**
   * "An earlier rubric generation" is false while a newer rubric is being
   * authored before it becomes the public one — the state every rubric
   * migration passes through, and the one `tests/admin/rubric-generations.test.ts`
   * describes. Nothing in the page derives direction from the locked dates
   * *relative to the public rubric*, so it may not claim one.
   */
  it("uses direction-neutral wording for any rubric the public site does not read", () => {
    const history = read(
      join(ROOT, "app/admin/scopes/[scopeId]/history/page.tsx"),
    );

    // The description shown for a non-public generation.
    expect(history).toContain(
      "This is not the rubric currently read by the public site.",
    );

    // And it claims no direction. The words appear in this file's own
    // explanation above, which is why only the page is read here.
    expect(history).not.toMatch(/An earlier rubric generation/);
    expect(history).not.toMatch(/A later rubric generation/);
  });
});

/**
 * The structural layer: what the code does, not how it reads.
 *
 * Prose can be corrected in a commit. These two properties cannot drift without
 * the design having changed, and each of them is a locked decision rather than
 * a preference.
 */
describe("Live is derived, and cannot become a status", () => {
  /**
   * Master Plan §9.8 and the 2D-2 brief both lock this: `Live` must not become
   * another evaluation status.
   *
   * It is the tempting shape and it is wrong three times over —
   * `trg_evaluation_snapshot_immutable` permits exactly two transitions and a
   * third value would need a hole in it; published snapshots are immutable
   * while Live changes without the evaluation changing at all (a rollback, a
   * later build); and Published is a fact this database owns while Live is a
   * fact about a remote artifact that can stop being provable. One column
   * asserting they are the same kind of thing is the error.
   */
  it("keeps 'live' out of the evaluation status vocabulary", () => {
    expect(evaluationStatusEnum.enumValues).toEqual([
      "draft",
      "review",
      "published",
      "superseded",
    ]);
  });

  /**
   * Exactly one function may record production as verified.
   *
   * `production_verified` is the event the Live derivation reads, so whatever
   * writes it decides what Live means. `verifyProduction` writes it, and only
   * after `readProductionManifest` has fetched the artifact's own manifest,
   * parsed it, recomputed its digest and confirmed it is a production build.
   *
   * A second writer would almost certainly be a build-status handler, because
   * that is where the temptation is: Cloudflare says the build succeeded, so
   * mark it deployed. That inference is the exact failure §9.8 exists to
   * prevent — a build can succeed and have its upload fail, be superseded by a
   * later build, or be rolled back afterwards. So the count is pinned.
   */
  it("has exactly one writer of production_verified", () => {
    const sources = walk(join(ROOT, "lib"))
      .concat(walk(join(ROOT, "app")))
      .filter((file) => /\.(ts|tsx)$/.test(file));

    const writers = sources.filter((file) =>
      /kind:\s*"production_verified"/.test(read(file)),
    );

    expect(writers.map(rel)).toEqual(["lib/admin/deployments.ts"]);

    const deployments = read(join(ROOT, "lib/admin/deployments.ts"));
    expect(
      deployments.match(/kind:\s*"production_verified"/g) ?? [],
    ).toHaveLength(1);
  });

  /** The one place that fetches the artifact's manifest is the one that proves Live. */
  it("proves Live only from the artifact's own manifest", () => {
    const sources = walk(join(ROOT, "lib"))
      .concat(walk(join(ROOT, "app")))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => rel(file) !== "lib/deploy/verify.ts");

    const callers = sources.filter((file) =>
      /readProductionManifest\(/.test(read(file)),
    );

    // The import in deployments.ts and its single call, and nothing else.
    expect(callers.map(rel)).toEqual(["lib/admin/deployments.ts"]);
  });
});

describe("The deployment page reports absence of evidence as such", () => {
  /**
   * A tool that cannot reach production must not say "awaiting deployment".
   * That sentence asserts production does NOT have the version — which it does
   * not know, and which may be false. The third state is what makes the other
   * two honest.
   */
  it("carries a state for 'we cannot currently tell'", () => {
    const page = read(join(ROOT, "app/admin/deployments/page.tsx"));
    expect(page).toContain("Not proven");
    expect(page).toMatch(/absence of evidence is displayed as the absence of evidence/);
  });

  it("says plainly that a build report is not proof", () => {
    const deployments = read(join(ROOT, "lib/admin/deployments.ts"));
    expect(deployments).toMatch(/a build process exited 0/);
    expect(deployments).toMatch(
      /THE ONLY evidence about what production/,
    );
  });
});
