import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GameProfile } from "@/components/profile/GameProfile";
import { alanWake2, redfall, returnal, SEED_PROFILES } from "@/content";
import { scoreStateFixture } from "@/lib/design-lab/score-states";
import type { ProfileArtwork } from "@/lib/profile/artwork";
import { buildProfileView } from "@/lib/profile/build";
import type { Evaluation, GameWithEvaluation } from "@/lib/profile/types";

/**
 * THE ACCEPTED PROFILE COMPOSITION, as markup (ADR 0032, handoff §8.1).
 *
 * What a browser cannot prove better than the DOM can: that the reading order
 * is the accepted order, that the artless page carries the same content as
 * the art-led one, that every uncertainty state is a word rather than a
 * colour, that platform truth reaches the row it qualifies, and that nothing
 * the accepted screens were drawn with — specimen time, the unresolved
 * "Evaluated" label — reaches production.
 */

const CLEARED_FIXTURE: ProfileArtwork = {
  url: "https://example.com/fixture-hero.jpg",
  alt: "Fixture key art.",
  width: 1920,
  height: 1080,
  objectPosition: "center 40%",
  credit: "Fixture Publisher",
  clearance: "production",
  basis: "press-kit",
  source: "press-kit",
  sourcePage: "https://example.com/press",
};

function render(
  record: GameWithEvaluation,
  artwork: ProfileArtwork | null = null,
  extra: Partial<Parameters<typeof GameProfile>[0]> = {},
): string {
  return renderToStaticMarkup(
    createElement(GameProfile, {
      profile: buildProfileView(record),
      artwork,
      ...extra,
    }),
  );
}

