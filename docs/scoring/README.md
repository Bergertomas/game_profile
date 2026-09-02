# Game Profile scoring execution artifacts

This directory contains repository-controlled prompt/instruction artifacts used by the Phase 3A calibration harness.

Current Phase 3A candidates:

- `Phase_3A_Execution_System_Instructions_v1.0.md` — controlled developer/system instruction envelope for measured GPT executions.
- `Phase_3A_Research_Prompt_v1.0.md` — research-only collection/freeze prompt; currently present on `main` as a preregistration candidate.
- `Phase_3A_Scoring_Prompt_v1.0.md` — byte-identical semantic scoring prompt for both primary and audit passes.

These files do not define rubric meaning and do not make the candidate Scoring Protocol governing. Git blob provenance may be recorded during final preregistration review so Tomas can approve exact repository bytes. After Item 3 approval/merge, Item 4 must compute and verify the protocol-required SHA-256 values from those exact bytes before D1; Git blob IDs are provenance, not a substitute for the run-manifest hashes.
