import Link from "next/link";
import { ChromeNav, type ChromeLink } from "@/components/ChromeNav";
import { SearchDialog } from "@/components/search/SearchDialog";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import "./site-chrome.css";

/**
 * The wordmark, split so the question mark can be styled and animated on its
 * own. Derived from SITE_NAME rather than typed out twice — the brand string
 * has exactly one home (lib/site.ts).
 */
const WORDMARK = SITE_NAME.replace(/\?+$/, "");

/**
 * The ranked public navigation (handoff §5.1). Search is the dominant journey
 * and has its own opener; Compare is the major secondary journey and a real
 * page; "How we score" is a real page. "What should I play?" is accepted work
 * and is NOT built, so it is not here: navigation that promises a room which
 * does not exist is the fastest way to make a small product feel like a
 * mock-up.
 */
const NAVIGATION: readonly ChromeLink[] = [
  { href: "/compare", label: "Compare" },
  { href: "/methodology", label: "How we score" },
];

/**
 * The global chrome. It has one job: make every page recognisably the same
 * product without competing with the game on it.
 *
 * ── Why it is achromatic ───────────────────────────────────────────────────
 *
 * Every game arrives with a visual identity louder than anything a site could
 * put over it — Alan Wake 2, a colourful platformer and a medieval RPG share
 * nothing. So the chrome is the contract's chrome surface with its primary and
 * muted text steps, and the only colour it carries is the question mark. Colour
 * on a page comes from the game.
 *
 * ── Why it is not a masthead ───────────────────────────────────────────────
 *
 * "Should I Play?" is a question somebody actually asks, and the identity
 * should sound like one. It is set as words, condensed and tight, with the
 * question mark in the one brand colour doing the work a logo would otherwise
 * do — and nodding when you point at it. A solemn newspaper masthead would be
 * a more impressive piece of design and a worse fit for what this is.
 *
 * ── One compact row, at every width ────────────────────────────────────────
 *
 * About 63px on a desktop and about 54px on a phone (handoff §2.1). On a phone
 * the wordmark and the Search opener stay in the row and the two secondary
 * links sit behind one disclosure (ChromeNav); on a desktop the disclosure is
 * not drawn and the links are simply there.
 *
 * The search trigger renders only when this build could actually read the
 * catalogue. It reads that from the layout's provider rather than from a prop,
 * so a runtime with no index — the deployed Worker answering an unknown
 * `/games/*` URL — gets a header with no search rather than a search that
 * cannot find anything. See app/(public)/layout.tsx.
 */
export function SiteHeader() {
  return (
    <header className="sip-chrome">
      <div className="sip-chrome__row">
        <Link href="/" className="sip-chrome__brand">
          <span className="sip-wordmark sip-chrome__wordmark">
            {WORDMARK}
            <span className="sip-wordmark__q">?</span>
          </span>
          <span className="sip-label sip-chrome__tagline">{SITE_TAGLINE}</span>
        </Link>
        <div className="sip-chrome__controls">
          <SearchDialog />
          <ChromeNav links={NAVIGATION} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="sip-foot">
      <div className="sip-foot__inner">
        <p className="sip-wordmark sip-foot__wordmark">
          {WORDMARK}
          <span>?</span>
        </p>
        <p className="sip-prose sip-foot__about">
          Every game here gets a Game Profile: eight fixed dimensions, scored
          against a published rubric, so you can tell what kind of experience one
          is before you buy it. No overall score, and not a review aggregator —
          the point is what a game is, not where it ranks.
        </p>
        <p className="sip-label sip-foot__rubric">
          Game Profile Scoring Rubric v1.0 · Profiles are editorial judgements
          against a <Link href="/methodology">published methodology</Link>.
        </p>
      </div>
    </footer>
  );
}
