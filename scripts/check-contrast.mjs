/**
 * Contrast audit for the Resin Noir palette.
 *
 * The brand kit picks colours for thumbnails, where nothing has to pass WCAG.
 * A website does. This prints the ratio for every pairing the site actually
 * uses, so a brand change cannot quietly cost the Accessibility score.
 *
 *   node scripts/check-contrast.mjs
 */
const C = {
  ink950: '#0b0b0c',
  ink850: '#1c1c1e',
  ink800: '#232325',
  paper: '#f5f5f0',
  muted: '#a8a8a4',
  faint: '#8a8a86',
  accent: '#ff0033',
  accentBright: '#ff3355',
  warn: '#ff8fa3',
  cta: '#ffb800',
};

const lin = (v) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(
    (c) => lin(c / 255),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Flatten a translucent colour over a background, the way a browser does. */
const over = (fg, bg, alpha) => {
  const f = parseInt(fg.slice(1), 16);
  const b = parseInt(bg.slice(1), 16);
  const mix = (shift) => {
    const a = (f >> shift) & 255;
    const c = (b >> shift) & 255;
    return Math.round(a * alpha + c * (1 - alpha));
  };
  return `#${[16, 8, 0].map((s) => mix(s).toString(16).padStart(2, '0')).join('')}`;
};

const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const chipBg = over(C.accent, C.ink850, 0.2);

const pairs = [
  ['body text on page', C.paper, C.ink950, 4.5],
  ['muted text on page', C.muted, C.ink950, 4.5],
  ['faint text on page', C.faint, C.ink950, 4.5],
  ['muted text on card', C.muted, C.ink850, 4.5],
  ['faint text on card', C.faint, C.ink850, 4.5],
  ['eyebrow, red on page', C.accent, C.ink950, 4.5],
  ['small red text on card', C.accentBright, C.ink850, 4.5],
  ['big red numerals on card (24px)', C.accent, C.ink850, 3],
  ['form error text on card', C.warn, C.ink850, 4.5],
  ['selected chip label', C.paper, chipBg, 4.5],
  ['CTA button label', C.ink950, C.cta, 4.5],
  ['initials avatar (24px)', C.paper, C.ink800, 3],
];

let worst = Infinity;
let failed = 0;

for (const [label, fg, bg, min] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  worst = Math.min(worst, r / min);
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(6)}:1  (needs ${min})  ${label}`,
  );
}

console.log(
  `\n${failed === 0 ? 'All pairings pass.' : `${failed} pairing(s) FAIL.`}`,
);
process.exit(failed === 0 ? 0 : 1);
