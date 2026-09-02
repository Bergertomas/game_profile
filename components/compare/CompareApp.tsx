"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { CompareIndex } from "@/lib/compare";
import type { Side } from "@/lib/compare/relationship";
import { resolveSelection } from "@/lib/compare/selection";
import { comparePath, PAIR_PARAM } from "@/lib/compare/url";
import { SITE_NAME } from "@/lib/site";
import { CompareView } from "./CompareView";

/**
 * THE CLIENT SHELL OF `/compare`: the address is the state.
 *
 * ── Why the address is read in the browser ─────────────────────────────────
 *
 * `/compare` is prerendered once, as the launcher, and that HTML is what every
 * pair address receives: the deployed Worker has no corpus at request time
 * (ADR 0017), and ADR 0033 refuses to prerender every pair. So the pair is
 * restored here, from the index the build serialised into the page, by
 * reading `?games=` after hydration. The static launcher — with its guidance,
 * its eligible list and its control — is therefore the indexable document,
 * and a pair address is that document plus a client-side selection, marked
 * `noindex, follow` by the response header next.config.ts attaches to any
 * `/compare` request carrying `games`, and again in the document's own robots
 * meta below.
 *
 * `useSyncExternalStore` reads the query with a server snapshot of "" so the
 * hydration render matches the prerendered launcher, then re-renders to the
 * real address in the same tick. Selection writes the address with
 * `history.pushState` — a real address, so the back button and a reload both
 * restore the same left/right composition (matrix C-13).
 */
export function CompareApp({
  index,
  launcher,
}: {
  index: CompareIndex;
  launcher: React.ReactNode;
}) {
  const query = useSyncExternalStore(subscribe, readQuery, () => "");
  const selection = resolveSelection(index, query);
  const { left, right } = selection;

  const choose = useCallback(
    (side: Side, slug: string) => {
      const nextLeft = side === "left" ? slug : left?.slug ?? null;
      const nextRight = side === "right" ? slug : right?.slug ?? null;
      const url = comparePath(nextLeft, nextRight);
      window.history.pushState(null, "", url);
      window.dispatchEvent(new Event(NAVIGATED));
    },
    [left, right],
  );

  // The document's own account of the state: the title names the pair, and
  // every robots meta says a pair is not for the index. Metadata can arrive
  // in more than one tag and after this effect (it is streamed), so the rule
  // is applied to all of them now and again whenever the head changes; the
  // launcher restores what each tag said.
  useEffect(() => {
    const pair = left && right;
    const title = pair
      ? `${left.title} and ${right.title}, compared | ${SITE_NAME}`
      : `Compare two Game Profiles | ${SITE_NAME}`;

    const selected = Boolean(selection.tokens.left || selection.tokens.right);
    const apply = () => {
      if (document.title !== title) document.title = title;
      for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="robots"]')) {
        if (selected) {
          if (!meta.dataset.launcher) meta.dataset.launcher = meta.content;
          meta.content = "noindex, follow";
        } else if (meta.dataset.launcher) {
          meta.content = meta.dataset.launcher;
          delete meta.dataset.launcher;
        }
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, [left, right, selection.tokens.left, selection.tokens.right]);

  return (
    <CompareView
      selection={selection}
      index={index}
      onChoose={choose}
      launcher={launcher}
    />
  );
}

const NAVIGATED = "compare:navigated";

function readQuery(): string {
  return new URLSearchParams(window.location.search).get(PAIR_PARAM) ?? "";
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  window.addEventListener(NAVIGATED, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(NAVIGATED, callback);
  };
}
