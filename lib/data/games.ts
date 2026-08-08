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
 * The database deliberately permits one published row per game *per rubric*
 * so a rubric migration can preserve both interpretations. The public site
 * still needs one deterministic answer; changing this selector is the explicit
 * cut-over step when a future rubric becomes authoritative.
 */
export const PUBLIC_RUBRIC_VERSION = RUBRIC_V1.version;

function publishedOnly(record: GameWithEvaluation): boolean {
  return (
    record.evaluation.status === "published" &&
    record.evaluation.rubricVersion === PUBLIC_RUBRIC_VERSION
  );
}

export async function listGameProfiles(): Promise<ProfileView[]> {
  return SEED_PROFILES.filter(publishedOnly).map(buildProfileView);
}

export async function getGameProfile(
  slug: string,
): Promise<ProfileView | null> {
  const record = SEED_PROFILES.filter(publishedOnly).find(
    (entry) => entry.game.slug === slug,
  );
  return record ? buildProfileView(record) : null;
}

export async function listGameSlugs(): Promise<string[]> {
  return SEED_PROFILES.filter(publishedOnly).map((entry) => entry.game.slug);
}
