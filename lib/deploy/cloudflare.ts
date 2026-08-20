import { z } from "zod";
import { redactSecrets, type DeployConfig } from "@/lib/deploy/config";

/**
 * The only code in this repository that talks to the Cloudflare API.
 *
 * Two operations, and deliberately no more:
 *
 *   requestBuild      ask the production trigger to build a branch
 *   readBuildStatus   ask what became of a build we asked for
 *
 * It is a *client*, not a service layer: it has no opinion about deployment
 * state, writes nothing, reads nothing from the database, and decides nothing
 * about Live. Everything it returns is a fact about an HTTP exchange, which is
 * the only kind of fact it is in a position to have.
 *
 * ── Accepted, refused, unknown — and why the third one matters most ────────
 *
 * The obvious shape is success-or-failure. It is wrong, and the missing third
 * case is the one that causes duplicate production builds.
 *
 *   accepted   Cloudflare returned a build id. A build exists.
 *   refused    Cloudflare answered with a 4xx. No build was created.
 *   unknown    The exchange did not complete, or completed unintelligibly.
 *              A build may or may not exist, and nothing here can tell.
 *
 * A timeout is the common `unknown`: the request very likely arrived, and the
 * response was lost. Treating that as a failure and retrying queues a second
 * production build for a corpus that already had one on the way. Treating it as
 * a success invents a build id there is no way to match later. So it is
 * reported as what it is, and the caller resolves it by looking — never by
 * assuming (see `lib/admin/deployments.ts`).
 *
 * The 4xx/5xx split follows the same reasoning. A 4xx is Cloudflare declining
 * to act: definitively no build. A 5xx may be a proxy failing *after* the
 * request reached the service, so it is `unknown`, not `refused`.
 *
 * ── The credential ─────────────────────────────────────────────────────────
 *
 * `config.apiToken` is used in exactly one place below, as an `Authorization`
 * header. It is never logged, never returned, and never interpolated into a
 * message. Every string this module hands back has been through
 * `redactSecrets` first, because the provider's error bodies are not this
 * repository's to make promises about.
 *
 * ── `fetch` is injected ────────────────────────────────────────────────────
 *
 * So that no test can reach the real API even by accident. There is no default
 * that quietly falls back to global `fetch` for a caller that forgot: the
 * transport is a required argument.
 */

