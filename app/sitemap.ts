import type { MetadataRoute } from "next";
import { listGameSlugs } from "@/lib/data/games";

const BASE_URL = "https://shouldiplay.gg";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await listGameSlugs();
  const now = new Date();

  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/methodology`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...slugs.map((slug) => ({
      url: `${BASE_URL}/games/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
