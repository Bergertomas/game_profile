/**
 * The current IGDB contract this staging layer is built against.
 *
 * Every constant here was read from https://api-docs.igdb.com/ on 2026-09-02
 * (and the Twitch client-credentials flow from dev.twitch.tv the same day),
 * not from memory. Where the provider changes, this file is what changes, and
 * the readiness record under docs/calibration cites each fact by section.
 *
 * Nothing here is a product decision. It records what the provider says.
 */

export const IGDB_API_BASE = "https://api.igdb.com/v4";

/** Twitch client-credentials grant: form-encoded POST, never query-string. */
export const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";

/** `https://images.igdb.com/igdb/image/upload/t_{size}/{image_id}.jpg` */
export const IGDB_IMAGE_BASE = "https://images.igdb.com/igdb/image/upload";

/** "4 requests per second … up to 8 open requests at any moment in time." */
export const IGDB_RATE_LIMIT = {
  requestsPerSecond: 4,
  maxOpenRequests: 8,
} as const;

/** "The default item limit is set to 10 … The maximum limit is set to 500." */
export const IGDB_QUERY_LIMIT = { default: 10, max: 500 } as const;

/**
 * "Your Access Token is only active for 60 days and your application can only
 * have 25 active Access Tokens at one time, going over this limit starts to
 * inactivate older tokens." Minting a token per run is therefore a way to
 * revoke a colleague's; prefer a pre-issued token where one is provided.
 */
export const IGDB_TOKEN = { lifetimeDays: 60, maxActiveTokens: 25 } as const;

/** "Images that are removed or replaced from IGDB.com exist for 30 days." */
export const IGDB_REMOVED_IMAGE_GRACE_DAYS = 30;

/**
 * The endpoint the Item 5 dump proof samples.
 *
 * "All endpoints are available as CSV Data Dumps!", and the descriptor's
 * `schema` map declares each column's type, so the endpoint used to prove the
 * CSV encodings has to be one whose schema actually contains BOTH an array
 * type and a `TIMESTAMP`. Read from https://api-docs.igdb.com/ on 2026-09-03:
 *
 *   `game_types` — checksum (uuid), created_at (datetime), type (String),
 *                  updated_at (datetime). Timestamps, but NO array field, so
 *                  it cannot prove an array encoding at all.
 *   `platforms`  — versions ("Array of Platform Version IDs") and websites
 *                  ("Array of Platform Website IDs"), plus created_at and
 *                  updated_at (datetime). Both halves of the contract, and a
 *                  small reference table.
 *
 * The probe still refuses to call any sampled endpoint a pass unless the live
 * descriptor really declares both types and the data really shows both
 * encodings, so this constant is a default, not an assumption.
 */
export const IGDB_DUMP_PROOF_ENDPOINT = "platforms";

/**
 * Environment variable NAMES. Their values are secrets and are read in exactly
 * one place (`readIgdbCredentials`), never printed, never persisted.
 */
export const IGDB_ENV = {
  clientId: "IGDB_CLIENT_ID",
  clientSecret: "IGDB_CLIENT_SECRET",
  /** Optional pre-issued app access token; avoids minting one per run. */
  accessToken: "IGDB_ACCESS_TOKEN",
} as const;

/** The `game_external_ids.provider` value this layer maps into. */
export const IGDB_PROVIDER = "igdb";

/**
 * Commercial-partnership attribution as the FAQ states it: "user facing
 * attribution to IGDB.com … visible to your users and located in a static
 * location (e.g. not in a change log)". Recorded here so the requirement
 * travels with the integration; where it renders is a later product decision.
 */
export const IGDB_ATTRIBUTION = {
  text: "Game metadata from IGDB.com",
  placement: "static, user-visible location",
} as const;

/**
 * Fields the current docs mark DEPRECATED on `games`. The enum→table migration
 * period has ended; nothing in this layer reads them, and a test proves it.
 */
export const IGDB_DEPRECATED_GAME_FIELDS = [
  "category", // → game_type
  "status", // → game_status
  "collection", // → collections
  "follows",
] as const;

/**
 * Game Type values as the docs list them under Game Enums. The table-backed
 * `game_types` endpoint carries the same names as its `type` string; this
 * layer resolves BY NAME and stores the id beside it, and treats any name not
 * listed here as `unknown` rather than guessing.
 */
