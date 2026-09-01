"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * THE POSTER RAIL — a list you can scroll, and nothing else.
 *
 * The accepted homepage carries a general "Start somewhere interesting" rail
 * and the authored shelves that follow it. Both are the same object: a semantic
 * list of profile posters with two explicit controls over it.
 *
 * ── What it deliberately is not ────────────────────────────────────────────
 *
 * No autoplay. No infinite loop. No timer of any kind — there is not a single
 * `setInterval` in this file, and there must never be one. A homepage that
 * moves on its own is the "fake activity" the product contract forbids (Plan
 * §5.2, P0.3), and it takes the page away from a reader who is still reading it.
 * There is also no ranking, no popularity and no trending: the order comes from
 * the caller and is always a stated, deterministic fact about the corpus.
 *
 * ── The three behaviours that are accessibility contracts ──────────────────
 *
 * 1. NATIVE SCROLLING SURVIVES. The track is an ordinary `overflow-x: auto`
 *    list, so touch, trackpad and the browser's own scroll-into-view all keep
 *    working whether or not this component's JavaScript ever runs. The buttons
 *    are an addition to that, not a replacement for it.
 * 2. THE ENDS ARE DISABLED, AND HONESTLY. A control that is enabled at the end
 *    of the rail teaches a reader the rail is broken. Both controls start
 *    disabled and are enabled only once a measurement proves there is somewhere
 *    to go — which is also the correct resting state for a rail whose contents
 *    fit, and the correct pre-hydration state for one whose contents do not.
 * 3. ONE VIEWPORT PER STEP. A step moves the track by its own visible width, so
 *    a reader never has to guess how far a press went, and the movement honours
 *    `prefers-reduced-motion` by jumping instead of gliding.
 */

export interface PosterRailProps {
  /** Public heading for the collection. */
  readonly heading: string;
  /**
   * Explicit DOM id for the heading, where something links to it. The general
   * rail takes `catalogue`, which is the anchor Search's "Browse all N
   * profiles" recovery link has always pointed at.
   */
  readonly headingId?: string;
  /** One truthful line saying what puts a profile in it. */
  readonly note: string;
  /** Rights notices for any artwork on the rail. Empty on production today. */
  readonly credits?: readonly string[];
  /**
   * The `<li>` posters, rendered on the server and handed in as children.
   *
   * Optional only so the chrome can be rendered on its own in a test. A rail
   * with nothing in it never reaches a reader: `ProfileRail` returns null for
   * an empty collection rather than printing a heading over an empty track.
   */
  readonly children?: React.ReactNode;
}

export function PosterRail({
  heading,
  headingId: explicitHeadingId,
  note,
  credits = [],
  children,
}: PosterRailProps) {
  const reactId = useId();
  const headingId = explicitHeadingId ?? `${reactId}-heading`;
  const noteId = `${reactId}-note`;
  const track = useRef<HTMLUListElement>(null);

  // Both disabled until a measurement says otherwise. See contract 2 above:
  // this is simultaneously the honest server-rendered state, the honest state
  // for a rail that does not overflow, and the honest state before hydration.
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const element = track.current;
    if (!element) return;
    const furthest = element.scrollWidth - element.clientWidth;
    // A one-pixel tolerance: fractional layout widths mean `scrollLeft` rarely
    // lands exactly on either bound, and a rail permanently one pixel from its
    // end would leave "next" enabled forever.
    setAtStart(element.scrollLeft <= 1);
    setAtEnd(element.scrollLeft >= furthest - 1);
  }, []);

  useEffect(() => {
    const element = track.current;
    if (!element) return;

    measure();
    element.addEventListener("scroll", measure, { passive: true });

    // Width changes without a scroll event: a rotated phone, a resized window,
    // a preview panel opening and reflowing the track, a late web font.
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener("resize", measure);

    return () => {
      element.removeEventListener("scroll", measure);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const step = useCallback((direction: -1 | 1) => {
    const element = track.current;
    if (!element) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({
      left: direction * element.clientWidth,
      behavior: reduced ? "auto" : "smooth",
    });
  }, []);

  return (
    <section className="sip-rail" aria-labelledby={headingId}>
      <div className="sip-rail__head">
        <div className="sip-rail__titles">
          <h2 id={headingId} className="sip-display sip-display--section sip-rail__heading">
            {heading}
          </h2>
          <p id={noteId} className="sip-rail__note">
            {note}
          </p>
        </div>

        <div className="sip-rail__controls">
          <button
            type="button"
            className="sip-rail__step"
            onClick={() => step(-1)}
            disabled={atStart}
          >
            <span aria-hidden="true">&#8592;</span>
            <span className="sr-only">Previous posters in {heading}</span>
          </button>
          <button
            type="button"
            className="sip-rail__step"
            onClick={() => step(1)}
            disabled={atEnd}
          >
            <span aria-hidden="true">&#8594;</span>
            <span className="sr-only">Next posters in {heading}</span>
          </button>
        </div>
      </div>

      {/* A list, because it is one. The heading names it and the note describes
          it, so a reader arriving on the track by any route knows what it is. */}
      <ul className="sip-rail__track" ref={track} aria-describedby={noteId}>
        {children}
      </ul>

      {credits.length > 0 && (
        <ul className="sip-rail__credits">
          {credits.map((credit) => (
            <li key={credit}>{credit}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
