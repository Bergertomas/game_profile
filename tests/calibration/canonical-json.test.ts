import { describe, expect, it } from "vitest";
import {
  CanonicalizationError,
  canonicalDigest,
  canonicalize,
  sha256Hex,
} from "@/lib/calibration/canonical-json";
import { buildValidPackage, mutate } from "./fixtures";
import { validatePackageSemantics } from "@/lib/calibration/semantic-validator";

/**
 * Work order §5(6): RFC 8785 digest known vectors and package binding.
 */

describe("RFC 8785 canonicalization", () => {
  it("sorts object members by UTF-16 code unit, not by locale or insertion", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    // Uppercase sorts before lowercase in code-unit order; a locale-aware
    // comparator would put "a" first and produce different bytes.
    expect(canonicalize({ a: 1, A: 2 })).toBe('{"A":2,"a":1}');
    expect(canonicalize({ "ä": 1, "a": 2 })).toBe('{"a":2,"ä":1}');
  });

  it("sorts nested members too, and preserves array order", () => {
    expect(canonicalize({ z: { b: 1, a: 2 }, a: [3, 1, 2] })).toBe(
      '{"a":[3,1,2],"z":{"a":2,"b":1}}',
    );
  });

  it("serialises the RFC's number cases", () => {
    expect(canonicalize(1)).toBe("1");
    expect(canonicalize(1.0)).toBe("1");
    expect(canonicalize(-0)).toBe("0");
    expect(canonicalize(0.5)).toBe("0.5");
    expect(canonicalize(1e21)).toBe("1e+21");
    expect(canonicalize(1e-7)).toBe("1e-7");
    expect(canonicalize(1.5e300)).toBe("1.5e+300");
    // The full 0.5-grid the rubric uses, since these are the numbers that matter.
    expect(canonicalize([0, 0.5, 1, 1.5, 2])).toBe("[0,0.5,1,1.5,2]");
  });

  it("escapes exactly the characters RFC 8785 §3.2.2.2 escapes", () => {
    expect(canonicalize("\b\t\n\f\r\"\\")).toBe('"\\b\\t\\n\\f\\r\\"\\\\"');
    // Other C0 controls take \u00xx with LOWERCASE hex. Written as escapes, not
    // literal bytes, so this source file stays text rather than becoming a
    // binary blob git will not diff.
    expect(canonicalize("\u0000\u001f")).toBe('"\\u0000\\u001f"');
    // DEL, U+2028 and non-ASCII are NOT escaped by JCS.
    expect(canonicalize("\u007f")).toBe('"\u007f"');
    expect(canonicalize("\u2028")).toBe('"\u2028"');
    expect(canonicalize("\u00e9\u2603")).toBe('"\u00e9\u2603"');
  });

  it("rejects invalid Unicode rather than emitting it", () => {
    // RFC 8785 fails on invalid Unicode. A lone surrogate has no UTF-8
    // encoding, so emitting it would let `Buffer.from(…, "utf8")` substitute
    // U+FFFD — the canonical bytes would stop representing the input and two
    // different inputs could digest identically.
    expect(() => canonicalize("\ud800")).toThrow(CanonicalizationError);
    expect(() => canonicalize("\ud800")).toThrow(/unpaired high surrogate U\+D800/);
    expect(() => canonicalize("a\udbffb")).toThrow(/unpaired high surrogate U\+DBFF/);
    expect(() => canonicalize("\udc00")).toThrow(/unpaired low surrogate U\+DC00/);
    expect(() => canonicalize("a\udfffb")).toThrow(/unpaired low surrogate U\+DFFF/);
    // Inside a nested value, with the path reported.
    expect(() => canonicalize({ a: { b: ["\ud800"] } })).toThrow(/\.a\.b\[0\]/);
  });

  it("rejects a lone surrogate in a PROPERTY NAME too", () => {
    expect(() => canonicalize({ "\ud800": 1 })).toThrow(CanonicalizationError);
    expect(() => canonicalize({ "bad\udc00key": 1 })).toThrow(/unpaired low surrogate/);
  });

  it("accepts a valid surrogate pair and encodes it normally", () => {
    // U+1F600, written as its surrogate pair — valid Unicode, so it passes.
    expect(canonicalize("\ud83d\ude00")).toBe('"\ud83d\ude00"');
    expect(canonicalize({ "\ud83d\ude00": 1 })).toBe('{"\ud83d\ude00":1}');
    // And it round-trips through UTF-8 without substitution.
    const bytes = Buffer.from(canonicalize("\ud83d\ude00"), "utf8");
    expect(bytes.toString("utf8")).toBe('"\ud83d\ude00"');
    expect(bytes).not.toContain(Buffer.from("\ufffd", "utf8"));
    expect(canonicalDigest("\ud83d\ude00")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects values outside the JSON domain rather than dropping them", () => {
    // `JSON.stringify` silently drops an undefined member; JCS has no
    // representation for one, so canonicalization must fail instead.
    expect(() => canonicalize({ a: undefined } as never)).toThrow(CanonicalizationError);
    expect(() => canonicalize(Number.NaN)).toThrow(CanonicalizationError);
    expect(() => canonicalize(Number.POSITIVE_INFINITY)).toThrow(CanonicalizationError);
    expect(() => canonicalize({ toJSON: () => 1 } as never)).toThrow(CanonicalizationError);
  });

  it("produces identical bytes for the same data written in a different order", () => {
    const one = { alpha: [1, { y: 2, x: 1 }], beta: "s" };
    const two = { beta: "s", alpha: [1, { x: 1, y: 2 }] };
    expect(canonicalize(one)).toBe(canonicalize(two));
    expect(canonicalDigest(one)).toBe(canonicalDigest(two));
  });

  it("digests to a lowercase SHA-256 over the canonical UTF-8 bytes", () => {
    // Known vector: SHA-256 of the two-byte document `{}`.
    expect(canonicalDigest({})).toBe(sha256Hex(Buffer.from("{}", "utf8")));
    expect(canonicalDigest({})).toBe(
      "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
    );
    expect(canonicalDigest({ a: 1 })).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("package digest binding (Protocol §15)", () => {
  it("the fixture's content_digest is the RFC 8785 SHA-256 of scoring_content", () => {
    const pkg = buildValidPackage();
    expect(pkg.content_digest).toBe(canonicalDigest(pkg.scoring_content as never));
  });

  it("the digest covers scoring_content only, excluding itself and the approval", () => {
    const pkg = buildValidPackage();
    // Changing owner approval metadata must not move the content digest, or the
    // definition would be circular.
    const withOtherActor = {
      ...pkg,
      owner_approval: { ...pkg.owner_approval, actor_id: "someone-else" },
    };
    expect(canonicalDigest(withOtherActor.scoring_content as never)).toBe(pkg.content_digest);
  });

  it("rejects a package whose digest does not cover its content", () => {
    const tampered = mutate(
      (draft) => {
        const content = draft.scoring_content as Record<string, unknown>;
        const interpretation = content.interpretation as Record<string, unknown>;
        interpretation.one_line_experience = "Edited after the digest was sealed.";
      },
      { reseal: false },
    );
    const result = validatePackageSemantics(tampered);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "content_digest")).toBe(true);
  });

  it("rejects an approval that binds a different digest", () => {
    const pkg = buildValidPackage();
    const rebound = {
      ...pkg,
      owner_approval: { ...pkg.owner_approval, approved_digest: "a".repeat(64) },
    };
    const result = validatePackageSemantics(rebound);
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) => issue.path === "owner_approval.approved_digest"),
    ).toBe(true);
  });
});
