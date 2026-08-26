export const PRODUCT_EVENT_NAMES = [
  "search_submitted",
  "search_profile_selected",
  "search_unprofiled_result_shown",
  "search_no_result",
  "profile_coverage_requested",
  "discovery_submitted",
  "discovery_interpretation_edited",
  "discovery_result_set_viewed",
  "discovery_result_selected",
  "discovery_constraint_relaxed",
  "compare_started",
  "compare_second_profile_selected",
  "compare_viewed",
  "compare_source_profile_opened",
  "profile_compare_started",
  "profile_evidence_expanded",
  "profile_outbound_link_followed",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

type EventProperty =
  | "surface"
  | "game_id"
  | "scope_id"
  | "other_game_id"
  | "other_scope_id"
  | "registry_id"
  | "destination_id"
  | "parser_version"
  | "taxonomy_version"
  | "catalog_version"
  | "criterion_count"
  | "criterion_types"
  | "result_state"
  | "device_class"
  | "session_id"
  | "visitor_id";

interface EventDefinition {
  readonly purpose: string;
  readonly allowedProperties: readonly EventProperty[];
}

const COMMON = [
  "surface",
  "catalog_version",
  "device_class",
  "session_id",
  "visitor_id",
] as const;

const SEARCH = ["registry_id", "game_id", "scope_id", "result_state"] as const;
const DISCOVERY = [
  "game_id",
  "scope_id",
  "parser_version",
  "taxonomy_version",
  "criterion_count",
  "criterion_types",
  "result_state",
] as const;
const COMPARE = [
  "game_id",
  "scope_id",
  "other_game_id",
  "other_scope_id",
] as const;

function definition(
  purpose: string,
  properties: readonly EventProperty[],
): EventDefinition {
  return { purpose, allowedProperties: properties };
}

export const PRODUCT_EVENT_REGISTRY: Readonly<
  Record<ProductEventName, EventDefinition>
> = {
  search_submitted: definition("Measure known-title Search attempts.", [
    ...COMMON,
    "result_state",
  ]),
  search_profile_selected: definition("Measure successful Search navigation.", [
    ...COMMON,
    ...SEARCH,
  ]),
  search_unprofiled_result_shown: definition(
    "Measure recognized gaps in catalog coverage.",
    [...COMMON, "registry_id"],
  ),
  search_no_result: definition("Measure unrecognized Search attempts.", [
    ...COMMON,
  ]),
  profile_coverage_requested: definition(
    "Measure private demand for one recognized unprofiled game.",
    [...COMMON, "registry_id"],
  ),
  discovery_submitted: definition("Measure discovery attempts.", [
    ...COMMON,
    ...DISCOVERY,
  ]),
  discovery_interpretation_edited: definition(
    "Measure where visible interpretation needs correction.",
    [...COMMON, ...DISCOVERY],
  ),
  discovery_result_set_viewed: definition(
    "Measure whether discovery returns a usable result state.",
    [...COMMON, ...DISCOVERY],
  ),
  discovery_result_selected: definition(
    "Measure discovery navigation into a profile.",
    [...COMMON, ...DISCOVERY],
  ),
  discovery_constraint_relaxed: definition(
    "Measure which hard constraints lead to deliberate relaxation.",
    [...COMMON, ...DISCOVERY],
  ),
  compare_started: definition("Measure entry into two-profile Compare.", [
    ...COMMON,
    ...COMPARE,
  ]),
  compare_second_profile_selected: definition(
    "Measure completion of a comparison pair.",
    [...COMMON, ...COMPARE],
  ),
  compare_viewed: definition("Measure full comparison views.", [
    ...COMMON,
    ...COMPARE,
  ]),
  compare_source_profile_opened: definition(
    "Measure return from Compare to authoritative profile detail.",
    [...COMMON, ...COMPARE],
  ),
  profile_compare_started: definition("Measure Compare starts from a profile.", [
    ...COMMON,
    ...COMPARE,
  ]),
  profile_evidence_expanded: definition(
    "Measure use of profile evidence detail.",
    [...COMMON, "game_id", "scope_id"],
  ),
  profile_outbound_link_followed: definition(
    "Measure use of verified official action links.",
    [...COMMON, "game_id", "scope_id", "destination_id"],
  ),
};

export type ProductEventValue = string | number | boolean | readonly string[];

export interface ProductEvent {
  readonly name: ProductEventName;
  readonly properties: Readonly<Record<string, ProductEventValue>>;
}

const PROHIBITED_PROPERTY =
  /(?:raw[_-]?query|query[_-]?text|form|keystroke|dom[_-]?text|url|email|contact|fingerprint|advertising)/i;

/** Fail closed before an event reaches any analytics provider. */
export function validateProductEvent(event: ProductEvent): readonly string[] {
  const definition = PRODUCT_EVENT_REGISTRY[event.name];
  const allowed = new Set<string>(definition.allowedProperties);
  const errors: string[] = [];

  for (const [property, value] of Object.entries(event.properties)) {
    if (PROHIBITED_PROPERTY.test(property)) {
      errors.push(`${event.name}: prohibited property "${property}".`);
      continue;
    }
    if (!allowed.has(property)) {
      errors.push(`${event.name}: property "${property}" is not allowlisted.`);
      continue;
    }
    if (Array.isArray(value) && !value.every((item) => typeof item === "string")) {
      errors.push(`${event.name}: property "${property}" must be scalar or string[].`);
    }
  }

  return errors;
}
