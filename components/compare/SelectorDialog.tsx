"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { eligibleProfile, type CompareIndex, type CompareProfile } from "@/lib/compare";
import type { Side } from "@/lib/compare/relationship";
import { announce, resolve } from "@/lib/search/resolve";
import type { SearchEntry } from "@/lib/search/types";
import { EVIDENCE_STATUS_LABEL } from "@/lib/profile/vocabulary";

/**
 * THE SELECTOR: a named modal dialog that chooses one side of the comparison
 * (handoff §10.6; matrix C-01, C-02, C-11, H-08).
 *
 * ── The Search grammar, with a different verb ───────────────────────────────
 *
 * The field is the Search combobox — the same index, the same matcher, the
 * same four truthful answers, the same listbox semantics — and the one thing
 * that differs is what choosing does: it names a side of the comparison
 * instead of opening a page. Two implementations of the combobox would drift;
 * two verbs on one grammar do not.
 *
 * ── Who can be chosen ───────────────────────────────────────────────────────
 *
 * Only a published PRIMARY profile. A recognised-but-unprofiled title and a
 * sibling scope (a DLC, mode or edition) both stay visible as `aria-disabled`
 * rows that say why they cannot be chosen: the first has no profile to
 * compare, the second is not eligible in the first release (ADR 0033, 2
 * September 2026 amendment). Hiding them would answer "we do not know it" to
 * a reader who typed a game the site plainly knows.
 *
 * The game already on the other side is offered and REFUSED on choice, with
 * an inline error associated with the field and announced once, and the
 * existing selection untouched (matrix C-02). A self-pair is a state the
 * address can arrive in too, so the refusal is not the row's job alone.
 *
 * ── Modality ────────────────────────────────────────────────────────────────
 *
 * A native `<dialog>` with `showModal()`: the user agent contains focus and
 * makes the page inert, Escape closes it natively, and the `close` event is
 * the single place the caller learns it has closed — the contract the header's
 * Search dialog already proves. Close, Escape and the backdrop all call
 * `dialog.close()` rather than the caller directly, so `onClosed` fires once,
 * after the dialog has actually closed and the page can take focus again.
 */
export function SelectorDialog({
  open,
  side,
  index,
  current,
  other,
  onChoose,
  onClosed,
}: {
  open: boolean;
  side: Side;
  index: CompareIndex;
  /** The game currently on this side, if any. */
  current: CompareProfile | null;
  /** The game on the other side, if any — offered, but refused on choice. */
  other: CompareProfile | null;
  onChoose: (slug: string) => void;
  /** The dialog has closed, by any route. Fired from the native `close` event. */
  onClosed: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector("input")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.addEventListener("close", onClosed);
    return () => dialog.removeEventListener("close", onClosed);
  }, [onClosed]);

  /** Every dismissal goes through the element, so `close` fires exactly once. */
  const dismiss = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const heading = current
    ? `Replace ${current.title} on the ${side}`
    : `Choose the ${side} game`;

  return (
    <dialog
      ref={dialogRef}
      className="sip-search-dialog cp-dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === dialogRef.current) dismiss();
      }}
    >
      <div className="sip-search-dialog__panel">
        <div className="sip-search-dialog__head">
          <h2 id={titleId} className="sip-label">
            {heading}
          </h2>
          <button type="button" className="sip-search-dialog__close" onClick={dismiss}>
            Close
            <span className="sip-key" aria-hidden="true">
              esc
            </span>
          </button>
        </div>
        {open && (
          <SelectorField
            index={index}
            side={side}
            other={other}
            onChoose={onChoose}
            onDismiss={dismiss}
          />
        )}
      </div>
    </dialog>
  );
}

type Eligibility =
  | { readonly kind: "eligible"; readonly slug: string }
  | { readonly kind: "other-side" ; readonly slug: string }
  | { readonly kind: "recognized" }
  | { readonly kind: "scope" };

function eligibilityOf(
  entry: SearchEntry,
  index: CompareIndex,
  other: CompareProfile | null,
): Eligibility {
  if (entry.kind === "recognized") return { kind: "recognized" };
  if (!entry.isPrimary || !eligibleProfile(index, entry.slug)) return { kind: "scope" };
  if (other && other.slug === entry.slug) return { kind: "other-side", slug: entry.slug };
  return { kind: "eligible", slug: entry.slug };
}

