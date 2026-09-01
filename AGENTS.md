<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project authority and required reading

First read `docs/Should_I_Play_Working_Agreement.md`. It is the canonical
cross-chat process for task framing, routine Git authority, review thresholds,
verification depth, integration, and production approval. It governs how work is
done; it does not override the product authorities below.

Before beginning material product, editorial, design, data-model, or implementation work, read:

1. `docs/Game_Profile_Master_Product_and_Build_Plan_v0.9.md`
2. `docs/Should_I_Play_Public_Product_P0_Decisions_2026-08-24.md`
3. `docs/Should_I_Play_Public_Product_Resolutions_2026-08-25.md`
4. `docs/Game_Profile_Scoring_Rubric_v1.0.md`
5. `docs/Game_Profile_Editorial_Evidence_and_Data_Sourcing_SOP_v0.2.md`
6. for scoring/calibration work, `docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md`
   and its package schema — both remain candidate material until calibration
7. the ADRs relevant to the work under `docs/decisions/`
8. the current `README.md`, code, and tests in the area being changed

For a narrow correction, reuse already verified governing context and reload
only the authorities and implementation surfaces affected by the change. For
cross-cutting product decisions, integration, or release work, read the full
relevant governing set above.

Use these authority boundaries:

- The Master Plan is the product, architecture, roadmap, phase-status, and decision constitution.
- The dated Public Product P0 Decisions document owns its recorded owner decisions.
- The dated Public Product Resolution Register owns the later Search,
  discovery, metadata, time, analytics, commerce, release, personalization and
  corrected-artwork decisions; where it explicitly records a later correction,
  it supersedes the 24 August wording.
- The Rubric exclusively owns scoring meaning, criteria, derivation, Unknown/range behavior, and evaluation rules.
- The Evidence SOP exclusively owns evidence collection, sourcing, reconciliation, confidence, and ledger procedure.
- The candidate Scoring Protocol operationalizes evidence-to-number work but is not governing until its calibration gates pass and Tomas approves it; its explicit proposed supersessions remain provisional meanwhile.
- Calibration reports own their approved calibration outcomes and locked totals.
- The Brand/SEO foundation, art-direction brief, D3 records, and ADR 0013 own their respective brand, visual, and design-system decisions.
- ADRs own accepted implementation decisions within the boundaries above.
- The README, code, migrations, and tests describe implemented behavior and provide evidence; they do not silently amend the governing documents.

**Master Plan v0.9 is the current authority.** It supersedes v0.8 for product
scope, information architecture, roadmap status, architecture direction, and
cross-system contracts. v0.8 and earlier Master Plans, and every Project Context
file, are continuity records: read them for history, never as current authority
on a question v0.9 answers. Preserve historical documents unless explicitly
directed otherwise.

A Master Plan's own header may lag the repository between checkpoints — a phase can complete before the status line naming it is rewritten. That is drift to reconcile at the next checkpoint, not licence to treat the plan as stale on questions of product meaning.

If documents or implementation conflict, do not resolve the conflict silently or by convenience. Identify it, determine which authority owns the question, and report the discrepancy before encoding a material product decision. When code differs from the governing documents, treat that as drift to reconcile, not as an implicit amendment.
