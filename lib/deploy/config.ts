/**
 * The Cloudflare credentials and identifiers the deploy trigger needs.
 *
 * ── The credential never leaves this boundary ──────────────────────────────
 *
 * `CLOUDFLARE_API_TOKEN` is read here and handed only to
 * `lib/deploy/cloudflare.ts`, which puts it in one `Authorization` header and
 * nowhere else. It is never returned to a caller, never rendered, never stored,
 * never logged, and never included in an error. `redactSecrets` below is the
 * belt to that braces: the provider echoes request context in some error
 * bodies, and this repository does not get to assume it will not echo the
 * header.
 *
 * Nothing in this module may be imported by a client component. It is not
 * marked `server-only` because the package is not a dependency and the
 * repository's existing server modules (`lib/admin/auth.ts`,
 * `lib/admin/db.ts`) do not use it either; the guarantee is enforced instead by
 * `tests/deploy/credential-boundary.test.ts` and by
 * `scripts/check-build-containment.ts`, which read the built artifact rather
 * than trusting a convention.
 *
 * ── Why the trigger UUID and worker tag are configuration ──────────────────
 *
 * Cloudflare's Builds API identifies a Worker by an immutable **tag**, not by
 * its name, and the documented way to learn the tag is
 * `GET /accounts/{account}/workers/scripts` — which needs the token to also
 * carry **Workers Scripts: Read**. Configuring the tag and the trigger uuid
 * directly removes that lookup, and with it the permission. The token this
 * product needs is therefore narrower than the documented example:
 *
 *   Workers Builds Configuration   Edit    trigger a build
 *   Workers Scripts                Read    NOT NEEDED — the tag is configured
 *
 * Cloudflare additionally requires the Builds API token to be **user-scoped**;
 * their documentation states account-scoped tokens "are not supported and will
 * return 'Invalid token' errors". That is an operational fact worth knowing
 * before an hour is lost to it, so it is recorded here and in the runbook.
 */

/** Public, non-secret identifiers plus the one secret, kept together but not equal. */
export interface DeployConfig {
  readonly accountId: string;
  readonly triggerId: string;
  /**
   * Optional. Present, build status can be polled for failure diagnosis;
   * absent, everything else still works — Live is proven by the manifest, not
   * by a build report, so this is a diagnostic convenience and never a
   * prerequisite.
   */
  readonly workerTag: string | null;
  readonly apiToken: string;
}

export type DeployUnavailableReason =
  | "no-api-token"
  | "no-account-id"
  | "no-trigger-id";

export type DeployAvailability =
  | { readonly available: true; readonly config: DeployConfig }
  | { readonly available: false; readonly reason: DeployUnavailableReason };

function value(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
): string | null {
  return env[name]?.trim() || null;
}

/**
 * Whether this deployment can ask Cloudflare for a build.
 *
 * Fails closed and stays closed. An unconfigured environment is the deployed
 * default — the same posture as the admin itself (ADR 0018) — and every caller
 * treats "not configured" as a state to report, never as a reason to guess or
 * to fall back to some other way of reaching production.
 */
export function deployAvailability(
  env: Readonly<Record<string, string | undefined>> = process.env,
): DeployAvailability {
  const apiToken = value(env, "CLOUDFLARE_API_TOKEN");
  if (!apiToken) return { available: false, reason: "no-api-token" };

  const accountId = value(env, "CLOUDFLARE_ACCOUNT_ID");
  if (!accountId) return { available: false, reason: "no-account-id" };

  const triggerId = value(env, "CLOUDFLARE_BUILDS_TRIGGER_ID");
  if (!triggerId) return { available: false, reason: "no-trigger-id" };

  return {
    available: true,
    config: {
      accountId,
      triggerId,
      workerTag: value(env, "CLOUDFLARE_WORKER_TAG"),
      apiToken,
    },
  };
}

/**
 * One sentence for an editor. Names the missing variable, never a value.
 *
 * Naming the variable is safe and useful: it is a configuration key, not a
 * secret, and an editor who can see this page can already see the deployment
 * tool. What must never appear is what the variable contains.
 */
export function explainDeployUnavailable(
  reason: DeployUnavailableReason,
): string {
  switch (reason) {
    case "no-api-token":
      return (
        "Deployment is not configured: CLOUDFLARE_API_TOKEN is unset. This is " +
        "the default, and it means publishing cannot request a production " +
        "build. Publications still commit normally and can be deployed by any " +
        "ordinary push to main."
      );
    case "no-account-id":
      return (
        "Deployment is not configured: CLOUDFLARE_ACCOUNT_ID is unset, so " +
        "there is no account to address the Builds API against."
      );
    case "no-trigger-id":
      return (
        "Deployment is not configured: CLOUDFLARE_BUILDS_TRIGGER_ID is unset. " +
        "This is the uuid of the Workers Builds production trigger — the one " +
        "whose branch_includes is [\"main\"]."
      );
  }
}

/**
 * Remove anything secret from text that is about to be stored or shown.
 *
 * Applied to every provider error before it reaches `deployment_events`, an
 * editor, or a log line. The token is passed in rather than read from the
 * environment so this function is testable without a credential existing, and
 * so it cannot silently become a no-op in a process where the variable is unset
 * while the caller has one.
 *
 * Short secrets are deliberately not redacted: a value of two characters would
 * turn the redaction itself into noise across every message. Cloudflare API
 * tokens are 40 characters; the floor is far below that and far above the
 * length at which a false positive is plausible.
 */
export function redactSecrets(
  text: string,
  secrets: readonly (string | null | undefined)[],
): string {
  let out = text;
  for (const secret of secrets) {
    if (!secret || secret.length < 8) continue;
    out = out.split(secret).join("[redacted]");
  }
  return out;
}
