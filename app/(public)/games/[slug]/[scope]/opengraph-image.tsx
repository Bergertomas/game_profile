import { getGameProfileForScope, listSiblingScopeParams } from "@/lib/data/games";
import {
  SHARE_CARD_ALT,
  SHARE_CARD_CONTENT_TYPE,
  SHARE_CARD_SIZE,
  shareCard,
} from "@/lib/seo/share-card";

/**
 * The share card for a sibling profile scope.
 *
 * Drawn by the same `shareCard` the primary route uses, from that scope's own
 * `ProfileView` — so a shared Wintermute link cannot show Survival's numbers.
 * Only siblings are generated: the primary scope's card lives at the game's own
 * address, and the primary key redirects there.
 */

export const alt = SHARE_CARD_ALT;
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_CONTENT_TYPE;
export const dynamicParams = false;

export function generateStaticParams() {
  return listSiblingScopeParams();
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string; scope: string }>;
}) {
  const { slug, scope } = await params;
  const profile = await getGameProfileForScope(slug, scope);
  if (!profile || profile.scope.isPrimary) {
    return new Response("Not found", { status: 404 });
  }
  return shareCard(profile);
}
