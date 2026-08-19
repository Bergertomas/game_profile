"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/admin/errors";

/**
 * A button that performs one deployment action and says what happened.
 *
 * Not `ActionForm`, and not `useActionState`. Both are built around a form with
 * fields; these actions have none, and threading an empty `FormData` through
 * them only to ignore it would invite the next person to add a field to
 * something that should not have one.
 *
 * ── Why the outcome is shown rather than thrown ────────────────────────────
 *
 * Almost everything that goes wrong here is a state of the world rather than a
 * fault: Cloudflare refused, the origin was unreachable, a build is already in
 * flight, deployment is not configured. An error page for any of those would be
 * both alarming and useless. So the action returns a sentence and the sentence
 * appears next to the button that produced it.
 *
 * A pending action is disabled, because the actions that matter here are ones a
 * second click could duplicate — and while the server coalesces duplicate
 * requests, a control that invites a double-click is a control that will get
 * one.
 */
export function DeploymentAction({
  label,
  pendingLabel,
  run,
  emphasis = "normal",
  confirm,
}: {
  label: string;
  pendingLabel: string;
  run: () => Promise<ActionResult>;
  emphasis?: "normal" | "primary";
  /** Shown in a browser confirmation first. For actions that cost a build. */
  confirm?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const classes =
    emphasis === "primary"
      ? "border-ink bg-graphite text-bone hover:bg-ink"
      : "border-rule-strong bg-page text-ink hover:border-ink";

  return (
    <div className="mb-2 last:mb-0">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setResult(null);
          startTransition(async () => {
            setResult(await run());
          });
        }}
        className={`rounded-sm border px-3 py-1.5 text-[0.82rem] disabled:opacity-50 ${classes}`}
      >
        {pending ? pendingLabel : label}
      </button>

      {result && !result.ok ? (
        <p className="m-0 mt-2 max-w-prose text-[0.8rem] leading-relaxed text-signal-ink">
          {result.message}
        </p>
      ) : null}
      {result?.ok ? (
        <p className="m-0 mt-2 text-[0.8rem] text-ink-quiet">Done.</p>
      ) : null}
    </div>
  );
}
