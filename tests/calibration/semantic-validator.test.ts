import { describe, expect, it } from "vitest";
import {
  PackageSemanticError,
  assertPackageSemantics,
  classifyDifference,
  daysBetween,
  isCalendarDate,
  validatePackageSemantics,
  type SemanticRuleFamily,
} from "@/lib/calibration/semantic-validator";
import { validatePackageStructure } from "@/lib/calibration/package-schema";
import { buildValidPackage, decisionIn, mutate } from "./fixtures";
import type { ScoringPackage } from "@/lib/calibration/package-types";

/**
 * Work order §5(3)–§5(5): the reusable canonical schema from both directions, a
 * semantic-validator positive fixture, and one targeted negative fixture for
 * every Protocol §15.1 semantic rule family.
 *
 * Every negative below re-seals the content digest after mutating, so the test
 * proves the rule it names rather than tripping the digest check first.
 */

function reject(pkg: ScoringPackage): ReturnType<typeof validatePackageSemantics> {
  // A negative fixture must remain STRUCTURALLY valid, or it would be proving
  // that the JSON Schema catches the case, not the semantic validator.
  const structural = validatePackageStructure(pkg);
  expect(structural.valid, JSON.stringify(structural.issues.slice(0, 4))).toBe(true);
  const result = validatePackageSemantics(pkg);
  expect(result.valid).toBe(false);
  return result;
}

function families(result: ReturnType<typeof validatePackageSemantics>): Set<SemanticRuleFamily> {
  return new Set(result.issues.map((issue) => issue.family));
}

describe("the positive fixture", () => {
  it("passes the canonical schema", () => {
    const result = validatePackageStructure(buildValidPackage());
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("passes the complete §15.1 checklist", () => {
    const result = validatePackageSemantics(buildValidPackage());
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("fails closed through the assert entry point", () => {
    expect(() => assertPackageSemantics(buildValidPackage())).not.toThrow();
    const broken = mutate((draft) => {
      decisionIn(draft, "final", "story_hook").numeric_score = 2;
    });
    expect(() => assertPackageSemantics(broken)).toThrow(PackageSemanticError);
  });
});

describe("§15.1(1) digest binding", () => {
  it("rejects an approval naming a different scope", () => {
    const pkg = buildValidPackage();
    const result = reject({
      ...pkg,
      owner_approval: { ...pkg.owner_approval, scope_key: "another-scope" },
    });
    expect(families(result).has("digest_binding")).toBe(true);
  });
});

describe("§15.1(2) exact unique active decision sets", () => {
  it("rejects a package missing one of the 40 rubric keys", () => {
    const result = reject(
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        const pass = content.primary_pass as Record<string, unknown>;
        const decisions = pass.decisions as Record<string, unknown>[];
        // Replace rather than remove, so the array still has 40 items and the
        // schema's minItems/maxItems stays satisfied.
        decisions[0]!.subcriterion_key = decisions[1]!.subcriterion_key;
      }),
    );
    expect(families(result).has("decision_sets")).toBe(true);
    expect(result.issues.some((issue) => /duplicate subcriterion keys/.test(issue.message))).toBe(
      true,
    );
  });
});

describe("§15.1(3) primary/audit pair invariants", () => {
  it("rejects a differing normalized packet digest", () => {
    const result = reject(
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        const audit = content.audit_pass as Record<string, unknown>;
        (audit.run_manifest as Record<string, unknown>).normalized_packet_digest = "b".repeat(64);
      }),
    );
    expect(families(result).has("pair_invariants")).toBe(true);
  });

  it("rejects a scoring pass that had tool access", () => {
    const result = reject(
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        const pass = content.primary_pass as Record<string, unknown>;
        (pass.run_manifest as Record<string, unknown>).research_tool_access = ["web_search"];
      }),
    );
    expect(result.issues.some((issue) => /tool-free/.test(issue.message))).toBe(true);
  });

  it("rejects a measured pass carrying human corrections", () => {
    const result = reject(
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        const pass = content.audit_pass as Record<string, unknown>;
        (pass.run_manifest as Record<string, unknown>).human_corrections = ["adjusted a value"];
      }),
    );
    expect(result.issues.some((issue) => /does not count/.test(issue.message))).toBe(true);
  });

  it("rejects a decoding parameter that differs outside the seed", () => {
    const result = reject(
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        const pass = content.audit_pass as Record<string, unknown>;
        (pass.run_manifest as Record<string, unknown>).decoding_parameters = [
          { name: "reasoning_effort", value: "medium" },
        ];
      }),
    );
    expect(result.issues.some((issue) => /decoding parameter/.test(issue.message))).toBe(true);
  });

  it("accepts a differing exposed seed, and rejects an identical one", () => {
    const withSeeds = (primary: number, audit: number) =>
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        ((content.primary_pass as Record<string, unknown>).run_manifest as Record<string, unknown>).seed =
          primary;
        ((content.audit_pass as Record<string, unknown>).run_manifest as Record<string, unknown>).seed =
          audit;
      });
    expect(validatePackageSemantics(withSeeds(1, 2)).valid).toBe(true);
    const same = reject(withSeeds(7, 7));
    expect(same.issues.some((issue) => /seed must differ/.test(issue.message))).toBe(true);
  });

  it("rejects a pair where only one side exposes a seed", () => {
    const result = reject(
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        ((content.primary_pass as Record<string, unknown>).run_manifest as Record<string, unknown>).seed = 5;
      }),
    );
    expect(
      result.issues.some((issue) => /parameter_unavailable/.test(issue.message)),
    ).toBe(true);
  });
});

