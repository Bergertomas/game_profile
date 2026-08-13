"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withAdminTransaction } from "@/lib/admin/db";
import { invalidForm, reportingFailures, type ActionResult } from "@/lib/admin/errors";
import { requireEditor } from "@/lib/admin/guard";
import {
  aliasSchema,
  artworkSchema,
  externalIdSchema,
  gamePlatformSchema,
  gameSchema,
  parseForm,
  profileScopeSchema,
} from "@/lib/admin/validation";
import * as write from "@/lib/admin/write";

/**
 * Every editorial mutation in Phase 2B.
 *
 * ── Each one calls `requireEditor()` first ──────────────────────────────────
 *
 * Not redundant with `proxy.ts`. Next's proxy documentation states that Server
 * Functions are handled as POSTs to the route that uses them, that a matcher
 * which excludes a path also skips Server Function calls on it, and that "a
 * matcher change or a refactor that moves a Server Function to a different
 * route can silently remove Proxy coverage" — so the guard belongs with the
 * mutation, where a refactor carries it along.
 *
 * ── One transaction per action ──────────────────────────────────────────────
 *
 * The routing invariants are deferred constraint triggers that fire at COMMIT
 * (ADR 0016). An action that wrote through several connections would be
 * checked in pieces and could be refused for an intermediate state it was in
 * the middle of leaving.
 *
 * ── Publication is not here ─────────────────────────────────────────────────
 *
 * Nothing in this file publishes, supersedes or scores anything. Evaluation
 * authoring is Phase 2C and publication is 2D; 2B builds the game and scope
 * foundation those will write against.
 */

/** Admin pages are dynamic, so this only refreshes an already-open editor. */
function refresh(gameId?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/games");
  if (gameId) revalidatePath(`/admin/games/${gameId}`);
}

export async function createGameAction(
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseForm(gameSchema, form);
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  let gameId: string | null = null;
  const result = await reportingFailures(async () => {
    gameId = await withAdminTransaction((tx) => write.createGame(tx, parsed.value));
  }, parsed.values);
  if (!result.ok) return result;

  refresh();
  // Outside `reportingFailures`: `redirect` signals by throwing, and catching
  // it as a database failure would turn a successful create into an error.
  redirect(`/admin/games/${gameId}`);
}

export async function updateGameAction(
  gameId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseForm(gameSchema, form);
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await reportingFailures(
    () =>
      withAdminTransaction((tx) => write.updateGame(tx, gameId, parsed.value)),
    parsed.values,
  );
  refresh(gameId);
  return result;
}

export async function addAliasAction(
  gameId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseForm(aliasSchema, form);
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await reportingFailures(
    () =>
      withAdminTransaction((tx) => write.addAlias(tx, gameId, parsed.value)),
    parsed.values,
  );
  refresh(gameId);
  return result;
}

export async function removeAliasAction(
  gameId: string,
  alias: string,
): Promise<ActionResult> {
  await requireEditor();
  const result = await reportingFailures(() =>
      withAdminTransaction((tx) => write.removeAlias(tx, gameId, alias)),
  );
  refresh(gameId);
  return result;
}

export async function upsertPlatformAction(
  gameId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseForm(gamePlatformSchema, form);
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await reportingFailures(
    () =>
      withAdminTransaction((tx) => write.upsertGamePlatform(tx, gameId, parsed.value)),
    parsed.values,
  );
  refresh(gameId);
  return result;
}

export async function removePlatformAction(
  gameId: string,
  platformId: string,
): Promise<ActionResult> {
  await requireEditor();
  const result = await reportingFailures(() =>
      withAdminTransaction((tx) => write.removeGamePlatform(tx, gameId, platformId)),
  );
  refresh(gameId);
  return result;
}

export async function upsertExternalIdAction(
  gameId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseForm(externalIdSchema, form);
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await reportingFailures(
    () =>
      withAdminTransaction((tx) => write.upsertExternalId(tx, gameId, parsed.value)),
    parsed.values,
  );
  refresh(gameId);
  return result;
}

export async function removeExternalIdAction(
  gameId: string,
  provider: string,
): Promise<ActionResult> {
  await requireEditor();
  const result = await reportingFailures(() =>
      withAdminTransaction((tx) => write.removeExternalId(tx, gameId, provider)),
  );
  refresh(gameId);
  return result;
}

export async function upsertArtworkAction(
  gameId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseForm(artworkSchema, form);
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await reportingFailures(
    () =>
      withAdminTransaction((tx) => write.upsertArtwork(tx, gameId, parsed.value)),
    parsed.values,
  );
  refresh(gameId);
  return result;
}

export async function removeArtworkAction(
  gameId: string,
  role: "cover" | "hero",
): Promise<ActionResult> {
  await requireEditor();
  const result = await reportingFailures(() =>
      withAdminTransaction((tx) => write.removeArtwork(tx, gameId, role)),
  );
  refresh(gameId);
  return result;
}

export async function createScopeAction(
  gameId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseForm(profileScopeSchema, form);
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await reportingFailures(
    () =>
      withAdminTransaction(async (tx) => {
      await write.createScope(tx, gameId, parsed.value);
    }),
    parsed.values,
  );
  refresh(gameId);
  return result;
}

export async function updateScopeAction(
  gameId: string,
  scopeId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseForm(profileScopeSchema, form);
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await reportingFailures(
    () =>
      withAdminTransaction((tx) => write.updateScope(tx, gameId, scopeId, parsed.value)),
    parsed.values,
  );
  refresh(gameId);
  return result;
}

/**
 * Move the canonical URL to another scope.
 *
 * A separate action from `updateScopeAction`, deliberately. Primacy owns
 * `/games/<slug>`; label, summary and order own how a listing reads. Combining
 * them into one "save" is how reordering a listing silently moves a canonical
 * URL, which is the failure ADR 0016 exists to prevent — so the interface makes
 * it a distinct, explicit act with its own confirmation.
 */
export async function setPrimaryScopeAction(
  gameId: string,
  scopeId: string,
): Promise<ActionResult> {
  await requireEditor();
  const result = await reportingFailures(() =>
      withAdminTransaction((tx) => write.setPrimaryScope(tx, gameId, scopeId)),
  );
  refresh(gameId);
  return result;
}

export async function deleteScopeAction(
  gameId: string,
  scopeId: string,
): Promise<ActionResult> {
  await requireEditor();
  const result = await reportingFailures(() =>
      withAdminTransaction((tx) => write.deleteScope(tx, gameId, scopeId)),
  );
  refresh(gameId);
  return result;
}
