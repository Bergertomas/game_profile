import { createGameAction } from "@/app/admin/actions";
import {
  ActionForm,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/forms";
import { Notice, Panel } from "@/components/admin/ui";

/**
 * Manual game creation.
 *
 * Metadata import (Phase 3) populates these same fields rather than creating a
 * parallel game model (§8.3), so the fields here are the whole of what a game
 * is: identity, address, credits, release state. Scopes, artwork and provider
 * IDs are added on the game's own page once it exists — a creation form that
 * asked for everything at once would demand decisions before there is anything
 * to decide them about.
 */
export default function NewGamePage() {
  return (
    <>
      <h1 className="sip-display mb-6 text-[1.6rem]">Add a game</h1>

      <Panel title="Identity">
        <Notice>
          The slug is this game&rsquo;s public address and is hard to change
          later without losing inbound links. Its primary profile will answer{" "}
          <code>/games/&lt;slug&gt;</code>.
        </Notice>

        <ActionForm action={createGameAction} submitLabel="Create game">
          <>
            <Field name="canonicalTitle" label="Canonical title">
              <TextInput name="canonicalTitle" required />
            </Field>

            <Field
              name="slug"
              label="Slug"
              hint="Lowercase, hyphen-separated. For example alan-wake-2."
            >
              <TextInput name="slug" required placeholder="alan-wake-2" />
            </Field>

            <Field
              name="summary"
              label="Summary"
              hint="One factual sentence about the game itself. Not an evaluation — that belongs to a specific profile scope."
            >
              <TextArea name="summary" />
            </Field>

            <div className="grid gap-x-5 sm:grid-cols-2">
              <Field name="developerText" label="Developer">
                <TextInput name="developerText" />
              </Field>
              <Field name="publisherText" label="Publisher">
                <TextInput name="publisherText" />
              </Field>
              <Field name="releaseStatus" label="Release state">
                <Select
                  name="releaseStatus"
                  required
                  defaultValue="released"
                  options={[
                    { value: "released", label: "Released" },
                    { value: "upcoming", label: "Upcoming" },
                    { value: "early_access", label: "Early access" },
                  ]}
                />
              </Field>
              <Field name="firstReleaseDate" label="First release date">
                <TextInput name="firstReleaseDate" type="date" />
              </Field>
            </div>
          </>
        </ActionForm>
      </Panel>
    </>
  );
}
