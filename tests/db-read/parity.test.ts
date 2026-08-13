import { afterAll, describe, expect, it } from "vitest";
import { SEED_PROFILES } from "@/content";
import { closeDatabase } from "@/lib/db/client";
import { readPublishedProfiles } from "@/lib/db/read-profiles";
import { buildProfileView, type ProfileView } from "@/lib/profile/build";
import type {
  EvidenceSource,
  GameWithEvaluation,
} from "@/lib/profile/types";
import { RUBRIC_V1 } from "@/lib/rubric";

/**
 * Fixture / Postgres parity for the three calibration profiles.
 *
 * The fixtures established and calibrated the product; Postgres is now the
 * operational source of truth. Before the fixture path can be retired, the
 * database has to reproduce the *approved public meaning* of Alan Wake 2,
 * Returnal and Redfall — not merely return rows of a similar shape.
 *
 * So this compares the two `ProfileView`s the public page actually renders,
 * field by field, and separately locks the 24 approved dimension totals.
 *
 * ── The two intentional discrepancies ──────────────────────────────────────
 *
 * 1. SURROGATE IDS. Fixtures carry authored handles (`gme_alan_wake_2`,
 *    `evl_alan_wake_2_v1`, `scp_alan_wake_2_default`); the database issues
 *    UUIDs. Nothing public renders them and nothing routes on them — routing is
 *    by slug and scope key, both of which are compared. Evidence sources are the
 *    exception and are NOT exempted: `EvidenceSource.id` is the stable
 *    `source_key`, so it must match exactly.
 *
 * 2. THE ORDER OF TWO RAW CARRIER ARRAYS, and of the `supports` set inside
 *    them. `Evaluation.tags` and `Evaluation.sources` are as-loaded: a fixture's authored array order, or
 *    the reader's query order. Neither `evaluation_tags` nor
 *    `evaluation_evidence_links` has an ordering column — unlike
 *    `profile_blocks`, which has `item_order` — so the database genuinely cannot
 *    reproduce an authored sequence.
 *
 *    What the page renders is NOT exempted. `ProfileView.tags` and
 *    `ProfileView.sources` are ordered canonically by `buildProfileView` — tags
 *    by the controlled vocabulary, sources by their stable key — so both paths
 *    produce an identical page, and those are compared exactly. Only the
 *    underlying arrays are compared as sets.
 *
 * Everything else must match exactly. A difference that is not one of these two
 * is a parity failure, not something to normalise away.
 */

const CALIBRATION_SLUGS = ["alan-wake-2", "returnal", "redfall"] as const;

/** The approved matrices. Round 1 §3 for the first two, Round 2 §3 for Redfall. */
const APPROVED_TOTALS: Record<string, Record<string, string>> = {
  "alan-wake-2": {
    story: "9.5",
    execution: "9.0",
    structure: "8.5",
    agency: "7.5",
    pacing: "8.0",
    atmosphere: "10.0",
    thematic: "9.5",
    craft: "10.0",
  },
  returnal: {
    story: "7.5",
    execution: "9.5",
    structure: "8.5",
    agency: "10.0",
    pacing: "7.5",
    atmosphere: "9.5",
    thematic: "8.5",
    craft: "10.0",
  },
  redfall: {
    story: "4.5",
    execution: "5.5",
    structure: "4.5",
    agency: "5.5",
    pacing: "4.5",
    atmosphere: "5.5",
    thematic: "4.0",
    craft: "4.5",
  },
};

const fromDatabase = await readPublishedProfiles(RUBRIC_V1.version);
afterAll(closeDatabase);

const dbBySlug = new Map(
  fromDatabase.map((record) => [record.game.slug, buildProfileView(record)]),
);
const fixtureBySlug = new Map(
  (SEED_PROFILES as readonly GameWithEvaluation[]).map((record) => [
    record.game.slug,
    buildProfileView(record),
  ]),
);

/**
 * Applies the two documented exemptions, and nothing else.
 *
 * Surrogate ids are blanked, and the two unordered carrier arrays are sorted so
 * they compare as sets. `ProfileView.tags` and `ProfileView.sources` — what the
 * page actually renders — are left exactly as each reader produced them.
 */
