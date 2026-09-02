import { notFound } from "next/navigation";
import { CompareHarnessView } from "@/components/compare/CompareHarnessView";
import { LauncherGuidance } from "@/components/compare/LauncherGuidance";
import { alanWake2, redfall, returnal } from "@/content";
import { buildCompareIndex, toCompareProfile, type CompareIndex, type CompareProfile } from "@/lib/compare";
import { resolveSelection, type Selection } from "@/lib/compare/selection";
import { listGameProfiles } from "@/lib/data/games";
import { scoreStateFixture } from "@/lib/design-lab/score-states";
import { buildProfileView } from "@/lib/profile/build";
import type { Evaluation, GameWithEvaluation } from "@/lib/profile/types";
import { indexFrom } from "@/lib/search/public-index";
import { registryForBuild } from "@/lib/search/test-registry";
import { DESIGN_SURFACES_ENABLED } from "@/lib/site";

/**
 * Review harness for the Compare states the shipped catalogue cannot reach,
 * or cannot reach with artwork (handoff §12; matrix §5).
 *
 * Production clears no artwork (ADR 0011), publishes no range, no Not scored,
 * no material override and no sibling scope, and its recognised registry is
 * empty. Every one of those is a state the accepted C1–C4 system has to
 * render, and the rules about how they LOOK — "both territories keep equal
 * weight with one artwork", "a Range gets no bridge", "a shared tag with two
 * intensities writes both" — can only be checked by looking.
 *
 * It renders the CANONICAL `CompareView`, never a harness-only copy. Art-led
 * states use the evaluation-clearance overlay, which resolves only on a
 * non-production build — the one permitted mechanism for reviewing artwork,
 * and the reason this route 404s on the public site.
 *
 * ── Every fixture is labelled, and that is not decoration ──────────────────
 *
 * The real profiles appear under their own names only where their real
 * values are shown. Every constructed state announces itself as a fixture in
 * its title, because the one failure mode a design harness has is a
 * screenshot of it being read as the product.
 */
