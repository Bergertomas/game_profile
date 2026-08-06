import Link from "next/link";
import { DIRECTIONS, designLabProfile } from "@/lib/design-lab/profile";

export const metadata = { title: "D0 — Art direction exploration" };

export default function DesignLabIndex() {
  const profile = designLabProfile();

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8">
      <p className="text-xs uppercase tracking-[0.16em] text-[#9a978f]">
        D0 · Art direction exploration
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[#ece7dd]">
        Three directions, one profile
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#9a978f]">
        Every direction renders the same published Alan Wake 2 evaluation —
        identical scores, tags, evidence and recommendation text. Differences
        are compositional only: layout, typography, density, artwork treatment,
        radar integration and evidence language. This is exploration, not a
        production redesign, and no winner has been chosen.
      </p>

      <dl className="mt-8 grid gap-x-8 gap-y-2 border-y border-[#242a32] py-4 text-sm sm:grid-cols-2">
        {profile.dimensions.map((d) => (
          <div key={d.dimension.key} className="flex justify-between gap-4">
            <dt className="text-[#9a978f]">{d.dimension.name}</dt>
            <dd className="tabular text-[#ece7dd]">{d.display}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-10 space-y-px">
        {DIRECTIONS.map((direction) => (
          <li key={direction.slug}>
            <Link
              href={`/design-lab/${direction.slug}`}
              className="block border-t border-[#242a32] py-5 transition-colors hover:bg-[#111317]"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-lg font-semibold text-[#b4321e]">
                  {direction.letter}
                </span>
                <h2 className="text-lg font-medium text-[#ece7dd]">
                  {direction.name}
                </h2>
                <span className="ml-auto text-xs uppercase tracking-[0.14em] text-[#6d6b64]">
                  {direction.field}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#9a978f]">
                {direction.thesis}
              </p>
              <p className="mt-1.5 text-xs text-[#6d6b64]">{direction.type}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
