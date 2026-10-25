# PR acceptance and runtime reconciliation

Owner: the active 38-PR goal and ACE issue 12; source changes remain in this
repository. Initial source main: 8a9216d843eb4509f500a9e2cedccc8d7e1af291.

Reuse the inactive existing topic branch whose tracked tree matched release
f1d893a. The existing checkout has 209 image-only changes, 739595 bytes,
with SHA-256 membership/content digest
db40c3e7f04ae620453e62f2982dae3fc2746f010c1093c40b8752228c8ea63b.
Stage only named owned source, tests and receipts; verify that digest at handoff.
No checkout creation, source/media hydration or cleanup is part of this lane.

1. Recover the six original assertions missing from DiscoveryController's
   integrated suite: autofocus, search count/cards, small pagination range,
   cached UI bindings, filter subscription and second-result Enter navigation.
   Run the actual-source suite and prove the assertions detect their named faults.
2. Reproduce the Vitest 5 getter-only storage failure from PR 180, then repair
   the shared setup without removing either browser-storage capability. Qualify
   the affected tests with the intended runtime when admitted/available.
3. Repair still-valid navigation and offline-cache findings from PRs 138/182
   through production-source regressions. Keep streaming, range, shell fallback,
   accessibility and background/foreground behavior in scope.
4. Reconcile stale dependency heads against current main through the owning
   branch/merge rail, preserving intended versions and consumer checks.
5. Record each original PR's actual disposition. A source/unit test result does
   not certify an edition, browser/device acceptance or the complete portfolio.

Use atomic commits and exact-head merge submission once per head. Keep checks
serial and bounded; no synchronous CI waits. Retain the checkout and original
image changes. Independent branch review precedes integration; remaining work
stays with its existing PR/issue owner.
