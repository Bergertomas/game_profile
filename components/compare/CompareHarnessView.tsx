"use client";

import type { CompareIndex } from "@/lib/compare";
import type { Side } from "@/lib/compare/relationship";
import type { Selection } from "@/lib/compare/selection";
import { comparePath } from "@/lib/compare/url";
import { CompareView } from "./CompareView";

/**
 * The review harness's client shell: the canonical `CompareView` against a
 * selection the harness resolved on the server, with the controls wired to
 * the real route so a Replace in the harness opens the real page. Function
 * props cannot cross the server boundary, which is the whole reason this
 * file exists.
 */
export function CompareHarnessView({
  selection,
  index,
  launcher,
}: {
  selection: Selection;
  index: CompareIndex;
  launcher?: React.ReactNode;
}) {
  function choose(side: Side, slug: string) {
    const left = side === "left" ? slug : selection.left?.slug ?? null;
    const right = side === "right" ? slug : selection.right?.slug ?? null;
    window.location.assign(comparePath(left, right));
  }
  return (
    <CompareView selection={selection} index={index} onChoose={choose} launcher={launcher} />
  );
}
