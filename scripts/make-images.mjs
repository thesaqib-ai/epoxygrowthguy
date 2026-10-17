/**
 * Generates the static images that do not change often:
 *   public/apple-touch-icon.png  180x180
 *   public/og.png                1200x630
 *
 * Run with: node scripts/make-images.mjs
 *
 * The Open Graph image is text only for now. Once four or more guests are
 * approved, drop their photos into src/assets/guests and rerun this with
 * FACES=1 to get a row of faces along the bottom.
 */
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const publicDir = path.join(root, 'public');
const guestsDir = path.join(root, 'src', 'assets', 'guests');

// Resin Noir. See src/assets/brand kit/ and the tokens in global.css.
const RED = '#FF0033';
const INK = '#0B0B0C';
const PAPER = '#F5F5F0';
const MUTED = '#A8A8A4';

const DISPLAY = 'Anton, Impact, Haettenschweiler, Arial Narrow, sans-serif';
const SANS = 'Segoe UI, Inter, Helvetica Neue, Arial, sans-serif';

await mkdir(publicDir, { recursive: true });

/* ---------- apple touch icon ---------- */

// Matches public/favicon.svg: red field, Concrete White mark.
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${RED}"/>
  <path d="M20 16h25v8H29v6h14v8H29v6h16v8H20z" fill="${PAPER}"/>
</svg>`;

await sharp(Buffer.from(iconSvg)).png().toFile(
  path.join(publicDir, 'apple-touch-icon.png'),
);

/* ---------- open graph image ---------- */

const W = 1200;
const H = 630;

const faces = [];
if (process.env.FACES === '1') {
  const files = await readdir(guestsDir).catch(() => []);
  for (const file of files.filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))) {
    faces.push(path.join(guestsDir, file));
    if (faces.length === 6) break;
  }
}

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="glow" cx="12%" cy="0%" r="70%">
      <stop offset="0%" stop-color="${RED}" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="${RED}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${INK}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <text x="80" y="128" font-family="${SANS}" font-size="24" font-weight="700"
        letter-spacing="5.5" fill="${RED}">THE EPOXY GROWTH SESSIONS</text>

  <text x="80" y="250" font-family="${DISPLAY}" font-size="78" fill="${PAPER}"
        letter-spacing="0.5">CONVERSATIONS WITH THE</text>
  <text x="80" y="330" font-family="${DISPLAY}" font-size="78" fill="${PAPER}"
        letter-spacing="0.5">PEOPLE BUILDING THE</text>
  <text x="80" y="410" font-family="${DISPLAY}" font-size="78" fill="${RED}"
        letter-spacing="0.5">EPOXY INDUSTRY.</text>

  <rect x="80" y="480" width="56" height="3" fill="${RED}"/>

  <text x="80" y="546" font-family="${SANS}" font-size="27" fill="${MUTED}">
    Hosted by Muhammad Saqib S.  ·  @epoxy_growth_guy
  </text>

  <text x="${W - 80}" y="546" text-anchor="end" font-family="${SANS}"
        font-size="27" fill="${MUTED}">epoxygrowthguy.com</text>
</svg>`;

const composites = [];
if (faces.length >= 4) {
  const size = 84;
  const gap = 16;
  const totalWidth = faces.length * size + (faces.length - 1) * gap;
  let left = W - 80 - totalWidth;
  // Clear of the byline baseline at y=546, which the faces used to sit on.
  const top = 414;

  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );

  for (const face of faces) {
    const circle = await sharp(face)
      .resize(size, size, { fit: 'cover' })
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();
    composites.push({ input: circle, left, top });
    left += size + gap;
  }
}

await sharp(Buffer.from(ogSvg))
  .composite(composites)
  .png({ compressionLevel: 9 })
  .toFile(path.join(publicDir, 'og.png'));

console.log('Wrote public/apple-touch-icon.png and public/og.png');
if (faces.length) console.log(`Included ${faces.length} guest faces.`);
