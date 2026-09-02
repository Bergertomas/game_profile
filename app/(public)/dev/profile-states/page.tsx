import { notFound } from "next/navigation";
import { GameProfile } from "@/components/profile/GameProfile";
import type { ScopeLink } from "@/components/profile/ScopeSwitcher";
import { alanWake2, redfall } from "@/content";
import type {
  SessionSuitabilityRecord,
  TotalCommitmentRecord,
} from "@/lib/discovery/time";
import { scoreStateFixture } from "@/lib/design-lab/score-states";
import { heroArtworkFor } from "@/lib/profile/artwork";
import { buildProfileView } from "@/lib/profile/build";
import type { Evaluation, GameWithEvaluation } from "@/lib/profile/types";
import { DESIGN_SURFACES_ENABLED } from "@/lib/site";

/**
 * Review harness for the Slice 3 profile states the shipped catalogue cannot
 * reach, or cannot reach with artwork.
 *
 * Production clears no artwork (ADR 0011), carries no practical-time record,
 * no material platform override, no sibling scope and no dimension published
 * as a range or Not scored. Every one of those is a state the accepted A3–A6
 * system has to render correctly, and the rules about how they LOOK — "the
 * artless page carries the same content in the same order", "an override sits
 * beside the value it qualifies", "Unknown is a word, never a zero" — can only
 * be checked by looking at them.
 *
 * It renders the CANONICAL `GameProfile`, never a harness-only copy. The
 * art-led state uses the evaluation-clearance overlay
 * (content/evaluation-artwork.ts), which resolves only on a non-production
 * build — the one already permitted mechanism for reviewing artwork, and the
 * reason this route 404s on the public site.
 *
 * ── The fixtures are labelled, and that is not decoration ──────────────────
 *
 * Every title below announces itself as a fixture render. The numbers, prose
 * and shapes are the real calibration corpus — approved content — but the
 * practical-time record, the override, the sibling scope and the score-state
 * profile are constructed here and say so, because the one failure mode a
 * design harness has is a screenshot of it being read as the product.
 *
 * Site environment, not NODE_ENV: a Cloudflare branch preview is a
 * production-mode build of a non-production site. See lib/site.ts.
 */
export default function ProfileStatesPage() {
  if (!DESIGN_SURFACES_ENABLED) notFound();

  const artLed = fixture(alanWake2, "Alan Wake 2 (fixture render)");
  const artwork = heroArtworkFor(alanWake2.game);

  return (
    <div className="bg-[var(--color-surface-canvas)] text-[var(--color-text-primary)]">
      <Note>
        <strong>Slice 3 state harness.</strong> Labelled fixture renders of the
        canonical profile component, not published profiles. The practical
        record, override, sibling scope and score-state profile are
        constructed here.
      </Note>

      <Heading>1 · Art-led (A3/A4) — evaluation-clearance artwork, preview only</Heading>
      <GameProfile profile={buildProfileView(artLed)} artwork={artwork} />

      <Heading>2 · Artless parity (A5/A6) — the same record, no artwork</Heading>
      <GameProfile profile={buildProfileView(artLed)} artwork={null} />

      <Heading>
        3 · Range, Not scored, Low/Medium/High confidence and a pre-release
        status, on one profile
      </Heading>
      <GameProfile
        profile={buildProfileView(scoreStateFixture("the profile page"))}
        artwork={null}
      />

      <Heading>4 · Provisional status with Low confidence rows — the real Redfall record</Heading>
      <GameProfile
        profile={buildProfileView(fixture(redfall, "Redfall (fixture render)"))}
        artwork={null}
      />

      <Heading>5 · A material platform override beside the value it qualifies</Heading>
      <GameProfile profile={buildProfileView(WITH_OVERRIDE)} artwork={null} />

      <Heading>
        6 · Practical commitment from an approved record: a band, a session
        window, and the Unknown states
      </Heading>
      <GameProfile
        profile={buildProfileView(fixture(alanWake2, "Practical-time fixture"))}
        artwork={null}
        practical={{ commitment: COMMITMENT_FIXTURE, session: SESSION_FIXTURE }}
      />
      <GameProfile
        profile={buildProfileView(fixture(alanWake2, "Practical-time fixture — Unknown"))}
        artwork={null}
        practical={{ commitment: COMMITMENT_UNKNOWN, session: SESSION_UNKNOWN }}
      />

      <Heading id="scopes">
        7 · A very long title, and a game with two evaluated experiences
      </Heading>
      <GameProfile
        profile={buildProfileView(fixture(alanWake2, LONG_TITLE))}
        artwork={null}
        scopes={SCOPE_FIXTURE}
      />
    </div>
  );
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

function fixture(base: GameWithEvaluation, title: string): GameWithEvaluation {
  return { ...base, game: { ...base.game, canonicalTitle: title } };
}

const LONG_TITLE =
  "Fixture — a deliberately long game title that has to wrap inside the identity plate without clipping or pushing the page sideways";

/** The synthetic override from tests/platform-overrides.test.ts. */
const WITH_OVERRIDE: GameWithEvaluation = (() => {
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
    ...alanWake2,
    game: { ...alanWake2.game, canonicalTitle: "Platform-override fixture" },
    evaluation,
  };
})();

const COMMITMENT_FIXTURE: TotalCommitmentRecord = {
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
};

const COMMITMENT_UNKNOWN: TotalCommitmentRecord = {
  ...COMMITMENT_FIXTURE,
  engagedPlay: { ...COMMITMENT_FIXTURE.engagedPlay, estimate: { kind: "unknown" } },
};

const SESSION_FIXTURE: SessionSuitabilityRecord = {
  scopeId: alanWake2.scope.id,
  usefulSessionWindow: "short",
  interruptionFlexibility: "low",
  rationale: "Fixture rationale.",
};

const SESSION_UNKNOWN: SessionSuitabilityRecord = {
  ...SESSION_FIXTURE,
  usefulSessionWindow: "unknown",
  interruptionFlexibility: "unknown",
};

/** Two scopes; the sibling links back to this page rather than to a dead route. */
const SCOPE_FIXTURE: readonly ScopeLink[] = [
  {
    key: "default",
    label: "Main game",
    summary:
      "Fixture scope summary: the single-player campaign. A second evaluated experience is linked beside it.",
    href: "/dev/profile-states#scopes",
    isCurrent: true,
  },
  {
    key: "fixture-sibling",
    label: "Fixture sibling scope",
    href: "/dev/profile-states#scopes",
    isCurrent: false,
  },
];
