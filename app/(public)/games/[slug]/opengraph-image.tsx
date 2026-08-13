import { getGameProfile, listGameSlugs } from "@/lib/data/games";
import {
  SHARE_CARD_ALT,
  SHARE_CARD_CONTENT_TYPE,
  SHARE_CARD_SIZE,
  shareCard,
} from "@/lib/seo/share-card";

/** The share card for a game's primary profile. Drawn by lib/seo/share-card. */

export const alt = SHARE_CARD_ALT;
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_CONTENT_TYPE;
export const dynamicParams = false;

export function generateStaticParams() {
  return listGameSlugs().then((slugs) => slugs.map((slug) => ({ slug })));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getGameProfile(slug);
  if (!profile) return new Response("Not found", { status: 404 });
  return shareCard(profile);
}
