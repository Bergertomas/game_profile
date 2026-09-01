import type { ProfileView } from "@/lib/profile/build";

/**
 * AUTHORED HOMEPAGE SHELVES — the grammar, not the content.
 *
 * P0.3 locks a hybrid editorial model with exactly three kinds of collection,
 * and this module is the machine that renders them. The collections themselves
 * live in `content/home-shelves.ts`, which is the small version-controlled
 * configuration P0.3 requires and is reviewed like editorial content.
 *
 *   objective — membership is PROVED by a fact the corpus already publishes:
 *               a publication date, a release date, a supersession. Automation
 *               is allowed here precisely because it makes no qualitative
 *               claim; it restates a record.
 *   evergreen — durable authored collections ("Story first"). Membership is
 *               explicitly authored and owner-approved. No score threshold and
 *               no dimension value may place a game in one.
 *   living    — time-bounded authored collections. Every one carries a
 *               publication window and an evergreen fallback, because P0.3's
 *               hard rule is that expired material must never remain on the
 *               page because nobody replaced it.
 *
 * ── Three rules that are product decisions, not implementation taste ───────
 *
 * 1. A SHELF THAT LACKS MEMBERS DISAPPEARS. It is never padded, and it never
 *    renders a heading over an empty track (P0.3; handoff §7.3). `minimumMembers`
 *    is the per-shelf floor and the caller's rendering code never sees a shelf
 *    that failed it. An objective shelf that would contain the WHOLE published
 *    catalogue disappears for the same reason: a collection that selects
 *    nothing is not a collection, and reprinting the general rail under a
 *    second heading is the "reorder material merely to simulate activity" P0.3
 *    forbids. An authored shelf is exempt — an editor listing everything is a
 *    decision somebody made, not automation dressing a small catalogue up.
 * 2. NOTHING IS REORDERED TO SIMULATE ACTIVITY. Objective shelves order by the
 *    date that defines them; authored shelves keep the order the editor wrote.
 *    There is no shuffle, no popularity, no trending and no ranking anywhere in
 *    this file.
 * 3. AN UNRESOLVABLE MEMBER FAILS THE BUILD. A configured collection naming a
 *    profile the site does not publish is a broken editorial claim, and the fix
 *    belongs in the configuration. Dropping it silently would let an approved
 *    collection quietly become a different collection — the same failure ADR
 *    0031 refuses for the Search index.
 *
 * ── When "now" is ────────────────────────────────────────────────────────
 *
 * Every window and every rolling date range is evaluated at BUILD time, because
 * the public site is a static artifact with no request-time data (ADR 0017,
 * 0031). A living shelf therefore expires at the next build after its `until`
 * date, not at midnight on it. That is a real property of a static product and
 * the reason `now` is a parameter rather than a `new Date()` buried in here:
 * the caller states which moment it is publishing for, and the tests state
 * theirs.
 */

/** A rule that reads an existing published fact. It may not read a score. */
export type ObjectiveRule =
  /** Published on Should I Play? within the last N days. */
  | { readonly rule: "profiled-within-days"; readonly days: number }
  /** The game itself released within the last N days, and has released. */
  | { readonly rule: "released-within-days"; readonly days: number }
  /** This profile replaced an earlier published evaluation of the same scope. */
  | { readonly rule: "reassessed" };

/**
 * One authored member.
 *
 * `scope` is omitted for the game's primary scope, which is the address a
 * reader thinks of as "the game". Naming a sibling scope explicitly is how a
 * collection points at one evaluated experience of a game rather than another.
 */
export interface ShelfMemberRef {
  readonly slug: string;
  readonly scope?: string;
}

/** Inclusive ISO `YYYY-MM-DD` bounds. Both ends are required (P0.3). */
export interface PublicationWindow {
  readonly from: string;
  readonly until: string;
}

interface ShelfBase {
  readonly id: string;
  /** The public heading. A truthful name for the collection, never a claim. */
  readonly heading: string;
  /** One line telling the reader what puts a profile here. */
  readonly note: string;
  /** Below this many resolved members the shelf does not render at all. */
  readonly minimumMembers: number;
}

export interface ObjectiveShelf extends ShelfBase {
  readonly kind: "objective";
  readonly membership: ObjectiveRule;
}

export interface EvergreenShelf extends ShelfBase {
  readonly kind: "evergreen";
  readonly members: readonly ShelfMemberRef[];
}

export interface LivingShelf extends ShelfBase {
  readonly kind: "living";
  readonly members: readonly ShelfMemberRef[];
  readonly window: PublicationWindow;
  /** The evergreen shelf that takes this one's place once the window closes. */
  readonly fallbackId?: string;
}

