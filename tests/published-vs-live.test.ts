import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Published is not Live, and nothing the editor reads may say otherwise.
 *
 * Master Plan §9.8 makes three separate states:
 *
 *   Published   the editorial publication transaction committed in Postgres;
 *   Superseded  an immutable snapshot that was Published and has been replaced;
 *   Live        the deployed production artifact actually serves that version.
 *
 * Publication alone never proves the third. Public pages are prerendered, so a
 * version becomes Live only if a later build reads it, verification succeeds,
 * and that artifact deploys. Any of those can fail or simply not happen — a
 * version can be Published and later Superseded without ever having been
 * served. Phase 2D-1 ships without Live tracking, which makes the wording the
 * only thing standing between an editor and a false belief.
 *
 * ── Two layers, because a word scan is not enough ──────────────────────────
 *
 * The scan below catches *new* uses of the word and forces each one to be
 * looked at. It cannot judge meaning, so on its own it would happily approve a
 * fluent sentence that is wrong — which is exactly what happened: an earlier
 * version of this file allowlisted `/appears on the live site/`, blessing a
 * claim that publishing changes production immediately.
 *
 * So the second layer names the specific false claims, as phrases, and asserts
 * they appear nowhere. Those are regressions with a known shape; the scan is
 * for the ones that do not have one yet.
 */

const ROOT = join(__dirname, "..");

/**
 * Everything whose text an editor can end up reading.
 *
 * `lib/validation` belongs here even though it is not under `lib/admin`: its
 * `ValidationIssue` messages are rendered verbatim on the Publish page, so they
 * are editorial copy whatever directory they live in. Leaving it out is how
 * "only one may be live" survived the first pass of this guard.
 */
const EDITORIAL_SOURCES = [
  "lib/admin",
  "lib/validation",
  "app/admin",
  "components/admin",
] as const;

/** Current normative prose. Historical migrations are deliberately excluded. */
const NORMATIVE_DOCS = [
  "README.md",
  "docs/Game_Profile_Master_Product_and_Build_Plan_v0.8.md",
  "docs/decisions/0020-publication-preview-and-deploy-trigger.md",
  "docs/decisions/0021-hyperdrive-is-the-deployed-admin-transport.md",
] as const;

/**
 * Claims that are false under §9.8, as phrases.
 *
 * Every one of these was real prose in this branch at some point. They are
 * listed rather than described because a scan for the word "live" does not
 * catch most of them — three contain no such word at all.
 */
const FALSE_CLAIMS: readonly { pattern: RegExp; why: string }[] = [
  {
    pattern: /becomes Live at the next production build/i,
    why: "a build may not run, may fail verification, or may fail to deploy",
  },
  {
    pattern: /live site the moment/i,
    why: "publication changes the database; production changes on deployment",
  },
  {
    pattern: /record of what was public/i,
    why: "Published/Superseded is the editorial record, not proof of serving",
  },
  {
    pattern: /only one may be live/i,
    why: "the rule is one Published row per (scope, rubric)",
  },
  {
    pattern: /\btwo live rows\b/i,
    why: "the rule is Published rows, not deployed ones",
  },
  {
    pattern: /one live (row|evaluation)\b/i,
    why: "the rule is Published rows, not deployed ones",
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
    pattern: /is the live profile for this scope/i,
    why: "the original regression: Published presented as Live",
  },
];

/**
 * Occurrences of the word that are reviewed and allowed.
 *
 * Kept deliberately narrow. Nothing here may bless a claim that publishing
 * changes production — that is what `FALSE_CLAIMS` exists to prevent, and an
 * allowlist entry that contradicted it would silently win.
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

function editorialFiles(): string[] {
  return EDITORIAL_SOURCES.flatMap((source) =>
    walk(join(ROOT, source)).filter((file) => /\.(ts|tsx)$/.test(file)),
  );
}

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
          offenders.push(
            `${relative(ROOT, file).replaceAll("\\", "/")}:${index + 1}: ${line.trim()}`,
          );
        });
    }

    // A failure here is not necessarily a bug — it is a sentence nobody has
    // checked against §9.8. Reword it to mean Published, or add it to ALLOWED
    // once it genuinely draws the distinction. Never add one that does not.
    expect(offenders).toEqual([]);
  });

  it("makes none of the specific false claims, in code or in current docs", () => {
    const sources = [
      ...editorialFiles(),
      ...NORMATIVE_DOCS.map((doc) => join(ROOT, doc)),
    ];

    const offenders: string[] = [];
    for (const file of sources) {
      const text = read(file);
      for (const claim of FALSE_CLAIMS) {
        if (claim.pattern.test(text)) {
          offenders.push(
            `${relative(ROOT, file).replaceAll("\\", "/")}: ${claim.pattern} — ${claim.why}`,
          );
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
    // runs, verifies and deploys.
    expect(publishPage).toMatch(/becomes\s+Live only if a later production build/);
    expect(publishPage).toMatch(/verification succeeds/);
    expect(publishPage).toMatch(/deploys successfully/);
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
    // The distinction that the earlier wording lost: prospective with respect
    // to the database a publication would leave, not to what is served.
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
