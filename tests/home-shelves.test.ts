import { describe, expect, it } from "vitest";
import { alanWake2, redfall, returnal } from "@/content";
import {
  assertShelvesAreWellFormed,
  resolveShelves,
  type ShelfDefinition,
} from "@/lib/home/shelves";
import { buildProfileView, type ProfileView } from "@/lib/profile/build";
import type { GameWithEvaluation } from "@/lib/profile/types";

/**
 * THE AUTHORED-SHELF GRAMMAR.
 *
 * The shipped configuration is deliberately thin — objective shelves only, and
 * every qualitative collection awaits owner approval (content/home-shelves.ts)
 * — so almost none of the behaviour below is reachable against the real
 * catalogue. That is exactly why it is tested here: the day an editor adds the
 * first approved collection, the window, the expiry, the fallback and the
 * disappearance rules have to already be right.
 *
 * Every fixture states its own dates. Nothing in this file reads the clock: a
 * suite whose result changes with the calendar is a suite that fails on a
 * Tuesday in March for reasons nobody can reconstruct.
 */

const AUGUST = new Date("2026-09-01T00:00:00Z");

function profile(
  base: GameWithEvaluation,
  overrides: {
    slug?: string;
    scopeKey?: string;
    isPrimary?: boolean;
    publishedAt?: string;
    versionNumber?: number;
    supersedes?: string;
    firstReleaseDate?: string;
    releaseStatus?: GameWithEvaluation["game"]["releaseStatus"];
  } = {},
): ProfileView {
  return buildProfileView({
    ...base,
    game: {
      ...base.game,
      slug: overrides.slug ?? base.game.slug,
      firstReleaseDate: overrides.firstReleaseDate ?? base.game.firstReleaseDate,
      releaseStatus: overrides.releaseStatus ?? base.game.releaseStatus,
    },
    scope: {
      ...base.scope,
      key: overrides.scopeKey ?? base.scope.key,
      isPrimary: overrides.isPrimary ?? base.scope.isPrimary,
    },
    evaluation: {
      ...base.evaluation,
      publishedAt: overrides.publishedAt ?? base.evaluation.publishedAt,
      versionNumber: overrides.versionNumber ?? base.evaluation.versionNumber,
      ...(overrides.supersedes
        ? { supersedesEvaluationId: overrides.supersedes }
        : {}),
    },
  });
}

/** Five profiles, so a shelf can select a subset rather than everything. */
const NEW = profile(alanWake2, { slug: "new-one", publishedAt: "2026-08-30" });
const NEWER = profile(returnal, { slug: "new-two", publishedAt: "2026-08-31" });
const OLD = profile(redfall, { slug: "old-one", publishedAt: "2025-01-04" });
const OLDER = profile(alanWake2, { slug: "old-two", publishedAt: "2024-02-02" });
const REASSESSED = profile(returnal, {
  slug: "reassessed-one",
  publishedAt: "2026-06-06",
  versionNumber: 3,
});
const CATALOGUE = [NEW, NEWER, OLD, OLDER, REASSESSED];

const headings = (shelves: readonly { heading: string }[]) =>
  shelves.map((shelf) => shelf.heading);
const titles = (profiles: readonly ProfileView[]) =>
  profiles.map((view) => view.game.slug);

