import Link from "next/link";
import { ProfileRadar } from "@/components/profile/radar";
import { MARK } from "@/components/profile/radar-layout";
import { formatYear } from "@/lib/format";
import { accentFor } from "@/lib/profile/accent";
import { coverArtworkFor } from "@/lib/profile/artwork";
import type { DimensionView, ProfileView } from "@/lib/profile/build";
import { EVIDENCE_STATUS_LABEL } from "@/lib/profile/vocabulary";
import type { CSSProperties } from "react";

/**
 * THE GAME CARD. One grammar, for every list of games this product will ever
 * show: the homepage shelf today, and discover, search results, related games
 * and comparison surfaces when they exist. None of those are built here — this
 * is the foundation they will need, and building it once is what stops five
 * screens inventing five card designs.
 *
 * THE CARD READS AS A GAME FIRST, AND AS DATA ABOUT A GAME SECOND.
 * That ordering is the whole design:
 *
 *   1. the cover — the object you recognise from a shelf
 *   2. the title
 *   3. one sentence on what playing it is like
 *   4. the profile signal: the instrument mark, and the two named extremes
 *
 * Not the other way round. A grid of thirty of these has to look like a
 * videogame catalogue somebody curated, not a dashboard of thirty small
 * reports. If the numbers arrived first the product would be measuring games at
 * people rather than showing them games.
 *
 * ── The coverless card is a design, not a fallback ─────────────────────────
 *
 * Today it is also the only card production renders (ADR 0011), and at
 * catalogue scale it always will be for some share of the shelf. So a game with
 * no portrait art gets a typographic sleeve: its own accent, its own title set
 * large and condensed, cropped like a paperback cover. It reads as a deliberate
 * edition rather than a missing image — no empty frame, no placeholder glyph,
 * no apology.
 *
 * The landscape `hero` is never substituted in here. Letterboxing a 21:9 image
 * into a 2:3 frame is the same mistake as cropping box art into a stage, turned
 * ninety degrees.
 *
 * ── What the accent does ───────────────────────────────────────────────────
 *
 * The site chrome is achromatic; the colour on a shelf comes from the games on
 * it. Each card carries its game's accent (lib/profile/accent.ts) on the mark
 * and the sleeve, so a grid is polychrome by construction and stays that way at
 * three hundred games without anyone choosing a palette. The accent is identity
 * and never quality — a 4.0 and a 9.5 are drawn in exactly the same grammar.
 */
export function GameCard({ profile }: { profile: ProfileView }) {
  const { game, evaluation } = profile;
  const cover = coverArtworkFor(game);
  const accent = accentFor(game.slug);
  const ranked = rankScored(profile);
  const highest = ranked[0];
  const lowest = ranked[ranked.length - 1];

  // One <h3> per card, placed by whether there is a cover to print it on. The
  // stretched pseudo-element makes the whole card the link's hit area without
  // nesting anything inside an anchor.
  const title = (
    <h3
      className={
        cover
          ? "sip-display text-[1.375rem]"
          : "sip-display text-[1.875rem] text-bone [text-wrap:balance]"
      }
    >
      <Link
        href={`/games/${game.slug}`}
        className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-2 group-hover:underline-offset-[6px]"
        style={{ textDecorationColor: cover ? accent.base : accent.lift }}
      >
        {game.canonicalTitle}
        <span className="sr-only"> — read the Game Profile</span>
      </Link>
    </h3>
  );

  return (
    // `min-w-0` is load-bearing: a grid item defaults to `min-width: auto`, so
    // without it the truncating dimension name sets a min-content floor wider
    // than its track and the whole page scrolls sideways on a 360px phone.
    <article
      className="group relative h-full w-full min-w-0"
      style={
        {
          "--sip-accent": accent.base,
          "--sip-accent-lift": accent.lift,
          "--sip-radar-ground": "var(--color-graphite)",
        } as CSSProperties
      }
    >
      <div className="sip-lift flex h-full flex-col group-hover:-translate-y-[3px] group-focus-within:-translate-y-[3px]">
        {/* 1 — the cover, 2:3, the same frame whether there is art or not, so a
            mixed shelf keeps its rhythm and nothing reflows.

            The title lives INSIDE the frame when there is no cover and below it
            when there is. That is one title either way: printing it on the
            sleeve and again underneath reads as a bug, and a sleeve without it
            reduces every artless card to a coloured rectangle — which is what
            every card on production is today. */}
        <div className="sip-crop relative aspect-[2/3] w-full">
          {cover ? (
            /* A plain <img>: optimising art hosted by somebody else would need
               an images.remotePatterns entry, and that configuration would ship
               to production and outlive the reason it was added (ADR 0011). */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={cover.url}
              alt={cover.alt}
              width={cover.width}
              height={cover.height}
              loading="lazy"
              style={{ objectPosition: cover.objectPosition }}
            />
          ) : (
            <TypographicSleeve>{title}</TypographicSleeve>
          )}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-[var(--sip-accent-lift)] transition-transform duration-200 ease-out group-hover:scale-x-100 group-focus-within:scale-x-100"
          />
        </div>

        {/* 2 — the game */}
        {cover && <div className="mt-3.5">{title}</div>}
        <p className="sip-label mt-1.5 text-ink-quiet">
          {game.developerText} ·{" "}
          <span className="tabular">{formatYear(game.firstReleaseDate)}</span>
          {evaluation.evidenceStatus !== "verified" && (
            <>
              {" · "}
              {EVIDENCE_STATUS_LABEL[evaluation.evidenceStatus]}
            </>
          )}
        </p>

        {/* 3 — what playing it is like. The reading voice, because this is the
            one sentence on the card a person is meant to read rather than
            scan. */}
        <p className="sip-prose mt-2.5 text-[0.9375rem] text-ink-soft">
          {evaluation.oneLineExperience}
        </p>

        {/* 4 — the profile signal, last and quietest. The mark is label-free,
            so the values are stated in text beside it: nothing in this product
            is ever communicated by shape or colour alone. */}
        <div className="mt-auto flex items-center gap-4 border-t border-rule pt-3.5">
          <div className="w-[4.25rem] shrink-0 bg-graphite p-1.5">
            <ProfileRadar
              profile={profile}
              active={null}
              layout={MARK}
              skin={MARK_SKIN}
            />
          </div>
          <dl className="min-w-0 flex-1">
            {highest && <Extreme label="Strongest" view={highest} />}
            {lowest && lowest !== highest && (
              <Extreme label="Weakest" view={lowest} />
            )}
          </dl>
        </div>
      </div>

      {/* The text equivalent of the mark. It describes distribution, never a
          rating, and it is the same sentence the profile page uses. */}
      <span className="sr-only">{profile.shapeDescription}</span>
    </article>
  );
}

