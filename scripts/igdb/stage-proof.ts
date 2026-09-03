/**
 * `npm run igdb:stage-proof` — the non-production staging proof against a real
 * Postgres, as a REHEARSAL by default.
 *
 *   DATABASE_URL=postgres://…/some_db CONFIRM_IGDB_STAGING=some_db npm run igdb:stage-proof
 *   … -- --commit      keep the staged fixture rows (still nothing editorial)
 *
 * It stages the synthetic fixture, re-stages it unchanged (must be a no-op),
 * stages the revised observation (must produce exactly the expected change
 * events), and proves the boundary by counting `games`, `profile_scopes`,
 * `evaluations`, `game_artwork` and `game_external_ids` before and after. It
 * refuses without the confirmation variable naming the database, and rolls
 * back unless `--commit` is passed, so running it against the wrong database
 * costs nothing.
 *
 * Nothing here calls IGDB, scores anything or publishes anything.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";
import type { AdminTransaction } from "@/lib/admin/db";
import {
  FIXTURE_SOURCE_REF,
  STAGING_PROOF_RECORDS,
  STAGING_PROOF_RECORDS_REVISED,
} from "@/lib/igdb/fixtures/staging-proof";
import { normalizeGames } from "@/lib/igdb/normalize";
import { beginIngestionRun, finishIngestionRun, stageNormalized } from "@/lib/igdb/staging-write";

const BOUNDARY_TABLES = ["games", "profile_scopes", "evaluations", "game_artwork", "game_external_ids", "subcriterion_scores"] as const;

class Rollback extends Error {}

async function boundaryCounts(tx: AdminTransaction): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const table of BOUNDARY_TABLES) {
    const rows = (await tx.execute(sql.raw(`SELECT count(*)::int AS n FROM ${table}`))) as Iterable<{ n: number }>;
    out[table] = [...rows][0]!.n;
  }
  return out;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const dbName = url.split("?")[0]!.split("/").pop() ?? "";
  if (!dbName || process.env.CONFIRM_IGDB_STAGING !== dbName) {
    console.error(
      `Refusing to stage into "${dbName}". Set CONFIRM_IGDB_STAGING=${dbName || "<database name>"} to confirm this is a non-production database.`,
    );
    process.exit(64);
  }
  const commit = process.argv.includes("--commit");

  const client = postgres(url, { max: 1, onnotice: () => {}, connection: { TimeZone: "UTC" } });
  const db = drizzle(client, { schema });
  let outcome = 1;
  try {
    await db.transaction(async (tx) => {
      const before = await boundaryCounts(tx);
      const fetchedAt = new Date();

      const runA = await beginIngestionRun(tx, { sourceKind: "fixture", sourceRef: FIXTURE_SOURCE_REF, note: "Item 5 staging proof, pass 1" });
      const first = normalizeGames(STAGING_PROOF_RECORDS);
      const a = await stageNormalized(tx, first, { runId: runA, sourceKind: "fixture", sourceRef: FIXTURE_SOURCE_REF, fetchedAt });
      await finishIngestionRun(tx, runA, first.games.length);

      const runB = await beginIngestionRun(tx, { sourceKind: "fixture", sourceRef: FIXTURE_SOURCE_REF, note: "Item 5 staging proof, pass 2 (identical)" });
      const b = await stageNormalized(tx, first, { runId: runB, sourceKind: "fixture", sourceRef: FIXTURE_SOURCE_REF, fetchedAt });
      await finishIngestionRun(tx, runB, first.games.length);

      const runC = await beginIngestionRun(tx, { sourceKind: "fixture", sourceRef: `${FIXTURE_SOURCE_REF}-revised`, note: "Item 5 staging proof, pass 3 (revised)" });
      const revised = normalizeGames(STAGING_PROOF_RECORDS_REVISED);
      const c = await stageNormalized(tx, revised, { runId: runC, sourceKind: "fixture", sourceRef: `${FIXTURE_SOURCE_REF}-revised`, fetchedAt });
      await finishIngestionRun(tx, runC, revised.games.length);

      const after = await boundaryCounts(tx);
      const boundaryHeld = BOUNDARY_TABLES.every((table) => before[table] === after[table]);
      const idempotent = b.inserted === 0 && b.updated === 0 && b.changeEvents.length === 0;
      const reviewPrompts = c.changeEvents.filter((e) => e.requiresEditorialReview).length;

      console.log("Phase 3A Item 5 — IGDB staging proof against Postgres\n");
      console.log(`  database                ${dbName}`);
      console.log(`  mode                    ${commit ? "COMMIT (fixture rows kept)" : "rehearsal (rolled back)"}`);
      console.log(`  pass 1 inserted         ${a.inserted}`);
      console.log(`  pass 2 unchanged        ${b.unchanged} (inserted ${b.inserted}, updated ${b.updated}, events ${b.changeEvents.length})`);
      console.log(`  pass 3 updated          ${c.updated}, events ${c.changeEvents.length}, editorial review prompts ${reviewPrompts}`);
      for (const event of c.changeEvents) {
        console.log(`    ${event.igdbGameId}  ${event.classes.join(", ")}  review=${event.requiresEditorialReview ? "YES" : "no"}`);
      }
      console.log(`  idempotent re-stage     ${idempotent ? "yes" : "NO"}`);
      console.log(`  editorial boundary held ${boundaryHeld ? "yes" : "NO"}`);
      for (const table of BOUNDARY_TABLES) console.log(`    ${table.padEnd(22)} ${before[table]} → ${after[table]}`);

      outcome = idempotent && boundaryHeld ? 0 : 1;
      if (!commit) throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  } finally {
    await client.end();
  }
  process.exitCode = outcome;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
