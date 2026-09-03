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
 *
 * Two further opt-in proofs make the readiness record's "unverified live"
 * items mechanically runnable by whoever holds the credentials:
 *
 *   --field-contract <igdb_id>   run the exact `IGDB_GAME_FIELDS` query for one
 *                                NON-cohort record, parse it with the production
 *                                parser, and report structural facts only:
 *                                whether the provider accepted the nested field
 *                                list, which children (if any) came back
 *                                unexpanded, counts, identity class, flags. The
 *                                record's name is checked against the cohort and
 *                                holdout titles and the probe aborts on a match.
 *   --dump-sample [endpoint]     describe one dump (default `game_types`),
 *                                download it once with a size cap, parse it
 *                                through the production dump/CSV path, and
 *                                report schema version, columns, types, rows
 *                                and the array/timestamp encodings observed.
 *                                The presigned download URL is never printed.
 *
 * It never prints, stores or serialises the Client ID, Client Secret, access
 * token, an Authorization header, a credential-bearing URL or a presigned
 * download URL: credentials are read by name in one place, sent in a form body
 * and a header the client builds, and every printed string passes through
 * redaction. It refuses without `--live`, refuses under a CI environment
 * variable, and stages nothing anywhere.
 */
import { createIgdbClient, readIgdbCredentials, type IgdbClient } from "@/lib/igdb/client";
import { isProtectedTitle } from "@/lib/igdb/cohort-guard";
import { IGDB_API_BASE, IGDB_ENV, TWITCH_TOKEN_URL, gamesByIdQuery } from "@/lib/igdb/contract";
import { parseDumpCsv } from "@/lib/igdb/dump";
import { normalizeGames } from "@/lib/igdb/normalize";
import { parseApiGames } from "@/lib/igdb/record";
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

interface FieldContractReport {
  readonly igdb_id: number;
  readonly request_ok: boolean;
  readonly http_status: number | null;
  readonly elapsed_ms: number | null;
  readonly records_returned: number | null;
  readonly parser_ok: boolean | null;
  readonly unexpanded_fields: readonly string[];
  readonly checksum_present: boolean | null;
  readonly updated_at_present: boolean | null;
  readonly game_type_name_resolved: boolean | null;
  readonly game_status_name_resolved: boolean | null;
  readonly identity_class: string | null;
  readonly relation_counts: Readonly<Record<string, number>>;
  readonly release_dates: number | null;
  readonly platform_names_resolved: boolean | null;
  readonly artwork_candidates: number | null;
  readonly involved_companies: number | null;
  readonly alternative_names: number | null;
  readonly external_games: number | null;
  readonly flags: readonly string[];
  readonly error: string | null;
}

interface DumpSampleReport {
  readonly endpoint: string;
  readonly describe_ok: boolean;
  readonly http_status: number | null;
  readonly file_name: string | null;
  readonly schema_version: string | null;
  readonly size_bytes: number | null;
  readonly updated_at: number | null;
  readonly schema_columns: number | null;
  readonly schema_types: readonly string[];
  readonly download_ok: boolean | null;
  readonly download_http_status: number | null;
  readonly bytes_read: number | null;
  readonly rows_parsed: number | null;
  readonly csv_columns: readonly string[];
  readonly array_encoding_observed: "braces" | "brackets" | "none" | null;
  readonly timestamp_encoding_observed: "unix" | "iso" | "none" | null;
  readonly error: string | null;
}

/** A reference dump is small; anything larger needs an explicit cap. */
const DEFAULT_DUMP_MAX_BYTES = 25 * 1024 * 1024;

function isCiEnvironment(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.CI || env.GITHUB_ACTIONS || env.BUILDKITE || env.CF_PAGES);
}

function printReport(title: string, report: object, asJson: boolean): void {
  const safe = JSON.parse(redactIgdb(JSON.stringify(report))) as Record<string, unknown>;
  if (asJson) {
    console.log(JSON.stringify({ [title]: safe }, null, 2));
    return;
  }
  console.log(`${title}\n`);
  for (const [key, value] of Object.entries(safe)) {
    const shown = Array.isArray(value)
      ? value.length
        ? value.join("; ")
        : "none"
      : value !== null && typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
    console.log(`  ${key.padEnd(28)} ${shown}`);
  }
  console.log();
}

function flag(argv: readonly string[], name: string): string | null {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  const value = argv[index + 1];
  return value && !value.startsWith("--") ? value : "";
}

async function readinessProbe(client: IgdbClient, base: ProbeReport): Promise<ProbeReport> {
  const errors: string[] = [];
  let report: ProbeReport = { ...base, errors };
  const token = await client.ensureToken();
  if (token.error) errors.push(`auth: ${token.error}`);
  report = {
    ...report,
    auth_ok: token.ok,
    auth_http_status: token.status,
    auth_elapsed_ms: token.elapsedMs,
    token_expires_in_seconds: token.expiresInSeconds,
  };
  if (!token.ok) return { ...report, igdb_request_ok: false, dump_entitlement_ok: null };

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
  return {
    ...report,
    // 200 is entitlement; 401/403 is a clear no; anything else is unknown.
    dump_entitlement_ok: dumps.ok ? true : dumps.status === 401 || dumps.status === 403 ? false : null,
    dump_http_status: dumps.status,
    dump_elapsed_ms: dumps.elapsedMs,
    dump_endpoints_listed: dumps.data?.length ?? null,
  };
}

