import type { EvidenceSummary } from "@/lib/profile/build";
import type { Evaluation } from "@/lib/profile/types";
import {
  CONFIDENCE_LABEL,
  EVIDENCE_MATURITY_LABEL,
  EVIDENCE_STATUS_LABEL,
} from "@/lib/profile/vocabulary";
import { formatDate } from "@/lib/format";

/**
 * The compact trust line (Plan §6.6, SOP §6).
 *
 * Sits immediately above the profile, where a reader is about to consume eight
 * numbers and should know how much weight they carry.
 *
 * Two deliberate omissions:
 *  - No source count while the evidence ledger is `pending`. The calibration
 *    profiles were scored against broad critical consensus recorded as a few
 *    evidence *classes*; printing "3 sources" would understate the real basis
 *    more than saying nothing does.
 *  - Never "calculated from N reviews" (SOP §6). Sources are evidence, not
 *    votes in an average.
 */
export function TrustLine({
  evaluation,
  evidence,
}: {
  evaluation: Evaluation;
  evidence: EvidenceSummary;
}) {
  const parts: React.ReactNode[] = [
    <span key="status" className="text-bone">
      {EVIDENCE_STATUS_LABEL[evaluation.evidenceStatus]}
    </span>,
    <span key="confidence">
      {CONFIDENCE_LABEL[evaluation.confidence]} confidence
    </span>,
  ];

  if (evaluation.evidenceMaturity) {
    parts.push(
      <span key="maturity">
        {EVIDENCE_MATURITY_LABEL[evaluation.evidenceMaturity]} evidence
      </span>,
    );
  }

  if (evaluation.evidenceLedger === "populated") {
    parts.push(
      <span key="sources">
        Supported by {evidence.substantiveSources} substantive source
        {evidence.substantiveSources === 1 ? "" : "s"}
      </span>,
    );
    if (evidence.hasDirectPlay) {
      parts.push(<span key="direct">Includes direct play</span>);
    }
  } else {
    parts.push(
      <span key="ledger" className="text-bone-faint">
        Source records pending
      </span>,
    );
  }

  parts.push(
    <span key="checked" className="tabular">
      Evidence checked {formatDate(evaluation.evidenceCutoffAt)}
    </span>,
    <span key="rubric" className="tabular">
      Rubric v{evaluation.rubricVersion}
    </span>,
  );

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-bone-dim">
      {parts.map((part, index) => (
        <span key={index} className="flex items-center gap-x-2">
          {index > 0 && (
            <span aria-hidden="true" className="text-bone-faint">
              ·
            </span>
          )}
          {part}
        </span>
      ))}
    </p>
  );
}
