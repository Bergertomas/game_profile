import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLink, Empty, Notice, Panel, Pill } from "@/components/admin/ui";
import { readScopeHistoryPage } from "@/lib/admin/evaluations";

/**
 * One scope's evaluation series — Phase 2D revision history.
 *
 * ── Admin-only, deliberately ───────────────────────────────────────────────
 *
 * Master Plan §17.2 lists "revision-history public presentation and how much
 * history is exposed" as an open decision, and it stays open: this reads
 * superseded rows for editors and changes nothing about the public reader,
 * which still selects `status = 'published'` and nothing else. Publishing a
 * history view is a promise to keep publishing one, and there is not yet enough
 * real history to know what shape that promise should take.
 *
 * ── Why every version links to a preview ───────────────────────────────────
 *
 * Because it can. `readEvaluationProfile` loads any evaluation by id whatever
 * its status, so a superseded version renders through the same public renderer
 * as a draft or the currently published version. That makes "what did this
 * profile say in March" answerable by looking at it, rather than by reading a
 * diff of rows —
 * and it costs nothing, because it is the same code path the preview already
 * needed.
 *
 * ── The chain, not a list ──────────────────────────────────────────────────
 *
 * `supersedes_evaluation_id` makes the series a chain, and the database
 * enforces one final successor per predecessor. Rendering it as a flat list
 * would lose the one thing history is for: which version replaced which.
 */
export default async function ScopeHistoryPage({
  params,
}: {
  params: Promise<{ scopeId: string }>;
}) {
  const { scopeId } = await params;
  const history = await readScopeHistoryPage(scopeId);
  if (!history) notFound();

  // Newest first: the current answer is the one an editor is usually here for,
  // and history reads downward into the past.
  const versions = [...history.evaluations].sort(
    (a, b) => b.versionNumber - a.versionNumber,
  );
  const byId = new Map(versions.map((version) => [version.id, version]));
  const published = versions.filter((v) => v.status === "published");

  return (
    <>
      <nav className="mb-4 text-[0.8rem] text-ink-quiet" aria-label="Breadcrumb">
        <Link href="/admin/games" className="text-ink-soft">
          Games
        </Link>
        {" / "}
        <Link href={`/admin/games/${history.gameId}`} className="text-ink-soft">
          {history.gameTitle}
        </Link>
        {" / "}
        <span>{history.scopeLabel}</span>
      </nav>

      <h1 className="sip-display mb-2 text-[1.5rem]">
        Evaluation history — {history.gameTitle}, {history.scopeLabel}
      </h1>
      <p className="mb-6 text-[0.85rem] leading-relaxed text-ink-soft">
        Every version of this scope&rsquo;s evaluation. Published and superseded
        versions are immutable snapshots — they are the record of what was
        public, so nothing here can be edited.
      </p>

      {published.length === 0 ? (
        <Notice tone="info">
          This scope has never published. Nothing about it is public yet.
        </Notice>
      ) : null}

      <Panel
        title={`${versions.length} ${versions.length === 1 ? "version" : "versions"}`}
        description="Newest first. Each links to the profile as that version renders it."
      >
        {versions.length === 0 ? (
          <Empty>No evaluations have been started for this scope.</Empty>
        ) : (
          <ol className="m-0 list-none space-y-4 p-0">
            {versions.map((version) => {
              const predecessor = version.supersedesEvaluationId
                ? byId.get(version.supersedesEvaluationId)
                : undefined;

              return (
                <li
                  key={version.id}
                  className="border-l-2 border-rule-strong pl-4"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="sip-display text-[1rem]">
                      Version {version.versionNumber}
                    </span>
                    <Pill>{version.status}</Pill>
                    <span className="text-[0.8rem] text-ink-quiet">
                      rubric {version.rubricVersion}
                    </span>
                    {version.publishedAt ? (
                      <span className="text-[0.8rem] text-ink-quiet">
                        published {version.publishedAt.slice(0, 10)}
                      </span>
                    ) : null}
                  </div>

                  <p className="m-0 mt-1 text-[0.82rem] text-ink-quiet">
                    {version.modeScope}
                  </p>

                  {version.changeSummary ? (
                    <p className="m-0 mt-1 text-[0.85rem] leading-relaxed text-ink-soft">
                      {version.changeSummary}
                    </p>
                  ) : null}

                  {predecessor ? (
                    <p className="m-0 mt-1 text-[0.8rem] text-ink-quiet">
                      Supersedes version {predecessor.versionNumber}.
                    </p>
                  ) : null}

                  <p className="m-0 mt-2 flex flex-wrap gap-x-4 text-[0.82rem]">
                    <AdminLink
                      href={`/admin/evaluations/${version.id}/preview`}
                    >
                      Preview this version
                    </AdminLink>
                    <AdminLink href={`/admin/evaluations/${version.id}`}>
                      {version.status === "draft" || version.status === "review"
                        ? "Continue authoring"
                        : "Inspect the snapshot"}
                    </AdminLink>
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
    </>
  );
}
