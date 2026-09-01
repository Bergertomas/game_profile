import type { GameWithEvaluation, SubcriterionEntry } from "@/lib/profile/types";
import type { RegisteredGame } from "@/lib/search/registry";
import { returnal } from "./games/returnal";

/**
 * A synthetic second profile scope, for proving multi-scope behaviour.
 *
 * ── Why this is not real editorial content ──────────────────────────────────
 *
 * Master Plan §12 requires the public scope switcher to be "proven against a
 * multi-scope test corpus", and every seeded game has exactly one evaluated
 * experience — so with the real corpus alone, the switcher's rendering branch
 * is unreachable and its absence branch is the only one anything exercises.
 *
 * Returnal is extended rather than a new game invented, because its own scope
 * summary already names the sibling that would exist: "Co-op and the Tower of
 * Sisyphus are outside this scope." This is what that scope would address, with
 * numbers that are deliberately NOT an evaluation of it.
 *
 * ── The scores here are meaningless and must stay that way ──────────────────
 *
 * They are Returnal's own totals with three subcriteria moved, purely so the
 * two pages render differently and a bug that served the primary's evaluation
 * at the sibling's URL cannot pass. Nothing was assessed against the rubric,
 * no evidence was gathered, and this profile must never be published, seeded
 * into a real database, or cited. Its provenance is `derived` with a note
 * saying so, which is exactly what that provenance kind is for.
 *
 * ── It cannot reach production ──────────────────────────────────────────────
 *
 * `readFixtureProfiles` includes it only when `PROFILE_TEST_CORPUS` asks for
 * it, and a production build throws rather than honouring that variable. See
 * lib/data/fixture-profiles.ts.
 */
export const TEST_CORPUS_NAME = "multi-scope";

/** The scope key of the synthetic sibling, as it appears in its URL. */
export const TEST_SIBLING_SCOPE_KEY = "tower-of-sisyphus";

/** The game the synthetic sibling hangs from. */
export const TEST_MULTI_SCOPE_SLUG = "returnal";

export function multiScopeAdditions(): GameWithEvaluation[] {
  const sibling: GameWithEvaluation = {
    game: returnal.game,
    scope: {
      id: "scp_returnal_tower",
      gameId: returnal.game.id,
      key: TEST_SIBLING_SCOPE_KEY,
      label: "Tower of Sisyphus",
      summary:
        "The endless post-campaign mode, evaluated as its own experience. The main-game campaign is outside this scope.",
      isPrimary: false,
      displayOrder: 2,
    },
    evaluation: {
      ...returnal.evaluation,
      id: "evl_returnal_tower_v1",
      scopeId: "scp_returnal_tower",
      scope: {
        ...returnal.evaluation.scope,
        mode: "Tower of Sisyphus endless mode, excluding the main-game campaign",
      },
      // Never `calibration`: no calibration round assessed this, and claiming
      // one would put a false round label on a rendered page. `derived`
      // requires a note, and the note is the point.
      scoreProvenance: {
        kind: "derived",
        note: "Synthetic test fixture. Not an evaluation: these numbers exist to prove multi-scope routing and must never be published.",
      },
      oneLineExperience:
        "The same extraordinary combat feel with the run structure removed, turned into an escalating endurance test that never resolves.",
      primaryPull:
        "Distils the combat to its best form and lets a confident player stay in it indefinitely.",
      primaryRisk:
        "There is no ending and no narrative payoff; the mode is the loop and nothing else.",
      dimensions: shiftedDimensions(),
    },
  };

  return [sibling];
}

/**
 * Three moved values, so the two profiles are visibly different documents.
 *
 * Story falls because the mode has none of the campaign's narrative, and
 * Structure moves because an endless tower is a different shape from a
 * run-based campaign. That is the reasoning a real evaluation would start from
 * — it is not one, and the numbers below carry no authority.
 */
function shiftedDimensions(): GameWithEvaluation["evaluation"]["dimensions"] {
  const base = returnal.evaluation.dimensions;
  return {
    ...base,
    story: {
      ...base.story,
      story_hook: {
        value: 0.5,
        rationale:
          "Synthetic fixture value. The mode carries almost none of the campaign's premise.",
      },
      narrative_momentum: {
        value: 0.5,
        rationale:
          "Synthetic fixture value. Nothing in the mode advances a story.",
      },
    },
    structure: {
      ...base.structure,
      ...firstStructureKeyShifted(base.structure),
    },
  };
}

/**
 * Move whichever subcriterion the rubric lists first for Structure.
 *
 * Keyed off the fixture's own shape rather than a hard-coded subcriterion name,
 * so a rubric edit cannot leave this fixture silently referring to a key that
 * no longer exists — it would simply move a different one.
 */
function firstStructureKeyShifted(
  structure: GameWithEvaluation["evaluation"]["dimensions"]["structure"],
): Record<string, SubcriterionEntry> {
  const [firstKey] = Object.keys(structure);
  if (!firstKey) return {};
  return {
    [firstKey]: {
      value: 1,
      rationale:
        "Synthetic fixture value. An endless tower is a different shape from a run-based campaign.",
    },
  };
}

/* ==========================================================================
   THE SYNTHETIC RECOGNISED REGISTRY

   A second named corpus, for the same reason the multi-scope one exists: a
   state that cannot otherwise be reached in a browser.

   `content/search-registry.ts` ships EMPTY and must stay empty — a row there is
   a public editorial claim about a real product, and no approved list of launch
   identities exists. So with the real registry the search field's
   recognised-but-unprofiled branch is unreachable in a real browser, and only
   its absence branch ever runs.

   These entries are deliberately, visibly synthetic. They name no real game.
   Nothing here is an editorial claim, a coverage promise, or a statement about
   any actual product, and none of it may ever be published: the guard in
   lib/search/test-registry.ts refuses a production build outright rather than
   ignoring the variable.
   ========================================================================== */
export const TEST_REGISTRY_CORPUS_NAME = "recognized-registry";

/** Synthetic recognised titles. Not games. Not claims. */
export function recognizedRegistryAdditions(): RegisteredGame[] {
  return [
    {
      id: "test-corpus-lantern-parade",
      title: "Test Corpus: Lantern Parade",
      aliases: ["lantern parade", "tclp"],
      note: "Recognised, not yet evaluated.",
    },
    {
      id: "test-corpus-quiet-harbour",
      title: "Test Corpus: Quiet Harbour",
      aliases: ["quiet harbour"],
      note: "Recognised, not yet evaluated.",
    },
  ];
}
