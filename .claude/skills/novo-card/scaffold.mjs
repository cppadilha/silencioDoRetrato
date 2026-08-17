#!/usr/bin/env node
// Scaffolder for a new "card" (photo series) in the Silêncio do Retrato zine.
//
// Reads a JSON spec describing the series and creates, following the
// project's established pattern:
//   1. <slug>/index.html          — the series page
//   2. <slug>/assets/css/main.css — its local CSS override
//   3. inserts a cover <a class="cover-card"> into the home index.html grid
//
// It is deliberately forgiving — this is art, not engineering. Almost every
// field is optional and falls back to the house style. The `blocks` array is
// where the poetry lives; order and mix them freely.
//
// Usage:
//   node scaffold.mjs spec.json                 # create everything
//   node scaffold.mjs spec.json --position=last # append cover instead of prepend
//   node scaffold.mjs spec.json --force         # overwrite an existing <slug>/ folder
//   node scaffold.mjs spec.json --no-home       # skip touching home index.html
//   node scaffold.mjs spec.json --dry-run       # print what would happen, write nothing
//
// See SKILL.md for the full spec shape and the interview it drives.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");

const argv = process.argv.slice(2);
const flags = new Map();
const positional = [];
for (const a of argv) {
  if (a.startsWith("--")) {
    const [k, v] = a.slice(2).split("=");
    flags.set(k, v === undefined ? true : v);
  } else positional.push(a);
}
const specPath = positional[0];
if (!specPath) {
  console.error("usage: node scaffold.mjs <spec.json> [--position=first|last] [--force] [--no-home] [--dry-run]");
  process.exit(2);
}

const DRY = flags.get("dry-run") === true;
const FORCE = flags.get("force") === true;
const NO_HOME = flags.get("no-home") === true;
const POSITION = flags.get("position") === "last" ? "last" : "first";

const spec = JSON.parse(await readFile(resolve(specPath), "utf8"));

// ---- defaults (house style) ---------------------------------------------
const slug = spec.slug;
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error(`spec.slug must be a lowercase-dashed folder name (got: ${JSON.stringify(slug)})`);
  process.exit(2);
}
const title = spec.title || slug;
const subtitle = spec.subtitle || "Série fotográfica por <i>Carla Padilha</i>";
const theme = spec.theme === "dark" ? "dark" : "light";
const metaDescription = spec.metaDescription || `Série ${title} – Fotografia e poesia`;
const closing = spec.closing || { title: "Epílogo", paragraphs: [] };
const credits = spec.credits || ["Série realizada em 2025"];
const cover = spec.cover || {};
const coverTitle = cover.title || title;

const GTAG_ID = "G-Q7EWY2RP2B";

// ---- block rendering -----------------------------------------------------
function esc(s) { return String(s); } // content is trusted authored HTML; keep <br/>, <i> etc.

function renderCaption(text) {
  return text ? `        <p>${esc(text)}</p>\n` : "";
}

function renderSingle(src) {
  return (
    `        <div class="gallery content-center">\n` +
    `          <div class="content-single">\n` +
    `            <canvas\n` +
    `              data-original-src="${esc(src)}"\n` +
    `            ></canvas>\n` +
    `          </div>\n` +
    `        </div>\n`
  );
}

function renderMulti(srcs) {
  let inner = "";
  for (const s of srcs) {
    inner +=
      `          <div>\n` +
      `            <canvas\n` +
      `              data-original-src="${esc(s)}"\n` +
      `            ></canvas>\n` +
      `          </div>\n`;
  }
  return `        <div class="gallery">\n${inner}        </div>\n`;
}

