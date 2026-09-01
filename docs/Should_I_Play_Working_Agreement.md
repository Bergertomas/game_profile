# Should I Play — Working Agreement

**Status:** Current cross-chat operating agreement

**Owner:** Tomas

**Last updated:** 1 September 2026

## 1. Purpose and authority

This document governs how Tomas, Codex, Claude, and other engineering agents
plan, execute, review, integrate, and report work on Should I Play.

It is a process agreement, not a product specification. Product meaning,
scoring, evidence, design, architecture, and release requirements remain owned
by the Master Plan, decision and resolution documents, rubric, Evidence SOP,
ADRs, and other authorities listed in `AGENTS.md`.

The standing bias is toward useful forward motion, efficient context use, and a
production-capable product. Small imperfections should not repeatedly stall a
working slice. Material risk should.

This agreement explicitly supersedes earlier one-off instructions requiring
Tomas to approve every routine commit, push, or pull-request action. A later
explicit instruction from Tomas can still change the policy.

## 2. Roles

- **Tomas:** product owner and final authority for product/editorial decisions,
  material scope changes, and production activation.
- **Codex:** CTO/project-manager role by default — frame slices, protect product
  authority, review actual diffs and evidence, decide engineering acceptance,
  manage integration, and surface material trade-offs.
- **Claude:** primary engineering executor by default — implement bounded
  slices, test them, report exact repository state, and correct material review
  findings.
- **Any agent:** may challenge an instruction when it creates concrete material
  risk. The challenge must identify the evidence, likely impact, and least-cost
  safe alternative.

Roles are defaults, not exclusive capability boundaries. The assigned task and
the current repository state determine who acts.

## 3. Default delivery loop

1. **Frame a bounded slice.** State the outcome, relevant authority, acceptance
   criteria, dependencies, and anything explicitly out of scope.
2. **Implement in isolation.** Prefer a scoped branch/worktree. Preserve dirty
   user work and do not reset, overwrite, or silently absorb unrelated changes.
3. **Verify proportionally.** Run the smallest checks that give credible
   evidence for the change. Expand verification when the change is cross-cutting
   or the risk justifies it.
4. **Report precisely.** Include the branch and SHA, meaningful diff summary,
   checks run and results, known limitations, and any remote or production-side
   effects.
5. **Review the actual change.** Inspect the real diff and relevant behavior,
   not only the implementer's narrative. Classify findings as blocking or
   follow-up using Section 5.
6. **Correct material findings.** Re-review the changed area. Avoid restarting a
   full audit for every narrow correction unless the correction changes the
   broader risk profile.
7. **Accept and integrate.** The normal path is branch → review → correction if
   needed → acceptance → merge. Direct work on `main` is atypical. A reviewed
   branch may be merged without a separate ceremonial approval when integration
   is already within the assigned task; otherwise report it as ready to merge.

Ordinarily, one complete review/correction pass should be enough. Further
iterations should be driven by remaining material risk, not by the existence of
minor possible improvements.

## 4. Actions that do and do not require fresh approval

Within an assigned engineering task, agents may normally perform these routine,
recoverable actions without asking Tomas each time:

- create or switch scoped branches and worktrees;
- edit in-scope files;
- run local checks, tests, builds, and read-only inspections;
- commit coherent work with an accurate message;
- push the scoped branch;
- create or update a pull request;
- fetch and inspect remote repository state; and
- make review-requested corrections within the accepted scope.

Explicit authority is still required before actions with materially different
or difficult-to-reverse consequences, including:

- activating or changing production deployments;
- production database migrations, writes, imports, or destructive data work;
- changing secrets, credentials, access policy, domains, DNS, billing, or live
  Cloudflare/Neon configuration;
- deleting or rewriting material history or user work;
- publishing editorial content or making external communications when that was
  not part of the assigned task; or
- choosing among materially different product directions when current authority
  does not resolve the choice.

Tool or platform security prompts may still require a click; that is an
execution constraint, not a project-management approval ceremony.

## 5. Review threshold

### Block acceptance when a finding creates material risk

- security, privacy, data-loss, rights, or production-safety exposure;
- a broken core journey or significant regression;
- fabricated evidence, misleading editorial claims, incorrect scoring meaning,
  or another breach of user trust;
- accessibility failure that prevents or seriously impairs use;
- architecture or data-model behavior likely to cause significant rework,
  unsafe deployment, or incompatible integration;
- tests that are materially green for the wrong reason, or missing verification
  for a high-risk behavior; or
- a clear conflict with governing product authority that changes the delivered
  outcome.

### Accept and log for later when the issue is non-material

- small styling or design-token misreferences that do not change the intended
  experience;
- dead code, minor duplication, naming cleanup, or test-harness polish;
- cosmetic inconsistencies and low-impact edge cases;
- temporary migration or documentation drift that does not make the current
  slice unsafe or misleading; or
- broader cleanup that is better handled once several slices are integrated.

Non-blocking findings belong in the task/PR handoff or a cleanup list. They do
not need to trigger another implementation loop. If several small issues combine
into meaningful product, maintenance, or release risk, classify the combined
effect as material and explain why.

## 6. Verification and context efficiency

- Match checks to risk: narrow change, targeted checks; shared contract or
  integration change, broader suite; release candidate, full release checks.
- Visual or interaction changes require relevant browser/visual evidence, but
  not a full-product audit on every small patch.
- Distinguish product failures from environment or harness failures and report
  both accurately.
- Read the authorities relevant to the slice. Load the full governing set for
  cross-cutting decisions, major integration, or release work; do not repeatedly
  reload unrelated historical material for a narrow correction.
- Reuse prior verified context when the underlying files and SHAs have not
  changed. Verify unstable facts rather than re-deriving the whole project.

## 7. Repository and integration hygiene

- Treat the authoritative dirty worktree as owner work: inspect first, preserve
  it, and prefer isolated review/implementation worktrees.
- Do not assume that every unmerged branch should land. Compare it with `main`,
  current governing documents, and newer competing implementations.
- A functionally good slice can be accepted before its governing-document branch
  is integrated, but it is not merge-ready until the integration base is sound.
- Keep commits coherent and do not include unrelated user changes.
- Before merging, confirm the intended branch, exact SHA, checks, conflicts, and
  relationship to current `main`.
- “Slice accepted,” “merge-ready,” and “production-ready” are distinct states.
  Production readiness may include a later cleanup, security, accessibility,
  content, migration, and release pass.

## 8. Communication and decision style

- Lead with outcome and material risk. Keep routine mechanics concise.
- Use exact branches, SHAs, checks, and observed effects when they matter.
- Do not turn small cleanup observations into release-blocking language.
- Do not wave through a material risk for speed. If Codex or Claude overrules
  Tomas's initial preference, provide concrete evidence and downstream impact.
- When uncertainty is inexpensive and reversible, make a reasonable scoped
  assumption and continue. Ask Tomas when the answer would materially change the
  product, scope, production state, or irreversible outcome.

## 9. Maintaining this agreement

Update this document when Tomas changes the standing workflow. Keep project-level
memory and agent instruction files as short pointers to this canonical copy so
future chats use one policy rather than drifting duplicates. If a chat-specific
instruction conflicts with this agreement, the latest explicit instruction wins
for that work; update this document when the change is intended to persist.
