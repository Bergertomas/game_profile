import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  ProfilePageBody,
  profileMetadata,
} from "@/components/profile/ProfilePage";
import {
  getGameProfileForScope,
  listPrimaryScopeParams,
  listSiblingScopeParams,
  whenCorpusIsReadable,
} from "@/lib/data/games";

/**
 * A sibling profile scope: one of a game's other current evaluated experiences.
 *
 *   /games/the-long-dark              Survival, the primary scope
 *   /games/the-long-dark/wintermute   Wintermute, a sibling
 *
 * Both are current, and neither summarises the other, so each is a page in its
 * own right with its own canonical URL (ADR 0016).
 *
 * ── The primary key redirects, it does not render ───────────────────────────
 *
 * `/games/<slug>/<primary-key>` is a real address that people will type and
 * that an editor will copy out of the admin UI, so it must not 404 — but
 * rendering it would publish one profile at two indexable URLs. It therefore
 * answers 308 to the bare game URL. One profile, one address, no dead link.
 *
 * `generateStaticParams` returns siblings *and* primaries for that reason: the
 * primary entries exist so the redirect is prerendered. Every other combination
 * 404s, including a scope that exists but has no published evaluation — a
 * draft-only scope is not public merely because somebody created it.
 */

/**
 * DO NOT ADD `export const dynamicParams = false` TO THIS FILE.
 *
 * It is honoured differently by the OpenNext/workerd runtime than by
 * `next start`: every page is prerendered and served correctly under the Next
 * server, so the unit suite, the production build and the whole e2e run stay
 * green — while the deployed Worker answers `GET /games/<slug>` with 404 and
 * `Internal: NoFallbackError`. Every game page, not just an unknown one.
 *
 * That shipped once, was fixed in Phase 1, and was reintroduced during the
 * Postgres cutover because the reason lived only in a commit message. It lives
 * here now. `npm run cf:verify` is the only gate that catches it, because it is
 * the only one that asks the real runtime for the real bytes.
 *
 * It is not needed anyway: an unknown slug renders on demand, finds no
 * published profile and calls `notFound()`, which is the same 404 by a
 * different route. The share-card route below keeps the export, where it has
 * always worked.
 *
 * ── That on-demand render must not read a database ─────────────────────────
 *
 * See the same note on `/games/[slug]`. At request time there is no
 * `DATABASE_URL` and a production bundle refuses to load a corpus without one;
 * `whenCorpusIsReadable` turns that refusal into the 404 this route already
 * claimed to give, instead of the 500 it actually gave.
 */

export async function generateStaticParams() {
  const [siblings, primaries] = await Promise.all([
    listSiblingScopeParams(),
    listPrimaryScopeParams(),
  ]);
  return [...siblings, ...primaries];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; scope: string }>;
}): Promise<Metadata> {
  const { slug, scope } = await params;
  const profile = await whenCorpusIsReadable(
    () => getGameProfileForScope(slug, scope),
    null,
  );
  // The primary key is a redirect, never an indexable page of its own.
  if (!profile || profile.scope.isPrimary) {
    return { title: "Not found", robots: { index: false } };
  }
  return profileMetadata(profile);
}

export default async function ScopedProfilePage({
  params,
}: {
  params: Promise<{ slug: string; scope: string }>;
}) {
  const { slug, scope } = await params;
  const profile = await whenCorpusIsReadable(
    () => getGameProfileForScope(slug, scope),
    null,
  );
  if (!profile) notFound();
  if (profile.scope.isPrimary) permanentRedirect(`/games/${slug}`);
  return <ProfilePageBody profile={profile} />;
}