describe("objective shelves", () => {
  const recent: ShelfDefinition = {
    id: "recent",
    kind: "objective",
    heading: "Newly profiled",
    note: "Published here recently.",
    membership: { rule: "profiled-within-days", days: 30 },
    minimumMembers: 2,
  };

  it("selects by publication date and orders newest first", () => {
    const [shelf] = resolveShelves([recent], CATALOGUE, AUGUST);
    expect(titles(shelf!.profiles)).toEqual(["new-two", "new-one"]);
  });

  it("breaks ties on catalogue order rather than on anything about the game", () => {
    const sameDay = [
      profile(alanWake2, { slug: "b-game", publishedAt: "2026-08-30" }),
      profile(returnal, { slug: "a-game", publishedAt: "2026-08-30" }),
      OLD,
    ];
    const [shelf] = resolveShelves([recent], sameDay, AUGUST);
    // The order the catalogue was handed in, unchanged. No score, no title, no
    // shuffle: the shelf never invents a preference the corpus does not state.
    expect(titles(shelf!.profiles)).toEqual(["b-game", "a-game"]);
  });

  it("does not render when the rule would select the whole catalogue", () => {
    // A collection that selects everything has selected nothing, and printing
    // the general rail again under a second heading is padding (P0.3).
    const everything = [NEW, NEWER];
    expect(resolveShelves([recent], everything, AUGUST)).toEqual([]);
  });

  it("does not render below its minimum", () => {
    const oneRecent = [NEW, OLD, OLDER];
    expect(resolveShelves([recent], oneRecent, AUGUST)).toEqual([]);
  });

  it("finds reassessed profiles by version and by supersession", () => {
    const bySupersession = profile(redfall, {
      slug: "superseded-one",
      publishedAt: "2026-07-07",
      supersedes: "eval_previous",
    });
    const [shelf] = resolveShelves(
      [
        {
          id: "reassessed",
          kind: "objective",
          heading: "Recently reassessed",
          note: "Republished after a new evaluation.",
          membership: { rule: "reassessed" },
          minimumMembers: 2,
        },
      ],
      [...CATALOGUE, bySupersession],
      AUGUST,
    );
    expect(titles(shelf!.profiles)).toEqual(["superseded-one", "reassessed-one"]);
  });

  it("counts only games that have actually released, and not future dates", () => {
    const catalogue = [
      profile(alanWake2, {
        slug: "just-out",
        firstReleaseDate: "2026-06-01",
        releaseStatus: "released",
      }),
      profile(returnal, {
        slug: "also-just-out",
        firstReleaseDate: "2026-05-01",
        releaseStatus: "released",
      }),
      profile(redfall, {
        slug: "announced-only",
        firstReleaseDate: "2026-12-01",
        releaseStatus: "upcoming",
      }),
      profile(alanWake2, {
        slug: "dated-but-unreleased",
        // Inside the window and in the future: a scheduling record, not a
        // release, and a "recent releases" shelf that listed it would be wrong
        // in the one way this shelf can be wrong.
        firstReleaseDate: "2026-08-15",
        releaseStatus: "early_access",
      }),
      OLDER,
    ];
    const [shelf] = resolveShelves(
      [
        {
          id: "releases",
          kind: "objective",
          heading: "Recent releases",
          note: "Games that came out recently.",
          membership: { rule: "released-within-days", days: 365 },
          minimumMembers: 2,
        },
      ],
      catalogue,
      AUGUST,
    );
    expect(titles(shelf!.profiles)).toEqual(["just-out", "also-just-out"]);
  });
});

describe("authored shelves", () => {
  it("keeps the order the editor wrote, and resolves the primary scope", () => {
    const [shelf] = resolveShelves(
      [
        {
          id: "evergreen",
          kind: "evergreen",
          heading: "Story first",
          note: "Authored membership.",
          members: [{ slug: "old-two" }, { slug: "new-one" }],
          minimumMembers: 2,
        },
      ],
      CATALOGUE,
      AUGUST,
    );
    expect(titles(shelf!.profiles)).toEqual(["old-two", "new-one"]);
  });

  it("addresses one evaluated experience of a game when the scope is named", () => {
    const survival = profile(alanWake2, {
      slug: "two-scopes",
      scopeKey: "survival",
      isPrimary: true,
    });
    const wintermute = profile(alanWake2, {
      slug: "two-scopes",
      scopeKey: "wintermute",
      isPrimary: false,
    });
    const [shelf] = resolveShelves(
      [
        {
          id: "scoped",
          kind: "evergreen",
          heading: "Scoped",
          note: "Authored membership.",
          members: [{ slug: "two-scopes", scope: "wintermute" }, { slug: "new-one" }],
          minimumMembers: 2,
        },
      ],
      [survival, wintermute, NEW, OLD],
      AUGUST,
    );
    expect(shelf!.profiles.map((view) => view.scope.key)).toEqual([
      "wintermute",
      alanWake2.scope.key,
    ]);
  });

  it("may legitimately contain the whole catalogue, because a person chose it", () => {
    const [shelf] = resolveShelves(
      [
        {
          id: "evergreen",
          kind: "evergreen",
          heading: "Everything, deliberately",
          note: "Authored membership.",
          members: [{ slug: "new-one" }, { slug: "new-two" }],
          minimumMembers: 2,
        },
      ],
      [NEW, NEWER],
      AUGUST,
    );
    expect(titles(shelf!.profiles)).toEqual(["new-one", "new-two"]);
  });

  it("rejects two references that resolve to the same published profile", () => {
    /*
     * The duplicate the configuration check cannot see.
     *
     * A member naming a scope explicitly and a member omitting it are two
     * different references, and they are the SAME profile whenever that scope
     * is the game's primary one. Only resolution can tell, so only resolution
     * can refuse it — and it must, for the same reason as any other duplicate:
     * the poster would render twice and count twice towards the minimum.
     */
    expect(() =>
      resolveShelves(
        [
          {
            id: "evergreen",
            kind: "evergreen",
            heading: "Story first",
            note: "Authored membership.",
            members: [
              { slug: "new-one" },
              { slug: "new-one", scope: alanWake2.scope.key },
            ],
            minimumMembers: 2,
          },
        ],
        CATALOGUE,
        AUGUST,
      ),
    ).toThrow(/already on the shelf under its other address/);
  });

  it("does not let a repeat carry a shelf over its minimum", () => {
    // The consequence the rule exists to prevent, stated as its own case: one
    // real member and one repeat of it is one member, and a shelf needing two
    // does not get there by naming the same profile twice.
    expect(() =>
      resolveShelves(
        [
          {
            id: "padded",
            kind: "evergreen",
            heading: "Padded",
            note: "Authored membership.",
            members: [
              { slug: "new-one", scope: alanWake2.scope.key },
              { slug: "new-one" },
            ],
            minimumMembers: 2,
          },
        ],
        CATALOGUE,
        AUGUST,
      ),
    ).toThrow(/more than once/);
  });

  it("fails the build rather than quietly becoming a different collection", () => {
    expect(() =>
      resolveShelves(
        [
          {
            id: "evergreen",
            kind: "evergreen",
            heading: "Story first",
            note: "Authored membership.",
            members: [{ slug: "new-one" }, { slug: "never-published" }],
            minimumMembers: 2,
          },
        ],
        CATALOGUE,
        AUGUST,
      ),
    ).toThrow(/never-published/);
  });
});

