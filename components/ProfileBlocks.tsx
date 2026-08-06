import type { TagView } from "@/lib/profile/build";
import type { BlockType, Evaluation, EvidenceStatus } from "@/lib/profile/types";
import { BLOCK_ORDER, blockHeadings } from "@/lib/profile/vocabulary";
import { TAG_CATEGORY_LABELS, type TagCategory } from "@/lib/rubric/tags";

/**
 * Primary pull / primary risk (Rubric §12) and the three interpretation blocks
 * (Plan §6.3). This is where the numbers become a purchase decision.
 */

export function PullRisk({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
      <Card label="Primary pull" text={evaluation.primaryPull} accent />
      <Card label="Primary risk" text={evaluation.primaryRisk} />
    </div>
  );
}

function Card({
  label,
  text,
  accent = false,
}: {
  label: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-ink-900 p-4 sm:p-5">
      <span
        className={`label-micro ${accent ? "text-brass" : "text-bone-dim"}`}
      >
        {label}
      </span>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-bone">{text}</p>
    </div>
  );
}

/**
 * Headings shift before release: a pre-release profile describes observed
 * evidence, never a final purchase verdict (SOP §10.8).
 */
export function RecommendationBlocks({
  blocks,
  evidenceStatus,
}: {
  blocks: Readonly<Record<BlockType, readonly string[]>>;
  evidenceStatus: EvidenceStatus;
}) {
  const headings = blockHeadings(evidenceStatus);

  return (
    <div className="grid gap-px overflow-hidden border border-line bg-line lg:grid-cols-3">
      {BLOCK_ORDER.map((type) => (
        <section key={type} className="bg-ink-900 p-4 sm:p-5">
          <h3 className="display text-lg text-bone">{headings[type].title}</h3>
          <p className="label-micro mt-1 text-bone-faint">
            {headings[type].note}
          </p>
          <ul className="mt-4 space-y-2.5">
            {blocks[type].map((item) => (
              <li
                key={item}
                className="grid grid-cols-[0.75rem_1fr] gap-x-2 text-[0.875rem] leading-relaxed text-bone-dim"
              >
                <span aria-hidden="true" className="pt-[0.35rem] text-brass">
                  <span className="block h-px w-2.5 bg-current" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const CATEGORY_ORDER: readonly TagCategory[] = [
  "structure",
  "narrative",
  "play",
  "friction",
  "mood",
  "social",
  "technical",
];

export function ExperienceTags({ tags }: { tags: readonly TagView[] }) {
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: tags.filter((tag) => tag.definition.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-4">
      {grouped.map(({ category, items }) => (
        <div key={category} className="sm:grid sm:grid-cols-[9rem_1fr] sm:gap-4">
          <span className="label-micro block pt-1.5 text-bone-faint">
            {TAG_CATEGORY_LABELS[category]}
          </span>
          <ul className="mt-2 flex flex-wrap gap-1.5 sm:mt-0">
            {items.map((tag) => (
              <li key={tag.definition.key}>
                <span
                  className="inline-flex items-baseline gap-1.5 border border-line bg-ink-900 px-2 py-1 text-[0.8125rem] text-bone-dim"
                  title={tag.definition.description}
                >
                  {tag.definition.label}
                  {tag.intensity && (
                    <span className="label-micro text-brass">
                      {tag.intensity}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
