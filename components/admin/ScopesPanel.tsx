import {
  createScopeAction,
  deleteScopeAction,
  setPrimaryScopeAction,
  updateScopeAction,
} from "@/app/admin/actions";
import {
  ActionButton,
  ActionForm,
  Disclosure,
  Field,
  TextArea,
  TextInput,
} from "@/components/admin/forms";
import {
  DefinitionRow,
  Empty,
  Notice,
  Panel,
  Pill,
  PublicAddress,
} from "@/components/admin/ui";
import type { GameAdminView, ScopeAdminView } from "@/lib/admin/games";
import { primaryPublicationBlockers } from "@/lib/admin/games";

/**
 * Profile scopes, primacy, and evaluation history.
 *
 * The part of the editorial tool that has to teach a model rather than just
 * collect fields. Three things an editor must be able to see without database
 * vocabulary (§8.3):
 *
 *  - Game → Profile Scope → Evaluation History, as a shape;
 *  - which scope owns the game's own URL, and that moving it is a deliberate,
 *    separate act from reordering a list;
 *  - why a scope cannot be published before the primary, stated before the
 *    database refuses rather than as a constraint violation afterwards.
 */
export function ScopesPanel({ game }: { game: GameAdminView }) {
  const blockers = primaryPublicationBlockers(game);
  const hasPrimary = game.scopes.some((scope) => scope.isPrimary);

  return (
    <>
      <Panel
        title="Profile scopes"
        description={
          <>
            A scope is one evaluated experience of this game, and the durable
            identity of its evaluation series. A game with two genuinely
            different experiences — a survival mode and a story campaign —
            publishes two profiles, because neither summarises the other.
          </>
        }
      >
        {game.scopes.length === 0 ? (
          <Empty>
            No scopes yet. Every game needs at least one; the first one created
            becomes the primary automatically.
          </Empty>
        ) : null}

        {game.scopes.length > 0 && !hasPrimary ? (
          <Notice tone="blocked">
            This game has no primary scope, so <code>/games/{game.slug}</code>{" "}
            would have nothing to answer with and nothing here can be published.
            Choose one below.
          </Notice>
        ) : null}

        {blockers.map((blocker) => (
          <Notice
            key={`${blocker.scopeKey}-${blocker.rubricVersion}`}
            tone="blocked"
          >
            {blocker.message}
          </Notice>
        ))}

        <ul className="m-0 list-none p-0">
          {game.scopes.map((scope) => (
            <ScopeRow key={scope.id} game={game} scope={scope} />
          ))}
        </ul>
      </Panel>

      <Panel
        title="Add a profile scope"
        description="Only when this game has a second experience that a single evaluation would misrepresent. Most games have exactly one."
      >
        <ActionForm
          action={createScopeAction.bind(null, game.id)}
          submitLabel="Add scope"
        >
          <div className="grid gap-x-5 sm:grid-cols-2">
            <Field
              name="key"
              label="Key"
              hint="Stable handle, and part of the sibling URL. Lowercase and hyphenated."
            >
              <TextInput name="key" required placeholder="wintermute" />
            </Field>
            <Field
              name="label"
              label="Public label"
              hint="What a reader sees, e.g. Wintermute."
            >
              <TextInput name="label" required />
            </Field>
            <Field
              name="displayOrder"
              label="Display order"
              hint="Listing order only. It has no bearing on which scope is primary."
            >
              <TextInput
                name="displayOrder"
                type="number"
                defaultValue={game.scopes.length + 1}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field
                name="summary"
                label="Summary"
                hint="What this scope covers, and what it deliberately excludes."
              >
                <TextArea name="summary" />
              </Field>
            </div>
          </div>
        </ActionForm>
      </Panel>
    </>
  );
}

