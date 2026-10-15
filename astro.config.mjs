// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://epoxygrowthguy.com',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  vite: {
    // Cast because Astro and Tailwind pin slightly different Vite type
    // versions. The plugin itself is fine.
    plugins: [/** @type {any} */ (tailwindcss())],
  },
  image: {
    // Guest photos live in src/assets/guests and are optimized at build time.
    responsiveStyles: false,
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
