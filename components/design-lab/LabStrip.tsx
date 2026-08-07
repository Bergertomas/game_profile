import Link from "next/link";
import { designLabProfiles } from "@/lib/design-lab/profile";

/**
 * Development-only navigation between the Direction D renders.
 *
 * Deliberately unstyled lab furniture, and deliberately at the foot of the
 * page: nothing above the fold may differ between the comparison screenshots,
 * so the switcher cannot live in the header.
 */
export function LabStrip({ current }: { current: string }) {
  const entries: {
    href: `/design-lab/d/${string}`;
    label: string;
    key: string;
  }[] = [
    ...designLabProfiles().map((profile) => ({
      href: `/design-lab/d/${profile.game.slug}` as const,
      label: profile.game.canonicalTitle,
      key: profile.game.slug,
    })),
    {
      href: "/design-lab/d/states",
      label: "Score-state proof",
      key: "states",
    },
  ];

  return (
    <div className="border-t border-[#242a32] bg-[#0a0b0d] px-4 py-3 text-[0.75rem] text-[#9a978f] sm:px-8">
      <span className="mr-3 uppercase">Direction D · lab renders:</span>
      {entries.map((entry) => (
        <Link
          key={entry.key}
          href={entry.href}
          className="mr-3 inline-block underline underline-offset-2"
          aria-current={entry.key === current ? "page" : undefined}
          style={entry.key === current ? { color: "#ece7dd" } : undefined}
        >
          {entry.label}
        </Link>
      ))}
    </div>
  );
}
