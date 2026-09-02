import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  CONTROLLED_INPUTS,
  ControlledInputDriftError,
  gitBlobSha,
  lockControlledInputs,
  verifyControlledInputs,
} from "@/lib/calibration/controlled-inputs";

/**
 * Work order §5(1) and §5(2): all six approved blob locks and SHA-256
 * generation, and controlled-byte drift failure.
 */

describe("the six Item 3 controlled inputs", () => {
  it("declares exactly the six inputs the preregistration §15 table names", () => {
    expect(CONTROLLED_INPUTS.map((input) => input.path).sort()).toEqual(
      [
        "docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md",
        "docs/Game_Profile_Scoring_Rubric_v1.0.md",
        "docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json",
        "docs/scoring/Phase_3A_Execution_System_Instructions_v1.0.md",
        "docs/scoring/Phase_3A_Research_Prompt_v1.0.md",
        "docs/scoring/Phase_3A_Scoring_Prompt_v1.0.md",
      ].sort(),
    );
    // Each role appears once, so `controlledDigest` can never be ambiguous.
    const roles = CONTROLLED_INPUTS.map((input) => input.role);
    expect(new Set(roles).size).toBe(roles.length);
  });

  it("every approved blob SHA matches the bytes on disk", () => {
    for (const lock of lockControlledInputs()) {
      expect(lock.actualBlobSha, `${lock.path} blob`).toBe(lock.approvedBlobSha);
      expect(lock.matches, `${lock.path} matches`).toBe(true);
    }
  });

  it("keeps the rubric and execution instructions at their original Item 3 identities", () => {
    // Amendment 1 (issue #44) touched four of the six controlled inputs. This
    // pins the other two to the blob SHAs recorded at the Item 3 final review,
    // so the amendment's blast-radius claim is enforced rather than asserted in
    // prose.
    const byRole = new Map(CONTROLLED_INPUTS.map((input) => [input.role, input]));
    expect(byRole.get("rubric")!.approvedBlobSha).toBe(
      "93524fd398099423e31f8b7f88c0efd7886c7b66",
    );
    expect(byRole.get("system_instructions")!.approvedBlobSha).toBe(
      "caa241d45f3c6619ae7b139cd0e135a8168ee009",
    );
  });

  it("computes lowercase SHA-256 over the exact bytes, distinct per input", () => {
    const manifest = verifyControlledInputs();
    for (const input of manifest.inputs) {
      expect(input.sha256, `${input.path} sha256`).toMatch(/^[a-f0-9]{64}$/);
    }
    const digests = manifest.inputs.map((input) => input.sha256);
    expect(new Set(digests).size).toBe(digests.length);
    // A Git blob SHA is provenance, never a substitute for the protocol digest.
    for (const input of manifest.inputs) {
      expect(input.sha256).not.toBe(input.actualBlobSha);
    }
  });

  it("emits a deterministic lock manifest", () => {
    expect(verifyControlledInputs().lock_set_digest).toBe(
      verifyControlledInputs().lock_set_digest,
    );
    expect(verifyControlledInputs().lock_set_digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("reproduces Git's own blob hash", () => {
    // `git hash-object` on an empty file is a fixed, well-known value; matching
    // it proves the header framing is right rather than merely self-consistent.
    expect(gitBlobSha(Buffer.alloc(0))).toBe("e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
    const bytes = readFileSync(CONTROLLED_INPUTS[0]!.path);
    expect(gitBlobSha(bytes)).toBe(CONTROLLED_INPUTS[0]!.approvedBlobSha);
  });
});

describe("controlled-byte drift fails closed", () => {
  it("throws when a controlled file's bytes no longer match its approval", () => {
    // A real file with a real, wrong expectation: the verifier must reject it
    // rather than regenerate its own expectation from the working tree.
    const drifted = [
      { ...CONTROLLED_INPUTS[0]!, approvedBlobSha: "f".repeat(40) },
    ];
    expect(() => verifyControlledInputs(drifted)).toThrow(ControlledInputDriftError);
    expect(() => verifyControlledInputs(drifted)).toThrow(/byte freeze is not intact/);
  });

  it("names every drifted input, not just the first", () => {
    const drifted = CONTROLLED_INPUTS.slice(0, 3).map((input) => ({
      ...input,
      approvedBlobSha: "0".repeat(40),
    }));
    try {
      verifyControlledInputs(drifted);
      expect.unreachable("drift must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ControlledInputDriftError);
      expect((error as ControlledInputDriftError).drifted).toHaveLength(3);
    }
  });

  it("detects a single changed byte", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "calib-drift-"));
    const file = path.join(dir, "controlled.md");
    writeFileSync(file, "approved bytes\n");
    const before = gitBlobSha(readFileSync(file));
    writeFileSync(file, "approved bytes.\n");
    expect(gitBlobSha(readFileSync(file))).not.toBe(before);
  });

  it("never rewrites a controlled file", () => {
    const before = CONTROLLED_INPUTS.map((input) => readFileSync(input.path));
    verifyControlledInputs();
    const after = CONTROLLED_INPUTS.map((input) => readFileSync(input.path));
    before.forEach((bytes, index) => expect(after[index]!.equals(bytes)).toBe(true));
  });
});
