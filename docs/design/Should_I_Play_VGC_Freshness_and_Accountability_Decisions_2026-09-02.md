# Should I Play? — Freshness and accountability presentation decisions

**Date:** 2 September 2026

**Status:** Owner-approved deferred design input

**Owner:** Tomas

**Destination:** Master-checklist Item 12 — deferred public-product and Compare
visual/UX parity work

## Purpose

This record preserves the useful product-presentation lessons from the 2
September 2026 review of VideoGamesCritic against the accepted Claude/Fable
canonical screens. It does not make VideoGamesCritic a visual, methodological
or product benchmark. The accepted A1–A6 and C1–C4 direction and the shared
design-system handoff remain the visual constitution.

The useful lesson is narrower: Should I Play? already holds stronger scoped
evidence, confidence, reassessment and revision facts, but several of those
facts can become more immediately legible as signs of editorial currency and
accountability.

## Owner decisions

The later public presentation should make these questions easier to answer:

1. How current is this profile?
2. What classes of evidence support it?
3. Where does the evidence materially disagree?
4. What changed in the latest reassessment?

The public product must **not** surface, promote or imply personal play
coverage, completion status, or whether the editor personally played a game.
Should I Play? does not depend on every profile being a personal playthrough.
Its public authority rests on the governed evidence and editorial method.

This is a public-projection rule only. Internal evidence records and scoring
packages may continue to preserve direct-play distinctions wherever the
Evidence SOP or controlled scoring contract requires them for auditability.

## Already implemented foundations

The present architecture already carries the relevant facts:

- evaluation scope and build/patch identity;
- evidence status, overall confidence and evidence cut-off;
- evidence-source categories and reconciled category counts;
- per-dimension confidence, rationales and evidence notes;
- immutable evaluation lineage and supersession;
- `changeSummary` on an evaluation revision;
- a factual `recently-reassessed` homepage membership rule.

No new database migration is justified by this design input. If the bounded
design pass later proves that a missing durable fact is necessary, treat that
as an explicit data-contract proposal rather than inferring it from dates or
copy.

## Sequencing

### Now

- Preserve this decision record in GitHub.
- Remove direct-play status/category presentation from the public profile trust
  band while retaining the internal evidence distinction.
- Do not reopen the accepted art direction or interrupt Phase 3A.

### Phase 3A Item 4

Do not change scoring semantics for this presentation work. Engineering
readiness should merely continue to preserve the controlled facts already
required by the candidate package: scope/build, evidence cutoff, evidence
classes, confidence facts, reassessment record and change rationale. Public
projection remains outside the scoring pass.

### Master-checklist Item 12

Begin Item 12 with one **bounded Claude/Fable revision pass** over the accepted
canonical project. This is not a new direction exercise. Limit the pass to:

1. A1/A2 — make factual publication/reassessment activity more legible without
   adding fake activity, popularity or ranking. Review the existing “Newly
   profiled” and “Recently reassessed” treatments as one coherent factual
   freshness system.
2. A3–A6 — strengthen the existing scope/build/evidence hierarchy so currency
   is immediately readable without adding a dashboard panel.
3. A3–A6 — refine “How this profile was made” into a concrete evidence-class
   receipt without direct-play or completion coverage and without treating
   counts as votes.
4. A3–A6 — expose a concise permanent reason beside Medium/Low confidence where
   the reason materially affects the reading; keep full rationale/provenance in
   the existing disclosure.
5. A3–A6 — give a material reassessment a concise conditional “What changed”
   treatment using the existing revision/change-summary contract.
6. Validate the revised treatments at desktop, 390px, 320px, 200% text zoom,
   keyboard-only and reduced motion before implementation.

After owner acceptance, implement the delta against the shared design system
and run the existing visual/accessibility conformance workflow. Do not repeat
the whole Gate A/Gate B discovery process.

## Explicit non-goals

- no overall score, aggregate, rank, winner or match percentage;
- no VideoGamesCritic visual-language adoption;
- no keyword-frequency or automated sentiment presentation;
- no source/reviewer leaderboard or source averaging;
- no public personal-play/completion coverage;
- no experience-curve or unofficial ninth dimension;
- no core-profile screenshot/trailer gallery;
- no new design system, page hierarchy or Compare concept;
- no full public revision-history product in this slice; that remains a later
  roadmap capability.
