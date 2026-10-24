# Stewardship status

Evidence snapshot: 2026-09-13, surveyed `main`
`477d62305943049f638be8fd46d74bd89f4d582f`.
This is the starting record; later receipts must name their tested commit.

## Purpose and release boundary

Evolved ETCETER4 exhibition connecting albums, visual work, words, manuscripts,
and interactive editions. Preserve the original website as a distinct historical
restoration in its original repository. A released edition can be complete while
the underlying work continues to change. Artist-authored text and source lineage
remain explicit; unavailable recordings, scans, transcriptions and approval are
not implied by placeholders or code.

## Starting baseline and open proof (retained historical record)

| Surface                        | Starting evidence                                                                     | Meaning                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Lint/format                    | Pass; lint has 66 warnings                                                            | Existing configured source paths pass; broader runtime proof still required                                             |
| Unit suite                     | 1,222 tests in 40 files pass                                                          | Local baseline only; does not establish complete browser behavior                                                       |
| Targeted homepage HTML         | 0 errors, 5 warnings                                                                  | Targeted validation, not every page                                                                                     |
| Full dependency audit          | 10 vulnerabilities: 7 high, 3 moderate                                                | Foundation repair remains required; production-only audit is insufficient evidence for dev tooling                      |
| Remote application CI          | Workflow 184284863 is manually disabled; exact-head application-suite proof is absent | Enable the existing CI/CD Pipeline through authenticated workflow maintenance; do not rename it to evade disabled state |
| Remote Pages build/deploy      | Recorded success for surveyed source head                                             | Requires separate served-content/playback verification                                                                  |
| Stewardship protocol candidate | 10 Node tests pass locally                                                            | Merge-only automation no longer closes issues in the candidate; adoption and remote run are separate                    |
| Protection                     | Main reports protected; detailed settings unavailable to the integration              | Required-check enforcement cannot be claimed from workflow files alone                                                  |

## Current queue

1. **Wave 0, dependency/runtime family:** repair compatible dependency/CI failures,
   prove exact-head installs, application tests, real browser paths and audit.
2. **Wave 0, stewardship:** install the constitution/instructions and tested
   pending-verification automation; provision only adopted recurring lanes;
   observe the remote protocol check and inspect required-check enforcement.
3. **Wave 1.1, coverage:** reconcile meaningful unique cases from PRs #102/#103/#104
   and their review findings into one tested suite.
4. **Wave 1.2, exhibition revival #139:** amalgamate `etceter4-revival` and visual-home PR #100
   with related unique preservation residue on one coherent successor after coverage.
5. **Wave 2 onward:** verified album/source catalogue; per-album audiovisual
   editions; handwritten and original-text experiences; shareable work/edition
   routes; actual source ingestion and later remaster/remix/recording editions.

Activation issue #94 remains the coordination lineage. Dependency/runtime successor #133 and governance successor #134 track separate intentions. Preserve dependency,
coverage, gallery, and capture members until successor work is verified on default
and each member receives its own evidence-backed disposition.

## Operational truth

The governance change does not claim dependencies healed, album media recovered,
manuscripts transcribed, the website restored, the new edition published, remote
checks passing, required-check settings changed, or artistic approval obtained.
`lane/verify-heal` and `lane/editions` remain proposed until remote creation is
recorded. No automatic issue closure, age-based cleanup, or history deletion is
authorized by this status file.

## Governance publication and executable blockers

The complete inventory, family verdicts, queue and edition boundaries are in
[the dated report](docs/stewardship/INVENTORY-VERDICTS-WAVES-2026-09-13.md) and
[the edition plan](docs/stewardship/EDITION-EXECUTION-PLAN-2026-09-13.md).

Project Board Automation ID229586162 is also manually disabled. Its repaired
source preserves the existing workflow identity; it cannot run metadata/closure
policy until normal authenticated maintenance enables it. The current connector
has no callable workflow-enable endpoint, and the inspected browser session is
signed out. This is an executable capability blocker with user authorization
already present, documented in [the capability receipt](docs/stewardship/CI-ENABLEMENT-CAPABILITY-2026-09-13.md).

