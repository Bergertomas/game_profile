import { describe, expect, it } from "vitest";
import {
  classifyAccessResponse,
  previewUrlFrom,
} from "../scripts/check-preview-access.mjs";

/**
 * A preview carrying evaluation-clearance artwork is a public display to
 * anyone holding the URL. `noindex` asks crawlers not to list the page; it
 * stops nobody. Cloudflare Access is the control, and it lives in the account's
 * Zero Trust settings rather than in this repository — so what the repository
 * owes is an honest answer to "is it on?", every deploy.
 *
 * These assert the classification, which is the part that can be wrong
 * silently. The network call around it is a single `fetch`.
 */

function response(
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(null, { status, headers });
}

describe("preview Access detection", () => {
  it("reads a redirect to the Access login as protected", () => {
    expect(
      classifyAccessResponse(
        response(302, {
          location:
            "https://example.cloudflareaccess.com/cdn-cgi/access/login/preview.workers.dev",
        }),
      ),
    ).toBe("protected");
  });

  it("does not mistake an ordinary redirect for Access", () => {
    // A trailing-slash or canonical redirect is not a login wall, and calling
    // it one would report protection that does not exist.
    expect(
      classifyAccessResponse(
        response(308, { location: "https://shouldiplay.gg/games/returnal" }),
      ),
    ).toBe("open");
  });

  it("reads a served page as unprotected", () => {
    expect(classifyAccessResponse(response(200))).toBe("open");
  });

  it("declines to guess when the host answers with an error", () => {
    expect(classifyAccessResponse(response(521))).toBe("unknown");
  });

  it("finds the preview URL in an upload transcript", () => {
    const output = [
      "Total Upload: 1234.56 KiB / gzip: 234.56 KiB",
      "Worker Version ID: 0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0",
      "Version Preview URL: https://sip-visual-1a2b3c4d5e-should-i-play.example.workers.dev",
    ].join("\n");

    expect(previewUrlFrom(output)).toBe(
      "https://sip-visual-1a2b3c4d5e-should-i-play.example.workers.dev",
    );
  });

  it("returns null rather than a wrong URL when there is none", () => {
    expect(previewUrlFrom("Total Upload: 1234.56 KiB")).toBeNull();
  });
});
