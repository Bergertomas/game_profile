import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLink, Empty, Notice, Panel, Pill } from "@/components/admin/ui";
import {
  groupByRubricGeneration,
  readScopeHistoryPage,
} from "@/lib/admin/evaluations";
import { PUBLIC_RUBRIC_VERSION } from "@/lib/data/games";

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

  /*
   * Grouped by rubric generation, because a flat list cannot be ordered.
   *
   * Version numbers are per `(scope, rubric)` — the database says so in
   * `evaluations_scope_version` — so they restart at 1 for every generation.
   * Sorting the whole series by version number therefore puts a later rubric's
   * v1 *below* an earlier rubric's v3 and labels the result "newest first",
   * which is precisely backwards for the generation an editor is here for.
   *
   * Generations are ordered by `rubric_versions.locked_at`, which is real
   * chronology recorded in the database, with the version string as a
   * deterministic tiebreak. Never by comparing version numbers across
   * generations: those numbers are not comparable.
   */
  const generations = groupByRubricGeneration(history.evaluations).map(
    (generation) => ({
      ...generation,
      isPublicRubric: generation.rubricVersion === PUBLIC_RUBRIC_VERSION,
    }),
  );

  // Predecessor lookup stays within a lineage: supersession never crosses one.
  const byId = new Map(history.evaluations.map((row) => [row.id, row]));
  const published = history.evaluations.filter((v) => v.status === "published");
  const total = history.evaluations.length;

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
        versions are immutable snapshots — they are the editorial publication
        record, so nothing here can be edited. Being published is not the same
        as having been served: whether any particular version reached production
        depends on a later build and deployment, which this tool does not yet
        track.
      </p>

      {published.length === 0 ? (
        <Notice tone="info">
          This scope has never published. Nothing about it is public yet.
        </Notice>
      ) : null}

      {total === 0 ? (
        <Empty>No evaluations have been started for this scope.</Empty>
      ) : null}

      {generations.map((generation) => (
        <Panel
          key={generation.rubricVersion}
          title={`Rubric ${generation.rubricVersion}${
            generation.isPublicRubric ? " — current" : ""
          }`}
          description={
            `${generation.versions.length} ${
              generation.versions.length === 1 ? "version" : "versions"
            }, newest first. ` +
            (generation.isPublicRubric
              ? "This is the rubric the public site reads."
              : /*
                 * Neutral about direction, deliberately.
                 *
                 * Calling a non-public generation the older one is false
                 * whenever a newer rubric is being authored before it becomes
                 * the public rubric — the state every rubric migration passes
                 * through, and the one the rubric-generation tests describe.
                 * Direction would have to be derived by comparing this
                 * generation's locked date against the public rubric's, and
                 * nothing here does that. What is known is only that the public
                 * site does not read this generation, so that is all this says.
                 */
                "This is not the rubric currently read by the public site. Its version numbers belong to this generation and do not continue into, or from, another generation.")
          }
        >
          <ol className="m-0 list-none space-y-4 p-0">
            {generation.versions.map((version) => {
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
                      Supersedes version {predecessor.versionNumber} of rubric{" "}
                      {predecessor.rubricVersion}.
                    </p>
                  ) : null}

                  <p className="m-0 mt-2 flex flex-wrap gap-x-4 text-[0.82rem]">
                    <AdminLink href={`/admin/evaluations/${version.id}/preview`}>
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
        </Panel>
      ))}
    </>
  );
}