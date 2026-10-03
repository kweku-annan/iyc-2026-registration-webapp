#!/usr/bin/env node
/**
 * process-gallery.js — Developer image processing script.
 *
 * Usage:
 *   node scripts/process-gallery.js
 *
 * Workflow:
 *   1. Reads every image from frontend/public/gallery/source/
 *   2. Converts each to WebP at two sizes:
 *        thumb: 400 px wide (60 quality) → public/gallery/thumbs/<id>.webp
 *        full:  1600 px wide (82 quality) → public/gallery/full/<id>.webp
 *   3. Writes/updates frontend/public/gallery/gallery.json
 *
 * Setup (first time only):
 *   npm install --save-dev sharp
 *
 * Adding new photos:
 *   1. Drop the original JPEG/PNG into frontend/public/gallery/source/
 *      using the naming convention: <year>-<description>-<sequence>.jpg
 *      e.g.: iyc2026-worship-001.jpg
 *   2. Run:   node scripts/process-gallery.js
 *   3. Edit gallery.json to add `title`, `caption`, and `alt` text for each
 *      new entry (the script leaves existing metadata intact).
 *
 * Requires Node.js >= 18 and the `sharp` package.
 */

import { createRequire } from "module";
import { readdir, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, basename, extname } from "node:path";

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error(
    "❌  sharp is not installed. Run: npm install --save-dev sharp\n" +
    "   (sharp is a dev dependency — it never ships in the production bundle)"
  );
  process.exit(1);
}

const ROOT = resolve(import.meta.dirname, "../frontend/public/gallery");
const SOURCE_DIR = resolve(ROOT, "source");
const THUMBS_DIR = resolve(ROOT, "thumbs");
const FULL_DIR   = resolve(ROOT, "full");
const MANIFEST   = resolve(ROOT, "gallery.json");

const THUMB_WIDTH = 400;
const FULL_WIDTH  = 1600;
const THUMB_QUALITY = 60;
const FULL_QUALITY  = 82;

const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tiff"]);

async function readManifest() {
  if (!existsSync(MANIFEST)) return { items: [] };
  const raw = await readFile(MANIFEST, "utf-8");
  return JSON.parse(raw);
}

async function run() {
  await mkdir(THUMBS_DIR, { recursive: true });
  await mkdir(FULL_DIR,   { recursive: true });

  const existing = await readManifest();
  const byId = Object.fromEntries(existing.items.map((i) => [i.id, i]));

  const sourceFiles = (await readdir(SOURCE_DIR))
    .filter((f) => SUPPORTED.has(extname(f).toLowerCase()))
    .sort();

  const items = [];

  for (const file of sourceFiles) {
    const id  = basename(file, extname(file));
    const src = resolve(SOURCE_DIR, file);

    const thumbOut = resolve(THUMBS_DIR, `${id}.webp`);
    const fullOut  = resolve(FULL_DIR,   `${id}.webp`);

    console.log(`→ Processing ${id}…`);

    const img = sharp(src);
    const meta = await img.metadata();

    // Thumbnail
    await sharp(src)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toFile(thumbOut);

    // Full size
    const fullImg = await sharp(src)
      .resize({ width: FULL_WIDTH, withoutEnlargement: true })
      .webp({ quality: FULL_QUALITY })
      .toFile(fullOut);

    const existing_entry = byId[id] ?? {};
    items.push({
      id,
      title:   existing_entry.title   ?? id,
      caption: existing_entry.caption ?? "",
      year:    existing_entry.year    ?? new Date().getFullYear(),
      thumb:   `/gallery/thumbs/${id}.webp`,
      full:    `/gallery/full/${id}.webp`,
      width:   fullImg.width  ?? meta.width,
      height:  fullImg.height ?? meta.height,
      alt:     existing_entry.alt ?? existing_entry.title ?? id,
    });

    console.log(`   ✓ thumb ${THUMB_WIDTH}px  full ${fullImg.width}px`);
  }

  const manifest = { items };
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
  console.log(`\n✅  Wrote gallery.json with ${items.length} item(s).`);
  console.log("   Edit title/caption/alt fields in gallery.json as needed.\n");
}

run().catch((err) => {
  console.error("❌  process-gallery failed:", err.message);
  process.exit(1);
});
