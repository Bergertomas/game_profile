import { CONTROLLED_INPUTS, controlledText, type ControlledInput } from "./controlled-inputs";

/**
 * The mechanical half of preregistration §3.1's holdout protection.
 *
 * §3.1 forbids a development research/scoring context from receiving holdout
 * identities as calibration material, while §3.1's closing line is explicit that
 * "engineering may know the holdout identities in order to enforce isolation".
 * This module is that enforcement: it holds the four locked identities so a
 * wrapper-authored payload can be checked against them before it is sent.
 *
 * Three scopes are deliberately kept apart, because they carry different
 * authority:
 *
 *  - **Wrapper-authored payload** — everything this repository composes for a
 *    development run (scope record, maturity record, run metadata). Engineering
 *    owns these bytes, so a holdout mention here is a defect and FAILS CLOSED.
 *  - **Controlled Item 3 bytes** — the six owner-approved, byte-locked inputs.
 *    They are immutable to any execution slice; the rubric's own changelog, for
 *    example, names a historical calibration list. Editing them to satisfy a
 *    guard would break the Item 3 freeze, which is an owner decision and not an
 *    engineering one. Those mentions are therefore REPORTED into the run receipt
 *    rather than blocked, so the isolation boundary is disclosed exactly as it
 *    actually stands.
 *  - **Admitted third-party source text inside a frozen corpus** — the captured
 *    body of a source that was admitted to the development game's own evidence
 *    corpus under the Evidence SOP's source rules. Per the orchestrator ruling
 *    recorded on issues #87/#89: §3.1 forbids supplying holdout-specific
 *    material or historical content ABOUT a holdout to a development scoring
 *    context, and an incidental holdout-title comparison inside an otherwise
 *    admissible development source is development evidence, not holdout
 *    calibration material. Those mentions are therefore REPORTED, while every
 *    identity-bearing and wrapper-authored part of the same packet stays
 *    fail-closed. This is an implementation correction, not a methodology
 *    amendment.
 */

export type HoldoutRunKey = "H1" | "H2" | "H3" | "H4";

export interface HoldoutIdentity {
  readonly runKey: HoldoutRunKey;
  /** The identity as the cohort lock records it. */
  readonly title: string;
  /**
   * Forms that would betray the identity in a payload. Word-bounded and kept
   * narrow: a false negative leaks a holdout, but a false positive blocks a
   * legitimate development run, so each pattern names a form that could not
   * plausibly mean anything else in this project.
   */
  readonly patterns: readonly RegExp[];
}

/** Cohort lock 2026-09-02, "Untouched holdout cohort — four". */
export const HOLDOUT_IDENTITIES: readonly HoldoutIdentity[] = [
  {
    runKey: "H1",
    title: "Resident Evil 4 Remake",
    patterns: [/resident\s+evil\s*4/i, /\bRE4\b/],
  },
  {
    runKey: "H2",
    title: "Kingdom Come: Deliverance II",
    patterns: [/kingdom\s+come/i, /\bKCD\s?(?:2|II)\b/],
  },
  {
    runKey: "H3",
    title: "Astro Bot",
    patterns: [/astro\s*bot/i],
  },
  {
    runKey: "H4",
    title: "Immortals of Aveum",
    patterns: [/immortals\s+of\s+aveum/i, /\bAveum\b/i],
  },
];

export interface HoldoutMention {
  readonly runKey: HoldoutRunKey;
  readonly title: string;
  /** The exact substring that matched, so a report can be checked by hand. */
  readonly matched: string;
  /** Where it was found: a JSON path for payloads, a repo path for bytes. */
  readonly at: string;
}

/** Every holdout form appearing in one string. */
export function scanTextForHoldoutMentions(text: string, at: string): readonly HoldoutMention[] {
  const mentions: HoldoutMention[] = [];
  for (const identity of HOLDOUT_IDENTITIES) {
    for (const pattern of identity.patterns) {
      const match = pattern.exec(text);
      if (match) {
        mentions.push({
          runKey: identity.runKey,
          title: identity.title,
          matched: match[0],
          at,
        });
        break;
      }
    }
  }
  return mentions;
}

/**
 * Walk a JSON-shaped value and report every holdout mention, in keys as well as
 * in values — a payload that leaked an identity through a property name would
 * have leaked it just as completely.
 */
