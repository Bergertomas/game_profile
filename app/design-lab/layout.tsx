import Link from "next/link";
import { notFound } from "next/navigation";
import { DIRECTIONS } from "@/lib/design-lab/profile";
import "./design-lab.css";

/**
 * D0 design-lab shell — development only.
 *
 * Follows the same protected-route pattern as /dev/radar-states: `notFound()`
 * during a production build, so every route beneath this segment returns 404 in
 * production. An e2e test asserts it.
 *
 * The shell is intentionally plain (brief §21: "do not spend time making
 * design-lab architecture elegant"). It must not flatter the directions or
 * contribute visual identity of its own.
 */
export default function DesignLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="dl-shell min-h-screen">
      <nav className="dl-switch flex flex-wrap items-center gap-x-1 px-3">
        <Link href="/design-lab" className="dl-switch__link">
          D0 Index
        </Link>
        {DIRECTIONS.map((direction) => (
          <Link
            key={direction.slug}
            href={`/design-lab/${direction.slug}`}
            className="dl-switch__link"
          >
            <span>{direction.letter}</span>
            <span className="hidden sm:inline">{direction.name}</span>
          </Link>
        ))}
        <span className="dl-switch__link ml-auto opacity-60">
          Alan Wake 2 · same data in all three
        </span>
      </nav>
      {children}
    </div>
  );
}