This branch publishes a reviewable governance implementation for #134 and passes
10 local protocol tests. Exact-head remote checks, merge, enabled metadata execution,
required-check enforcement, proposed lane provisioning and the independent
application/dependency finish line remain pending. No tracked intention is closed.

### Partial branch-protection evidence refreshed before publication

The normal branch metadata endpoint now exposes `protected=true` and a partial
required-status summary: enforcement level `non_admins`, context
`validate-dependencies`, and `app_id: null`. The dedicated protection endpoint
still returns 403; reviewer counts, strictness and the complete policy remain
unverified. This partial record does not establish application or stewardship
checks as protected requirements, and no setting was changed.

## Required-check and exhibition continuation

The dependency-DAG producer documented by ADR002 runs only in the orchestration
repository; its inspected source has neither a reusable workflow entry nor
cross-repository status posting. It cannot supply a-mavs-olevm's protected-head
`validate-dependencies` context as presently configured. See the updated capability
receipt for the exact source revision. Hosted security/metadata success remains
separate from this missing required contract.

Issue #139 parks the amalgamated visual-home/revival intention with a concrete
asset/path residue ledger, finish line and member-preservation conditions. The
single queue is coverage first (Wave 1.1), then this exhibition family (Wave 1.2),
after truthful Wave 0/default acceptance. Existing branches and PR #100 stay open.

## Delivery reconciliation — 2026-09-13

These are reviewable implementations and local proofs, not verified changes on
default. The inspected default remains
`477d62305943049f638be8fd46d74bd89f4d582f`. All six candidate PRs are open and
unmerged. Their test totals must not be added as if they were one default run.

| Intention                         | Candidate                                                         | Delivered evidence                                                                                                               | Remaining boundary                                                                                  |
| --------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Dependency/runtime #133           | PR #135, `b50f5aa18c318e07f2c43f831548b91481b72c37`               | Compatible locked runtime, stronger lock validation and repaired root audit in the candidate                                     | Application/default acceptance and missing DAG context                                              |
| Stewardship #134                  | PR #136; current metadata identifies this documentation follow-up | Generated context preserved, full inventory, one queue and tested pending-verification automation                                | Metadata workflow manually disabled; no protected enforcement claim                                 |
| Navigation/loading #137           | PR #138, `3b816051226c68e6c0f71b6bff792253ed974733`               | Native navigation/history/retries, cold-chamber prerequisites and browser regressions                                            | Full cross-browser/accessibility/media/default/deployment proof remains separate                    |
| Discovery coverage #140           | PR #141, `9aa6928d57142a0ff52793f5068cb29cc22d57d3`               | 17 production-controller cases; six recovered cases; family findings dispositioned                                               | Preserve members #102/#103/#104 until verified default successor                                    |
| Source catalogue/diary #142       | PR #143, `351be65d037062ce24810a27014ed8d4c7bc3ee9`               | 57 official tracks; 29 original OGOD MP3 references; external-only sources explicit; 123 actual diary scans; 19 new source tests | Repairs existing sources; does not implement all new album visuals, audio masters or transcriptions |
| Publication #144 / activation #94 | PR #145, `71247778b329f35e09772a24cf565894fb83d47b`               | 15 boundary tests, four real locked exhibit builds, complete allowlisted staging and downloaded-file digest verification         | Publication intentionally blocks on no-key runtime/credential boundaries                            |

### Combined local candidate proof

Local integration commit `3a57c9222bf659cfb4acc8b998ce950d18948de1`, tree
`12c1c88a725d8c48d74ae59cba870d3186a5d524`, combines all six candidate intentions,
including publication, cold-chamber/history corrections and stewardship's existing
label contract. It is a local integration worktree, not main or a merged release.

