"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CompareIndex } from "@/lib/compare";
import type { Side } from "@/lib/compare/relationship";
import type { Selection } from "@/lib/compare/selection";
import { comparePath } from "@/lib/compare/url";
import { SelectorDialog } from "./SelectorDialog";

/**
 * THE COMPARE CONTROLS: choose or replace either side, and copy the link
 * (handoff §10.6; matrix C-11, C-12).
 *
 * ── Replace ─────────────────────────────────────────────────────────────────
 *
 * Each control names its side and the game currently on it — "Replace
 * Returnal on the right" — so a screen reader hears what the control will
 * change before it does. Opening the selector is modal; closing it, by any
 * route, returns focus to the control that opened it. Replacing one side never
 * touches the other: the caller writes the new address with the other slug
 * exactly where it was.
 *
 * ── Copy link ───────────────────────────────────────────────────────────────
 *
 * The control's accessible name never changes while it has focus; success and
 * failure are announced through a polite live region beside it. When the
 * Clipboard API is unavailable or refused, the address is revealed in a
 * read-only field, selected, with instructions — the reader still gets the
 * link. The copied address preserves the left/right order and is the address
 * of this page on this host; it makes no claim to be canonical or indexable.
 */
export function CompareControls({
  selection,
  index,
  onChoose,
}: {
  selection: Selection;
  index: CompareIndex;
  onChoose: (side: Side, slug: string) => void;
}) {
  const [openSide, setOpenSide] = useState<Side | null>(null);
  const leftRef = useRef<HTMLButtonElement>(null);
  const rightRef = useRef<HTMLButtonElement>(null);
  const { left, right } = selection;

  const close = useCallback(() => {
    setOpenSide((side) => {
      if (side === "left") leftRef.current?.focus();
      if (side === "right") rightRef.current?.focus();
      return null;
    });
  }, []);

  const chooseFor = useCallback(
    (side: Side) => (slug: string) => {
      onChoose(side, slug);
      setOpenSide(null);
      (side === "left" ? leftRef : rightRef).current?.focus();
    },
    [onChoose],
  );

  return (
    <div className="cp-controls">
      <div className="cp-controls__replace">
        <button
          ref={leftRef}
          type="button"
          className={`cp-button${left ? "" : " cp-button--primary"}`}
          aria-haspopup="dialog"
          aria-expanded={openSide === "left"}
          onClick={() => setOpenSide("left")}
        >
          {left ? `Replace ${left.title} on the left` : "Choose the first game"}
        </button>
        {left && (
          <button
            ref={rightRef}
            type="button"
            className={`cp-button${right ? "" : " cp-button--primary"}`}
            aria-haspopup="dialog"
            aria-expanded={openSide === "right"}
            onClick={() => setOpenSide("right")}
          >
            {right ? `Replace ${right.title} on the right` : "Choose the right game"}
          </button>
        )}
      </div>

      {left && right && (
        <CopyLink
          key={`${left.slug},${right.slug}`}
          leftSlug={left.slug}
          rightSlug={right.slug}
          leftTitle={left.title}
          rightTitle={right.title}
        />
      )}

      <SelectorDialog
        open={openSide !== null}
        side={openSide ?? "left"}
        index={index}
        current={openSide === "right" ? right : left}
        other={openSide === "right" ? left : right}
        onChoose={chooseFor(openSide ?? "left")}
        onClose={close}
      />
    </div>
  );
}

function CopyLink({
  leftSlug,
  rightSlug,
  leftTitle,
  rightTitle,
}: {
  leftSlug: string;
  rightSlug: string;
  leftTitle: string;
  rightTitle: string;
}) {
  const id = useId();
  const [status, setStatus] = useState("");
  const [fallback, setFallback] = useState<string | null>(null);
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fallback === null) return;
    const field = fieldRef.current;
    field?.focus();
    field?.select();
  }, [fallback]);

  /** The address of THIS page on THIS host, with the order as selected. */
  function address(): string {
    return `${window.location.origin}${comparePath(leftSlug, rightSlug)}`;
  }

  async function copy() {
    const href = address();
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(href);
      setFallback(null);
      setStatus(`Link copied. It opens ${leftTitle} on the left and ${rightTitle} on the right.`);
    } catch {
      setFallback(href);
      setStatus("Copying failed. The link is shown below: select it and copy it yourself.");
    }
  }

  return (
    <div className="cp-share">
      <button type="button" className="cp-button" onClick={copy} aria-describedby={`${id}-status`}>
        Copy link to this comparison
      </button>
      <p id={`${id}-status`} role="status" aria-live="polite" className="cp-share__status">
        {status}
      </p>
      <div className="cp-share__fallback" hidden={fallback === null}>
        <label className="sip-label" htmlFor={`${id}-link`}>
          Link to this comparison
        </label>
        <input
          ref={fieldRef}
          id={`${id}-link`}
          className="cp-share__field"
          type="text"
          readOnly
          value={fallback ?? ""}
          onFocus={(event) => event.currentTarget.select()}
        />
        <p className="cp-share__how">
          Select the whole address and copy it. It keeps {leftTitle} on the left
          and {rightTitle} on the right.
        </p>
      </div>
    </div>
  );
}
