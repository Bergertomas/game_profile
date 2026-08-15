import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ProfilePageBody,
  profileMetadata,
} from "@/components/profile/ProfilePage";
import { getGameProfile, listGameSlugs } from "@/lib/data/games";

/**
 * A game's canonical public address: its PRIMARY profile scope.
 *
 * Most games have exactly one evaluated experience, so this is the whole
 * answer for them. A game with several — The Long Dark's Survival and
 * Wintermute — answers here with the scope explicitly marked primary, and its
 * siblings answer at `/games/<slug>/<scope-key>` (ADR 0016).
 *
 * Primary is a durable property of the scope, not the first row and not
 * `display_order`: reordering scopes for a listing must never move a canonical
 * URL. The database refuses to let a game publish a sibling while its primary
 * scope is unpublished, so this address resolves for every game with any public
 * content.
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
 */

export async function generateStaticParams() {
  const slugs = await listGameSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getGameProfile(slug);
  if (!profile) return { title: "Not found", robots: { index: false } };
  return profileMetadata(profile);
}

export default async function GameProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getGameProfile(slug);
  if (!profile) notFound();
  return <ProfilePageBody profile={profile} />;
}
