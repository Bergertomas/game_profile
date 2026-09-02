"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
import { useSearchParams } from "next/navigation";
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
 *
 * ── The three ways the address changes ──────────────────────────────────────
 *
 * Our own `pushState` (announced with `NAVIGATED`), the back button
 * (`popstate`), and a Next `<Link>` or router navigation to `/compare` with a
 * different query — the launcher's "Start with…" links and the header's
 * Compare link are both of those. The third fires no `popstate` and, because
 * the route segment is unchanged, does not re-render this component either,
 * so nothing would re-read the address. `QuerySync` is the bridge: a leaf that
 * watches Next's own search-parameter state and pokes the store when it moves.
 * It sits under its own Suspense boundary because a prerendered route bails
 * out to client rendering up to the nearest one wherever `useSearchParams` is
 * read — this way only the empty leaf is client-rendered and the launcher
 * stays in the static document.
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
  // launcher, and any page this one navigates away to, gets each tag's own
  // value back.
  //
  // A LAYOUT effect, deliberately. Leaving `/compare` by a client navigation
  // changes the head in the same commit that unmounts this component. A
  // passive cleanup would disconnect the observer only after that commit, by
  // which time its callback had already queued — and it would then stamp the
  // Compare title and robots rule onto the destination page, where nothing
  // would ever put them right. A layout cleanup runs inside the commit and
  // discards the pending records with the observer.
  const selected = Boolean(selection.tokens.left || selection.tokens.right);
  const title =
    left && right
      ? `${left.title} and ${right.title}, compared | ${SITE_NAME}`
      : LAUNCHER_TITLE;

  useLayoutEffect(() => {
    const apply = () => {
      setTitle(title);
      for (const meta of robotsMetas()) {
        if (selected) {
          if (!meta.dataset.launcher) meta.dataset.launcher = meta.content;
          meta.content = PAIR_ROBOTS;
        } else {
          restoreRobots(meta);
        }
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true });
    return () => {
      observer.disconnect();
      // The robots tags belong to the layout and are not re-rendered on a
      // navigation, so nothing else would restore them. The title IS re-rendered
      // by the destination page, and it is left alone here for that reason.
      for (const meta of robotsMetas()) restoreRobots(meta);
    };
  }, [title, selected]);

  return (
    <>
      <Suspense fallback={null}>
        <QuerySync />
      </Suspense>
      <CompareView
        selection={selection}
        index={index}
        onChoose={choose}
        launcher={launcher}
      />
    </>
  );
}

const NAVIGATED = "compare:navigated";
const LAUNCHER_TITLE = `Compare two Game Profiles | ${SITE_NAME}`;
const PAIR_ROBOTS = "noindex, follow";

/**
 * Next's own view of the address. It updates on a `<Link>` or router
 * navigation, on the back button, and on the `pushState` calls this module
 * makes (which the Next router integrates). When it moves, the store is told
 * to read the address again.
 */
function QuerySync() {
  const query = useSearchParams().toString();
  useEffect(() => {
    window.dispatchEvent(new Event(NAVIGATED));
  }, [query]);
  return null;
}

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

function robotsMetas(): HTMLMetaElement[] {
  return [...document.querySelectorAll<HTMLMetaElement>('meta[name="robots"]')];
}

function restoreRobots(meta: HTMLMetaElement): void {
  if (meta.dataset.launcher === undefined) return;
  meta.content = meta.dataset.launcher;
  delete meta.dataset.launcher;
}

/**
 * Write the title through the text node the framework already owns, rather
 * than through `document.title`. Assigning `document.title` replaces the text
 * node, and the framework's own later updates — the destination page's title
 * on a navigation — would then go to a node no longer in the document.
 */
function setTitle(text: string): void {
  const element = document.querySelector("title");
  const node = element?.firstChild;
  if (
    element &&
    node &&
    node.nodeType === Node.TEXT_NODE &&
    element.childNodes.length === 1
  ) {
    if (node.nodeValue !== text) node.nodeValue = text;
  } else if (document.title !== text) {
    document.title = text;
  }
}
