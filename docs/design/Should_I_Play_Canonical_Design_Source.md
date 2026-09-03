# Should I Play? — Canonical Claude Design Source

**Status:** Durable locator for the accepted public-surface visual reference  
**Owner:** Tomas  
**Recorded:** 2 September 2026, closing
[Issue #47](https://github.com/Bergertomas/game_profile/issues/47)  
**Authority:** navigation aid. It names where the accepted visual artifact
lives and how to reach it; it does not amend any governing decision.

## Locator

| Field | Value |
|---|---|
| Claude Design MCP | `https://api.anthropic.com/v1/design/mcp` |
| Authentication | `/design-login` (Claude Code), or the session's claude.ai design authorization where the harness supplies one |
| Project | `1016e606-4407-4fb1-ad8d-f74c1e80ed82` |
| Project/file URL | `https://claude.ai/design/p/1016e606-4407-4fb1-ad8d-f74c1e80ed82?file=Should+I+Play+-+Canonical+Screens.dc.html` |
| File | **Should I Play - Canonical Screens.dc.html** |

The file carries, in this order: A1/A2 Rev 5.1 (homepage), A3–A6 (Game
Profile, art-led and artless, desktop and 390px), the B-rail implementation
annotations, C1–C4 (full Compare) with the C-rail, and the A7 reconciled
handoff card. Each frame is a `data-screen-label` element inside the
`<x-dc>` template; the profile and Compare frames are template-driven, so
their specimen rows, radar geometry and lists are filled from the file's own
data script at render time.

Other files in the same project — the paper draft, the standalone exports,
the older **Should I Play - Reconciled** artifact and the uploads — are
history or derivatives. They are not the canonical source.

## Authority and supersession rule

- GitHub governing records own product semantics, data truth, accessibility
  requirements, lawful artwork behaviour, deliberate drift and explicit
  supersessions: the Master Plan, the dated P0 decisions and resolution
  register, the Rubric and Evidence SOP, ADRs 0030–0034, the
  [shared handoff](Should_I_Play_Shared_Design_System_and_Interaction_Handoff_v1.0_2026-08-31.md),
  the [conformance matrix](Should_I_Play_Accessibility_and_Conformance_Matrix_v1.0_2026-08-31.md)
  and the [deliberate-drift log](Should_I_Play_Deliberate_Drift_Log.md).
- The accepted Claude Design artifact owns visual composition, hierarchy,
  geometry and art-direction reference for the accepted screens wherever
  those records have not explicitly superseded it.
- A conflict between the two is surfaced and resolved explicitly, and the
  resolution is recorded in the drift log or the owning document. Nothing is
  silently preferred: not a remembered screenshot, not derived prose, not a
  mock, not an implementation accident.
- Specimen content in the artifact — example scores, polygons, dates,
  practical time, storefront rows, evidence copy, artwork and its rights — is
  never publication truth (ADRs 0030, 0032 and 0034).

## Visual-implementation preflight

Any task that implements or audits an accepted Claude/Fable public surface
for visual fidelity does the following before editing, in addition to the
normal project preflight in `AGENTS.md` and the bootstrap:

1. read the shared handoff, the conformance matrix, the drift log and the
   ADRs for the surface;
2. read this locator;
3. authenticate to the Claude Design MCP and import the exact project/file
   above — not a derivative, not a screenshot, not memory;
4. inspect the frames for the surface and emit a design-source receipt that
   names the project, the file, the frame/section labels inspected, the
   accepted states present, the measurements that materially govern the
   implementation, and any conflict with newer GitHub authority;
5. stop rather than reconstruct from prose if the file cannot be imported
   or does not contain the expected frames.

Derived handoff prose remains necessary; it is not a substitute for the
accepted visual source when the task is visual fidelity.

## Known access limit

The MCP `get_file` read is capped at 256 KiB per file and the canonical file
is larger. The A1–A6 frames and the B-rail sit inside the cap; the C-rail's
tail, the A7 card and the file's data script do not. A receipt must say which
frames were read in full and how any template data outside the cap was
supplied. The A7 card is subordinate to the repository handoff in any case.
