import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { directTlsOptions } from "@/lib/admin/db";

/**
 * The direct editorial connection verifies the server's certificate.
 *
 * ── The defect ─────────────────────────────────────────────────────────────
 *
 * The direct path passed `ssl: "require"` unconditionally. In postgres.js that
 * string means "negotiate TLS and then do not check who answered" — it sets
 * `rejectUnauthorized = false` — which is the libpq meaning of
 * `sslmode=require` and is not the same thing as a verified connection. The
 * editorial database holds every unpublished draft in the product.
 *
 * Hyperdrive is the deployed transport (ADR 0021) and terminates TLS itself, so
 * the exposure was local development and the direct remote fallback that a
 * Hyperdrive outage would put back into use.
 */

describe("postgres.js, as actually installed", () => {
  /**
   * Pinned against the driver's own source, because the fix depends on what it
   * does rather than on what its documentation says. If a future upgrade
   * changes either branch, this fails and the decision gets re-made instead of
   * silently inverting.
   */
  const source = readFileSync(
    "node_modules/postgres/src/connection.js",
    "utf8",
  );

  it("turns verification OFF for the string 'require'", () => {
    expect(source).toContain(
      "if (ssl === 'require' || ssl === 'allow' || ssl === 'prefer')",
    );
    expect(source).toMatch(
      /if \(ssl === 'require'[^\n]*\n\s*options\.rejectUnauthorized = false/,
    );
  });

  it("passes an object through, which is the supported way to verify", () => {
    expect(source).toMatch(
      /else if \(typeof ssl === 'object'\)\s*\n\s*Object\.assign\(options, ssl\)/,
    );
  });

  /**
   * `verify-full` matches neither branch, so it would reach `tls.connect` with
   * Node's defaults and verify by accident. Correct outcome, unsupported route
   * — this records why it is not what the code uses.
   */
  it("does not parse 'verify-full' as a mode of its own", () => {
    expect(source).not.toContain("'verify-full'");
  });
});

describe("What the admin connection asks for", () => {
  it("verifies the certificate on a direct remote connection", () => {
    expect(
      directTlsOptions({
        url: "postgres://user:pw@ep-x.eu-central-1.aws.neon.tech/game_profile",
        viaHyperdrive: false,
      }),
    ).toEqual({ ssl: { rejectUnauthorized: true } });
  });

  it("never sends the mode that disables verification", () => {
    const options = directTlsOptions({
      url: "postgres://user:pw@host/db",
      viaHyperdrive: false,
    });
    expect(options.ssl).not.toBe("require");
    expect(JSON.stringify(options)).not.toContain("require");
    expect(options.ssl?.rejectUnauthorized).toBe(true);
  });

  /**
   * Hyperdrive owns the credentials and terminates the transport outside the
   * Worker, so the Worker passes no TLS options at all.
   */
  it("passes nothing through Hyperdrive", () => {
    expect(
      directTlsOptions({ url: "postgres://hyperdrive/local", viaHyperdrive: true }),
    ).toEqual({});
  });

  /**
   * The explicit, documented local opt-out. Verification is never dropped
   * silently: a developer running a Postgres that speaks no TLS says so in the
   * connection string, in the standard libpq spelling.
   */
  it("honours an explicit sslmode=disable in the URL", () => {
    for (const url of [
      "postgres://root:root@127.0.0.1:5432/game_profile_test?sslmode=disable",
      "postgres://root:root@127.0.0.1:5432/db?application_name=x&sslmode=disable",
      "postgres://root:root@127.0.0.1:5432/db?sslmode=disable&application_name=x",
    ]) {
      expect(directTlsOptions({ url, viaHyperdrive: false })).toEqual({});
    }
  });

  it("does not treat any other sslmode as an opt-out", () => {
    for (const url of [
      "postgres://h/db?sslmode=require",
      "postgres://h/db?sslmode=prefer",
      "postgres://h/db?sslmode=verify-full",
      "postgres://h/db?sslmode=disabled",
      "postgres://h/db?notsslmode=disable",
    ]) {
      expect(
        directTlsOptions({ url, viaHyperdrive: false }).ssl?.rejectUnauthorized,
      ).toBe(true);
    }
  });
});
