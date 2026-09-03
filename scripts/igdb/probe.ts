/**
 * `npm run igdb:probe -- --live` — the manual, credential-safe IGDB readiness probe.
 *
 * Reports SAFE STATUS ONLY (issue #48 §5):
 *
 *   credentials_present   both a Client ID and a secret-or-token are set
 *   auth_ok               the Twitch client-credentials token request succeeded
 *                         (or a pre-issued token was accepted by the API)
 *   igdb_request_ok       one tiny IGDB request succeeded (`game_types/count`)
 *   dump_entitlement_ok   `GET /v4/dumps` answered 200 (Data Partner access)
 *
 * plus HTTP statuses, timings, the `game_types` count and token expiry seconds.
 * It never prints, stores or serialises the Client ID, Client Secret, access
 * token, an Authorization header or a credential-bearing URL: credentials are
 * read by name in one place, sent in a form body and a header the client
 * builds, and every printed string passes through redaction.
 *
 * Built so it cannot run by accident: it refuses without `--live`, refuses
 * under a CI environment variable, and touches no game record — the one data
 * request counts the `game_types` reference table.
 */
import { createIgdbClient, readIgdbCredentials } from "@/lib/igdb/client";
import { IGDB_API_BASE, IGDB_ENV, TWITCH_TOKEN_URL } from "@/lib/igdb/contract";
import { redactIgdb } from "@/lib/igdb/redact";

interface ProbeReport {
  readonly credentials_present: boolean;
  readonly missing_variables: readonly string[];
  readonly uses_pre_issued_token: boolean;
  readonly auth_ok: boolean | null;
  readonly auth_http_status: number | null;
  readonly auth_elapsed_ms: number | null;
  readonly token_expires_in_seconds: number | null;
  readonly igdb_request_ok: boolean | null;
  readonly igdb_http_status: number | null;
  readonly igdb_elapsed_ms: number | null;
  readonly game_types_count: number | null;
  readonly dump_entitlement_ok: boolean | null;
  readonly dump_http_status: number | null;
  readonly dump_elapsed_ms: number | null;
  readonly dump_endpoints_listed: number | null;
  readonly errors: readonly string[];
}

function isCiEnvironment(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.CI || env.GITHUB_ACTIONS || env.BUILDKITE || env.CF_PAGES);
}

function print(report: ProbeReport, asJson: boolean): void {
  const safe = JSON.parse(redactIgdb(JSON.stringify(report))) as ProbeReport;
  if (asJson) {
    console.log(JSON.stringify(safe, null, 2));
    return;
  }
  console.log("IGDB readiness probe\n");
  for (const [key, value] of Object.entries(safe)) {
    const shown = Array.isArray(value) ? (value.length ? value.join("; ") : "none") : String(value);
    console.log(`  ${key.padEnd(26)} ${shown}`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const live = argv.includes("--live");
  const asJson = argv.includes("--json");
  const readout = readIgdbCredentials(process.env);

  if (!live) {
    console.log(
      "IGDB readiness probe — DRY RUN.\n\n" +
        "This command makes live requests to Twitch and IGDB and is opt-in. Re-run\n" +
        `with --live once ${IGDB_ENV.clientId} and ${IGDB_ENV.clientSecret} (or\n` +
        `${IGDB_ENV.accessToken}) are set in the environment.\n\n` +
        "It would make, in order:\n" +
        `  1. POST ${TWITCH_TOKEN_URL} (form body; skipped if a pre-issued token is set)\n` +
        `  2. POST ${IGDB_API_BASE}/game_types/count\n` +
        `  3. GET  ${IGDB_API_BASE}/dumps\n\n` +
        `Credentials present now: ${readout.present ? "yes" : "no"}` +
        (readout.missing.length ? ` (missing: ${readout.missing.join(", ")})` : "") +
        "\nNo game record is requested. Nothing is written anywhere.\n",
    );
    return;
  }

  if (isCiEnvironment(process.env)) {
    console.error(
      "Refusing to run: a CI environment was detected. CI never makes live IGDB\n" +
        "calls (issue #48 §5).",
    );
    process.exitCode = 1;
    return;
  }

  const errors: string[] = [];
  let report: ProbeReport = {
    credentials_present: readout.present,
    missing_variables: readout.missing,
    uses_pre_issued_token: readout.usesPreIssuedToken,
    auth_ok: null,
    auth_http_status: null,
    auth_elapsed_ms: null,
    token_expires_in_seconds: null,
    igdb_request_ok: null,
    igdb_http_status: null,
    igdb_elapsed_ms: null,
    game_types_count: null,
    dump_entitlement_ok: null,
    dump_http_status: null,
    dump_elapsed_ms: null,
    dump_endpoints_listed: null,
    errors,
  };

  if (!readout.present || !readout.credentials) {
    print({ ...report, auth_ok: false, igdb_request_ok: false, dump_entitlement_ok: false }, asJson);
    process.exitCode = 1;
    return;
  }

  const client = createIgdbClient({ credentials: readout.credentials });

  const token = await client.ensureToken();
  if (token.error) errors.push(`auth: ${token.error}`);
  report = {
    ...report,
    auth_ok: token.ok,
    auth_http_status: token.status,
    auth_elapsed_ms: token.elapsedMs,
    token_expires_in_seconds: token.expiresInSeconds,
  };

  if (token.ok) {
    const count = await client.count("game_types");
    if (count.error) errors.push(`igdb: ${count.error}`);
    // A pre-issued token proves itself only by being accepted by the API.
    const authOk = token.preIssued ? count.status !== 401 : token.ok;
    report = {
      ...report,
      auth_ok: authOk,
      igdb_request_ok: count.ok,
      igdb_http_status: count.status,
      igdb_elapsed_ms: count.elapsedMs,
      game_types_count: count.data,
    };

    const dumps = await client.listDumps();
    if (dumps.error) errors.push(`dumps: ${dumps.error}`);
    report = {
      ...report,
      // 200 is entitlement; 401/403 is a clear no; anything else is unknown.
      dump_entitlement_ok: dumps.ok ? true : dumps.status === 401 || dumps.status === 403 ? false : null,
      dump_http_status: dumps.status,
      dump_elapsed_ms: dumps.elapsedMs,
      dump_endpoints_listed: dumps.data?.length ?? null,
    };
  } else {
    report = { ...report, igdb_request_ok: false, dump_entitlement_ok: null };
  }

  print(report, asJson);
  if (!report.auth_ok || !report.igdb_request_ok) process.exitCode = 1;
}

void main();
