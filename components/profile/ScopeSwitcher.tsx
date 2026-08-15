import Link from "next/link";
import type { Route } from "next";

/**
 * Sibling navigation for a game with more than one published profile.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * The Long Dark's Survival and Wintermute are two evaluations of two different
 * experiences, and neither summarises the other. They are separate documents at
 * separate canonical URLs (ADR 0016). Without a switcher, a reader who lands on
 * one has no way to discover the other and no signal that the numbers in front
 * of them describe one mode rather than the game — which is the exact
 * misreading the scope model exists to prevent.
 *
 * Master Plan §4.5 makes the requirement explicit and leaves placement to
 * applied design. It sits directly under the title because that is where the
 * question "which one am I reading?" is asked, not at the foot of the page
 * where it would be answered after the numbers have been read.
 *
 * ── What it must not do ─────────────────────────────────────────────────────
 *
 * Each entry links to that profile's OWN canonical URL — never a query
 * parameter or a client-side swap, both of which would put two evaluations on
 * one address and make one of them unlinkable and uncrawlable. The current
 * scope is marked with `aria-current` and is not a link to itself.
 *
 * ── Absent for the ordinary case ────────────────────────────────────────────
 *
 * Renders nothing at all below two scopes. Almost the whole catalogue has one
 * evaluated experience, and a chooser with a single option is a control that
 * asks a reader to consider a distinction that does not exist for this game.
 */

export interface ScopeLink {
  readonly key: string;
  readonly label: string;
  readonly summary?: string;
  readonly href: string;
  readonly isCurrent: boolean;
}

export function ScopeSwitcher({
  scopes,
  gameTitle,
}: {
  scopes: readonly ScopeLink[];
  gameTitle: string;
}) {
  if (scopes.length < 2) return null;

  const current = scopes.find((scope) => scope.isCurrent);

  return (
    <nav
      aria-label={`Evaluated experiences of ${gameTitle}`}
      className="mt-4 border-t border-[var(--color-rule-bone)] pt-3"
    >
      <p className="gp__label m-0">
        This game has {scopes.length} evaluated experiences
      </p>

      <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-2 gap-y-2 p-0">
        {scopes.map((scope) => (
          <li key={scope.key} className="flex">
            {scope.isCurrent ? (
              <span
                aria-current="page"
                className="rounded-sm border border-[var(--gp-accent-lift)] bg-[color-mix(in_srgb,var(--gp-accent-lift)_18%,transparent)] px-2.5 py-1 text-[0.85rem] text-[var(--gp-bone)]"
              >
                {scope.label}
              </span>
            ) : (
              <Link
                href={scope.href as Route}
                className="rounded-sm border border-[var(--color-rule-bone-strong)] px-2.5 py-1 text-[0.85rem] text-[var(--gp-bone-soft)] no-underline hover:border-[var(--gp-accent-lift)] hover:text-[var(--gp-bone)]"
              >
                {scope.label}
              </Link>
            )}
          </li>
        ))}
      </ul>

      {/*
        The current scope's summary, where it has one. This is what stops the
        switcher being a bare pair of names: "Survival" and "Wintermute" mean
        nothing to a reader who does not already know the game, and the summary
        is the scope's own statement of what it covers and excludes.
      */}
      {current?.summary ? (
        // Deliberately NOT `gp__prose`. That class is the profile's editorial
        // voice — the one-line experience and the rationales — and this is
        // navigation chrome describing what a page covers. Sharing it made the
        // two indistinguishable to a selector as well as to a reader.
        <p className="m-0 mt-2 max-w-[46rem] text-[0.875rem] leading-relaxed text-[var(--gp-bone-soft)]">
          {current.summary}
        </p>
      ) : null}
    </nav>
  );
}
