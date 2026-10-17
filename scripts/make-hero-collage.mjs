/**
 * Builds the hero collage from the six reel thumbnails.
 *
 *   node scripts/make-hero-collage.mjs
 *
 * Writes src/assets/hero/reel-wall.png, which Astro then optimizes to AVIF.
 * It lands in src/assets rather than /public precisely so it goes through the
 * image pipeline: the source is a large PNG with alpha, the shipped file is a
 * fraction of it.
 *
 * Three columns of two, with the outer columns dropped below the middle one.
 * A flat grid of six reads as a contact sheet; the stagger reads as a wall of
 * clips, which is the point.
 *
 * Transparent background on purpose. The hero has a red glow behind it, and a
 * baked-in dark rectangle would show its edges against that glow.
 */
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const reelsDir = path.join(root, 'src', 'assets', 'reels');
const outDir = path.join(root, 'src', 'assets', 'hero');

const CARD_W = 330;
const CARD_H = Math.round((CARD_W * 16) / 9); // 587, a true 9:16
const GAP = 18;
const RADIUS = 22;
const DROP = 72; // how far the outer columns hang below the middle one

const COLS = 3;
const ROWS = 2;

const W = COLS * CARD_W + (COLS - 1) * GAP;
const H = ROWS * CARD_H + GAP + DROP;

const files = (await readdir(reelsDir))
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  .sort();

if (files.length < COLS * ROWS) {
  console.error(
    `Need ${COLS * ROWS} thumbnails in src/assets/reels, found ${files.length}.`,
  );
  process.exit(1);
}

const roundedMask = Buffer.from(
  `<svg width="${CARD_W}" height="${CARD_H}"><rect width="${CARD_W}" height="${CARD_H}" rx="${RADIUS}" fill="#fff"/></svg>`,
);

// A hairline in the same white the cards elsewhere on the page use, so the
// collage belongs to the same system.
const hairline = Buffer.from(
  `<svg width="${CARD_W}" height="${CARD_H}"><rect x="0.75" y="0.75" width="${CARD_W - 1.5}" height="${CARD_H - 1.5}" rx="${RADIUS}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/></svg>`,
);

const composites = [];

for (let i = 0; i < COLS * ROWS; i++) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);

  const card = await sharp(path.join(reelsDir, files[i]))
    .resize(CARD_W, CARD_H, { fit: 'cover', position: 'top' })
    .composite([
      { input: roundedMask, blend: 'dest-in' },
      { input: hairline, blend: 'over' },
    ])
    .png()
    .toBuffer();

  composites.push({
    input: card,
    left: col * (CARD_W + GAP),
    top: row * (CARD_H + GAP) + (col === 1 ? 0 : DROP),
  });
}

await mkdir(outDir, { recursive: true });

await sharp({
  create: {
    width: W,
    height: H,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .png({ compressionLevel: 9 })
  .toFile(path.join(outDir, 'reel-wall.png'));

console.log(`Wrote src/assets/hero/reel-wall.png (${W}x${H}) from:`);
for (const f of files.slice(0, COLS * ROWS)) console.log(`  ${f}`);