export const IGDB_GAME_TYPE_NAMES = [
  "main_game",
  "dlc_addon",
  "expansion",
  "bundle",
  "standalone_expansion",
  "mod",
  "episode",
  "season",
  "remake",
  "remaster",
  "expanded_game",
  "port",
  "fork",
  "pack",
  "update",
] as const;
export type IgdbGameTypeName = (typeof IGDB_GAME_TYPE_NAMES)[number];

/** Legacy enum numbering, kept ONLY as documentation of the docs' table. */
export const IGDB_LEGACY_GAME_TYPE_VALUES: Readonly<Record<IgdbGameTypeName, number>> = {
  main_game: 0,
  dlc_addon: 1,
  expansion: 2,
  bundle: 3,
  standalone_expansion: 4,
  mod: 5,
  episode: 6,
  season: 7,
  remake: 8,
  remaster: 9,
  expanded_game: 10,
  port: 11,
  fork: 12,
  pack: 13,
  update: 14,
};

export const IGDB_GAME_STATUS_NAMES = [
  "released",
  "alpha",
  "beta",
  "early_access",
  "offline",
  "cancelled",
  "rumored",
  "delisted",
] as const;
export type IgdbGameStatusName = (typeof IGDB_GAME_STATUS_NAMES)[number];

/**
 * The one APIcalypse field list this layer requests for a game. Table-backed
 * references are expanded to their name string; no deprecated field appears.
 * Live acceptance of this exact list is a readiness item, not an assumption.
 */
export const IGDB_GAME_FIELDS = [
  "id",
  "checksum",
  "updated_at",
  "created_at",
  "name",
  "slug",
  "url",
  "summary",
  "first_release_date",
  "version_title",
  "game_type.type",
  "game_status.status",
  "parent_game",
  "version_parent",
  "dlcs",
  "expansions",
  "standalone_expansions",
  "expanded_games",
  "bundles",
  "ports",
  "remakes",
  "remasters",
  "forks",
  "platforms",
  "cover.*",
  "cover.image_type.name",
  "artworks.*",
  "artworks.image_type.name",
  "release_dates.*",
  "release_dates.platform.name",
  "release_dates.date_format.format",
  "release_dates.release_region.region",
  "release_dates.status.name",
  "involved_companies.*",
  "involved_companies.company.name",
  "alternative_names.*",
  "external_games.*",
  "external_games.external_game_source.name",
  "external_games.game_release_format.format",
] as const;

/** Build the body for a point lookup of explicit IGDB ids. */
export function gamesByIdQuery(ids: readonly number[]): string {
  if (ids.length === 0) throw new Error("gamesByIdQuery needs at least one id.");
  if (ids.length > IGDB_QUERY_LIMIT.max) {
    throw new Error(`IGDB returns at most ${IGDB_QUERY_LIMIT.max} records per request.`);
  }
  for (const id of ids) {
    if (!Number.isInteger(id) || id <= 0) throw new Error(`Invalid IGDB id: ${String(id)}`);
  }
  return (
    `fields ${IGDB_GAME_FIELDS.join(",")}; ` +
    `where id = (${[...ids].sort((a, b) => a - b).join(",")}); ` +
    `limit ${Math.min(ids.length, IGDB_QUERY_LIMIT.max)};`
  );
}

/** Build the body for a change-detection sweep: records updated since a time. */
export function gamesUpdatedSinceQuery(sinceUnixSeconds: number, limit: number, offset: number): string {
  if (!Number.isInteger(sinceUnixSeconds) || sinceUnixSeconds < 0) {
    throw new Error("sinceUnixSeconds must be a non-negative integer.");
  }
  if (!Number.isInteger(limit) || limit <= 0 || limit > IGDB_QUERY_LIMIT.max) {
    throw new Error(`limit must be 1..${IGDB_QUERY_LIMIT.max}.`);
  }
  if (!Number.isInteger(offset) || offset < 0) throw new Error("offset must be >= 0.");
  return (
    `fields ${IGDB_GAME_FIELDS.join(",")}; ` +
    `where updated_at > ${sinceUnixSeconds}; sort updated_at asc; ` +
    `limit ${limit}; offset ${offset};`
  );
}

/** The provider image URL for a staged candidate, at a named IGDB size. */
export function igdbImageUrl(imageId: string, size: string, retina = false): string {
  if (!/^[A-Za-z0-9_-]+$/.test(imageId)) throw new Error("Malformed IGDB image_id.");
  if (!/^[a-z0-9_]+$/.test(size)) throw new Error("Malformed IGDB image size.");
  return `${IGDB_IMAGE_BASE}/t_${size}${retina ? "_2x" : ""}/${imageId}.jpg`;
}
