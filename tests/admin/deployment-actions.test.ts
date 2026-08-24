import { beforeEach, describe, expect, it, vi } from "vitest";
import { actionFeedback } from "@/lib/admin/errors";

/**
 * The Server Action boundary, where a client-supplied argument arrives.
 *
 * ── Why a mocked module graph, unusually for this repository ───────────────
 *
 * The thing under test is what happens BEFORE anything is written: a rejected
 * reason must not open a database, must not create a request row, and must not
 * reach Cloudflare. Proving a negative about writes means being able to see
 * that the writers were never called, which is what these stubs are for. Every
 * other deployment test in the repository asserts on real Postgres, and still
 * should — this one asserts on an absence.
 *
 * ── What the defect was ────────────────────────────────────────────────────
 *
 * `requestDeploymentAction(reason: "manual" | "retry")` is a POST endpoint
 * whose arguments are deserialized from the request body. The annotation is
 * erased at compile time, so `"publication"` could be sent instead — and
 * `dispatchDeployment` treats `publication` as the path that is never refused
 * for having another request open and coalesces only on a triggering
 * evaluation, which the forged call does not send. A single forged value
 * therefore walked past the guard that stops a person queueing production build
 * after production build while one is already in flight.
 */

const dispatchDeployment = vi.fn();
const requireEditor = vi.fn();
const withAuthorizedAdminDatabase = vi.fn();
const verifyProduction = vi.fn();
const refreshBuildStatuses = vi.fn();

vi.mock("@/lib/admin/guard", () => ({
  requireEditor: () => requireEditor(),
}));

vi.mock("@/lib/admin/db", () => ({
  withAuthorizedAdminDatabase: (run: (db: unknown) => Promise<unknown>) =>
    withAuthorizedAdminDatabase(run),
}));

vi.mock("@/lib/admin/deployments", () => ({
  dispatchDeployment: (...args: unknown[]) => dispatchDeployment(...args),
  refreshBuildStatuses: (...args: unknown[]) => refreshBuildStatuses(...args),
  settleDeploymentRequest: vi.fn(),
  verifyProduction: (...args: unknown[]) => verifyProduction(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/deploy/transport", () => ({
  liveTransport: {
    fetch: () => {
      throw new Error("a test reached the live transport");
    },
  },
}));

const { checkDeploymentAction, requestDeploymentAction } = await import(
  "@/app/admin/deployment-actions"
);

beforeEach(() => {
  vi.clearAllMocks();
  requireEditor.mockResolvedValue({ email: "editor@example.com" });
  withAuthorizedAdminDatabase.mockImplementation(
    (run: (db: unknown) => Promise<unknown>) => run({}),
  );
  dispatchDeployment.mockResolvedValue({
    kind: "dispatched",
    requestId: "r-1",
    buildId: "b-1",
  });
  refreshBuildStatuses.mockResolvedValue(undefined);
  verifyProduction.mockResolvedValue({
    kind: "verified",
    artifactId: "a-1",
    manifest: {
      commitSha: "0a604d1ae7f03585879207743f6e099c88e41def",
      entries: [{}, {}, {}],
    },
  });
});

describe("The reason a person gives for a build is parsed, not trusted", () => {
  for (const forged of [
    "publication",
    "PUBLICATION",
    "",
    "manual ",
    "retry;publication",
    "__proto__",
  ]) {
    it(`refuses ${JSON.stringify(forged)} without writing anything`, async () => {
      const result = await requestDeploymentAction(
        forged as "manual" | "retry",
      );

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.message).toMatch(
        /not a reason a person can give/,
      );

      // The three things that must not have happened.
      expect(dispatchDeployment).not.toHaveBeenCalled();
      expect(withAuthorizedAdminDatabase).not.toHaveBeenCalled();
    });
  }

  for (const forged of [null, undefined, 42, { reason: "manual" }, ["manual"]]) {
    it(`refuses the non-string ${JSON.stringify(forged) ?? "undefined"}`, async () => {
      const result = await requestDeploymentAction(
        forged as unknown as "manual" | "retry",
      );

      expect(result.ok).toBe(false);
      expect(dispatchDeployment).not.toHaveBeenCalled();
      expect(withAuthorizedAdminDatabase).not.toHaveBeenCalled();
    });
  }

  for (const allowed of ["manual", "retry"] as const) {
    it(`passes ${allowed} through unchanged`, async () => {
      const result = await requestDeploymentAction(allowed);

      expect(result.ok).toBe(true);
      expect(dispatchDeployment).toHaveBeenCalledTimes(1);
      expect(dispatchDeployment.mock.calls[0]![1]).toMatchObject({
        reason: allowed,
        actor: "editor@example.com",
      });
    });
  }

  /**
   * Authorisation still comes first. A forged reason from someone who is not an
   * editor must fail on the guard, not on the parse — otherwise this validation
   * would have quietly become the outer gate.
   */
  it("still requires an editor before it looks at the reason", async () => {
    requireEditor.mockRejectedValue(new Error("not an editor"));

    await expect(
      requestDeploymentAction("publication" as "manual" | "retry"),
    ).rejects.toThrow(/not an editor/);
  });
});

