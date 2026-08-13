/**
 * Turning a database refusal into something an editor can act on.
 *
 * The invariants that matter live in Postgres, which is the right place for
 * them: they hold against this application, a migration and a psql session
 * alike. The cost is that they surface as a `PostgresError` with a constraint
 * name, and "duplicate key value violates unique constraint
 * games_slug_unique" is not a sentence to put in front of an editor.
 *
 * This does not re-implement the rules. It recognises the ones the editorial
 * interface can actually provoke and says what the editor should do instead;
 * anything unrecognised is passed through as an unexpected fault rather than
 * being smoothed over into a plausible-sounding guess.
 */

interface DatabaseFailure {
  readonly code?: string;
  readonly constraint_name?: string;
  readonly message?: string;
  readonly detail?: string;
}

function asDatabaseFailure(error: unknown): DatabaseFailure | null {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as DatabaseFailure & { cause?: unknown };
  if (typeof candidate.code === "string") return candidate;
  // Drizzle wraps the driver error; the useful one is underneath.
  if (candidate.cause) return asDatabaseFailure(candidate.cause);
  return null;
}

/**
 * A message for the editor, or null when this is not a rule violation.
 *
 * Null means "this is a fault, not a refusal" — the caller should let it become
 * an error rather than reporting it as a form problem.
 */
export function describeDatabaseFailure(error: unknown): string | null {
  const failure = asDatabaseFailure(error);
  if (!failure?.code) return null;

  const constraint = failure.constraint_name ?? "";

  switch (failure.code) {
    case "23505":
      if (constraint.includes("games_slug")) {
        return "Another game already uses that slug. Slugs are public addresses, so they have to be unique.";
      }
      if (constraint.includes("profile_scopes_game_key")) {
        return "This game already has a scope with that key. A key is the scope's stable identity within the game.";
      }
      if (constraint.includes("one_primary_per_game")) {
        return "That would leave the game with two primary scopes. Move primacy instead of setting it directly.";
      }
      return "That value is already in use.";

    case "23503":
      return "Something else still refers to this record, so it cannot be removed yet. Detach the things that reference it first.";

    case "23502":
      return "A required field was empty.";

    case "23514":
      if (constraint.includes("production_is_attributable")) {
        return "Production-cleared artwork must name a credit and a source page. An asset that may appear publicly is a rights position, so it has to say whose it is and where it came from.";
      }
      // Our own routing invariants RAISE with ERRCODE 'check_violation', and
      // their messages are written for a person. Prefer them to a generic line.
      return failure.message?.includes("canonical /games/")
        ? `${failure.message} — publish the primary scope under the same rubric first, or make this scope the primary one.`
        : (failure.message ?? "That change is not allowed by the data rules.");

    default:
      return null;
  }
}

/** The shape every admin Server Action returns. */
export type ActionResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly message: string;
      readonly fields?: Record<string, string>;
      /**
       * What was submitted, echoed back so the form can re-fill itself. React
       * 19 clears an uncontrolled form after its action resolves, so without
       * this a single invalid field discards everything else the editor typed.
       */
      readonly values?: Record<string, string>;
    };

/** The standard failure for a form that did not validate. */
export function invalidForm(
  errors: Record<string, string>,
  values: Record<string, string>,
): ActionResult {
  return {
    ok: false,
    message: "Check the highlighted fields.",
    fields: errors,
    values,
  };
}

/**
 * Run a write and convert a known refusal into a reportable result.
 *
 * An unrecognised error is rethrown on purpose. Reporting an unexpected fault
 * as "that change is not allowed" would hide a real bug behind a message that
 * sounds like a rule.
 *
 * `values` is the submission, echoed back on failure for the same reason a
 * validation error echoes it: React 19 clears an uncontrolled form once its
 * action resolves, and a duplicate slug should cost the editor one field rather
 * than the whole form.
 */
export async function reportingFailures(
  run: () => Promise<void>,
  values?: Record<string, string>,
): Promise<ActionResult> {
  try {
    await run();
    return { ok: true };
  } catch (error) {
    const message = describeDatabaseFailure(error);
    if (message === null) throw error;
    return { ok: false, message, values };
  }
}
