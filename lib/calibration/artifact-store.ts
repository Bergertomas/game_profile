import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { canonicalDigest, sha256Hex } from "./canonical-json";

/**
 * Verbatim, verified, immutable persistence for digest-bound run artifacts.
 *
 * Two properties, and both of them are protocol requirements rather than
 * engineering taste:
 *
 * 1. **Verbatim.** A digest is a commitment to exact bytes. Anything that edits
 *    an artifact after its digest has been computed breaks that commitment, and
 *    the edit does not have to be malicious to do it: the credential redactor's
 *    deliberately broad `Bearer <token>` pattern also matches ordinary prose
 *    such as `torch-bearer carrying`, so a normalized capture could be persisted
 *    altered while the receipt still claimed the unaltered digest. Redaction
 *    belongs on the surfaces where a credential can actually appear — errors,
 *    console output and the ledger — and never between a digest and its bytes.
 *
 * 2. **Immutable.** Preregistration §9.1 requires primary and audit outputs to
 *    be preserved immutably and §9.3 requires old runs to be preserved; ADR 0036
 *    §10 makes any model retry a new logged run. A writer that can replace an
 *    existing measured artifact could quietly turn a failed measured attempt
 *    into a clean one, so this module refuses to write different bytes over an
 *    artifact that already exists. A byte-identical re-write is permitted and is
 *    what makes the deterministic `--freeze` / `--replay` re-derivations work.
 *
 * Every write is followed by a read-back from disk that must reproduce the bytes
 * written, re-derive the same RFC 8785 canonical digest, satisfy any self-digest
 * the artifact records about itself, and satisfy every cross-artifact digest
 * binding the caller declares. Any failure throws; nothing here repairs, retries
 * or downgrades to a warning.
 */

/** Raised when persisted bytes do not reproduce what they commit to. */
export class ArtifactIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArtifactIntegrityError";
  }
}

/** Raised when a write would replace an existing measured artifact. */
export class ArtifactImmutabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArtifactImmutabilityError";
  }
}

/**
 * A digest the caller expects the persisted bytes to re-derive.
 *
 * `derive` receives the value parsed back off disk — never the in-memory value —
 * so a binding proves something about the file rather than about the object the
 * caller happened to hold.
 */
export interface DigestBinding {
  /** How the digest is named in the receipt, for the failure message. */
  readonly label: string;
  readonly expected: string;
  readonly derive: (readBack: unknown) => string;
}

export interface ArtifactSpec {
  /** File base name; `.json` is appended. */
  readonly name: string;
  readonly value: unknown;
  readonly bindings?: readonly DigestBinding[];
}

export interface ArtifactRecord {
  readonly name: string;
  readonly file: string;
  readonly byte_length: number;
  /** SHA-256 over the exact bytes on disk. */
  readonly file_sha256: string;
  /** SHA-256 over the RFC 8785 canonical bytes of the persisted value. */
  readonly canonical_digest: string;
  readonly verified: readonly string[];
  /** True when the artifact already existed byte-identically and was not rewritten. */
  readonly already_present: boolean;
}

/**
 * Digests an artifact records about itself.
 *
 * These make an artifact self-verifying: corruption after the write is caught on
 * the next read without needing a second copy of the digest somewhere else.
 */
interface SelfDigestRule {
  readonly field: string;
  readonly describes: string;
  readonly applies: (value: Record<string, unknown>) => boolean;
  readonly derive: (value: Record<string, unknown>) => string;
}

