import { describe, expect, it } from "vitest";
import {
  PRODUCT_EVENT_NAMES,
  PRODUCT_EVENT_REGISTRY,
  validateProductEvent,
} from "@/lib/analytics/events";

describe("The launch product-event registry", () => {
  it("defines every approved semantic event exactly once", () => {
    expect(Object.keys(PRODUCT_EVENT_REGISTRY).sort()).toEqual(
      [...PRODUCT_EVENT_NAMES].sort(),
    );
    for (const definition of Object.values(PRODUCT_EVENT_REGISTRY)) {
      expect(definition.purpose.length).toBeGreaterThan(10);
    }
  });

  it("accepts controlled semantic properties", () => {
    expect(
      validateProductEvent({
        name: "discovery_result_set_viewed",
        properties: {
          surface: "results",
          parser_version: "1",
          criterion_count: 3,
          criterion_types: ["platform", "session_window", "horror_fright"],
          result_state: "indeterminate",
        },
      }),
    ).toEqual([]);
  });

  it("rejects raw query text even when a caller tries to add it", () => {
    expect(
      validateProductEvent({
        name: "discovery_submitted",
        properties: {
          raw_query: "I have 30 minutes and hate horror",
        },
      }),
    ).toEqual([
      'discovery_submitted: prohibited property "raw_query".',
    ]);
  });

  it("rejects properties not explicitly owned by an event", () => {
    expect(
      validateProductEvent({
        name: "search_no_result",
        properties: { game_id: "not-a-result" },
      }),
    ).toEqual([
      'search_no_result: property "game_id" is not allowlisted.',
    ]);
  });
});
