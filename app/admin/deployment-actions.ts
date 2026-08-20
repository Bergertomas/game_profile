"use server";

import { revalidatePath } from "next/cache";
import { withAuthorizedAdminDatabase } from "@/lib/admin/db";
import {
  dispatchDeployment,
  markDispatchNotDelivered,
  refreshBuildStatuses,
  verifyProduction,
} from "@/lib/admin/deployments";
import { reportingFailures, type ActionResult } from "@/lib/admin/errors";
import { requireEditor } from "@/lib/admin/guard";
import { liveTransport } from "@/lib/deploy/transport";

/**
 * The three things an editor can do about a deployment.
 *
 *   check      ask production what it is serving, and Cloudflare what became
 *              of the builds we are waiting on
 *   request    ask for a production build
 *   settle     record that a request whose outcome was never established
 *              produced no build
 *
 * All three are explicit acts by a named person, and all three leave an audit
 * entry whether they succeed or not.
 *
 * ── No cron, no queue, no background service ───────────────────────────────
 *
 * Reconciliation happens when an editor asks for it. That is a deliberate
 * limitation and not an oversight: Master Plan §9.10 rules out adding service
 * layers, the stack has no scheduler, and a background poller would be the
 * first thing in this system that touches production with nobody present. The
 * cost is that "awaiting deployment" persists on screen until someone presses
 * Check — which is honest, because until someone looks, nobody knows.
 *
 * Each takes the `useActionState` shape so the page can report an outcome
 * without a full-page error, and each ignores the submitted form: none of them
 * has a field, and reading one would only invite a caller to add one.
 */

/** Verify production, then reconcile the requests we are still waiting on. */
export async function checkDeploymentAction(): Promise<ActionResult> {
  const editor = await requireEditor();

  const result = await reportingFailures(async () => {
    await withAuthorizedAdminDatabase(async (db) => {
      // Verification first. It is the only step that can establish Live, and it
      // can settle a request by matching a build uuid — so running it before
      // the status poll leaves the poll less to ask about, not more.
      await verifyProduction(db, {
        transport: liveTransport,
        actor: editor.email,
      });
      await refreshBuildStatuses(db, {
        transport: liveTransport,
        actor: editor.email,
      });
    });
  });

  revalidatePath("/admin/deployments");
  revalidatePath("/admin");
  return result;
}

/**
 * Ask for a production build.
 *
 * `retry` and `manual` differ only in what the trail records, and that
 * difference is why both exist: "somebody asked for a deploy" and "somebody
 * asked again because the last one failed" are different stories, and a trail
 * that cannot tell them apart cannot explain a run of four builds.
 *
 * A refusal, an unknown outcome and an unconfigured deployment are reported as
 * messages rather than thrown. None of them is a fault in the editor's action:
 * they are states of the world, and the page's job is to show them.
 */
export async function requestDeploymentAction(
  reason: "manual" | "retry",
): Promise<ActionResult> {
  const editor = await requireEditor();

  try {
    const report = await withAuthorizedAdminDatabase((db) =>
      dispatchDeployment(db, {
        reason,
        actor: editor.email,
        transport: liveTransport,
      }),
    );

    revalidatePath("/admin/deployments");

    return report.kind === "dispatched"
      ? { ok: true }
      : { ok: false, message: report.detail };
  } catch (error) {
    revalidatePath("/admin/deployments");
    // `dispatchDeployment` records its own outcomes, so anything escaping it is
    // a genuine fault — a database that is down, not a deployment that failed.
    // `reportingFailures` is the established way to tell those apart.
    return reportingFailures(() => {
      throw error;
    });
  }
}

/**
 * Record that a request with an unestablished outcome produced no build.
 *
 * The one state nothing can resolve by looking: `dispatch_unknown` means there
 * is no build id to ask about. Leaving it open blocks every later manual
 * request; clearing it automatically risks a duplicate production build. So a
 * person checks Cloudflare and says what they found, and the trail records that
 * it was a person who said it.
 */
export async function markDispatchNotDeliveredAction(
  requestId: string,
): Promise<ActionResult> {
  const editor = await requireEditor();

  const result = await reportingFailures(async () => {
    await withAuthorizedAdminDatabase((db) =>
      markDispatchNotDelivered(db, requestId, editor.email),
    );
  });

  revalidatePath("/admin/deployments");
  return result;
}
