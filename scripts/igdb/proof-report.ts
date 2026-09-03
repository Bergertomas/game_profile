/**
 * `npm run igdb:report` — the safe Item 5 staging proof, without a database or
 * a network. It normalizes the synthetic fixture, prints what the staging layer
 * would hold, and shows the change classification between the two fixture
 * observations. Everything printed is reproducible from the repository.
 */
import { createHash } from "node:crypto";
import { classifyChange, type StagedGameSnapshot } from "@/lib/igdb/change";
import {
  FIXTURE_SOURCE_REF,
  STAGING_PROOF_RECORDS,
  STAGING_PROOF_RECORDS_REVISED,
} from "@/lib/igdb/fixtures/staging-proof";
import { normalizeGames, type NormalizedStaging } from "@/lib/igdb/normalize";

function stable(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

function digest(staging: NormalizedStaging): string {
  return createHash("sha256").update(stable(staging)).digest("hex");
}

function snapshotOf(staging: NormalizedStaging, igdbId: number): StagedGameSnapshot {
  const game = staging.games.find((g) => g.igdbId === igdbId);
  if (!game) throw new Error(`No staged game ${igdbId}`);
  return {
    game,
    relations: staging.relations.filter((r) => r.assertedByIgdbId === igdbId),
    releaseDates: staging.releaseDates.filter((rd) => rd.igdbGameId === igdbId),
    images: staging.images.filter((im) => im.igdbGameId === igdbId),
    companies: staging.companies.filter((ic) => ic.igdbGameId === igdbId),
    aliases: staging.aliases.filter((an) => an.igdbGameId === igdbId),
    externalGames: staging.externalGames.filter((eg) => eg.igdbGameId === igdbId),
  };
}

function main(): void {
  const first = normalizeGames(STAGING_PROOF_RECORDS);
  const again = normalizeGames([...STAGING_PROOF_RECORDS].reverse());
  const revised = normalizeGames(STAGING_PROOF_RECORDS_REVISED);

  console.log("Phase 3A Item 5 — IGDB staging proof (fixture, no network, no database)\n");
  console.log(`  fixture                 ${FIXTURE_SOURCE_REF}`);
  console.log(`  staging digest          ${digest(first)}`);
  console.log(`  order-independent       ${digest(first) === digest(again) ? "yes" : "NO"}`);
  console.log(`  records                 ${first.games.length}`);
  console.log(`  relations               ${first.relations.length}`);
  console.log(`  release dates           ${first.releaseDates.length}`);
  console.log(`  artwork candidates      ${first.images.length} (none cleared; no clearance exists here)`);
  console.log(`  flags                   ${first.flags.length}\n`);

  console.log("  identity classes");
  for (const game of first.games) {
    const parent = game.parentGameIgdbId ? ` parent_game=${game.parentGameIgdbId}` : "";
    const version = game.versionParentIgdbId ? ` version_parent=${game.versionParentIgdbId}` : "";
    console.log(`    ${game.igdbId}  ${game.identityClass.padEnd(20)} ${game.gameTypeName ?? "(no type)"}${parent}${version}  ${game.name}`);
  }
  console.log("\n  relations (subject kind object · asserted by · source field)");
  for (const r of first.relations) {
    console.log(`    ${r.subjectIgdbId} ${r.kind.padEnd(24)} ${r.objectIgdbId} · ${r.assertedByIgdbId} · ${r.sourceField}`);
  }
  console.log("\n  flags");
  for (const flag of first.flags) console.log(`    ${flag.igdbId}  ${flag.severity.padEnd(8)} ${flag.code.padEnd(36)} ${flag.detail}`);

  console.log("\n  change classification, first → revised observation");
  for (const game of first.games) {
    const event = classifyChange(snapshotOf(first, game.igdbId), snapshotOf(revised, game.igdbId));
    if (!event) continue;
    console.log(
      `    ${game.igdbId}  ${event.classes.join(", ").padEnd(48)} review=${event.requiresEditorialReview ? "YES" : "no"}  fields=${event.changedFields.join(",")}`,
    );
  }
  console.log("\n  No score, evaluation, profile, publication or artwork clearance is produced by this proof.");
}

main();
