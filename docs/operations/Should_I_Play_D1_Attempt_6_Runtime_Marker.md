# D1 attempt 6 runtime marker

This draft-only pull request marks the exclusive local execution window for
issue #101. It is not a methodology, configuration, corpus, or product change
and is not intended to merge.

- Opened from `main` `d5f195c499cff3797524333e5b9e6b4d4ce07e9f`.
- Runtime claim begins only after the current rate-limit capacity gate passes.
- The registered research model and configuration remain unchanged.
- Attempts 1–5 remain immutable and are not supplied as model context.
- Exactly one authorized attempt-6 research call may run.
- No paired scoring may begin before independent acceptance of a real corpus.

Close this marker pull request, without merging it, after attempt 6 succeeds and
its artifacts are preserved and independently audited. If execution fails, keep
the marker open until the resulting frontier is durably recorded.

Marker opened at `2026-09-05T21:47:34Z`.
