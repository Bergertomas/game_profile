import { SEED_PROFILES } from "@/content";
import { buildProfileView, type ProfileView } from "@/lib/profile/build";
import type { GameWithEvaluation } from "@/lib/profile/types";
import { RUBRIC_V1 } from "@/lib/rubric";

/**
 * The single data-access boundary for the public site.
 *
 * The vertical slice reads typed seed fixtures. When Postgres is provisioned,
 * only this file changes: the Drizzle schema in lib/db/schema.ts already models
 * these records, and scripts/emit-seed-sql.ts generates the seed from the same
 * fixtures so the two cannot drift.
 * See docs/decisions/0002-data-access.md.
 */

/**
 * The database deliberately permits one published row per profile scope *per
 * rubric* so a rubric migration can preserve both interpretations. The public
 * site still needs one deterministic answer; changing this selector is the
 * explicit cut-over step when a future rubric becomes authoritative.
 */
export const PUBLIC_RUBRIC_VERSION = RUBRIC_V1.version;

function publishedOnly(record: GameWithEvaluation): boolean {
  return (
    record.evaluation.status === "published" &&
    record.evaluation.rubricVersion === PUBLIC_RUBRIC_VERSION
  );
}

/**
 * Published profiles in a stable order: by game, then by scope.
 *
 * One entry per *profile*, not per game. A game with two current scopes — The
 * Long Dark's Survival and Wintermute — contributes two, because they are two
 * evaluations of two different experiences and neither summarises the other.
 */
function publishedProfiles(): GameWithEvaluation[] {
  return SEED_PROFILES.filter(publishedOnly)
    .slice()
    .sort(
      (a, b) =>
        a.scope.displayOrder - b.scope.displayOrder ||
        a.scope.key.localeCompare(b.scope.key),
    );
}

export async function listGameProfiles(): Promise<ProfileView[]> {
  return publishedProfiles().map(buildProfileView);
}

/**
 * Every published profile of one game, in scope order.
 *
 * Empty when the game has none. This is the shape a scope-aware page needs, and
 * it is the honest answer to "what is published for this slug?" now that the
 * answer can be more than one thing.
 */
export async function listProfileScopes(slug: string): Promise<ProfileView[]> {
  return publishedProfiles()
    .filter((entry) => entry.game.slug === slug)
    .map(buildProfileView);
}

/**
 * The profile served at `/games/<slug>`.
 *
 * A game may now carry several simultaneously current profiles, so this has to
 * choose one, and it chooses the first in scope order — `displayOrder`, then
 * `key`. That is deterministic rather than arbitrary, and every seeded game has
 * exactly one scope today, so it is also the whole answer today.
 *
 * It is NOT the final answer to the URL question. Once a game genuinely
 * publishes two current scopes, one of them being reachable only as "the
 * default" is a product decision about addressing and canonicalisation — see
 * ADR 0014, "What still needs a product decision". Use `listProfileScopes` for
 * anything that must see all of them.
 */
export async function getGameProfile(
  slug: string,
): Promise<ProfileView | null> {
  const record = publishedProfiles().find((entry) => entry.game.slug === slug);
  return record ? buildProfileView(record) : null;
}

/** One specific profile, addressed by game and scope key. */
export async function getGameProfileForScope(
  slug: string,
  scopeKey: string,
): Promise<ProfileView | null> {
  const record = publishedProfiles().find(
    (entry) => entry.game.slug === slug && entry.scope.key === scopeKey,
  );
  return record ? buildProfileView(record) : null;
}

/** Distinct slugs, for static generation. One page per game, not per profile. */
export async function listGameSlugs(): Promise<string[]> {
  return [...new Set(publishedProfiles().map((entry) => entry.game.slug))];
}
