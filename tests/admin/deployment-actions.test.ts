import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/admin/guard", () => ({
  requireEditor: () => requireEditor(),
}));

vi.mock("@/lib/admin/db", () => ({
  withAuthorizedAdminDatabase: (run: (db: unknown) => Promise<unknown>) =>
    withAuthorizedAdminDatabase(run),
}));

vi.mock("@/lib/admin/deployments", () => ({
  dispatchDeployment: (...args: unknown[]) => dispatchDeployment(...args),
  refreshBuildStatuses: vi.fn(),
  settleDeploymentRequest: vi.fn(),
  verifyProduction: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/deploy/transport", () => ({
  liveTransport: {
    fetch: () => {
      throw new Error("a test reached the live transport");
    },
  },
}));

const { requestDeploymentAction } = await import(
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
