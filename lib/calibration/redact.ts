/**
 * Secret redaction for everything the harness prints or persists.
 *
 * Item 4 gate 9 requires that credentials, secrets and fixtures do not expose a
 * key. The harness reads the key from the environment and hands it straight to
 * the SDK, so the realistic leak path is not the variable itself but an error
 * message, a response body echo or a ledger entry that happens to contain it.
 * Every such string goes through `redact` before it is written or shown.
 */

/**
 * Patterns for provider key shapes. Deliberately broad: a false positive costs
 * a masked string in a log, a false negative costs a leaked credential.
 */
const KEY_PATTERNS: readonly RegExp[] = [
  // OpenAI project/user keys: sk-..., sk-proj-..., and organisation ids.
  /\bsk-[A-Za-z0-9_-]{8,}/g,
  /\borg-[A-Za-z0-9]{8,}/g,
  // Bearer tokens in a header echo.
  /\bBearer\s+[A-Za-z0-9._~+/-]{8,}=*/gi,
];

export const REDACTED = "[redacted]";

/** Environment variables whose exact values must never appear in output. */
const SECRET_ENV_VARS: readonly string[] = [
  "OPENAI_API_KEY",
  "OPENAI_ADMIN_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_ORGANIZATION",
  "OPENAI_PROJECT",
];

/** Mask credential-shaped substrings, plus the literal values of known secrets. */
export function redact(value: string, env: NodeJS.ProcessEnv = process.env): string {
  let out = value;
  for (const name of SECRET_ENV_VARS) {
    const secret = env[name];
    // A short or empty value would match everywhere; only mask real secrets.
    if (secret && secret.length >= 8) out = out.split(secret).join(REDACTED);
  }
  for (const pattern of KEY_PATTERNS) out = out.replace(pattern, REDACTED);
  return out;
}

/** Redact recursively through a JSON-shaped value, preserving its structure. */
export function redactDeep<T>(value: T, env: NodeJS.ProcessEnv = process.env): T {
  if (typeof value === "string") return redact(value, env) as unknown as T;
  if (Array.isArray(value)) {
    return value.map((item) => redactDeep(item, env)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = redactDeep(child, env);
    }
    return out as unknown as T;
  }
  return value;
}

/** A safe error class/message pair for the ledger. Never carries a stack echo. */
export function safeError(error: unknown, env: NodeJS.ProcessEnv = process.env): {
  readonly error_class: string;
  readonly message: string;
} {
  if (error instanceof Error) {
    return { error_class: error.name, message: redact(error.message, env) };
  }
  return { error_class: "UnknownError", message: redact(String(error), env) };
}
