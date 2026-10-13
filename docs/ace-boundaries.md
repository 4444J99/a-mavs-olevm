# ACE functional identities and preserved web paths

`ace-manifest.json` separates this implementation's software, capabilities, modules, compositions, artwork titles and archive records. Its stable GitHub repository ID is `924834822`; its functional software identity remains `generative-multimedia-spatial-environment`. The software participates in `audiovisual-composition-system`.

| Functional module | Existing implementation | Responsibility and interface |
| --- | --- | --- |
| `spatial-scene-compositor` | `js/3d/core/SceneManager.js` | `SceneManager`: scene, camera, renderer, postprocessing and adaptive quality |
| `frequency-analyzer` | `js/3d/audio/AudioAnalyzer.js` | `AudioAnalyzer`: FFT frequency bands and waveform analysis |
| `beat-detector` | `js/3d/audio/BeatDetector.js` | `BeatDetector`: audio-energy beat detection |
| `spatial-stem-player` | `js/3d/ogod/OGODAudioEngine.js` | `OGODAudioEngine`: spatial stem mixing, with legacy album defaults and fallback paths |
| `image-grid-sequencer` | `js/ogod/OGODFrameSequencer.js` | `OGODFrameSequencer`: frame progression, order and loop mode, with legacy configuration defaults |

The last two modules retain artwork-derived globals and configuration defaults. Their functional registry identities describe what the existing code does; they do not claim a new independent package or complete removal of those defaults. Consumers must explicitly configure and test their own assets, grid and playback constraints. No verified stem availability is implied by the presence of a stem-playing module.

Compositions bind the software to authored work: `index.html` is the chamber web composition, while `OGOD.html` and `ogod-3d.html` are the image-grid and spatial album compositions. Artistic titles and their stable project identities live in `artworks`, independently of these processing responsibilities. The registry does not recast these pages as reusable engines.

The source catalogue `js/data/source-catalogue.js` and [its preservation record](SOURCE_CATALOGUE.md) remain authoritative for existing album keys, historical media paths and Git blob identities. No copied media registry is manufactured here; `source_media` is empty until individual source records are reconciled with that authority. Empty `editions` means no new edition identity or release is asserted. `publication_status: unverified` is the status of this registration, not a denial of prior publication claims. The older audio infrastructure proposal remains an archive at `docs/archive`, and its intentions must not become claims of available media.

## Reversible migration

This change adds a typed interpretation of the existing path graph. It moves no media, rewrites no historical source, changes no runtime module or browser global, and changes no dependency URL or page route. Existing package and class names are retained as native interfaces, not adopted as general-purpose software identities.

The previous artistic identities remain aliases. Repository history and GitHub repository ID remain intact. The new descriptor is local to this public repository and contains only already-public paths and artwork relationships. No private source locations, internal storage locators or unpublished relationships are added.

To undo this registration, revert the boundary-metadata commit. There are no data moves or runtime migrations to reverse. Preserve the existing source catalogue and route graph; a later module extraction must separately demonstrate equivalent behavior before replacing an existing implementation. Do not duplicate the scene engine simply to obtain neutral filenames.

Run `node scripts/validate-ace-manifest.mjs` and `node --test tests/ace-manifest.test.mjs`. Validation checks existing paths, stable identity syntax, unique IDs within each entity type and resolved capability/artwork/composition references. Negative fixtures reject dangling relationships and paths that escape this repository. The existing browser and publication suites remain the authority for runtime and release behavior; these metadata tests do not claim a fresh audiovisual playback verification.
