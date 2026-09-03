"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";

/**
 * THE RANKED PUBLIC NAVIGATION, and the one control that holds it on a phone.
 *
 * Handoff §5.1: desktop keeps one compact row; mobile keeps the wordmark and
 * the direct Search opener visible, and the secondary links "may enter a
 * disclosure/menu" — only where they no longer fit. At 390 CSS px the wordmark,
 * the Search opener, Compare and How we score do not share a line, and a
 * header that wrapped onto two rows on every phone was the result. This is the
 * disclosure that puts the row back.
 *
 * ── What it is, mechanically ───────────────────────────────────────────────
 *
 *  - One button with `aria-expanded` and `aria-controls`, and one `<nav>` it
 *    controls. The nav is ALWAYS in the DOM and always rendered on a wide
 *    screen; the stylesheet consults `data-open` only below the content
 *    breakpoint, so there is no `[hidden]` to override on a desktop and the
 *    IDREF never dangles.
 *  - Escape closes the panel and returns focus to the button. Handled on the
 *    wrapper, not the document: this is an inline disclosure and not a modal,
 *    so it neither contains focus nor intercepts a key pressed elsewhere.
 *  - Taking a link closes it. A panel left open across a client-side
 *    navigation would greet the next page with the menu of the last one.
 *  - The current page carries `aria-current="page"` and a rule as well as a
 *    colour, so where you are is identifiable without perceiving the tint.
 *
 * The label never changes. "Menu" open or closed; `aria-expanded` carries the
 * state, which is what the attribute is for.
 */

export interface ChromeLink {
  readonly href: Route;
  readonly label: string;
}

export function ChromeNav({ links }: { readonly links: readonly ChromeLink[] }) {
  const navId = `${useId()}-nav`;
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  return (
    <div
      className="sip-chrome__controls-nav"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.stopPropagation();
        setOpen(false);
        button.current?.focus();
      }}
    >
      <button
        ref={button}
        type="button"
        className="sip-chrome__menu sip-label"
        aria-expanded={open}
        aria-controls={navId}
        onClick={() => setOpen((was) => !was)}
      >
        Menu
      </button>
      <nav
        id={navId}
        aria-label="Primary"
        className="sip-chrome__nav"
        data-open={open}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="sip-label sip-chrome__link"
            aria-current={pathname === link.href ? "page" : undefined}
            // Taking a link closes the panel, so a client-side navigation does
            // not greet the next page with the menu of the last one.
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
