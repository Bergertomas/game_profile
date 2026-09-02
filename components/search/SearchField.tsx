"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import { announce, resolve } from "@/lib/search/resolve";
import { useSearchIndex } from "./SearchIndexProvider";
import type { SearchEntry } from "@/lib/search/types";
import { EVIDENCE_STATUS_LABEL } from "@/lib/profile/vocabulary";
import "./search.css";

/**
 * THE SEARCH FIELD. One component, two placements.
 *
 * The same combobox serves the homepage opening and the header dialog — the
 * `variant` changes its chrome and what Escape means, and nothing else. Two
 * implementations would be two sets of listbox semantics to keep correct, and
 * the second one always drifts.
 *
 * ── The ARIA shape, and the two things it is easy to get wrong ─────────────
 *
 * `role="combobox"` on the input, a `role="listbox"` popup, and
 * `aria-activedescendant` pointing at the highlighted option. Focus never
 * leaves the input: arrow keys move a *reference*, not the caret, which is what
 * lets a person keep typing while a row is highlighted.
 *
 *  1. THE LISTBOX IS ALWAYS IN THE DOM. `aria-controls` is an IDREF, and an
 *     IDREF to an element that only exists while the popup is open is a
 *     dangling reference for the whole time the popup is closed — which is most
 *     of the time. So the popup element is always rendered and hidden with the
 *     `hidden` attribute; `aria-expanded` is what changes.
 *
 *  2. OPTIONS CONTAIN NO INTERACTIVE ELEMENTS. A link inside `role="option"`
 *     gives a screen reader two conflicting things to announce and breaks the
 *     option's own name computation. The rows are plain elements; the input's
 *     Enter key and the row's pointer handler do the navigating. That is also
 *     why activation is on `mousedown` rather than `click` — `click` arrives
 *     after the input has already blurred and closed the popup underneath it.
 *
 * ── What Enter may do ──────────────────────────────────────────────────────
 *
 * With a row highlighted: open that row. With nothing highlighted: open the
 * query's `exact` profile if it has one, and otherwise do nothing at all. The
 * product does not navigate on a guess — see lib/search/resolve.ts.
 *
 * A recognised-but-unprofiled row is `aria-disabled`: it is information, not a
 * destination, and there is nowhere honest to send anyone. It stays navigable
 * so its existence is discoverable, and it carries no control — a request
 * button with no receiver behind it would be a lie told with a click.
 */

export type SearchVariant = "inline" | "dialog";

export interface SearchFieldProps {
  readonly variant: SearchVariant;
  /** Called after a navigation, so the dialog can close itself. */
  readonly onNavigate?: () => void;
  /** Called when Escape should dismiss the surface this field sits in. */
  readonly onDismiss?: () => void;
}