function renderBlock(b) {
  switch (b.type) {
    case "act":
      return `      <section>\n        <h3>${esc(b.title)}</h3>\n      </section>\n`;
    case "image": {
      const pos = b.captionPosition === "after" ? "after" : "before";
      const before = pos === "before" ? renderCaption(b.caption) : "";
      const after = pos === "after" ? renderCaption(b.caption) : "";
      return `      <section>\n${before}${renderSingle(b.src)}${after}      </section>\n`;
    }
    case "images": {
      const after = b.caption ? renderCaption(b.caption) : "";
      return `      <section>\n${renderMulti(b.srcs)}${after}      </section>\n`;
    }
    case "quote":
    case "line": {
      const cls = b.variant ? ` class="${esc(b.variant)}"` : "";
      return `      <section>\n        <p${cls}>${esc(b.text)}</p>\n      </section>\n`;
    }
    default:
      throw new Error(`unknown block type: ${JSON.stringify(b.type)}`);
  }
}

// ---- page assembly -------------------------------------------------------
const sobreParas = (spec.sobre || []).map((p) => `          ${esc(p)}`).join("<br />\n");
const blocksHtml = (spec.blocks || []).map(renderBlock).join("");
const closingParas = (closing.paragraphs || []).map((p) => `          ${esc(p)}`).join("<br />\n");
const creditsHtml = credits
  .map((c, i) => (i === 0 ? `      <p>\n        <b>Fotografia e direção por <i>Carla Padilha</i></b>\n      </p>\n      <p>${esc(c)}</p>\n` : `      <p>${esc(c)}</p>\n`))
  .join("");

const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta
      name="description"
      content="${esc(metaDescription)}"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;500&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="../assets/css/main.css" />
    <link rel="stylesheet" href="./assets/css/main.css" />
  </head>
  <!-- Google tag (gtag.js) -->
  <script
    async
    src="https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}"
  ></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag("js", new Date());
    gtag("config", "${GTAG_ID}");
  </script>
  <body data-default-theme="${theme}">
    <header>
      <h1>${esc(title)}</h1>
      <p>${esc(subtitle)}</p>
      <nav class="main-nav">
        <a href="../index.html">Home</a>
        <a href="../about.html">Sobre</a>
        <a href="../contact.html">Contato</a>
      </nav>
      <button id="theme-toggle" class="theme-toggle-button">🌙</button>
    </header>
    <main class="zine-content">
      <section>
        <h2>Abertura</h2>
        <p>
          ${esc(spec.abertura || "")}
        </p>
      </section>
      <section>
        <h2>Sobre a obra</h2>
        <p>
${sobreParas}
        </p>
      </section>
${blocksHtml}      <section class="manifesto">
        <h2>${esc(closing.title || "Epílogo")}</h2>
        <p>
${closingParas}
        </p>
      </section>
${creditsHtml}    </main>
    <footer>
      <nav class="main-nav">
        <a href="../index.html">← Voltar à Home</a>
        <a href="../about.html">Sobre</a>
        <a href="../contact.html">Contato</a>
      </nav>
      <p>&copy; 2025 Carla Padilha. Todos os direitos reservados.</p>
      <p>
        As fotografias estão licenciadas sob CC BY-NC-ND 4.0.<br />
        <a
          href="https://creativecommons.org/licenses/by-nc-nd/4.0/deed.pt_BR"
          target="_blank"
          rel="license"
        >
          <img
            src="https://licensebuttons.net/l/by-nc-nd/4.0/80x15.png"
            alt="Licença Creative Commons"
            style="border-width: 0"
          />
        </a>
      </p>
    </footer>
    <script src="../assets/js/main-script.js"></script>
    <script src="../assets/js/theme-switcher.js"></script>
  </body>
</html>
`;

// ---- local CSS -----------------------------------------------------------
const CSS_PIXACAO = `.pixacao-quote {
    font-style: italic;
    font-size: 0.95em;
    opacity: 0.85;
    margin-top: 1.5rem;
}

