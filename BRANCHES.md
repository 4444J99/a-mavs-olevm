# Branch constitution

Default branch: `main`.
Policy: GitHub Flow with explicit recurring program lanes and preserved source history.
Worktrees: one per active working branch. Do not accumulate unrelated WIP on a lane.

## Standing branches

| Branch     | Purpose                                         | Merge into                         | Green means                                                                                         |
| ---------- | ----------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `main`     | Production-true source trunk; always releasable | Releases and verified publication  | Required checks and purpose invariants pass at the release commit; media/provenance claims are true |
| `gh-pages` | Existing generated publication history          | Published site, never source trunk | Served files correspond to a verified source/build receipt and observed working paths               |

`gh-pages` has independent history. It is not a source integration lane and must
not be merged into `main`, used for feature work, or replaced merely to tidy
branches. Publication workflow changes must preserve its intended deployment role.

## Recurring program lanes to provision with this constitution

These names are proposed by the implementation plan; document their actual remote
creation in STATUS.md. Listing a name does not prove the branch exists.

| Branch             | Purpose                                                                               | Accepts                                                         | Merge into   | Green means                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------ |
| `lane/verify-heal` | Recurring runtime, dependency, test, CI, provenance and accessibility repair          | Verified fixes to existing claims and reproducibility           | `main` by PR | Declared suite remains green or documented failing baseline is repaired; tests are not weakened              |
| `lane/editions`    | Recurring album, text, manuscript and audiovisual editions within the stated practice | Working, source-linked artistic editions after foundation proof | `main` by PR | Real assets and controls work; edition identity/source lineage validate; original editions remain accessible |

Both lanes are integration points close to `main`, never indefinite staging.
Create short-lived work branches from their lane or `main` when trunk-ready;
merge to the lane or directly to `main` by PR. Run the applicable application suite
for lane changes; governance-only checks do not establish application green.
Merge `main` forward regularly; do not force-push published shared history.

The original website's historical restoration belongs to `unnamedplay-r/etceter4`.
This repository does not gain a competing historical-restoration lane. It preserves
links and shared provenance while exhibiting evolved work. No `develop` branch is
introduced; no release freeze branch is justified by current practice.

## Existing work and custody branches

The initial inventory includes `etceter4-revival`, `feat/visual-home`, `limen/*`,
`capture/master-deferred`, `wip/preserve-*`, and `dependabot/*` branches. Their
existence records recoverable intentions, not new standing lanes. Keep all of
them while the per-family plan accounts for unique commits and comments.

- Revival and visual-home form the recovered exhibition work queue.
- Repeated coverage attempts form one coverage family.
- Dependency branches form one maintenance successor family.
- Capture/preservation branches retain distinct historical residue; extract what
  is useful without merging unrelated or destructive snapshot changes wholesale.

No branch is retired by this classification. Existing names need not be renamed
to conform to new work-branch conventions.

## Working branches

Pattern: `work/<lane>/<short-intent>`; also `feat|fix|chore|docs|test|hotfix/<short-intent>`.
One intention or amalgamated family per branch and PR. Never `wip`, `temp`, or
`fix-stuff` for new work. Lifetime is normally days. Keep blocked branches with a
verdict and next step. Do not commit directly to `main` or generated `gh-pages`.

After merge, verify default and preserve all unique work before deleting a
temporary branch. Preserve standing lanes. A PR must link its issue using `Refs`
and include how to verify; use a post-verification verdict before issue closure.

## Hotfix and retirement

`hotfix/<short-intent>` starts from `main`, returns by PR, then is back-ported to
living divergent lanes. Freeze/release branches need demonstrated release purpose.

A standing lane is retired only when its purpose is complete or absorbed and a
PR updates this constitution with evidence and a successor. Dormant lanes stay
listed as dormant. Capture branch deletion requires the same evidence of custody
and unique-residue preservation. Branch deletion never substitutes for recovery.
