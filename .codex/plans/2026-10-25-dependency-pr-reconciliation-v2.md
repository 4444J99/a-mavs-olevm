# Dependency PR reconciliation, revision 2

Owner: ACE issue 12, GMSE dependency family issue 133 and the original PRs.
Branch: work/gmse-dependency-reconciliation-20261025, based on the verified
runtime repair head 151113c (PR 187, submitted once, not claimed merged).

Continue step 4 of the preceding source-acceptance plan in the existing owned
checkout. Keep the 209 original image edits unchanged and retain the checkout.
No new worktree, source/media hydration, provider execution or deletion.

1. Merge the requested manifest updates of PR 180 into current manifests rather
   than replace stale files. Reconcile root and all four exhibit lock graphs,
   including the single-package source-map/Vite/parser/yaml/engine fixes.
2. Retain current scripts, publication boundaries and all tests. Restore the
   source-owned BrowserSync Immutable scoped override from PR 135 and prove
   server/UI/reload compatibility. Preserve the advertised and pinned Node
   contracts; align React/ReactDOM peer ranges if the intended upgrade requires it.
3. Use bounded serial npm lock/install operations and consumer builds. Validate
   exact root declarations, dependency ancestry, peers, engine floor and audit
   results. Investigate failures without disabling intended dependencies or checks.
4. Compare every dependency PR's requested versions and unique files against
   the resulting graph. Preserve historical evidence and newer source modules.
5. Publish a reviewed successor with exact-head submission once. Retain original
   carriers until default-branch readback proves their intentions integrated.
   Keep unresolved deployment, device/artistic/custody and portfolio requirements
   with their existing owners; no completion seal follows from package updates.

Attempt bound: 30 minutes from 18:24 UTC, at most 10 minutes of verification;
the goal-wide 120 agent-minute limit also applies. Record unfinished work and
the next source-owned action if either bound is exhausted.
