import { notFound } from "next/navigation";
import {
  addAliasAction,
  removeAliasAction,
  removeArtworkAction,
  removeExternalIdAction,
  removePlatformAction,
  updateGameAction,
  upsertArtworkAction,
  upsertExternalIdAction,
  upsertPlatformAction,
} from "@/app/admin/actions";
import {
  ActionButton,
  ActionForm,
  Disclosure,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/forms";
import { ScopesPanel } from "@/components/admin/ScopesPanel";
import { AdminLink, Empty, Notice, Panel, Pill } from "@/components/admin/ui";
import {
  readGamePage,
  type ArtworkAdminView,
  type GameAdminView,
} from "@/lib/admin/games";

/**
 * One game, and everything that hangs off it.
 *
 * The order of the panels is the order an editor thinks in: what the game is,
 * what it is also called, where it runs, what other systems call it, what it
 * looks like, and then which experiences of it are evaluated.
 */
export default async function AdminGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // A malformed id would otherwise reach Postgres as an invalid uuid and throw
  // rather than 404. An unknown game is a missing page, not a fault.
  if (!isUuid(id)) notFound();

  const { game, platforms } = await readGamePage(id);
  if (!game) notFound();

  const attached = new Set(
    game.platforms.map((platform) => platform.platformId),
  );
  // A slug is a working title until something publishes at it; after that it is
  // an address people hold. Same reasoning as a scope key, one level up.
  const slugIsFixed = game.scopes.some(
    (scope) => scope.publishedRubricVersions.length > 0,
  );
  const available = platforms.filter((platform) => !attached.has(platform.id));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="sip-display m-0 text-[1.6rem]">{game.canonicalTitle}</h1>
        <code className="text-[0.85rem] text-ink-quiet">
          /games/{game.slug}
        </code>
        <span className="ml-auto text-[0.82rem]">
          <AdminLink href="/admin/games">All games</AdminLink>
        </span>
      </div>

      <Panel title="Identity">
        <ActionForm
          action={updateGameAction.bind(null, game.id)}
          submitLabel="Save game"
        >
          <>
            <Field name="canonicalTitle" label="Canonical title">
              <TextInput
                name="canonicalTitle"
                defaultValue={game.canonicalTitle}
                required
              />
            </Field>
            {slugIsFixed ? (
              // Submitted unchanged so the form still validates, and refused
              // server-side if it ever arrives altered.
              <div className="mb-3">
                <p className="mb-1 mt-0 text-[0.78rem] uppercase tracking-wide text-ink-quiet">
                  Slug
                </p>
                <input type="hidden" name="slug" value={game.slug} />
                <code className="text-[0.9rem] text-ink-soft">{game.slug}</code>
                <p className="mb-0 mt-1 text-[0.78rem] text-ink-soft">
                  Fixed: this game publishes a profile at{" "}
                  <code>/games/{game.slug}</code>. Changing it would break every
                  link and search result pointing there, and nothing would
                  redirect them. Renaming a published game is migration work.
                </p>
              </div>
            ) : (
              <Field
                name="slug"
                label="Slug"
                hint="Still editable because nothing is published at this address yet. It is fixed once a profile publishes."
              >
                <TextInput name="slug" defaultValue={game.slug} required />
              </Field>
            )}
            <Field
              name="summary"
              label="Summary"
              hint="One factual sentence about the game. The evaluative one-liner belongs to an evaluation."
            >
              <TextArea name="summary" defaultValue={game.summary} />
            </Field>
            <div className="grid gap-x-5 sm:grid-cols-2">
              <Field name="developerText" label="Developer">
                <TextInput
                  name="developerText"
                  defaultValue={game.developerText}
                />
              </Field>
              <Field name="publisherText" label="Publisher">
                <TextInput
                  name="publisherText"
                  defaultValue={game.publisherText}
                />
              </Field>
              <Field name="releaseStatus" label="Release state">
                <Select
                  name="releaseStatus"
                  required
                  defaultValue={game.releaseStatus}
                  options={[
                    { value: "released", label: "Released" },
                    { value: "upcoming", label: "Upcoming" },
                    { value: "early_access", label: "Early access" },
                  ]}
                />
              </Field>
              <Field name="firstReleaseDate" label="First release date">
                <TextInput
                  name="firstReleaseDate"
                  type="date"
                  defaultValue={game.firstReleaseDate}
                />
              </Field>
            </div>
          </>
        </ActionForm>
      </Panel>

      <Panel
        title="Alternate titles"
        description="Abbreviations, regional titles and working titles. These become the game's alternateName in structured data and, later, search aliases."
      >
        {game.aliases.length === 0 ? (
          <Empty>No alternate titles.</Empty>
        ) : (
          <ul className="m-0 mb-4 list-none p-0">
            {game.aliases.map((alias) => (
              <li
                key={alias.alias}
                className="flex flex-wrap items-baseline gap-x-3 border-b border-rule py-1.5 last:border-b-0"
              >
                <span className="text-[0.9rem]">{alias.alias}</span>
                {alias.aliasType ? (
                  <Pill tone="past">{alias.aliasType}</Pill>
                ) : null}
                <span className="ml-auto">
                  <ActionButton
                    action={removeAliasAction.bind(null, game.id, alias.alias)}
                    label="Remove"
                    confirm={`Remove the alternate title “${alias.alias}”?`}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}

        <ActionForm
          action={addAliasAction.bind(null, game.id)}
          submitLabel="Add title"
        >
          <div className="grid gap-x-5 sm:grid-cols-2">
            <Field name="alias" label="Alternate title">
              <TextInput name="alias" required />
            </Field>
            <Field
              name="aliasType"
              label="Kind"
              hint="Optional, e.g. abbreviation or regional."
            >
              <TextInput name="aliasType" />
            </Field>
          </div>
        </ActionForm>
      </Panel>

      <Panel
        title="Platforms"
        description="What the game ships on. A platform must be attached here before an evaluation can record a platform-specific override for it."
      >
        {game.platforms.length === 0 ? (
          <Empty>No platforms attached.</Empty>
        ) : (
          <ul className="m-0 mb-4 list-none p-0">
            {game.platforms.map((platform) => (
              <li
                key={platform.platformId}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule py-1.5 last:border-b-0"
              >
                <span className="text-[0.9rem]">{platform.name}</span>
                <code className="text-[0.78rem] text-ink-quiet">
                  {platform.slug}
                </code>
                {platform.releaseDate ? (
                  <span className="text-[0.82rem] text-ink-soft">
                    released {platform.releaseDate}
                  </span>
                ) : null}
                {platform.performanceNotes ? (
                  <span className="w-full text-[0.82rem] text-ink-soft">
                    {platform.performanceNotes}
                  </span>
                ) : null}
                <span className="ml-auto">
                  <ActionButton
                    action={removePlatformAction.bind(
                      null,
                      game.id,
                      platform.platformId,
                    )}
                    label="Detach"
                    confirm={`Detach ${platform.name} from this game?\n\nThis is refused if an evaluation records a platform-specific override for it.`}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}

        {available.length === 0 ? (
          <Empty>Every known platform is already attached.</Empty>
        ) : (
          <ActionForm
            action={upsertPlatformAction.bind(null, game.id)}
            submitLabel="Attach platform"
          >
            <div className="grid gap-x-5 sm:grid-cols-3">
              <Field name="platformId" label="Platform">
                <Select
                  name="platformId"
                  required
                  options={available.map((platform) => ({
                    value: platform.id,
                    label: platform.name,
                  }))}
                />
              </Field>
              <Field name="releaseDate" label="Release date">
                <TextInput name="releaseDate" type="date" />
              </Field>
              <Field
                name="performanceNotes"
                label="Performance notes"
                hint="Factual context only. A materially different score is an override on an evaluation, not a note here."
              >
                <TextInput name="performanceNotes" />
              </Field>
            </div>
          </ActionForm>
        )}
      </Panel>

      <Panel
        title="Provider IDs"
        description="Third-party identifiers, kept off the game row deliberately so the catalogue never depends on one supplier's terms staying as they are."
      >
        {game.externalIds.length === 0 ? (
          <Empty>No provider IDs recorded.</Empty>
        ) : (
          <ul className="m-0 mb-4 list-none p-0">
            {game.externalIds.map((entry) => (
              <li
                key={entry.provider}
                className="flex flex-wrap items-baseline gap-x-3 border-b border-rule py-1.5 last:border-b-0"
              >
                <span className="text-[0.9rem]">{entry.provider}</span>
                <code className="text-[0.8rem] text-ink-soft">
                  {entry.externalId}
                </code>
                {entry.externalUrl ? (
                  <a
                    href={entry.externalUrl}
                    rel="noreferrer noopener"
                    target="_blank"
                    className="text-[0.8rem] text-ink-soft"
                  >
                    open
                  </a>
                ) : null}
                <span className="ml-auto">
                  <ActionButton
                    action={removeExternalIdAction.bind(
                      null,
                      game.id,
                      entry.provider,
                    )}
                    label="Remove"
                    confirm={`Remove the ${entry.provider} ID?`}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}

        <ActionForm
          action={upsertExternalIdAction.bind(null, game.id)}
          submitLabel="Save provider ID"
        >
          <div className="grid gap-x-5 sm:grid-cols-3">
            <Field name="provider" label="Provider" hint="e.g. igdb, rawg.">
              <TextInput name="provider" required />
            </Field>
            <Field name="externalId" label="ID">
              <TextInput name="externalId" required />
            </Field>
            <Field name="externalUrl" label="URL">
              <TextInput name="externalUrl" type="url" />
            </Field>
          </div>
        </ActionForm>
      </Panel>

      <ArtworkPanel game={game} />

      <ScopesPanel game={game} />
    </>
  );
}

/**
 * Artwork, which is a rights record that happens to carry a URL.
 *
 * Clearance and basis are required with no default, because ADR 0011 exists to
 * stop a bare URL from implying permission: a reachable image is not a usable
 * one, and the editor has to answer both questions in the act of pasting it.
 */
function ArtworkPanel({ game }: { game: GameAdminView }) {
  const byRole = new Map(game.artwork.map((record) => [record.role, record]));

  return (
    <Panel
      title="Artwork"
      description="Two roles, two different jobs: a 3:4 cover and a wide hero. Cropping one into the other produces the stretched, subject-clipped banner the design exists to avoid."
    >
      <Notice tone="warning">
        Production renders <strong>production-cleared</strong> artwork only.
        Evaluation-cleared records appear on design and preview surfaces and are
        excluded from production builds in the query itself, so an uncleared URL
        cannot reach production output at all.
      </Notice>

      {(["cover", "hero"] as const).map((role) => (
        <ArtworkForm
          key={role}
          gameId={game.id}
          role={role}
          record={byRole.get(role)}
        />
      ))}
    </Panel>
  );
}

function ArtworkForm({
  gameId,
  role,
  record,
}: {
  gameId: string;
  role: "cover" | "hero";
  record?: ArtworkAdminView;
}) {
  return (
    <Disclosure
      defaultOpen={!record}
      summary={
        <>
          {role === "cover" ? "Cover" : "Hero"}
          {record ? (
            <>
              {" — "}
              <span className="text-ink-soft">{record.source}</span>{" "}
              <Pill tone={record.clearance === "production" ? "live" : "draft"}>
                {record.clearance}
              </Pill>
            </>
          ) : (
            <span className="text-ink-quiet"> — none recorded</span>
          )}
        </>
      }
    >
      <div>
        <ActionForm
          action={upsertArtworkAction.bind(null, gameId)}
          submitLabel={record ? "Replace artwork" : "Record artwork"}
        >
          <>
            <input type="hidden" name="role" value={role} />
            <Field name="url" label="Image URL">
              <TextInput
                name="url"
                type="url"
                defaultValue={record?.url}
                required
              />
            </Field>
            <div className="grid gap-x-5 sm:grid-cols-2">
              <Field name="width" label="Width (px)">
                <TextInput
                  name="width"
                  type="number"
                  defaultValue={record?.width}
                  required
                />
              </Field>
              <Field name="height" label="Height (px)">
                <TextInput
                  name="height"
                  type="number"
                  defaultValue={record?.height}
                  required
                />
              </Field>
              <Field
                name="clearance"
                label="Clearance"
                hint="May this appear on the public production site?"
              >
                <Select
                  name="clearance"
                  required
                  defaultValue={record?.clearance}
                  options={[
                    {
                      value: "production",
                      label: "Production — may render publicly",
                    },
                    {
                      value: "evaluation",
                      label: "Evaluation — internal surfaces only",
                    },
                  ]}
                />
              </Field>
              <Field
                name="basis"
                label="Basis"
                hint="What the asset is held on. Recorded for audit; no rendering code reads it."
              >
                <Select
                  name="basis"
                  required
                  defaultValue={record?.basis}
                  options={[
                    { value: "licence", label: "Licence" },
                    { value: "provider-terms", label: "Provider terms" },
                    { value: "press-kit", label: "Press kit" },
                    { value: "permission", label: "Direct permission" },
                    {
                      value: "internal-evaluation",
                      label: "Internal evaluation",
                    },
                  ]}
                />
              </Field>
              <Field
                name="source"
                label="Source"
                hint="manual, rawg, press-kit…"
              >
                <TextInput
                  name="source"
                  defaultValue={record?.source}
                  required
                />
              </Field>
              <Field name="externalId" label="Provider asset ID">
                <TextInput
                  name="externalId"
                  defaultValue={record?.externalId}
                />
              </Field>
              <Field name="credit" label="Credit">
                <TextInput name="credit" defaultValue={record?.credit} />
              </Field>
              <Field name="sourcePage" label="Source page">
                <TextInput
                  name="sourcePage"
                  type="url"
                  defaultValue={record?.sourcePage}
                />
              </Field>
              <Field name="retrievedAt" label="Retrieved">
                <TextInput
                  name="retrievedAt"
                  type="date"
                  defaultValue={record?.retrievedAt}
                />
              </Field>
              <Field
                name="focus"
                label="Crop focus"
                hint="CSS object-position, e.g. center 32%."
              >
                <TextInput name="focus" defaultValue={record?.focus} />
              </Field>
            </div>
            <Field
              name="altText"
              label="Alt text"
              hint="Factual description of what the image shows. Never marketing copy."
            >
              <TextArea
                name="altText"
                defaultValue={record?.altText}
                rows={2}
              />
            </Field>
          </>
        </ActionForm>

        {record ? (
          <div className="mt-3">
            <ActionButton
              action={removeArtworkAction.bind(null, gameId, role)}
              label={`Remove ${role}`}
              confirm={`Remove the ${role} artwork record? The game falls back to the designed artless composition, which is a finished state rather than a gap.`}
            />
          </div>
        ) : null}
      </div>
    </Disclosure>
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
