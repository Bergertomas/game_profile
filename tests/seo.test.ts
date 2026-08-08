import { afterEach, describe, expect, it, vi } from "vitest";
import { listGameProfiles, listGameSlugs } from "@/lib/data/games";
import { gameProfileGraph, methodologyGraph, siteGraph } from "@/lib/seo/structured-data";
import { gameTitle, gameUrl, resolveSiteEnv, SITE_URL } from "@/lib/site";

/**
 * Organic search is a primary acquisition channel (Plan/brand doc), so the
 * discoverability surface gets the same treatment as the scoring rules: the
 * things that would quietly break are asserted rather than assumed.
 *
 * The load-bearing assertion in this file is the last one. Schema.org makes it
 * trivially easy to publish an `aggregateRating`, and every SEO instinct says
 * to. This product has no aggregate score, so emitting one would be a lie in
 * machine-readable form — and would be invisible in the rendered page.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("site environment", () => {
  it("indexes only an explicitly-declared production build", () => {
    expect(resolveSiteEnv({ NEXT_PUBLIC_SITE_ENV: "production" })).toBe(
      "production",
    );
    expect(resolveSiteEnv({ NEXT_PUBLIC_SITE_ENV: "preview" })).toBe("preview");
  });

  it("treats the production branch on Workers Builds as production", () => {
    expect(resolveSiteEnv({ WORKERS_CI_BRANCH: "main" })).toBe("production");
    expect(resolveSiteEnv({ WORKERS_CI_BRANCH: "claude/anything" })).toBe(
      "preview",
    );
  });

  it("fails closed: an unidentified build is not indexable", () => {
    expect(resolveSiteEnv({})).toBe("preview");
    expect(resolveSiteEnv({ NEXT_PUBLIC_SITE_ENV: "staging" })).toBe("preview");
  });

  it.each([
    {
      label: "a non-production branch vetoes explicit production",
      env: {
        NEXT_PUBLIC_SITE_ENV: "production",
        WORKERS_CI_BRANCH: "feature/anything",
      },
      expected: "preview",
    },
    {
      label: "explicit preview vetoes the production branch",
      env: {
        NEXT_PUBLIC_SITE_ENV: "preview",
        WORKERS_CI_BRANCH: "main",
      },
      expected: "preview",
    },
    {
      label: "an invalid explicit value vetoes the production branch",
      env: {
        NEXT_PUBLIC_SITE_ENV: "staging",
        WORKERS_CI_BRANCH: "main",
      },
      expected: "preview",
    },
    {
      label: "matching production signals remain indexable",
      env: {
        NEXT_PUBLIC_SITE_ENV: "production",
        WORKERS_CI_BRANCH: "main",
      },
      expected: "production",
    },
    {
      label: "an explicit local production build remains indexable",
      env: { NEXT_PUBLIC_SITE_ENV: "production" },
      expected: "production",
    },
  ] as const)("resolves $label", ({ env, expected }) => {
    expect(resolveSiteEnv(env)).toBe(expected);
  });
});

describe("robots.txt", () => {
  it("opens the public site and advertises the sitemap in production", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "production");
    vi.resetModules();
    const robots = (await import("@/app/robots")).default;
    const result = robots();

    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(result.rules).toMatchObject({ userAgent: "*", allow: "/" });
    // Every segment that 404s in a production build is kept off the crawl path.
    expect(result.rules).toMatchObject({
      disallow: ["/dev/", "/design-lab/"],
    });
  });

  it("closes a preview deployment to crawlers entirely", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "preview");
    vi.resetModules();
    const robots = (await import("@/app/robots")).default;
    const result = robots();

    expect(result.rules).toMatchObject({ userAgent: "*", disallow: "/" });
    // Nothing points a crawler at content it has just been told not to fetch.
    expect(result.sitemap).toBeUndefined();
  });
});

describe("sitemap.xml", () => {
  it("lists the home page, the methodology and every published game", async () => {
    const sitemap = (await import("@/app/sitemap")).default;
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    const slugs = await listGameSlugs();

    expect(urls).toContain(`${SITE_URL}/`);
    expect(urls).toContain(`${SITE_URL}/methodology`);
    for (const slug of slugs) expect(urls).toContain(gameUrl(slug));
    expect(urls).toHaveLength(slugs.length + 2);
  });

  it("uses the canonical production origin for every entry", async () => {
    const sitemap = (await import("@/app/sitemap")).default;
    for (const entry of await sitemap()) {
      expect(entry.url.startsWith(`${SITE_URL}/`)).toBe(true);
    }
  });

  it("never advertises the development harness", async () => {
    const sitemap = (await import("@/app/sitemap")).default;
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.includes("/dev/"))).toBe(false);
    expect(urls.some((url) => url.includes("/design-lab"))).toBe(false);
  });

  it("dates entries from the evaluation, not from the build", async () => {
    const sitemap = (await import("@/app/sitemap")).default;
    const entries = await sitemap();
    const profiles = await listGameProfiles();

    for (const profile of profiles) {
      const entry = entries.find((e) => e.url === gameUrl(profile.game.slug));
      expect(entry?.lastModified).toBe(profile.evaluation.publishedAt);
    }
  });
});

describe("game page titles", () => {
  it("asks the question a searcher actually types", () => {
    expect(gameTitle("Returnal")).toBe("Should I Play Returnal? | Should I Play?");
  });
});

describe("structured data", () => {
  it("describes a game page as a page about a VideoGame", async () => {
    const [profile] = await listGameProfiles();
    const graph = gameProfileGraph(profile!) as {
      "@graph": Record<string, unknown>[];
    };
    const types = graph["@graph"].map((node) => node["@type"]);

    expect(types).toEqual(["WebPage", "VideoGame", "BreadcrumbList"]);

    const game = graph["@graph"][1]!;
    expect(game.name).toBe(profile!.game.canonicalTitle);
    expect(game.datePublished).toBe(profile!.game.firstReleaseDate);
  });

  it("only names breadcrumb URLs that resolve", async () => {
    const profiles = await listGameProfiles();
    const routable = new Set([
      SITE_URL,
      ...profiles.map((profile) => gameUrl(profile.game.slug)),
      `${SITE_URL}/methodology`,
    ]);

    for (const profile of profiles) {
      const graph = gameProfileGraph(profile) as {
        "@graph": Record<string, unknown>[];
      };
      const crumbs = graph["@graph"].find(
        (node) => node["@type"] === "BreadcrumbList",
      ) as { itemListElement: { item: string }[] };
      for (const crumb of crumbs.itemListElement) {
        expect(routable.has(crumb.item)).toBe(true);
      }
    }
  });

  /**
   * The product has no overall score. Schema.org offers several ways to publish
   * one anyway, and a crawler would happily believe any of them, so every graph
   * the site can emit is checked for all of them.
   */
  it("publishes no aggregate rating in any form", async () => {
    const profiles = await listGameProfiles();
    const graphs = [
      siteGraph(),
      methodologyGraph("1.0"),
      ...profiles.map(gameProfileGraph),
    ];

    const forbidden = [
      "aggregateRating",
      "reviewRating",
      "ratingValue",
      "ratingCount",
      "reviewCount",
      "bestRating",
      "worstRating",
      '"Review"',
      '"Rating"',
    ];

    for (const graph of graphs) {
      const serialised = JSON.stringify(graph);
      for (const term of forbidden) {
        expect(serialised).not.toContain(term);
      }
    }
  });
});