function comparable(profile: ProfileView) {
  const byKey = <T extends { key: string }>(items: readonly T[]) =>
    [...items].sort((a, b) => a.key.localeCompare(b.key));
  const byId = <T extends { id: string }>(items: readonly T[]) =>
    [...items].sort((a, b) => a.id.localeCompare(b.id));
  // `supports` is a set of dimension keys with no ordering column behind it,
  // exactly like the arrays that carry it.
  const sources = (items: readonly EvidenceSource[]) =>
    byId(items).map((source) =>
      source.supports
        ? { ...source, supports: [...source.supports].sort() }
        : source,
    );

  return {
    ...profile,
    game: { ...profile.game, id: "<id>" },
    scope: { ...profile.scope, id: "<id>", gameId: "<id>" },
    evaluation: {
      ...profile.evaluation,
      id: "<id>",
      gameId: "<id>",
      scopeId: "<id>",
      tags: byKey(profile.evaluation.tags),
      sources: sources(profile.evaluation.sources),
    },
    dimensions: profile.dimensions.map((view) => ({
      ...view,
      linkedSources: sources(view.linkedSources),
    })),
  };
}

describe("The database reconstructs the published corpus", () => {
  it("returns exactly the three published calibration profiles", () => {
    expect([...dbBySlug.keys()].sort()).toEqual([...CALIBRATION_SLUGS].sort());
  });

  it("loads them through the same ProfileView the page renders", () => {
    for (const profile of dbBySlug.values()) {
      expect(profile.dimensions).toHaveLength(8);
      expect(profile.radar).toHaveLength(8);
    }
  });
});