describe("§15.1(4) reference integrity and collection standard", () => {
  it("rejects a duplicated query family at both layers", () => {
    const duplicated = mutate((draft) => {
      const corpus = (draft.scoring_content as Record<string, unknown>).corpus as Record<string, unknown>;
      const audit = corpus.query_family_audit as Record<string, unknown>[];
      audit[0]!.query_family = audit[1]!.query_family;
    });
    // The schema's `contains` clauses already reject this, so the semantic
    // check is defence in depth rather than the only guard — assert both, so a
    // later schema relaxation cannot silently remove the rule.
    expect(validatePackageStructure(duplicated).valid).toBe(false);
    const result = validatePackageSemantics(duplicated);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => /appears 2 times/.test(issue.message))).toBe(true);
  });

  it("rejects a collection standard the cluster count does not reproduce", () => {
    const result = reject(
      mutate((draft) => {
        const corpus = (draft.scoring_content as Record<string, unknown>).corpus as Record<string, unknown>;
        // Eight independent A/B clusters is `normal_target`, not `scarcity_floor`.
        corpus.collection_standard = "scarcity_floor";
      }),
    );
    expect(result.issues.some((issue) => /independent active A\/B clusters/.test(issue.message))).toBe(
      true,
    );
  });

  it("counts neither Tier-D nor superseded rows toward the collection band", () => {
    // Demote one A/B source to Tier D and supersede another. Eight independent
    // active A/B clusters become six, which `normal_target` (8–10) must reject
    // — proving neither row type fills a substantive slot (§4.4).
    const result = reject(
      mutate((draft) => {
        const corpus = (draft.scoring_content as Record<string, unknown>).corpus as Record<string, unknown>;
        const sources = corpus.source_manifest as Record<string, unknown>[];
        sources.find((source) => source.source_id === "src-ab-1")!.source_tier = "D";
        sources.find((source) => source.source_id === "src-ab-2")!.record_status = "superseded";
      }),
    );
    expect(result.issues.some((issue) => /the manifest has 6/.test(issue.message))).toBe(true);
  });

  it("rejects an unresolved claim reference on a decision", () => {
    const result = reject(
      mutate((draft) => {
        decisionIn(draft, "primary_pass", "story_hook").claim_ids = ["primary-claim-nope-1"];
      }),
    );
    expect(result.issues.some((issue) => /unresolved claim reference/.test(issue.message))).toBe(
      true,
    );
  });

  it("rejects a claim mapped to a different criterion than the decision it supports", () => {
    const result = reject(
      mutate((draft) => {
        decisionIn(draft, "primary_pass", "story_hook").claim_ids = [
          "primary-claim-character_investment-1",
        ];
      }),
    );
    expect(result.issues.some((issue) => /is mapped to/.test(issue.message))).toBe(true);
  });

  it("rejects a self-referential claim link", () => {
    const result = reject(
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        const ledger = (content.primary_pass as Record<string, unknown>).claim_ledger as Record<
          string,
          unknown
        >[];
        ledger[0]!.corroborating_claim_ids = [ledger[0]!.claim_id];
      }),
    );
    expect(result.issues.some((issue) => /refer to the claim itself/.test(issue.message))).toBe(
      true,
    );
  });

  it("rejects a relation-type contradiction between two claims", () => {
    const result = reject(
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        const ledger = (content.primary_pass as Record<string, unknown>).claim_ledger as Record<
          string,
          unknown
        >[];
        ledger[0]!.corroborating_claim_ids = [ledger[1]!.claim_id];
        ledger[0]!.contradicting_claim_ids = [ledger[1]!.claim_id];
      }),
    );
    expect(
      result.issues.some((issue) => /both corroborating and contradicting/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects an active Tier-D claim supporting a numeric decision", () => {
    const result = reject(
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        const ledger = (content.primary_pass as Record<string, unknown>).claim_ledger as Record<
          string,
          unknown
        >[];
        const claim = ledger.find((entry) => entry.claim_id === "primary-claim-story_hook-1")!;
        claim.source_id = "src-d-1";
      }),
    );
    expect(result.issues.some((issue) => /Tier-D claim/.test(issue.message))).toBe(true);
  });

  it("resolves final-decision claim references, rejecting unresolved ones", () => {
    const result = reject(
      mutate((draft) => {
        decisionIn(draft, "final", "story_hook").claim_ids = ["no-such-claim"];
      }),
    );
    expect(
      result.issues.some(
        (issue) =>
          issue.path.startsWith("adjudication.final_decisions") &&
          /unresolved claim reference/.test(issue.message),
      ),
    ).toBe(true);
  });

  it("ACCEPTS a raw claim ID that collides across the two pass ledgers", () => {
    // Owner decision of 2026-09-02: raw claim IDs are pass-local and a
    // cross-pass collision "must not invalidate an otherwise valid package".
    // Two role-blind runs over byte-identical input can naturally emit the same
    // identifier, and requiring them not to would make them coordinate.
    const collided = mutate((draft) => {
      const content = draft.scoring_content as Record<string, unknown>;
      const auditLedger = (content.audit_pass as Record<string, unknown>).claim_ledger as Record<
        string,
        unknown
      >[];
      const auditClaim = auditLedger.find(
        (claim) => claim.claim_id === "audit-claim-story_hook-1",
      )!;
      auditClaim.claim_id = "primary-claim-story_hook-1";
      decisionIn(draft, "audit_pass", "story_hook").claim_ids = ["primary-claim-story_hook-1"];
      // The reconciled record names the collided ID on its audit side; the
      // field it sits in says which ledger it belongs to.
      const records = (content.adjudication as Record<string, unknown>)
        .reconciled_claim_record as Record<string, unknown>[];
      records.find((record) => record.reconciled_claim_id === "rec-claim-story_hook-1")!
        .audit_claim_ids = ["primary-claim-story_hook-1"];
    });
    const result = validatePackageSemantics(collided);
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("rejects a final decision that cites a raw pass claim ID instead of a reconciled one", () => {
    const result = reject(
      mutate((draft) => {
        decisionIn(draft, "final", "story_hook").claim_ids = ["primary-claim-story_hook-1"];
      }),
    );
    expect(
      result.issues.some(
        (issue) =>
          issue.path.startsWith("adjudication.final_decisions") &&
          /references a reconciled_claim_id, not a raw pass claim ID/.test(issue.message),
      ),
    ).toBe(true);
  });

  it("rejects a duplicated reconciled_claim_id as ambiguous", () => {
    const result = reject(
      mutate((draft) => {
        const records = (
          (draft.scoring_content as Record<string, unknown>).adjudication as Record<string, unknown>
        ).reconciled_claim_record as Record<string, unknown>[];
        const original = records.find(
          (record) => record.reconciled_claim_id === "rec-claim-story_hook-1",
        )!;
        records.push({ ...original, reason: "A second record claiming the same identity." });
      }),
    );
    expect(
      result.issues.some((issue) => /is recorded more than once and is ambiguous/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects a final decision resting on a reconciled record that names no claim", () => {
    const result = reject(
      mutate((draft) => {
        const record = (
          (draft.scoring_content as Record<string, unknown>).adjudication as Record<string, unknown>
        ).reconciled_claim_record as Record<string, unknown>[];
        const target = record.find(
          (entry) => entry.reconciled_claim_id === "rec-claim-story_hook-1",
        )!;
        target.primary_claim_ids = [];
        target.audit_claim_ids = [];
      }),
    );
    expect(
      result.issues.some((issue) => /names no primary or audit claim/.test(issue.message)),
    ).toBe(true);
  });

  it("resolves a final ENDPOINT-GATE reference through the reconciled ledger too", () => {
    const result = reject(
      mutate((draft) => {
        // The schema only allows an endpoint_gate on an endpoint value, so all
        // three sets move to 2 in blind agreement; the only defect under test
        // is the final gate citing a raw pass claim ID.
        for (const set of ["primary_pass", "audit_pass", "final"] as const) {
          const decision = decisionIn(draft, set, "story_hook");
          decision.numeric_score = 2;
          decision.anchor_id = "story_hook@2";
          decision.higher_anchor_rejection = null;
          decision.endpoint_gate = {
            scope_spanning_claim_ids: [
              set === "audit_pass" ? "audit-claim-story_hook-1" : "primary-claim-story_hook-1",
            ],
            calibration_reference: null,
            intent_genre_check: "Placeholder intent check.",
          };
        }
        const differences = (
          (draft.scoring_content as Record<string, unknown>).adjudication as Record<string, unknown>
        ).differences as Record<string, unknown>[];
        const difference = differences.find((entry) => entry.subcriterion_key === "story_hook")!;
        difference.primary_value = { score_value_kind: "numeric", numeric_score: 2 };
        difference.audit_value = { score_value_kind: "numeric", numeric_score: 2 };
      }),
    );
    expect(
      result.issues.some(
        (issue) =>
          issue.path.endsWith("endpoint_gate") &&
          /references a reconciled_claim_id, not a raw pass claim ID/.test(issue.message),
      ),
    ).toBe(true);
  });

  it("resolves a final PLATFORM-OVERRIDE reference through the reconciled ledger too", () => {
    const result = reject(
      mutate((draft) => {
        decisionIn(draft, "final", "technical_stability").platform_overrides = [
          {
            platform_key: "pc",
            score_value_kind: "numeric",
            numeric_score: 1,
            anchor_id: "technical_stability@1",
            unknown_reason: null,
            missing_coverage_classes: [],
            insufficiency_reference_ids: [],
            zero_reason: null,
            rationale: "Placeholder override rationale.",
            claim_ids: ["primary-claim-technical_stability-1"],
            confidence_facts: {
              coverage_state: "full",
              conflict_state: "none",
              stability_state: "stable",
            },
            subcriterion_confidence: "High",
            coverage_observed_unit_ids: [
              "technical_stability-u1",
              "technical_stability-u2",
              "technical_stability-u3",
              "technical_stability-u4",
            ],
            coverage_missing_unit_ids: [],
          },
        ];
      }),
    );
    expect(
      result.issues.some(
        (issue) =>
          issue.path.includes("platform_overrides") &&
          /references a reconciled_claim_id, not a raw pass claim ID/.test(issue.message),
      ),
    ).toBe(true);
  });

  it("rejects a reconciled record naming a primary claim that is not in the primary ledger", () => {
    const result = reject(
      mutate((draft) => {
        const records = (
          (draft.scoring_content as Record<string, unknown>).adjudication as Record<string, unknown>
        ).reconciled_claim_record as Record<string, unknown>[];
        records.find((record) => record.reconciled_claim_id === "rec-claim-story_hook-1")!
          .primary_claim_ids = ["audit-claim-story_hook-1"];
      }),
    );
    expect(
      result.issues.some(
        (issue) =>
          issue.path.startsWith("adjudication.reconciled_claim_record") &&
          /unresolved primary claim/.test(issue.message),
      ),
    ).toBe(true);
  });

  it("rejects a reconciled record naming an audit claim that is not in the audit ledger", () => {
    const result = reject(
      mutate((draft) => {
        const records = (
          (draft.scoring_content as Record<string, unknown>).adjudication as Record<string, unknown>
        ).reconciled_claim_record as Record<string, unknown>[];
        records.find((record) => record.reconciled_claim_id === "rec-claim-story_hook-1")!
          .audit_claim_ids = ["primary-claim-story_hook-1"];
      }),
    );
    expect(
      result.issues.some(
        (issue) =>
          issue.path.startsWith("adjudication.reconciled_claim_record") &&
          /unresolved audit claim/.test(issue.message),
      ),
    ).toBe(true);
  });

  it("rejects a final decision whose reconciled claim reaches another criterion", () => {
    const result = reject(
      mutate((draft) => {
        decisionIn(draft, "final", "story_hook").claim_ids = [
          "rec-claim-character_investment-1",
        ];
      }),
    );
    expect(
      result.issues.some(
        (issue) =>
          issue.path.startsWith("adjudication.final_decisions") &&
          /mapped to character_investment/.test(issue.message),
      ),
    ).toBe(true);
  });

  it("rejects a duplicated experience tag key", () => {
    const result = reject(
      mutate((draft) => {
        const interpretation = (draft.scoring_content as Record<string, unknown>)
          .interpretation as Record<string, unknown>;
        interpretation.experience_tags = [
          { tag_key: "grind", value_kind: "intensity", intensity: "low" },
          { tag_key: "grind", value_kind: "intensity", intensity: "high" },
        ];
      }),
    );
    expect(result.issues.some((issue) => /duplicate tag keys/.test(issue.message))).toBe(true);
  });
});

describe("§15.1(5) score records", () => {
  it("rejects an anchor id naming another criterion", () => {
    const result = reject(
      mutate((draft) => {
        decisionIn(draft, "primary_pass", "story_hook").anchor_id = "character_investment@1.5";
      }),
    );
    expect(result.issues.some((issue) => /anchor_id names/.test(issue.message))).toBe(true);
  });

  it("rejects an anchor id whose value contradicts the score", () => {
    const result = reject(
      mutate((draft) => {
        decisionIn(draft, "primary_pass", "story_hook").anchor_id = "story_hook@1";
      }),
    );
    expect(
      result.issues.some((issue) => /does not match numeric_score/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects a required-facet parent that is not the lower facet value", () => {
    const result = reject(
      mutate((draft) => {
        const decision = decisionIn(draft, "primary_pass", "narrative_momentum");
        const facets = decision.facet_records as Record<string, unknown>[];
        facets[0]!.numeric_score = 0.5;
        // Parent left at 1.5: averaging or taking the higher facet is exactly the
        // failure §6.1 forbids.
      }),
    );
    expect(result.issues.some((issue) => /lower facet value/.test(issue.message))).toBe(true);
  });

  it("rejects a numeric parent when a required facet is Unknown", () => {
    const result = reject(
      mutate((draft) => {
        const decision = decisionIn(draft, "primary_pass", "failure_fairness");
        const facets = decision.facet_records as Record<string, unknown>[];
        Object.assign(facets[0]!, {
          score_value_kind: "unknown",
          numeric_score: null,
          unknown_reason: "no late-game observation",
          missing_coverage_classes: ["temporal_stratum"],
          recurrence: null,
          consequence: null,
        });
      }),
    );
    expect(result.issues.some((issue) => /must be Unknown/.test(issue.message))).toBe(true);
  });

  it("rejects a platform override that repeats the base value", () => {
    const result = reject(
      mutate((draft) => {
        decisionIn(draft, "primary_pass", "technical_stability").platform_overrides = [
          {
            platform_key: "pc",
            score_value_kind: "numeric",
            numeric_score: 1.5,
            anchor_id: "technical_stability@1.5",
            unknown_reason: null,
            missing_coverage_classes: [],
            insufficiency_reference_ids: [],
            zero_reason: null,
            rationale: "Placeholder override rationale.",
            claim_ids: ["primary-claim-technical_stability-1"],
            confidence_facts: {
              coverage_state: "full",
              conflict_state: "none",
              stability_state: "stable",
            },
            subcriterion_confidence: "High",
            coverage_observed_unit_ids: [
              "technical_stability-u1",
              "technical_stability-u2",
              "technical_stability-u3",
              "technical_stability-u4",
            ],
            coverage_missing_unit_ids: [],
          },
        ];
      }),
    );
    expect(result.issues.some((issue) => /must differ from the base/.test(issue.message))).toBe(
      true,
    );
  });

  it("rejects an override on a platform outside the evaluation scope", () => {
    const result = reject(
      mutate((draft) => {
        decisionIn(draft, "primary_pass", "technical_stability").platform_overrides = [
          {
            platform_key: "handheld-z",
            score_value_kind: "numeric",
            numeric_score: 1,
            anchor_id: "technical_stability@1",
            unknown_reason: null,
            missing_coverage_classes: [],
            insufficiency_reference_ids: [],
            zero_reason: null,
            rationale: "Placeholder override rationale.",
            claim_ids: ["primary-claim-technical_stability-1"],
            confidence_facts: {
              coverage_state: "full",
              conflict_state: "none",
              stability_state: "stable",
            },
            subcriterion_confidence: "High",
            coverage_observed_unit_ids: [
              "technical_stability-u1",
              "technical_stability-u2",
              "technical_stability-u3",
              "technical_stability-u4",
            ],
            coverage_missing_unit_ids: [],
          },
        ];
      }),
    );
    expect(result.issues.some((issue) => /not an included platform/.test(issue.message))).toBe(
      true,
    );
  });

  it("rejects a confidence label that does not derive from its recorded facts", () => {
    const result = reject(
      mutate((draft) => {
        const decision = decisionIn(draft, "primary_pass", "story_hook");
        // Two soft limitations derive to Low, not Medium (§10.1).
        decision.confidence_facts = {
          coverage_state: "bounded",
          conflict_state: "adjacent_resolved",
          stability_state: "stable",
        };
        decision.subcriterion_confidence = "Medium";
      }),
    );
    expect(result.issues.some((issue) => /does not derive from the recorded facts/.test(issue.message))).toBe(
      true,
    );
  });
});

describe("§15.1(6) coverage, calendar dates and retrospective minima", () => {
  it("knows February", () => {
    expect(isCalendarDate("2026-02-28")).toBe(true);
    expect(isCalendarDate("2026-02-31")).toBe(false);
    expect(isCalendarDate("2026-02-29")).toBe(false);
    expect(isCalendarDate("2028-02-29")).toBe(true); // leap year
    expect(isCalendarDate("2026-04-31")).toBe(false);
    expect(daysBetween("2026-01-01", "2026-01-31")).toBe(30);
  });

  it("rejects a schema-shaped date that is not a real calendar date", () => {
    const impossible = mutate((draft) => {
      const scope = (draft.scoring_content as Record<string, unknown>)
        .evaluation_scope as Record<string, unknown>;
      // Matches the schema's date PATTERN; February disagrees.
      scope.evidence_cutoff = "2026-02-31";
    });
    // §15.1(6) says "only the semantic validator knows February" — written for a
    // reader where `format` is annotation-only. This repository compiles Ajv
    // with ajv-formats, so the format assertion catches it too. Both layers are
    // asserted: the semantic check must stand on its own if that ever changes.
    expect(validatePackageStructure(impossible).valid).toBe(false);
    const result = validatePackageSemantics(impossible);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => /not a valid calendar date/.test(issue.message))).toBe(
      true,
    );
  });

  it("rejects an elapsed lower bound that does not reproduce from the dates", () => {
    const result = reject(
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        const ledger = (content.primary_pass as Record<string, unknown>).claim_ledger as Record<
          string,
          unknown
        >[];
        const claim = ledger.find((entry) => entry.retrospective_time !== null)!;
        (claim.retrospective_time as Record<string, unknown>).elapsed_days_lower_bound = 900;
      }),
    );
    expect(result.issues.some((issue) => /does not reproduce/.test(issue.message))).toBe(true);
  });

  /**
   * Turn one decision into an Unknown with an explicit coverage partition.
   * `missing` is the 1-based frame unit indices to record as missing; the frame
   * marks unit 4 (late/end) `central` + `materially_limiting` and units 1–3
   * `bounding`, so every derivation branch is reachable from one fixture.
   */
  function withCoverage(
    key: string,
    missing: number[],
    state: "full" | "bounded" | "materially_limited",
    sets: readonly ("primary_pass" | "audit_pass" | "final")[] = ["primary_pass"],
  ) {
    return mutate((draft) => {
      for (const set of sets) {
        const decision = decisionIn(draft, set, key);
        const all = [1, 2, 3, 4].map((n) => `${key}-u${n}`);
        Object.assign(decision, {
          score_value_kind: "unknown",
          numeric_score: null,
          anchor_id: null,
          unknown_reason: "coverage absent",
          missing_coverage_classes: missing.length > 0 ? ["temporal_stratum"] : [],
          insufficiency_reference_ids: [`frame-${key}`],
          subcriterion_confidence: "Low",
          zero_reason: null,
          lower_anchor_rejection: null,
          higher_anchor_rejection: null,
          endpoint_gate: null,
          claim_ids: [],
          facet_records: [],
          confidence_facts: {
            coverage_state: state,
            conflict_state: "none",
            stability_state: "stable",
          },
          coverage_observed_unit_ids: all.filter(
            (_, index) => !missing.includes(index + 1),
          ),
          coverage_missing_unit_ids: missing.map((n) => `${key}-u${n}`),
        });
      }
    });
  }

  it("derives `full` when nothing relevant is missing", () => {
    expect(validatePackageSemantics(buildValidPackage()).valid).toBe(true);
  });

  it("derives `bounded` from exactly one missing bounding unit", () => {
    const ok = withCoverage("story_hook", [2], "bounded", ["primary_pass", "audit_pass", "final"]);
    const result = validatePackageSemantics(ok);
    // The coverage record itself is consistent; only downstream derivation
    // effects of turning a decision Unknown remain.
    expect(
      result.issues.filter((issue) => issue.family === "coverage_and_time"),
    ).toEqual([]);
  });

  it("derives `materially_limited` from a missing late/end unit — the motivating case", () => {
    // One missing unit, exactly as in the `bounded` case above, but this unit is
    // the central late/end stratum. Under the pre-amendment record these two
    // were indistinguishable.
    const wrong = reject(withCoverage("story_hook", [4], "bounded"));
    expect(
      wrong.issues.some((issue) => /expected "materially_limited"/.test(issue.message)),
    ).toBe(true);
    const right = withCoverage("story_hook", [4], "materially_limited", [
      "primary_pass",
      "audit_pass",
      "final",
    ]);
    expect(
      validatePackageSemantics(right).issues.filter(
        (issue) => issue.family === "coverage_and_time",
      ),
    ).toEqual([]);
  });

  it("derives `materially_limited` from two missing bounding units", () => {
    const wrong = reject(withCoverage("story_hook", [1, 2], "bounded"));
    expect(
      wrong.issues.some((issue) => /expected "materially_limited"/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects an asserted coverage_state that does not derive", () => {
    // A numeric decision with nothing missing: the only honest state is `full`.
    const result = reject(
      mutate((draft) => {
        const decision = decisionIn(draft, "primary_pass", "story_hook");
        decision.confidence_facts = {
          coverage_state: "materially_limited",
          conflict_state: "none",
          stability_state: "stable",
        };
        decision.subcriterion_confidence = "Low";
      }),
    );
    expect(
      result.issues.some((issue) => /does not derive from the missing units/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects overlapping observed and missing lists", () => {
    const result = reject(
      mutate((draft) => {
        const decision = decisionIn(draft, "primary_pass", "story_hook");
        decision.coverage_missing_unit_ids = ["story_hook-u1"];
      }),
    );
    expect(
      result.issues.some((issue) => /both observed and missing/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects a partition that does not cover the whole frozen frame", () => {
    const result = reject(
      mutate((draft) => {
        const decision = decisionIn(draft, "primary_pass", "story_hook");
        // Silently drop a unit from accounting — the audit hole the three-state
        // `omission_effect` exists to close.
        decision.coverage_observed_unit_ids = ["story_hook-u1", "story_hook-u2", "story_hook-u3"];
      }),
    );
    expect(
      result.issues.some((issue) => /in neither coverage list: story_hook-u4/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects a coverage unit id that is not in the frozen frame", () => {
    const result = reject(
      mutate((draft) => {
        const decision = decisionIn(draft, "primary_pass", "story_hook");
        decision.coverage_observed_unit_ids = [
          ...(decision.coverage_observed_unit_ids as string[]),
          "not-a-frame-unit",
        ];
      }),
    );
    expect(
      result.issues.some((issue) => /is not in the frozen frame/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects a numeric value with no observed coverage unit", () => {
    const result = reject(
      mutate((draft) => {
        const decision = decisionIn(draft, "primary_pass", "story_hook");
        decision.coverage_observed_unit_ids = [];
        decision.coverage_missing_unit_ids = [1, 2, 3, 4].map((n) => `story_hook-u${n}`);
      }),
    );
    expect(
      result.issues.some((issue) => /requires at least one observed coverage unit/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects a unit a linked non-rejected claim observed being marked missing", () => {
    const result = reject(
      mutate((draft) => {
        const decision = decisionIn(draft, "primary_pass", "story_hook");
        // The fixture's claim observes u1 and u2.
        decision.coverage_observed_unit_ids = ["story_hook-u2", "story_hook-u3", "story_hook-u4"];
        decision.coverage_missing_unit_ids = ["story_hook-u1"];
      }),
    );
    expect(
      result.issues.some((issue) => /which this record marks missing/.test(issue.message)),
    ).toBe(true);
  });

  it("applies the claim/coverage invariant to FINAL decisions too", () => {
    // Regression for the review finding: final decisions were passed a null
    // claim lookup, so this invariant was silently unenforced on the very set
    // that feeds derivation. The finals now reach their claims through the
    // reconciled record, so this also covers that traversal.
    const result = reject(
      mutate((draft) => {
        const decision = decisionIn(draft, "final", "story_hook");
        // The linked claim observes u1 and u2.
        decision.coverage_observed_unit_ids = ["story_hook-u2", "story_hook-u3", "story_hook-u4"];
        decision.coverage_missing_unit_ids = ["story_hook-u1"];
      }),
    );
    expect(
      result.issues.some(
        (issue) =>
          issue.path.startsWith("adjudication.final_decisions") &&
          /which this record marks missing/.test(issue.message),
      ),
    ).toBe(true);
  });

  it("applies it to a FINAL platform override as well", () => {
    const result = reject(
      mutate((draft) => {
        decisionIn(draft, "final", "technical_stability").platform_overrides = [
          {
            platform_key: "pc",
            score_value_kind: "numeric",
            numeric_score: 1,
            anchor_id: "technical_stability@1",
            unknown_reason: null,
            missing_coverage_classes: [],
            insufficiency_reference_ids: [],
            zero_reason: null,
            rationale: "Placeholder override rationale.",
            claim_ids: ["rec-claim-technical_stability-1"],
            confidence_facts: {
              coverage_state: "full",
              conflict_state: "none",
              stability_state: "stable",
            },
            subcriterion_confidence: "High",
            // Marks a unit the linked claim observes as missing.
            coverage_observed_unit_ids: [
              "technical_stability-u2",
              "technical_stability-u3",
              "technical_stability-u4",
            ],
            coverage_missing_unit_ids: ["technical_stability-u1"],
          },
        ];
      }),
    );
    expect(
      result.issues.some(
        (issue) =>
          issue.path.includes("final_decisions") &&
          issue.path.includes("platform_overrides") &&
          /which this record marks missing/.test(issue.message),
      ),
    ).toBe(true);
  });

  it("rejects a central frame unit frozen with a weaker omission effect", () => {
    const result = reject(
      mutate((draft) => {
        const frames = (
          (draft.scoring_content as Record<string, unknown>).corpus as Record<string, unknown>
        ).coverage_frames as Record<string, unknown>[];
        const units = frames[0]!.coverage_units as Record<string, unknown>[];
        const central = units.find((unit) => unit.centrality === "central")!;
        central.omission_effect = "bounding";
      }),
    );
    expect(
      result.issues.some((issue) => /must be materially_limiting/.test(issue.message)),
    ).toBe(true);
  });

  it("does not let a missing nonlimiting unit lower coverage or create a class", () => {
    const relaxed = mutate((draft) => {
      const frames = (
        (draft.scoring_content as Record<string, unknown>).corpus as Record<string, unknown>
      ).coverage_frames as Record<string, unknown>[];
      const frame = frames.find((f) => f.subcriterion_key === "story_hook")!;
      const units = frame.coverage_units as Record<string, unknown>[];
      units.find((unit) => unit.unit_id === "story_hook-u3")!.omission_effect = "nonlimiting";
      for (const set of ["primary_pass", "audit_pass", "final"] as const) {
        const decision = decisionIn(draft, set, "story_hook");
        decision.coverage_observed_unit_ids = ["story_hook-u1", "story_hook-u2", "story_hook-u4"];
        decision.coverage_missing_unit_ids = ["story_hook-u3"];
      }
    });
    // Still `full`: a missing nonlimiting unit does not reduce coverage, and
    // it contributes no insufficiency class.
    expect(
      validatePackageSemantics(relaxed).issues.filter(
        (issue) => issue.family === "coverage_and_time",
      ),
    ).toEqual([]);
  });

  it("requires frame-bound missing classes to match the contributing missing units", () => {
    const result = reject(
      mutate((draft) => {
        const decision = decisionIn(draft, "primary_pass", "story_hook");
        Object.assign(decision, {
          score_value_kind: "unknown",
          numeric_score: null,
          anchor_id: null,
          unknown_reason: "coverage absent",
          // Claims a mode gap the missing units do not support.
          missing_coverage_classes: ["mode"],
          insufficiency_reference_ids: ["frame-story_hook"],
          subcriterion_confidence: "Low",
          zero_reason: null,
          lower_anchor_rejection: null,
          higher_anchor_rejection: null,
          endpoint_gate: null,
          claim_ids: [],
          facet_records: [],
          confidence_facts: {
            coverage_state: "bounded",
            conflict_state: "none",
            stability_state: "stable",
          },
          coverage_observed_unit_ids: ["story_hook-u1", "story_hook-u3", "story_hook-u4"],
          coverage_missing_unit_ids: ["story_hook-u2"],
        });
      }),
    );
    expect(
      result.issues.some((issue) => /do not match the contributing missing units/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects a delayed-effect value that lacks two independent retrospective claims", () => {
    const result = reject(
      mutate((draft) => {
        // 1.5 requires two independent eligible claims; drop to one.
        decisionIn(draft, "primary_pass", "memory_residue").claim_ids = [
          "primary-claim-memory_residue-1",
        ];
      }),
    );
    expect(
      result.issues.some((issue) => /independent eligible retrospective claim/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects a delayed-effect 2 without a 180-day observation", () => {
    // 61 elapsed days clears the 30-day floor, so the fixture's 1.5 stays valid…
    const shortened = mutate((draft) => {
      const content = draft.scoring_content as Record<string, unknown>;
      for (const passName of ["primary_pass", "audit_pass"]) {
        const ledger = (content[passName] as Record<string, unknown>).claim_ledger as Record<
          string,
          unknown
        >[];
        for (const claim of ledger) {
          if (String(claim.claim_id).includes("lasting_impact")) {
            claim.retrospective_time = {
              retrospective_observation_date: "2024-05-01",
              play_completion_date: "2024-03-01",
              latest_possible_play_date: null,
              elapsed_days_lower_bound: 61,
            };
          }
        }
      }
    });
    expect(validatePackageSemantics(shortened).valid).toBe(true);
    // …but a 2 additionally needs one observation at 180+ days.
    const raised = reject(
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        for (const passName of ["primary_pass", "audit_pass"]) {
          const ledger = (content[passName] as Record<string, unknown>).claim_ledger as Record<
            string,
            unknown
          >[];
          for (const claim of ledger) {
            if (String(claim.claim_id).includes("lasting_impact")) {
              claim.retrospective_time = {
                retrospective_observation_date: "2024-05-01",
                play_completion_date: "2024-03-01",
                latest_possible_play_date: null,
                elapsed_days_lower_bound: 61,
              };
            }
          }
        }
        for (const set of ["primary_pass", "audit_pass", "final"] as const) {
          const decision = decisionIn(draft, set, "lasting_impact");
          decision.numeric_score = 2;
          decision.anchor_id = "lasting_impact@2";
          decision.higher_anchor_rejection = null;
          decision.endpoint_gate = {
            scope_spanning_claim_ids: [
              `${set === "audit_pass" ? "audit" : "primary"}-claim-lasting_impact-1`,
            ],
            calibration_reference: null,
            intent_genre_check: "Placeholder intent check.",
          };
        }
      }),
    );
    expect(raised.issues.some((issue) => /180\+ days/.test(issue.message))).toBe(true);
  });

  it("forces Unknown for a release under 30 days old", () => {
    const result = reject(
      mutate((draft) => {
        const scope = (draft.scoring_content as Record<string, unknown>)
          .evaluation_scope as Record<string, unknown>;
        scope.public_release_date = "2025-12-20";
        scope.evaluation_maturity = "newly_released";
        const overall = (draft.scoring_content as Record<string, unknown>)
          .overall_confidence as Record<string, unknown>;
        overall.evaluation_maturity = "newly_released";
      }),
    );
    expect(result.issues.some((issue) => /must be Unknown under 30 days/.test(issue.message))).toBe(
      true,
    );
  });
});

describe("§15.1(7) differences, audit rates and adjudication", () => {
  it("classifies differences exactly as §11.2 states", () => {
    const numeric = (n: number) => ({ score_value_kind: "numeric" as const, numeric_score: n as never });
    const unknown = { score_value_kind: "unknown" as const, numeric_score: null };
    expect(classifyDifference(numeric(1), numeric(1), [], [])).toBe("exact");
    expect(classifyDifference(numeric(1), numeric(1.5), [], [])).toBe("adjacent");
    expect(classifyDifference(numeric(1), numeric(2), [], [])).toBe("material");
    expect(classifyDifference(numeric(1), unknown, [], [])).toBe("material");
    // Both Unknown with the same nonempty missing set is exact agreement…
    expect(classifyDifference(unknown, unknown, ["mode"], ["mode"])).toBe("exact");
    // …order does not matter, but partial overlap is not a match.
    expect(classifyDifference(unknown, unknown, ["mode", "build"], ["build", "mode"])).toBe("exact");
    expect(classifyDifference(unknown, unknown, ["mode", "build"], ["mode"])).toBe("material");
    expect(classifyDifference(unknown, unknown, [], [])).toBe("material");
  });

  it("rejects a difference class that does not recompute", () => {
    const result = reject(
      mutate((draft) => {
        const adjudication = (draft.scoring_content as Record<string, unknown>)
          .adjudication as Record<string, unknown>;
        const differences = adjudication.differences as Record<string, unknown>[];
        differences[0]!.difference_class = "adjacent";
        const summary = (draft.scoring_content as Record<string, unknown>)
          .audit_summary as Record<string, unknown>;
        summary.exact_count = 39;
        summary.adjacent_count = 1;
        summary.exact_rate = 39 / 40;
      }),
    );
    expect(result.issues.some((issue) => /does not recompute/.test(issue.message))).toBe(true);
  });

  it("rejects audit rates that do not recompute from the differences", () => {
    const result = reject(
      mutate((draft) => {
        const summary = (draft.scoring_content as Record<string, unknown>)
          .audit_summary as Record<string, unknown>;
        summary.exact_rate = 0.9;
      }),
    );
    expect(result.issues.some((issue) => issue.path === "audit_summary.exact_rate")).toBe(true);
  });

  it("requires owner review on a material difference and lists it as adjudicated", () => {
    // The schema's own conditional forces `owner_review_required` true on a
    // material class, so this fixture is structurally invalid by design; the
    // semantic validator is asserted directly to prove it does not depend on
    // the schema having caught it first.
    const unreviewed = (
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        decisionIn(draft, "audit_pass", "story_hook").numeric_score = 0.5;
        decisionIn(draft, "audit_pass", "story_hook").anchor_id = "story_hook@0.5";
        const adjudication = content.adjudication as Record<string, unknown>;
        const differences = adjudication.differences as Record<string, unknown>[];
        const difference = differences.find((d) => d.subcriterion_key === "story_hook")!;
        difference.difference_class = "material";
        difference.audit_value = { score_value_kind: "numeric", numeric_score: 0.5 };
        difference.owner_review_required = false;
        const summary = content.audit_summary as Record<string, unknown>;
        summary.exact_count = 39;
        summary.material_count = 1;
        summary.exact_rate = 39 / 40;
        summary.exact_or_adjacent_rate = 39 / 40;
      })
    );
    const result = validatePackageSemantics(unreviewed);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => /must be marked for owner review/.test(issue.message))).toBe(
      true,
    );
  });

  it("requires one difference record per paired decision, exact ones included", () => {
    // The owner-confirmed reading: `differences` carries a row for every paired
    // key, `difference_class = exact` included, which is what makes the paired
    // metrics and the per-key secondary differences reproducible.
    const result = reject(
      mutate((draft) => {
        const adjudication = (draft.scoring_content as Record<string, unknown>)
          .adjudication as Record<string, unknown>;
        const differences = adjudication.differences as Record<string, unknown>[];
        // Drop the exact row for one paired key.
        adjudication.differences = differences.filter(
          (difference) => difference.subcriterion_key !== "story_hook",
        );
        const summary = (draft.scoring_content as Record<string, unknown>)
          .audit_summary as Record<string, unknown>;
        summary.exact_count = 39;
      }),
    );
    expect(
      result.issues.some((issue) => /no difference record for paired key "story_hook"/.test(issue.message)),
    ).toBe(true);
  });

  it("requires difference_ids to be exactly the divergent per-key records", () => {
    // A row whose class is exact but which records a SECONDARY difference is
    // still a divergence needing retention, so it must be listed.
    const unlisted = reject(
      mutate((draft) => {
        const differences = (
          (draft.scoring_content as Record<string, unknown>).adjudication as Record<string, unknown>
        ).differences as Record<string, unknown>[];
        differences.find((d) => d.subcriterion_key === "story_hook")!.mapping_differs = true;
        // difference_ids left empty by the fixture.
      }),
    );
    expect(
      unlisted.issues.some((issue) => /missing diff-story_hook/.test(issue.message)),
    ).toBe(true);

    // Listing it satisfies the rule.
    const listed = mutate((draft) => {
      const content = draft.scoring_content as Record<string, unknown>;
      const differences = (content.adjudication as Record<string, unknown>)
        .differences as Record<string, unknown>[];
      differences.find((d) => d.subcriterion_key === "story_hook")!.mapping_differs = true;
      (content.audit_summary as Record<string, unknown>).difference_ids = ["diff-story_hook"];
    });
    expect(validatePackageSemantics(listed).valid).toBe(true);

    // And a clean exact row with no secondary difference must NOT be listed.
    const overlisted = reject(
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        (content.audit_summary as Record<string, unknown>).difference_ids = ["diff-story_hook"];
      }),
    );
    expect(
      overlisted.issues.some((issue) => /unexpected diff-story_hook/.test(issue.message)),
    ).toBe(true);
  });

  it("lists a confidence-only divergence even when the values agree exactly", () => {
    const result = reject(
      mutate((draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        // Same value, different confidence: an exact class with a real secondary
        // difference the audit record must retain.
        const audit = decisionIn(draft, "audit_pass", "story_hook");
        audit.confidence_facts = {
          coverage_state: "bounded",
          conflict_state: "none",
          stability_state: "stable",
        };
        audit.subcriterion_confidence = "Medium";
        const differences = (content.adjudication as Record<string, unknown>)
          .differences as Record<string, unknown>[];
        differences.find((d) => d.subcriterion_key === "story_hook")!.confidence_differs = true;
        const summary = content.audit_summary as Record<string, unknown>;
        summary.confidence_exact_rate = 39 / 40;
        // difference_ids still empty — the defect under test.
      }),
    );
    expect(
      result.issues.some((issue) => /missing diff-story_hook/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects a final value that is neither a pass resolution nor a documented override", () => {
    const result = reject(
      mutate((draft) => {
        const decision = decisionIn(draft, "final", "story_hook");
        decision.numeric_score = 1;
        decision.anchor_id = "story_hook@1";
      }),
    );
    expect(
      result.issues.some((issue) => /neither a recorded primary\/audit resolution/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects an endpoint final value without blind agreement or owner adjudication", () => {
    const result = reject(
      mutate((draft) => {
        // Only the audit pass reaches 2, and the final adopts it with no override.
        for (const set of ["audit_pass", "final"] as const) {
          const decision = decisionIn(draft, set, "story_hook");
          decision.numeric_score = 2;
          decision.anchor_id = "story_hook@2";
          decision.higher_anchor_rejection = null;
          decision.endpoint_gate = {
            scope_spanning_claim_ids: [
              set === "audit_pass" ? "audit-claim-story_hook-1" : "primary-claim-story_hook-1",
            ],
            calibration_reference: null,
            intent_genre_check: "Placeholder intent check.",
          };
        }
        const content = draft.scoring_content as Record<string, unknown>;
        const differences = (content.adjudication as Record<string, unknown>)
          .differences as Record<string, unknown>[];
        const difference = differences.find((d) => d.subcriterion_key === "story_hook")!;
        difference.difference_class = "material";
        difference.audit_value = { score_value_kind: "numeric", numeric_score: 2 };
        difference.owner_review_required = true;
        const summary = content.audit_summary as Record<string, unknown>;
        summary.exact_count = 39;
        summary.material_count = 1;
        summary.exact_rate = 39 / 40;
        summary.exact_or_adjacent_rate = 39 / 40;
        summary.endpoint_material_disagreement_count = 1;
        summary.difference_ids = ["diff-story_hook"];
      }),
    );
    expect(
      result.issues.some((issue) => /blind exact agreement or a documented owner adjudication/.test(issue.message)),
    ).toBe(true);
  });
});

describe("§15.1(8) derivation", () => {
  it("rejects a dimension total that does not derive from its five finals", () => {
    const result = reject(
      mutate((draft) => {
        const dimensions = (draft.scoring_content as Record<string, unknown>)
          .derived_dimensions as Record<string, unknown>[];
        dimensions[0]!.exact_value = 8;
      }),
    );
    expect(result.issues.some((issue) => /derives to 7\.5/.test(issue.message))).toBe(true);
  });

  it("derives a one-Unknown dimension as a range that caps confidence at Medium", () => {
    const ranged = mutate((draft) => {
      for (const set of ["primary_pass", "audit_pass", "final"] as const) {
        const decision = decisionIn(draft, set, "story_hook");
        Object.assign(decision, {
          score_value_kind: "unknown",
          numeric_score: null,
          anchor_id: null,
          unknown_reason: "late-game coverage absent",
          missing_coverage_classes: ["temporal_stratum"],
          insufficiency_reference_ids: ["frame-story_hook"],
          subcriterion_confidence: "Low",
          zero_reason: null,
          lower_anchor_rejection: null,
          higher_anchor_rejection: null,
          endpoint_gate: null,
          claim_ids: [],
          facet_records: [],
          confidence_facts: {
            coverage_state: "materially_limited",
            conflict_state: "none",
            stability_state: "stable",
          },
          // The late/end unit is missing, which derives to materially_limited.
          coverage_observed_unit_ids: ["story_hook-u1", "story_hook-u2", "story_hook-u3"],
          coverage_missing_unit_ids: ["story_hook-u4"],
        });
      }
      const content = draft.scoring_content as Record<string, unknown>;
      const dimensions = content.derived_dimensions as Record<string, unknown>[];
      const story = dimensions.find((d) => d.dimension_key === "story")!;
      Object.assign(story, {
        dimension_result_kind: "range",
        exact_value: null,
        lower_bound: 6,
        upper_bound: 8,
        dimension_confidence: "Medium",
      });
      // A ranged dimension with a Low subcriterion drops overall to Medium,
      // which in turn makes the evidence status provisional (§15.2).
      (content.overall_confidence as Record<string, unknown>).label = "Medium";
      (content.evaluation_scope as Record<string, unknown>).evidence_status = "verified";
      const differences = (content.adjudication as Record<string, unknown>)
        .differences as Record<string, unknown>[];
      const difference = differences.find((d) => d.subcriterion_key === "story_hook")!;
      difference.primary_value = { score_value_kind: "unknown", numeric_score: null };
      difference.audit_value = { score_value_kind: "unknown", numeric_score: null };
      const summary = content.audit_summary as Record<string, unknown>;
      summary.numeric_rate_primary = 39 / 40;
      summary.numeric_rate_audit = 39 / 40;
    });
    const result = validatePackageSemantics(ranged);
    // A visible range caps the dimension at Medium (§10.2) and the profile at
    // Medium overall (§10.3), but §15.2 demotes evidence_status only on Low
    // confidence or unstable state — so "verified" is correct here and the
    // package validates.
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);

    // And the range is rejected if its endpoints do not derive from the finals.
    const wrongRange = mutate((draft) => {
      const content = draft.scoring_content as Record<string, unknown>;
      const dimensions = content.derived_dimensions as Record<string, unknown>[];
      const story = dimensions.find((d) => d.dimension_key === "story")!;
      Object.assign(story, {
        dimension_result_kind: "range",
        exact_value: null,
        lower_bound: 6,
        upper_bound: 8,
        dimension_confidence: "Medium",
      });
    });
    expect(validatePackageSemantics(wrongRange).valid).toBe(false);
  });

  it("rejects an overall confidence label that does not derive", () => {
    const result = reject(
      mutate((draft) => {
        const dimensions = (draft.scoring_content as Record<string, unknown>)
          .derived_dimensions as Record<string, unknown>[];
        for (const dimension of dimensions) dimension.dimension_scope_state = "threatened";
      }),
    );
    // Threatened dimension scope forces every dimension label to Low (§10.2),
    // and because §10.3 recomputes from the re-derived labels rather than the
    // recorded ones, the overall label falls with them — a package cannot
    // launder a bad dimension label into a good overall one.
    expect(families(result).has("derivation")).toBe(true);
    expect(
      result.issues.some((issue) => /derived_dimensions\[story\].dimension_confidence/.test(issue.path)),
    ).toBe(true);
    expect(result.issues.some((issue) => issue.path === "overall_confidence.label")).toBe(true);
  });

  it("rejects duplicated scope facts that contradict the frozen scope", () => {
    const result = reject(
      mutate((draft) => {
        const overall = (draft.scoring_content as Record<string, unknown>)
          .overall_confidence as Record<string, unknown>;
        overall.profile_stability_state = "bounded_change";
      }),
    );
    expect(result.issues.some((issue) => /contradicts the frozen evaluation scope/.test(issue.message))).toBe(
      true,
    );
  });

  it("rejects a declared evidence_status the §15.2 rule does not produce", () => {
    const result = reject(
      mutate((draft) => {
        const scope = (draft.scoring_content as Record<string, unknown>)
          .evaluation_scope as Record<string, unknown>;
        scope.evidence_status = "provisional";
      }),
    );
    expect(result.issues.some((issue) => issue.path === "evaluation_scope.evidence_status")).toBe(
      true,
    );
  });
});

describe("§15.1(9) reassessment", () => {
  it("rejects a bounded reassessment with no baseline supplied", () => {
    const bounded = boundedReassessment();
    const result = validatePackageSemantics(bounded);
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) => /cannot be validated without its immutable baseline/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects an affected set that does not reproduce from the one-hop graph", () => {
    const bounded = boundedReassessment({ affectedOverride: ["story_hook"] });
    const result = validatePackageSemantics(bounded, { baseline: buildValidPackage() });
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) => /does not reproduce from the impact set/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects a carried-forward set that is not the affected set's complement", () => {
    const bounded = boundedReassessment({ dropOneCarriedForward: true });
    const result = validatePackageSemantics(bounded, { baseline: buildValidPackage() });
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) => /not exactly the affected set's complement/.test(issue.message)),
    ).toBe(true);
  });

  it("derives a carried-forward re-attestation's coverage state, never accepts it asserted", () => {
    // Amendment 2. `mergedDecisions` feeds these facts into dimension and
    // confidence derivation, so an asserted coverage state here would leave the
    // assertion-only path open on exactly the keys a bounded reassessment does
    // not rescore.
    const bounded = boundedReassessment({
      mutateCarried: (carried) => {
        // Late/end unit missing derives to materially_limited, not `full`.
        const entry = carried.find((c) => c.subcriterion_key === "mood_strength")!;
        entry.coverage_observed_unit_ids = [
          "mood_strength-u1",
          "mood_strength-u2",
          "mood_strength-u3",
        ];
        entry.coverage_missing_unit_ids = ["mood_strength-u4"];
      },
    });
    const result = validatePackageSemantics(bounded, { baseline: buildValidPackage() });
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) =>
        /re-attested coverage_state "full" does not derive/.test(issue.message),
      ),
    ).toBe(true);
  });

  it("requires the re-attestation to account for the whole new frame", () => {
    const bounded = boundedReassessment({
      mutateCarried: (carried) => {
        const entry = carried.find((c) => c.subcriterion_key === "mood_strength")!;
        entry.coverage_observed_unit_ids = ["mood_strength-u1", "mood_strength-u2"];
      },
    });
    const result = validatePackageSemantics(bounded, { baseline: buildValidPackage() });
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) => /must account for the whole new frame/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects a re-attestation naming a unit outside the new frozen frame", () => {
    const bounded = boundedReassessment({
      mutateCarried: (carried) => {
        const entry = carried.find((c) => c.subcriterion_key === "mood_strength")!;
        entry.coverage_observed_unit_ids = [
          ...(entry.coverage_observed_unit_ids as string[]),
          "not-a-frame-unit",
        ];
      },
    });
    const result = validatePackageSemantics(bounded, { baseline: buildValidPackage() });
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) => /not in the new frozen frame/.test(issue.message)),
    ).toBe(true);
  });

  it("rejects a baseline whose digest is not the one the package names", () => {
    const bounded = boundedReassessment();
    const otherBaseline = mutate((draft) => {
      const interpretation = (draft.scoring_content as Record<string, unknown>)
        .interpretation as Record<string, unknown>;
      interpretation.one_line_experience = "A different baseline.";
    });
    const result = validatePackageSemantics(bounded, { baseline: otherBaseline });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => /not the named/.test(issue.message))).toBe(true);
  });
});

