import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GameProfile } from "@/components/profile/GameProfile";
import { alanWake2 } from "@/content";
import { buildProfileView } from "@/lib/profile/build";
import { linkedEvidenceSummary } from "@/lib/profile/vocabulary";
import { scoreStateFixture } from "@/lib/design-lab/score-states";

/**
 * A count of linked sources is a claim about reconciled individual records.
 * While the ledger is `pending` it holds evidence *classes* — one row can stand
 * for a whole body of critical coverage — so counting rows and publishing the
 * total both understates the basis and overstates its precision.
 *
 * D3's expanded rows published `N linked sources` off `linkedSources.length`
 * regardless of ledger state, which directly contradicted the evidence section
 * at the foot of the same page ("No source count is published until it does").
 *
 * These once ran against the design-lab copy of D3. They now run against the
 * canonical `GameProfile` — the component production actually serves — because
 * the lab copy is gone: D3 shipped, and a second implementation of the live
 * design proves nothing except that two files can disagree.
 */

/** Any numeric linked-source claim, in any phrasing we might drift into. */
const NUMERIC_SOURCE_CLAIM = /\d+\s*(?:linked\s*)?sources?\b/i;

function render(profile: Parameters<typeof GameProfile>[0]["profile"]): string {
  // Artless, as production is. The evidence copy does not vary with artwork,
  // and passing none keeps this a test of the copy rather than of the stage.
  return renderToStaticMarkup(
    createElement(GameProfile, { profile, artwork: null }),
  );
}

const pendingProfile = buildProfileView(alanWake2);

const populatedProfile = buildProfileView({
  ...alanWake2,
  evaluation: { ...alanWake2.evaluation, evidenceLedger: "populated" },
});

const profileWithInternalDirectPlay = buildProfileView({
  ...alanWake2,
  evaluation: {
    ...alanWake2.evaluation,
    sources: [
      ...alanWake2.evaluation.sources,
      {
        id: "internal_direct_play_record",
        title: "Internal full-game direct-play record",
        tier: "A",
        category: "direct_play",
        supports: ["story"],
      },
    ],
  },
});

describe("linkedEvidenceSummary", () => {
  it("never states a number while the ledger is pending", () => {
    for (const count of [0, 1, 2, 7]) {
      const copy = linkedEvidenceSummary("pending", count);
      expect(copy, `count=${count}`).not.toMatch(NUMERIC_SOURCE_CLAIM);
      expect(copy, `count=${count}`).not.toMatch(/\d/);
    }
  });

  it("uses the agreed pending wording when coverage exists", () => {
    expect(linkedEvidenceSummary("pending", 2)).toBe(
      "Evidence coverage recorded; source records pending",
    );
  });

  it("does not claim coverage that is not there", () => {
    expect(linkedEvidenceSummary("pending", 0)).toBe(
      "No evidence coverage recorded yet",
    );
  });

  it("may count once the ledger holds records", () => {
    expect(linkedEvidenceSummary("populated", 1)).toBe("1 linked source");
    expect(linkedEvidenceSummary("populated", 3)).toBe("3 linked sources");
    expect(linkedEvidenceSummary("populated", 0)).toBe("No source linked yet");
  });
});

describe("The profile page on a pending ledger", () => {
  it("is the state the seed corpus is actually in", () => {
    // If this ever flips, the assertions below stop proving anything.
    expect(pendingProfile.evaluation.evidenceLedger).toBe("pending");
    expect(
      pendingProfile.dimensions.some((d) => d.linkedSources.length > 0),
      "at least one dimension must have linked evidence, or a count could not be rendered anyway",
    ).toBe(true);
  });

  it("renders no numeric linked-source claim anywhere on the page", () => {
    const html = render(pendingProfile);
    expect(html).not.toMatch(NUMERIC_SOURCE_CLAIM);
  });

  it("renders no category-count block while individual records are pending", () => {
    const html = render(pendingProfile);
    expect(html).not.toContain('data-evidence-counts="reconciled"');
  });

  it("states the pending wording in the expanded rows", () => {
    const html = render(pendingProfile);
    expect(html).toContain("Evidence coverage recorded; source records pending");
  });

  it("describes public review status without leading with an internal calibration round", () => {
    const html = render(pendingProfile);
    expect(html).toContain("Editor reviewed");
    expect(html).not.toContain("Calibration round");
  });

  it("does not let the rows and the evidence section contradict each other", () => {
    const html = render(pendingProfile);
    // The foot of the page says no count is published…
    expect(html).toContain("No source count is published until it does");
    // …so nothing above it may publish one.
    expect(html).not.toMatch(NUMERIC_SOURCE_CLAIM);
  });

  it("names the list for what the ledger actually holds", () => {
    const html = render(pendingProfile);
    expect(html).toContain("Evidence classes bearing on this dimension");
    expect(html).not.toContain("Sources linked to this dimension");
  });

  it("holds on the score-state fixture too", () => {
    const html = render(buildProfileView(scoreStateFixture("D3")));
    expect(html).not.toMatch(NUMERIC_SOURCE_CLAIM);
  });

  it("keeps direct-play coverage internal rather than presenting it publicly", () => {
    expect(profileWithInternalDirectPlay.evidence.hasDirectPlay).toBe(true);

    const html = render(profileWithInternalDirectPlay);
    expect(html).not.toContain("Direct play");
    expect(html).not.toContain("Internal full-game direct-play record");
  });
});

describe("The profile page on a populated ledger", () => {
  it("does publish a count, so the pending copy is a real branch", () => {
    const html = render(populatedProfile);
    expect(html).toMatch(NUMERIC_SOURCE_CLAIM);
    expect(html).toContain('data-evidence-counts="reconciled"');
    expect(html).not.toContain(
      "Evidence coverage recorded; source records pending",
    );
    expect(html).toContain("Sources linked to this dimension");
  });
});