describe("living shelves, their window and their fallback", () => {
  const living: readonly ShelfDefinition[] = [
    {
      id: "living",
      kind: "living",
      heading: "What to play after…",
      note: "Time-bounded authored membership.",
      members: [{ slug: "new-one" }, { slug: "new-two" }],
      window: { from: "2026-08-01", until: "2026-09-30" },
      fallbackId: "evergreen",
      minimumMembers: 2,
    },
    {
      id: "evergreen",
      kind: "evergreen",
      heading: "Story first",
      note: "Durable authored membership.",
      members: [{ slug: "old-one" }, { slug: "old-two" }],
      minimumMembers: 2,
    },
  ];

  it("renders inside its window, and the fallback does not repeat under it", () => {
    const shelves = resolveShelves(living, CATALOGUE, AUGUST);
    expect(headings(shelves)).toEqual(["What to play after…", "Story first"]);
    expect(shelves[0]!.standingInFor).toBeUndefined();
  });

  it("is absent before its window opens, and nothing stands in for it", () => {
    const shelves = resolveShelves(
      living,
      CATALOGUE,
      new Date("2026-07-15T00:00:00Z"),
    );
    // The evergreen shelf is still configured in its own right, so it is on the
    // page — but at its own position, not standing in for anything.
    expect(headings(shelves)).toEqual(["Story first"]);
    expect(shelves[0]!.standingInFor).toBeUndefined();
  });

  it("expires into its evergreen fallback, leaving no trace of the expired copy", () => {
    const shelves = resolveShelves(
      living,
      CATALOGUE,
      new Date("2026-10-01T00:00:00Z"),
    );
    expect(headings(shelves)).toEqual(["Story first"]);
    // Taking the expired shelf's slot rather than appearing twice.
    expect(shelves[0]!.standingInFor).toBe("living");
    expect(JSON.stringify(shelves)).not.toContain("What to play after");
  });

  it("expires into nothing when no fallback is configured", () => {
    const withoutFallback: ShelfDefinition[] = [
      {
        id: "living",
        kind: "living",
        heading: "What to play after…",
        note: "Time-bounded authored membership.",
        members: [{ slug: "new-one" }, { slug: "new-two" }],
        window: { from: "2026-08-01", until: "2026-09-30" },
        minimumMembers: 2,
      },
    ];
    expect(
      resolveShelves(withoutFallback, CATALOGUE, new Date("2026-10-01T00:00:00Z")),
    ).toEqual([]);
  });

  it("drops a fallback that cannot meet its own minimum", () => {
    const thin: readonly ShelfDefinition[] = [
      { ...(living[0] as ShelfDefinition) },
      {
        id: "evergreen",
        kind: "evergreen",
        heading: "Story first",
        note: "Durable authored membership.",
        members: [{ slug: "old-one" }],
        minimumMembers: 3,
      },
    ];
    expect(
      resolveShelves(thin, CATALOGUE, new Date("2026-10-01T00:00:00Z")),
    ).toEqual([]);
  });
});

