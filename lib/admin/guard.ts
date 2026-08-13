import { headers } from "next/headers";
import type { EditorIdentity } from "@/lib/admin/access";
import {
  AdminForbiddenError,
  adminAvailability,
  explainUnavailable,
  resolveEditor,
} from "@/lib/admin/auth";

/**
 * The request-scoped half of admin authentication.
 *
 * Split from `lib/admin/auth.ts` because that module is imported by `proxy.ts`,
 * which runs before rendering and has no request context to read `headers()`
 * from. The policy is shared; only the way the request is obtained differs.
 */

/**
 * The editor making this request, or a thrown refusal.
 *
 * CALL THIS AT THE TOP OF EVERY ADMIN PAGE AND EVERY SERVER ACTION. Not as
 * belt-and-braces over `proxy.ts` — because proxy coverage is not guaranteed to
 * follow a Server Function. Next's own proxy documentation is explicit:
 *
 *   "Server Functions are not separate routes in this chain. They are handled
 *    as POST requests to the route where they are used, so a Proxy matcher that
 *    excludes a path will also skip Server Function calls on that path. A
 *    matcher change or a refactor that moves a Server Function to a different
 *    route can silently remove Proxy coverage. Always verify authentication and
 *    authorization inside each Server Function rather than relying on Proxy
 *    alone."
 *
 * A mutation reached through an unguarded action is the whole of the risk, so
 * the guard lives with the mutation rather than only at the front door.
 */
export async function requireEditor(): Promise<EditorIdentity> {
  const availability = adminAvailability();
  if (!availability.available) {
    console.warn(explainUnavailable(availability.reason));
    throw new AdminForbiddenError("[admin] the editorial tool is not available.");
  }
  const editor = await resolveEditor(await headers());
  if (!editor) {
    throw new AdminForbiddenError("[admin] no verified editor for this request.");
  }
  return editor;
}
