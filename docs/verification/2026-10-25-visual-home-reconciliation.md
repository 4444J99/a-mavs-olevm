# Visual home reconciliation

Owner: original PR 100 and ACE issue 12. Original head:
`90e7988d442dbab3d797082ee9ddf1d8875bb7e2`.
The adjacent JSON accounts for every one of the original 248 paths with old and
candidate digests. All 227 works, original source blobs, thumbnails, profile and
three authored Studies remain. The works catalog is byte-identical to the source.

The default route now awaits the actual gallery before reporting startup ready.
Manifest failure recovers the existing landing page and its real retry action.
The labyrinth, chambers, search, browser history and independent startup fallback
remain available. Canonical/share metadata uses the live Pages API's current URL.

The viewer moves focus inside, traps and restores it, preserves background inert
state, permits keyboard scrolling of mobile captions, and avoids global keyboard
double activation. Native video arrows remain available for seeking. Filtering
disconnects obsolete image observers. Leaving the route or closing/replacing a
work releases media; deferred HLS dependencies cannot attach after that boundary.
Playback reuses the existing declared SRI pins and HLSLoader rather than a second
player stack. A synthetic one-second FFmpeg fixture actually decodes in all three
browser projects. It exposed and repaired ESM execution, scale/pad syntax and
relative segment URLs in the existing transcoder. No artist media was processed.

The authoring CLIs reject malformed catalogs and ID collisions, retain curation,
profile and post-seed additions, and save only after processing succeeds.
Fresh UUID output directories retain both prior referenced media and interrupted
new versions. Thumbnail regeneration also retains old bytes; video thumbnails use
posters. Failure fixtures prove catalog **and media** preservation, including a
valid first conversion followed by a later invalid file. Share-image generation
produces a real 1200 by 630 JPEG without changing its input.

Publication admits the exact public works manifest and HLS media under
`img/photos/`; unrelated data, TypeScript, tests and private material stay outside
that boundary. Actual staging fixtures verify the output bytes and exclusions.

Validation: 1,478 unit/toolchain cases in 58 files; 31 publication/pipeline cases
(10 actual CLI fixtures); 54 native navigation/startup/prerequisite checks and 24
gallery checks across Chromium, Firefox and Mobile Chrome. WCAG AA checks cover
the gallery and open viewer. Lint, format, HTML and strict lock validation pass
with historical warnings. Desktop and mobile captures were visually inspected.

The original sharp range introduced a high-severity audit finding. Sharp 0.35.5
passes the same real conversion fixtures and the complete audit reports zero
vulnerabilities. The engine contract retains all optional platform lock entries;
it distinguishes old-runtime-only binaries for targets with no Node 24 prebuilt
distribution, as documented by [Node.js](https://nodejs.org/en/blog/migrations/v22-to-v24#platform-support).
Every mandatory or Node 24 target engine remains checked, with boundary tests.

Independent review's three Important findings were accepted, repaired and
re-reviewed with no residual Important defects. The 209 preexisting image edits
retain their original 739,595-byte digest and are outside this change's index.
This is source/local-browser evidence. Hosted publication, Safari/iPhone and
artist/device acceptance remain distinct; the original carrier is retained until
the successor is verified on fetched default.
