import {
  readAccessConfig,
  readAccessToken,
  verifyAccessToken,
  type EditorIdentity,
} from "@/lib/admin/access";
import { SITE_ENV } from "@/lib/site";

/**
 * Who is allowed into the editorial tool, and whether it exists at all.
 *
 * Two independent questions, deliberately answered in one place:
 *
 *   1. Is the admin part of THIS deployment? (`adminAvailability`)
 *   2. Which editor is making THIS request? (`resolveEditor` / `requireEditor`)
 *
 * Both fail closed. A build that cannot answer (1) affirmatively serves 404 for
 * every `/admin` path, so an unconfigured deployment does not merely reject
 * editors — it does not admit that the editorial tool is there.
 */

/** Why the admin is not available, for the server log. Never sent to a client. */
export type AdminUnavailableReason =
  | "no-identity-provider"
  | "no-database";

export type AdminAvailability =
  | { readonly available: true }
  | { readonly available: false; readonly reason: AdminUnavailableReason };

/**
 * The database the editorial tool reads and writes at request time.
 *
 * Deliberately NOT `DATABASE_URL`. That variable is the *build-time* public
 * read path (ADR 0017): Workers Builds sets it, the build renders the public
 * corpus with it, and the deployed Worker never sees it. Reusing the name would
 * mean that provisioning production Postgres — a build-variable change — also
 * silently switched on a request-time editorial surface in the Worker.
 *
 * Master Plan §9.4 says the deployed Worker has no database secret, no
 * Hyperdrive binding and no request-time pool. That contract is about the
 * public path and it is kept exactly: with this variable unset, which is the
 * deployed default, no request-time database access exists at all. Setting it
 * is a separate, explicit act of provisioning (ADR 0018).
 */
export function adminDatabaseUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string | null {
  return env.ADMIN_DATABASE_URL?.trim() || null;
}

/**
 * The local-development editor.
 *
 * There is no Cloudflare Access in front of `next dev` on a laptop, and running
 * the editorial tool locally is the intended Phase 2B workflow, so an explicit
 * named identity stands in for a verified assertion.
 *
 * The guard that matters is the build environment, not the variable: `SITE_ENV`
 * folds to a literal at build time (see lib/site.ts), so in a production bundle
 * this function is `return null` and no value of `ADMIN_DEV_IDENTITY` can
 * change that. A development identity is not something production can be
 * configured into having.
 */
export function developmentIdentity(
  env: Readonly<Record<string, string | undefined>> = process.env,
): EditorIdentity | null {
  if (SITE_ENV === "production") return null;
  const email = env.ADMIN_DEV_IDENTITY?.trim();
  return email ? { email, source: "development" } : null;
}

/**
 * Whether this deployment carries the editorial tool.
 *
 * Requires both an identity mechanism and a request-time database, because an
 * admin missing either is not a degraded admin — it is a surface that can only
 * produce errors, and one that should not be discoverable.
 */
export function adminAvailability(
  env: Readonly<Record<string, string | undefined>> = process.env,
): AdminAvailability {
  const hasIdentity = readAccessConfig(env) !== null || developmentIdentity(env) !== null;
  if (!hasIdentity) return { available: false, reason: "no-identity-provider" };
  if (!adminDatabaseUrl(env)) return { available: false, reason: "no-database" };
  return { available: true };
}

/** One sentence for the server log, so a 404 is not the only diagnostic. */
export function explainUnavailable(reason: AdminUnavailableReason): string {
  switch (reason) {
    case "no-identity-provider":
      return (
        "[admin] /admin is disabled: no identity provider. Set CF_ACCESS_TEAM_DOMAIN " +
        "and CF_ACCESS_AUD for a deployed build, or ADMIN_DEV_IDENTITY for local " +
        "development. See docs/decisions/0018-admin-access.md."
      );
    case "no-database":
      return (
        "[admin] /admin is disabled: ADMIN_DATABASE_URL is not set, so there is no " +
        "request-time editorial database. This is the deployed default and is " +
        "deliberate. See docs/decisions/0018-admin-access.md."
      );
  }
}

/**
 * The editor making this request, or null.
 *
 * A verified Access assertion wins wherever Access is configured. The
 * development identity applies only where it is not — so a misconfigured
 * `aud`, an expired token or a missing header on a deployed build cannot fall
 * through to an unauthenticated editor.
 */
export async function resolveEditor(
  requestHeaders: Headers,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<EditorIdentity | null> {
  const config = readAccessConfig(env);
  if (config) {
    const token = readAccessToken(requestHeaders);
    if (!token) return null;
    return verifyAccessToken(token, { config });
  }
  return developmentIdentity(env);
}

/**
 * Refusal from inside the admin.
 *
 * A distinct class so a route can tell "not allowed" from a genuine fault. It
 * carries no detail a caller could use: the message is for the server log.
 */
export class AdminForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminForbiddenError";
  }
}
