/**
 * The marker that says "this page has its own search field".
 *
 * ── Why it lives in a neutral module ───────────────────────────────────────
 *
 * It is a contract between a SERVER component that writes the attribute (the
 * homepage opening) and a CLIENT component that looks for it (the header's `/`
 * handler). It cannot live in either of them.
 *
 * Specifically it cannot live in the client one. Every export of a `"use
 * client"` module becomes a client *reference* when a server component imports
 * it — a proxy object, not the string. Spreading `{ [reference]: "" }` into JSX
 * produces an attribute name of `[object Object]`, which React drops, and the
 * page silently ships without the marker: `/` then opens the header dialog on
 * top of a field that was sitting right there. That happened, it type-checked,
 * and only a browser noticed.
 */
export const PRIMARY_SEARCH_ATTRIBUTE = "data-search-primary";

/** The page's own search input, if it has one. */
export const PRIMARY_SEARCH_SELECTOR = `[${PRIMARY_SEARCH_ATTRIBUTE}] input`;
