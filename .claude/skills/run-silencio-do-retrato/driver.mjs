#!/usr/bin/env node
// Driver harness for the "Silêncio do Retrato" static zine site.
//
// It serves the repo root over a built-in Node static server (no Python
// needed) and drives it with Playwright using the machine's installed
// Chrome (channel: "chrome" — no browser download).
//
// Usage:
//   node driver.mjs                       # smoke: all pages, screenshots + checks
//   node driver.mjs <page>                # one page (e.g. anicca/index.html)
//   node driver.mjs <page> --dark         # toggle to dark theme, then shoot
//   node driver.mjs <page> --lightbox     # click first gallery image, shoot lightbox
//   node driver.mjs index.html --paginate # click "Próximo" on the cover grid, shoot
//
// Flags:
//   --out=FILE   screenshot path (default: <tmp>/shots/<slug>.png)
//   --port=NNNN  server port (default: 8099)
//   --keep       leave the static server running after exit
//
// Screenshots land in %TEMP%/shots (or $TMPDIR/shots) unless --out is given.
// Exit code is non-zero if any page fails to load, a canvas fails to render,
// or a page logs a console error.

import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Skill lives at <repo>/.claude/skills/run-silencio-do-retrato/
const REPO_ROOT = resolve(__dirname, "..", "..", "..");

const args = process.argv.slice(2);
const flags = new Map();
const positional = [];
for (const a of args) {
  if (a.startsWith("--")) {
    const [k, v] = a.slice(2).split("=");
    flags.set(k, v === undefined ? true : v);
  } else {
    positional.push(a);
  }
}

const PORT = Number(flags.get("port") || 8099);
const KEEP = flags.get("keep") === true;
const DARK = flags.get("dark") === true;
const LIGHTBOX = flags.get("lightbox") === true;
const PAGINATE = flags.get("paginate") === true;
const SHOT_DIR = join(tmpdir(), "shots");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

function startServer() {
  return new Promise((res) => {
    const srv = createServer(async (req, resp) => {
      try {
        let p = decodeURIComponent(req.url.split("?")[0]);
        // The site ships no favicon; browsers auto-request it. Answer 204 so
        // the benign 404 doesn't pollute the console-error check.
        if (p === "/favicon.ico") {
          resp.writeHead(204);
          resp.end();
          return;
        }
        if (p.endsWith("/")) p += "index.html";
        const full = join(REPO_ROOT, p);
        if (!full.startsWith(REPO_ROOT) || !existsSync(full)) {
          resp.writeHead(404);
          resp.end("not found");
          return;
        }
        const body = await readFile(full);
        resp.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream" });
        resp.end(body);
      } catch (e) {
        resp.writeHead(500);
        resp.end(String(e));
      }
    });
    srv.listen(PORT, "127.0.0.1", () => res(srv));
  });
}

function slug(page) {
  return page.replace(/[\/\\]/g, "_").replace(/\.html$/, "") + (DARK ? "-dark" : "") + (LIGHTBOX ? "-lightbox" : "");
}

async function drivePage(browser, page) {
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const pg = await ctx.newPage();
  pg.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  pg.on("pageerror", (e) => errors.push(String(e)));

  const url = `http://127.0.0.1:${PORT}/${page}`;
  await pg.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  // Gallery images render into <canvas> from data-original-src via main-script.js.
  // Wait until at least one canvas has non-zero intrinsic size (image drawn).
  let canvasRendered = null;
  const hasGallery = await pg.locator(".gallery canvas").count();
  if (hasGallery > 0) {
    try {
      await pg.waitForFunction(() => {
        const c = document.querySelector(".gallery canvas[data-original-src]");
        return c && c.width > 0 && c.height > 0;
      }, { timeout: 15000 });
      canvasRendered = true;
    } catch {
      canvasRendered = false;
    }
  }

  if (DARK) {
    await pg.click("#theme-toggle");
    await pg.waitForTimeout(300);
  }

  if (PAGINATE) {
    const next = pg.locator("#pagination-controls button", { hasText: "Próximo" });
    if (await next.count()) {
      await next.first().click();
      await pg.waitForTimeout(400);
    }
  }

  if (LIGHTBOX) {
    const canvas = pg.locator(".gallery canvas[data-original-src]").first();
    if (await canvas.count()) {
      await canvas.click();
      await pg.waitForSelector("#imageOverlay.active", { timeout: 5000 });
      await pg.waitForTimeout(500);
    }
  }

  await mkdir(SHOT_DIR, { recursive: true });
  const out = flags.get("out") ? resolve(String(flags.get("out"))) : join(SHOT_DIR, slug(page) + ".png");
  await pg.screenshot({ path: out, fullPage: !LIGHTBOX });

  const title = await pg.title();
  await ctx.close();
  return { page, title, canvasRendered, galleryCount: hasGallery, errors, out };
}

async function main() {
  const pages = positional.length
    ? positional
    : ["index.html", "anicca/index.html", "silencios-habitados/index.html", "about.html", "contact.html"];

  const srv = await startServer();
  console.log(`[server] http://127.0.0.1:${PORT} serving ${REPO_ROOT}`);
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  let failed = false;
  const results = [];
  for (const page of pages) {
    try {
      const r = await drivePage(browser, page);
      results.push(r);
      const canvasNote =
        r.canvasRendered === null ? "no gallery" : r.canvasRendered ? `${r.galleryCount} canvas rendered` : "CANVAS FAILED";
      const errNote = r.errors.length ? `${r.errors.length} console error(s)` : "clean";
      const ok = r.canvasRendered !== false && r.errors.length === 0;
      if (!ok) failed = true;
      console.log(`${ok ? "PASS" : "FAIL"}  ${page}  ["${r.title}"]  ${canvasNote}, ${errNote}`);
      console.log(`       shot: ${r.out}`);
      for (const e of r.errors) console.log(`       err: ${e}`);
    } catch (e) {
      failed = true;
      console.log(`FAIL  ${page}  ${e.message}`);
    }
  }

  await browser.close();
  if (!KEEP) srv.close();
  else console.log(`[server] left running on ${PORT} (--keep)`);

  console.log(`\n${failed ? "SMOKE FAILED" : "SMOKE OK"} — ${results.length} page(s)`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
