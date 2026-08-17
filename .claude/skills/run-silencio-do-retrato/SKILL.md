---
name: run-silencio-do-retrato
description: Build, serve, and drive the "Silêncio do Retrato" static photo-zine site. Use to run, start, preview, screenshot, or smoke-test the site and its series pages (anicca, silencios-habitados, etc.) — verify the gallery canvases render, the lightbox opens, the light/dark theme toggle works, and the home cover-grid pagination works.
---

# Run: Silêncio do Retrato

A static HTML/CSS/JS photo zine (no build step, no framework, deployed via
GitHub Pages → `clicandomemorias.com.br`). Each page renders its gallery
images into `<canvas>` elements from `data-original-src` (Flickr URLs) via
[assets/js/main-script.js](assets/js/main-script.js), which also powers a
click-to-open lightbox. [assets/js/theme-switcher.js](assets/js/theme-switcher.js)
drives a light/dark toggle, and the home page paginates its cover grid.

Because all the interesting behavior is client-side JS, the way to drive it
is a **headless browser** — not `curl`. The driver
[.claude/skills/run-silencio-do-retrato/driver.mjs](.claude/skills/run-silencio-do-retrato/driver.mjs)
serves the repo over a built-in Node static server and drives it with
Playwright using the machine's **installed Chrome** (no browser download).

> Paths below are relative to the repo root. Requires network access — the
> gallery images are hosted on Flickr.

## Prerequisites

- **Node** (used v24) and **npm**.
- **Google Chrome** installed. On this machine:
  `C:\Program Files\Google\Chrome\Application\chrome.exe`. Playwright finds
  it via `channel: "chrome"`. (Microsoft Edge also works — change the channel
  to `"msedge"` in the driver if Chrome is absent.)
- One-time: install the driver's only dependency (Playwright), **without**
  downloading a bundled browser:

  ```bash
  cd .claude/skills/run-silencio-do-retrato
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
  ```

  `node_modules/` and `package-lock.json` are git-ignored here.

## Run (agent path) — the driver

From the skill directory. The driver starts its own static server on
`127.0.0.1:8099`, drives Chrome headless, writes screenshots to Node's temp
dir (`%TEMP%\shots\` on Windows — the exact path is printed per run), and
exits non-zero on any failure.

```bash
cd .claude/skills/run-silencio-do-retrato

# Smoke ALL pages: load, wait for canvases to render, report console errors.
node driver.mjs

# One page (full-page screenshot):
node driver.mjs anicca/index.html

# Toggle to dark theme, then shoot:
node driver.mjs anicca/index.html --dark

# Click the first gallery image and screenshot the open lightbox:
node driver.mjs anicca/index.html --lightbox

# Home cover grid: click "Próximo" and screenshot page 2:
node driver.mjs index.html --paginate
```

Useful flags: `--out=FILE` (screenshot path), `--port=NNNN` (default 8099),
`--keep` (leave the static server running after exit).

A passing smoke run looks like:

```
[server] http://127.0.0.1:8099 serving <repo>
PASS  index.html  ["Zine Digital – Carla Padilha"]  no gallery, clean
PASS  anicca/index.html  ["Anicca"]  11 canvas rendered, clean
PASS  silencios-habitados/index.html  ["Silêncios Habitados"]  13 canvas rendered, clean
PASS  about.html  ["Conceito – Carla Padilha"]  no gallery, clean
PASS  contact.html  ["Contato – Carla Padilha Fotografia"]  no gallery, clean

SMOKE OK — 5 page(s)
```

**Always open the screenshots** (`%TEMP%\shots\*.png`) and look. `canvas
rendered` means the `<canvas>` got non-zero intrinsic dimensions (image drawn);
a blank canvas would report `CANVAS FAILED`.

### Quick single-page screenshot without the driver

Chrome's built-in headless screenshot also works if you just need a static
render of one served page (start a server first). Use a concrete out path —
Git Bash does not set `$TMPDIR`:

```bash
python -m http.server 8099 --bind 127.0.0.1 &
mkdir -p /tmp/shots
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu \
  --virtual-time-budget=8000 --window-size=1280,1600 \
  --screenshot="/tmp/shots/anicca.png" \
  "http://127.0.0.1:8099/anicca/index.html"
```

This renders but cannot click — use `driver.mjs` for theme/lightbox/pagination.

## Run (human path)

There is no dev server or npm script. To view it yourself, serve the folder
and open a browser:

```bash
python -m http.server 8099 --bind 127.0.0.1
# then open http://127.0.0.1:8099/  (or /anicca/index.html)
```

Opening the `.html` files via `file://` also mostly works, but serving over
HTTP matches production and avoids CORS quirks on the canvas image loads.

## Gotchas

- **Images are remote (Flickr).** No network → canvases render the red
  "Erro ao carregar" fallback text and `--lightbox` has nothing meaningful to
  show. The driver waits for `networkidle`; first load can be slow.
- **No favicon.** The site ships none, so a browser auto-requests
  `/favicon.ico` and logs a benign 404. The driver's static server answers it
  with `204` specifically so it doesn't trip the console-error check — don't
  "fix" this by removing that handler.
- **`data-default-theme="light"`** on `<body>` sets the page default. The
  toggle cycles page-default → dark → light → page-default and persists to
  `localStorage`; each driver run uses a fresh context, so it always starts
  from the page default.
- **Gallery canvas sizing is intrinsic, not CSS.** `main-script.js` sets
  `canvas.width/height` to the loaded image's natural size on `img.onload`.
  That's why the render check asserts `canvas.width > 0` rather than checking
  a layout box.
- **Pagination is width-dependent.** At viewport ≤ 768px the home grid shows
  1 cover/page; above it, 3/page. The driver uses a 1280px viewport (desktop:
  3/page, so page 2 shows the 4th–5th covers).
- **`channel: "chrome"` needs Chrome present.** If only Edge is installed,
  switch the channel to `"msedge"` in `driver.mjs`.

## Troubleshooting

- **`browserType.launch: ... channel "chrome"` not found** — Chrome isn't
  installed/where Playwright expects. Install Chrome, or set the channel to
  `"msedge"` in `driver.mjs`.
- **`EADDRINUSE :8099`** — a previous server is still bound. Run with
  `--port=8100`, or kill the stale process.
- **`Cannot find package 'playwright'`** — you skipped the one-time install.
  Run `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install` in this directory.
- **Canvas reports `CANVAS FAILED` / red error text in screenshot** — no
  network to Flickr, or the `data-original-src` URL is dead. Check
  connectivity and the image URLs in the page's HTML.
