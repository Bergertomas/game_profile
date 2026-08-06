import type { GameWithEvaluation } from "@/lib/profile/types";
import { alanWake2 } from "./games/alan-wake-2";
import { redfall } from "./games/redfall";
import { returnal } from "./games/returnal";

/**
 * Seed corpus for the vertical slice.
 *
 * Deliberately contrasting per Round 2 §13: narrative/atmosphere dominant,
 * agency/execution dominant with time risk, and a lower-range anchor. If the
 * profile UI cannot make these three silhouettes obviously different, the
 * profile language does not work.
 */
export const SEED_PROFILES: readonly GameWithEvaluation[] = [
  alanWake2,
  returnal,
  redfall,
];

export { alanWake2, returnal, redfall };
