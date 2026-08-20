"use server";

import { revalidatePath } from "next/cache";
import { withAuthorizedAdminDatabase } from "@/lib/admin/db";
import {
  dispatchDeployment,
  refreshBuildStatuses,
  settleDeploymentRequest,
  verifyProduction,
} from "@/lib/admin/deployments";
import { reportingFailures, type ActionResult } from "@/lib/admin/errors";
import { requireEditor } from "@/lib/admin/guard";
import { liveTransport } from "@/lib/deploy/transport";
import { z } from "zod";

/**
 * The three things an editor can do about a deployment.
 *
 *   check      ask production what it is serving, and Cloudflare what became
 *              of the builds we are waiting on
 *   request    ask for a production build
 *   settle     stop waiting for a request nothing here can resolve, from
 *              whichever open state it is stuck in
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
 * The reasons a *person* may give for asking for a build.
 *
 * PARSED AT RUNTIME, AND THAT IS THE WHOLE POINT. A Server Action is a POST
 * endpoint whose arguments are deserialized from the request body; the
 * `"manual" | "retry"` annotation below is erased at compile time and checks
 * nothing about what actually arrives. Anything callable with an argument is
 * callable with a different one.
 *
 * `publication` is deliberately not here. It is the reason the *publication
 * path* gives, and `dispatchDeployment` treats it differently on purpose: a
 * publication is never refused for having another request open, and it
 * coalesces on its triggering evaluation rather than on the open-request guard.
 * Both of those are correct for a publication and wrong for a person — so a
 * forged `reason: "publication"` from the client would have walked straight
 * past the guard that stops a human asking for build after build while one is
 * already in flight. It is refused here, before anything is written.
 */
const REQUEST_REASON = z.enum(["manual", "retry"]);

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

  // Before the database is opened and before anything is recorded: a rejected
  // reason must leave no request row, no event, and no build attempt.
  const parsed = REQUEST_REASON.safeParse(reason);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        "That is not a reason a person can give for a build. Use the Request " +
        "or Retry button on the deployment page.",
    };
  }

  try {
    const report = await withAuthorizedAdminDatabase((db) =>
      dispatchDeployment(db, {
        reason: parsed.data,
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
 * Stop waiting for a request that nothing here can resolve.
 *
 * Three states can strand a request forever: `pending` (the row committed, the
 * process died before the outcome could be written), `dispatch_unknown` (no
 * build id exists to ask about) and `dispatched` (a build id exists but its
 * outcome cannot be read — `CLOUDFLARE_WORKER_TAG` is optional, builds age off
 * Cloudflare's list, and a failed build never appears in a manifest). Any of
 * them blocks every later manual request. Clearing one automatically would risk
 * a duplicate production build, so a person checks Cloudflare and decides, and
 * the trail records the state it was settled from and who settled it.
 *
 * It records that we stopped waiting — never that the build failed. See
 * `settleDeploymentRequest`.
 */
export async function settleDeploymentRequestAction(
  requestId: string,
): Promise<ActionResult> {
  const editor = await requireEditor();

  const result = await reportingFailures(async () => {
    await withAuthorizedAdminDatabase((db) =>
      settleDeploymentRequest(db, requestId, editor.email),
    );
  });

  revalidatePath("/admin/deployments");
  return result;
}
