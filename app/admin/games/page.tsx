import { readGamesPage } from "@/lib/admin/games";
import { AdminLink, Empty, Panel, Pill } from "@/components/admin/ui";

/** The whole catalogue, in title order. */
export default async function AdminGamesPage() {
  const games = await readGamesPage();

  return (
    <>
      <h1 className="sip-display mb-6 text-[1.6rem]">Games</h1>

      <Panel
        title={`${games.length} game${games.length === 1 ? "" : "s"}`}
        actions={<AdminLink href="/admin/games/new">Add a game</AdminLink>}
      >
        {games.length === 0 ? (
          <Empty>
            No games yet.{" "}
            <AdminLink href="/admin/games/new">Create the first one</AdminLink>.
          </Empty>
        ) : (
          <table className="w-full border-collapse text-[0.88rem]">
            <thead>
              <tr className="border-b border-rule-strong text-left">
                <th
                  scope="col"
                  className="py-2 pr-3 font-normal text-ink-quiet"
                >
                  Title
                </th>
                <th
                  scope="col"
                  className="py-2 pr-3 font-normal text-ink-quiet"
                >
                  Address
                </th>
                <th
                  scope="col"
                  className="py-2 pr-3 font-normal text-ink-quiet"
                >
                  Scopes
                </th>
                <th scope="col" className="py-2 font-normal text-ink-quiet">
                  State
                </th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr
                  key={game.id}
                  className="border-b border-rule last:border-b-0"
                >
                  <td className="py-2 pr-3">
                    <AdminLink href={`/admin/games/${game.id}`}>
                      {game.canonicalTitle}
                    </AdminLink>
                  </td>
                  <td className="py-2 pr-3">
                    <code className="text-[0.8rem] text-ink-soft">
                      /games/{game.slug}
                    </code>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{game.scopeCount}</td>
                  <td className="py-2">
                    <span className="flex flex-wrap items-center gap-2">
                      {game.publishedCount > 0 ? (
                        <Pill tone="live">{game.publishedCount} published</Pill>
                      ) : null}
                      {game.draftCount > 0 ? (
                        <Pill tone="draft">{game.draftCount} in progress</Pill>
                      ) : null}
                      {game.publishedCount === 0 && game.draftCount === 0 ? (
                        <Pill tone="past">no evaluations</Pill>
                      ) : null}
                      {!game.hasPrimaryScope && game.scopeCount > 0 ? (
                        <Pill>no primary scope</Pill>
                      ) : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