export type ShelfDefinition = ObjectiveShelf | EvergreenShelf | LivingShelf;

/** A shelf that has members and may be rendered. */
export interface ShelfView {
  readonly id: string;
  readonly kind: ShelfDefinition["kind"];
  readonly heading: string;
  readonly note: string;
  readonly profiles: readonly ProfileView[];
  /**
   * Set when this shelf is on the page because a living shelf expired. Carried
   * so a reviewer can see the substitution happened; it is not public copy.
   */
  readonly standingInFor?: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The UTC calendar day of an instant, as `YYYY-MM-DD`. */
function dayOf(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}

/**
 * The calendar day `days` before `from`, as `YYYY-MM-DD`.
 *
 * Whole UTC days throughout. A rolling window measured in days has no business
 * depending on the timezone of whichever machine ran the build.
 */
function daysBefore(from: string, days: number): string {
  const at = Date.UTC(
    Number(from.slice(0, 4)),
    Number(from.slice(5, 7)) - 1,
    Number(from.slice(8, 10)),
  );
  return new Date(at - days * 86_400_000).toISOString().slice(0, 10);
}

/** ISO days compare correctly as strings, which is why the format is fixed. */
function assertIsoDay(value: string, where: string): void {
  if (!ISO_DAY.test(value)) {
    throw new Error(`Shelf ${where} must be an ISO YYYY-MM-DD date, got "${value}".`);
  }
}

/**
 * The configuration is well-formed.
 *
 * Thrown from, not logged: this runs during `next build`, and a malformed
 * editorial collection must stop a publication rather than reach a reader in
 * some half-resolved state.
 */
export function assertShelvesAreWellFormed(
  definitions: readonly ShelfDefinition[],
): void {
  const byId = new Map<string, ShelfDefinition>();
  for (const shelf of definitions) {
    if (byId.has(shelf.id)) {
      throw new Error(`Two homepage shelves share the id "${shelf.id}".`);
    }
    if (shelf.minimumMembers < 1) {
      throw new Error(
        `Shelf "${shelf.id}" has minimumMembers ${shelf.minimumMembers}; a shelf with no members is not a shelf.`,
      );
    }
    byId.set(shelf.id, shelf);
  }

  for (const shelf of definitions) {
    if (shelf.kind !== "living") continue;

    assertIsoDay(shelf.window.from, `"${shelf.id}" window.from`);
    assertIsoDay(shelf.window.until, `"${shelf.id}" window.until`);
    if (shelf.window.until < shelf.window.from) {
      throw new Error(
        `Shelf "${shelf.id}" closes (${shelf.window.until}) before it opens (${shelf.window.from}).`,
      );
    }

    if (shelf.fallbackId === undefined) continue;
    const fallback = byId.get(shelf.fallbackId);
    if (!fallback) {
      throw new Error(
        `Shelf "${shelf.id}" falls back to "${shelf.fallbackId}", which is not configured.`,
      );
    }
    // No chains. A fallback that can itself expire is not a fallback, and
    // resolving one would need a cycle check nobody would remember to keep.
    if (fallback.kind !== "evergreen") {
      throw new Error(
        `Shelf "${shelf.id}" falls back to "${shelf.fallbackId}", which is ${fallback.kind}. A fallback must be evergreen.`,
      );
    }
  }
}

/** Published profiles keyed by canonical address, plus each game's primary. */
function index(profiles: readonly ProfileView[]) {
  const byScope = new Map<string, ProfileView>();
  const primary = new Map<string, ProfileView>();
  const position = new Map<ProfileView, number>();

  profiles.forEach((profile, at) => {
    byScope.set(`${profile.game.slug}/${profile.scope.key}`, profile);
    // First wins, matching `getGameProfile`'s `.find()`. The database permits
    // exactly one primary scope per game, so the two can only disagree on a
    // synthetic corpus — and when they do, both should pick the same row.
    if (profile.scope.isPrimary && !primary.has(profile.game.slug)) {
      primary.set(profile.game.slug, profile);
    }
    position.set(profile, at);
  });

  return { byScope, primary, position };
}

type Catalogue = ReturnType<typeof index>;

function resolveMembers(
  shelf: EvergreenShelf | LivingShelf,
  catalogue: Catalogue,
): ProfileView[] {
  return shelf.members.map((member) => {
    const found = member.scope
      ? catalogue.byScope.get(`${member.slug}/${member.scope}`)
      : catalogue.primary.get(member.slug);
    if (!found) {
      throw new Error(
        `Homepage shelf "${shelf.id}" names ${member.slug}` +
          (member.scope ? ` (scope "${member.scope}")` : "") +
          `, which this build does not publish. Correct the collection in ` +
          `content/home-shelves.ts rather than letting the shelf quietly ` +
          `become a different collection.`,
      );
    }
    return found;
  });
}

/**
 * Objective membership, and the sort that goes with it.
 *
 * Each rule sorts by the very date that defines it, newest first, with
 * catalogue order breaking ties. That is a restatement of a record and not a
 * ranking: nothing here consults a dimension score, a source count or a
 * confidence, and no game is ever above another because it is "better".
 */
function resolveObjective(
  shelf: ObjectiveShelf,
  profiles: readonly ProfileView[],
  catalogue: Catalogue,
  today: string,
): ProfileView[] {
  const tie = (a: ProfileView, b: ProfileView) =>
    (catalogue.position.get(a) ?? 0) - (catalogue.position.get(b) ?? 0);

  if (shelf.membership.rule === "reassessed") {
    return profiles
      .filter(
        (profile) =>
          profile.evaluation.versionNumber > 1 ||
          profile.evaluation.supersedesEvaluationId !== undefined,
      )
      .sort(
        (a, b) =>
          byDateDescending(a.evaluation.publishedAt, b.evaluation.publishedAt) ||
          tie(a, b),
      );
  }

  if (shelf.membership.rule === "profiled-within-days") {
    const cutoff = daysBefore(today, shelf.membership.days);
    return profiles
      .filter((profile) => (profile.evaluation.publishedAt ?? "") >= cutoff)
      .sort(
        (a, b) =>
          byDateDescending(a.evaluation.publishedAt, b.evaluation.publishedAt) ||
          tie(a, b),
      );
  }

  const cutoff = daysBefore(today, shelf.membership.days);
  return profiles
    .filter(
      (profile) =>
        profile.game.releaseStatus === "released" &&
        profile.game.firstReleaseDate >= cutoff &&
        // A release date in the future is a scheduling record, not a release.
        profile.game.firstReleaseDate <= today,
    )
    .sort(
      (a, b) =>
        byDateDescending(a.game.firstReleaseDate, b.game.firstReleaseDate) ||
        tie(a, b),
    );
}

/** Newest first. A missing date sorts last rather than throwing. */
function byDateDescending(a: string | undefined, b: string | undefined): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a < b ? 1 : -1;
}