const SELF_DIGEST_RULES: readonly SelfDigestRule[] = [
  {
    field: "receipt_digest",
    describes: "the receipt body",
    applies: () => true,
    derive: (value) => {
      const body = { ...value };
      delete body.receipt_digest;
      return canonicalDigest(body as never);
    },
  },
  {
    field: "output_digest",
    describes: "the captured model output",
    applies: (value) => value.output !== undefined,
    derive: (value) => canonicalDigest(value.output as never),
  },
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Check every self-digest and caller-declared binding against read-back bytes. */
function verifyReadBack(
  file: string,
  parsed: unknown,
  bindings: readonly DigestBinding[],
): readonly string[] {
  const verified: string[] = [];

  if (isPlainObject(parsed)) {
    for (const rule of SELF_DIGEST_RULES) {
      const recorded = parsed[rule.field];
      if (typeof recorded !== "string" || !rule.applies(parsed)) continue;
      const derived = rule.derive(parsed);
      if (derived !== recorded) {
        throw new ArtifactIntegrityError(
          `${file}: ${rule.field} does not re-derive from ${rule.describes} on disk — ` +
            `recorded ${recorded}, re-derived ${derived}. The persisted artifact is not the ` +
            "artifact its digest commits to.",
        );
      }
      verified.push(rule.field);
    }
  }

  for (const binding of bindings) {
    const derived = binding.derive(parsed);
    if (derived !== binding.expected) {
      throw new ArtifactIntegrityError(
        `${file}: ${binding.label} does not re-derive from the persisted bytes — ` +
          `expected ${binding.expected}, re-derived ${derived}.`,
      );
    }
    verified.push(binding.label);
  }

  return verified;
}

/**
 * The exact bytes an artifact is persisted as.
 *
 * Pretty-printed JSON with a trailing newline, because these files are read by
 * people as well as by the next command. The canonical digest is computed from
 * the value, not from this text: RFC 8785 owns the digest, and the file format
 * is free to stay readable as long as it parses back to the same value.
 */
function serialize(spec: ArtifactSpec): Buffer {
  const text = JSON.stringify(spec.value, null, 2);
  if (typeof text !== "string") {
    throw new ArtifactIntegrityError(
      `${spec.name}: the artifact value has no JSON representation and cannot be persisted.`,
    );
  }
  return Buffer.from(`${text}\n`, "utf8");
}

/**
 * Persist a set of artifacts verbatim, then prove the persisted bytes.
 *
 * The immutability check runs across the whole set before anything is written,
 * so a refusal leaves the directory exactly as it was rather than half updated.
 */
export function writeVerifiedArtifacts(
  dir: string,
  specs: readonly ArtifactSpec[],
): readonly ArtifactRecord[] {
  const prepared = specs.map((spec) => ({
    spec,
    file: path.join(dir, `${spec.name}.json`),
    bytes: serialize(spec),
    // Computed before the write: a value outside the RFC 8785 domain fails here
    // rather than becoming a file nothing can commit to.
    canonical: canonicalDigest(spec.value as never),
  }));

  for (const item of prepared) {
    if (!existsSync(item.file)) continue;
    if (!readFileSync(item.file).equals(item.bytes)) {
      throw new ArtifactImmutabilityError(
        `${item.file} already exists with different bytes.\n` +
          "Preregistration §9.1 preserves measured outputs immutably and §9.3 preserves old " +
          "runs, so this command will not write over one. Record the new work as a separate " +
          "attempt instead.",
      );
    }
  }

  mkdirSync(dir, { recursive: true });

  return prepared.map((item) => {
    const alreadyPresent = existsSync(item.file);
    if (!alreadyPresent) writeFileSync(item.file, item.bytes);

    const onDisk = readFileSync(item.file);
    if (!onDisk.equals(item.bytes)) {
      throw new ArtifactIntegrityError(
        `${item.file}: the bytes on disk are not the bytes written ` +
          `(${onDisk.length} vs ${item.bytes.length} bytes).`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(onDisk.toString("utf8"));
    } catch (error) {
      throw new ArtifactIntegrityError(
        `${item.file}: the persisted artifact does not parse as JSON (${
          error instanceof Error ? error.message : String(error)
        }).`,
      );
    }

    const reDerived = canonicalDigest(parsed as never);
    if (reDerived !== item.canonical) {
      throw new ArtifactIntegrityError(
        `${item.file}: the persisted artifact re-derives ${reDerived} but the value written ` +
          `canonicalizes to ${item.canonical}. Persistence altered the artifact.`,
      );
    }

    return {
      name: item.spec.name,
      file: item.file,
      byte_length: onDisk.length,
      file_sha256: sha256Hex(onDisk),
      canonical_digest: item.canonical,
      verified: verifyReadBack(item.file, parsed, item.spec.bindings ?? []),
      already_present: alreadyPresent,
    };
  });
}

/**
 * Read a persisted artifact and prove it before returning it.
 *
 * This is the other half of the write-time verification: an artifact corrupted
 * or edited after it was written is refused at the point it would be consumed,
 * rather than silently carried into the next stage.
 */
export function readVerifiedArtifact<T>(
  file: string,
  bindings: readonly DigestBinding[] = [],
): T {
  if (!existsSync(file)) {
    throw new ArtifactIntegrityError(`${file}: no such artifact.`);
  }
  const bytes = readFileSync(file);
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new ArtifactIntegrityError(
      `${file}: the persisted artifact does not parse as JSON (${
        error instanceof Error ? error.message : String(error)
      }).`,
    );
  }
  verifyReadBack(file, parsed, bindings);
  return parsed as T;
}

/** Every `.json` artifact under `dir`, relative to it, sorted. Empty if absent. */
export function persistedArtifactNames(dir: string): readonly string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  const walk = (current: string, prefix: string): void => {
    for (const name of readdirSync(current).sort()) {
      const full = path.join(current, name);
      if (statSync(full).isDirectory()) walk(full, path.posix.join(prefix, name));
      else if (name.endsWith(".json")) found.push(path.posix.join(prefix, name));
    }
  };
  walk(dir, "");
  return found;
}

