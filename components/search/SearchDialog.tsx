"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SearchField } from "./SearchField";
import { useSearchIndex } from "./SearchIndexProvider";
import { PRIMARY_SEARCH_SELECTOR } from "@/lib/search/primary-field";

/**
 * The header's search, and the `/` key for the whole site.
 *
 * ── Why a native `<dialog>` ────────────────────────────────────────────────
 *
 * `showModal()` gives the browser's own modality: focus is contained by the
 * user agent rather than by a keydown handler counting Tab presses, the rest of
 * the document is inert, and Escape is handled natively. Every hand-rolled
 * focus trap this replaces has the same bug — a control that appears in the
 * dialog after the trap was wired up, and is then unreachable or leaks focus to
 * the page behind. There is nothing to get wrong here because there is nothing
 * to implement.
 *
 * Focus return is still explicit. Browsers do restore focus to the opener on
 * close, but "the browser probably will" is not a contract, and a person who
 * pressed Escape and landed at the top of the document has lost their place.
 *
 * ── The `/` shortcut belongs to the page, not to this component ────────────
 *
 * The accepted model is one field on the homepage and a trigger in every
 * header, with `/` reaching whichever is nearer. Rather than two components
 * racing for the same key, the handler lives here alone and defers: if the page
 * already shows a primary search field, `/` focuses that; otherwise it opens
 * this dialog. One listener, one rule, and no shared state between them.
 */

export function SearchDialog() {
  const catalogue = useSearchIndex();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const close = useCallback(() => setOpen(false), []);

  // The dialog element is the source of truth for modality, so opening and
  // closing it is an effect on state rather than something the handlers do
  // directly. That keeps Escape — which closes it natively, without going
  // through React at all — from leaving `open` stale.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Focused HERE, after the dialog is modal, and not by the field itself.
      // Effects run child-first, so a focus call inside SearchField happens
      // while the dialog is still an ordinary hidden element — and `showModal`
      // then moves focus away from it again. The order is the whole fix.
      dialog.querySelector("input")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      setOpen(false);
      triggerRef.current?.focus();
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      // A `/` typed into any field is a slash, not a shortcut.
      const target = event.target;
      if (target instanceof HTMLElement && isTyping(target)) return;

      const inline = document.querySelector<HTMLElement>(
        PRIMARY_SEARCH_SELECTOR,
      );
      event.preventDefault();
      if (inline) {
        inline.focus();
      } else {
        setOpen(true);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // A header with no search beats a search that cannot find anything. The
  // hooks above run either way, so the `/` listener is simply never useful in a
  // runtime that has no catalogue to reach.
  if (!catalogue) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="sip-search-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="sip-label">Search</span>
        <span className="sip-key sip-search-trigger__cap" aria-hidden="true">
          /
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className="sip-search-dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // The backdrop is the dialog's own box outside the panel, so a click
        // that lands on the dialog itself is a click outside the panel.
        onMouseDown={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="sip-search-dialog__panel">
          <div className="sip-search-dialog__head">
            <h2 id={titleId} className="sip-label">
              Find a Game Profile
            </h2>
            <button
              type="button"
              className="sip-search-dialog__close"
              onClick={close}
            >
              Close
              <span className="sip-key" aria-hidden="true">
                esc
              </span>
            </button>
          </div>

          {/* Mounted only while open, so the field starts empty every time. */}
          {open && (
            <SearchField
              variant="dialog"
              onNavigate={close}
              onDismiss={close}
            />
          )}
        </div>
      </dialog>
    </>
  );
}

function isTyping(element: HTMLElement): boolean {
  return (
    element.isContentEditable ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}
