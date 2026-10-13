<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/logo-light.svg">
  <img alt="ET CETER4" src="docs/assets/logo-dark.svg" width="360">
</picture>

**The Pantheon — A Living Temple of Art, Sound, and Words**

[![CI](https://github.com/organvm-ii-poiesis/a-mavs-olevm/actions/workflows/ci.yml/badge.svg)](https://github.com/organvm-ii-poiesis/a-mavs-olevm/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)
[![ORGAN-II: Poiesis](https://img.shields.io/badge/ORGAN--II-Poiesis-6a1b9a?style=flat-square)](https://github.com/organvm-ii-poiesis)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Status](https://img.shields.io/badge/status-production-brightgreen?style=flat-square)](https://etceter4.com)

</div>

> _"The temple breathes."_
>
> An experimental digital sanctuary where generative art, sound composition, labyrinthine narrative, and AI-driven creative tools converge into a single, continuously evolving architectural organism. This is the source code for [etceter4.com](https://etceter4.com) --- the personal creative platform of ET CETER4, structured not as a portfolio website but as a sacred temple complex with chambers, wings, and hidden passageways.

---

## Artistic Purpose

a-mavs-olevm exists because the web itself can be an art form. Not a container for art --- the medium _is_ the work.

The project began as a personal website and evolved into something far more ambitious: a complete **Pantheon** modeled on ancient Greek temple architecture, where every section functions as a distinct chamber with its own aesthetic logic, navigational rules, and creative purpose. Visitors do not browse pages; they _enter rooms_. They do not click links; they _discover passageways_. The experience is deliberately non-linear, atmospheric, and alive --- drawing direct inspiration from the experimental web design of Radiohead's Kid A and Hail to the Thief era websites (2000--2003), where the internet was treated as a space for genuine artistic experience rather than information retrieval.

The Pantheon houses the complete creative output of ET CETER4 across four professional facets --- **Academic**, **Professor**, **Designer**, and **Artist** --- spanning music albums, generative art, diary entries, academic essays, political commentary, performance documentation, AI experiments, and an ever-growing labyrinth of interconnected content. With 1,900+ files across 31 top-level directories, it is less a website and more a digital organism that continues to grow, shed, and regenerate.

Within the ORGAN-II (Poiesis) system, a-mavs-olevm serves as the primary exhibition venue --- the place where theoretical frameworks from ORGAN-I become tangible creative artifacts, and where those artifacts are experienced by audiences in real time.

---

## Conceptual Approach

### The Temple as Interface

The central design metaphor is architectural. Ancient temples were not neutral containers; their spatial organization encoded cosmological beliefs, social hierarchies, and ritual sequences. The Pantheon applies this principle to web navigation:

- **The Naos (Inner Sanctuary)** contains the five core pillars: Museum, Mausoleum, Labyrinth, Choral Chamber, and Atelier
- **The East Wing** houses the Akademia --- scholarship, research, and the interactive CV
- **The West Wing** holds the Agora --- political discourse and manifestos
- **The South Wing** contains performance spaces: the Theatron, Odeion, and Skene
- **The North Wing** opens into contemplative and communal chambers

Navigation follows a tiered descent model. Visitors enter at Tier 1 (the temple entrance), pass through Tier 2 (the navigation hub), and descend into Tier 3 and Tier 4 content --- each level deeper, more specific, more immersive. The hash-based routing system (`#sound`, `#vision`, `#words`, `#diary`) preserves the illusion of spatial movement through a single-page application.

### The Living Architecture

The Pantheon is not static. Inspired by the Kid A website's unsettling, constantly-shifting atmosphere, the temple "breathes" through:

- **Subtle constant motion** --- elements drift, pulse, and shift at near-imperceptible speeds
- **Generative elements** --- p5.js sketches produce unique visual states on each visit
- **Hidden pathways** --- Easter eggs and secret routes reward exploratory navigation
- **Ambient soundscapes** --- audio layers respond to visitor interaction and location
- **Glitch aesthetics** --- controlled visual artifacts that suggest a living, imperfect system
- **Temporal evolution** --- the labyrinth grows over time; new entries appear; old chambers acquire patina

This is not decoration. The breathing is the thesis: that a digital space can have presence, atmosphere, and a sense of aliveness that static pages cannot achieve. The temple is never quite the same twice.

### Four Facets, One Voice

ET CETER4 operates across four professional identities that most institutional structures would separate into distinct portfolios. The Pantheon refuses this separation. An academic essay on digital aesthetics sits alongside a generative art sketch alongside a music album alongside a political manifesto --- not because they are the same kind of work, but because they emerge from the same creative intelligence. The architecture makes legible what a traditional CV obscures: the connections between thinking, making, teaching, and performing.

---

## Technical Overview

### Architecture

a-mavs-olevm is a **static single-page application** with no build step. JavaScript runs directly in the browser using global scope for cross-file communication. This is a deliberate architectural choice: the site has no framework dependency, no transpilation pipeline, and no runtime that could break independently of the content.

```
                    +=============================+
                    |       THE PANTHEON           |
                    |     (Temple Complex)         |
                    +=============================+
                    |                              |
    +---------------+------------------------------+-----------------+
    |  WEST WING    |      CENTRAL NAOS (Core)     |   EAST WING    |
    |               |                              |                 |
    |  Agora        |   Museum (Preservation)      |  Akademia      |
    |  Discourse    |   Mausoleum (Honor)          |  Scholarship   |
    |  Manifestos   |   Labyrinth (Exploration)    |  Research      |
    |               |   Choral Chamber (Sound)     |  CV            |
    |               |   Atelier (Creation)         |                 |
    +---------------+------------------------------+-----------------+
                    |                              |
                    |     SOUTH WING               |
                    |   Theatron (Theatre)          |
                    |   Odeion (Music Hall)         |
                    |   Ergasterion (Workshop)      |
                    +==============================+
```

**Core navigation system:**

| File             | Responsibility                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `js/page.js`     | `Page` class with state management, tier-based navigation, fade transitions                           |
| `js/pageData.js` | Page tree configuration --- all 25+ pages, their parent/child relationships, initialization functions |
| `js/main.js`     | Application entry point, hash-based routing, `handleHashChange()` for browser back/forward            |
| `index.html`     | Single HTML document containing all page sections as visibility-toggled elements                      |

**Navigation tier model:**

```
Tier 1:  #landing          (Temple Entrance)
Tier 2:  #menu             (Navigation Hub)
Tier 3:  #sound #vision    (Content Sections)
         #words #info
         #east-wing #west-wing
         #south-wing #north-wing
Tier 4:  #stills #diary    (Detail Pages)
         #video #ogod3d
         #bibliotheke #pinakotheke
         #theatron #odeion
         #ergasterion #khronos
```

### Technology Stack

| Layer               | Technology              | Purpose                                                           |
| ------------------- | ----------------------- | ----------------------------------------------------------------- |
| **Runtime**         | Vanilla JavaScript ES6+ | No framework, no build step, global scope by design               |
| **DOM**             | jQuery 3.7+             | DOM manipulation, event handling, AJAX content loading            |
| **Animation**       | Velocity.js 2.0+        | Page transitions (fadeIn/fadeOut with configurable easing)        |
| **Generative Art**  | p5.js                   | Sketches, particle systems, Perlin noise flow fields              |
| **3D Rendering**    | Three.js 0.160.0        | OGOD 3D visual album, audio-reactive spheres, GLSL shaders        |
| **Audio Synthesis** | Tone.js 14.8.49         | Programmatic sound generation, audio engine                       |
| **Audio Playback**  | Howler.js               | Cross-browser audio playback, ambient layers                      |
| **CSS**             | Tachyons                | Utility-first styling with custom properties for theming          |
| **Linting**         | ESLint 9 + Prettier 3   | Code quality enforcement (idiomatic JS style)                     |
| **Testing**         | Playwright + Vitest     | E2E navigation tests, accessibility audits (axe-core), unit tests |
| **CI/CD**           | GitHub Actions          | Lint, format check, security audit, deployment                    |
| **Deployment**      | Vercel / GitHub Pages   | Auto-deploy on push, preview URLs per branch                      |

### The Absorb-Alchemize Experiments

The `absorb-alchemize/` directory contains four standalone AI-powered creative tools, each built with TypeScript and Vite, representing a new frontier of human-AI collaboration in generative art:

| Experiment            | What It Does                                                                                                             | Stack                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| **audio-orb**         | Real-time voice conversation with AI, rendered as an audio-reactive 3D sphere with GLSL vertex displacement              | Lit + Three.js + Gemini Live Audio  |
| **gemini-ink-studio** | Voice-controlled digital painting with Lattice Boltzmann fluid dynamics simulation (D2Q9 lattice, CMY pigment transport) | React + Custom LBM Physics + Gemini |
| **p5js-playground**   | Chat-based p5.js code generation with sandboxed execution and AI error-recovery loop                                     | Lit + Gemini 2.5 Pro + p5.js        |
| **synthwave-space**   | Complete 3D arcade game generation from text prompts, with remix system for iterative modification                       | React + Three.js + Gemini 2.5/3 Pro |

These experiments explore the question: what happens when the artist's tool can listen, respond, generate, and evolve in real time? The audio-orb turns conversation into light. The ink studio turns voice into fluid. The playground turns language into executable visual systems. Each is a prototype for a mode of creative practice that did not exist before 2024.

---

## Installation and Quick Start

**Prerequisites:** Node.js 18+ and npm 9+.

```bash
# Clone the repository
git clone https://github.com/organvm-ii-poiesis/a-mavs-olevm.git
cd a-mavs-olevm

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The temple entrance will appear.

### Available Commands

```bash
npm run dev                # Local server with hot reload (browser-sync, port 3000)
npm run lint               # ESLint check on core JS files
npm run lint:fix           # Auto-fix linting issues
npm run format             # Prettier formatting across all files
npm run format:check       # Verify formatting compliance
npm run test:unit          # Vitest unit tests
npm run test               # Playwright E2E tests
npm run test:a11y          # Accessibility audit (axe-core via Playwright)
npm run validate           # Combined lint + format check
```

### Running the Absorb-Alchemize Experiments

Each experiment in `absorb-alchemize/` is an independent Vite project:

```bash
cd absorb-alchemize/audio-orb    # or gemini-ink-studio, p5js-playground, synthwave-space
npm install
echo "GEMINI_API_KEY=your_key_here" > .env.local
npm run dev                       # Opens at http://localhost:5173
```

---

## Working Examples

### The Labyrinth

The original heart of the project. Twelve diary entries from 2015--2016, written as HTML pages with no standard navigation --- visitors must find their own path through. Each entry is a fragment: a date, a mood, an observation. The labyrinth is designed to grow over time, with new entries appearing and algorithmic connections forming between thematically related fragments.

```
labyrinth/
  040615.html     # June 4, 2015
  040715.html     # July 4, 2015
  ...             # 12 entries total, non-linear access
```

### The OGOD Monument

A 29-page visual album --- a fusion of music, image, and narrative that exists as both a Bandcamp release and a dedicated 3D experience within the Pantheon. The `ogod/` directory contains background imagery, track assets, and the Three.js-powered immersive viewer accessible at `#ogod3d`. The OGOD album (_OGOD by ET CETER4_) is available on Bandcamp alongside three other releases: _ET CETER4 RMXS_, _The Progression of Digression_, and _Etc_.

### Generative Experiments (Ergasterion)

The Ergasterion (workshop chamber) hosts live generative art experiments:

- **Particle System** --- 100 particles responding to mouse position with attraction/repulsion forces, creating emergent swarm behavior with speed-based HSB coloring
- **Perlin Noise Flow Field** --- 200 particles following 3D Perlin noise gradients, producing organic continuous motion with fractal Brownian motion layering

These experiments use p5.js and run directly in the browser, producing unique visual states on each execution.

### Audio-Reactive 3D Sphere (audio-orb)

A real-time voice AI experience: speak to the Gemini model, and your conversation is rendered as an audio-reactive icosahedron sphere. Dual FFT analysis (input microphone + output speaker) drives GLSL vertex displacement and Three.js post-processing (bloom, FXAA). The camera orbits based on audio input intensity. The environment map is a PBR-ready EXR file for photorealistic reflections.

### Lattice Boltzmann Ink Simulation (gemini-ink-studio)

A digital painting tool where fluid dynamics are not faked but physically simulated. The D2Q9 lattice computes pigment transport across three channels (cyan, magenta, yellow), with paper fiber density affecting ink absorption. Brush parameters (size, water content, ink load) are controllable by voice commands via Gemini tool-calling. The result is digital ink that bleeds, dries, and soaks into virtual paper with physical plausibility.

---

## Theory Implemented

a-mavs-olevm draws on theoretical work housed in ORGAN-I (Theoria):

- **Recursive self-reference** --- the temple contains documentation about itself (PANTHEON_ARCHITECTURE.md, LIVING_PANTHEON_GENERATIVE.md) that is both operational specification and artistic statement. The system describes itself as part of its own aesthetic.
- **Non-linear narrative structures** --- the labyrinth implements a theory of narrative where meaning emerges from the reader's chosen path rather than authorial sequence. This connects to work on procedural narrative and emergent storytelling.
- **Generative aesthetics** --- the breathing architecture, particle systems, and flow fields implement theories of computational beauty where the artist designs _systems_ rather than _objects_, and the work exists as an evolving process rather than a fixed artifact.
- **AI as creative collaborator** --- the absorb-alchemize experiments operationalize a theory of human-AI creative partnership where the AI is neither tool nor author but a responsive medium --- more like an instrument than an assistant.

The relationship between ORGAN-I and ORGAN-II is directional: theory informs practice. a-mavs-olevm is where ideas about recursive systems, generative processes, and non-linear experience become tangible, testable, and inhabitable.

---

## Portfolio and Exhibition

**Live deployment:** [etceter4.com](https://etceter4.com)

**Music releases:**

- _OGOD_ --- visual album (Bandcamp)
- _ET CETER4 RMXS_ --- remix collection (Bandcamp)
- _The Progression of Digression_ --- experimental compositions (Bandcamp)
- _Etc_ --- collected works (Bandcamp)

**Venue:** The Pantheon itself is the exhibition --- a permanent, evolving installation on the open web. Unlike gallery shows with opening and closing dates, this work is always accessible, always changing, always accumulating new material. The generative elements ensure that no two visits produce identical experiences. The labyrinth grows. The temple breathes.

**Professional context:** The Akademia chamber (`/akademia/cv/`) presents an interactive CV that transcends the PDF format, allowing visitors to navigate between the four professional facets (Academic, Professor, Designer, Artist) and see how they interconnect within the larger architectural metaphor.

---

## Project Structure

```
a-mavs-olevm/
├── index.html              # Temple entrance (single-page application root)
├── js/                     # Core application logic
│   ├── main.js             # Entry point, hash routing
│   ├── page.js             # Page class, navigation state machine
│   ├── pageData.js         # Page tree (25+ pages, tier relationships)
│   ├── config.js           # Site configuration
│   ├── audioPlayer.js      # Howler.js audio management
│   ├── videoPlayer.js      # Video playback
│   ├── sketch.js           # p5.js generative sketches
│   ├── living-pantheon/    # Breathing architecture animations
│   ├── 3d/                 # Three.js scenes and UI
│   └── media/              # Media handling modules
├── css/                    # Stylesheets (Tachyons + custom)
├── absorb-alchemize/       # Four AI creative experiments (Vite/TS)
│   ├── audio-orb/          # Voice AI + audio-reactive 3D sphere
│   ├── gemini-ink-studio/  # LBM fluid painting + voice control
│   ├── p5js-playground/    # AI-powered p5.js code generation
│   └── synthwave-space/    # AI-generated 3D arcade games
├── labyrinth/              # Diary entries (non-linear HTML pages)
├── ogod/                   # OGOD visual album assets
├── akademia/               # Academic chamber (CV, essays, research)
├── agora/                  # Political discourse and manifestos
├── theatron/               # Performance documentation
├── odeion/                 # Music hall (expanded audio space)
├── ergasterion/            # Workshop (generative experiments)
├── pinakotheke/            # Image gallery
├── bibliotheke/            # Library (reading, poetry)
├── symposion/              # Collaborative/social space
├── khronos/                # Timeline and chronological archive
├── oikos/                  # Reflections and personal writing
├── audio/                  # Sound files, albums, lyrics
├── img/                    # Visual assets
├── video/                  # Video content
├── fonts/                  # Custom typography
├── tests/                  # Playwright E2E + Vitest unit tests
├── docs/                   # Internal documentation
├── .config/                # ESLint, Prettier, Playwright, Vitest configs
├── .github/                # CI/CD workflows, templates, Dependabot
└── scripts/                # Build and validation utilities
```

---

## Related Work

**Within ORGAN-II (Poiesis):**

- [metasystem-master](https://github.com/organvm-ii-poiesis/metasystem-master) --- the meta-creative system that coordinates generative processes across the organ

**Within the broader system:**

- [ORGAN-I: Theoria](https://github.com/organvm-i-theoria) --- theoretical foundations (recursive systems, ontology, epistemology) that inform the Pantheon's design philosophy
- [ORGAN-III: Ergon](https://github.com/organvm-iii-ergon) --- commercial applications where artistic techniques are productized
- [ORGAN-V: Logos](https://github.com/organvm-v-logos) --- public process essays documenting the creative and technical decisions behind projects like this one

---

## Contributing

Contributions are welcome. The Pantheon grows through collaboration.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Follow the code style: ESLint + Prettier configs in `.config/`
4. Run validation: `npm run validate`
5. Commit with conventional messages (`git commit -m 'feat: add new chamber'`)
6. Push and open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines and [SECURITY.md](SECURITY.md) for security policies.

---

## License

ISC License. See [LICENSE](LICENSE) for full text.

---

## Author

**ET CETER4** ([@4444j99](https://github.com/4444j99))
Academic. Professor. Designer. Artist.

The Pantheon is a permanent, evolving installation --- a temple that breathes, grows, and refuses to be finished. Enter. Explore. Discover. Get lost. Find yourself.

---

_Part of the [ORGAN-II: Poiesis](https://github.com/organvm-ii-poiesis) system --- the Art organ of the eight-organ creative-institutional architecture._

<!-- SYSTEM-NAV-START -->

---

<sub>[Portfolio](https://4444j99.github.io/portfolio/) · [System Directory](https://4444j99.github.io/portfolio/directory/) · [ORGAN II · Poiesis](https://organvm-ii-poiesis.github.io/) · Part of the <a href="https://4444j99.github.io/portfolio/directory/">ORGANVM eight-organ system</a></sub>

<!-- SYSTEM-NAV-END -->

## Audiovisual Composition System identities

The [typed ACE descriptor](ace-manifest.json) records functional software and module identities separately from artistic titles and compositions. See [responsibilities, compatibility and rollback](docs/ace-boundaries.md). Existing source identities, runtime paths and artwork titles are preserved.
