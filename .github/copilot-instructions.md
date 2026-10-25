# GitHub Copilot Instructions for GMSE / ET CETER4

## Repository stewardship

Read [AGENTS.md](../AGENTS.md), [BRANCHES.md](../BRANCHES.md), and
[docs/REPOSITORY_STEWARDSHIP.md](../docs/REPOSITORY_STEWARDSHIP.md) before work.
Verify → Heal → Expand → Evolve. Inventory before mutation; preserve every living
intention. Use one PR per intention or repeated-failure family. Record a verdict
and proof on the current default commit before closure; link work using `Refs #N`.
Merged implementation alone does not establish completion. No branch deletion or
issue closure for tidiness, no automatic `develop`, and no direct protected pushes.
Session authorization persists: execute the already authorized plan.

## Project Overview

This is **etceter4.com** - a creative multimedia website featuring experimental sounds, words, and images. The site is a web labyrinth designed for artistic exploration.

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **CSS Framework**: Tachyons (utility-first CSS)
- **JavaScript Libraries**: jQuery 3.7+, Velocity.js 2.0+
- **Development Tools**: ESLint, Prettier, Browser-sync; package.json and the lockfile define supported versions
- **CI/CD**: GitHub Actions
- **Deployment**: GitHub Pages & Vercel

## Project Structure

```
etceter4/
├── css/                 # Stylesheets
│   ├── styles.css      # Main custom styles
│   └── vendor/         # Third-party CSS (Tachyons, etc.)
├── js/                 # JavaScript modules
│   ├── main.js         # Main application logic & initialization
│   ├── page.js         # Page navigation & management
│   ├── pageData.js     # Dynamic page data loading
│   ├── diary.js        # Diary/journal functionality
│   ├── images.js       # Image gallery management
│   ├── ogod.js         # OGOD section logic
│   ├── analytics.js    # Analytics tracking
│   └── vendor/         # Third-party JS
├── img/                # Images and visual assets
├── audio/              # Audio files and albums
├── video/              # Video content
├── ogod/               # OGOD section HTML files
├── akademia/           # Academic/essays section
└── index.html          # Main entry point
```

## Coding Standards & Best Practices

### JavaScript

- **ES6+ Features**: Use modern JavaScript (const/let, arrow functions, template literals)
- **No var**: Always prefer `const` and `let` over `var`
- **Modules**: Code is organized as scripts (not ES modules) for browser compatibility
- **Global Scope**: Some variables use global scope for cross-file communication (intentional design)
- **jQuery**: Heavy use of jQuery for DOM manipulation - this is intentional
- **Comments**: Add comments for complex logic, but keep code self-documenting where possible

### CSS Architecture

- **Utility-First**: Primary approach uses Tachyons utility classes
- **Component Styles**: Custom components in `styles.css`
- **No Inline Styles**: Avoid inline CSS except for JS-driven dynamic styles
- **IDs for Hooks**: IDs are reserved for JavaScript hooks, not for styling
- **Classes for Styles**: Always use classes to describe visual styles
- **Responsive Design**: Design for modern browsers, no IE8 support

### HTML

- **Semantic HTML**: Use appropriate semantic elements
- **Accessibility**: Include proper ARIA labels and roles where needed
- **Classes Over IDs**: Use classes for styling, IDs for JS hooks only

### Git Workflow

- **Branch Strategy**: Default is `main`; read BRANCHES.md and use a short-lived branch/worktree from the appropriate lane or main
- **Commit Messages**: Use conventional commit format (feat:, fix:, chore:, etc.)
- **Pull Requests**: One intention/family; preserve related work; require applicable lint, format, lock, security, unit, browser, HTML, accessibility and stewardship checks at the tested head
- **Dependencies**: Managed via Dependabot, reviewed before merging

## Development Workflow

### Getting Started

```bash
npm ci                   # Install the frozen dependency tree
npm run dev             # Start development server at localhost:3000
```

### Before Committing

```bash
npm run lint            # Check code with ESLint
npm run format          # Format code with Prettier
npm run format:check    # Verify formatting
npm run validate:package-lock  # Validate package-lock.json
npm run test:unit        # Vitest unit suite
npm run test:unit -- tests/governance  # Stewardship metadata behavior
npm test                # Playwright browser suite (install browsers first)
npm run test:a11y        # Browser accessibility suite
```

### CI/CD Pipeline