/**
 * A bounded reassessment built from the same fixture: `story_hook` changed, so
 * §14's graph adds its one-hop neighbour `opening_effectiveness`.
 */
function boundedReassessment(
  options: {
    readonly affectedOverride?: string[];
    readonly dropOneCarriedForward?: boolean;
    readonly mutateCarried?: (carried: Record<string, unknown>[]) => void;
  } = {},
): ScoringPackage {
  const baseline = buildValidPackage();
  const affected = options.affectedOverride ?? ["story_hook", "opening_effectiveness"];
  return mutate((draft) => {
    const content = draft.scoring_content as Record<string, unknown>;
    content.evaluation_kind = "reassessment_affected";
    content.baseline_package_digest = baseline.content_digest;

    const keep = (decisions: Record<string, unknown>[]) =>
      decisions.filter((decision) => affected.includes(String(decision.subcriterion_key)));
    (content.primary_pass as Record<string, unknown>).decisions = keep(
      (content.primary_pass as Record<string, unknown>).decisions as Record<string, unknown>[],
    );
    (content.audit_pass as Record<string, unknown>).decisions = keep(
      (content.audit_pass as Record<string, unknown>).decisions as Record<string, unknown>[],
    );
    const adjudication = content.adjudication as Record<string, unknown>;
    adjudication.final_decisions = keep(
      adjudication.final_decisions as Record<string, unknown>[],
    );
    adjudication.differences = (adjudication.differences as Record<string, unknown>[]).filter(
      (difference) => affected.includes(String(difference.subcriterion_key)),
    );

    const summary = content.audit_summary as Record<string, unknown>;
    summary.paired_decision_count = affected.length;
    summary.exact_count = affected.length;
    summary.adjacent_count = 0;
    summary.material_count = 0;

    const complement = (buildValidPackage().scoring_content.adjudication.final_decisions ?? [])
      .map((decision) => decision.subcriterion_key)
      .filter((key) => !affected.includes(key));
    // Amendment 2: a carried-forward key is re-attested against the NEW frozen
    // frame and its coverage derived, not inherited from the baseline.
    const carried = complement.map((key) => ({
      subcriterion_key: key,
      confidence_facts: {
        coverage_state: "full",
        conflict_state: "none",
        stability_state: "stable",
      },
      coverage_observed_unit_ids: [1, 2, 3, 4].map((n) => `${key}-u${n}`),
      coverage_missing_unit_ids: [],
    }));
    if (options.dropOneCarriedForward) carried.pop();
    if (options.mutateCarried) options.mutateCarried(carried as unknown as Record<string, unknown>[]);

    content.reassessment_record = {
      trigger: "major_patch",
      checked_at: "2026-01-06T08:00:00Z",
      disposition: "affected_set_revision",
      initial_impact_keys: ["story_hook"],
      affected_set_keys: affected,
      carried_forward_reattestations: carried,
      active_source_ids: baseline.scoring_content.corpus.source_manifest.map((s) => s.source_id),
      superseded_source_ids: [],
      no_change_reason: null,
    };
  });
}
