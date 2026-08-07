import Link from "next/link";
import {
  DIRECTIONS,
  DIRECTION_D,
  designLabProfile,
  designLabProfiles,
} from "@/lib/design-lab/profile";

export const metadata = { title: "Design lab — D0 and Direction D" };

export default function DesignLabIndex() {
  const profile = designLabProfile();

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8">
      <p className="text-xs uppercase tracking-[0.16em] text-[#9a978f]">
        Design lab · development only
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[#ece7dd]">
        D0 exploration, and the direction it resolved into
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#9a978f]">
        A, B and C are the D0 exploration and are kept intact as review
        artifacts. D is the consolidated direction chosen after that review.
        Every route renders real published evaluations — identical scores, tags,
        evidence and recommendation text — so differences are compositional
        only. Nothing here is production UI.
      </p>

      {/* Direction D ------------------------------------------------------ */}
      <div className="mt-10 border-t-2 border-[#b4321e] pt-5">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold text-[#b4321e]">
            {DIRECTION_D.letter}
          </span>
          <h2 className="text-lg font-medium text-[#ece7dd]">
            {DIRECTION_D.name}
          </h2>
          <span className="ml-auto text-xs uppercase tracking-[0.14em] text-[#6d6b64]">
            {DIRECTION_D.field}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#9a978f]">
          {DIRECTION_D.thesis}
        </p>
        <p className="mt-1.5 text-xs text-[#6d6b64]">{DIRECTION_D.type}</p>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {designLabProfiles().map((view) => (
            <li key={view.game.slug}>
              <Link
                href={`/design-lab/d/${view.game.slug}`}
                className="text-[#ece7dd] underline underline-offset-4"
              >
                {view.game.canonicalTitle}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/design-lab/d/states"
              className="text-[#ece7dd] underline underline-offset-4"
            >
              Score-state proof
            </Link>
          </li>
        </ul>
      </div>

      {/* The evaluation every direction renders ---------------------------- */}
      <p className="mt-10 text-xs uppercase tracking-[0.16em] text-[#6d6b64]">
        Alan Wake 2 — the shared comparison profile
      </p>
      <dl className="mt-3 grid gap-x-8 gap-y-2 border-y border-[#242a32] py-4 text-sm sm:grid-cols-2">
        {profile.dimensions.map((d) => (
          <div key={d.dimension.key} className="flex justify-between gap-4">
            <dt className="text-[#9a978f]">{d.dimension.name}</dt>
            <dd className="tabular text-[#ece7dd]">{d.display}</dd>
          </div>
        ))}
      </dl>

      {/* D0 exploration ---------------------------------------------------- */}
      <p className="mt-10 text-xs uppercase tracking-[0.16em] text-[#6d6b64]">
        D0 exploration — kept as reviewed
      </p>
      <ul className="mt-2 space-y-px">
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
