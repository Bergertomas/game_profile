import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Published is not Live, and the editorial tool must not say otherwise.
 *
 * Master Plan §9.8 makes these separate states on purpose:
 *
 *   Published  the editorial publication transaction has committed;
 *   Live       the deployed production artifact actually serves that version.
 *
 * Public pages are prerendered, so the gap between them is real and can last
 * indefinitely — a publication commits, the next production build fails, and
 * the previous version goes on being served. Phase 2D-1 deliberately ships
 * without Live tracking, which makes the wording the only thing standing
 * between an editor and a false belief that pressing Publish changed the site.
 *
 * This is a regression guard on that wording, and it exists because the first
 * draft of the Publish page said a published evaluation "is the live profile
 * for this scope" — a sentence that is wrong whenever a build has not run since
 * publication, which is *always*, immediately after publishing.
 *
 * ── What this can and cannot check ────────────────────────────────────────
 *
 * It is a text scan, so it cannot judge meaning. What it does is hold the set
 * of places the word appears to a reviewed list: every occurrence is either a
 * design-token identifier or a sentence that draws the distinction rather than
 * collapsing it. A new occurrence fails and has to be looked at.
 */

const ROOT = join(__dirname, "..");
const ADMIN_SOURCES = [
  "lib/admin",
  "app/admin",
  "components/admin",
] as const;

/** Occurrences reviewed and allowed, grouped by why. */
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
  /becomes Live at the next production build/,
  /becomes Live only after a rebuild/,
  /makes a published profile Live is 2D-2/,
  /Live\s+the deployed production artifact/,
  /the new version Published and the previous one Live/,
  /Nothing in this file can make a profile Live/,
  /"live" must not/,
  /publication versus live deployment/,
  // preview.ts, describing what appears on the deployed site after publishing.
  /appears on the live site/,
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function offendingLines(): string[] {
  const offenders: string[] = [];
  for (const source of ADMIN_SOURCES) {
    for (const file of walk(join(ROOT, source))) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (!/\blive\b/i.test(line)) return;
        if (ALLOWED.some((pattern) => pattern.test(line))) return;
        offenders.push(
          `${relative(ROOT, file).replaceAll("\\", "/")}:${index + 1}: ${line.trim()}`,
        );
      });
    }
  }
  return offenders;
}

describe("Published is not Live", () => {
  it("uses no unreviewed 'live' wording anywhere in the editorial tool", () => {
    // A failure here is not necessarily a bug — it is a sentence that has not
    // been checked against §9.8. Either reword it to mean Published, or add it
    // to ALLOWED once it genuinely draws the distinction.
    expect(offendingLines()).toEqual([]);
  });

  it("tells the editor plainly that publishing does not deploy", () => {
    const publishPage = readFileSync(
      join(ROOT, "app/admin/evaluations/[id]/publish/page.tsx"),
      "utf8",
    );

    // The claim an editor most needs, stated on the page where they act.
    expect(publishPage).toContain("Publishing changes the database, not the site");
    expect(publishPage).toMatch(/becomes Live at the next production build/);

    // And it must not have drifted back into asserting the opposite.
    expect(publishPage).not.toMatch(/is the live profile/i);
  });

  it("keeps the publication module's own terminology contract", () => {
    const publication = readFileSync(
      join(ROOT, "lib/admin/publication.ts"),
      "utf8",
    );
    expect(publication).toMatch(/Published\s+this evaluation is the scope's current editorial version/);
    expect(publication).toMatch(/Live\s+the deployed production artifact/);
  });
});
