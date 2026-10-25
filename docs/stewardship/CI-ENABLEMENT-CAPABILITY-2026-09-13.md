Historical source recovered from PR 136 at
`2552813a0ab57ce6db376519b49175019d4dc7b4`, on 2026-10-25.
Dated facts, permissions, queue order and capability observations below remain
historical evidence; they are not fresh execution commands or current acceptance.
Current reconciliation follows the published successor and its source receipt.

# Application CI enablement capability receipt

Date: 2026-09-13. No remote state was changed.

The active GitHub tool registry exposes workflow/job reads and retries, but no enable-workflow, update-workflow-state, workflow-dispatch or authenticated general REST mutation capability. The GitHub fetch tool is GET-only and cannot perform the required enable operation.

The control-browser skill was read and its supported browser initialized. A new tab opened the normal GitHub workflow page:

https://github.com/organvm-ii-poiesis/a-mavs-olevm/actions/workflows/ci-cd.yml

Observed page state: site header shows Sign in and Sign up; notification/star controls explicitly require sign-in. The workflow is labeled Disabled and says “This workflow was disabled manually.” No Enable workflow control is available in the rendered page. The session therefore has no authenticated GitHub browser capability to enable the workflow. No sign-in flow or credential request was initiated.

Public workflow metadata independently records workflow184284863 as disabled_manually, updated2026-03-04T17:19:03Z. Project Board Automation ID229586162 is also manually disabled. Latest visible CI runs were successful on March4UTC (#145 PR75 and #144 commit4ae4d0b). Neither the disabled-state metadata nor visible run listing records a rationale for the manual disable. Successful pre-disable runs do not prove a reason. A focused search of all89 retained PR bodies found no repository-specific explanation for disabling CI.

Main branch protection remains protected=true from branch metadata. Integration branch-protection detail reads return403; the browser is signed out and exposes no repository Settings controls, so required check names/reviewer counts cannot be read through this session. No protection was bypassed or changed.

Specific continuation capability required: an authenticated GitHub session/account with normal workflow-maintenance rights must enable the existing CI/CD Pipeline. User authorization for the repair is already present; the blocker is executable authenticated capability, not missing consent. The repaired workflow should retain its existing identity, and disabled state must not be evaded by renaming it or weakening checks.

Root continues independent repository repairs while this infrastructure operation is unavailable.

### Partial branch-protection evidence refreshed before publication

The normal branch metadata endpoint now exposes `protected=true` and a partial
required-status summary: enforcement level `non_admins`, context
`validate-dependencies`, and `app_id: null`. The dedicated protection endpoint
still returns 403; reviewer counts, strictness and the complete policy remain
unverified. This partial record does not establish application or stewardship
checks as protected requirements, and no setting was changed.

## Required dependency check: producer and target mismatch

The local [ADR002](../adr/002-integration-patterns.md) documents the intended
`validate-dependencies` check as the dependency-DAG validator in
`organvm-iv-taxis/orchestration-start-here`. Its inspected
[producer workflow](https://github.com/organvm-iv-taxis/orchestration-start-here/blob/a0681541b8d5a88a78faf6f2eb1d646d714b5bce/.github/workflows/validate-dependencies.yml)
was last changed by commit `a0681541b8d5a88a78faf6f2eb1d646d714b5bce`.

Observed source behavior:

- Workflow name `Validate Dependencies`, job ID `validate`, check name
  `validate-dependencies`.
- Triggers: sibling-repository pushes touching `registry*.json`, pull requests to
  its `main`, Monday schedule and manual dispatch. There is no `workflow_call`.
- It checks out the orchestration hub and validates registry graph cycles,
  forbidden cross-organ edges, excessive depth and dangling references.
- It has no cross-repository commit-status/check posting, no target a-mavs-olevm
  commit input, and no execution against this repository's protected head.

Therefore this observed producer cannot by itself satisfy the check required on
an a-mavs-olevm PR head. A passing sibling-repository run is not a status for this
repository. The intended guarantee is a dependency-DAG check, not npm validation.
No local job is renamed to impersonate the context and no successful status is
fabricated. The scoped repair still needs a demonstrated authenticated producer
for the exact a-mavs-olevm head, or a documented correction to the stale policy
through normal administration; no such setting change is performed here.

This is distinct from the two manually disabled local workflows. Enabling those
workflows alone does not demonstrate that the external required context has a
valid producer for this repository. The complete branch policy remains only
partially visible through the branch metadata endpoint.

## Final delivery capability boundaries

Later candidate proof is summarized in [STATUS.md](../../STATUS.md). Hosted
security/metadata checks, local unit/browser proofs and four exhibit builds do
not enable the existing application/metadata workflows or supply the missing
exact-head DAG producer. No setting change or check impersonation was performed.

The original unnamedplay-r/etceter4 repository independently returned HTTP403
for issue/branch writes, and ordinary Git had no configured credential. Its
complete local restoration candidate de57207a361376b11d92880eed164003a42b4f39 and
runnable archive/source bundle remain deliverable without claiming host deployment.

PR #145 preserves another concrete boundary: no-key browser entry fails in two
embedded exhibits, with safe credential/runtime activation retained in #144. The
guard intentionally refuses publication. Full leaf and combined artifact staging
subsequently passed with all source/payload hashes verified; the combined receipt
records 1,362 files and 654,084,260 bytes at local integration
`3a57c9222bf659cfb4acc8b998ce950d18948de1`. The earlier sparse-input staging boundary
is resolved. Successful builds and verified artifact bytes do not prove safe,
usable no-key exhibit entry or an accepted production deployment.
