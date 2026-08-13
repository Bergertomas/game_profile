import { withAdminDatabase } from "@/lib/admin/db";
import { listGamesForAdmin, readDashboard } from "@/lib/admin/games";
import { AdminLink, Empty, Notice, Panel, Pill } from "@/components/admin/ui";

/**
 * The editorial dashboard.
 *
 * A foundation, not the reassessment queue. §8.7's queue — launched pre-release
 * games, large patches, stale cutoffs, broken evidence links, publication
 * awaiting deployment — needs evaluation authoring and a deployment state to
 * exist before it has anything true to say, and both are later phases. Showing
 * an empty queue now would misrepresent the system as watching for things it
 * cannot yet see.
 *
 * What is here is what Phase 2B can actually observe: the size of the
 * catalogue, and the two conditions an editor can act on today.
 */
export default async function AdminDashboard() {
  const { summary, games } = await withAdminDatabase(async (db) => ({
    summary: await readDashboard(db),
    games: await listGamesForAdmin(db),
  }));

  const recent = games.slice(0, 8);

  return (
    <>
      <h1 className="sip-display mb-6 text-[1.6rem]">Editorial dashboard</h1>

      <Panel title="Catalogue">
        <dl className="m-0 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Games" value={summary.games} />
          <Metric label="Profile scopes" value={summary.scopes} />
          <Metric
            label="Published profiles"
            value={summary.publishedProfiles}
          />
          <Metric label="Drafts and in review" value={summary.drafts} />
        </dl>
      </Panel>

      <Panel
        title="Needs attention"
        description="Conditions Phase 2B can observe. The reassessment queue arrives with evaluation authoring."
      >
        {summary.gamesWithoutPrimaryScope.length === 0 &&
        summary.evaluationOnlyArtwork === 0 ? (
          <Empty>Nothing to flag.</Empty>
        ) : null}

        {summary.gamesWithoutPrimaryScope.map((game) => (
          <Notice key={game.id} tone="blocked">
            <strong>{game.canonicalTitle}</strong> has profile scopes but no
            primary scope, so <code>/games/…</code> has nothing to answer with
            and the game cannot publish anything.{" "}
            <AdminLink href={`/admin/games/${game.id}`}>
              Choose a primary scope
            </AdminLink>
            .
          </Notice>
        ))}

        {summary.evaluationOnlyArtwork > 0 ? (
          <Notice tone="warning">
            {summary.evaluationOnlyArtwork} artwork record
            {summary.evaluationOnlyArtwork === 1 ? " is" : "s are"} cleared for
            evaluation only. These render on design and preview surfaces and are
            excluded from production builds by clearance, which the containment
            check verifies against the built artefact.
          </Notice>
        ) : null}
      </Panel>

      <Panel
        title="Games"
        description="Newest edits are not tracked yet; this is the catalogue in title order."
        actions={<AdminLink href="/admin/games">See all</AdminLink>}
      >
        {recent.length === 0 ? (
          <Empty>
            No games yet.{" "}
            <AdminLink href="/admin/games/new">Create the first one</AdminLink>.
          </Empty>
        ) : (
          <ul className="m-0 list-none p-0">
            {recent.map((game) => (
              <li
                key={game.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule py-2 last:border-b-0"
              >
                <AdminLink href={`/admin/games/${game.id}`}>
                  {game.canonicalTitle}
                </AdminLink>
                <code className="text-[0.78rem] text-ink-quiet">
                  /{game.slug}
                </code>
                <span className="ml-auto flex items-center gap-2">
                  {game.publishedCount > 0 ? (
                    <Pill tone="live">{game.publishedCount} published</Pill>
                  ) : null}
                  {game.draftCount > 0 ? (
                    <Pill tone="draft">{game.draftCount} in progress</Pill>
                  ) : null}
                  {!game.hasPrimaryScope && game.scopeCount > 0 ? (
                    <Pill>no primary scope</Pill>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="m-0 text-[0.78rem] uppercase tracking-wide text-ink-quiet">
        {label}
      </dt>
      <dd className="sip-display m-0 text-[1.7rem] tabular-nums">{value}</dd>
    </div>
  );
}
