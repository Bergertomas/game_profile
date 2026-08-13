import { and, eq, sql } from "drizzle-orm";
import type { AdminTransaction } from "@/lib/admin/db";
import type {
  AliasInput,
  ArtworkInput,
  ExternalIdInput,
  GameInput,
  GamePlatformInput,
  ProfileScopeInput,
} from "@/lib/admin/validation";
import * as t from "@/lib/db/schema";

/**
 * Editorial writes.
 *
 * Every function here takes a transaction rather than opening its own, so a
 * Server Action composes several into one commit and the database's deferred
 * constraint triggers see a finished state rather than a half-applied one.
 *
 * These functions do not check permissions. Authorisation happens once, at the
 * top of the Server Action, via `requireEditor()` — a guard buried in a write
 * helper is a guard that gets forgotten by the next helper.
 */

export async function createGame(
  tx: AdminTransaction,
  input: GameInput,
): Promise<string> {
  const [row] = await tx
    .insert(t.games)
    .values({
      slug: input.slug,
      canonicalTitle: input.canonicalTitle,
      summary: input.summary ?? null,
      developerText: input.developerText ?? null,
      publisherText: input.publisherText ?? null,
      releaseStatus: input.releaseStatus,
      firstReleaseDate: input.firstReleaseDate ?? null,
    })
    .returning({ id: t.games.id });
  if (!row) throw new Error("Insert returned no game row.");
  return row.id;
}

export async function updateGame(
  tx: AdminTransaction,
  gameId: string,
  input: GameInput,
): Promise<void> {
  await tx
    .update(t.games)
    .set({
      slug: input.slug,
      canonicalTitle: input.canonicalTitle,
      summary: input.summary ?? null,
      developerText: input.developerText ?? null,
      publisherText: input.publisherText ?? null,
      releaseStatus: input.releaseStatus,
      firstReleaseDate: input.firstReleaseDate ?? null,
      updatedAt: sql`now()`,
    })
    .where(eq(t.games.id, gameId));
}

export async function addAlias(
  tx: AdminTransaction,
  gameId: string,
  input: AliasInput,
): Promise<void> {
  await tx
    .insert(t.gameAliases)
    .values({
      gameId,
      alias: input.alias,
      aliasType: input.aliasType ?? null,
    })
    // The primary key is (game, alias). Re-adding an alias to correct its type
    // is an ordinary editorial act, not a conflict worth an error page.
    .onConflictDoUpdate({
      target: [t.gameAliases.gameId, t.gameAliases.alias],
      set: { aliasType: input.aliasType ?? null },
    });
}

export async function removeAlias(
  tx: AdminTransaction,
  gameId: string,
  alias: string,
): Promise<void> {
  await tx
    .delete(t.gameAliases)
    .where(and(eq(t.gameAliases.gameId, gameId), eq(t.gameAliases.alias, alias)));
}

export async function upsertGamePlatform(
  tx: AdminTransaction,
  gameId: string,
  input: GamePlatformInput,
): Promise<void> {
  await tx
    .insert(t.gamePlatforms)
    .values({
      gameId,
      platformId: input.platformId,
      releaseDate: input.releaseDate ?? null,
      performanceNotes: input.performanceNotes ?? null,
    })
    .onConflictDoUpdate({
      target: [t.gamePlatforms.gameId, t.gamePlatforms.platformId],
      set: {
        releaseDate: input.releaseDate ?? null,
        performanceNotes: input.performanceNotes ?? null,
      },
    });
}

/**
 * Detach a platform from a game.
 *
 * This can fail, and the failure is correct: a platform-specific subcriterion
 * override references the platform and the database requires an override's
 * platform to be one the game ships on (ADR 0015). Removing a platform that
 * carries an override would strand the override, so Postgres refuses and the
 * editor is told to deal with the override first.
 */
export async function removeGamePlatform(
  tx: AdminTransaction,
  gameId: string,
  platformId: string,
): Promise<void> {
  await tx
    .delete(t.gamePlatforms)
    .where(
      and(
        eq(t.gamePlatforms.gameId, gameId),
        eq(t.gamePlatforms.platformId, platformId),
      ),
    );
}

export async function upsertExternalId(
  tx: AdminTransaction,
  gameId: string,
  input: ExternalIdInput,
): Promise<void> {
  await tx
    .insert(t.gameExternalIds)
    .values({
      gameId,
      provider: input.provider,
      externalId: input.externalId,
      externalUrl: input.externalUrl ?? null,
    })
    .onConflictDoUpdate({
      target: [t.gameExternalIds.gameId, t.gameExternalIds.provider],
      set: {
        externalId: input.externalId,
        externalUrl: input.externalUrl ?? null,
      },
    });
}

export async function removeExternalId(
  tx: AdminTransaction,
  gameId: string,
  provider: string,
): Promise<void> {
  await tx
    .delete(t.gameExternalIds)
    .where(
      and(
        eq(t.gameExternalIds.gameId, gameId),
        eq(t.gameExternalIds.provider, provider),
      ),
    );
}

/**
 * Record artwork, with the rights that travel with it.
 *
 * One row per (game, role) by primary key, so re-recording a cover replaces it
 * rather than accumulating candidates. `clearance` and `basis` come straight
 * from the form and have no default here — ADR 0011's whole point is that an
 * asset arrives with both or does not arrive.
 */