function ScopeRow({
  game,
  scope,
}: {
  game: GameAdminView;
  scope: ScopeAdminView;
}) {
  // Any evaluation freezes the key, not only a published one: a draft is what
  // an editor is about to publish, and renaming underneath it is the same
  // mistake arriving a day earlier.
  const locked = scope.evaluations.length > 0;
  const published = scope.evaluations.filter((e) => e.status === "published");
  const inProgress = scope.evaluations.filter(
    (e) => e.status === "draft" || e.status === "review",
  );

  return (
    <li className="mb-5 border-b border-rule pb-5 last:mb-0 last:border-b-0 last:pb-0">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="sip-display m-0 text-[1rem]">{scope.label}</h3>
        {scope.isPrimary ? (
          <Pill tone="live">primary</Pill>
        ) : (
          <Pill>sibling</Pill>
        )}
        <PublicAddress
          slug={game.slug}
          scopeKey={scope.key}
          isPrimary={scope.isPrimary}
        />
        {!scope.isPrimary ? (
          <span className="ml-auto">
            <ActionButton
              action={setPrimaryScopeAction.bind(null, game.id, scope.id)}
              label="Make primary"
              confirm={`Move the canonical URL to “${scope.label}”?\n\n/games/${game.slug} will serve this scope instead. The scope that is primary today becomes a sibling at /games/${game.slug}/<its key>.\n\nThis changes public addresses. It is not a presentation change.`}
            />
          </span>
        ) : null}
      </div>

      {scope.summary ? (
        <p className="mb-2 mt-0 text-[0.88rem] text-ink-soft">
          {scope.summary}
        </p>
      ) : null}

      <dl className="m-0 mb-3">
        <DefinitionRow term="Key">
          <code className="text-[0.85rem]">{scope.key}</code>
        </DefinitionRow>
        <DefinitionRow term="Display order">{scope.displayOrder}</DefinitionRow>
        <DefinitionRow term="Published under">
          {scope.publishedRubricVersions.length > 0
            ? scope.publishedRubricVersions.map((v) => `rubric ${v}`).join(", ")
            : "nothing published"}
        </DefinitionRow>
      </dl>

      <EvaluationHistory
        published={published}
        inProgress={inProgress}
        all={scope.evaluations}
      />

      <Disclosure summary="Edit this scope">
        <div className="border-l-2 border-rule pl-4">
          {locked ? (
            <Notice>
              The key <code>{scope.key}</code> is fixed: this scope has
              evaluation history, and the key is both the identity that history
              hangs from and part of the profile&rsquo;s public address.
              Renaming it is migration work rather than an edit. Everything else
              here can still be changed freely.
            </Notice>
          ) : (
            <Notice tone="warning">
              The key is part of this scope&rsquo;s public URL and can still be
              corrected, because no evaluation has been written against it yet.
              It stops being editable as soon as one is.
            </Notice>
          )}
          <ActionForm
            action={updateScopeAction.bind(null, game.id, scope.id)}
            submitLabel="Save scope"
          >
            <div className="grid gap-x-5 sm:grid-cols-2">
              {locked ? (
                // Submitted unchanged so the form still validates, and refused
                // server-side if it ever arrives altered — an absent input is a
                // courtesy, not a control.
                <div className="mb-3">
                  <p className="mb-1 mt-0 text-[0.78rem] uppercase tracking-wide text-ink-quiet">
                    Key
                  </p>
                  <input type="hidden" name="key" value={scope.key} />
                  <code className="text-[0.9rem] text-ink-soft">{scope.key}</code>
                </div>
              ) : (
                <Field name="key" label="Key">
                  <TextInput name="key" defaultValue={scope.key} required />
                </Field>
              )}
              <Field name="label" label="Public label">
                <TextInput name="label" defaultValue={scope.label} required />
              </Field>
              <Field name="displayOrder" label="Display order">
                <TextInput
                  name="displayOrder"
                  type="number"
                  defaultValue={scope.displayOrder}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field name="summary" label="Summary">
                  <TextArea name="summary" defaultValue={scope.summary} />
                </Field>
              </div>
            </div>
          </ActionForm>

          {scope.evaluations.length === 0 ? (
            <div className="mt-3">
              <ActionButton
                action={deleteScopeAction.bind(null, game.id, scope.id)}
                label="Delete this scope"
                confirm={`Delete the scope “${scope.label}”? It has no evaluations, so nothing is lost.`}
              />
            </div>
          ) : (
            <p className="mb-0 mt-3 text-[0.78rem] text-ink-quiet">
              This scope has evaluation history and cannot be deleted. A scope
              is the identity that history hangs from.
            </p>
          )}
        </div>
      </Disclosure>
    </li>
  );
}

/**
 * Evaluation history for one scope.
 *
 * Read-only in Phase 2B: authoring is 2C and publication is 2D. It is here now
 * because §8.3 requires an editor to understand Game → Profile Scope →
 * Evaluation History, and a scope with invisible history is one whose purpose
 * is invisible too.
 */
function EvaluationHistory({
  published,
  inProgress,
  all,
}: {
  published: readonly { id: string }[];
  inProgress: readonly { id: string }[];
  all: ScopeAdminView["evaluations"];
}) {
  if (all.length === 0) {
    return (
      <Empty>
        No evaluations yet. Authoring arrives with the evaluation editor.
      </Empty>
    );
  }

  return (
    <div>
      <h4 className="m-0 mb-1 text-[0.78rem] uppercase tracking-wide text-ink-quiet">
        Evaluation history — {all.length} version{all.length === 1 ? "" : "s"},{" "}
        {published.length} published, {inProgress.length} in progress
      </h4>
      <ol className="m-0 list-none p-0">
        {all.map((evaluation) => (
          <li
            key={evaluation.id}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule py-1.5 text-[0.85rem] last:border-b-0"
          >
            <span className="tabular-nums text-ink-soft">
              v{evaluation.versionNumber}
            </span>
            <span className="text-ink-quiet">
              rubric {evaluation.rubricVersion}
            </span>
            <Pill
              tone={
                evaluation.status === "published"
                  ? "live"
                  : evaluation.status === "superseded"
                    ? "past"
                    : "draft"
              }
            >
              {evaluation.status}
            </Pill>
            <span className="text-ink-soft">{evaluation.modeScope}</span>
            {evaluation.publishedAt ? (
              <span className="text-ink-quiet">
                published {evaluation.publishedAt.slice(0, 10)}
              </span>
            ) : null}
            {evaluation.supersedesEvaluationId ? (
              <span className="text-ink-quiet">
                replaces an earlier version
              </span>
            ) : null}
            {evaluation.changeSummary ? (
              <span className="w-full text-ink-soft">
                {evaluation.changeSummary}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