/**
 * Refuse before a measured attempt starts if its run directory already holds
 * artifacts.
 *
 * Deliberately a preflight rather than only a write-time refusal: refusing after
 * a billable call would preserve the prior artifacts but throw away the new
 * evidence, and the protocol wants both kept.
 */
export function assertRunDirectoryUnwritten(
  dir: string,
  options: { readonly what: string; readonly remedy: string },
): void {
  const present = persistedArtifactNames(dir);
  if (present.length === 0) return;
  throw new ArtifactImmutabilityError(
    `${options.what} already exists at ${dir} and holds ${present.length} artifact(s): ` +
      `${present.join(", ")}.\n` +
      "Preregistration §9.1 preserves measured outputs immutably and §9.3 preserves old runs, " +
      "so this command will not write over them.\n" +
      options.remedy,
  );
}

/**
 * The highest attempt number this harness will address.
 *
 * Not a retry policy — the protocol, not this module, decides whether a further
 * attempt is legitimate. It is a bound on a loop and on a directory name.
 */
export const MAX_ATTEMPT = 99;

/** `<root>/<stem>-a<attempt>` — the attempt-scoped measured run directory. */
export function attemptRunDir(root: string, stem: string, attempt: number): string {
  return path.join(root, `${stem}-a${attempt}`);
}

/** The lowest attempt number whose run directory holds no artifact. */
export function firstFreeAttempt(root: string, stem: string): number {
  for (let attempt = 1; attempt <= MAX_ATTEMPT; attempt += 1) {
    if (persistedArtifactNames(attemptRunDir(root, stem, attempt)).length === 0) return attempt;
  }
  return MAX_ATTEMPT + 1;
}

/**
 * Parse `--attempt <n>`, defaulting to the first attempt.
 *
 * The operator states which attempt this is; the harness never renumbers one on
 * their behalf. Preregistration §9.1 makes a retry a fresh independent call the
 * operator records, so inferring the number would be the harness inventing the
 * retry semantics the protocol reserves.
 */
export function parseAttempt(raw: string | null): number {
  if (raw === null) return 1;
  if (!/^[1-9][0-9]*$/.test(raw)) {
    throw new Error(`--attempt must be a positive integer; received "${raw}".`);
  }
  const attempt = Number(raw);
  if (attempt > MAX_ATTEMPT) {
    throw new Error(`--attempt must be at most ${MAX_ATTEMPT}; received "${raw}".`);
  }
  return attempt;
}
