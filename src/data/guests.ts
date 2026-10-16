/**
 * All guest and reel content lives here.
 *
 * To add a guest: add a row, then drop a square photo into src/assets/guests/
 * named after the slug, for example christopher-land.jpg. It is picked up on
 * the next build on its own. To show a guest: set `approved: true`.
 *
 * Anything not yet confirmed stays an empty string. Empty values render
 * nothing at all, so a half filled row makes a shorter card, never a broken
 * one.
 */

export type Guest = {
  slug: string;
  name: string;
  business: string;
  location: string;
  /** Handle without the @. Empty string if not confirmed yet. */
  instagram: string;
  /**
   * Usually leave this out. Any image in src/assets/guests/ named after the
   * slug is found automatically. Only set it when a file cannot be renamed.
   */
  photo?: string;
  /** Only approved guests are ever shown. */
  approved: boolean;
  /** Lower shows first. */
  order: number;
};

export type FeaturedReel = {
  guestSlug: string;
  /**
   * The Instagram post id: the last part of the share link, and also the
   * thumbnail file name in src/assets/reels/. One value gives both the link
   * and the image, so the two can never drift apart.
   */
  reelId: string;
  /**
   * The hook burned into the reel itself.
   *
   * The reel's own words, never invented, and never rendered in quote marks,
   * because it is a title rather than something the guest said on camera.
   * Putting a hook in quotes would attribute a line to a real person who
   * never said it.
   */
  hook: string;
  approved: boolean;
};

/** Instagram serves a reel from the generic post path. */
export const reelUrl = (reelId: string): string =>
  `https://www.instagram.com/p/${reelId}/`;

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
    location: 'California and Wisconsin',
    instagram: 'marbleouscreationz_eagle',
    approved: true,
    order: 40,
  },
  {
    slug: 'lee-sartain',
    name: 'Lee Sartain',
    business: 'Ace High Concrete Supply',
    // Two branches, both in California. The card wants a place, not a
    // trading address, so the street addresses stay off the page.
    location: 'Rancho Cordova and Santa Clara, CA',
    instagram: 'acehighconcrete',
    approved: true,
    order: 50,
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
    slug: 'lone-wolf-coatings',
    name: 'Stephon Fauntroy',
    business: 'Lone Wolf Coatings',
    location: 'Philadelphia and Delaware',
    instagram: 'lonewolfcoatings',
    approved: true,
    order: 120,
  },
];

export const featuredReels: FeaturedReel[] = [
  {
    guestSlug: 'danny-carpenter',
    reelId: 'DeH5cb0NzFv',
    hook: 'Epoxy vs polished concrete? Save 3 days of research in 30 seconds.',
    approved: true,
  },
  {
    guestSlug: 'sam-serio',
    reelId: 'DeJ8V_sNEcQ',
    hook: 'Forgetting THIS will completely ruin your epoxy floor',
    approved: true,
  },
  {
    guestSlug: 'lone-wolf-coatings',
    reelId: 'DehDbVENdlE',
    hook: 'Your epoxy floor could fail because of this',
    approved: true,
  },
  {
    guestSlug: 'christopher-land',
    reelId: 'DdkiZpjIV-w',
    // Only the tail of the hook is readable on the thumbnail, something
    // ending "contractor over another?". Waiting on the full line from
    // Saqib rather than inventing the start of it.
    hook: '',
    approved: false,
  },

  // Two more thumbnails are sitting in src/assets/reels/ with no entry here,
  // because the guest in each is not on the wall and I could not identify
  // them from the frame:
  //   DeUwXJHtKiC  a Rock Hard Epoxy cap, "Is it too late to start an epoxy
  //                business in 2026?"
  //   DegaBUDtitE  "Customer says they're getting other quotes. Now what?"
  // Add the guest first, then a row here.
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
