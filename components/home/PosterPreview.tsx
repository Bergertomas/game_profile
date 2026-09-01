"use client";

import { useCallback, useId, useRef, useState } from "react";

/**
 * THE POSTER'S PREVIEW DISCLOSURE.
 *
 * One button, one panel, and the panel is the button's next sibling. That is
 * the whole component, and every part of it is a requirement rather than a
 * choice (handoff §7.2, matrix H-10):
 *
 *  - THE POSTER'S LINK AND THIS BUTTON ARE SIBLINGS, NEVER NESTED. A card whose
 *    whole surface is a link cannot also contain a button: the stretched hit
 *    area swallows it, and a screen reader is handed a link containing a
 *    control. So the poster title is an ordinary link and this is an ordinary
 *    button beside it — two destinations, two names, no ambiguity.
 *  - THE PANEL FOLLOWS ITS TRIGGER IN DOM ORDER, so the next Tab press after
 *    the button lands inside what the button just opened.
 *  - `aria-expanded` AND `aria-controls` ARE ALWAYS ACCURATE. The panel is
 *    always in the DOM and hidden with the `hidden` attribute, for the reason
 *    the search popup gives: an IDREF to an element that only exists while the
 *    panel is open dangles for the whole time it is closed.
 *  - THE LABEL NEVER CHANGES. It says "Preview of <game>" open or closed, and
 *    `aria-expanded` carries the state — which is what that attribute is for.
 *    Swapping the label to "Hide preview" renames a control under the reader
 *    who just pressed it, and under anything holding a reference to it by name.
 *  - ESCAPE CLOSES AND RETURNS FOCUS to the button. It is handled on the
 *    wrapper rather than the document, because this is an inline disclosure and
 *    not a modal: it does not contain focus and it does not intercept a key
 *    pressed anywhere else on the page.
 *
 * Expansion never hides the artwork. The panel opens BELOW the poster it
 * belongs to, so the picture a reader was looking at is still there.
 */

export interface PosterPreviewProps {
  /** The game this preview belongs to. Gives both controls a specific name. */
  readonly title: string;
  /** Panel content, rendered on the server and handed in. */
  readonly children: React.ReactNode;
}

export function PosterPreview({ title, children }: PosterPreviewProps) {
  const panelId = `${useId()}-preview`;
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    button.current?.focus();
  }, []);

  return (
    <div
      className="sip-poster__disclosure"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        // Stopping propagation so one Escape closes one preview: without it the
        // key would also reach any surface listening above this one.
        event.stopPropagation();
        close();
      }}
    >
      <button
        type="button"
        ref={button}
        className="sip-poster__disclose"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((was) => !was)}
      >
        Preview
        <span className="sr-only"> of {title}</span>
        <span className="sip-poster__chevron" aria-hidden="true">
          &#8964;
        </span>
      </button>

      <div id={panelId} className="sip-poster__panel" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
