# Visual Home Reconciliation Implementation Plan

> For agentic workers: use superpowers:executing-plans for the existing owned
> native implementation lane; independent review checks the completed branch.

**Goal:** Complete original PR 100's entire 248-file image-first front door,
227-work gallery, Studies, ingest/thumbnail/share pipeline and publication fit.
**Architecture:** Integrate the original four commits into verified current
main, preserving every chamber and current runtime/dependency safeguards.
Keep the existing vanilla gallery and source-owned JSON; repair demonstrated
preservation, playback, keyboard and lifecycle defects rather than replace it.
**Tech stack:** existing classic JS/Page/ChamberLoader/ScriptLoader, Vitest 5,
Playwright, Node 24.19.0, sharp and the existing ffmpeg/HLS implementation.
**Spec:** PR 100 body and head 90e7988d442dbab3d797082ee9ddf1d8875bb7e2;
the original implementation is the supplied design, not a new redesign.

## Global constraints

- The user already authorized all remaining PR work and the full time needed.
- Preserve all 248 original paths and every unique requirement; qualify each.
- Retain 209 original image edits, 739595 bytes, digest
  db40c3e7f04ae620453e62f2982dae3fc2746f010c1093c40b8752228c8ea63b.
- Keep source/publication/artistic/device/custody acceptance evidence distinct.
- Reuse all current locks, Node floor, scripts, tests and trusted workflow pins;
  add sharp through the owning lock lifecycle without reverting dependencies.
- Tests use the existing --no-open command and one browser worker; no normal
  browser launches, original media processing, private-source ingestion or deletion.
- Live Pages API verified the current URL on October 25:
  https://4444j99.github.io/generative-multimedia-spatial-environment/.

## Review focus

1. Repeated/malformed ingest must preserve existing curation and catalog bytes.
2. Failed conversions must not publish nonexistent or external source paths.
3. Modal focus, background route changes and pending video loads must clean up.
4. HLS video must use actual existing playback support, not a bare m3u8 source.
5. Publication must include the exact public works manifest and media dependencies
   without admitting unrelated authoring or private data.

### Task 1: Recover and integrate the complete original feature

Files: all 248 paths from the pinned original head; current index.html,
js/main.js, js/pageData.js, package manifests/locks and accessibility fixtures.

- [ ] Merge the supplied feature with current main; resolve the five previewed
      conflicts field-wise, preserving current startup/retry and consumer fixes.
- [ ] Keep #visual-home as default, #landing and all chambers reachable. Await
      WorksGallery.init in Page startup; preserve independent runtime recovery.
- [ ] Point canonical/social metadata at the verified Pages URL. Preserve all
      227 originals, thumbnails, authored profile and three Studies records.
- [ ] Run original gallery tests and actual startup/navigation regressions;
      verify the sharp lock with the current strict graph/engine contract.
- [ ] Commit the integrated source without staging the retained image edits.

### Task 2: Gallery playback, accessibility and resource lifecycle

Files: js/worksGallery.js, js/modules/ChamberLoader.js, js/page.js,
tests/unit/worksGallery.test.js, loader tests and native visual-home tests.
Interface: WorksGallery.init({root}) remains async/idempotent;
ChamberLoader.getScripts(id) returns copied declared script definitions so the
gallery can load the existing pinned HLS support without loading a chamber.

- [ ] Reproduce modal focus/trap/restore, repeated-filter observer retention,
      route-close media cleanup, pending video and failed-gallery retry defects.
- [ ] Repair those cases; use the existing HLSLoader.loadSource/destroy API and
      declared HLS script pins. Preserve progressive video and native HLS.
- [ ] Exercise real thumbnail and original-image loading, filters, lightbox,
      keyboard behavior, Studies and labyrinth navigation on three projects.
- [ ] Commit the verified gallery repair.

### Task 3: Preserve and qualify the authored ingest pipeline

Files: scripts/{ingest-media,seed-works,backfill-thumbs,make-og}.mjs and
new actual-source pipeline fixtures under tests/unit.

- [ ] Reproduce malformed catalog loss, curation reset, destructive reseed,
      invalid output publication and premature thumbnail-path publication.
- [ ] Fail closed on malformed schema; merge generated media fields while
      preserving profile/curation and post-seed additions. Keep originals intact.
- [ ] Commit manifest entries/thumbnail paths only after successful processing;
      failed work exits nonzero and cannot point outside the public source root.
- [ ] Prove repeated runs with tiny temporary fixtures; never run on Photos or
      original production media. Verify source CLI help/dry-run behavior.
- [ ] Commit the verified pipeline repair.

### Task 4: Publication and exact-head delivery

Files: existing scripts/publication-config.mjs, stage-public boundary, publication
tests, source-owned verification receipt and per-path reconciliation evidence.

- [ ] Reproduce missing works.json in staged output; allow that exact file and
      scoped gallery HLS media while continuing to exclude unrelated source/data.
- [ ] Run implicated HTML/lint/format, complete source suites, publication
      contracts and relevant native browser/a11y checks. Inspect actual rendering.
- [ ] Account for all 248 original paths and all review findings; publish a
      reviewed successor and submit its verified exact head once when ready.
- [ ] Verify fetched default before closing the original carrier. Check live
      Pages separately; preserve unresolved edition/device/artistic obligations.