export async function upsertArtwork(
  tx: AdminTransaction,
  gameId: string,
  input: ArtworkInput,
): Promise<void> {
  const values = {
    url: input.url,
    width: input.width,
    height: input.height,
    altText: input.altText ?? null,
    focus: input.focus ?? null,
    source: input.source,
    externalId: input.externalId ?? null,
    clearance: input.clearance,
    basis: input.basis,
    credit: input.credit ?? null,
    sourcePage: input.sourcePage ?? null,
    retrievedAt: input.retrievedAt ?? null,
  };

  await tx
    .insert(t.gameArtwork)
    .values({ gameId, role: input.role, ...values })
    .onConflictDoUpdate({
      target: [t.gameArtwork.gameId, t.gameArtwork.role],
      set: values,
    });
}

export async function removeArtwork(
  tx: AdminTransaction,
  gameId: string,
  role: "cover" | "hero",
): Promise<void> {
  await tx
    .delete(t.gameArtwork)
    .where(and(eq(t.gameArtwork.gameId, gameId), eq(t.gameArtwork.role, role)));
}

/**
 * Create a profile scope.
 *
 * A game's FIRST scope becomes primary automatically. Not a guess about
 * editorial intent — a game whose only scope is not primary has no working
 * canonical URL, and there is no second scope for primacy to be a choice
 * between. Once a game has a scope, primacy is only ever moved explicitly.
 */
export async function createScope(
  tx: AdminTransaction,
  gameId: string,
  input: ProfileScopeInput,
): Promise<string> {
  const existing = await tx
    .select({ id: t.profileScopes.id })
    .from(t.profileScopes)
    .where(eq(t.profileScopes.gameId, gameId))
    .limit(1);

  const [row] = await tx
    .insert(t.profileScopes)
    .values({
      gameId,
      key: input.key,
      label: input.label,
      summary: input.summary ?? null,
      displayOrder: input.displayOrder,
      isPrimary: existing.length === 0,
    })
    .returning({ id: t.profileScopes.id });
  if (!row) throw new Error("Insert returned no profile scope row.");
  return row.id;
}

/**
 * Edit a scope's presentation.
 *
 * `isPrimary` is deliberately not settable here. Reordering and relabelling are
 * presentation; moving a canonical URL is not, and routing them through one
 * "save" is how the two become the same act (ADR 0016). See `setPrimaryScope`.
 *
 * `key` is settable and is identity work: it changes the sibling URL. The
 * interface warns; the model does not forbid it, because a genuine correction
 * has to be possible.
 */
export async function updateScope(
  tx: AdminTransaction,
  gameId: string,
  scopeId: string,
  input: ProfileScopeInput,
): Promise<void> {
  await tx
    .update(t.profileScopes)
    .set({
      key: input.key,
      label: input.label,
      summary: input.summary ?? null,
      displayOrder: input.displayOrder,
    })
    .where(
      and(eq(t.profileScopes.id, scopeId), eq(t.profileScopes.gameId, gameId)),
    );
}

/**
 * Move the canonical URL to another scope.
 *
 * TWO STATEMENTS, IN THIS ORDER, AND IT MATTERS. The two rules protecting
 * primacy are enforced by different mechanisms with different timing:
 *
 *  - "at most one primary per game" is a partial unique INDEX. A partial index
 *    cannot be a deferrable constraint, so it is checked as each row is
 *    written. Setting the new primary before clearing the old one violates it
 *    immediately, however the transaction ends.
 *  - "a game that publishes anything publishes its primary, per rubric" is a
 *    DEFERRABLE INITIALLY DEFERRED constraint trigger, so it is checked at
 *    COMMIT and tolerates the moment in between when the game has no primary
 *    at all.
 *
 * Clear-then-set is therefore the only order that satisfies both, and it works
 * only inside a transaction. Outside one, the intermediate state — a publishing
 * game with no primary scope — is exactly what the trigger exists to reject.
 */
export async function setPrimaryScope(
  tx: AdminTransaction,
  gameId: string,
  scopeId: string,
): Promise<void> {
  await tx
    .update(t.profileScopes)
    .set({ isPrimary: false })
    .where(
      and(eq(t.profileScopes.gameId, gameId), eq(t.profileScopes.isPrimary, true)),
    );

  await tx
    .update(t.profileScopes)
    .set({ isPrimary: true })
    .where(
      and(eq(t.profileScopes.id, scopeId), eq(t.profileScopes.gameId, gameId)),
    );
}

/**
 * Delete a scope.
 *
 * Only possible while it has no evaluations: `evaluations.scope_id` is
 * ON DELETE RESTRICT, because a scope is the durable identity of an evaluation
 * series and deleting one with history would orphan preserved editorial record
 * (ADR 0014). Postgres refuses; this does not attempt to be cleverer.
 */
export async function deleteScope(
  tx: AdminTransaction,
  gameId: string,
  scopeId: string,
): Promise<void> {
  await tx
    .delete(t.profileScopes)
    .where(
      and(eq(t.profileScopes.id, scopeId), eq(t.profileScopes.gameId, gameId)),
    );
}
