import { createHash } from "node:crypto";

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS).
 *
 * Protocol §15 makes the package digest "lowercase SHA-256 over the RFC 8785
 * JSON Canonicalization Scheme bytes of `scoring_content` only". That is a
 * contract, not a convenience, so this module implements the scheme rather than
 * borrowing `JSON.stringify` and hoping the two agree: the work order forbids
 * claiming `JSON.stringify` as an RFC 8785 implementation unless equivalence is
 * proven across the full allowed value space, and it is not (`JSON.stringify`
 * emits object keys in insertion order, drops `undefined` members silently,
 * calls `toJSON`, and serialises `-0` as `0` only by accident of Number→String).
 *
 * The one place this file does delegate is number formatting, and it is the one
 * place delegation is provably right: RFC 8785 §3.2.2.3 specifies ECMAScript
 * `Number::toString`, which is exactly what `String(n)` computes. The delegation
 * is therefore to the algorithm the RFC names, not to `JSON.stringify`. The two
 * documented deviations of that algorithm — `-0` and non-finite values — are
 * handled explicitly below.
 */

/** A value RFC 8785 can canonicalize. `undefined` is deliberately absent. */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/** Raised when a value is outside the scheme's serialisable domain. */
export class CanonicalizationError extends Error {
  constructor(message: string, readonly path: string) {
    super(`${path || "<root>"}: ${message}`);
    this.name = "CanonicalizationError";
  }
}

/**
 * Escapes per RFC 8785 §3.2.2.2: the seven two-character forms where one
 * exists, `\u00xx` with LOWERCASE hex for the remaining C0 controls, and every
 * other code point literal — including DEL and U+2028/U+2029, neither of which
 * JCS escapes.
 */
const SHORT_ESCAPES = new Map<number, string>([
  [0x08, "\\b"],
  [0x09, "\\t"],
  [0x0a, "\\n"],
  [0x0c, "\\f"],
  [0x0d, "\\r"],
  [0x22, '\\"'],
  [0x5c, "\\\\"],
]);

const HIGH_SURROGATE_START = 0xd800;
const HIGH_SURROGATE_END = 0xdbff;
const LOW_SURROGATE_START = 0xdc00;
const LOW_SURROGATE_END = 0xdfff;

/**
 * Serialize a JSON string, rejecting invalid Unicode.
 *
 * RFC 8785 requires canonicalization to FAIL on invalid Unicode rather than
 * emit it, and a lone surrogate is the case that matters: it has no UTF-8
 * encoding at all, so `Buffer.from(…, "utf8")` would silently substitute
 * U+FFFD. The canonical bytes would then no longer represent the input, two
 * different inputs could digest identically, and hash/signature
 * interoperability would break exactly where a digest is load-bearing — which
 * for this project is the package `content_digest` and the approval bound to
 * it. So an unpaired high or low surrogate terminates canonicalization.
 *
 * A valid surrogate PAIR is fine and is emitted unchanged; it encodes to UTF-8
 * normally. Property names run through this same function, so a key carrying a
 * lone surrogate fails too.
 */
function serializeString(value: string, path: string): string {
  let out = '"';
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code >= HIGH_SURROGATE_START && code <= HIGH_SURROGATE_END) {
      const next = index + 1 < value.length ? value.charCodeAt(index + 1) : -1;
      if (next < LOW_SURROGATE_START || next > LOW_SURROGATE_END) {
        throw new CanonicalizationError(
          `unpaired high surrogate U+${code.toString(16).toUpperCase().padStart(4, "0")} at offset ${index}; RFC 8785 fails on invalid Unicode rather than emitting it`,
          path,
        );
      }
      // A valid pair: emit both units and step past the low surrogate.
      out += value[index]! + value[index + 1]!;
      index += 1;
      continue;
    }
    if (code >= LOW_SURROGATE_START && code <= LOW_SURROGATE_END) {
      throw new CanonicalizationError(
        `unpaired low surrogate U+${code.toString(16).toUpperCase().padStart(4, "0")} at offset ${index}; RFC 8785 fails on invalid Unicode rather than emitting it`,
        path,
      );
    }

    const short = SHORT_ESCAPES.get(code);
    if (short !== undefined) {
      out += short;
      continue;
    }
    if (code < 0x20) {
      out += `\\u${code.toString(16).padStart(4, "0")}`;
      continue;
    }
    out += value[index]!;
  }
  return `${out}"`;
}

/**
 * RFC 8785 §3.2.2.3. `String(n)` is ECMAScript `Number::toString`, which the
 * RFC adopts verbatim; the RFC's two carve-outs are applied around it.
 */
function serializeNumber(value: number, path: string): string {
  if (!Number.isFinite(value)) {
    throw new CanonicalizationError(
      `non-finite number (${String(value)}) has no JCS representation`,
      path,
    );
  }
  // JCS normalises negative zero to "0"; `String(-0)` already yields "0", so
  // this is belt-and-braces against a future engine change, not a repair.
  if (Object.is(value, -0)) return "0";
  return String(value);
}

/**
 * RFC 8785 §3.2.3 sorts members by the UTF-16 code units of their names. JS
 * relational string comparison IS code-unit ordering, so the default sort is
 * the specified one; `localeCompare` would not be.
 */
function sortKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function canonicalizeValue(value: unknown, path: string): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return serializeNumber(value, path);
    case "string":
      return serializeString(value, path);
    case "bigint":
      throw new CanonicalizationError("bigint is not a JSON value", path);
    case "undefined":
      throw new CanonicalizationError(
        "undefined is not a JSON value; omit the member or use null",
        path,
      );
    case "function":
    case "symbol":
      throw new CanonicalizationError(`${typeof value} is not a JSON value`, path);
  }

  if (Array.isArray(value)) {
    const items = value.map((item, index) =>
      canonicalizeValue(item, `${path}[${index}]`),
    );
    return `[${items.join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  // A `toJSON` method would make the canonical bytes depend on class identity
  // rather than on the data, so it is rejected rather than honoured.
  if (typeof record.toJSON === "function") {
    throw new CanonicalizationError(
      "value defines toJSON(); canonicalize plain JSON data only",
      path,
    );
  }
  const members = sortKeys(Object.keys(record)).map((key) => {
    const child = record[key];
    if (child === undefined) {
      throw new CanonicalizationError(
        `member "${key}" is undefined; omit it or use null`,
        path,
      );
    }
    return `${serializeString(key, `${path}.${key}`)}:${canonicalizeValue(child, `${path}.${key}`)}`;
  });
  return `{${members.join(",")}}`;
}

/** The RFC 8785 canonical form of `value`, as a string. */
export function canonicalize(value: JsonValue): string {
  return canonicalizeValue(value, "");
}

/** The RFC 8785 canonical form of `value`, as the UTF-8 bytes JCS defines. */
export function canonicalBytes(value: JsonValue): Buffer {
  return Buffer.from(canonicalize(value), "utf8");
}

/** Lowercase SHA-256 over arbitrary bytes — the digest form the protocol uses. */
export function sha256Hex(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Lowercase SHA-256 over the RFC 8785 bytes of `value` — the exact contract
 * Protocol §15 states for `content_digest`.
 */
export function canonicalDigest(value: JsonValue): string {
  return sha256Hex(canonicalBytes(value));
}