export function SearchField({
  variant,
  onNavigate,
  onDismiss,
}: SearchFieldProps) {
  const catalogue = useSearchIndex();
  const router = useRouter();
  const reactId = useId();
  const inputId = `${reactId}-input`;
  const listboxId = `${reactId}-listbox`;
  const hintId = `${reactId}-hint`;
  const optionId = (position: number) => `${reactId}-option-${position}`;

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const outcome = useMemo(
    () =>
      catalogue
        ? resolve(catalogue.index, query)
        : ({ state: "unrecognized", suggestions: [], exact: null } as const),
    [catalogue, query],
  );
  const options = outcome.suggestions;
  const open = query.trim().length > 0;

  /**
   * Every change to the query drops the highlight.
   *
   * Done here, in the event that caused it, rather than in an effect watching
   * `query`: the highlight is an index into a list that the new query has just
   * replaced, so a stale one leaves `aria-activedescendant` naming a row that
   * no longer exists — and resetting it a render later means one frame in which
   * it does.
   */
  const updateQuery = useCallback((value: string) => {
    setQuery(value);
    setActive(-1);
  }, []);

  // Keeping the highlighted row in view. Indexing the children directly avoids
  // building a CSS selector out of a `useId` value, which needs escaping.
  useEffect(() => {
    if (active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = useCallback(
    (entry: SearchEntry) => {
      if (entry.kind !== "published") return;
      // The index stores paths as plain strings because it is serialised into
      // the page; `profilePath` produced every one of them, so this is the same
      // typed route the pages and the sitemap use.
      router.push(entry.path as Route);
      onNavigate?.();
    },
    [router, onNavigate],
  );

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      // The two placements print two different promises under the field, and
      // this honours whichever one the reader can see: the inline field says
      // "esc clears", the dialog says "esc closes".
      if (variant === "dialog") {
        onDismiss?.();
      } else if (query) {
        updateQuery("");
      } else {
        onDismiss?.();
      }
      return;
    }

    if (!open || options.length === 0) {
      if (event.key === "Enter" && outcome.exact) {
        event.preventDefault();
        go(outcome.exact);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((current) => (current + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((current) =>
          current <= 0 ? options.length - 1 : current - 1,
        );
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter": {
        event.preventDefault();
        const chosen = active >= 0 ? options[active] : outcome.exact;
        if (chosen) go(chosen);
        break;
      }
      default:
        break;
    }
  }

  // No index in this runtime means no honest answer to give, so no field. The
  // hooks above still run on every render; only the output is withheld.
  if (!catalogue) return null;
  const profileCount = catalogue.profileCount;

  return (
    <div className={`sip-search sip-search--${variant}`}>
      <label className="sip-label sip-search__label" htmlFor={inputId}>
        Search
      </label>

      <div className="sip-search__well">
        <SearchGlyph />
        <input
          ref={inputRef}
          id={inputId}
          className="sip-search__input"
          type="text"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Title, alias, or a guess at the spelling"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-describedby={hintId}
          aria-activedescendant={
            active >= 0 && options[active] ? optionId(active) : undefined
          }
        />
        {query && (
          <button
            type="button"
            className="sip-search__clear"
            onClick={() => {
              updateQuery("");
              inputRef.current?.focus();
            }}
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">Clear the search</span>
          </button>
        )}
        {variant === "inline" && (
          /* The accepted opening's cyan Search action (A1/A2). It does exactly
             what Enter does — opens the highlighted row, else the query's one
             exact match — and otherwise returns focus to the field with the
             suggestions still open. It never navigates on a guess. */
          <button
            type="button"
            className="sip-search__submit"
            onClick={() => {
              const chosen = active >= 0 ? options[active] : outcome.exact;
              if (chosen) go(chosen);
              else inputRef.current?.focus();
            }}
          >
            Search
            <span className="sr-only"> the guide</span>
          </button>
        )}
      </div>

      {/* The legend prints what the field actually does in THIS placement.
          A dialog that says "/ focuses" is describing a key that does nothing
          once you are already inside it. */}
      <p id={hintId} className="sip-note sip-search__hint">
        {variant === "inline" && (
          <>
            <KeyCap>/</KeyCap> focuses{" "}
          </>
        )}
        <KeyCap>↑↓</KeyCap> navigate <KeyCap>↵</KeyCap> opens{" "}
        <KeyCap>esc</KeyCap> {variant === "dialog" ? "closes" : "clears"}
      </p>

      {/*
        The popup is rendered whether or not it is open, so `aria-controls`
        above always resolves to a real element. `hidden` is what changes.
      */}
      <div className="sip-search__popup" hidden={!open}>
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="sip-search__list"
        >
          {options.map((entry, position) => (
            <Option
              key={entry.id}
              entry={entry}
              id={optionId(position)}
              active={position === active}
              onHover={() => setActive(position)}
              onChoose={() => go(entry)}
            />
          ))}
        </ul>

        <Guidance outcome={outcome.state} profileCount={profileCount} />
      </div>

      {/*
        The one channel a screen-reader user has for a listbox that changed
        under a keystroke aimed at the input. Polite, so it never interrupts
        the character just typed.
      */}
      <p role="status" aria-live="polite" className="sr-only">
        {open ? announce(outcome) : ""}
      </p>
    </div>
  );
}

/**
 * One row. No interactive descendants, by contract — see the note above.
 *
 * `onMouseDown` rather than `onClick`, with the default prevented: the default
 * of mousedown on anything outside the input is to blur it, which closes the
 * popup before the click lands on a row that is no longer there.
 */
function Option({
  entry,
  id,
  active,
  onHover,
  onChoose,
}: {
  entry: SearchEntry;
  id: string;
  active: boolean;
  onHover: () => void;
  onChoose: () => void;
}) {
  const recognized = entry.kind === "recognized";

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      aria-disabled={recognized || undefined}
      className={`sip-search__option${active ? " is-active" : ""}${
        recognized ? " is-recognized" : ""
      }`}
      onMouseMove={onHover}
      onMouseDown={(event) => {
        event.preventDefault();
        if (!recognized) onChoose();
      }}
    >
      {entry.kind === "published" ? (
        <>
          <span className="sip-search__title">
            {entry.title}
            {!entry.isPrimary && (
              <span className="sip-search__scope"> · {entry.scopeLabel}</span>
            )}
          </span>
          <span className="sip-search__meta">
            {entry.developer}
            {entry.year ? ` · ${entry.year}` : ""}
            {entry.evidenceStatus !== "verified"
              ? ` · ${EVIDENCE_STATUS_LABEL[entry.evidenceStatus]}`
              : ""}
          </span>
          {/* Not a link: an anchor inside an option is the pattern this
              component exists to avoid. It reads as the row's destination. */}
          <span aria-hidden="true" className="sip-search__go">
            profile →
          </span>
        </>
      ) : (
        <>
          <span className="sip-search__title">{entry.title}</span>
          <span className="sip-search__meta">
            Recognised — not yet profiled · {entry.note}
          </span>
        </>
      )}
    </li>
  );
}

/**
 * What the popup says under the rows.
 *
 * Every state gets a sentence, including the two that found nothing to open —
 * "we do not know it" and "we know it and have not profiled it" are different
 * news, and a reader who typed a real game deserves to be told which one they
 * hit rather than shown an empty box.
 */
function Guidance({
  outcome,
  profileCount,
}: {
  outcome: "published" | "ambiguous" | "recognized" | "unrecognized";
  profileCount: number;
}) {
  const browse = (
    <Link className="sip-search__browse" href={"/#catalogue" as Route}>
      Browse all {profileCount} {profileCount === 1 ? "profile" : "profiles"} →
    </Link>
  );

  switch (outcome) {
    case "published":
      return <p className="sip-search__foot">{browse}</p>;
    case "ambiguous":
      return (
        <p className="sip-search__foot">
          <span className="sip-search__note">
            More than one profile answers that. Choose the one you meant — we
            will not pick for you.
          </span>
          {browse}
        </p>
      );
    case "recognized":
      return (
        <p className="sip-search__foot">
          <span className="sip-search__note">
            We know this game and have not profiled it yet. There is no page to
            send you to, and we would rather say so than invent one.
          </span>
          {browse}
        </p>
      );
    case "unrecognized":
      return (
        <p className="sip-search__foot">
          <span className="sip-search__note">
            We do not recognise that title. Misses are honest at{" "}
            {profileCount} {profileCount === 1 ? "profile" : "profiles"} — check
            the spelling, or try the game&rsquo;s full name.
          </span>
          {browse}
        </p>
      );
  }
}

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <span className="sip-key sip-search__cap" aria-hidden="true">
      {children}
    </span>
  );
}

/** Decoration. The field is labelled in text; this adds nothing to the name. */
function SearchGlyph() {
  return (
    <svg
      className="sip-search__glyph"
      viewBox="0 0 20 20"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="8.5"
        cy="8.5"
        r="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <line
        x1="12.8"
        y1="12.8"
        x2="17"
        y2="17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
