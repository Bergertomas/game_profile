import { IGDB_ENV } from "./contract";

/**
 * Secret redaction for everything the IGDB layer prints, throws or persists.
 *
 * The Client ID, Client Secret, access token, Authorization header and any
 * credential-bearing URL must never appear in output (issue #48, credential
 * safety). Credentials are read from the environment and handed to `fetch`;
 * the realistic leak paths are an error message that echoes a request, a
 * response body that echoes a header, or a URL with a query string. Every such
 * string goes through `redactIgdb` first.
 */

export const REDACTED = "[redacted]";

const SECRET_ENV_VARS: readonly string[] = [
  IGDB_ENV.clientId,
  IGDB_ENV.clientSecret,
  IGDB_ENV.accessToken,
  // Twitch-named aliases some environments use.
  "TWITCH_CLIENT_ID",
  "TWITCH_CLIENT_SECRET",
];

/** Credential-shaped patterns. Broad on purpose: a false positive masks a log line. */
const PATTERNS: readonly RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/-]{6,}=*/gi,
  /\bClient-ID\s*:\s*[A-Za-z0-9._~+/-]{6,}/gi,
  /([?&](?:client_id|client_secret|access_token|secret|token)=)[^&\s"']+/gi,
  /("(?:access_token|client_secret|client_id)"\s*:\s*")[^"]+/gi,
  // Presigned dump download URLs carry a signature and must never be printed.
  /https?:\/\/[^\s"']*(?:X-Amz-|Signature=)[^\s"']*/gi,
  /("s3_url"\s*:\s*")[^"]+/gi,
];

export function redactIgdb(value: string, env: NodeJS.ProcessEnv = process.env): string {
  let out = value;
  for (const name of SECRET_ENV_VARS) {
    const secret = env[name];
    if (secret && secret.length >= 6) out = out.split(secret).join(REDACTED);
  }
  for (const pattern of PATTERNS) {
    out = out.replace(pattern, (match, prefix: string | undefined) =>
      typeof prefix === "string" && match.startsWith(prefix) ? `${prefix}${REDACTED}` : REDACTED,
    );
  }
  return out;
}

export function redactIgdbDeep<T>(value: T, env: NodeJS.ProcessEnv = process.env): T {
  if (typeof value === "string") return redactIgdb(value, env) as unknown as T;
  if (Array.isArray(value)) return value.map((item) => redactIgdbDeep(item, env)) as unknown as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = redactIgdbDeep(child, env);
    }
    return out as unknown as T;
  }
  return value;
}

/** A safe class/message pair. Never a stack, never a request echo. */
export function safeIgdbError(
  error: unknown,
  env: NodeJS.ProcessEnv = process.env,
): { readonly error_class: string; readonly message: string } {
  if (error instanceof Error) {
    return { error_class: error.name, message: redactIgdb(error.message, env) };
  }
  return { error_class: "UnknownError", message: redactIgdb(String(error), env) };
}