function SelectorField({
  index,
  side,
  other,
  onChoose,
  onDismiss,
}: {
  index: CompareIndex;
  side: Side;
  other: CompareProfile | null;
  onChoose: (slug: string) => void;
  onDismiss: () => void;
}) {
  const reactId = useId();
  const inputId = `${reactId}-input`;
  const listboxId = `${reactId}-listbox`;
  const hintId = `${reactId}-hint`;
  const errorId = `${reactId}-error`;
  const optionId = (position: number) => `${reactId}-option-${position}`;

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const outcome = useMemo(() => resolve(index.selector, query), [index, query]);
  const options = outcome.suggestions;
  const open = query.trim().length > 0;

  const updateQuery = useCallback((value: string) => {
    setQuery(value);
    setActive(-1);
    setError(null);
  }, []);

  useEffect(() => {
    if (active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const otherSide: Side = side === "left" ? "right" : "left";

  const choose = useCallback(
    (entry: SearchEntry) => {
      const eligibility = eligibilityOf(entry, index, other);
      switch (eligibility.kind) {
        case "eligible":
          onChoose(eligibility.slug);
          return;
        case "other-side":
          setError(
            `${other!.title} is already on the ${otherSide}. Compare is two different games — choose another for the ${side}.`,
          );
          return;
        case "recognized":
        case "scope":
          // Disabled rows are information. Nothing happens, and the row says why.
          return;
      }
    },
    [index, other, otherSide, side, onChoose],
  );

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onDismiss();
      return;
    }
    if (!open || options.length === 0) {
      if (event.key === "Enter" && outcome.exact) {
        event.preventDefault();
        choose(outcome.exact);
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
        setActive((current) => (current <= 0 ? options.length - 1 : current - 1));
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
        if (chosen) choose(chosen);
        break;
      }
      default:
        break;
    }
  }

  const eligibleCount = index.profiles.length;

  return (
    <div className="sip-search sip-search--dialog cp-selector">
      <label className="sip-label sip-search__label" htmlFor={inputId}>
        Game for the {side}
      </label>

      <div className="sip-search__well">
        <input
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
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
          aria-invalid={error ? true : undefined}
          aria-activedescendant={
            active >= 0 && options[active] ? optionId(active) : undefined
          }
        />
      </div>

      <p id={hintId} className="sip-note sip-search__hint">
        <span className="sip-key sip-search__cap" aria-hidden="true">↑↓</span> navigate{" "}
        <span className="sip-key sip-search__cap" aria-hidden="true">↵</span> chooses{" "}
        <span className="sip-key sip-search__cap" aria-hidden="true">esc</span> closes
      </p>

      {/* Announced once when it appears, associated with the field for as
          long as it stands, and cleared by the next keystroke. The selection
          it refused is untouched. */}
      <p id={errorId} className="cp-selector__error" role="alert" hidden={!error}>
        {error}
      </p>

      <div className="sip-search__popup" hidden={!open}>
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={`Games for the ${side}`}
          className="sip-search__list"
        >
          {options.map((entry, position) => (
            <Option
              key={entry.id}
              entry={entry}
              eligibility={eligibilityOf(entry, index, other)}
              otherSide={otherSide}
              id={optionId(position)}
              active={position === active}
              onHover={() => setActive(position)}
              onChoose={() => choose(entry)}
            />
          ))}
        </ul>
        <p className="sip-search__foot">
          <span className="sip-search__note">
            {outcome.state === "unrecognized"
              ? `We do not recognise that title. Compare can choose from ${eligibleCount} published ${eligibleCount === 1 ? "profile" : "profiles"}; check the spelling, or try the game's full name.`
              : outcome.state === "recognized"
                ? "We know this game and have not profiled it yet, so there is nothing to compare."
                : outcome.state === "ambiguous"
                  ? "More than one profile answers that. Choose the one you meant."
                  : "Choose a game to place it on this side."}
          </span>
        </p>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {open ? announce(outcome) : ""}
      </p>
    </div>
  );
}

function Option({
  entry,
  eligibility,
  otherSide,
  id,
  active,
  onHover,
  onChoose,
}: {
  entry: SearchEntry;
  eligibility: Eligibility;
  otherSide: Side;
  id: string;
  active: boolean;
  onHover: () => void;
  onChoose: () => void;
}) {
  const disabled = eligibility.kind === "recognized" || eligibility.kind === "scope";
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      aria-disabled={disabled || undefined}
      className={`sip-search__option${active ? " is-active" : ""}${disabled ? " is-recognized is-ineligible" : ""}`}
      data-eligibility={eligibility.kind}
      onMouseMove={onHover}
      onMouseDown={(event) => {
        event.preventDefault();
        onChoose();
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
            {eligibility.kind === "scope"
              ? "Not yet eligible in Compare — main profiles only for now"
              : eligibility.kind === "other-side"
                ? `Already on the ${otherSide}`
                : `${entry.developer}${entry.year ? ` · ${entry.year}` : ""}${
                    entry.evidenceStatus !== "verified"
                      ? ` · ${EVIDENCE_STATUS_LABEL[entry.evidenceStatus]}`
                      : ""
                  }`}
          </span>
          {eligibility.kind === "eligible" && (
            <span aria-hidden="true" className="sip-search__go">
              choose →
            </span>
          )}
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
