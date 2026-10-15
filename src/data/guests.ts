/**
 * All guest and reel content lives here.
 *
 * To add a guest: add a row, drop a square photo in src/assets/guests/
 * named after the slug (for example chris-land.jpg) and set `photo` to that
 * file name. To show a guest: set `approved: true`.
 *
 * Anything not yet confirmed stays an empty string. Empty values render
 * nothing at all.
 */

export type Guest = {
  slug: string;
  name: string;
  business: string;
  location: string;
  /** Handle without the @. Empty string if not confirmed yet. */
  instagram: string;
  /** File name inside src/assets/guests/, for example "chris-land.jpg". */
  photo?: string;
  /** Only approved guests are ever shown. */
  approved: boolean;
  /** Lower shows first. */
  order: number;
};

export type FeaturedReel = {
  guestSlug: string;
  /** One short line. */
  quote: string;
  /** File name inside src/assets/reels/, for example "chris-land.jpg". */
  thumbnail: string;
  /** Instagram reel URL. */
  url: string;
  approved: boolean;
};

export const guests: Guest[] = [
  {
    slug: 'christopher-land',
    name: 'Christopher Land',
    business: 'Dallas Epoxy Guys',
    location: 'Dallas, TX',
    instagram: 'dallasepoxyguys',
    approved: true,
    order: 10,
  },
  {
    slug: 'don-resin',
    name: 'Don Resin',
    business: 'Don Resin Studios',
    location: 'Miami, FL',
    instagram: 'don_resin',
    approved: true,
    order: 20,
  },
  {
    slug: 'sam-serio',
    name: 'Sam Serio',
    business: 'El Patron Resin',
    location: 'Australia',
    instagram: 'elpatron_resin',
    approved: true,
    order: 30,
  },
  {
    slug: 'eagle-kianes',
    name: 'Eagle Kianes',
    business: 'Marbleous Creationz',
    location: '',
    // Confirm the handle before this goes live.
    instagram: '',
    approved: true,
    order: 40,
  },
  {
    slug: 'lee-sartain',
    name: 'Lee Sartain',
    business: 'Ace High Concrete Supply',
    location: '',
    instagram: 'acehighconcrete',
    approved: true,
    order: 50,
  },
  {
    slug: 'garage-style',
    name: 'Garage Style',
    business: 'Garage Style Ltd',
    location: 'Hertfordshire, UK',
    instagram: 'garagestyleltd',
    approved: true,
    order: 60,
  },
  {
    slug: 'danny-carpenter',
    name: 'Danny Carpenter',
    business: 'Mint Concrete Polishing',
    location: 'Gilbert, AZ',
    instagram: 'dannyjcarpenter',
    approved: true,
    order: 70,
  },
  {
    slug: 'sez',
    name: 'Sez',
    business: 'N&A Epoxy Flooring',
    location: 'Sydney, Australia',
    instagram: 'na_epoxy_floors',
    approved: true,
    order: 80,
  },
  {
    slug: 'jay',
    name: 'Jay',
    business: 'Limitless Epoxy Designs',
    location: 'Plainville, CT',
    instagram: 'jay_380_',
    approved: true,
    order: 90,
  },
  {
    slug: 'superior-concrete-solutions',
    name: '',
    business: 'Superior Concrete Solutions',
    location: 'Alabama and Florida',
    instagram: '',
    approved: true,
    order: 100,
  },
  {
    slug: 'smooth-coatings',
    name: '',
    business: 'Smooth Coatings',
    location: 'Southwest Virginia',
    instagram: 'smooth_coatings',
    approved: true,
    order: 110,
  },
  {
    slug: 'lone-wolf-coatings',
    name: '',
    business: 'Lone Wolf Coatings',
    location: '',
    instagram: 'lonewolfcoatings',
    approved: true,
    order: 120,
  },
];

export const featuredReels: FeaturedReel[] = [
  {
    guestSlug: 'christopher-land',
    quote: 'We stopped chasing cheap jobs and the business got easier.',
    thumbnail: 'christopher-land.jpg',
    url: 'https://www.instagram.com/epoxy_growth_guy/',
    approved: false,
  },
  {
    guestSlug: 'don-resin',
    quote: 'Art first, then the floors followed.',
    thumbnail: 'don-resin.jpg',
    url: 'https://www.instagram.com/epoxy_growth_guy/',
    approved: false,
  },
  {
    guestSlug: 'danny-carpenter',
    quote: 'Polished concrete taught me patience.',
    thumbnail: 'danny-carpenter.jpg',
    url: 'https://www.instagram.com/epoxy_growth_guy/',
    approved: false,
  },
  {
    guestSlug: 'garage-style',
    quote: 'One good garage brings the whole street.',
    thumbnail: 'garage-style.jpg',
    url: 'https://www.instagram.com/epoxy_growth_guy/',
    approved: false,
  },
];

/** Approved guests only, in display order. */
export const approvedGuests = (): Guest[] =>
  guests.filter((g) => g.approved).sort((a, b) => a.order - b.order);

/** Approved reels whose guest is also approved. */
export const approvedReels = (): Array<FeaturedReel & { guest: Guest }> =>
  featuredReels
    .filter((r) => r.approved)
    .map((r) => ({ reel: r, guest: guests.find((g) => g.slug === r.guestSlug) }))
    .filter(
      (pair): pair is { reel: FeaturedReel; guest: Guest } =>
        pair.guest !== undefined && pair.guest.approved,
    )
    .map(({ reel, guest }) => ({ ...reel, guest }))
    .slice(0, 4);