export default async function CompareStatesPage() {
  if (!DESIGN_SURFACES_ENABLED) notFound();

  const profiles = await listGameProfiles();
  const index = buildCompareIndex(profiles, indexFrom(profiles, registryForBuild()));

  const aw2 = toCompareProfile(buildProfileView(alanWake2));
  const ret = toCompareProfile(buildProfileView(returnal));
  const red = toCompareProfile(buildProfileView(redfall));
  const artless = (profile: CompareProfile): CompareProfile => ({ ...profile, artwork: null });

  const pair = (left: CompareProfile | null, right: CompareProfile | null): Selection => ({
    left,
    right,
    notices: [],
    tokens: { left: left?.slug ?? null, right: right?.slug ?? null, extra: [] },
  });

  // A registry entry that exists only here, so the recognised-but-unprofiled
  // notice is reachable without a synthetic-corpus build.
  const withRecognised: CompareIndex = {
    ...index,
    selector: {
      ...index.selector,
      recognized: [
        ...index.selector.recognized,
        {
          kind: "recognized",
          id: "fixture-recognised-game",
          title: "Fixture: a recognised, unprofiled game",
          note: "Fixture note: not yet evaluated.",
          terms: ["fixture recognised game"],
        },
      ],
    },
  };

  return (
    <div className="bg-[var(--color-surface-canvas)] text-[var(--color-text-primary)]">
      <Note>
        <strong>Slice 4 state harness.</strong> Labelled fixture renders of the
        canonical Compare component, not published comparisons. Artwork is the
        evaluation-clearance overlay and appears on non-production builds only.
      </Note>

      <Heading id="art-led">1 · Art-led pair (C1/C2) — evaluation-clearance artwork, preview only</Heading>
      <CompareHarnessView selection={pair(aw2, ret)} index={index} />

      <Heading id="artless">2 · Artless parity (C3/C4) — the production state, same content in the same order</Heading>
      <CompareHarnessView selection={pair(artless(aw2), artless(ret))} index={index} />

      <Heading id="left-art">3 · Mixed — left artwork only</Heading>
      <CompareHarnessView selection={pair(aw2, artless(ret))} index={index} />

      <Heading id="right-art">4 · Mixed — right artwork only</Heading>
      <CompareHarnessView selection={pair(artless(aw2), ret)} index={index} />

      <Heading id="failed-art">5 · Failed artwork — the left image never loads; the territory beneath it stands</Heading>
      <CompareHarnessView
        selection={pair(
          {
            ...aw2,
            title: "Failed-artwork fixture (Alan Wake 2 values)",
            artwork: {
              url: "/dev/compare-states/never-loads.jpg",
              width: 1920,
              height: 620,
              objectPosition: "center 40%",
              credit: "Fixture",
              clearance: "evaluation",
              creditLine: "Fixture artwork that does not exist; not a rights claim.",
            },
          },
          ret,
        )}
        index={index}
      />

      <Heading id="empty">6 · Empty launcher</Heading>
      <CompareHarnessView
        selection={pair(null, null)}
        index={index}
        launcher={<LauncherGuidance index={index} />}
      />

      <Heading id="left-only">7 · Left-only selection</Heading>
      <CompareHarnessView selection={pair(artless(aw2), null)} index={index} />

      <Heading id="self-pair">8 · Self-pair — refused, the left selection kept</Heading>
      <CompareHarnessView
        selection={artlessSelection(resolveSelection(index, "alan-wake-2,alan-wake-2"))}
        index={index}
      />

      <Heading id="invalid">9 · Unknown, unprofiled and ineligible identities</Heading>
      <CompareHarnessView
        selection={artlessSelection(resolveSelection(index, "no-such-game,returnal"))}
        index={index}
      />
      <CompareHarnessView
        selection={artlessSelection(resolveSelection(withRecognised, "fixture-recognised-game,returnal"))}
        index={withRecognised}
      />
      <CompareHarnessView
        selection={artlessSelection(resolveSelection(index, "alan-wake-2,returnal/tower-of-sisyphus"))}
        index={index}
      />
      <CompareHarnessView
        selection={artlessSelection(resolveSelection(index, "alan-wake-2,returnal,redfall"))}
        index={index}
      />

      <Heading id="relations">
        10 · Relation-state fixture — Equal, Close, Clear difference, a Range crossing a
        threshold, Not scored beside exact, Not scored beside Not scored, asymmetric confidence
      </Heading>
      <CompareHarnessView selection={pair(RELATION_LEFT, RELATION_RIGHT)} index={index} />

      <Heading id="provisional">11 · Provisional beside Verified — Redfall&rsquo;s real state, asymmetric confidence</Heading>
      <CompareHarnessView selection={pair(artless(aw2), artless(red))} index={index} />

      <Heading id="tags">12 · Tag fixture — a shared tag with equal intensity, a shared tag with two intensities, side-unique tags</Heading>
      <CompareHarnessView selection={pair(artless(aw2), TAG_RIGHT)} index={index} />

      <Heading id="long">13 · Long title and long platform names</Heading>
      <CompareHarnessView selection={pair(LONG_LEFT, artless(ret))} index={index} />

      <Heading id="override">14 · Material platform warning and override — a fixture override on the left</Heading>
      <CompareHarnessView selection={pair(WITH_OVERRIDE, artless(ret))} index={index} />
    </div>
  );
}

function artlessSelection(selection: Selection): Selection {
  return {
    ...selection,
    left: selection.left ? { ...selection.left, artwork: null } : null,
    right: selection.right ? { ...selection.right, artwork: null } : null,
  };
}

function Heading({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="mx-auto max-w-[82rem] px-4 pt-12 pb-3 text-[1rem] font-semibold text-[var(--color-brand-evidence-cyan)] sm:px-10"
    >
      {children}
    </h2>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto max-w-[82rem] px-4 py-6 text-[0.875rem] leading-6 text-[var(--color-text-muted)] sm:px-10">
      {children}
    </p>
  );
}