/**
 * The instrument mark on a card sits on its own small graphite plate rather
 * than on the paper, for two reasons: the radar's grammar was designed against
 * graphite and it is the one place the two grounds are allowed to meet at
 * card scale — and it reads as an inset instrument, which is what it is.
 */
const MARK_SKIN = {
  grid: "rgba(237,235,231,0.22)",
  gridOuter: "rgba(237,235,231,0.44)",
  fill: "var(--sip-accent-lift)",
  fillOpacity: 0.34,
  stroke: "var(--sip-accent-lift)",
  vertex: "var(--sip-accent-lift)",
  vertexEdge: "var(--color-graphite)",
  reach: "var(--color-bone-soft)",
  label: "var(--color-bone-quiet)",
  value: "var(--color-bone)",
  activeLabel: "var(--color-bone)",
  activeValue: "var(--sip-accent-lift)",
  activeMark: "var(--color-bone)",
} as const;

/**
 * The coverless sleeve: accent wash, hard crop, title set as a poster.
 *
 * Deliberately the same move as the artless profile stage
 * (`.gp__stage--bare`), so a game with no artwork is recognisably the same
 * game in both places.
 */
function TypographicSleeve({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 flex items-end p-4 pl-6"
      style={{
        background:
          // Enough accent to hold its own next to a real cover. An artless card
          // sitting between two pieces of key art has to read as an edition
          // somebody designed, not as the one that failed to load — and today
          // every card on production is this one.
          "radial-gradient(135% 78% at 14% 2%, color-mix(in oklab, var(--sip-accent-lift) 62%, transparent) 0%, transparent 66%)," +
          "linear-gradient(150deg, color-mix(in oklab, var(--sip-accent-lift) 30%, var(--color-graphite)) 0%, color-mix(in oklab, var(--sip-accent-lift) 8%, var(--color-graphite)) 68%)",
      }}
    >
      {/* The spine. A publisher's mark rather than a decoration: it is the one
          element that makes the frame read as a physical edition. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[5px] bg-[var(--sip-accent-lift)]"
      />
      {children}
    </div>
  );
}

function Extreme({ label, view }: { label: string; view: DimensionView }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="truncate text-[0.8125rem] text-ink-quiet">
        <span className="sip-label mr-1.5">{label}</span>
        {view.dimension.name}
      </dt>
      <dd className="sip-num shrink-0 text-[0.9375rem] text-ink">
        {view.display}
      </dd>
    </div>
  );
}

/**
 * Scored dimensions, strongest first.
 *
 * Unknown dimensions are excluded rather than sorted to the bottom: an unknown
 * is not a low score, and putting one in a "weakest" slot would publish exactly
 * the reading the product refuses (Rubric §13, ADR 0004). A profile with fewer
 * than two scored dimensions simply shows fewer rows.
 */
function rankScored(profile: ProfileView): DimensionView[] {
  return profile.dimensions
    .filter((view) => view.score.kind !== "insufficient")
    .sort((a, b) => floorOf(b) - floorOf(a));
}

function floorOf(view: DimensionView): number {
  const { score } = view;
  if (score.kind === "exact") return score.score;
  if (score.kind === "range") return score.low;
  // Unreachable: rankScored filters these out before sorting. Kept total so
  // the ordering rule survives someone widening that filter.
  return -1;
}