- 1,291 unit tests across 45 files pass; 14 toolchain, 11 governance and 15
  publication cases pass. Validation, formatting, lint and strict lock checks pass;
  existing lint warnings remain, and HTML validation records zero errors/five warnings.
- Seventeen native Chromium browser cases passed at the immediate parent
  `a309fab8a536a5f1a8c9fc8d969849c1d7c1f762`
  (tree `0d78e6bc50c32d141b5c31a112b4262b8c3f3889`): 15 navigation/startup/cold-entry cases and two source
  catalogue cases, including actual SPA keyboard playback through Odeion. Only
  governance label/test/workflow changes followed that browser run; application
  code is unchanged. Browser web security and motion remained enabled, without
  forcing hidden DOM visible. These focused cases do not stand for every browser.
- Four locked exhibit builds pass. The full combined artifact contains 1,347
  source inputs plus 15 built exhibit files: 1,362 payload files, 654,084,260 bytes.
  Source and payload hashes all verify; manifest SHA-256 is
  `390a9cd38b0270a39c1f49b925e684878515d8dbe1436a02c29cf0a3d1056580`.
- Historical integration `d64b288` had 1,268 units and ten browser cases passing,
  with a later separate Odeion keyboard pass after a pointer-click timeout. The
  later combined 17-case run supersedes that browser limit; its failure history
  is preserved. Nineteen intervening missing-file unit failures were resolved by
  hydrating tracked audio configuration through persistent sparse-checkout patterns,
  with no source change or excluded test.
- Public CDN availability, Firefox, the complete legacy browser/accessibility
  suite, every recording and served default are not proved by those cases.

### Original website delivery

The original repository has a completed **local restoration candidate** at
`de57207a361376b11d92880eed164003a42b4f39`, tree
`e9c881ac7f1be35624b930fc262da9e3f84c8132`, derived from July 2017 source
`7f4e5f9610701cd1cb7e398f0b66a6e26c8d35e0`. Later repository history is preserved.
A runnable `ETCETER4-restored-2017.zip`, source-recovery Git bundle and separate
recovery/evidence archive were produced and checked against the tested manifest.

The final original receipt records 30 native tests, zero audit vulnerabilities,
47 browser routes without local HTTP errors or page exceptions, 29 unchanged OGOD
MP3 files, 312 source hashes, 752 local references, the historical diary's selected
91 image references and 99 random-gallery images. User-initiated audio, independent
motion, keyboard/mobile navigation, readable pause/return and reduced motion were
observed with browser web security enabled.

Original issue/branch writes returned HTTP403; ordinary Git had no configured
credential. No original-repository PR, merge or host deployment occurred and no
denied capability was bypassed. Original remote default remained
`e525fa16121f0ff35bba3797072ec275319476f9`. Two historical stylesheets remain
unrecovered; dormant source sections stay dormant. Perfect historical visual
fidelity, external-service recovery and artist acceptance are not claimed.

### Publication and artistic obligations still open

Four exhibit builds do not prove usable no-key runtime. Native probes show
audio-orb and p5js failing at entry without a provider key; `publication-needs.json`
intentionally blocks release until #144 supplies safe credential boundaries and
real runtime evidence. Full leaf and combined media staging now pass; the earlier
sparse-checkout staging blocker is resolved. A verified payload does not establish
usable exhibit entry. No key is embedded, exhibit silently removed, or backend
invented to erase the obligation.

The normative queue is unchanged: truthful Wave0/default acceptance, coverage
Wave1.1, single exhibition/revival family #139 at Wave1.2, then proven distinct
capture/configuration residue and later approved edition waves. Full per-album
visuals, new text-animation editions and the dedicated manuscript experience remain
expansion behind that gate. Missing masters/multitracks, new vocals, artist-selected
designs and checked transcriptions remain real input obligations. Historical diary
scans do not establish a complete manuscript collection or verified transcription.
No source branch, issue or PR is retired merely because candidates exist.

### Stewardship label bookkeeping