/** Visible text only, in document order, with tags and hidden text removed. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const DIMENSION_NAMES = [
  "Story & Character Investment",
  "Thematic & Emotional Impact",
  "Atmosphere & World Pull",
  "Medium-Specific Craft",
  "Agency & Satisfaction",
  "Execution & Polish",
  "Structure & Focus",
  "Pacing & Time Respect",
];

describe("The reading order", () => {
  const html = render(alanWake2);
  const text = textOf(html);

  it("answers the question before the instrument, in the accepted order", () => {
    // The accepted A3–A6 stage: evidence state, then the title, then the
    // platforms and exact scope, then the answer — all before the pull and
    // the tax, the fit guidance, the instrument, the warm reading ground and
    // the trust band.
    const marks = [
      "Verified", // evidence state, in the kicker over the title
      "Alan Wake 2", // h1
      "PlayStation 5", // platforms
      "Scope", // scope/build
      "Should I play this?",
      alanWake2.evaluation.oneLineExperience,
      "The pull",
      "The tax",
      "Who this is for",
      "Great fit if…",
      "The instrument",
      "Story & Character Investment",
      "Pacing & Time Respect",
      "Traits",
      "Platform warning", // beside the scope detail, on the reading ground
      "Scope detail",
      "How this profile was made",
    ];
    let cursor = -1;
    for (const mark of marks) {
      const at = text.indexOf(mark, cursor + 1);
      expect(at, `"${mark}" after position ${cursor}`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it("has exactly one h1, and it is the game", () => {
    const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/g)].map((m) => m[1]);
    expect(h1s).toEqual(["Alan Wake 2"]);
  });

  it("states the eight dimensions in the fixed public order", () => {
    const names = [...html.matchAll(/class="gp-row__name">([^<]+)</g)].map(
      (m) => m[1]!.replace(/&amp;/g, "&"),
    );
    expect(names).toEqual(DIMENSION_NAMES);
  });

  it("shows every exact value and confidence without interaction", () => {
    const values = [...html.matchAll(/gp-row__num">([^<]+)</g)].map((m) => m[1]);
    expect(values).toEqual(["9.5", "9.5", "10.0", "10.0", "7.5", "9.0", "8.5", "8.0"]);
    const confidences = [...html.matchAll(/gp-row__level">([^<]+)/g)].map(
      (m) => m[1]!.trim(),
    );
    expect(confidences).toEqual([
      "High confidence",
      "High confidence",
      "High confidence",
      "High confidence",
      "High confidence",
      "Medium confidence",
      "High confidence",
      "High confidence",
    ]);
  });

  it("gives every disclosure a real button with expanded and controls state", () => {
    const buttons = [...html.matchAll(/<button[^>]*class="gp-row__why"[^>]*>/g)];
    expect(buttons).toHaveLength(8);
    for (const [button] of buttons) {
      expect(button).toContain('aria-expanded="false"');
      expect(button).toMatch(/aria-controls="[^"]+"/);
    }
    // Every panel the buttons point at exists, hidden, in the DOM.
    for (const [, id] of html.matchAll(/aria-controls="([^"]+)"/g)) {
      expect(html).toContain(`id="${id}" hidden=""`);
    }
  });

  it("names the platforms in full, never as an abbreviation", () => {
    const list = html.match(/<ul class="gp-platforms"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? "";
    const names = [...list.matchAll(/<li>([^<]+)<\/li>/g)].map((m) => m[1]);
    expect(names).toEqual(["PC", "PlayStation 5", "Xbox Series X|S"]);
    // The identity never abbreviates. (The evaluation's own prose may name a
    // platform however the editor wrote it; that is content, not a label.)
    expect(list).not.toMatch(/\bXSX\b|\bPS5\b/);
  });
});

describe("Art-led and artless parity", () => {
  it("carries the same text in the same order with and without artwork", () => {
    const led = render(alanWake2, CLEARED_FIXTURE);
    const less = render(alanWake2, null);
    expect(led).toContain('data-art="led"');
    expect(less).toContain('data-art="less"');
    // The only text the artwork adds is its credit line; everything else is
    // identical, in the same sequence.
    const stripCredit = (t: string) =>
      t.replace(/Key art © Fixture Publisher\./, "").replace(/\s+/g, " ").trim();
    expect(stripCredit(textOf(led))).toBe(stripCredit(textOf(less)));
  });

  it("renders no image, no stage element and no placeholder without artwork", () => {
    const less = render(alanWake2, null);
    expect(less).not.toContain("<img");
    expect(less).not.toContain("gp-stage");
    expect(textOf(less)).not.toMatch(/no artwork|image unavailable|coming soon/i);
  });

  it("keeps cleared artwork out of the accessibility tree beside the title", () => {
    const led = render(alanWake2, CLEARED_FIXTURE);
    expect(led).toMatch(/<div class="gp-stage" aria-hidden="true">\s*<img[^>]*alt=""/);
    expect(led).toContain("Key art © Fixture Publisher.");
  });
});

describe("What the shipped page must not say", () => {
  const html = render(alanWake2);
  const text = textOf(html);

  it("renders no practical-time band and no specimen value without a record", () => {
    expect(html).not.toContain("gp-practical");
    for (const specimen of [
      "Substantial",
      "45–90",
      "Needs room to breathe",
      "focused 18",
      "completionist",
      "Total commitment",
      "Useful session",
    ]) {
      expect(text, specimen).not.toContain(specimen);
    }
  });

  it("does not ship the unresolved Evaluated label", () => {
    // Open decision (Master Plan §17.3, ADR 0032). The record's own term is
    // the one used, in the status line and the trust band alike.
    expect(text).not.toMatch(/\bEvaluated\b/);
    expect(text).toContain("Evidence cut-off 6 Aug 2026");
  });

  it("offers no storefront, no compare and no corrections destination", () => {
    expect(text).not.toMatch(/where to play/i);
    expect(text).not.toMatch(/compare with/i);
    expect(html).not.toMatch(/href="[^"]*compare/);
    expect(html).not.toMatch(/corrections@/);
    // The one link is to the published methodology.
    expect(html).toContain('href="/methodology"');
  });

  it("publishes no aggregate, and says so", () => {
    expect(text).not.toMatch(/overall score:\s*\d/i);
    expect(text).not.toMatch(/average score/i);
    expect(text).toContain("no overall score");
    expect(text).toMatch(/nothing is calculated from the area/);
  });
});

describe("Uncertainty states are words", () => {
  const html = render(scoreStateFixture("the profile page"));
  const text = textOf(html);

  it("states a range with both endpoints and no midpoint", () => {
    // Agency and Pacing each carry one unknown subcriterion: a 2-point range.
    const ranges = [...html.matchAll(/gp-row__num">(\d\.\d)–(\d\.\d)</g)];
    expect(ranges).toHaveLength(2);
    for (const [, low, high] of ranges) {
      expect(Number(high) - Number(low)).toBe(2);
    }
    expect(html).toContain('data-kind="range"');
    // No midpoint is manufactured anywhere: the two ranges are 6.0–8.0, and
    // 7.0 appears as no dimension's value.
    expect(html).not.toMatch(/gp-row__num">7\.0</);
    expect(text).toContain("range");
  });

  it("states Not scored for insufficient evidence, never zero", () => {
    expect(html).toContain('data-kind="insufficient"');
    expect(text).toContain("Not scored");
    expect(text).toContain("this is not zero");
    // The chart label for that axis is the word too.
    expect(html).toMatch(/gp-radar__label[^>]*data-kind="insufficient"[\s\S]*?gp-radar__value">Not scored</);
  });

  it("exposes Low, Medium and High confidence as text on the rows", () => {
    expect(text).toContain("Low confidence");
    expect(text).toContain("Medium confidence");
    expect(text).toContain("High confidence");
  });

  it("states a pre-release status before the answer, with the notice", () => {
    expect(html).toContain('data-status="pre_release"');
    expect(text.indexOf("Pre-release")).toBeLessThan(
      text.indexOf("Should I play this?"),
    );
    expect(text).toContain("not the finished release");
    expect(text).toContain("Looks promising if…");
    expect(text).not.toContain("Great fit if…");
  });
});

describe("Provisional is visible near the identity", () => {
  it("marks Redfall provisional over the title, with a caveat before the pull", () => {
    const text = textOf(render(redfall));
    // The state is a word in the kicker, before the answer is read.
    expect(text.indexOf("Provisional")).toBeLessThan(
      text.indexOf("Should I play this?"),
    );
    expect(text).toContain("Provisional · Medium confidence · Evidence cut-off");
    // And the caveat follows the stage, before the decision is argued.
    const caveat = text.indexOf("Provisional. Released, but the evidence");
    expect(caveat).toBeGreaterThan(-1);
    expect(caveat).toBeLessThan(text.indexOf("The pull"));
  });

  it("does not caveat a verified profile", () => {
    expect(textOf(render(returnal))).not.toContain("Provisional.");
  });
});

describe("Platform truth reaches the decision", () => {
  it("states the warning as the reading ground's aside and the note on its row", () => {
    const html = render(alanWake2);
    const text = textOf(html);
    // The accepted placement: the accent-ruled aside beside the scope detail.
    expect(text).toContain("Platform warning PC performance varies sharply");
    // Execution & Polish carries the technical-stability note on its row.
    const execution = html.slice(html.indexOf("Execution &amp; Polish"));
    expect(execution).toContain("Varies by platform");
    expect(execution).toContain("Platform note.");
    // And the itemised record follows the warning.
    expect(text).toContain("Execution & Polish · Technical Stability");
    expect(text.indexOf("Execution & Polish · Technical Stability")).toBeGreaterThan(
      text.indexOf("Platform warning PC performance"),
    );
  });

  it("states an override with its platform, value and base, without moving the total", () => {
    const base = alanWake2.evaluation.dimensions.execution.technical_stability!;
    const evaluation: Evaluation = {
      ...alanWake2.evaluation,
      dimensions: {
        ...alanWake2.evaluation.dimensions,
        execution: {
          ...alanWake2.evaluation.dimensions.execution,
          technical_stability: {
            ...base,
            platformOverrides: [
              {
                platform: "pc",
                value: 1,
                rationale: "Fixture override rationale.",
                confidence: "medium",
              },
            ],
          },
        },
      },
    };
    const html = render({ ...alanWake2, evaluation });
    const text = textOf(html);
    expect(text).toContain(
      "PC: 1.0 on this platform, against a base of 2.0. Fixture override rationale. (Medium confidence.)",
    );
    const values = [...html.matchAll(/gp-row__num">([^<]+)</g)].map((m) => m[1]);
    expect(values[5]).toBe("9.0");
  });

  it("omits the platform section for a profile with no variance", () => {
    const html = render(returnal);
    expect(textOf(html)).not.toContain("Platform and build");
    expect(html).not.toContain("gp-warning");
  });
});

describe("Practical commitment from an approved record", () => {
  it("renders the band, the session and Unknown as words, outside the rows", () => {
    const html = render(alanWake2, null, {
      practical: {
        commitment: {
          scopeId: alanWake2.scope.id,
          engagedPlay: {
            kind: "engaged_play",
            estimate: { kind: "hours", low: 12, high: 16 },
            source: {
              provider: "fixture-provider",
              source: "fixture-record",
              retrievedAt: "2026-08-26T12:00:00Z",
              overrideState: "none",
            },
          },
        },
        session: {
          scopeId: alanWake2.scope.id,
          usefulSessionWindow: "unknown",
          interruptionFlexibility: "low",
          rationale: "Fixture.",
        },
      },
    });
    const text = textOf(html);
    expect(text).toContain("Total commitment Moderate Engaged play 12–16 h");
    expect(text).toContain("Useful session Unknown");
    expect(text).toContain("Interruption flexibility Low");
    expect(text).toContain("Time never changes a score");
    // The accepted ruled row: after the pull and the tax, before the fit
    // guidance and the instrument.
    expect(text.indexOf("Practical commitment")).toBeGreaterThan(
      text.indexOf("The tax"),
    );
    expect(text.indexOf("Practical commitment")).toBeLessThan(
      text.indexOf("Who this is for"),
    );
    expect(text.indexOf("Practical commitment")).toBeLessThan(
      text.indexOf("The instrument"),
    );
    // Eight rows, still.
    expect([...html.matchAll(/gp-row__num"/g)]).toHaveLength(8);
  });

  it("refuses to render a record bound to another scope of the game", () => {
    // The profile is the main game; the record is for an expansion's scope.
    expect(() =>
      render(alanWake2, null, {
        practical: {
          session: {
            scopeId: "scp_alan_wake_2_night_springs",
            usefulSessionWindow: "short",
            interruptionFlexibility: "low",
            rationale: "Fixture.",
          },
        },
      }),
    ).toThrow(/bound to scope "scp_alan_wake_2_night_springs", not to the profile's scope "scp_alan_wake_2_default"/);
  });
});

describe("Every seeded profile", () => {
  it.each(SEED_PROFILES.map((p) => [p.game.canonicalTitle, p] as const))(
    "%s renders the full composition artless with eight rows",
    (_title, record) => {
      const html = render(record);
      expect([...html.matchAll(/class="gp-row"/g)]).toHaveLength(8);
      expect(html).toContain("How this profile was made");
      expect(html).not.toContain("gp-practical");
    },
  );
});
