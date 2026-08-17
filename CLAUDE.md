# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Silêncio do Retrato** is a static photo-zine site — no build step, no package manager at the project root. It is served directly by GitHub Pages at `clicandomemorias.com.br`. All assets are plain HTML, CSS, and JavaScript. Photos are hosted on Flickr and loaded at runtime via `<canvas>` elements.

## Running the site

There is no build. Open `index.html` in a browser (VS Code Live Server, or the `.vscode/launch.json` Chrome launch config), or use the Playwright driver:

```bash
# Screenshot any page (headless Chrome, writes to %TEMP%\shots\)
node .claude/skills/run-silencio-do-retrato/driver.mjs index.html
node .claude/skills/run-silencio-do-retrato/driver.mjs anicca/index.html
```

The driver requires Playwright. If not installed:

```bash
cd .claude/skills/run-silencio-do-retrato
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
```

## Adding a new series

Use the scaffolder — do not hand-edit the home grid:

```bash
# Dry-run first
node .claude/skills/novo-card/scaffold.mjs /tmp/spec.json --dry-run

# Generate: creates <slug>/index.html, <slug>/assets/css/main.css, inserts cover card in home
node .claude/skills/novo-card/scaffold.mjs /tmp/spec.json
```

See `.claude/skills/novo-card/SKILL.md` for the full spec JSON format and field reference.

## Architecture

### Page structure

Every page (root + series) shares the same layout skeleton: `<header>` with nav and theme toggle → `<main>` → scripts loaded at the bottom.

- **Root pages** (`index.html`, `about.html`, `contact.html`) load `assets/css/main.css` and `assets/js/`.
- **Series pages** (`<slug>/index.html`) load both `../assets/css/main.css` (shared) and `./assets/css/main.css` (series-specific overrides). The local CSS is intentionally minimal — series-specific classes only.

### JavaScript modules

| File | Responsibility |
|------|----------------|
| `assets/js/theme-switcher.js` | Light/dark toggle with `localStorage` persistence; reads `data-default-theme` from `<body>` |
| `assets/js/main-script.js` | Gallery canvas rendering (loads Flickr images, applies watermark); lightbox with zoom/pan; home pagination |

Both scripts are loaded on every page via `<script>` tags at the bottom of `<body>`. Theme state cycles: page-default → dark → light → page-default (clearing `localStorage`).

### Gallery and lightbox

Images are never rendered as `<img>`. Each image is a `<canvas data-original-src="…">` element. `main-script.js` loads each image via `Image()`, draws it to canvas, and optionally overlays a tiled watermark. Clicking a canvas opens a full-screen lightbox (`#imageOverlay`) backed by a second `<canvas id="maximizedCanvas">`. Double-click toggles 1.5× zoom with mouse-drag pan.

### Theme system

CSS uses two utility classes (`theme-light`, `theme-dark`) applied to `<body>`. Design tokens are in `:root` in `assets/css/main.css`. Series pages inherit all tokens and base styles; their local `main.css` only adds series-specific rules.

### Home pagination

`index.html` has a `.grid-covers` grid. `main-script.js` hides/shows `.cover-card` elements based on `currentPage`: 1 card/page on mobile (≤768 px), 3 cards/page on desktop. The scaffolder inserts new cover cards inside `<main class="grid-covers">`.

## Key conventions

- Images: always use Flickr `_b.jpg` size URLs.
- New series slug: lowercase with hyphens only (e.g. `luz-de-dentro`).
- Series closing section is titled `Epílogo` (portrait/body series) or `Manifesto` (diary/music/light series).
- `home index.html` uses mixed CRLF line endings (from GitHub web edits) — the scaffolder handles this automatically; avoid mass line-ending reformats.
- GA tag (`G-Q7EWY2RP2B`) must be present in every page `<head>`.

## Licensing

Code is MIT. All photographs are CC BY-NC-ND 4.0 (Carla Padilha) — do not use photo URLs in generated examples, tests, or documentation outside this repository.