function fixtureOf(base: GameWithEvaluation, title: string, slug: string): GameWithEvaluation {
  return { ...base, game: { ...base.game, canonicalTitle: title, slug } };
}

/**
 * The relation fixture. Left is the score-state proof (Story 9.5 exact,
 * Agency and Pacing published as ranges, Execution not scored). Right is
 * Returnal with two edits: Agency lowered to 8.5 so the left's 6.0–8.0 range
 * straddles the Close/Clear threshold against it, and Execution made not
 * scored so Not scored meets Not scored. Every other row keeps its real
 * relation: Craft 10.0/10.0 Equal, Atmosphere 10.0/9.5 Close, Story 9.5/7.5
 * Clear difference with asymmetric confidence.
 */
const RELATION_LEFT: CompareProfile = {
  ...toCompareProfile(buildProfileView(scoreStateFixture("Compare"))),
  slug: "fixture-relation-left",
  title: "Relation fixture, left (score-state proof)",
  artwork: null,
};

const RELATION_RIGHT: CompareProfile = (() => {
  const source = returnal.evaluation;
  const agencyKey = Object.keys(source.dimensions.agency)[0]!;
  const agencyEntry = source.dimensions.agency[agencyKey]!;
  const executionKeys = Object.keys(source.dimensions.execution).slice(0, 3);
  const evaluation: Evaluation = {
    ...source,
    confidence: "medium",
    dimensions: {
      ...source.dimensions,
      agency: {
        ...source.dimensions.agency,
        [agencyKey]: { ...agencyEntry, value: 0.5 },
      },
      execution: {
        ...source.dimensions.execution,
        ...Object.fromEntries(
          executionKeys.map((key) => [key, { value: "unknown", rationale: "" }]),
        ),
      },
    },
  };
  return {
    ...toCompareProfile(
      buildProfileView({
        ...fixtureOf(returnal, "Relation fixture, right (Returnal values, edited)", "fixture-relation-right"),
        evaluation,
      }),
    ),
    artwork: null,
  };
})();

/** Returnal's tags with resource pressure raised to High, against Alan Wake 2's Medium. */
const TAG_RIGHT: CompareProfile = {
  ...toCompareProfile(
    buildProfileView({
      ...fixtureOf(returnal, "Tag fixture (Returnal tags, edited)", "fixture-tags-right"),
      evaluation: {
        ...returnal.evaluation,
        tags: returnal.evaluation.tags.map((tag) =>
          tag.key === "resource-pressure" ? { ...tag, intensity: "high" as const } : tag,
        ),
      },
    }),
  ),
  artwork: null,
};

const LONG_LEFT: CompareProfile = {
  ...toCompareProfile(
    buildProfileView({
      ...alanWake2,
      game: {
        ...alanWake2.game,
        slug: "fixture-long-title",
        canonicalTitle:
          "Fixture — a deliberately long game title that has to wrap inside its territory without clipping or pushing the page sideways",
        platforms: [
          { slug: "fixture-long-platform", name: "Fixture Platform With A Deliberately Long Name Edition" },
          ...alanWake2.game.platforms,
        ],
      },
    }),
  ),
  artwork: null,
};

/** The synthetic override from tests/platform-overrides.test.ts, on the left. */
const WITH_OVERRIDE: CompareProfile = (() => {
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
              rationale:
                "Fixture override: path-traced presets destabilise frame delivery on mid-range hardware in a way console builds do not exhibit.",
              confidence: "medium",
            },
          ],
        },
      },
    },
  };
  return {
    ...toCompareProfile(
      buildProfileView({
        ...fixtureOf(alanWake2, "Platform-override fixture (Alan Wake 2 values)", "fixture-override"),
        evaluation,
      }),
    ),
    artwork: null,
  };
})();
