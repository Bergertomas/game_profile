import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/**
 * "Should I Play?" is the site. "Game Profile" is what the site publishes.
 * The chrome carries the brand; the evaluation vocabulary belongs on the pages.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2.5">
          <span className="display text-lg leading-none text-bone">
            {SITE_NAME}
          </span>
          <span className="label-micro hidden text-bone-faint sm:inline">
            {SITE_TAGLINE}
          </span>
        </Link>
        <nav>
          <Link
            href="/methodology"
            className="label-micro text-bone-dim transition-colors hover:text-bone"
          >
            Methodology
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="max-w-2xl text-[0.8125rem] leading-relaxed text-bone-faint">
          {SITE_NAME} gives every game a Game Profile: eight fixed dimensions,
          scored against a published rubric, so you can tell what kind of
          experience one is before you buy it. It does not publish an overall
          score, and it is not a review aggregator.
        </p>
        <p className="mt-4 text-xs text-bone-faint">
          Game Profile Scoring Rubric v1.0 · Profiles are editorial judgements
          against a{" "}
          <Link
            href="/methodology"
            className="underline decoration-line underline-offset-4 transition-colors hover:text-bone hover:decoration-brass"
          >
            published methodology
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
