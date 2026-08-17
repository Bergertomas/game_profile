"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/components/admin/forms";
import type { ActionResult } from "@/lib/admin/errors";

/**
 * The publish control: an attestation, a confirmation, and one button.
 *
 * Not `ActionForm`. That component is the right shape for saving a field — it
 * reports "Saved." and re-enables — and every one of its habits is wrong here.
 * Publication is not a save: it is irreversible in the sense that matters,
 * because the version it supersedes becomes immutable history the moment it
 * commits. So this form is deliberately harder to submit than any other in the
 * tool.
 *
 * Three separate hurdles, each answering a different way this goes wrong:
 *
 *   1. The button is disabled while any blocking issue stands, because the
 *      database will refuse anyway and a refusal is a worse teacher than a
 *      disabled control with the reasons listed above it.
 *   2. The spoiler attestation must be ticked. §8.8 requires the check and no
 *      program can perform it, so the honest implementation records that a
 *      person made it. The server requires it too — a form is not a guarantee.
 *   3. A typed confirmation of the scope being published. Publishing the wrong
 *      scope of a multi-scope game is the plausible mistake here: the pages
 *      look alike, and the tab that is open is not always the tab that is
 *      being read.
 */
export function PublishPanel({
  action,
  canPublish,
  gameTitle,
  scopeLabel,
}: {
  action: (previous: ActionState, form: FormData) => Promise<ActionResult>;
  canPublish: boolean;
  gameTitle: string;
  scopeLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    null,
  );
  const [attested, setAttested] = useState(false);
  const [typed, setTyped] = useState("");
  const attestId = useId();
  const confirmId = useId();

  const confirmation = scopeLabel;
  const confirmed = typed.trim().toLowerCase() === confirmation.toLowerCase();
  const ready = canPublish && attested && confirmed;

  return (
    <form action={formAction}>
      <label
        htmlFor={attestId}
        className="mb-3 flex cursor-pointer items-start gap-2 text-[0.85rem] leading-relaxed"
      >
        <input
          id={attestId}
          name="spoilerReviewed"
          type="checkbox"
          checked={attested}
          onChange={(event) => setAttested(event.target.checked)}
          className="mt-1"
        />
        <span>
          I have read this profile for spoilers. Nothing in it reveals more of{" "}
          <strong>{gameTitle}</strong> than a reader deciding whether to play it
          should be told.
        </span>
      </label>

      <label
        htmlFor={confirmId}
        className="mb-1 block text-[0.85rem] leading-relaxed"
      >
        Type the scope being published — <strong>{confirmation}</strong> — to
        confirm.
      </label>
      <input
        id={confirmId}
        type="text"
        value={typed}
        autoComplete="off"
        onChange={(event) => setTyped(event.target.value)}
        className="mb-3 w-full max-w-sm rounded-sm border border-rule bg-page-sunk px-2 py-1.5 text-[0.85rem]"
      />

      <div className="flex items-center gap-3">
        <Submit disabled={!ready} />
        {!canPublish ? (
          <p className="m-0 text-[0.82rem] text-ink-quiet">
            Blocked by the issues above.
          </p>
        ) : null}
        {state && !state.ok ? (
          <p role="alert" className="m-0 text-[0.82rem] text-signal-ink">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="sip-display cursor-pointer rounded-sm border border-ink bg-graphite px-3 py-1.5 text-[0.82rem] tracking-wide text-bone disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Publishing…" : "Publish"}
    </button>
  );
}
