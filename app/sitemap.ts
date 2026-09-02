import type { MetadataRoute } from "next";
import { listGameProfiles } from "@/lib/data/games";
import { RUBRIC_V1 } from "@/lib/rubric";
import { absoluteUrl, profileUrl } from "@/lib/site";

/**
 * Generated from the same data access boundary the pages read, so it scales to
 * the whole catalogue without anyone editing a file. `listGameProfiles` already
 * filters to `status === "published"`, which is what keeps drafts, in-review and
 * superseded evaluations out of the index.
 *
 * `lastModified` is the date the evaluation was published, not the date of the
 * build. A sitemap that claims every page changed at deploy time teaches a
 * crawler to ignore the field.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const profiles = await listGameProfiles();

  const publishDates = profiles.flatMap((profile) =>
    profile.evaluation.publishedAt ? [profile.evaluation.publishedAt] : [],
  );
  const catalogueChangedAt =
    publishDates.length > 0 ? publishDates.sort().at(-1)! : RUBRIC_V1.lockedAt;

  return [
    {
      url: absoluteUrl("/"),
      // The home page is the catalogue: it changes when a profile publishes.
      lastModified: catalogueChangedAt,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      // The Compare launcher: standalone guidance and the eligible list, so it
      // is indexable (ADR 0033). Pair addresses are noindex and are never
      // listed; this is the one Compare entry there will ever be.
      url: absoluteUrl("/compare"),
      lastModified: catalogueChangedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/methodology"),
      // Rendered from the typed rubric, so it changes when the rubric is relocked.
      lastModified: RUBRIC_V1.lockedAt,
      changeFrequency: "yearly",
      priority: 0.7,
    },
    // One entry per publicly current profile, at its own canonical address:
    // a game's primary scope at /games/<slug>, each sibling at
    // /games/<slug>/<scope-key>. Never both for one profile (ADR 0016).
    ...profiles.map((profile) => ({
      url: profileUrl(profile.game.slug, profile.scope),
      lastModified: profile.evaluation.publishedAt ?? catalogueChangedAt,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
  ];
}
