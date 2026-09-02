import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * The six Item 3-approved controlled inputs, and the lock over their exact
 * bytes.
 *
 * Preregistration §15 records a Git blob SHA per input as PROVENANCE, and Item 4
 * must additionally compute the protocol-required lowercase SHA-256 over the
 * same bytes: "A Git blob SHA is provenance, not a substitute for
 * protocol-required SHA-256" (readiness audit §5). Both are verified here, from
 * the repository bytes only — never from a chat attachment or a reconstructed
 * copy — and the module never writes to a controlled file.
 *
 * The blob SHAs below are transcribed from the preregistration's §15 table and
 * are authoritative. They are NOT regenerated from the working tree: a verifier
 * that recomputes its own expectation cannot detect the drift it exists to
 * catch.
 *
 * Four of the six were re-approved on 2026-09-02 under the bounded Item 3
 * controlled-freeze amendment for issue #44 (machine-reproducible coverage
 * state). The rubric and the execution system instructions were untouched by
 * that amendment and keep their original Item 3 identities.
 */

/** Repository root, resolved from this file rather than from `process.cwd()`. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export interface ControlledInput {
  /** Repository-relative path. */
  readonly path: string;
  /** The role this input plays in a scoring request. */
  readonly role:
    | "system_instructions"
    | "research_prompt"
    | "scoring_prompt"
    | "rubric"
    | "protocol"
    | "output_schema";
  /** Git blob SHA recorded at the Item 3 final review (preregistration §15). */
  readonly approvedBlobSha: string;
}

export const CONTROLLED_INPUTS: readonly ControlledInput[] = [
  {
    path: "docs/scoring/Phase_3A_Execution_System_Instructions_v1.0.md",
    role: "system_instructions",
    approvedBlobSha: "caa241d45f3c6619ae7b139cd0e135a8168ee009",
  },
  {
    path: "docs/scoring/Phase_3A_Research_Prompt_v1.0.md",
    role: "research_prompt",
    approvedBlobSha: "dcb5f2c580a447ac2565641342325dc33ed6092d",
  },
  {
    path: "docs/scoring/Phase_3A_Scoring_Prompt_v1.0.md",
    role: "scoring_prompt",
    approvedBlobSha: "3d6da870cbf2c0d918c0b592d02a6cbfada9bc16",
  },
  {
    path: "docs/Game_Profile_Scoring_Rubric_v1.0.md",
    role: "rubric",
    approvedBlobSha: "93524fd398099423e31f8b7f88c0efd7886c7b66",
  },
  {
    path: "docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md",
    role: "protocol",
    approvedBlobSha: "1e678bb9d1ac68998fcc1826e2b5ac9f33778a11",
  },
  {
    path: "docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json",
    role: "output_schema",
    approvedBlobSha: "2a766c042c085d67eb25f1cd7f6df5c45e693796",
  },
] as const;

export interface ControlledInputLock {
  readonly path: string;
  readonly role: ControlledInput["role"];
  /** Blob SHA recorded at Item 3. */
  readonly approvedBlobSha: string;
  /** Blob SHA computed over the bytes actually on disk. */
  readonly actualBlobSha: string;
  /** Lowercase SHA-256 over the exact bytes — what run manifests record. */
  readonly sha256: string;
  readonly byteLength: number;
  readonly matches: boolean;
}

export interface LockManifest {
  readonly manifest_version: "1.0";
  readonly inputs: readonly ControlledInputLock[];
  /**
   * One digest over the whole lock set, so a run manifest can name the entire
   * controlled corpus with a single value. Deliberately computed over a
   * fixed-order, fixed-field rendering rather than over a JSON object, so it
   * cannot drift with key ordering.
   */
  readonly lock_set_digest: string;
}

/**
 * Git's blob object hash: `sha1("blob " + byteLength + "\0" + bytes)`.
 *
 * Recomputed here rather than shelled out to `git hash-object` so the verifier
 * works in a build/CI context with no git binary and no working tree, and so
 * the comparison is over file bytes rather than over whatever the index holds.
 */
export function gitBlobSha(bytes: Buffer): string {
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}

function readControlledBytes(input: ControlledInput): Buffer {
  return readFileSync(path.join(REPO_ROOT, input.path));
}

/** Lock one controlled input, reporting both identities without judging them. */
export function lockControlledInput(input: ControlledInput): ControlledInputLock {
  const bytes = readControlledBytes(input);
  const actualBlobSha = gitBlobSha(bytes);
  return {
    path: input.path,
    role: input.role,
    approvedBlobSha: input.approvedBlobSha,
    actualBlobSha,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byteLength: bytes.length,
    matches: actualBlobSha === input.approvedBlobSha,
  };
}

/** Lock every controlled input. Reports drift; does not throw. */
export function lockControlledInputs(
  inputs: readonly ControlledInput[] = CONTROLLED_INPUTS,
): readonly ControlledInputLock[] {
  return inputs.map(lockControlledInput);
}

function lockSetDigest(locks: readonly ControlledInputLock[]): string {
  const hash = createHash("sha256");
  // Sorted by path so the digest is a property of the set, not of array order.
  for (const lock of [...locks].sort((a, b) => (a.path < b.path ? -1 : 1))) {
    hash.update(`${lock.path}\n${lock.sha256}\n${lock.actualBlobSha}\n`);
  }
  return hash.digest("hex");
}

/** Raised when controlled bytes no longer match their Item 3 approval. */
export class ControlledInputDriftError extends Error {
  constructor(readonly drifted: readonly ControlledInputLock[]) {
    super(
      "Controlled-input lock failed; the Item 3 byte freeze is not intact:\n" +
        drifted
          .map(
            (d) =>
              `  ${d.path}\n    approved blob ${d.approvedBlobSha}\n    actual   blob ${d.actualBlobSha}`,
          )
          .join("\n"),
    );
    this.name = "ControlledInputDriftError";
  }
}

/**
 * Verify every controlled input and emit the deterministic lock manifest.
 *
 * Fails closed: any byte or blob mismatch throws, because a drifted controlled
 * input invalidates the Item 3 freeze until the preregistration is amended and
 * re-approved (preregistration §15), and that is an owner decision rather than
 * an engineering one.
 */
export function verifyControlledInputs(
  inputs: readonly ControlledInput[] = CONTROLLED_INPUTS,
): LockManifest {
  const locks = lockControlledInputs(inputs);
  const drifted = locks.filter((lock) => !lock.matches);
  if (drifted.length > 0) throw new ControlledInputDriftError(drifted);
  return {
    manifest_version: "1.0",
    inputs: locks,
    lock_set_digest: lockSetDigest(locks),
  };
}

/** The verified SHA-256 for one role, for a run manifest field. */
export function controlledDigest(
  manifest: LockManifest,
  role: ControlledInput["role"],
): string {
  const lock = manifest.inputs.find((input) => input.role === role);
  if (!lock) throw new Error(`No controlled input locked for role "${role}".`);
  return lock.sha256;
}

/** The exact approved bytes for one role, as text, for request construction. */
export function controlledText(role: ControlledInput["role"]): string {
  const input = CONTROLLED_INPUTS.find((candidate) => candidate.role === role);
  if (!input) throw new Error(`No controlled input declared for role "${role}".`);
  return readControlledBytes(input).toString("utf8");
}