/**
 * What the editor is told after pressing "Check production now".
 *
 * ── The defect ─────────────────────────────────────────────────────────────
 *
 * `verifyProduction` does not throw when production cannot be verified, and
 * that is correct: an unverifiable origin is a state of the world, not a fault,
 * and it must be recorded rather than raised. But the action discarded the
 * result, `reportingFailures` returns `{ ok: true }` for anything that did not
 * throw, and the generic button renders "Done." for `ok: true`.
 *
 * So the first real production check refused to establish anything, wrote a
 * truthful `production_unverifiable` event, left every profile NOT PROVEN — and
 * said "Done." Nothing lied; the audit trail and the proof panel were both
 * correct. But "Done." is the only immediate feedback at the point of action,
 * and this system's whole discipline is refusing to let *finished* read as
 * *succeeded*.
 */
describe("Check production now reports what it found", () => {
  it("does not render generic success when production is unverifiable", async () => {
    verifyProduction.mockResolvedValue({
      kind: "unverifiable",
      detail:
        "https://shouldiplay.gg/deployment-manifest answered 522. Nothing can " +
        "be concluded about what production serves.",
    });

    const result = await checkDeploymentAction();

    // The regression, stated directly: whatever the editor sees, it is not the
    // generic acknowledgement.
    expect(actionFeedback(result).text).not.toBe("Done.");
    expect(actionFeedback(result).tone).toBe("failed");

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toMatch(/nothing is Live/i);
    // The reason has to survive to the editor, or the refusal is unactionable.
    expect(result.ok === false && result.message).toMatch(/522/);
  });

  it("reports the verified artifact rather than a bare acknowledgement", async () => {
    const result = await checkDeploymentAction();

    expect(result.ok).toBe(true);
    expect(actionFeedback(result).tone).toBe("ok");
    expect(actionFeedback(result).text).not.toBe("Done.");
    expect(actionFeedback(result).text).toMatch(/verified/i);
    // Three entries in the stub manifest, and the short commit that served them.
    expect(actionFeedback(result).text).toMatch(/3 published profiles/);
    expect(actionFeedback(result).text).toMatch(/0a604d1/);
  });

  /**
   * A build with no Workers Builds commit is a legitimate artifact — a laptop
   * deploy — and must not make the success message read as a template that
   * failed to fill in.
   */
  it("still reports a verified artifact that carries no commit", async () => {
    verifyProduction.mockResolvedValue({
      kind: "verified",
      artifactId: "a-1",
      manifest: { commitSha: null, entries: [{}] },
    });

    const result = await checkDeploymentAction();

    expect(result.ok).toBe(true);
    expect(actionFeedback(result).text).toMatch(/1 published profile\b/);
    expect(actionFeedback(result).text).not.toMatch(/null|undefined/);
  });

  /**
   * An unverifiable production is not an exception, and must not start being
   * one: the event is already written by the time this returns, and a throw
   * here would surface a database-failure page for a healthy refusal.
   */
  it("treats unverifiable as a reported outcome, never a thrown error", async () => {
    verifyProduction.mockResolvedValue({ kind: "unverifiable", detail: "nope" });

    await expect(checkDeploymentAction()).resolves.toBeDefined();
    // It still reconciled the outstanding requests; the check is one action.
    expect(refreshBuildStatuses).toHaveBeenCalledTimes(1);
  });

  /**
   * A real operational fault is a different thing from an unverifiable
   * production, and the two must not be reported as one. `reportingFailures`
   * still owns both of its existing outcomes.
   */
  it("keeps the existing error path for a recognised database refusal", async () => {
    verifyProduction.mockRejectedValue(
      Object.assign(new Error("could not serialize access"), { code: "40001" }),
    );

    const result = await checkDeploymentAction();

    expect(result.ok).toBe(false);
    // The database's own sentence, not the verification refusal's — this never
    // got as far as asking production anything.
    expect(result.ok === false && result.message).toMatch(/try publishing again/i);
    expect(result.ok === false && result.message).not.toMatch(/nothing is Live/i);
  });

  /**
   * And an unrecognised fault still becomes an error rather than being smoothed
   * into a plausible-sounding refusal. Reporting "production could not be
   * verified" for a Worker that crashed would be a confident false negative.
   */
  it("still throws an unrecognised fault instead of reporting it as a refusal", async () => {
    verifyProduction.mockRejectedValue(new Error("the Worker fell over"));

    await expect(checkDeploymentAction()).rejects.toThrow(/fell over/);
  });

  it("still requires an editor before it checks anything", async () => {
    requireEditor.mockRejectedValue(new Error("not an editor"));

    await expect(checkDeploymentAction()).rejects.toThrow(/not an editor/);
    expect(verifyProduction).not.toHaveBeenCalled();
  });
});

/**
 * The rendering rule itself, since the regression was in what reached the page
 * rather than in what the action computed.
 */
describe("actionFeedback", () => {
  it("shows the generic acknowledgement only when an action supplies no text", () => {
    expect(actionFeedback({ ok: true })).toEqual({ tone: "ok", text: "Done." });
  });

  it("never shows the generic acknowledgement for a refusal", () => {
    expect(actionFeedback({ ok: false, message: "Refused." })).toEqual({
      tone: "failed",
      text: "Refused.",
    });
  });

  it("prefers an action's own account of what it established", () => {
    expect(actionFeedback({ ok: true, message: "Production verified." })).toEqual(
      { tone: "ok", text: "Production verified." },
    );
  });
});
