Historical source recovered from PR 136 at
`2552813a0ab57ce6db376519b49175019d4dc7b4`, on 2026-10-25.
Dated facts, permissions, queue order and capability observations below remain
historical evidence; they are not fresh execution commands or current acceptance.
Current reconciliation follows the published successor and its source receipt.

# A-MAVS-OLEVM stewardship inventory and order of battle

Evidence date: 2026-09-13. The initial inventory was READ-ONLY and made no remote changes. The execution workstreams own source/runtime proof and final integration; the publication supplement below records subsequently opened successor issues. This report supports execution, not a claim the complete program has shipped.

## Orientation (8 lines)

1. Canonical repository: organvm-ii-poiesis/a-mavs-olevm, stable ID 924834822.
2. Purpose: evolved ETCETER4 artistic site connecting art, sound and words with navigable chambers and generative/interactive works.
3. Original historical website has a distinct preservation/restoration edition; this repository expands the practice.
4. Default main surveyed head: 477d62305943049f638be8fd46d74bd89f4d582f, dated 2026-08-26.
5. Green requires honest provenance and reproducible lint/format/lock/HTML/unit/browser/accessibility/build checks plus working deployment paths.
6. Root baseline: validation passes/66 warnings; unit 1,222 tests/40 suites pass; targeted HTML 0 errors/5 warnings; audit 10 vulnerabilities, 7 high/3 moderate.
7. Done means a releasable edition fulfills its declared scope; lifelong evolution and future recordings remain open.
8. AGENTS read; BRANCHES.md and docs/branches.md absent. Existing practice is GitHub Flow with main, preserved captures and independent gh-pages; no develop.

## Completeness and rights