.texto-final {
    margin-top: 1.5rem;
}
`;
function cssHero(url) {
  return `.section-abertura-background {
    background-image: url('${url}');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: scroll;

    padding: 80px 20px;
    min-height: 400px;
    margin: 0 auto 2rem;

    color: white;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
}
.section-abertura-background h3 {
    color: #baafa7;
}
`;
}
let localCss = "";
const lc = spec.localCss;
if (lc === "pixacao") localCss = CSS_PIXACAO;
else if (typeof lc === "string" && lc.startsWith("hero:")) localCss = cssHero(lc.slice(5));
else if (lc === "none" || lc === undefined) localCss = "";
else if (typeof lc === "string") localCss = lc; // raw CSS

// ---- cover card ----------------------------------------------------------
const overlay = cover.overlayText || "";
const coverCard =
`        <a href="${slug}/index.html" class="cover-card">
          <svg
            width="300"
            height="400"
            viewBox="0 0 300 400"
            xmlns="http://www.w3.org/2000/svg"
          >
            <image
              href="${esc(cover.image || "")}"
              x="0"
              y="0"
              width="300"
              height="400"
              preserveAspectRatio="xMidYMid slice"
            />
            <text
              x="150"
              y="200"
              font-family="Playfair Display"
              font-size="20"
              fill="white"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              ${esc(overlay)}
            </text>
          </svg>
          <h2>${esc(coverTitle)}</h2>
        </a>
`;

// ---- write ---------------------------------------------------------------
const seriesDir = join(REPO_ROOT, slug);
const cssDir = join(seriesDir, "assets", "css");
const homePath = join(REPO_ROOT, "index.html");

if (existsSync(seriesDir) && !FORCE) {
  console.error(`refusing: ${slug}/ already exists (use --force to overwrite)`);
  process.exit(1);
}

let homeUpdate = null;
if (!NO_HOME) {
  const home = await readFile(homePath, "utf8");
  if (home.includes(`href="${slug}/index.html"`)) {
    console.error(`refusing: home index.html already has a card for ${slug}/`);
    process.exit(1);
  }
  // Home index.html has mixed/CRLF line endings (GitHub web edits). Match the
  // grid anchors tolerant of \r?\n, and emit the card with the file's newline
  // so we don't spray line-ending changes across the diff.
  const nl = home.includes("\r\n") ? "\r\n" : "\n";
  const card = coverCard.replace(/\r?\n/g, nl);
  const openRe = /[ \t]*<main class="grid-covers">[ \t]*\r?\n/;
  const closeRe = /[ \t]*<\/main>/;
  if (!openRe.test(home) || !closeRe.test(home)) {
    console.error("could not locate the grid-covers <main> in home index.html");
    process.exit(1);
  }
  homeUpdate =
    POSITION === "first"
      ? home.replace(openRe, (m) => m + card)
      : home.replace(closeRe, (m) => card + m);
}

if (DRY) {
  console.log(`[dry-run] would create ${slug}/index.html (${indexHtml.length} bytes)`);
  console.log(`[dry-run] would create ${slug}/assets/css/main.css (${localCss.length} bytes)`);
  console.log(`[dry-run] would insert cover card (${POSITION}) into home index.html: ${homeUpdate ? "yes" : "skipped"}`);
  console.log("\n----- index.html preview (head) -----\n" + indexHtml.split("\n").slice(0, 45).join("\n"));
  process.exit(0);
}

await mkdir(cssDir, { recursive: true });
await writeFile(join(seriesDir, "index.html"), indexHtml, "utf8");
await writeFile(join(cssDir, "main.css"), localCss, "utf8");
if (homeUpdate) await writeFile(homePath, homeUpdate, "utf8");

console.log(`created ${slug}/index.html`);
console.log(`created ${slug}/assets/css/main.css`);
console.log(homeUpdate ? `inserted cover card (${POSITION}) into home index.html` : "home index.html left untouched (--no-home)");
console.log(`\nPreview it with the run driver:\n  node ../run-silencio-do-retrato/driver.mjs ${slug}/index.html`);
