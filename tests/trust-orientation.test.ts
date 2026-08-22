import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AboutPage from "@/app/(public)/about/page";
import { GameCard } from "@/components/GameCard";
import { GameProfile } from "@/components/profile/GameProfile";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { alanWake2 } from "@/content";
import { buildProfileView } from "@/lib/profile/build";
import { provenanceStatement } from "@/lib/profile/provenance";
import { SOURCE_CATEGORY_LABEL } from "@/lib/profile/vocabulary";
import { dimensionsInRadarOrder } from "@/lib/rubric";
import { SITE_EDITOR } from "@/lib/site";

/**
 * B1 — trust and orientation.
 *
 * The public design lock's first implementation slice: say who wrote this,
 * orient a reader who landed on a profile from search, and stop two trust
 * states from publishing claims the evidence does not support.
 *
 * These assertions are written against rendered text rather than markup
 * wherever the rule is about what a reader is told. The defects being fixed
 * were all defects of *copy* — a count that was not a count, a filing
 * reference standing in for an explanation, a label truncated out of
 * existence — so a test coupled to class names would pass through the next
 * one.
 */

/** Rendered text as a reader meets it, with the tags taken out. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The card without its screen-reader shape description.
 *
 * The description names dimensions in full on purpose — it is the text
 * equivalent of the polygon, read aloud, where "Story" alone would be
 * ambiguous. The visible row is the surface with a column width to lose.
 */
function visible(cardHtml: string): string {
  return text(cardHtml).split("Profile across 8 dimensions")[0] ?? "";
}

/** The text between two headings, so a section is asserted on its own copy. */
function section(rendered: string, from: string, to: string): string {
  return (rendered.split(from)[1] ?? "").split(to)[0] ?? "";
}

function renderProfile(record: typeof alanWake2): string {
  return renderToStaticMarkup(
    createElement(GameProfile, {
      profile: buildProfileView(record),
      artwork: null,
    }),
  );
}

const pending = alanWake2;
const populated = {
  ...alanWake2,
  evaluation: { ...alanWake2.evaluation, evidenceLedger: "populated" as const },
};

/**
 * Any source-category label with a number attached to it — "Critic reviews 1".
 * Markup-independent by design: the defect was the pairing, not the element it
 * was rendered in.
 */
const CATEGORY_WITH_COUNT = new RegExp(
  `(?:${Object.values(SOURCE_CATEGORY_LABEL)
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})\\s+\\d`,
);

describe("Ledger-pending evidence states no counts", () => {
  it("is the state the seed corpus is in, or these prove nothing", () => {
    expect(buildProfileView(pending).evaluation.evidenceLedger).toBe("pending");
    expect(
      buildProfileView(pending).evidence.categoryCounts.length,
    ).toBeGreaterThan(0);
  });

  it("attaches no number to any source category while pending", () => {
    expect(text(renderProfile(pending))).not.toMatch(CATEGORY_WITH_COUNT);
  });

  it("still names the classes of evidence the evaluation rested on", () => {
    const rendered = text(renderProfile(pending));
    const view = buildProfileView(pending);
    for (const { category } of view.evidence.categoryCounts) {
      expect(rendered).toContain(SOURCE_CATEGORY_LABEL[category]);
    }
  });

  it("says why the numbers are absent rather than leaving a gap", () => {
    expect(text(renderProfile(pending))).toContain(
      "Source records are still being reconciled; counts appear when the ledger is complete",
    );
  });

  it("publishes direct play in either state, because it is not a count", () => {
    expect(text(renderProfile(pending))).toMatch(/Direct play (?:Yes|Not yet)/);
    expect(text(renderProfile(populated))).toMatch(
      /Direct play (?:Yes|Not yet)/,
    );
  });

  it("does count once the ledger holds records, so the branch is real", () => {
    expect(text(renderProfile(populated))).toMatch(CATEGORY_WITH_COUNT);
  });
});

describe("Provenance reads for a visitor, with the audit key kept", () => {
  it("leads with meaning, not with a filing reference", () => {
    const statement = provenanceStatement({
      kind: "calibration",
      round: "round_1",
    });
    expect(statement.reader).toContain("calibration set");
    expect(statement.reader).not.toMatch(/round \d/i);
    expect(statement.audit).toBe("calibration · round 1");
  });

  it("covers every provenance kind", () => {
    expect(provenanceStatement({ kind: "editorial" }).audit).toBe("editorial");
    expect(provenanceStatement({ kind: "derived", note: "n" }).reader).toContain(
      "without editorial sign-off",
    );
  });

  it("renders both lines on the profile", () => {
    const rendered = text(renderProfile(pending));
    const statement = provenanceStatement(pending.evaluation.scoreProvenance);
    expect(rendered).toContain(statement.reader);
    expect(rendered).toContain(`Provenance: ${statement.audit}`);
  });

  it("no longer heads the summary grid with audit vocabulary", () => {
    // "Scores  Calibration round 1" as a bare row was the defect: exact,
    // checkable, and meaningless to a first-time reader.
    expect(text(renderProfile(pending))).not.toMatch(/Scores Calibration round/);
  });
});