async function fieldContractProbe(client: IgdbClient, igdbId: number): Promise<FieldContractReport> {
  const empty: FieldContractReport = {
    igdb_id: igdbId,
    request_ok: false,
    http_status: null,
    elapsed_ms: null,
    records_returned: null,
    parser_ok: null,
    unexpanded_fields: [],
    checksum_present: null,
    updated_at_present: null,
    game_type_name_resolved: null,
    game_status_name_resolved: null,
    identity_class: null,
    relation_counts: {},
    release_dates: null,
    platform_names_resolved: null,
    artwork_candidates: null,
    involved_companies: null,
    alternative_names: null,
    external_games: null,
    flags: [],
    error: null,
  };
  const result = await client.query<unknown>("games", gamesByIdQuery([igdbId]));
  if (!result.ok) {
    return { ...empty, http_status: result.status, elapsed_ms: result.elapsedMs, error: result.error };
  }
  let parsed;
  try {
    parsed = parseApiGames(result.data);
  } catch (error) {
    return {
      ...empty,
      request_ok: true,
      http_status: result.status,
      elapsed_ms: result.elapsedMs,
      records_returned: Array.isArray(result.data) ? result.data.length : null,
      parser_ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const record = parsed.records[0];
  if (!record) {
    return { ...empty, request_ok: true, http_status: result.status, elapsed_ms: result.elapsedMs, records_returned: 0, parser_ok: true, error: "No record with that id." };
  }
  // The contract proof is made against a NON-cohort record. A match aborts
  // before anything about the record is printed.
  if (isProtectedTitle(record.name) || record.alternative_names.some((an) => isProtectedTitle(an.name))) {
    return {
      ...empty,
      request_ok: true,
      http_status: result.status,
      elapsed_ms: result.elapsedMs,
      records_returned: parsed.records.length,
      error: "Refusing: the record matches a calibration or holdout title. Use a non-cohort id (issue #48 §6).",
    };
  }
  const staging = normalizeGames([record]);
  const game = staging.games[0]!;
  const relationCounts: Record<string, number> = {};
  for (const relation of staging.relations) relationCounts[relation.kind] = (relationCounts[relation.kind] ?? 0) + 1;
  return {
    igdb_id: igdbId,
    request_ok: true,
    http_status: result.status,
    elapsed_ms: result.elapsedMs,
    records_returned: parsed.records.length,
    parser_ok: true,
    unexpanded_fields: parsed.unexpanded,
    checksum_present: record.checksum !== null,
    updated_at_present: record.updated_at !== null,
    game_type_name_resolved: record.game_type?.name !== null && record.game_type !== null,
    game_status_name_resolved: record.game_status === null ? null : record.game_status.name !== null,
    identity_class: game.identityClass,
    relation_counts: relationCounts,
    release_dates: staging.releaseDates.length,
    platform_names_resolved: staging.releaseDates.length === 0 ? null : staging.releaseDates.every((rd) => rd.platformName !== null),
    artwork_candidates: staging.images.length,
    involved_companies: staging.companies.length,
    alternative_names: staging.aliases.length,
    external_games: staging.externalGames.length,
    flags: [...new Set(staging.flags.map((f) => f.code))].sort(),
    error: null,
  };
}

async function dumpSampleProbe(client: IgdbClient, endpoint: string, maxBytes: number): Promise<DumpSampleReport> {
  const empty: DumpSampleReport = {
    endpoint,
    describe_ok: false,
    http_status: null,
    file_name: null,
    schema_version: null,
    size_bytes: null,
    updated_at: null,
    schema_columns: null,
    schema_types: [],
    download_ok: null,
    download_http_status: null,
    bytes_read: null,
    rows_parsed: null,
    csv_columns: [],
    array_encoding_observed: null,
    timestamp_encoding_observed: null,
    error: null,
  };
  const described = await client.describeDump(endpoint);
  if (!described.ok || !described.data) return { ...empty, http_status: described.status, error: described.error };
  const descriptor = described.data;
  const base: DumpSampleReport = {
    ...empty,
    describe_ok: true,
    http_status: described.status,
    file_name: descriptor.file_name,
    schema_version: descriptor.schema_version,
    size_bytes: descriptor.size_bytes,
    updated_at: descriptor.updated_at,
    schema_columns: Object.keys(descriptor.schema).length,
    schema_types: [...new Set(Object.values(descriptor.schema).map((t) => t.toUpperCase()))].sort(),
  };
  if (descriptor.size_bytes > maxBytes) {
    return { ...base, download_ok: false, error: `Dump is ${descriptor.size_bytes} bytes; the cap is ${maxBytes}. Raise it with --dump-max-bytes.` };
  }
  // The presigned URL lives only in this scope and is never printed.
  let response: Response;
  try {
    response = await fetch(descriptor.s3_url);
  } catch (error) {
    return { ...base, download_ok: false, error: `download failed: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (!response.ok) return { ...base, download_ok: false, download_http_status: response.status, error: `download answered HTTP ${response.status}` };
  const text = await response.text();
  try {
    const rows = parseDumpCsv(text, descriptor.schema);
    const header = text.split(/\r?\n/, 1)[0] ?? "";
    const arrayColumns = Object.entries(descriptor.schema).filter(([, t]) => t.toUpperCase().endsWith("[]")).map(([c]) => c);
    const timeColumns = Object.entries(descriptor.schema).filter(([, t]) => t.toUpperCase() === "TIMESTAMP").map(([c]) => c);
    const secondLine = text.split(/\r?\n/).find((line, i) => i > 0 && line.length > 0) ?? "";
    let arrayEncoding: DumpSampleReport["array_encoding_observed"] = arrayColumns.length ? "none" : null;
    if (arrayColumns.length && /\{[^}]*\}/.test(secondLine)) arrayEncoding = "braces";
    else if (arrayColumns.length && /\[[^\]]*\]/.test(secondLine)) arrayEncoding = "brackets";
    let timeEncoding: DumpSampleReport["timestamp_encoding_observed"] = timeColumns.length ? "none" : null;
    if (timeColumns.length && /\d{4}-\d{2}-\d{2}/.test(secondLine)) timeEncoding = "iso";
    else if (timeColumns.length && /(^|,)\d{9,}(,|$)/.test(secondLine)) timeEncoding = "unix";
    return {
      ...base,
      download_ok: true,
      download_http_status: response.status,
      bytes_read: Buffer.byteLength(text),
      rows_parsed: rows.length,
      csv_columns: header.split(",").map((c) => c.trim()).filter(Boolean),
      array_encoding_observed: arrayEncoding,
      timestamp_encoding_observed: timeEncoding,
    };
  } catch (error) {
    return {
      ...base,
      download_ok: true,
      download_http_status: response.status,
      bytes_read: Buffer.byteLength(text),
      rows_parsed: null,
      error: `dump parser refused the file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const live = argv.includes("--live");
  const asJson = argv.includes("--json");
  const fieldContract = flag(argv, "--field-contract");
  const dumpSample = flag(argv, "--dump-sample");
  const dumpMax = flag(argv, "--dump-max-bytes");
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
        `  3. GET  ${IGDB_API_BASE}/dumps\n` +
        "  4. with --field-contract <id>: POST /games for that one non-cohort id with the full field list\n" +
        "  5. with --dump-sample [endpoint]: GET /dumps/<endpoint>, then one capped download of the CSV\n\n" +
        `Credentials present now: ${readout.present ? "yes" : "no"}` +
        (readout.missing.length ? ` (missing: ${readout.missing.join(", ")})` : "") +
        "\nNothing is staged or written anywhere.\n",
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

  const base: ProbeReport = {
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
    errors: [],
  };

  if (!readout.present || !readout.credentials) {
    printReport("IGDB readiness probe", { ...base, auth_ok: false, igdb_request_ok: false, dump_entitlement_ok: false }, asJson);
    process.exitCode = 1;
    return;
  }

  const client = createIgdbClient({ credentials: readout.credentials });
  const report = await readinessProbe(client, base);
  printReport("IGDB readiness probe", report, asJson);
  let failed = !report.auth_ok || !report.igdb_request_ok;

  if (fieldContract !== null && report.auth_ok) {
    const id = Number(fieldContract);
    if (!Number.isInteger(id) || id <= 0) {
      console.error("--field-contract needs a positive integer IGDB id.");
      failed = true;
    } else {
      const contract = await fieldContractProbe(client, id);
      printReport("IGDB field-contract probe", contract, asJson);
      if (!contract.request_ok || contract.parser_ok !== true || contract.error) failed = true;
    }
  }

  if (dumpSample !== null && report.auth_ok) {
    const endpoint = dumpSample || "game_types";
    const cap = dumpMax ? Number(dumpMax) : DEFAULT_DUMP_MAX_BYTES;
    if (!/^[a-z_]+$/.test(endpoint) || !Number.isInteger(cap) || cap <= 0) {
      console.error("--dump-sample takes an endpoint name; --dump-max-bytes a positive integer.");
      failed = true;
    } else {
      const sample = await dumpSampleProbe(client, endpoint, cap);
      printReport("IGDB dump-sample probe", sample, asJson);
      if (!sample.describe_ok || sample.download_ok !== true || sample.rows_parsed === null) failed = true;
    }
  }

  if (failed) process.exitCode = 1;
}

void main();
