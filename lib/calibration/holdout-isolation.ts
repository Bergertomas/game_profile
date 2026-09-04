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
 * Two scopes are deliberately kept apart, because they carry different
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
