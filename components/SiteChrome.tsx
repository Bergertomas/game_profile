import Link from "next/link";
import { SearchDialog } from "@/components/search/SearchDialog";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/**
 * The wordmark, split so the question mark can be styled and animated on its
 * own. Derived from SITE_NAME rather than typed out twice — the brand string
 * has exactly one home (lib/site.ts).
 */
const WORDMARK = SITE_NAME.replace(/\?+$/, "");

/**
 * The global chrome. It has one job: make every page recognisably the same
 * product without competing with the game on it.
 *
 * ── Why it is achromatic ───────────────────────────────────────────────────
 *
 * Every game arrives with a visual identity louder than anything a site could
 * put over it — Alan Wake 2, a colourful platformer and a medieval RPG share
 * nothing. So the chrome is graphite and bone, and the only colour it carries
 * is the question mark. Colour on a page comes from the game.
 *
 * ── Why it is not a masthead ───────────────────────────────────────────────
 *
 * "Should I Play?" is a question somebody actually asks, and the identity
 * should sound like one. It is set as words, condensed and tight, with the
 * question mark in the one brand colour doing the work a logo would otherwise
 * do — and nodding when you point at it. A solemn newspaper masthead would be
 * a more impressive piece of design and a worse fit for what this is.
 *
 * ── Why there are three controls and not six ───────────────────────────────
 *
 * Because there are three things behind them. Search is built, and it is here
 * as a real control with the `/` key that reaches it from anywhere. "How we
 * score" is a real page. Compare and "What should I play?" are accepted work
 * and are NOT built, so they are not in the header: navigation that promises
 * rooms which do not exist is the fastest way to make a small product feel like
 * a mock-up.
 *
 * The search trigger renders only when this build could actually read the
 * catalogue. It reads that from the layout's provider rather than from a prop,
 * so a runtime with no index — the deployed Worker answering an unknown
 * `/games/*` URL — gets a header with no search rather than a search that
 * cannot find anything. See app/(public)/layout.tsx.
 */

export function SiteHeader() {
  return (
    <header className="border-b border-rule-bone bg-graphite text-bone">
      <div className="mx-auto flex w-full max-w-[74rem] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="sip-wordmark text-[1.0625rem] sm:text-[1.1875rem]">
            {WORDMARK}
            <span className="sip-wordmark__q">?</span>
          </span>
          <span className="sip-label hidden text-bone-quiet sm:inline">
            {SITE_TAGLINE}
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <SearchDialog />
          <nav aria-label="Primary">
            <Link
              href="/methodology"
              className="sip-label text-bone-soft underline decoration-transparent decoration-2 underline-offset-[6px] transition-colors duration-150 hover:text-bone hover:decoration-signal"
            >
              How we score
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-rule-bone bg-graphite text-bone">
      <div className="mx-auto w-full max-w-[74rem] px-5 py-10 sm:px-8">
        <p className="sip-wordmark text-[1.0625rem]">
          {WORDMARK}
          <span className="text-signal">?</span>
        </p>
        <p className="sip-prose mt-3 max-w-[38rem] text-[0.9375rem] text-bone-soft">
          Every game here gets a Game Profile: eight fixed dimensions, scored
          against a published rubric, so you can tell what kind of experience one
          is before you buy it. No overall score, and not a review aggregator —
          the point is what a game is, not where it ranks.
        </p>
        <p className="sip-label mt-6 text-bone-quiet">
          Game Profile Scoring Rubric v1.0 · Profiles are editorial judgements
          against a{" "}
          <Link
            href="/methodology"
            className="underline decoration-rule-bone-strong underline-offset-[5px] transition-colors duration-150 hover:text-bone hover:decoration-signal"
          >
            published methodology
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
