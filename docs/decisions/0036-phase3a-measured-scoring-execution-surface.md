# ADR 0036 — Phase 3A measured scoring uses controlled GPT-5.6 Sol API executions

- **Status:** Accepted owner decision for Phase 3A calibration execution; does not authorize scoring by itself
- **Date:** 2026-09-02
- **Owner / final editorial authority:** Tomas
- **Related:** Scoring Protocol v1.0 candidate §§2.3, 11, 13 and Appendix B; Phase 3A preregistration; ADR 0035

## Context

The calibration protocol measures same-snapshot independent GPT repeatability. Ordinary ChatGPT web conversations do not expose an immutable model snapshot/build identifier, exact hidden system instructions, or all decoding parameters needed by the candidate run manifest. Using two normal chat tabs would therefore make a strong editorial rehearsal but a weak reproducibility measurement.

OpenAI's current GPT-5.6 Sol model documentation exposes `gpt-5.6-sol` as the concrete Sol model identifier under its snapshot section, distinguishes it from the `gpt-5.6` alias, supports `reasoning.effort = high`, and supports the Responses API/Structured Outputs.

The project still wants ChatGPT to remain the orchestrator and GPT-5.6 Sol High to remain the editorial scorer. Engineering agents must not become scorers merely because execution moves to an API harness.

## Decision

For the measured Phase 3A primary/audit executions:

1. Use OpenAI `gpt-5.6-sol`, not the moving `gpt-5.6` alias.
2. Use `reasoning.effort = high`, standard reasoning mode unless explicitly amended.
3. Use a repository-controlled stateless API harness, initially the Responses API, with no conversation/previous-response linkage.
4. Supply repository-frozen system/developer instructions, scoring prompt, scope, frozen corpus, rubric, effective protocol and output schema.
5. Give both paired scoring calls byte-identical semantic inputs and exposed configuration. They are separate requests and share no model conversation state.
6. Expose **no web/research tools** to either scoring pass. Research is a separate pass with separately controlled tool access.
7. Compute SHA-256 over exact controlled instruction/prompt/methodology/schema bytes and store them in the run manifest.
8. Require the harness to verify the returned model identity against the preregistered model identifier before a run counts.
9. Where the chosen endpoint exposes no seed, record `parameter_unavailable` exactly as the candidate protocol permits; do not fabricate one.
10. Codex/Claude may implement/run/validate the harness but may not choose, repair or adjudicate semantic scores. Any semantic model retry is a new run and is logged.

## Owner approval

Tomas explicitly approved this execution direction on 2026-09-02 together with the Phase 3A scope/execution gates. This approval fixes the intended measured execution surface for Item 3. It does **not** assert that the harness already exists or works: Item 4 must prove the implementation before D1 can start.

## Consequence

ChatGPT web remains the project/orchestration conversation and owner-facing decision surface. The measured scoring pair becomes a reproducible machine execution of the same designated GPT model rather than an informal two-tab comparison.

The checklist boundary is deliberate:

- **Item 3 preregisters and freezes this contract.**
- **Item 4 proves the API/harness/validator/digest implementation against it.**
- **D1 remains blocked until Item 4 passes.**

This avoids making Item 3 depend on completion of the next checklist item while preserving the exact same safety gate before scoring.

## Failure boundary

If Item 4 cannot demonstrate that the current OpenAI contract preserves the preregistered `gpt-5.6-sol` identity and High-reasoning configuration sufficiently for the candidate protocol, stop and return to methodology design. Do not silently fall back to `gpt-5.6`, ChatGPT UI, another model, Pro mode, or an engineering agent's judgment.
