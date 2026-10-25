# PR runtime reconciliation, 2026-10-25

Owner: ACE issue 12 and the original GMSE PRs 104, 138, 166, 180 and 182.
Session: 01a173a3-0a26-7d63-a71f-ec35f3b3e7d9.

## Changes and review dispositions

- PR 104: restored all six missing behavioral assertions against the evaluated
  production controller. Existing cases remain. Independent review confirmed
  cached DOM bindings, subscriptions, autofocus, small pagination, rendered
  search results and Enter navigation to the second result.
- PRs 166/180: shared setup defines getter-only browser properties explicitly;
  the FilterSystem fixture spies on native history instead of replacing Window
  history/location. No dependency versions are reduced or removed.
- PR 138: startup validates navigation configuration and both loaders before
  readiness. Search failure reports an accessible alert without navigation
  rollback. Four new source cases failed before repair and pass afterward.
- PR 182: network responses stream before background cache writes finish;
  fetch-event waitUntil retains the writes. Historical owned-shell media remains
  available offline and refreshes online. Application JSON/images stay
  network-first; resolver-produced absolute /media URLs work under subpaths.
  Five initial failure cases and two review findings were reproduced and repaired.
- Independent final review found no remaining Important blockers in this delta.

## Fresh verification

- Installed Vitest 4.1.10 baseline after setup/discovery repair: 57 files,
  1420 tests passed. Subsequent production changes were qualified below.
- Intended Vitest 5.0.5 with jsdom 30.1.3, obtained via npm exec without modifying
  the repository dependency graph: 57 files, 1433 tests passed, one worker.
- Native Playwright Chromium: navigation-runtime and runtime-startup specs,
  17 tests passed in 45.1 seconds, one worker. The required headless build was
  installed through Playwright after the first launch reported it missing.
- Scoped Prettier and whitespace checks passed. Main entry ESLint exited zero
  with three pre-existing warnings (unused caught error and two console logs).
- Retained image edits: 209 files, 739595 bytes; SHA-256 membership/content
  digest db40c3e7f04ae620453e62f2982dae3fc2746f010c1093c40b8752228c8ea63b,
  unchanged from the pre-mutation baseline. Checkout retained; no media deleted.

## Remaining acceptance

These repairs do not integrate the dependency heads of PRs 166/180, certify all
22 files of PR 138, or complete PR 182's non-audio cache bound/lifecycle work.
Firefox, mobile-project, native worker-stream lifecycle and hosted deployment
acceptance remain separate. Original issue and portfolio/artistic/custody
requirements remain open. Source integration, live deployment and estate
completion are distinct claims.
