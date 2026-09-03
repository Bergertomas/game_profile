import type {
  StagedAlternativeName,
  StagedExternalGame,
  StagedGame,
  StagedImage,
  StagedInvolvedCompany,
  StagedRelation,
  StagedReleaseDate,
} from "./normalize";

/**
 * Deterministic change detection between two stagings of the same IGDB record.
 *
 * A provider change is a REVIEW SIGNAL. It classifies what moved so a human
 * can decide whether anything editorial follows; it never changes a score, a
 * publication, a scope or an artwork clearance itself (issue #48 §7; ADR
 * 0026). The classes, most material last:
 *
 *   provider_text_drift        name, slug, summary, url, version title,
 *                              aliases, companies, external ids, or a checksum
 *                              that moved with nothing staged changing
 *   artwork_candidate          cover/artwork candidates appeared, vanished or
 *                              changed — never a clearance
 *   platform_or_release        platforms, release dates, first release date,
 *                              game status
 *   identity_or_relationship   ports, remakes, remasters, bundles, forks,
 *                              expanded games — another realisation of the work
 *   material_scope             parent_game, version_parent, game_type, or an
 *                              edition/DLC/expansion/standalone-expansion edge —
 *                              the things that can change what a profile scope
 *                              covers, so they prompt editorial review
 *
 * A change can fall into several classes at once; `requiresEditorialReview`
 * is true exactly when `material_scope` is among them.
 */

export type IgdbChangeClass =
  | "provider_text_drift"
  | "identity_or_relationship"
  | "platform_or_release"
  | "artwork_candidate"
  | "material_scope";

export interface StagedGameSnapshot {
  readonly game: StagedGame;
  /** Every edge this record's own payload asserted. */
  readonly relations: readonly StagedRelation[];
  readonly releaseDates: readonly StagedReleaseDate[];
  readonly images: readonly StagedImage[];
  readonly companies: readonly StagedInvolvedCompany[];
  readonly aliases: readonly StagedAlternativeName[];
  readonly externalGames: readonly StagedExternalGame[];
}

export interface IgdbChangeEvent {
  readonly igdbGameId: number;
  readonly previousChecksum: string | null;
  readonly nextChecksum: string | null;
  readonly previousIgdbUpdatedAt: string | null;
  readonly nextIgdbUpdatedAt: string | null;
  readonly classes: readonly IgdbChangeClass[];
  readonly changedFields: readonly string[];
  readonly requiresEditorialReview: boolean;
}

const CLASS_ORDER: readonly IgdbChangeClass[] = [
  "provider_text_drift",
  "artwork_candidate",
  "platform_or_release",
  "identity_or_relationship",
  "material_scope",
];

const SCOPE_RELATION_KINDS: ReadonlySet<StagedRelation["kind"]> = new Set([
  "version_of",
  "dlc_of",
  "expansion_of",
  "standalone_expansion_of",
  "parent_game_unclassified",
]);

function stable(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)));
    }
    return v;
  });
}

function differ(a: unknown, b: unknown): boolean {
  return stable(a) !== stable(b);
}

function relationKey(r: StagedRelation): string {
  return `${r.subjectIgdbId}>${r.objectIgdbId}:${r.kind}:${r.sourceField}`;
}

function setDiff(previous: readonly string[], next: readonly string[]): { added: string[]; removed: string[] } {
  const p = new Set(previous);
  const n = new Set(next);
  return {
    added: [...n].filter((key) => !p.has(key)).sort(),
    removed: [...p].filter((key) => !n.has(key)).sort(),
  };
}

/**
 * Compare two snapshots. Returns null when nothing observable changed,
 * including the checksum; a checksum-only change is still an event, because
 * the provider says something moved even if it is nothing this layer stages.
 */
export function classifyChange(previous: StagedGameSnapshot, next: StagedGameSnapshot): IgdbChangeEvent | null {
  if (previous.game.igdbId !== next.game.igdbId) {
    throw new Error("classifyChange compares two stagings of the same IGDB record.");
  }
  const classes = new Set<IgdbChangeClass>();
  const changed: string[] = [];
  const p = previous.game;
  const n = next.game;

  const scalar = (field: keyof StagedGame, cls: IgdbChangeClass) => {
    if (differ(p[field], n[field])) {
      changed.push(field);
      classes.add(cls);
    }
  };

  // material_scope: what the record IS and what it belongs to.
  scalar("parentGameIgdbId", "material_scope");
  scalar("versionParentIgdbId", "material_scope");
  scalar("gameTypeName", "material_scope");
  scalar("identityClass", "material_scope");

  // platform_or_release
  scalar("platformIgdbIds", "platform_or_release");
  scalar("firstReleaseDate", "platform_or_release");
  scalar("gameStatusName", "platform_or_release");
  const releases = setDiff(
    previous.releaseDates.map((rd) => stable({ ...rd, raw: undefined })),
    next.releaseDates.map((rd) => stable({ ...rd, raw: undefined })),
  );
  if (releases.added.length || releases.removed.length) {
    changed.push("release_dates");
    classes.add("platform_or_release");
  }

  // artwork_candidate
  const images = setDiff(
    previous.images.map((im) => stable({ ...im, raw: undefined })),
    next.images.map((im) => stable({ ...im, raw: undefined })),
  );
  if (images.added.length || images.removed.length) {
    changed.push("images");
    classes.add("artwork_candidate");
  }

  // relationships, split by materiality
  const rel = setDiff(previous.relations.map(relationKey), next.relations.map(relationKey));
  const movedEdges = [...rel.added, ...rel.removed];
  if (movedEdges.length) {
    const kinds = new Set(movedEdges.map((key) => key.split(":")[1] as StagedRelation["kind"]));
    for (const kind of kinds) {
      if (SCOPE_RELATION_KINDS.has(kind)) classes.add("material_scope");
      else classes.add("identity_or_relationship");
    }
    changed.push(...[...kinds].sort().map((kind) => `relations.${kind}`));
  }

  // provider_text_drift
  scalar("name", "provider_text_drift");
  scalar("slug", "provider_text_drift");
  scalar("summary", "provider_text_drift");
  scalar("url", "provider_text_drift");
  scalar("versionTitle", "provider_text_drift");
  for (const [field, prev, nxt] of [
    ["aliases", previous.aliases, next.aliases],
    ["companies", previous.companies, next.companies],
    ["external_games", previous.externalGames, next.externalGames],
  ] as const) {
    const d = setDiff(
      prev.map((row) => stable({ ...row, raw: undefined })),
      nxt.map((row) => stable({ ...row, raw: undefined })),
    );
    if (d.added.length || d.removed.length) {
      changed.push(field);
      classes.add("provider_text_drift");
    }
  }

  const checksumMoved = p.checksum !== n.checksum;
  const updatedMoved = p.igdbUpdatedAt !== n.igdbUpdatedAt;
  if (classes.size === 0) {
    if (!checksumMoved && !updatedMoved) return null;
    changed.push(checksumMoved ? "checksum" : "updated_at");
    classes.add("provider_text_drift");
  } else if (checksumMoved) {
    changed.push("checksum");
  }

  const ordered = CLASS_ORDER.filter((cls) => classes.has(cls));
  return {
    igdbGameId: n.igdbId,
    previousChecksum: p.checksum,
    nextChecksum: n.checksum,
    previousIgdbUpdatedAt: p.igdbUpdatedAt,
    nextIgdbUpdatedAt: n.igdbUpdatedAt,
    classes: ordered,
    changedFields: [...new Set(changed)].sort(),
    requiresEditorialReview: classes.has("material_scope"),
  };
}
