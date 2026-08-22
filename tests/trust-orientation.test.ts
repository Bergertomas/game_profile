import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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
    expect(text(renderProfile(pending))).toContain(
      `Researched and scored by ${SITE_EDITOR.long}`,
    );
  });

  it("names the editor in the footer of every page", () => {
    expect(text(renderToStaticMarkup(createElement(SiteFooter)))).toContain(
      `Researched and scored by ${SITE_EDITOR.short}`,
    );
  });

  it("attributes in plain text, because the About page is not published", () => {
    // The attribution does not wait on /about; the link to it does. A byline
    // pointing at a 404 is worse than a byline that simply states the fact.
    for (const html of [
      renderProfile(pending),
      renderToStaticMarkup(createElement(SiteFooter)),
      renderToStaticMarkup(createElement(SiteHeader)),
    ]) {
      expect(html).not.toContain('href="/about"');
    }
  });

  it("advertises only the rooms that exist", () => {
    const rendered = text(renderToStaticMarkup(createElement(SiteHeader)));
    expect(rendered).toContain("How we score");
    for (const unbuilt of ["About", "Compare"]) {
      expect(rendered).not.toContain(unbuilt);
    }
    expect(rendered).not.toMatch(/\bFind\b/);
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
