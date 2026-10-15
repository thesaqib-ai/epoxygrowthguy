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

  /** [CONFIG] contactEmail */
  contactEmail: 'saqib@epoxygrowthguy.com',

  /** Instagram handle, without the @. */
  instagramHandle: 'epoxy_growth_guy',

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
