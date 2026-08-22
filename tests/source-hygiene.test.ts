import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Source that ordinary tooling can actually read.
 *
 * ── What went wrong ────────────────────────────────────────────────────────
 *
 * Three composite-key separators were written as LITERAL NUL bytes in the
 * source — two in `lib/db/read-profiles.ts`, one in `lib/db/build-seed.ts`.
 * Valid TypeScript, behaviourally correct, and invisible to every text tool
 * that decides file type by content: `file(1)` called them data, and `grep`,
 * `git grep` and ripgrep answered `binary file matches` with no line and no
 * context. A repository-wide search for a symbol silently skipped a file that
 * contained it, which is exactly the failure a security or audit scan makes.
 *
 * The bytes are now written as `\\u0000` escapes. Identical at runtime — the
 * same single U+0000 code point, so every key the two files build is byte-for-
 * byte what it was — and legible in source.
 *
 * ── Why a test and not a note ──────────────────────────────────────────────
 *
 * Nothing about writing a literal control byte is difficult to do again, and
 * nothing about it is visible in a diff. This is the check that notices.
 */

const TEXT_SUFFIXES = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".mjs",
  ".js",
  ".jsx",
  ".json",
  ".jsonc",
  ".sql",
  ".sh",
  ".md",
  ".css",
  ".yml",
  ".yaml",
]);

function trackedTextFiles(): string[] {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .filter((path) => TEXT_SUFFIXES.has(path.slice(path.lastIndexOf("."))));
}

describe("Tracked source is text", () => {
  const files = trackedTextFiles();

  it("finds files to check at all", () => {
    // A guard on the guard: a broken listing would make every assertion below
    // pass over an empty set.
    expect(files.length).toBeGreaterThan(100);
  });

  it("contains no literal NUL bytes", () => {
    const offenders = files.filter((path) =>
      readFileSync(path).includes(0x00),
    );

    expect(offenders).toEqual([]);
  });

  /**
   * The two files that used to fail, named explicitly. The sweep above would
   * catch a regression anywhere; this says out loud which files the lesson came
   * from, so a future reader knows the separators there are deliberate.
   */
  it("keeps the composite-key separators legible where they live", () => {
    for (const path of ["lib/db/read-profiles.ts", "lib/db/build-seed.ts"]) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain("\\u0000");
      expect(readFileSync(path).includes(0x00)).toBe(false);
    }
  });

  /**
   * The property that actually matters to a person: `git grep` prints the line.
   * Asserted through the tool itself rather than by reasoning about bytes,
   * because the tool's own heuristic is the thing that was failing.
   */
  it("lets git grep report matches with line numbers", () => {
    const found = execFileSync(
      "git",
      ["grep", "-n", "assertSchemaIsCurrent", "--", "lib/db/read-profiles.ts"],
      { encoding: "utf8" },
    );

    expect(found).toMatch(/^lib\/db\/read-profiles\.ts:\d+:/m);
    expect(found).not.toContain("binary file matches");
  });
});
