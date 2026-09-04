# Staged workflow patches

GitHub Actions workflow files can only be committed by a principal that holds the
`workflows` permission. The repository-native Claude runner's GitHub App token
does not, and a push containing one is rejected outright:

```
! [remote rejected] claude/issue-94-... -> claude/issue-94-...
  (refusing to allow a GitHub App to create or update workflow
   `.github/workflows/orchestrator-wake.yml` without `workflows` permission)
```

That is why every `.github/workflows/**` change in PR #83 was committed by the
owner rather than the runner. It is a transport limitation, not a review step:
the runner may still author, prove and hand over the exact file.

This directory holds workflow files the runner has authored and verified but
cannot push into `.github/workflows/`. Each one is **byte-for-byte the file that
should be live** — no headers, no placeholders, nothing to edit before applying.

## Applying one

```bash
git mv docs/operations/patches/<name>.yml .github/workflows/<name>.yml
git commit -m "ops: apply staged <name> workflow patch"
```

Delete the staged copy in the same commit — the `git mv` above does that. Do not
leave both files in the tree: `tests/orchestrator-wake.test.ts` resolves the
bridge script from the staged copy while it exists and from the live workflow
once it is gone, and it fails loudly if a staged copy survives after its live
counterpart already carries the same content. The suite always proves the file
that will actually run.

## Currently staged

| File | Applies to | Authority |
|---|---|---|
| `orchestrator-wake.yml` | `.github/workflows/orchestrator-wake.yml` | issue #94 — workflow-path discrimination and the `pull-requests: write` correction; `docs/operations/ChatGPT_Work_GitHub_Wake.md` §3 owns the contract |

When the table is empty, this directory should be removed.
