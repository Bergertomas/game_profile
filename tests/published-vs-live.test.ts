import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

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
 * later Superseded without ever having been served. Phase 2D-1 ships without
 * Live tracking, which makes the wording the only thing standing between an
 * editor and a false belief.
 *
 * ── Two layers, because a word scan is not enough ──────────────────────────
 *
 * The **word scan** catches new uses of "live" in the editorial application and
 * forces each one to be looked at. It cannot judge meaning, so on its own it
 * would happily approve a fluent sentence that is wrong — which is exactly what
 * happened: an earlier version of this file allowlisted
 * `/appears on the live site/`, blessing a claim that publishing changes
 * production immediately.
 *
 * The **false-claim layer** names specific wrong sentences as phrases. It runs
 * over a much wider surface — application code, active tests, README, the
 * Master Plan and the accepted ADRs — because the leaks it exists to catch were
 * found in all of those, and three of them contain no "live" at all. Its
 * previous scope covered application code and four documents, which is why
 * "Live-row uniqueness" sat unnoticed in ADR 0014 and "two live published
 * evaluations" in a test name.
 *
 * Whole-file matching, not line-by-line: several of these were line-wrapped in
 * the prose that carried them.
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
  "app/admin",
  "components/admin",
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
  /"live" must not/,
  /publication versus live deployment/,
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
    for (const file of editorialFiles()) {
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