1. **Linting & Formatting** - ESLint and Prettier checks
2. **Package Lock Validation** - Dependency integrity
3. **Security Audit** - `npm audit` for vulnerabilities
4. **Application Proof** - Vitest, Playwright, accessibility, HTML and applicable build/link checks
5. **Stewardship** - Test metadata policy; merge events record pending verification and do not close issues
6. **Deploy** - Existing GitHub Pages workflow targets main (and historical master trigger); verify the served edition separately

A configured workflow does not prove it ran. Inspect exact-head execution and
required-check settings. The full audit includes development tooling; a production-only
audit must not be reported as a clean full dependency tree.

## Code Patterns to Follow

### Page Initialization

`js/main.js` uses jQuery ready and reports `etceter4Startup` as starting,
ready or failed. Navigation configuration and loaders are validated before
readiness; the independent fallback must remain usable after partial startup.

### Dynamic Content Loading

`Page.initPage()` delegates lazy fragment/script work to
`ChamberLoader.ensureLoaded()`. The loader executes declared scripts through
`ScriptLoader.loadSequence()`; preserve manifest dependencies and retry behavior.

### Navigation & Page Management

`showNewSection()` in `js/page.js` owns transitions, queued routes and history.
Failed navigation restores the previous page and preserves the latest queued
request. Search-bootstrap failures must not invoke unrelated navigation rollback.

## Special Sections

### OGOD

- ET CETER4 visual album with 29 historical track pages
- Located in `/ogod/` with a separate evolved 3D experience
- Preserve historical playback behavior and distinguish new synchronization/reactivity
- Do not invent an acronym expansion, release metadata or recovered source audio

### Akademia

- Essays and academic content
- CV/portfolio section
- Located in `/akademia/` directory

### Audio/Video

- Album and media players
- Custom player implementations
- Config files for media metadata

## Security Guidelines

- **No Secrets**: Never commit API keys, tokens, or credentials
- **CSP**: Content Security Policy is strict - test external resources
- **Dependencies**: Keep dependencies updated via Dependabot
- **Audits**: Zero tolerance for known vulnerabilities

## Testing

- Manual testing via `npm run dev`
- Visual verification of UI changes
- Cross-browser testing for modern browsers
- Existing Vitest unit suite: `npm run test:unit`
- Existing Playwright browser suite: `npm test`; accessibility: `npm run test:a11y`
- Stewardship protocol: `npm run test:unit -- tests/governance`
- Exercise actual navigation, audio activation and source assets; do not simulate a passing route by manually revealing DOM

## Common Tasks

### Adding New JavaScript

1. Create file in `/js/` directory
2. Add to the relevant checks using `.config/eslint.config.js` and package scripts
3. Include script tag in HTML where needed
4. Test with `npm run lint`

### Adding New CSS

1. Prefer Tachyons utilities when possible
2. Add custom styles to `css/styles.css`
3. Use meaningful class names
4. Test responsiveness

### Adding New Pages

1. Create HTML file in appropriate directory
2. Update navigation in relevant JS files
3. Add page data to config files if dynamic
4. Test page loading and navigation

## AI Assistant Guidelines

When providing code suggestions:

1. **Match Existing Style**: Follow the patterns already in the codebase
2. **jQuery First**: Use jQuery for DOM manipulation (it's already loaded)
3. **Utility CSS**: Suggest Tachyons classes before custom CSS
4. **No Breaking Changes**: Maintain backward compatibility
5. **Test Suggestions**: Consider how to test the suggested changes
6. **Security Aware**: Flag potential security issues
7. **Performance**: Consider performance implications, especially for media-heavy sections

## Known Patterns & Quirks

- **Global Variables**: Some intentional global scope usage for cross-file communication
- **Build Boundary**: The main site is static; embedded exhibits have separate build scripts and must be checked when affected
- **Legacy Code**: Some older patterns coexist with modern code
- **Experimental**: Site embraces experimental and artistic approaches
- **Framework Boundary**: The root application is framework-free; embedded exhibits may use React or Lit in their own package graphs

## Resources

- [README.md](../README.md) - Main documentation
- [SECURITY.md](../SECURITY.md) - Security policies
- [BEGINNER_TUTORIAL.md](../BEGINNER_TUTORIAL.md) - Complete beginner's guide
- [EDGE_CASES.md](../EDGE_CASES.md) - Known limitations

## Support

For questions or issues, refer to the main README or open a GitHub issue.