Existing labels were applied additively to successor issues #133, #134, #137,
#139, #140, #142 and #144, and PRs #135, #136, #138, #141, #143 and #145. Labels
describe each artifact's actual bug, dependency, security, infrastructure, core,
accessibility, documentation, automation or testing scope. Parked intentions #139
and #144 use the existing `park` label. All 13 artifacts remain open. No new label
taxonomy, milestone, closed/merged state or required-check setting was introduced.

The metadata classifier now emits only the observed label taxonomy, deduplicates
labels and does not invent a draft label. Its independent 37-label fixture covers
real changed-file paths and pull-request lifecycle states. All 11 protocol tests
passed locally and in the hosted Stewardship Protocol workflow at source commit
`e2c5e20f9143a134f0590ee21b4d4ad08b4b80f7`; this later receipt changes documentation
only. The manually disabled metadata workflow is still not running its writes.

## Final review follow-up — 2026-09-13

This supersedes the candidate counts above while preserving them as checkpoints.
Final runtime/catalogue verification at local `d4b92673614c9d701cbd40dc37ccd6e7b30a9e19`
passes 1,295 unit tests across 45 files, 15 toolchain tests and all 18 native browser
cases. The additional browser case installs the real service worker and verifies
an offline catalogue reload; it does not claim complete offline SPA/media playback.
The configuration resolver now uses the actual browser lexical binding, and
shuffle with repeat disabled consumes a finite pass. Cache version is 5.

The advertised Node floor is 24.15.0, consistent with the complete locked graph;
the pinned runtime remains 24.19.0. `test:all` includes the toolchain suite. Final
publication validation has 16 passing boundary cases and retains the original
favicon and real stylesheet sources. Required root lint, formatting and strict
lock validation pass; unchanged governance has 11 passing local/hosted cases.

| PR | Current implementation head | Follow-up |
| --- | --- | --- |
| #135 | `ae1cf0e608eaf71debc52ae710c58b2e053d717d` | Runtime-floor contract and standard local test gate |
| #138 | `3b816051226c68e6c0f71b6bff792253ed974733` | All six navigation/startup review findings repaired |
| #141 | `9aa6928d57142a0ff52793f5068cb29cc22d57d3` | Preserved coverage-family source tests |
| #143 | `125ea730106a57260e78d9ca89e5c3bda98a52a5` | Browser configuration, offline catalogue and finite shuffle |
| #145 | `9bbe33e9ced55f8cfcce548556caf2219af96d87` | Pinned publication runtime and strict built-HTML resources |

The final combined publication candidate is local
`c20265a6b027b22edf69efab19c0744c0ddd7d21`, tree
`4e6a137256453749b47e211868d0094ee8eb370e`. Changes after the browser-tested parent
are confined to exhibit entry assets and publication configuration/validation;
the catalogue/navigation application sources are unchanged. All four clean exhibit
builds pass. All 1,363 payload files (1,347 public source files plus 16 built files),
654,087,275 bytes, pass source and SHA-256 verification. The manifest SHA-256 is
`d1eecbf92837eb59f2abe922c974c5b4753fb5e6b18fd26b0c949034343d9a8c`.
The prior artifact is retained as evidence rather than silently replaced.

PR #136 remains the stewardship implementation and documentation successor; its
protocol source was verified at `e2c5e20f9143a134f0590ee21b4d4ad08b4b80f7`.
This final update changes STATUS only. Every repaired inline review finding has a
preceding evidence reply. The catalogue candidate explicitly depends on the cold
navigation repair; admit #138 first and refresh #143 against healed main rather
than skipping its dependent regression or duplicating that intention.

The 2017 restoration deliverables remain verified and available. No remote merge,
deployment, closure, branch deletion or force-push has occurred. Original write
access still returned HTTP 403. The evolved default remains `477d6230`; its manually
disabled application workflow, legitimate required-check producer and preserved
activation intention #144 remain acceptance gates. Full artistic expansion and
unrecovered audio/transcription/performance inputs remain in the normative queue.
