import type { ProfileView } from "@/lib/profile/build";
import { absoluteUrl, gameUrl, profileUrl, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * JSON-LD emitted by the public pages.
 *
 * HARD PRODUCT CONSTRAINT: nothing here may carry `aggregateRating`,
 * `reviewRating`, `ratingValue`, or any other single number standing in for the
 * eight dimensions. The absence of an overall score is a product principle, not
 * an omission, so `Review` and `AggregateRating` are not used at all — there is
 * no honest value to put in their required `ratingValue` field. `tests/seo.test.ts`
 * asserts this against the real serialised output.
 *
 * What is left is descriptive and true: this is a site, this page is about a
 * particular game, and here is where the page sits in the site's hierarchy.
 */

const WEBSITE_ID = `${SITE_URL}/#website`;
const PUBLISHER_ID = `${SITE_URL}/#publisher`;

type JsonLdNode = Record<string, unknown>;

function publisher(): JsonLdNode {
  return {
    "@type": "Organization",
    "@id": PUBLISHER_ID,
    name: SITE_NAME,
    url: SITE_URL,
  };
}

function website(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description:
      "Game Profiles: eight fixed dimensions per game, scored against a published rubric, with no overall score.",
    inLanguage: "en",
    publisher: { "@id": PUBLISHER_ID },
  };
}

/**
 * Site-wide graph, rendered once in the root layout.
 *
 * No `SearchAction`/sitelinks searchbox: the site has no search endpoint yet,
 * and declaring one that 404s would be a lie to the crawler.
 */
export function siteGraph(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@graph": [publisher(), website()],
  };
}

function breadcrumb(
  trail: readonly { name: string; url: string }[],
): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * A game profile page — one evaluated experience of one game.
 *
 * A game with several current scopes has several of these pages, each at its
 * own canonical URL and each describing the same `VideoGame`.
 *
 * The page is a `WebPage` whose `mainEntity` is the `VideoGame` it describes —
 * the honest shape, since we publish an evaluation *about* a game rather than
 * the game's own product page. `datePublished`/`dateModified` describe the
 * profile, not the game; the game's own release date is `VideoGame.datePublished`.
 */
export function gameProfileGraph(profile: ProfileView): JsonLdNode {
  const { game, scope, evaluation } = profile;
  // The page is this profile's own address; the game is one entity that both a
  // primary and a sibling scope are *about*. Anchoring the VideoGame node on
  // the game URL keeps that identity shared, so two scopes of one game describe
  // the same game rather than two.
  const url = profileUrl(game.slug, scope);
  const gameId = `${gameUrl(game.slug)}#game`;

  const videoGame: JsonLdNode = {
    "@type": "VideoGame",
    "@id": gameId,
    name: game.canonicalTitle,
    description: game.summary,
    url: gameUrl(game.slug),
    datePublished: game.firstReleaseDate,
    gamePlatform: game.platforms.map((platform) => platform.name),
    author: { "@type": "Organization", name: game.developerText },
    publisher: { "@type": "Organization", name: game.publisherText },
  };
  if (game.aliases.length > 0) videoGame.alternateName = [...game.aliases];

  const webPage: JsonLdNode = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: scope.isPrimary
      ? `Should I Play ${game.canonicalTitle}?`
      : `Should I Play ${game.canonicalTitle} — ${scope.label}?`,
    description: evaluation.oneLineExperience,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": gameId },
    mainEntity: { "@id": gameId },
    publisher: { "@id": PUBLISHER_ID },
  };
  if (evaluation.publishedAt) webPage.datePublished = evaluation.publishedAt;

  return {
    "@context": "https://schema.org",
    "@graph": [
      webPage,
      videoGame,
      // The home page is the catalogue until a /games index exists, so the
      // trail is short. A sibling scope adds a third level under the game's own
      // address; a breadcrumb must not name a URL that does not resolve, and
      // both of these do.
      breadcrumb(
        scope.isPrimary
          ? [
              { name: SITE_NAME, url: SITE_URL },
              { name: game.canonicalTitle, url },
            ]
          : [
              { name: SITE_NAME, url: SITE_URL },
              { name: game.canonicalTitle, url: gameUrl(game.slug) },
              { name: scope.label, url },
            ],
      ),
    ],
  };
}

/** The methodology page: a real document explaining how the scores are made. */
export function methodologyGraph(rubricVersion: string): JsonLdNode {
  const url = absoluteUrl("/methodology");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: `How Game Profiles are scored — Scoring Rubric v${rubricVersion}`,
        description:
          "Eight dimensions, five subcriteria each, scored 0–2 in half steps and summed to a 0–10 dimension total. No overall score is published.",
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        publisher: { "@id": PUBLISHER_ID },
      },
      breadcrumb([
        { name: SITE_NAME, url: SITE_URL },
        { name: "Methodology", url },
      ]),
    ],
  };
}