describe("configuration that must fail the build", () => {
  const base: ShelfDefinition = {
    id: "one",
    kind: "evergreen",
    heading: "One",
    note: "Authored.",
    members: [{ slug: "new-one" }],
    minimumMembers: 1,
  };

  it("rejects two shelves sharing an id", () => {
    expect(() => assertShelvesAreWellFormed([base, { ...base }])).toThrow(
      /share the id/,
    );
  });

  it("rejects a shelf that can render with no members", () => {
    expect(() =>
      assertShelvesAreWellFormed([{ ...base, minimumMembers: 0 }]),
    ).toThrow(/not a shelf/);
  });

  /**
   * A count is a whole positive number, and the values below are the ones a
   * bare `< 1` comparison lets through. Each has its own failure mode: a
   * fraction can never equal a member count, an infinity disables the shelf
   * forever, and `NaN` makes every comparison false — so a shelf with a `NaN`
   * minimum renders whatever it has and its configured floor is decoration.
   */
  it.each([0, -1, -0.5, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects minimumMembers %p",
    (minimumMembers) => {
      expect(() =>
        assertShelvesAreWellFormed([{ ...base, minimumMembers }]),
      ).toThrow(/whole number of at least 1/);
    },
  );

  it("accepts a whole positive minimum", () => {
    expect(() =>
      assertShelvesAreWellFormed([{ ...base, minimumMembers: 3 }]),
    ).not.toThrow();
  });

  it.each([0, -5, 2.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects a rolling range of %p days",
    (days) => {
      for (const rule of ["profiled-within-days", "released-within-days"] as const) {
        expect(() =>
          assertShelvesAreWellFormed([
            {
              id: "objective",
              kind: "objective",
              heading: "Objective",
              note: "Restates a record.",
              membership: { rule, days },
              minimumMembers: 2,
            },
          ]),
          `${rule} with ${days} days`,
        ).toThrow(/whole number of at least 1/);
      }
    },
  );

  it("asks no day count of the rule that counts no days", () => {
    // `reassessed` reads a supersession, not a window. It has no `days` to
    // validate and must not be required to invent one.
    expect(() =>
      assertShelvesAreWellFormed([
        {
          id: "reassessed",
          kind: "objective",
          heading: "Recently reassessed",
          note: "Republished after a new evaluation.",
          membership: { rule: "reassessed" },
          minimumMembers: 2,
        },
      ]),
    ).not.toThrow();
  });

  it("rejects a window that closes before it opens", () => {
    expect(() =>
      assertShelvesAreWellFormed([
        {
          id: "living",
          kind: "living",
          heading: "Living",
          note: "Authored.",
          members: [{ slug: "new-one" }],
          window: { from: "2026-09-30", until: "2026-08-01" },
          minimumMembers: 1,
        },
      ]),
    ).toThrow(/closes .* before it opens/);
  });

  const livingWindow = (from: string, until: string): ShelfDefinition => ({
    id: "living",
    kind: "living",
    heading: "Living",
    note: "Authored.",
    members: [{ slug: "new-one" }],
    window: { from, until },
    minimumMembers: 1,
  });

  it("rejects a non-ISO window bound", () => {
    expect(() =>
      assertShelvesAreWellFormed([livingWindow("1 August 2026", "2026-09-30")]),
    ).toThrow(/ISO YYYY-MM-DD/);
  });

  /**
   * A shape that matches the pattern and names no day.
   *
   * This is the failure the pattern alone could not see. `Date.UTC` does not
   * reject an impossible date, it ROLLS IT OVER — so a window written
   * `2026-02-30` used to open on 2 March, and `2026-99-99` somewhere in 2034.
   * Silently, on a day nobody chose, for a collection somebody approved.
   */
  it.each([
    "2026-99-99",
    "2026-13-01",
    "2026-00-10",
    "2026-01-32",
    "2026-01-00",
    "2026-02-30",
    "2026-04-31",
    "2026-02-29",
    "0050-01-01",
  ])("rejects %s, which is not a day", (from) => {
    expect(() =>
      assertShelvesAreWellFormed([livingWindow(from, "2027-01-01")]),
    ).toThrow(/real ISO YYYY-MM-DD calendar date/);
  });

  it("checks both ends of the window, not only the first", () => {
    expect(() =>
      assertShelvesAreWellFormed([livingWindow("2026-08-01", "2026-06-31")]),
    ).toThrow(/real ISO YYYY-MM-DD calendar date/);
  });

  it.each(["2026-01-01", "2026-12-31", "2028-02-29", "2026-02-28"])(
    "accepts %s, which is a day",
    (from) => {
      // Including a real leap day, so the check cannot be tightened into
      // rejecting 29 February wholesale.
      expect(() =>
        assertShelvesAreWellFormed([livingWindow(from, "2029-01-01")]),
      ).not.toThrow();
    },
  );

  it("rejects the same member written twice on one shelf", () => {
    // Not a cosmetic mistake: the poster renders twice, and the shelf counts it
    // twice towards the minimum that decides whether it renders at all — so a
    // collection too thin to publish could be padded into existence by
    // repeating a member.
    expect(() =>
      assertShelvesAreWellFormed([
        {
          ...base,
          minimumMembers: 2,
          members: [{ slug: "new-one" }, { slug: "new-one" }],
        },
      ]),
    ).toThrow(/names new-one more than once/);
  });

  it("rejects a repeated sibling scope too", () => {
    expect(() =>
      assertShelvesAreWellFormed([
        {
          ...base,
          minimumMembers: 2,
          members: [
            { slug: "two-scopes", scope: "wintermute" },
            { slug: "two-scopes", scope: "wintermute" },
          ],
        },
      ]),
    ).toThrow(/scope "wintermute"\) more than once/);
  });

  it("allows two different scopes of one game", () => {
    // Two evaluated experiences of a game are two profiles, and a collection
    // may legitimately carry both.
    expect(() =>
      assertShelvesAreWellFormed([
        {
          ...base,
          minimumMembers: 2,
          members: [
            { slug: "two-scopes", scope: "survival" },
            { slug: "two-scopes", scope: "wintermute" },
          ],
        },
      ]),
    ).not.toThrow();
  });

  it("rejects a fallback that is not configured", () => {
    expect(() =>
      assertShelvesAreWellFormed([
        {
          id: "living",
          kind: "living",
          heading: "Living",
          note: "Authored.",
          members: [{ slug: "new-one" }],
          window: { from: "2026-08-01", until: "2026-09-30" },
          fallbackId: "nowhere",
          minimumMembers: 1,
        },
      ]),
    ).toThrow(/not configured/);
  });

  it("rejects a fallback that can itself expire", () => {
    expect(() =>
      assertShelvesAreWellFormed([
        {
          id: "living",
          kind: "living",
          heading: "Living",
          note: "Authored.",
          members: [{ slug: "new-one" }],
          window: { from: "2026-08-01", until: "2026-09-30" },
          fallbackId: "other-living",
          minimumMembers: 1,
        },
        {
          id: "other-living",
          kind: "living",
          heading: "Also living",
          note: "Authored.",
          members: [{ slug: "new-one" }],
          window: { from: "2026-08-01", until: "2026-09-30" },
          minimumMembers: 1,
        },
      ]),
    ).toThrow(/must be evergreen/);
  });
});

describe("the shipped configuration", () => {
  it("is well formed", async () => {
    const { HOME_SHELVES } = await import("@/content/home-shelves");
    expect(() => assertShelvesAreWellFormed(HOME_SHELVES)).not.toThrow();
  });

  it("carries no qualitative editorial claim, because none is approved", async () => {
    const { HOME_SHELVES } = await import("@/content/home-shelves");
    // P0.3: profile data may nominate candidates, but membership in an
    // evergreen or living collection is Tomas's decision. Until one exists,
    // every shipped shelf must be a restatement of a published record.
    expect(HOME_SHELVES.every((shelf) => shelf.kind === "objective")).toBe(true);
  });

  it("renders nothing against the shipped three-profile catalogue", async () => {
    const { HOME_SHELVES } = await import("@/content/home-shelves");
    const { SEED_PROFILES } = await import("@/content");
    const published = SEED_PROFILES.filter(
      (record) => record.evaluation.status === "published",
    ).map(buildProfileView);

    // Not a defect: "newly profiled" is every profile there is, "reassessed" is
    // none of them, and the newest game released in 2023. A homepage that
    // printed three headings over the same three games would be padding.
    expect(resolveShelves(HOME_SHELVES, published, AUGUST)).toEqual([]);
  });
});

describe("determinism", () => {
  it("gives the same answer twice for the same inputs", () => {
    const definition: ShelfDefinition[] = [
      {
        id: "recent",
        kind: "objective",
        heading: "Newly profiled",
        note: "Published here recently.",
        membership: { rule: "profiled-within-days", days: 400 },
        minimumMembers: 2,
      },
    ];
    const first = resolveShelves(definition, CATALOGUE, AUGUST);
    const second = resolveShelves(definition, CATALOGUE, AUGUST);
    expect(titles(second[0]!.profiles)).toEqual(titles(first[0]!.profiles));
  });

  it("returns nothing for no configuration at all", () => {
    expect(resolveShelves([], CATALOGUE, AUGUST)).toEqual([]);
  });
});
