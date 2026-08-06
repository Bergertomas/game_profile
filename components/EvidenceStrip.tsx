import { formatDate } from "@/lib/format";
import type { EvaluationStatus, Evaluation, EvidenceStatus } from "@/lib/profile/types";
import {
  CONFIDENCE_LABEL,
  EVIDENCE_MATURITY_LABEL,
  EVIDENCE_MATURITY_MEANING,
  EVIDENCE_STATUS_LABEL,
} from "@/lib/profile/vocabulary";

/**
 * Evidence and scope plate (Plan §6.5, Rubric §1 "Required evaluation scope").
 *
 * Two rules drive the design:
 *  1. The three evidence states are distinguished by border treatment and
 *     wording, never by hue alone — a status is not a score (Rubric §13), so it
 *     must not read as a traffic light.
 *  2. Scope is public, not just a database column. A score with no declared
 *     edition, mode, platform and build is not a valid score.
 */

const EVIDENCE_MEANING: Record<EvidenceStatus, string> = {
  verified: "Substantial post-release evidence. This profile is stable.",
  provisional:
    "Released, but the evidence is incomplete or the product is still changing.",
  pre_release:
    "Based on preview, demo or first-party evidence. Scores are estimates and will be reassessed after launch.",
};

export function EvidenceBadge({
  status,
  className = "",
}: {
  status: EvidenceStatus;
  className?: string;
}) {
  const border =
    status === "verified"
      ? "border-solid border-bone-dim text-bone"
      : status === "provisional"
        ? "border-dashed border-bone-faint text-bone-dim"
        : "border-dashed border-brass text-brass";

  return (
    <span
      className={`label-micro inline-flex items-center border px-2 py-1 ${border} ${className}`}
    >
      {EVIDENCE_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Compact evidence plate for the hero. Plan §6.1 puts the evidence and
 * confidence badges above the fold on both desktop and mobile — a reader should
 * know how solid a profile is before they read a single number.
 */
export function EvidenceSummary({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div className="border border-line bg-ink-900/70 p-4 sm:min-w-[15rem]">
      <span className="label-micro text-bone-faint">Evidence</span>
      <div className="mt-2">
        <EvidenceBadge status={evaluation.evidenceStatus} />
      </div>
      <dl className="mt-4 space-y-2 border-t border-line pt-3">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="label-micro text-bone-faint">Confidence</dt>
          <dd className="text-[0.8125rem] text-bone">
            {CONFIDENCE_LABEL[evaluation.confidence]}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="label-micro text-bone-faint">Checked</dt>
          <dd className="tabular text-[0.8125rem] text-bone">
            {formatDate(evaluation.evidenceCutoffAt)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="label-micro text-bone-faint">Build</dt>
          <dd className="max-w-[11rem] text-right text-[0.8125rem] leading-snug text-bone">
            {evaluation.scope.buildOrPatch}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function EvidenceStrip({ evaluation }: { evaluation: Evaluation }) {
  const { scope } = evaluation;

  return (
    <div className="border border-line bg-ink-900/60">
      <dl className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        <Field label="Evidence">
          <EvidenceBadge status={evaluation.evidenceStatus} />
        </Field>
        <Field label="Confidence">
          <span className="text-sm text-bone">
            {CONFIDENCE_LABEL[evaluation.confidence]}
          </span>
        </Field>
        <Field label="Evidence checked">
          <span className="tabular text-sm text-bone">
            {formatDate(evaluation.evidenceCutoffAt)}
          </span>
        </Field>
        <Field label="Rubric">
          <span className="tabular text-sm text-bone">
            v{evaluation.rubricVersion}
          </span>
        </Field>
      </dl>

      <div className="border-t border-line px-3 py-3 sm:px-4">
        <p className="text-[0.8125rem] leading-relaxed text-bone-dim">
          {EVIDENCE_MEANING[evaluation.evidenceStatus]}
        </p>
        {evaluation.evidenceMaturity && (
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-bone-dim">
            <span className="text-bone">
              {EVIDENCE_MATURITY_LABEL[evaluation.evidenceMaturity]}.
            </span>{" "}
            {EVIDENCE_MATURITY_MEANING[evaluation.evidenceMaturity]}
          </p>
        )}
      </div>

      <div className="border-t border-line px-3 py-3 sm:px-4">
        <span className="label-micro text-bone-faint">What was assessed</span>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-bone-dim">
          <ScopeItem>{scope.edition}</ScopeItem>
          <ScopeItem>{scope.mode}</ScopeItem>
          <ScopeItem>{scope.platforms.join(", ")}</ScopeItem>
          <ScopeItem last>{scope.buildOrPatch}</ScopeItem>
        </p>
        {scope.currentStateCutoff && (
          <p className="mt-1.5 text-xs text-bone-faint">
            Current-state cutoff {formatDate(scope.currentStateCutoff)}. This
            product may continue to change.
          </p>
        )}
      </div>

      {evaluation.platformWarning && (
        <div className="border-t border-line px-3 py-3 sm:px-4">
          <span className="label-micro text-brass">Platform note</span>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-bone-dim">
            {evaluation.platformWarning}
          </p>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line px-3 py-3 last:border-b-0 sm:border-b-0 sm:px-4 [&:nth-child(2)]:border-b [&:nth-child(2)]:border-line sm:[&:nth-child(2)]:border-b-0">
      <dt className="label-micro text-bone-faint">{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}

function ScopeItem({
  children,
  last = false,
}: {
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <>
      <span className="text-bone">{children}</span>
      {!last && <span className="px-1.5 text-bone-faint">·</span>}
    </>
  );
}

export function statusIsPublic(status: EvaluationStatus): boolean {
  return status === "published";
}
