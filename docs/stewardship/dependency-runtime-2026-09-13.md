Historical candidate record recovered from PR 135, head
`ae1cf0e608eaf71debc52ae710c58b2e053d717d`, on 2026-10-25.
The measurements and workflow state below describe that candidate and date.
Current reconciliation and fresh validation are recorded separately; this
historical receipt does not certify the current graph or deployment.

# Dependency/runtime family — 2026-09-13

Successor: https://github.com/organvm-ii-poiesis/a-mavs-olevm/issues/133
Base inspected: `477d62305943049f638be8fd46d74bd89f4d582f`.

The family intends to maintain a secure, reproducible development and verification toolchain. This candidate retains the requested package changes together so a patch-level update cannot conceal an incompatible runtime or test runner. It does not claim to repair the site's separately observed browser navigation failure.

| Member | Requested intention    | Candidate resolution                                                 |
| ------ | ---------------------- | -------------------------------------------------------------------- |
| #122   | Socket.IO parser 4.2.7 | 4.2.7                                                                |
| #128   | brace-expansion 1.1.18 | 1.1.18; newer major consumers remain separate                        |
| #129   | fast-uri 3.1.7         | 3.1.7                                                                |
| #130   | @humanfs/node 0.16.8   | 0.16.8                                                               |
| #131   | Vitest 5.0.0           | 5.0.0 paired with html-validate 11.15.0, whose peer range accepts it |
| #132   | js-yaml 4.3.2          | 4.3.2                                                                |

Node 24.19.0 is pinned in `.nvmrc`, and all jobs in the existing application workflow read it. The audit now includes development dependencies, which constitute this static site's installed root toolchain. BrowserSync's scoped Immutable 4.3.9 override crosses its declared major range; a real server/UI/live-reload test provides explicit compatibility evidence. The test runner upgrade requires supported global mocking and jsdom's real Location, without weakening existing assertions.

The advertised runtime floor is Node 24.15.0: the complete locked graph includes jsdom requiring that minimum on Node 24, which is stricter than html-validate's 24.8.0 floor. A contract test compares the manifest's minimum to every locked package engine and verifies the pinned runtime belongs to the advertised range. The standard `test:all` command now includes the toolchain suite, so its lock and BrowserSync checks cannot be silently omitted by that entry point.

The lock validator now checks exact root declarations, registry URLs, integrity, semantic version ranges, and the dependency ancestry Node actually resolves. Adversarial fixtures cover false positives from prefix matches, unrelated nested dependencies, incompatible versions, missing roots/integrity, and prototype property names, malformed records and required/optional peer dependencies. BrowserSync uses ephemeral loopback ports, so the compatibility test does not rely on a fixed local port. Frozen `npm ci` remains the installability and peer-dependency gate.

Local verification on the candidate source using Node 24.19.0 / npm 11.9.0:

- `npm ci --ignore-scripts`: clean install, 385 packages. Lifecycle scripts were intentionally not run during installation; the repository's only root lifecycle is Husky setup.
- `npm run test:unit`: 40 suites, 1,222 tests pass.
- `npm run test:toolchain`: 15 tests pass, including actual BrowserSync HTML, UI and reload, and the complete locked-runtime engine contract.
- `npm run validate:package-lock`: passes with the stricter validator.
- `npm run validate`: passes; 66 existing lint warnings, zero errors.
- `npm run validate:html`: passes; five existing inline-style warnings, zero errors.
- Formatting of every new/changed JS and package manifest: passes.
- `npm audit --json`: zero vulnerabilities across the root dependency graph on 2026-09-13. This is a dated result, not a permanent security claim or an audit of independently packaged exhibits.

## Release gate and member disposition

The existing CI/CD Pipeline (workflow 184284863, `.github/workflows/ci-cd.yml`) is manually disabled. This patch updates that same file; it does not evade the control by introducing a replacement workflow. An authorized maintainer must enable it through GitHub. Browser end-to-end, accessibility, Lighthouse and deployed exact-commit verification remain outstanding; passing local unit tests does not substitute for them.

Keep every family PR open and its branch intact. Link each member to #133 and the successor PR. Only after the successor is merged, its finish line verified on default, and unique residue accounted for may a preceding verdict comment authorize member closure. No issue is closed merely because this candidate exists.
