<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project authority and required reading

Before beginning material product, editorial, design, data-model, or implementation work, read:

1. `docs/Game_Profile_Master_Product_and_Build_Plan_v0.8.md`
2. `docs/Game_Profile_Scoring_Rubric_v1.0.md`
3. `docs/Game_Profile_Editorial_Evidence_and_Data_Sourcing_SOP_v0.2.md`
4. the ADRs relevant to the work under `docs/decisions/`
5. the current `README.md`, code, and tests in the area being changed

Use these authority boundaries:

- The Master Plan is the product, architecture, roadmap, phase-status, and decision constitution.
- The Rubric exclusively owns scoring meaning, criteria, derivation, Unknown/range behavior, and evaluation rules.
- The Evidence SOP exclusively owns evidence collection, sourcing, reconciliation, confidence, and ledger procedure.
- Calibration reports own their approved calibration outcomes and locked totals.
- The Brand/SEO foundation, art-direction brief, D3 records, and ADR 0013 own their respective brand, visual, and design-system decisions.
- ADRs own accepted implementation decisions within the boundaries above.
- The README, code, migrations, and tests describe implemented behavior and provide evidence; they do not silently amend the governing documents.

**Master Plan v0.8 is the current authority.** It states in its own §0.1 that it supersedes v0.7 for product scope, information architecture, roadmap status, architecture direction, and cross-system contracts. v0.7 and earlier Master Plans, and every Project Context file, are continuity records: read them for history, never as current authority on a question v0.8 answers. Preserve historical documents unless explicitly directed otherwise.

A Master Plan's own header may lag the repository between checkpoints — a phase can complete before the status line naming it is rewritten. That is drift to reconcile at the next checkpoint, not licence to treat the plan as stale on questions of product meaning.

If documents or implementation conflict, do not resolve the conflict silently or by convenience. Identify it, determine which authority owns the question, and report the discrepancy before encoding a material product decision. When code differs from the governing documents, treat that as drift to reconcile, not as an implicit amendment.
