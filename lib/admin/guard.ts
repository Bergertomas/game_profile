import { cache } from "react";
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
 * Split from `lib/admin/auth.ts` so the policy stays importable from contexts
 * with no request to read `headers()` from. The policy is shared; only the way
 * the request is obtained differs.
 */

/**
 * The editor making this request, or a thrown refusal.
 *
 * CALL THIS BEFORE TOUCHING EDITORIAL DATA — in every Server Action, and in
 * every exported read that reaches the database. Not only in the layout.
 *
 * ── Why the layout is not enough ────────────────────────────────────────────
 *
 * It is the obvious place and it is the wrong place to *rely* on. Next's
 * authentication guidance is explicit that layouts do not re-render on every
 * navigation under Partial Rendering, and that a segment can be entered by more
 * than one path — so a layout check is a thing that usually runs rather than a
 * thing that always runs. The guidance is to put authorization next to the data
 * source. The admin reader deliberately sees drafts, review rows, superseded
 * history and artwork of every clearance; that is precisely the data that must
 * not depend on a parent segment having rendered.
 *
 * The same document requires the check inside every Server Function, for a
 * related reason: a Server Function is a POST to whatever route uses it, so a
 * refactor moving one can silently move it out from under any route-level gate.
 *
 * ── Memoised per request, never globally ────────────────────────────────────
 *
 * `cache()` is request-scoped: one verification per render pass, however many
 * guarded reads a page performs. It is NOT a place to keep auth state — there
 * is no module-level identity here, and nothing survives the request. Verifying
 * an Access assertion involves a JWKS fetch, and doing that once per panel on a
 * page with several would be a self-inflicted rate limit.
 */
export const requireEditor = cache(async (): Promise<EditorIdentity> => {
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
});
