import { readFileSync } from "node:fs";

/**
 * The design-token contract, read from the governing file.
 *
 * `docs/design/handoff/should-i-play.tokens.v1.json` is the source of truth for
 * the public visual system. Everything here exists so a test can compare the
 * IMPLEMENTATION against that file rather than against itself: a suite that
 * reads its expectations back out of `globals.css` will pass on any palette
 * that is internally consistent, including a wrong one. That is exactly how an
 * inferred canvas, an invented text step and a fabricated radius scale survived
 * a green run.
 */

export interface Token {
  readonly $type: string;
  readonly $value: string | number | readonly number[];
}

export const TOKENS_PATH = "docs/design/handoff/should-i-play.tokens.v1.json";

export const tokens: Record<string, unknown> = JSON.parse(
  readFileSync(TOKENS_PATH, "utf8"),
);

/** camelCase path segments to kebab-case: `panelRaised` → `panel-raised`. */
function kebab(segment: string): string {
  return segment.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * The CSS namespace each token group lives in.
 *
 * One mechanical rule, so a token's custom-property name is derivable rather
 * than chosen. Where a group maps onto a Tailwind theme namespace it uses that
 * namespace, so the contract also generates the utilities the markup uses.
 */
const NAMESPACES: ReadonlyArray<readonly [string, string]> = [
  ["color", "--color-"],
  ["font.family", "--font-"],
  ["font.weight", "--font-weight-"],
  ["font.size", "--text-"],
  ["font.lineHeight", "--leading-"],
  ["font.tracking", "--tracking-"],
  ["space", "--space-"],
  ["size", "--size-"],
  ["radius", "--radius-"],
  ["border", "--border-"],
  ["motion.duration", "--duration-"],
  ["motion.easing", "--ease-"],
  ["breakpoint", "--breakpoint-"],
];

/** The custom-property name for a token path, by the rule above. */
export function varNameFor(path: readonly string[]): string {
  for (const depth of [2, 1]) {
    const group = path.slice(0, depth).join(".");
    const namespace = NAMESPACES.find(([name]) => name === group)?.[1];
    if (namespace) return namespace + path.slice(depth).map(kebab).join("-");
  }
  throw new Error(`No CSS namespace for token ${path.join(".")}`);
}

/** The CSS value for a token, resolving `{a.b.c}` references and beziers. */
export function cssValueFor(token: Token): string {
  const value = token.$value;
  if (token.$type === "cubicBezier" && Array.isArray(value)) {
    return `cubic-bezier(${value.join(", ")})`;
  }
  if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
    return `var(${varNameFor(value.slice(1, -1).split("."))})`;
  }
  return String(value);
}

/** Every leaf token, as `[path, token]`. */
export function allTokens(
  node: unknown = tokens,
  path: readonly string[] = [],
): Array<[string[], Token]> {
  const found: Array<[string[], Token]> = [];
  if (!node || typeof node !== "object") return found;
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    if (value && typeof value === "object" && "$value" in value) {
      found.push([[...path, key], value as Token]);
    } else {
      found.push(...allTokens(value, [...path, key]));
    }
  }
  return found;
}

/** A token's `$value`, by dotted path. Throws rather than returning undefined. */
export function tokenValue(path: string): string {
  const found = allTokens().find(([segments]) => segments.join(".") === path);
  if (!found) throw new Error(`No token ${path} in ${TOKENS_PATH}`);
  return String(found[1].$value);
}

/**
 * A colour token as RGB, composited over `over` when it carries alpha.
 *
 * The border ramp is expressed in `rgba()` on purpose, so its real contrast is
 * a function of the surface beneath it. Comparing the raw literal would measure
 * a colour nothing ever paints.
 */
export function rgbOf(value: string, over?: readonly number[]): number[] {
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) return hex.match(/../g)!.map((part) => Number.parseInt(part, 16));

  const parts = value.match(/rgba?\(([^)]+)\)/)?.[1]?.split(",").map(Number);
  if (!parts) throw new Error(`Not a colour: ${value}`);
  const alpha = parts[3] ?? 1;
  if (alpha === 1 || !over) return parts.slice(0, 3);
  return [0, 1, 2].map((i) => alpha * parts[i]! + (1 - alpha) * over[i]!);
}

export function luminance(rgb: readonly number[]): number {
  const channels = rgb
    .map((value) => value / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export function contrast(
  foreground: readonly number[],
  background: readonly number[],
): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

/** Contrast of a possibly-translucent token against an opaque surface. */
export function contrastOn(colourPath: string, surfacePath: string): number {
  const surface = rgbOf(tokenValue(surfacePath));
  return contrast(rgbOf(tokenValue(colourPath), surface), surface);
}