- Branch pages: 16 then empty page2. All-state PR pages: 89 then empty page2. Open PRs 8, merged39, closed-unmerged42.
- Open issue collection: 9 records comprising 8 PRs and actual issue #94. Full issue metadata retained.
- All open PR metadata, reviews, issue comments, inline comments and exact-head checks were fetched; each collection was below100/page. Closed/live #103 also fully inspected.
- Every live nondefault branch and all42 closed-unmerged PR heads were compared against the fixed main SHA. Ahead counts measure ancestry, not semantic uniqueness after squash.
- All33 branch-main Actions runs and all40 exact-SHA check runs successful. These prove security, automation, release drafting and Pages checks, not application tests.
- Exact-main Pages build/deploy succeeded 2026-08-26 under historical master: [run32966727557](https://github.com/organvm-ii-poiesis/a-mavs-olevm/actions/runs/32966727557). Served-content/browser verification remains separate.
- Application ci-cd.yml already lists main+master. Public REST workflow listing proves CI/CD Pipeline ID184284863 is disabled_manually since2026-03-04T17:19:03; Project Board Automation ID229586162 also disabled_manually that minute. Other9 workflows active. Recover the disable intention before enabling the repaired pipeline; workflows.json records the evidence.
- Repo metadata reports admin/maintain/push/triage/pull true. main protected=true; detail read denied403 by integration. Rulesets[]. Required checks/reviewers unknown; do not bypass.
- Labels/milestones/discussions collection endpoints unsupported in connector fetch. Public REST fallback confirmed37 labels and0 milestones (no pagination Link headers), saved labels.json/milestones.json. Public Discussions page returned a welcome/empty landing with no discussion links, but ancillary loading errors and default Open filter prevent claiming all historical discussions absent. Issue-attached metadata is retained.
- No remote branch, issue, PR, review, workflow, protection, tag or deployment mutated by inventory agent.

## A — Every remote branch

| Branch                                                   | Head         | Last commit UTC      | Ahead/behind | Linked PR   | Protected | Class                   |
| -------------------------------------------------------- | ------------ | -------------------- | ------------ | ----------- | --------- | ----------------------- |
| `capture/master-deferred`                                | 6b4dd2e8d65b | 2026-07-19T10:35:11Z | 2/10         | none        | false     | snapshot/capture family |
| `dependabot/npm_and_yarn/brace-expansion-1.1.18`         | 14e926230473 | 2026-08-27T17:50:02Z | 1/0          | #128 open   | false     | working/dependency      |
| `dependabot/npm_and_yarn/fast-uri-3.1.7`                 | 6ab702347ac4 | 2026-09-03T00:07:15Z | 1/0          | #129 open   | false     | working/dependency      |
| `dependabot/npm_and_yarn/humanfs/node-0.16.8`            | 33400d2745fa | 2026-09-03T16:44:01Z | 1/0          | #130 open   | false     | working/dependency      |
| `dependabot/npm_and_yarn/js-yaml-4.3.2`                  | 33e55ef8f163 | 2026-09-13T05:30:15Z | 1/0          | #132 open   | false     | working/dependency      |
| `dependabot/npm_and_yarn/socket.io-parser-4.2.7`         | 28298ac812b4 | 2026-08-06T02:23:39Z | 1/5          | #122 open   | false     | working/dependency      |
| `dependabot/npm_and_yarn/vitest-5.0.0`                   | a1de10dbaa58 | 2026-09-13T05:29:49Z | 1/0          | #131 open   | false     | working/dependency      |
| `etceter4-revival`                                       | e53ada4aee27 | 2026-07-04T01:48:29Z | 10/16        | none        | false     | working/revival         |
| `feat/visual-home`                                       | 90e7988d442d | 2026-06-23T12:37:34Z | 4/16         | #100 open   | false     | working/gallery         |
| `gh-pages`                                               | 06b097d7dc1c | 2026-03-04T02:12:54Z | n/a/n/a      | none        | false     | standing/publication    |
| `limen/discover-organvm-a-mavs-olevm-d673`               | c1331ef12c5d | 2026-07-01T17:02:02Z | 1/16         | #105 merged | false     | working/discovery       |
| `limen/gen-organvm-a-mavs-olevm-test-coverage-0620-4c61` | c4a2ca3dbf8b | 2026-06-30T01:51:45Z | 1/16         | #103 closed | false     | working/coverage family |
| `limen/gen-organvm-a-mavs-olevm-test-coverage-0620-906d` | b79eef6c53a5 | 2026-07-01T10:10:47Z | 1/16         | #104 open   | false     | working/coverage family |
| `main`                                                   | 477d62305943 | 2026-08-26T12:05:37Z | 0/0          | none        | true      | standing/production     |
| `wip/preserve-2026-05-30-fix-npm-audit-brace-expansion`  | 5288be6f192e | 2026-05-29T16:14:58Z | 1/19         | none        | false     | snapshot/capture family |
| `wip/preserve-2026-05-31-a-mavs-olevm`                   | 1daeeae1c83e | 2026-05-31T13:23:46Z | 2/19         | none        | false     | snapshot/capture family |

gh-pages has no common ancestor with main: independent generated publication history, not a source branch to merge. No standing program lanes, releases or hotfix refs exist. Preservation refs form one custody family with distinct residue; #102/#103/#104 form one coverage family.

## B — All open PRs, grouped by intention

| Family                 | Members / heads                                                                                                  | Age                                                    | Base / mergeability                                                                                                                            | Checks / reviews                                                                                | Linked issue                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Dependency maintenance | #122 28298ac812b4; #128 14e926230473; #129 6ab702347ac4; #130 33400d2745fa; #131 a1de10dbaa58; #132 33e55ef8f163 | #122 37d; #128 16d; #129 9d; #130 9d; #131 0d; #132 0d | #122 main true/blocked; #128 main true/blocked; #129 main true/blocked; #130 main true/blocked; #131 main true/blocked; #132 main true/blocked | All non-draft; no reviews; 2–5 successful automation/security checks each; no application suite | #122/#128 comments link#94; others no issue link |
| Discovery coverage     | #104 b79eef6c53a5                                                                                                | #104 73d                                               | #104 main false/dirty                                                                                                                          | Non-draft; COMMENTED review;4 unresolved P1; only release-drafter check                         | Continuation comments link#94                    |
| Visual front door      | #100 90e7988d442d                                                                                                | #100 82d                                               | #100 main false/dirty                                                                                                                          | Non-draft; no reviews/inline threads; only release-drafter check                                | Continuation comments link#94                    |

- #100 is 4 commits ahead/16 behind, 248 changed files and conflicts. Gallery/data/ingest/studies intention remains valid; auto-seeded “227 real works” is not artist-confirmed identity or consent. Comments retain navigation, curation, performance/access and deployment obligations.
- #104 is 1 ahead/16 behind and conflicts with #102's merged suite. Four unresolved P1s: undefined scrollIntoView spy, wrong cleared-query result, evaluated-class binding, wrong navigation-global stub.
- #103 is closed with live branch, 1 ahead/16 behind and11 unresolved findings. Preserve unique cases; its closure is not evidence they were integrated.
- #131 requests Vitest5; its release notes require Node22/Vite6.4 while current CI specifies Node20. Establish a compatible runtime contract before treating this as a safe patch upgrade.

### Closed-unmerged family members

| Family                                    | Members                                                                                                                                                                                                          | State / required comparison                                                                                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency maintenance                    | #127, #121, #120, #119, #118, #117, #116, #115, #114, #101, #99, #98, #97, #90, #89, #88, #87, #86, #85, #84, #83, #82, #81, #80, #79, #78, #76, #75, #73, #72, #71, #70, #69, #68, #67, #65, #61, #59, #57, #18 | 40 historical attempts; branches absent, commits/PR records recoverable. All heads compared; preserve applicable version/security residue without downgrading main. |
| Discovery coverage                        | #103                                                                                                                                                                                                             | Branch live. Amalgamate unique meaningful cases with #104/#102 after fixing mock/setup defects.                                                                     |
| Agent configuration / earlier integration | #9 (related merged #14/#15/#16)                                                                                                                                                                                  | 6 ahead by ancestry; compare current AGENTS/Copilot configuration before declaring superseded.                                                                      |

This exceeds a recent-only window: all42 closed-unmerged heads checked. Full titles/dates/heads/ahead-behind/file lists are in closed-unmerged-comparisons.json; historical PR bodies in remote-inventory.json. Ancestry difference alone never authorizes resurrecting or deleting a branch.

## C — All open issues

| Issue                           | Kind / age              | Labels                      | Assignees / milestone | Overlap                                   | Finish line                                                                                                                                              |
| ------------------------------- | ----------------------- | --------------------------- | --------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #94 ACTIVATION AUDIT: ship-soon | tracking umbrella / 94d | activation-audit, ship-soon | none / none           | #100/#104/#122/#128 continuation comments | Reconcile canonical deployment and served SHA; versioned deterministic artifact/release/deploy and smoke instructions. Draft/HTTP200 alone insufficient. |

Opening claim of no public URL/deployment is stale as a blanket description: metadata declares Pages and successful exact-head deployment exists. Releases list only unpublished draft v0.0.1, with no assets. #94 was historically auto-closed then reopened; current stale workflow only labels. Preserve it as activation lineage, correct claims with live proof.

## D — Hidden work, remote evidence

- etceter4-revival:10 unique commits, last2026-07-04,246 changed files from merge base; existing reconstruction/edition work must be recovered before creating another restoration.
- May preservation pair:22 document moves plus agent-instruction edits. July capture: evolution prototypes (cinematic/editorial/signal), broad SVG formatting and destructive test/metadata differences. Extract intended work; do not merge snapshot wholesale.
- limen/discover PR#105 merged and its two changed file blobs match surveyed default exactly; nonzero ancestry ahead is not unique content. See E-DISCOVER verdict; the branch remains retained.
- #102/#103/#104 generated competing suites for one path; repair the family/assertion/mock contract.
- #100 contains generated catalogue/studies and old URL/Instagram assumptions; old1221-test claim is historical, not current evidence.
- No open draft PRs. Draft releasev0.0.1 is unpublished and has no assets.
- Application CI evidence missing because CI/CD Pipeline is disabled_manually (workflow184284863); state-read evidence in workflows.json. Trigger already main+master. Preserve/recover reason for the manual disable while repairing the verification rail.
- Source TODO/FIXME and workflow/instruction drift scan: hidden-source.txt, root owns mapping and runtime proof.
- Unpushed worktrees on unavailable hosts and Discussions inventory remain unknown, not empty.

## Verdict cards

### E-VERIFY — Honest releasable foundation

Members:main/application CI/audit/#94/steward instructions/closure automation.
Intention evidence:user requires Verify→Heal first; #94 requests “versioned publish/release target + tag-based artifact automation.”
Root cause:metadata/security checks do not prove app behavior; current audit/remote acceptance unfinished.
Status:needs-heal. Finish:compatible audited toolchain; exact-SHA application tests/build/browser/accessibility; safe steward/branch/closure rules; deployment provenance.
Next:root foundation branch fixes demonstrable failures/closure-before-evidence, proves locally then PR.
Abandonment risk:false-green default or unsafe closure/merges. Close/delete allowed:NO while finish unmet.

### E-DEPS — Compatible reproducible dependency maintenance

Members:open#122/#128–132 and40 closed-unmerged dependency attempts.
Evidence:requested parser4.2.7/brace1.1.18/fast-uri3.1.7/humanfs0.16.8/vitest5/js-yaml4.3.2; repeating old titles encode same upkeep.
Root cause:overlapping lock edits, repeated versions, missing app checks, unresolved vulnerable tree.
Status:needs-heal; major-update compatibility blocked until proven.
Finish:one successor preserves applicable fixes/no downgrades, coherent Node/test contract, clear audit scope, all supported installs/build/tests green.
Next:trace paths, reconcile package fixes on one successor; validate Vitest5/runtime contract separately within that family if not presently compatible.
Risk:unfixed vulnerabilities or broken runtime. Close/delete:NO until successor green on default, each member linked and unique residue accounted.

### E-COVERAGE — Discovery behavior coverage

Members:merged#102,closed/live#103,open/live#104/shared DiscoveryController suite.
Evidence:“focused, PASSING test suite”; July comments and15 review findings show initialization/mock/assertion defects.
Root cause:repeated generator starts from old default without reconciling tests or browser-global semantics.
Status:needs-heal.
Finish:one suite preserving meaningful unique cases, safe globals/shims/teardown, honest assertions; each finding dispositioned against current code.
Next:compare all3 suites, heal #104 or residue-preserving successor, full unit and relevant browser proof.
Risk:search/modal/navigation regressions, failures before assertions. Close/delete:NO before verified default integration.

### E-VISUAL — Public front door and catalogue

Members:#100/feat-visual-home/related revival.
Evidence:#100 “image-first front door + data-driven works gallery”; preserve labyrinth.
Root cause:branch drift plus generated identity/publication data mixed with navigation changes.
Status:needs-heal.
Finish:reconciled gallery/routes/assets; stable work/edition IDs; valid media/provenance, truthful destinations, mobile/desktop/deep-link/accessibility proof.
Next:reconcile existing #100 on healed main; retain original authored labels, distinguish source records from confirmed works.
Risk:inaccessible or misleading public entry; lost existing implementation. Close/delete:NO before preserved intention ships.

### E-REVIVAL — Historical and restored editions

Members:etceter4-revival plus explicitly authorized original-repo source.
Evidence:tip “derive archive image manifest stems”; user wants original restored and evolved repo expanded.
Root cause:historical snapshot, runtime restoration and evolved work lack explicit edition/provenance boundaries.
Status:active, dependent on foundation/historical comparison.
Finish:immutable historical source, functional restoration with documented deviations/smoke, evolved links preserve prior identity.
Next:compare existing10-commit revival to2017 original; salvage usable work.
Risk:reconstruction churn, erased era behavior, false fidelity. Close/delete:NO until scoped edition finish verified on default.

### E-CAPTURE — Preservation and prototype residue

Members:capture/master-deferred and both wip/preserve refs.
Evidence:messages “coalesce default preservation”, “move22 docs to docs/”, “working-tree edits”.
Root cause:broad captured edits have no integrated per-intention disposition and include conflicting deletions.
Status:parked pending extraction; refs kept.
Finish:path-level residue ledger; relevant prototypes/docs/instructions integrated without undoing healed code/tests.
Next:extract3 evolution prototypes and unique docs/config after foundation; do not wholesale merge.
Risk:lost author/experimental work. Close/delete:NO absent full residue mapping and verdict.

### E-DISCOVER — Discoverability metadata

Members: merged #105 / retained `limen/discover-organvm-a-mavs-olevm-d673`, head `c1331ef12c5d`.
Recovered intention: add `DISCOVERY.md` and `value-repos.json`.
Status: superseded-by the already present source on surveyed default `477d62305943049f638be8fd46d74bd89f4d582f`; no source repair remains for this intention.
Evidence: the branch's only two changed files are byte-identical to default:
`DISCOVERY.md` blob `e20a03c84c9a10affd056de8d0b6526f071e4bb1` and
`value-repos.json` blob `0f7ab816ce8234243c45b58ed92d0ebc71b1a16c`.
The nonzero ancestry-ahead count is not unique source residue. The evidence and
successor-on-default verdict were posted to merged PR #105; this governance
ledger records it. Branch retained; no deletion or state change performed.
Next action: none for source integration; any later branch retirement still follows
the constitution. Risk of abandoning unrecovered work: none demonstrated for these
two files after exact blob comparison.

### E-AGENT — Historical assistant configuration

Members:closed#9/related merged#14/#15/#16.
Evidence:#9 agent setup, current main agent files.
Root cause:historical chained integration means ancestry alone cannot show missing capability.
Status:parked pending semantic comparison.
Finish:useful live rules incorporated by stewardship baseline without obsolete workflow revival.
Next:compare changed files to current configuration. Risk:lost conventions/contradictory instructions.
Close/delete:NO new deletions; historical PR remains evidence.

## Historical proposal and adopted branch constitution

Existing main stays production trunk; gh-pages retains generated publication history. Calibrated proposed recurring lanes:lane/verify-heal for proof and repair;lane/editions for evolved album, text, manuscript and audiovisual editions. Historical restoration stays in the original repository. BRANCHES.md is the constitution; no lane/evolve is currently justified. Do not claim lanes exist until created. Short-lived fix branches can target main; no redundant lane/heal merely for symmetry, no develop/release lane inferred.

The earlier `lane/verify` and possible `lane/evolve` inventory proposals are superseded by the calibrated [BRANCHES.md](../../BRANCHES.md): `lane/verify-heal` and `lane/editions` are the only proposed recurring lanes. The [edition execution plan](EDITION-EXECUTION-PLAN-2026-09-13.md) is the single normative queue; this inventory records recovered intentions rather than an alternative execution order.

One intention per work/<lane>/<intent> or feat/fix/chore/docs/test/hotfix branch, one worktree each; normal PRs to target lane/main; lanes stay near main without rewriting others' history. Only tested deploy artifacts enter gh-pages. Captures are custody refs, not integration lanes. Dormancy documented, retirement by evidence/successor/constitution PR. No secrets/unrelated WIP/unsupported public claims.

## Ordered waves

| Queue | Family / reason                                                   | Class proof                                                                                                                                                           | Target                                   | Member disposition                                                                        |
| ----- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| 0.1   | E-VERIFY plus foundation-impacting E-DEPS: truthful default first | Safe closure order, application CI/runtime, security-compatible lock; validate/audit/unit/HTML/build/browser/a11y + exact remote SHA                                  | main via foundation PR                   | All preserved; no #94 closure before activation finish                                    |
| 1.1   | E-COVERAGE: existing small conflicting family                     | Integrate unique#103/#104 cases with#102; answer15 findings; full unit                                                                                                | main via healed#104 or successor         | Link all; close only after verified default successor                                     |
| 1.2   | E-VISUAL/E-REVIVAL, successor #139: one exhibition family         | Reconcile PR100 and ten revival commits; share227 identical thumbnail blobs, verify gallery/manifest/lineage/browser behavior without reintroducing old tooling drift | main via one healed family successor     | Link PR100 and both source branches; keep all until verified default and no-loss verdicts |
| 1.3   | E-CAPTURE/E-AGENT: proven distinct branch residue                 | Path/case equivalence, relevant prototype/doc/config extraction                                                                                                       | main via one PR per actual unique intent | No age-based deletion; preserve capture refs                                              |
| 2.1   | #94 activation provenance                                         | Canonical URL/exact served SHA/versioned artifacts/deploy/rollback/README smoke                                                                                       | main/existing Pages                      | Close#94 only after its whole finish line                                                 |
| 3.1   | Authorized album/text/manuscript editions                         | Reusable catalogue/audio-visual/text surfaces; original audio references; scan/transcription/source relations; verified available witnesses                           | main or lane/editions                    | Unprovided audio masters/stems/vocals/scans remain explicit obligations                   |
| 4.1   | Interactive evolution/public process                              | Artwork tools/export/show routes, stable edition relationships and user-authored public descriptions                                                                  | main or lane/editions                    | IDs/provenance persist; no fabricated social accounts/content                             |

## First concrete actions / illogical items

Root has installed and tested current default and prepares foundation/stewardship implementation; execution begins Wave0 then Wave1. Inventory made no remote mutations.

No artwork or intention is inherently illogical. Evidenced unsafe actions:blindly merging conflicting#100/#104; importing capture test deletions; calling auto-generated source entries artist-confirmed works; Vitest5 under unchanged Node20 CI; metadata-only success treated as application proof; deleting custody branches by age. Preserve intentions and repair those conditions.

Raw evidence:remote-inventory.json; remote-supplement.json; closed-unmerged-comparisons.json; review-threads.json; hidden-source.txt. The public-safe closed-PR comparison inventory accompanies this report; working raw evidence is not a published media source index.

## Publication supplement — governance successor

This report is included in the governance work for issue #134, independently of
maintenance successor #133. The initial inventory remains the baseline of 16
branches, 89 PRs, 8 open PRs and issue #94; #133 and #134 were opened after that
read-only pass and must not be silently included in its counts.

- #133: dependency/runtime family successor, `needs-heal`; the six original
  open maintenance PRs remain preserved until default verification and no-loss
  verdicts.
- #134: steward protocol, constitution, complete inventory/edition plan and tested
  merge-receipt behavior; local candidate tests pass, remote adoption and enabled
  metadata enforcement remain open.
- Application CI/CD Pipeline ID184284863 and Project Board Automation ID229586162
  report `disabled_manually`; no rationale was recovered. Existing identities are
  retained. No settings or disabled-state workaround is part of this PR.
- The new Stewardship Protocol workflow tests the new policy code. It does not
  replace the disabled application suite or reinstate write automation. Its own
  existence is not a claim of observed execution or protected required status.
- Branch protection detail remains inaccessible (403). No main push, merge,
  issue closure, branch deletion, protection change, or deployment is performed
  by this governance publication.
- Full closed-unmerged comparison inventory: `closed-unmerged-2026-09-13.json`.
- Cross-repository separation and artistic edition plan: `EDITION-EXECUTION-PLAN-2026-09-13.md`.

### Labels and milestones

All 37 recovered labels: `accessibility`, `activation-audit`, `automation`, `bug`, `ci`, `cleanup`, `codex`, `community`, `core`, `csp`, `dependencies`, `design`, `devex`, `documentation`, `duplicate`, `enhancement`, `github_actions`, `good first issue`, `help wanted`, `infrastructure`, `invalid`, `javascript`, `kill`, `lifecycle:blocked`, `merged`, `omega`, `park`, `question`, `ready-for-review`, `Review effort 2/5`, `Review effort 4/5`, `security`, `ship-now`, `ship-soon`, `stale`, `testing`, `wontfix`.

The complete returned milestone collection is empty. The initial inventory and
first publication changed no labels or milestones. Later Phase5 bookkeeping
applied only existing labels to the 13 successor issues/PRs listed in STATUS.md;
all remain open and no milestone or taxonomy was introduced.

### Partial branch-protection evidence refreshed before publication

The normal branch metadata endpoint now exposes `protected=true` and a partial
required-status summary: enforcement level `non_admins`, context
`validate-dependencies`, and `app_id: null`. The dedicated protection endpoint
still returns 403; reviewer counts, strictness and the complete policy remain
unverified. This partial record does not establish application or stewardship
checks as protected requirements, and no setting was changed.

## Recovered exhibition family and parked successor

Issue #139 is the single successor for PR #100 / `feat/visual-home` and
`etceter4-revival`. Source inspection recovered distinct gallery/filter/lightbox,
ingest, front-door and browser-test work from the four visual commits, and
sparse/suffixed image manifests, archive filename-stem repair, carousel/caption
corrections and lineage documentation from the ten revival commits.

Exactly 227 thumbnail paths have identical Git blobs across both tips. Reuse them
once. Thirteen shared non-thumbnail differences from pinned default include old
workflows/tooling: their equality is evidence of common drift, not a reason to
restore them wholesale. `index.html`, `js/main.js` and package files differ between
the tips and require reconciliation against healed default. Branch assertions of
pre-git origin dates, artist-approved catalogue identities, social handles and
past test/performance results remain claims requiring source/applicability checks.

PR #100 remains dirty and open; both branches remain intact. The parked finish line
and no-loss conditions are explicit in #139. Wave 1.1 coverage comes first, then
this one Wave 1.2 successor. No artistic expansion starts behind a red/default
acceptance gate. Captures receive a separate queue intention only for proven
unique residue that does not belong to this family.

## Final candidate reconciliation

[STATUS.md](../../STATUS.md) records the later six open candidate PRs #135, #136,
#138, #141, #143 and #145, the original local restoration delivery, combined local
proof and retained acceptance boundaries. This subsequent execution evidence does
not alter the initial 16-branch/89-PR inventory counts or imply adoption on default.
E-DEPS, E-VERIFY, E-COVERAGE and source-repair obligations have reviewable candidates.
E-VISUAL/E-REVIVAL remains parked under #139 for its broader exhibition scope.
Publication has guarded artifact candidate #145 and no-key runtime obligation #144.

The original local restoration is runnable and verified within its stated scope;
original GitHub writes returned403, so this is an archive/source-recovery delivery,
not an original-host release. Artist-driven new editions and missing source,
performance and transcription inputs remain unfulfilled. Earlier statements about
absent local implementation are superseded by these exact candidate receipts;
earlier test totals remain historical and are not merged/default evidence.