describe("Orientation", () => {
  it("offers the method from the instrument head", () => {
    const html = renderProfile(pending);
    expect(text(html)).toContain("First profile? How to read it");
    expect(html).toContain('href="/methodology"');
  });

  it("keeps the axis summary beside it", () => {
    expect(text(renderProfile(pending))).toContain(
      "8 axes · 0–10 each · no overall score",
    );
  });
});

describe("Authorship", () => {
  it("names the editor on the profile that carries the judgement", () => {
    const html = renderProfile(pending);
    expect(text(html)).toContain(`Researched and scored by ${SITE_EDITOR.long}`);
    expect(html).toContain('href="/about"');
  });

  it("names the editor in the footer of every page", () => {
    const html = renderToStaticMarkup(createElement(SiteFooter));
    expect(text(html)).toContain(
      `Researched and scored by ${SITE_EDITOR.short}`,
    );
    expect(html).toContain('href="/about"');
  });

  it("puts About in the primary nav, in its locked position after How we score", () => {
    const rendered = text(renderToStaticMarkup(createElement(SiteHeader)));
    expect(rendered).toContain("How we score");
    expect(rendered).toContain("About");
    expect(rendered.indexOf("How we score")).toBeLessThan(
      rendered.indexOf("About"),
    );
  });

  it("does not advertise rooms that do not exist yet", () => {
    const rendered = text(renderToStaticMarkup(createElement(SiteHeader)));
    expect(rendered).not.toContain("Compare");
    expect(rendered).not.toMatch(/\bFind\b/);
  });
});

describe("The About page", () => {
  const html = renderToStaticMarkup(createElement(AboutPage));
  const rendered = text(html);

  it("answers the questions a sceptical reader has", () => {
    for (const heading of [
      "Who writes it",
      "How scoring works",
      "Direct play",
      "Why there is no overall score",
      "Independence and funding",
      "Corrections",
    ]) {
      expect(rendered).toContain(heading);
    }
  });

  it("attributes the work in whichever posture the build publishes", () => {
    expect(rendered).toMatch(
      new RegExp(`${SITE_EDITOR.short}|${SITE_EDITOR.long}|one person`),
    );
  });

  it("marks the sections the owner has not signed off", () => {
    // A placeholder a reader cannot see is a placeholder that ships.
    expect(rendered).toContain("Not published yet.");
  });

  it("claims no independence fact while the wording is unconfirmed", () => {
    const funding = section(rendered, "Independence and funding", "Corrections");
    expect(funding).toContain("does not yet publish a funding and independence");
    expect(funding).toContain("unstated rather than as a claim");
    // No disclosure is asserted in either direction until the owner writes it.
    expect(funding).not.toMatch(/no advertising|no affiliate|reader-funded|sponsor/i);
  });

  it("links the rubric rather than restating it", () => {
    expect(html).toContain('href="/methodology"');
  });
});

describe("No aggregate figure is printed anywhere, even as an example", () => {
  it("holds on the About page", () => {
    const rendered = text(renderToStaticMarkup(createElement(AboutPage)));
    expect(rendered).toContain("no overall score");
    // "87" was the worked example this copy used to argue against aggregates.
    // Printing one to refute it still teaches that a single number is the unit
    // of comparison here. The only two-digit figure allowed on the page is the
    // 0–10 scale itself.
    const twoDigit = rendered.match(/\b\d{2}\b/g) ?? [];
    expect(new Set(twoDigit)).toEqual(new Set(["10"]));
  });
});

describe("Card labels survive a narrow column", () => {
  const cardHtml = renderToStaticMarkup(
    createElement(GameCard, { profile: buildProfileView(pending) }),
  );

  it("names each extreme with the short label the radar axis uses", () => {
    expect(visible(cardHtml)).toMatch(/Strongest Atmosphere/);
    expect(visible(cardHtml)).toMatch(/Weakest Agency/);
  });

  it("prints no full rubric name in the visible row", () => {
    // Every long form, checked as a class rather than two examples.
    for (const dimension of dimensionsInRadarOrder()) {
      expect(visible(cardHtml)).not.toContain(dimension.name);
    }
  });

  it("keeps the full names in the screen-reader description, where they belong", () => {
    expect(text(cardHtml)).toContain("Atmosphere & World Pull");
  });
});