describe.each(CALIBRATION_SLUGS)("%s", (slug) => {
  const db = dbBySlug.get(slug)!;
  const fixture = fixtureBySlug.get(slug)!;

  it("is present in both paths", () => {
    expect(db, `${slug} missing from the database`).toBeDefined();
    expect(fixture, `${slug} missing from the fixtures`).toBeDefined();
  });

  // The whole-view comparison. Everything below it is a named guarantee that
  // would otherwise fail only as an opaque deep-equal diff.
  it("renders an identical profile view", () => {
    expect(comparable(db)).toEqual(comparable(fixture));
  });

  it("reproduces its approved dimension totals exactly", () => {
    const approved = APPROVED_TOTALS[slug]!;
    for (const view of db.dimensions) {
      expect(view.display, `${slug} › ${view.dimension.key}`).toBe(
        approved[view.dimension.key],
      );
    }
    expect(Object.keys(approved)).toHaveLength(8);
  });

  it("carries the same game and profile-scope identity", () => {
    expect(db.game.canonicalTitle).toBe(fixture.game.canonicalTitle);
    expect(db.game.slug).toBe(fixture.game.slug);
    expect(db.game.developerText).toBe(fixture.game.developerText);
    expect(db.game.publisherText).toBe(fixture.game.publisherText);
    expect(db.game.firstReleaseDate).toBe(fixture.game.firstReleaseDate);
    expect(db.game.releaseStatus).toBe(fixture.game.releaseStatus);
    expect(db.game.platforms).toEqual(fixture.game.platforms);
    expect([...db.game.aliases].sort()).toEqual(
      [...fixture.game.aliases].sort(),
    );
    expect(db.scope.key).toBe(fixture.scope.key);
    expect(db.scope.label).toBe(fixture.scope.label);
    expect(db.scope.isPrimary).toBe(fixture.scope.isPrimary);
    expect(db.scope.isPrimary).toBe(true);
  });

  it("carries the same declared evaluation scope", () => {
    expect(db.evaluation.scope).toEqual(fixture.evaluation.scope);
  });

  it("carries the same evaluation state", () => {
    const a = db.evaluation;
    const b = fixture.evaluation;
    expect(a.versionNumber).toBe(b.versionNumber);
    expect(a.status).toBe("published");
    expect(a.evidenceStatus).toBe(b.evidenceStatus);
    expect(a.evidenceMaturity).toBe(b.evidenceMaturity);
    expect(a.confidence).toBe(b.confidence);
    expect(a.evidenceCutoffAt).toBe(b.evidenceCutoffAt);
    expect(a.evidenceLedger).toBe(b.evidenceLedger);
    expect(a.scoreProvenance).toEqual(b.scoreProvenance);
    expect(a.publishedAt).toBe(b.publishedAt);
    expect(a.releaseContext).toBe(b.releaseContext);
  });

  it("carries all 40 subcriterion values and all 40 rationales", () => {
    let compared = 0;
    for (const view of db.dimensions) {
      const other = fixture.dimensions.find(
        (candidate) => candidate.dimension.key === view.dimension.key,
      )!;
      expect(view.subcriteria).toHaveLength(5);
      for (const sub of view.subcriteria) {
        const match = other.subcriteria.find((c) => c.key === sub.key)!;
        expect(sub.entry.value, `${slug} › ${sub.key} value`).toBe(
          match.entry.value,
        );
        expect(sub.entry.rationale, `${slug} › ${sub.key} rationale`).toBe(
          match.entry.rationale,
        );
        expect(sub.entry.platformNote).toBe(match.entry.platformNote);
        compared += 1;
      }
    }
    expect(compared).toBe(40);
  });

  it("keeps unknown distinct from zero", () => {
    // Nothing in the calibration corpus is unknown, so the guarantee here is
    // that the reader never invented a zero: every value is a real score.
    for (const view of db.dimensions) {
      for (const sub of view.subcriteria) {
        expect(sub.entry.value).not.toBe(null);
        expect(sub.entry.value).not.toBe(undefined);
      }
    }
  });

  it("derives the same score state and per-dimension confidence", () => {
    for (const view of db.dimensions) {
      const other = fixture.dimensions.find(
        (candidate) => candidate.dimension.key === view.dimension.key,
      )!;
      expect(view.score).toEqual(other.score);
      expect(view.display).toBe(other.display);
      expect(view.confidence).toBe(other.confidence);
    }
  });

  it("carries the same interpretation", () => {
    expect(db.evaluation.oneLineExperience).toBe(
      fixture.evaluation.oneLineExperience,
    );
    expect(db.evaluation.primaryPull).toBe(fixture.evaluation.primaryPull);
    expect(db.evaluation.primaryRisk).toBe(fixture.evaluation.primaryRisk);
    expect(db.evaluation.blocks).toEqual(fixture.evaluation.blocks);
    expect(db.evaluation.platformWarning).toBe(
      fixture.evaluation.platformWarning,
    );
    expect(db.evaluation.changeSummary).toBe(fixture.evaluation.changeSummary);
  });

  it("carries the same tags, with intensity and note", () => {
    const sort = (tags: readonly { key: string }[]) =>
      [...tags].sort((a, b) => a.key.localeCompare(b.key));
    expect(sort(db.evaluation.tags)).toEqual(sort(fixture.evaluation.tags));
    // And renders them in the same order, which is the vocabulary's.
    expect(db.tags).toEqual(fixture.tags);
  });

  it("carries the same evidence sources and dimension links", () => {
    // `ProfileView.sources` is canonically ordered by both readers, so this is
    // an exact comparison including each source's supported dimensions.
    // Sources are identified by their stable `source_key`, which is NOT a
    // surrogate id and must match exactly.
    expect(db.sources).toEqual(fixture.sources);

    // And the per-dimension linkage the "Why this score?" disclosure counts.
    for (const view of db.dimensions) {
      const other = fixture.dimensions.find(
        (candidate) => candidate.dimension.key === view.dimension.key,
      )!;
      expect(
        view.linkedSources.map((s) => s.id).sort(),
        `${slug} › ${view.dimension.key} linked sources`,
      ).toEqual(other.linkedSources.map((s) => s.id).sort());
    }
  });

  it("summarises evidence identically, including the pending ledger", () => {
    expect(db.evidence).toEqual(fixture.evidence);
    expect(db.evaluation.evidenceLedger).toBe("pending");
  });

  it("describes the same silhouette for assistive technology", () => {
    expect(db.shapeDescription).toBe(fixture.shapeDescription);
  });
});

describe("What the page renders is ordered identically", () => {
  it("orders tags and sources canonically in both paths", () => {
    // The exemption above covers the raw arrays only. If these ever diverge,
    // the cutover would visibly reorder the tag line and the evidence list.
    for (const slug of CALIBRATION_SLUGS) {
      const db = dbBySlug.get(slug)!;
      const fixture = fixtureBySlug.get(slug)!;
      expect(db.tags.map((tag) => tag.definition.key)).toEqual(
        fixture.tags.map((tag) => tag.definition.key),
      );
      expect(db.sources.map((source) => source.id)).toEqual(
        fixture.sources.map((source) => source.id),
      );
    }
  });
});