export function findHoldoutMentions(value: unknown, at = "<root>"): readonly HoldoutMention[] {
  if (typeof value === "string") return scanTextForHoldoutMentions(value, at);
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findHoldoutMentions(item, `${at}[${index}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
      ...scanTextForHoldoutMentions(key, `${at}.${key} (property name)`),
      ...findHoldoutMentions(child, `${at}.${key}`),
    ]);
  }
  return [];
}

export class HoldoutIsolationError extends Error {
  constructor(readonly mentions: readonly HoldoutMention[], context: string) {
    super(
      `Holdout isolation failed for ${context}; preregistration §3.1 forbids holdout material in a development context:\n` +
        mentions.map((m) => `  ${m.runKey} ${m.title} — "${m.matched}" at ${m.at}`).join("\n"),
    );
    this.name = "HoldoutIsolationError";
  }
}

/**
 * Fail closed on wrapper-authored content. Used on everything this repository
 * composes into a development research context before it is sent.
 */
export function assertNoHoldoutExposure(value: unknown, context: string): void {
  const mentions = findHoldoutMentions(value);
  if (mentions.length > 0) throw new HoldoutIsolationError(mentions, context);
}

/**
 * The one member of the frozen scoring view that holds captured third-party
 * source bodies, and the one field inside each of its entries that IS that body.
 *
 * Everything else in the packet — the evaluation scope, the coverage frames, the
 * canonical source order, every source ID and record status, and every property
 * name anywhere — is either wrapper-authored or an identity field, and stays
 * fail-closed. Naming the admitted region positively rather than listing the
 * blocked ones keeps the narrowing minimal: an unrecognised packet shape, a new
 * member or a renamed field is held to the wrapper standard by default.
 */
export const ADMITTED_SOURCE_CORPUS_FIELD = "normalized_corpus";
export const ADMITTED_SOURCE_TEXT_FIELD = "normalized";

export interface ScoringViewHoldoutScan {
  /** Mentions in wrapper-authored or identity-bearing material. Fail closed. */
  readonly blocking: readonly HoldoutMention[];
  /** Incidental mentions inside admitted source bodies. Reported, not blocked. */
  readonly admittedSourceText: readonly HoldoutMention[];
}

/**
 * Split a frozen scoring view's holdout mentions into the two treatments §3.1
 * distinguishes: holdout material supplied to the context (blocked) and an
 * incidental mention carried by evidence admitted for the development game
 * (reported).
 *
 * A source whose ID, status or any other structural field names a holdout is NOT
 * incidental — that is holdout-specific evidence entering the packet — so only
 * the captured body of a corpus entry is treated as admitted source text.
 */
export function scanScoringViewForHoldoutMentions(
  semanticInput: unknown,
  at = "<semantic_input>",
): ScoringViewHoldoutScan {
  // Not the frozen packet shape: nothing can be shown to be admitted source
  // text, so the whole value is held to the wrapper standard.
  if (semanticInput === null || typeof semanticInput !== "object" || Array.isArray(semanticInput)) {
    return { blocking: findHoldoutMentions(semanticInput, at), admittedSourceText: [] };
  }

  const blocking: HoldoutMention[] = [];
  const admittedSourceText: HoldoutMention[] = [];

  for (const [member, value] of Object.entries(semanticInput as Record<string, unknown>)) {
    blocking.push(...scanTextForHoldoutMentions(member, `${at}.${member} (property name)`));
    if (member !== ADMITTED_SOURCE_CORPUS_FIELD || !Array.isArray(value)) {
      blocking.push(...findHoldoutMentions(value, `${at}.${member}`));
      continue;
    }
    value.forEach((entry, index) => {
      const entryAt = `${at}.${member}[${index}]`;
      if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
        blocking.push(...findHoldoutMentions(entry, entryAt));
        return;
      }
      for (const [field, child] of Object.entries(entry as Record<string, unknown>)) {
        blocking.push(...scanTextForHoldoutMentions(field, `${entryAt}.${field} (property name)`));
        const target = field === ADMITTED_SOURCE_TEXT_FIELD ? admittedSourceText : blocking;
        target.push(...findHoldoutMentions(child, `${entryAt}.${field}`));
      }
    });
  }

  return { blocking, admittedSourceText };
}

/**
 * Fail closed on a frozen scoring view's wrapper-authored and identity-bearing
 * material, and RETURN the incidental mentions found in admitted source bodies
 * so the caller can disclose them in the run receipt.
 */
export function assertScoringViewHoldoutIsolation(
  semanticInput: unknown,
  context: string,
): readonly HoldoutMention[] {
  const scan = scanScoringViewForHoldoutMentions(semanticInput);
  if (scan.blocking.length > 0) throw new HoldoutIsolationError(scan.blocking, context);
  return scan.admittedSourceText;
}

export interface ControlledByteHoldoutReport {
  readonly path: string;
  readonly role: ControlledInput["role"];
  readonly mentions: readonly HoldoutMention[];
}

/**
 * Report — never block — holdout mentions inside the byte-locked controlled
 * inputs, so the receipt states the true isolation boundary of the run instead
 * of implying a cleanliness the frozen bytes do not have.
 */
export function reportControlledInputHoldoutMentions(
  inputs: readonly ControlledInput[] = CONTROLLED_INPUTS,
): readonly ControlledByteHoldoutReport[] {
  return inputs
    .map((input) => ({
      path: input.path,
      role: input.role,
      mentions: scanTextForHoldoutMentions(controlledText(input.role), input.path),
    }))
    .filter((report) => report.mentions.length > 0);
}
