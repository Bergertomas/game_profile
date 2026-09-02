import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { RUBRIC_V1 } from "@/lib/rubric";

/**
 * The draft scoring-package schema is a contract document
 * (Protocol §15: "The JSON Schema and this checklist together are the package
 * contract"), so its conditionals are behavior and get tests like any other
 * behavior. Each case here exercises one rule from both directions — the
 * instance the rule admits and the near-miss it must reject — so a later edit
 * that silently widens the contract fails here rather than at import time.
 */

const schema = JSON.parse(
  readFileSync(
    new URL(
      "../docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

// Compiling registers the document and validates it against the 2020-12
// metaschema; a structurally invalid schema fails the suite at import.
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
ajv.addSchema(schema);

/** A validator for one $defs entry (or any JSON-pointer path into the schema). */
function at(pointer: string) {
  const validate = ajv.compile({ $ref: `${schema.$id}#${pointer}` });
  return (instance: unknown) => validate(instance);
}

describe("schema hygiene", () => {
  it("every $ref resolves and every $defs entry is referenced", () => {
    const raw = JSON.stringify(schema);
    const defs = new Set(Object.keys(schema.$defs));
    const refs = new Set(
      [...raw.matchAll(/"\$ref":"#\/\$defs\/([A-Za-z0-9_]+)"/g)].map(
        (m) => m[1]!,
      ),
    );
    expect([...refs].filter((r) => !defs.has(r))).toEqual([]);
    expect([...defs].filter((d) => !refs.has(d))).toEqual([]);
  });

  it("the subcriterion key enum is exactly the rubric registry", () => {
    const schemaKeys = [...schema.$defs.subcriterionKey.enum].sort();
    const rubricKeys = RUBRIC_V1.dimensions
      .flatMap((d) => d.subcriteria.map((s) => s.key))
      .sort();
    expect(schemaKeys).toEqual(rubricKeys);
  });
});

describe("dates validate by pattern, not annotation-only format", () => {
  const date = at("/$defs/date");
  const dateTime = at("/$defs/dateTime");

  it("accepts real dates and timestamps", () => {
    expect(date("2026-08-25")).toBe(true);
    expect(date("2026-12-31")).toBe(true);
    expect(dateTime("2026-08-25T10:00:00Z")).toBe(true);
  });

  it("rejects junk and impossible field values", () => {
    expect(date("yesterday")).toBe(false);
    expect(date("2026-99-99")).toBe(false);
    expect(dateTime("2026-08-25 10:00")).toBe(false);
    expect(dateTime("2026-08-25T25:00:00Z")).toBe(false);
  });
});

const confidenceFacts = {
  coverage_state: "full",
  conflict_state: "none",
  stability_state: "stable",
};

function facet(key: string, score = 1.5) {
  return {
    facet_key: key,
    score_value_kind: "numeric",
    numeric_score: score,
    unknown_reason: null,
    missing_coverage_classes: [],
    observed_pattern: "observed across strata",
    recurrence: "widespread",
    consequence: "material",
  };
}

const endpointGate = {
  scope_spanning_claim_ids: ["c1"],
  calibration_reference: null,
  intent_genre_check: "form-appropriate test applied",
};

function decision(overrides: Record<string, unknown> = {}) {
  return {
    subcriterion_key: "story_hook",
    score_value_kind: "numeric",
    numeric_score: 1,
    anchor_id: "story_hook@1",
    unknown_reason: null,
    missing_coverage_classes: [],
    observed_pattern: "pattern",
    lower_anchor_rejection: "the 0.5 band's dominance of limitations is absent",
    higher_anchor_rejection: "no recurring clear strength across units",
    internal_rationale: "internal",
    public_rationale: "a public rationale over thirty-one characters",
    claim_ids: ["c1"],
    insufficiency_reference_ids: [],
    counterevidence_disposition: "reviewed",
    facet_records: [],
    confidence_facts: confidenceFacts,
    subcriterion_confidence: "High",
    zero_reason: null,
    endpoint_gate: null,
    platform_overrides: [],
    // Required since the issue #44 coverage amendment: the decision's share of
    // the frozen frame, disjoint and total (Protocol §6.1).
    coverage_observed_unit_ids: ["u1"],
    coverage_missing_unit_ids: [],
    ...overrides,
  };
}

describe("scoreDecision", () => {
  const valid = at("/$defs/scoreDecision");

  it("accepts a mid-scale decision carrying both anchor rejections", () => {
    expect(valid(decision())).toBe(true);
  });

  it("requires both adjacent rejections mid-scale (§6.1)", () => {
    expect(valid(decision({ lower_anchor_rejection: null }))).toBe(false);
    expect(valid(decision({ higher_anchor_rejection: null }))).toBe(false);
  });

  it("holds public rationales to the calibration-corpus floor", () => {
    expect(valid(decision({ public_rationale: "too short" }))).toBe(false);
  });

  it("gates endpoints: a 2 needs the §9 record and its one adjacent rejection", () => {
    const two = decision({
      numeric_score: 2,
      anchor_id: "story_hook@2",
      higher_anchor_rejection: null,
      endpoint_gate: endpointGate,
    });
    expect(valid(two)).toBe(true);
    expect(valid({ ...two, endpoint_gate: null })).toBe(false);
    expect(valid({ ...two, lower_anchor_rejection: null })).toBe(false);
  });

  it("gates a 0 the same way, plus its zero_reason", () => {
    const zero = decision({
      numeric_score: 0,
      anchor_id: "story_hook@0",
      zero_reason: "absent_offering",
      lower_anchor_rejection: null,
      endpoint_gate: endpointGate,
    });
    expect(valid(zero)).toBe(true);
    expect(valid({ ...zero, zero_reason: null })).toBe(false);
  });

  it("rejects a stray gate on a non-endpoint value", () => {
    expect(valid(decision({ endpoint_gate: endpointGate }))).toBe(false);
  });

  const unknown = decision({
    score_value_kind: "unknown",
    numeric_score: null,
    anchor_id: null,
    unknown_reason: "not observed",
    missing_coverage_classes: ["temporal_stratum"],
    claim_ids: [],
    insufficiency_reference_ids: ["cs1"],
    subcriterion_confidence: "Low",
    lower_anchor_rejection: null,
    higher_anchor_rejection: null,
  });

  it("accepts an Unknown decision and rejects leftover numeric fields on it", () => {
    expect(valid(unknown)).toBe(true);
    expect(valid({ ...unknown, lower_anchor_rejection: "x" })).toBe(false);
  });

  it("binds the six facet-bearing criteria to exactly their two facets", () => {
    const parent = decision({
      subcriterion_key: "narrative_momentum",
      anchor_id: "narrative_momentum@1",
    });
    const both = [facet("development_momentum"), facet("payoff")];
    expect(valid({ ...parent, facet_records: both })).toBe(true);
    expect(valid({ ...parent, facet_records: [facet("payoff")] })).toBe(false);
    expect(
      valid({
        ...parent,
        facet_records: [facet("development_momentum"), facet("rule_behavior")],
      }),
    ).toBe(false);
    expect(valid(decision({ facet_records: both }))).toBe(false);
  });
});

function claim(overrides: Record<string, unknown> = {}) {
  return {
    claim_id: "c1",
    source_id: "s1",
    paraphrase: "p",
    claim_type: "direct_observation",
    claim_direction: "supports_higher",
    observation_basis: "source_reported",
    subcriterion_key: "story_hook",
    scope_platform_build_time: "PC, 1.0, launch window",
    exact_locator: null,
    observed_unit_ids: ["u1"],
    scorer_inference: null,
    recurrence: "recurring",
    consequence: "material",
    anchor_condition_ids: [],
    corroborating_claim_ids: [],
    contradicting_claim_ids: [],
    limitation: null,
    spoiler: false,
    disposition: "accepted",
    disposition_reason: "specific and scoped",
    retrospective_time: null,
    ...overrides,
  };
}

describe("claim", () => {
  const valid = at("/$defs/claim");

  it("facts carry no observation spread; observations must carry one", () => {
    expect(valid(claim())).toBe(true);
    expect(
      valid(claim({ claim_type: "fact", recurrence: null, consequence: null })),
    ).toBe(true);
    expect(valid(claim({ claim_type: "fact" }))).toBe(false);
    expect(valid(claim({ recurrence: null }))).toBe(false);
  });

  it("stores exactly one retrospective date basis", () => {
    const both = {
      retrospective_observation_date: "2026-08-01",
      play_completion_date: "2026-01-01",
      latest_possible_play_date: "2026-01-01",
      elapsed_days_lower_bound: 212,
    };
    expect(valid(claim({ retrospective_time: both }))).toBe(false);
    expect(
      valid(
        claim({
          retrospective_time: { ...both, latest_possible_play_date: null },
        }),
      ),
    ).toBe(true);
  });
});

function difference(overrides: Record<string, unknown> = {}) {
  return {
    difference_id: "d1",
    subcriterion_key: "story_hook",
    difference_class: "adjacent",
    primary_value: { score_value_kind: "numeric", numeric_score: 1 },
    audit_value: { score_value_kind: "numeric", numeric_score: 1.5 },
    claim_inclusion_differs: false,
    mapping_differs: false,
    disposition_differs: false,
    confidence_differs: false,
    owner_review_required: false,
    resolution_reason: "reconciled",
    ...overrides,
  };
}

describe("difference", () => {
  const valid = at("/$defs/difference");
  const unknownValue = { score_value_kind: "unknown", numeric_score: null };
  const two = { score_value_kind: "numeric", numeric_score: 2 };

  it("binds §11.3's mandatory owner review to material differences", () => {
    expect(valid(difference())).toBe(true);
    expect(
      valid(difference({ difference_class: "material", audit_value: unknownValue })),
    ).toBe(false);
    expect(
      valid(
        difference({
          difference_class: "material",
          audit_value: unknownValue,
          owner_review_required: true,
        }),
      ),
    ).toBe(true);
  });

  it("and to any disagreement touching an endpoint value", () => {
    expect(valid(difference({ primary_value: two }))).toBe(false);
    expect(
      valid(difference({ primary_value: two, owner_review_required: true })),
    ).toBe(true);
  });
});

function scope(overrides: Record<string, unknown> = {}) {
  return {
    canonical_slug: "alan-wake-2",
    canonical_title: "Alan Wake 2",
    scope_key: "default",
    edition: "Base game",
    mode: "Campaign",
    included_platforms: ["ps5"],
    build_cutoff: "1.2.3",
    release_state: "released",
    pre_release_playable_basis: null,
    evidence_status: "verified",
    evaluation_maturity: "mature",
    public_release_date: "2023-10-27",
    evidence_cutoff: "2026-08-25",
    direct_play: {
      status: "none",
      evaluator: null,
      platform: null,
      build: null,
      started_at: null,
      ended_at: null,
      hours: null,
      covered_segments: [],
    },
    known_exclusions: [],
    profile_stability_state: "stable",
    global_scope_state: "sound",
    ...overrides,
  };
}

describe("evaluationScope", () => {
  const valid = at("/$defs/evaluationScope");

  it("derives evidence_status from release state and stability (§15.2)", () => {
    expect(valid(scope())).toBe(true);
    expect(
      valid(scope({ profile_stability_state: "actively_changing" })),
    ).toBe(false);
    expect(
      valid(
        scope({
          profile_stability_state: "actively_changing",
          evidence_status: "provisional",
        }),
      ),
    ).toBe(true);
    expect(valid(scope({ evidence_status: "pre_release" }))).toBe(false);
  });

  it("requires the hands_on/review_code basis exactly when playable pre-release", () => {
    const playable = scope({
      release_state: "pre_release_playable",
      evaluation_maturity: "pre_release",
      public_release_date: null,
      evidence_status: "pre_release",
    });
    expect(valid(playable)).toBe(false);
    expect(
      valid({ ...playable, pre_release_playable_basis: "hands_on" }),
    ).toBe(true);
    expect(
      valid(
        scope({
          release_state: "announced",
          evaluation_maturity: "pre_release",
          public_release_date: null,
          evidence_status: "pre_release",
          pre_release_playable_basis: "hands_on",
        }),
      ),
    ).toBe(false);
  });

  it("takes the evidence cutoff as a date, not a timestamp", () => {
    expect(valid(scope({ evidence_cutoff: "2026-08-25T10:00:00Z" }))).toBe(
      false,
    );
  });
});

describe("corpus and run manifests", () => {
  const families = [
    "title_edition",
    "full_game",
    "platform_technical",
    "late_game_endgame",
    "specialist",
    "major_patches",
    "material_disagreement",
  ];
  const audit = (f: string) => ({
    query_family: f,
    disposition: "run",
    reason: "ran",
  });

  it("requires each query family exactly once, not any seven rows", () => {
    const valid = at("/$defs/corpus/properties/query_family_audit");
    expect(valid(families.map(audit))).toBe(true);
    expect(valid(families.map(() => audit("title_edition")))).toBe(false);
  });

  it("scoring seeds are integers or the declared sentinel", () => {
    const valid = at("/$defs/runManifest/properties/seed");
    expect(valid(42)).toBe(true);
    expect(valid("parameter_unavailable")).toBe(true);
    expect(valid("whatever")).toBe(false);
    expect(valid(null)).toBe(false);
  });

  it("the research role lives on the research manifest only", () => {
    expect(at("/$defs/runManifest/properties/role")("research")).toBe(false);
    expect(at("/$defs/researchRunManifest/properties/role")("research")).toBe(
      true,
    );
  });

  it("coverage frames carry the §6.1 four-unit minimum", () => {
    const valid = at("/$defs/coverageFrame");
    const unit = (i: number) => ({
      unit_id: `u${i}`,
      label: `unit ${i}`,
      unit_class: "temporal_stratum",
      centrality: "central",
      // A central unit is always materially_limiting (§6.1, amendment 1).
      omission_effect: "materially_limiting",
    });
    const frame = {
      coverage_frame_id: "f1",
      subcriterion_key: "story_hook",
      coverage_units: [0, 1, 2, 3].map(unit),
    };
    expect(valid(frame)).toBe(true);
    expect(valid({ ...frame, coverage_units: [unit(0)] })).toBe(false);
  });
});

describe("derived results and interpretation", () => {
  it("caps a visible range at Medium dimension confidence (§10.2)", () => {
    const valid = at("/$defs/derivedDimension");
    const range = {
      dimension_key: "story",
      dimension_result_kind: "range",
      exact_value: null,
      lower_bound: 7.0,
      upper_bound: 9.0,
      dimension_confidence: "Medium",
      dimension_scope_state: "sound",
    };
    expect(valid(range)).toBe(true);
    expect(valid({ ...range, dimension_confidence: "High" })).toBe(false);
  });

  it("holds interpretation blocks to the publish gate's 2–5 bullets", () => {
    const valid = at("/$defs/interpretation");
    const interp = (n: number) => {
      const bullets = ["one", "two", "three", "four", "five", "six"].slice(0, n);
      return {
        one_line_experience: "x",
        primary_pull: "x",
        primary_risk: "x",
        experience_tags: [],
        great_fit_if: bullets,
        know_before_buying: bullets,
        probably_not_for_you_if: bullets,
        material_platform_warning: null,
      };
    };
    expect(valid(interp(3))).toBe(true);
    expect(valid(interp(1))).toBe(false);
    expect(valid(interp(6))).toBe(false);
  });
});

describe("reassessmentRecord", () => {
  const valid = at("/$defs/reassessmentRecord");
  const affected = [
    "technical_stability",
    "gameplay_execution",
    "production_cohesion",
    "consistency",
  ];
  const carried = (schema.$defs.subcriterionKey.enum as string[])
    .filter((k) => !affected.includes(k))
    .map((k) => ({
      subcriterion_key: k,
      confidence_facts: confidenceFacts,
      // Required since Amendment 2: a carried-forward key re-attests its
      // coverage against the new frozen frame rather than inheriting it (§14).
      coverage_observed_unit_ids: [`${k}-u1`],
      coverage_missing_unit_ids: [],
    }));
  const record = {
    trigger: "major_patch",
    checked_at: "2026-08-25T10:00:00Z",
    disposition: "affected_set_revision",
    initial_impact_keys: ["technical_stability"],
    affected_set_keys: affected,
    carried_forward_reattestations: carried,
    active_source_ids: ["s1"],
    superseded_source_ids: [],
    no_change_reason: null,
  };

  it("a bounded revision re-attests its complement; a full one carries none", () => {
    expect(valid(record)).toBe(true);
    expect(valid({ ...record, carried_forward_reattestations: [] })).toBe(
      false,
    );
    expect(valid({ ...record, disposition: "full_revision" })).toBe(false);
    expect(
      valid({
        ...record,
        disposition: "full_revision",
        carried_forward_reattestations: [],
      }),
    ).toBe(true);
  });

  it("no_change never reaches a package (§14)", () => {
    expect(valid({ ...record, disposition: "no_change" })).toBe(false);
  });
});