/**
 * The shelves this build should render, in configured order.
 *
 * Everything the caller receives is renderable: it has at least its minimum
 * members, its window is open (or it is a fallback for one that has closed),
 * and every member resolves to a profile this build publishes. A caller that
 * gets an empty array renders no shelf region at all.
 */
export function resolveShelves(
  definitions: readonly ShelfDefinition[],
  profiles: readonly ProfileView[],
  now: Date,
): ShelfView[] {
  assertShelvesAreWellFormed(definitions);

  const catalogue = index(profiles);
  const today = dayOf(now);
  const byId = new Map(definitions.map((shelf) => [shelf.id, shelf]));
  const rendered: ShelfView[] = [];
  const seen = new Set<string>();

  const emit = (
    shelf: ShelfDefinition,
    members: readonly ProfileView[],
    standingInFor?: string,
  ) => {
    if (members.length < shelf.minimumMembers) return;
    if (seen.has(shelf.id)) return;
    seen.add(shelf.id);
    rendered.push({
      id: shelf.id,
      kind: shelf.kind,
      heading: shelf.heading,
      note: shelf.note,
      profiles: members,
      ...(standingInFor ? { standingInFor } : {}),
    });
  };

  for (const shelf of definitions) {
    if (shelf.kind === "objective") {
      const members = resolveObjective(shelf, profiles, catalogue, today);
      // Rule 1's second half. `profiles` is everything this build publishes, so
      // an objective rule that matched all of it has selected nothing.
      if (profiles.length > 0 && members.length === profiles.length) continue;
      emit(shelf, members);
      continue;
    }

    if (shelf.kind === "evergreen") {
      emit(shelf, resolveMembers(shelf, catalogue));
      continue;
    }

    const open = today >= shelf.window.from && today <= shelf.window.until;
    if (open) {
      emit(shelf, resolveMembers(shelf, catalogue));
      continue;
    }

    // Closed. Before its window it is simply not on the page yet; after it, the
    // evergreen fallback takes the slot so the position does not go dark and
    // the expired copy does not linger. Either way the living shelf itself is
    // not rendered.
    if (today < shelf.window.from || shelf.fallbackId === undefined) continue;

    const fallback = byId.get(shelf.fallbackId);
    // `assertShelvesAreWellFormed` has already proven this is an evergreen
    // shelf that exists; the guard keeps the narrowing honest.
    if (fallback?.kind !== "evergreen") continue;
    emit(fallback, resolveMembers(fallback, catalogue), shelf.id);
  }

  return rendered;
}
