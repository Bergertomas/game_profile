import type { IgdbIdentityRole } from "@/lib/igdb/staging-write";

export interface DevelopmentIdentityProposal {
  readonly runKey: "D1";
  readonly canonicalSlug: string;
  readonly canonicalTitle: string;
  readonly scopeKey: string;
  readonly provider: "igdb";
  readonly igdbGameId: number;
  readonly role: IgdbIdentityRole;
  readonly state: "proposed";
  readonly rationale: string;
  readonly proposalSource: string;
}

/**
 * Objective provider-identity proposal only. This is not an accepted mapping and
 * must not be written through to game_external_ids without the named-person
 * decision required by ADR 0037.
 */
export const D1_IDENTITY_PROPOSAL: DevelopmentIdentityProposal = Object.freeze({
  runKey: "D1",
  canonicalSlug: "alan-wake-2",
  canonicalTitle: "Alan Wake 2",
  scopeKey: "alan-wake-2:base-main-campaign",
  provider: "igdb",
  igdbGameId: 185246,
  role: "canonical_game",
  state: "proposed",
  rationale: "Provider identity proposal for the Alan Wake 2 canonical game. Scope inclusion/exclusion remains owned by the frozen D1 run input and is not inferred from IGDB.",
  proposalSource: "Phase 3A Item 6 D1 run preparation; verify against staged provider record before any identity decision.",
});
