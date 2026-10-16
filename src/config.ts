/**
 * Site wide configuration.
 * Values marked [CONFIG] in the build spec live here so copy can change
 * without touching any component.
 */

export const site = {
  /** [CONFIG] seriesName */
  seriesName: 'THE EPOXY GROWTH SESSIONS',

  /** Wordmark used in the top bar and footer. */
  wordmark: 'Epoxy Growth Guy',

  /** Host details. */
  hostName: 'Saqib',
  hostLegalName: 'Muhammad Saqib',

  /** [CONFIG] contactEmail. Shown in the footer and on the privacy page. */
  contactEmail: 'muhammad.saqib@autosinq.com',

  /**
   * Transactional email.
   *
   * The `from` address has to sit on a domain onboarded to Cloudflare Email
   * Sending. That is autosinq.com here, so autosinq.com is the domain to
   * onboard, not epoxygrowthguy.com.
   *
   * Where the heads up lands is set with the NOTIFY_EMAIL variable in
   * Cloudflare, so a personal inbox never has to live in this repo. Without
   * it, the notification falls back to contactEmail, which is read anyway.
   */
  mail: {
    from: 'muhammad.saqib@autosinq.com',
    fromName: 'Muhammad Saqib',
  },

  /** Instagram handle, without the @. */
  instagramHandle: 'epoxy_growth_guy',

  /**
   * Turnstile SITE key. Public by design: it is written into the HTML of every
   * page, so it is readable by anyone who views source. Safe in this repo.
   *
   * It lives here rather than in an environment variable because Astro needs
   * it at BUILD time, and this project's plaintext variables are managed
   * through wrangler.toml, which only supplies values at runtime. Keeping it
   * in source means a build can never silently produce a page with no widget.
   *
   * The SECRET key is the other half and never appears in this repo. It is a
   * Cloudflare secret, read only inside the Pages Function.
   */
  turnstileSiteKey: '0x4AAAAAAFXc_f7A2j4KwPx9',

  /** Canonical origin, no trailing slash. */
  url: 'https://epoxygrowthguy.com',

  /** Year shown in the footer. */
  copyrightYear: 2026,

  /** Autosinq link, with UTM parameters attached. */
  autosinqUrl:
    'https://autosinq.com/?utm_source=epoxygrowthguy&utm_medium=referral&utm_campaign=site',

  /** Guest wall stays hidden until at least this many guests are approved. */
  minApprovedGuests: 4,

  seo: {
    title:
      'The Epoxy Growth Sessions | Interviews with the people building the epoxy industry',
    description:
      'Short, honest interviews with epoxy installers, artists, suppliers and educators. Hosted by Saqib, @epoxy_growth_guy. Request an interview.',
    ogImage: '/og.png',
  },
} as const;

export const instagramUrl = `https://www.instagram.com/${site.instagramHandle}/`;

export const instagramProfileUrl = (handle: string) =>
  `https://www.instagram.com/${handle.replace(/^@/, '')}/`;
