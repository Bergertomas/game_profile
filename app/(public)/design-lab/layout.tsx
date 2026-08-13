import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { D3, DIRECTION_D, DIRECTIONS } from "@/lib/design-lab/profile";
import { DESIGN_SURFACES_ENABLED } from "@/lib/site";
import "./design-lab.css";

/**
 * D0 design-lab shell — every non-production site environment.
 *
 * Follows the same protected-route pattern as /dev/radar-states: `notFound()`
 * wherever design surfaces are off, so every route beneath this segment returns
 * 404 on the public site. E2e and `npm run cf:verify` assert it in both
 * directions.
 *
 * The gate is `DESIGN_SURFACES_ENABLED`, not `NODE_ENV`. A Cloudflare branch
 * preview is a production-mode build of a non-production site, and reviewing
 * design work there is the entire reason previews exist.
 *
 * The shell is intentionally plain (brief §21: "do not spend time making
 * design-lab architecture elegant"). It must not flatter the directions or
 * contribute visual identity of its own.
 */

/**
 * Belt and braces beside the site-wide `noindex` a preview build already
 * carries: these routes are never indexable, in any environment, whatever the
 * root layout decides.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DesignLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!DESIGN_SURFACES_ENABLED) notFound();

  return (
    <div className="dl-shell min-h-screen">
      <nav className="dl-switch flex flex-wrap items-center gap-x-1 px-3">
        <Link href="/design-lab" className="dl-switch__link">
          D0 Index
        </Link>
        {[...DIRECTIONS, DIRECTION_D, D3].map((direction) => (
          <Link
            key={direction.slug}
            href={`/design-lab/${direction.slug}`}
            className="dl-switch__link"
          >
            <span>{direction.letter}</span>
            <span className="hidden lg:inline">{direction.name}</span>
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
