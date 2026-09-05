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

/**
 * One nested transport cause, reduced to what is safe to keep.
 *
 * Class and code only. A nested cause's message is not retained: a connection
 * failure's message carries the host and port it was dialling, and the rule for
 * this ledger is that no URL, header, body, credential or environment value
 * reaches disk.
 */
export interface SafeErrorCause {
  readonly error_class: string;
  readonly code: string | null;
}

/** How far down a `cause` chain to walk. Deep enough to name a transport fault. */
const MAX_CAUSE_DEPTH = 5;

/**
 * Identifier-shaped values only — `HeadersTimeoutError`, `UND_ERR_HEADERS_TIMEOUT`,
 * `ECONNREFUSED`. Anything with a space, a slash or a quote is free text that
 * could carry a URL or a secret, so it is masked rather than inspected.
 */
const DIAGNOSTIC_TOKEN = /^[A-Za-z0-9_.:-]{1,64}$/;

function diagnosticToken(value: unknown, env: NodeJS.ProcessEnv): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string" || value.length === 0) return null;
  if (!DIAGNOSTIC_TOKEN.test(value)) return REDACTED;
  // Redaction still runs: a credential is identifier-shaped too.
  return redact(value, env);
}

/**
 * The nested transport diagnostics of an error, class and code only.
 *
 * `TypeError: fetch failed` is what undici throws for every transport fault, so
 * the outer error alone cannot distinguish a headers timeout from a refused
 * connection. D1 research attempt 2 failed exactly that way and the specific
 * `UND_ERR_*` code was lost, which is why the cause chain is retained here.
 */
export function safeErrorCauses(
  error: unknown,
  env: NodeJS.ProcessEnv = process.env,
): readonly SafeErrorCause[] {
  const chain: SafeErrorCause[] = [];
  const seen = new Set<unknown>();
  let current = (error as { cause?: unknown } | null)?.cause;
  while (current !== undefined && current !== null && chain.length < MAX_CAUSE_DEPTH) {
    if (seen.has(current)) break;
    seen.add(current);
    const record = current as { name?: unknown; code?: unknown; cause?: unknown };
    chain.push({
      error_class: diagnosticToken(record.name, env) ?? "UnknownError",
      code: diagnosticToken(record.code, env),
    });
    current = record.cause;
  }
  return chain;
}

/** A safe error class/message pair for the ledger. Never carries a stack echo. */
export function safeError(error: unknown, env: NodeJS.ProcessEnv = process.env): {
  readonly error_class: string;
  readonly message: string;
  readonly cause_chain: readonly SafeErrorCause[];
} {
  const cause_chain = safeErrorCauses(error, env);
  if (error instanceof Error) {
    return { error_class: error.name, message: redact(error.message, env), cause_chain };
  }
  return { error_class: "UnknownError", message: redact(String(error), env), cause_chain };
}
