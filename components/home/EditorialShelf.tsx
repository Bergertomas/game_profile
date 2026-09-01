import { ProfileRail } from "@/components/home/ProfileRail";
import type { ShelfView } from "@/lib/home/shelves";

/**
 * THE AUTHORED SHELVES, after the general rail.
 *
 * Every shelf on this page arrived through `resolveShelves`, which means it
 * already has its members, already cleared its minimum and — if it is a living
 * shelf — is inside its publication window or has been replaced by its
 * evergreen fallback. So there is nothing to decide here: a shelf that reached
 * this component renders, and one that did not was never built.
 *
 * That is the whole of the "empty shelves render nothing" rule (P0.3, handoff
 * §7.3). The region itself disappears with them: with no shelves there is no
 * wrapper, no heading and no rule on the page, because a section that exists
 * only to hold nothing is decoration.
 */
export function EditorialShelves({
  shelves,
}: {
  readonly shelves: readonly ShelfView[];
}) {
  if (shelves.length === 0) return null;

  return (
    <div className="sip-shelves">
      {shelves.map((shelf) => (
        <ProfileRail
          key={shelf.id}
          heading={shelf.heading}
          note={shelf.note}
          profiles={shelf.profiles}
        />
      ))}
    </div>
  );
}