/** How this module reaches the network. Required, so a test cannot omit it into the real API. */
export interface CloudflareTransport {
  readonly fetch: typeof globalThis.fetch;
  /** Bounded, because an editor is waiting and a hung socket is not an answer. */
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const API_ORIGIN = "https://api.cloudflare.com/client/v4";

export type DispatchOutcome =
  | { readonly kind: "accepted"; readonly buildId: string }
  | {
      readonly kind: "refused";
      readonly status: number;
      readonly detail: string;
    }
  | { readonly kind: "unknown"; readonly detail: string };

export type BuildStatusOutcome =
  | {
      readonly kind: "found";
      /** Verbatim. The Builds API does not document its status vocabulary. */
      readonly status: string;
      readonly buildOutcome: string | null;
    }
  | { readonly kind: "not-found" }
  | { readonly kind: "unavailable"; readonly detail: string };

/**
 * Cloudflare's standard envelope, parsed loosely.
 *
 * Loose rather than strict, and this is the one place that inversion is right:
 * a strict schema would reject a response that gained a field, turning a
 * successful dispatch into an `unknown` and a duplicate build. Only the fields
 * actually used are named.
 */
const ENVELOPE = z.looseObject({
  success: z.boolean().optional(),
  errors: z
    .array(z.looseObject({ code: z.number().optional(), message: z.string().optional() }))
    .optional(),
});

const DISPATCH_RESULT = ENVELOPE.extend({
  result: z.looseObject({ build_uuid: z.string().min(1) }).nullable().optional(),
});

const BUILD_LIST_RESULT = ENVELOPE.extend({
  result: z
    .array(
      z.looseObject({
        build_uuid: z.string().min(1),
        status: z.string().optional(),
        build_outcome: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
});

/** Cloudflare's own error text, flattened to one line and stripped of secrets. */
function describeErrors(
  body: z.infer<typeof ENVELOPE>,
  fallback: string,
  config: DeployConfig,
): string {
  const messages = (body.errors ?? [])
    .map((error) =>
      [error.code, error.message].filter((part) => part != null).join(" "),
    )
    .filter((line) => line.length > 0);

  return redactSecrets(messages.join("; ") || fallback, [config.apiToken]);
}

async function call(
  transport: CloudflareTransport,
  config: DeployConfig,
  path: string,
  init: RequestInit,
): Promise<
  | { readonly kind: "response"; readonly status: number; readonly text: string }
  | { readonly kind: "transport-failure"; readonly detail: string }
> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    transport.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await transport.fetch(`${API_ORIGIN}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...init.headers,
        // The only use of the credential in this repository.
        authorization: `Bearer ${config.apiToken}`,
      },
    });
    return {
      kind: "response",
      status: response.status,
      text: await response.text(),
    };
  } catch (error) {
    // Aborts, DNS failures, TLS failures, resets. The request may or may not
    // have been acted on, which is precisely what the caller is told.
    return {
      kind: "transport-failure",
      detail: redactSecrets(
        error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        [config.apiToken],
      ),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ask the production trigger for a build of `branch`.
 *
 * `POST /accounts/{account_id}/builds/triggers/{trigger_uuid}/builds` with a
 * `branch` body, per Cloudflare's Workers Builds API reference. The response
 * carries `build_uuid`, which Workers Builds also injects into the build itself
 * as `WORKERS_CI_BUILD_UUID` — the value that later lets a manifest fetched
 * from production be matched back to this request.
 *
 * The branch is passed in rather than assumed. Production-only deployment is
 * enforced by the trigger (its `branch_includes` is `["main"]`) and by
 * `cf-deploy.mjs`; this function's job is to report what it asked for.
 */
export async function requestBuild(
  transport: CloudflareTransport,
  config: DeployConfig,
  branch: string,
): Promise<DispatchOutcome> {
  const outcome = await call(
    transport,
    config,
    `/accounts/${encodeURIComponent(config.accountId)}/builds/triggers/${encodeURIComponent(config.triggerId)}/builds`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ branch }),
    },
  );

  if (outcome.kind === "transport-failure") {
    return {
      kind: "unknown",
      detail: `The request to Cloudflare did not complete (${outcome.detail}). A build may or may not have been queued.`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outcome.text);
  } catch {
    // An unparseable body leaves only the status to reason from, and the same
    // split applies: a 4xx declined, anything else might have acted.
    if (outcome.status >= 400 && outcome.status < 500) {
      return {
        kind: "refused",
        status: outcome.status,
        detail: `Cloudflare answered ${outcome.status} with an unparseable body.`,
      };
    }
    return {
      kind: "unknown",
      detail: `Cloudflare answered ${outcome.status} with a body this tool could not parse, so no build id is known.`,
    };
  }

  const envelope = ENVELOPE.safeParse(parsed);

  if (outcome.status >= 500) {
    return {
      kind: "unknown",
      detail: `Cloudflare answered ${outcome.status}. A 5xx can be raised after the request reached the service, so a build may or may not have been queued. ${
        envelope.success
          ? describeErrors(envelope.data, "No error detail was supplied.", config)
          : ""
      }`.trim(),
    };
  }

  if (outcome.status >= 400) {
    return {
      kind: "refused",
      status: outcome.status,
      detail: envelope.success
        ? describeErrors(
            envelope.data,
            `Cloudflare refused the request with ${outcome.status}.`,
            config,
          )
        : `Cloudflare refused the request with ${outcome.status}.`,
    };
  }

  const dispatch = DISPATCH_RESULT.safeParse(parsed);
  const buildId = dispatch.success ? dispatch.data.result?.build_uuid : undefined;
  if (!buildId) {
    return {
      kind: "unknown",
      detail:
        `Cloudflare answered ${outcome.status} but named no build_uuid, so this ` +
        "tool cannot match a build to this request. A build may still be running.",
    };
  }

  return { kind: "accepted", buildId };
}

/**
 * What became of a build, as Cloudflare reports it.
 *
 * ADVISORY ONLY. A reported success is a statement about a build process, not
 * about what production serves — the upload can fail afterwards, a later build
 * can land first, and a rollback can replace it. Live is proven by reading the
 * artifact's own manifest and by nothing else. This exists so that an editor
 * staring at a deployment that never arrived can find out why.
 *
 * There is no documented endpoint for a single build by id: the Builds API
 * reference lists trigger, list, logs and cancel, and nothing else. So this
 * lists the Worker's builds and looks for the one it asked for — which is why
 * `CLOUDFLARE_WORKER_TAG` is needed for this and only this.
 */
export async function readBuildStatus(
  transport: CloudflareTransport,
  config: DeployConfig,
  buildId: string,
): Promise<BuildStatusOutcome> {
  if (!config.workerTag) {
    return {
      kind: "unavailable",
      detail:
        "CLOUDFLARE_WORKER_TAG is unset, so build status cannot be read. " +
        "Deployment verification does not depend on it: Live is proven by the " +
        "artifact's manifest, not by a build report.",
    };
  }

  const outcome = await call(
    transport,
    config,
    `/accounts/${encodeURIComponent(config.accountId)}/builds/workers/${encodeURIComponent(config.workerTag)}/builds`,
    { method: "GET" },
  );

  if (outcome.kind === "transport-failure") {
    return { kind: "unavailable", detail: outcome.detail };
  }

  if (outcome.status < 200 || outcome.status >= 300) {
    return {
      kind: "unavailable",
      detail: `Cloudflare answered ${outcome.status} when listing builds.`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outcome.text);
  } catch {
    return {
      kind: "unavailable",
      detail: "Cloudflare's build list could not be parsed.",
    };
  }

  const list = BUILD_LIST_RESULT.safeParse(parsed);
  if (!list.success) {
    return {
      kind: "unavailable",
      detail: "Cloudflare's build list did not have the expected shape.",
    };
  }

  const build = (list.data.result ?? []).find(
    (candidate) => candidate.build_uuid === buildId,
  );
  if (!build) {
    // Not an error. The list is paginated and a build old enough to have fallen
    // off it is simply not visible any more — which says nothing about whether
    // it succeeded, and must not be reported as though it did.
    return { kind: "not-found" };
  }

  return {
    kind: "found",
    status: build.status ?? "unreported",
    buildOutcome: build.build_outcome ?? null,
  };
}
