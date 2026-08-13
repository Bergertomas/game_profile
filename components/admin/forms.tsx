"use client";

import { createContext, use, useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/admin/errors";

/**
 * Form plumbing for the editorial tool.
 *
 * One client module, so the pages themselves stay server components that read
 * the database directly. Everything here is generic over the action's shape:
 * an action takes `(previousResult, formData)` and returns an `ActionResult`,
 * and this renders the result next to the fields that produced it.
 */

export type ActionState = ActionResult | null;

interface FormScope {
  readonly errors: Record<string, string>;
  /**
   * What the editor submitted last time, when it did not validate.
   *
   * React 19 resets an uncontrolled form once its action resolves — including
   * when the action reports a problem. Without re-applying these, one bad field
   * empties every other one, and the artwork record (twelve fields) has to be
   * retyped from scratch to fix a missing credit line.
   */
  readonly values: Record<string, string>;
  /**
   * Unique per rendered form, so control ids do not collide.
   *
   * A control keyed on its field name alone emits `id="url"` in EVERY form on
   * the page — and the game editor renders two artwork forms, cover and hero,
   * with identical field names. Duplicate ids are invalid HTML, but the real
   * cost is that `<label for="url">` binds to whichever input came first: a
   * screen-reader user activating the hero form's "Image URL" label lands in
   * the cover form's input, and so does anyone clicking it.
   */
  readonly idPrefix: string;
}

/**
 * Per-form state, shared with the controls inside it.
 *
 * Context rather than a render prop, and that is not a style preference: the
 * admin pages are server components, and a function cannot be passed as a child
 * across the server/client boundary — React rejects it at render time with
 * "Functions are not valid as a child of Client Components". Plain JSX children
 * serialise; a context lets each control find its own id and error without the
 * page having to thread them down.
 */
const FormScopeContext = createContext<FormScope>({
  errors: {},
  values: {},
  idPrefix: "",
});

/** The DOM id for one field of the enclosing form. */
function useFieldId(name: string): string {
  const { idPrefix } = use(FormScopeContext);
  return idPrefix ? `${idPrefix}-${name}` : name;
}

/**
 * A control's id and its starting value.
 *
 * A rejected submission's own value wins over the server's, so the editor sees
 * what they typed rather than what was last saved.
 */
function useControl(
  name: string,
  fallback: string | number | null | undefined,
): { id: string; defaultValue: string | undefined } {
  const { values, idPrefix } = use(FormScopeContext);
  const submitted = values[name];
  return {
    id: idPrefix ? `${idPrefix}-${name}` : name,
    defaultValue: submitted ?? (fallback === null ? undefined : fallback?.toString()),
  };
}

export function ActionForm({
  action,
  children,
  submitLabel,
  confirm,
}: {
  action: (previous: ActionState, form: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel: string;
  confirm?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    null,
  );
  const errors = (state && !state.ok && state.fields) || {};
  const values = (state && !state.ok && state.values) || {};
  const idPrefix = useId();

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      <FormScopeContext value={{ errors, values, idPrefix }}>
        {children}
      </FormScopeContext>
      <div className="mt-3 flex items-center gap-3">
        <Submit label={submitLabel} />
        {state && !state.ok ? (
          <p role="alert" className="m-0 text-[0.82rem] text-signal-ink">
            {state.message}
          </p>
        ) : null}
        {state?.ok ? (
          <p role="status" className="m-0 text-[0.82rem] text-ink-quiet">
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="sip-display cursor-pointer rounded-sm border border-ink bg-graphite px-3 py-1.5 text-[0.82rem] tracking-wide text-bone disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * A collapsible section that stays how the editor left it.
 *
 * Deliberately NOT a bare `<details open={someServerValue}>`. React drives
 * `open` as a controlled attribute, so a server re-render recomputing that
 * value snaps the section shut — which is exactly what happened when saving an
 * artwork record: the panel was open because no record existed, the save
 * created one, `revalidatePath` re-rendered, `open` flipped to false, and the
 * "Saved." confirmation was hidden inside the section that had just closed. The
 * edit worked and the interface looked like it had done nothing.
 *
 * Local state, seeded once. After mount the editor owns it.
 */
export function Disclosure({
  summary,
  defaultOpen = false,
  children,
}: {
  summary: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="mb-3 border-b border-rule pb-3 last:border-b-0"
    >
      <summary className="cursor-pointer text-[0.9rem]">{summary}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

/**
 * A one-button form for an action that takes no fields.
 *
 * Used for removals and for moving primacy. A `<button>` inside a form rather
 * than an `onClick` handler, so it works the same way as every other mutation
 * and so `confirm` can cancel it before it reaches the server.
 */
export function ActionButton({
  action,
  label,
  confirm,
  tone = "quiet",
}: {
  action: () => Promise<ActionResult>;
  label: string;
  confirm?: string;
  tone?: "quiet" | "primary";
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    async () => action(),
    null,
  );

  const palette =
    tone === "primary"
      ? "border-ink bg-graphite text-bone"
      : "border-rule-strong bg-page text-ink-soft hover:text-ink";

  return (
    <form
      action={formAction}
      className="inline"
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      <button
        type="submit"
        className={`cursor-pointer rounded-sm border px-2 py-1 text-[0.78rem] ${palette}`}
      >
        {label}
      </button>
      {state && !state.ok ? (
        <span role="alert" className="ml-2 text-[0.78rem] text-signal-ink">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

export function Field({
  name,
  label,
  hint,
  children,
}: {
  name: string;
  label: string;
  hint?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const id = useFieldId(name);
  const error = use(FormScopeContext).errors[name];
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mb-3">
      <label
        htmlFor={id}
        className="mb-1 block text-[0.78rem] uppercase tracking-wide text-ink-quiet"
      >
        {label}
      </label>
      {hint ? (
        <p
          id={`${id}-hint`}
          className="mb-1 mt-0 text-[0.78rem] text-ink-soft"
        >
          {hint}
        </p>
      ) : null}
      <div aria-describedby={describedBy || undefined}>{children}</div>
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mb-0 mt-1 text-[0.78rem] text-signal-ink"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL =
  "w-full rounded-sm border border-rule-strong bg-page px-2 py-1.5 text-[0.9rem] text-ink";

export function TextInput({
  name,
  defaultValue,
  type = "text",
  required,
  placeholder,
}: {
  name: string;
  defaultValue?: string | number | null;
  type?: "text" | "date" | "url" | "number";
  required?: boolean;
  placeholder?: string;
}) {
  const control = useControl(name, defaultValue);
  return (
    <input
      // Keyed on the value React would otherwise discard: an uncontrolled input
      // ignores a changed `defaultValue` on re-render, so re-filling a rejected
      // form needs a remount.
      key={control.defaultValue}
      id={control.id}
      name={name}
      type={type}
      required={required}
      placeholder={placeholder}
      defaultValue={control.defaultValue}
      className={CONTROL}
    />
  );
}

export function TextArea({
  name,
  defaultValue,
  rows = 3,
}: {
  name: string;
  defaultValue?: string | null;
  rows?: number;
}) {
  const control = useControl(name, defaultValue);
  return (
    <textarea
      key={control.defaultValue}
      id={control.id}
      name={name}
      rows={rows}
      defaultValue={control.defaultValue}
      className={CONTROL}
    />
  );
}

export function Select({
  name,
  defaultValue,
  options,
  required,
}: {
  name: string;
  defaultValue?: string | null;
  options: readonly { value: string; label: string }[];
  required?: boolean;
}) {
  const control = useControl(name, defaultValue);
  return (
    <select
      key={control.defaultValue}
      id={control.id}
      name={name}
      required={required}
      defaultValue={control.defaultValue ?? ""}
      className={CONTROL}
    >
      <option value="" disabled>
        Choose…
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
