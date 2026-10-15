/**
 * The single source of truth for the request form.
 * Shared by the Astro form markup, the browser validation and the
 * Pages Function, so the three can never drift apart.
 */

export const YEARS_IN_BUSINESS = [
  'Less than 1',
  '1 to 3',
  '3 to 5',
  '5 to 10',
  '10+',
] as const;

export const SERVICES = [
  'Flake / chip',
  'Metallic',
  'Polished concrete',
  'Decorative or overlays',
  'Commercial or industrial',
  'Supply or products',
  'Training or education',
  'Other',
] as const;

export const TEAM_SIZES = ['Just me', '2 to 5', '6 to 15', '16+'] as const;

export const HEARD_FROM = [
  'Instagram',
  'A past guest',
  'Facebook',
  'Someone sent me',
  'Other',
] as const;

export const MAX_TEXTAREA = 600;

/** Name of the honeypot field. Hidden with CSS, never with type="hidden". */
export const HONEYPOT_FIELD = 'company_website';

export type RequestPayload = {
  full_name: string;
  business_name: string;
  instagram: string;
  website: string;
  email: string;
  phone: string;
  location: string;
  years_in_business: string;
  services: string[];
  team_size: string;
  talk_about: string;
  biggest_challenge: string;
  heard_from: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  referrer: string;
};

export type FieldErrors = Partial<Record<keyof RequestPayload, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const str = (value: unknown, limit = 300): string =>
  typeof value === 'string' ? value.trim().slice(0, limit) : '';

/** Drop a leading @ and any instagram.com prefix a guest may paste in. */
export const cleanHandle = (raw: string): string =>
  raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/\/.*$/, '')
    .replace(/^@+/, '')
    .trim();

/** Accept "mysite.com" as well as a full URL. */
export const cleanWebsite = (raw: string): string => {
  const value = raw.trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const isUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Clean and validate a raw submission.
 * Used unchanged on the server. The browser runs the same rules so people see
 * errors before they ever hit send.
 */
export function validateRequest(raw: Record<string, unknown>): {
  ok: boolean;
  errors: FieldErrors;
  data: RequestPayload;
} {
  const services = Array.isArray(raw.services)
    ? raw.services
        .map((s) => str(s, 60))
        .filter((s) => (SERVICES as readonly string[]).includes(s))
    : [];

  const data: RequestPayload = {
    full_name: str(raw.full_name, 120),
    business_name: str(raw.business_name, 160),
    instagram: cleanHandle(str(raw.instagram, 120)),
    website: cleanWebsite(str(raw.website, 300)),
    email: str(raw.email, 200).toLowerCase(),
    phone: str(raw.phone, 60),
    location: str(raw.location, 160),
    years_in_business: str(raw.years_in_business, 40),
    services: [...new Set(services)],
    team_size: str(raw.team_size, 40),
    talk_about: str(raw.talk_about, MAX_TEXTAREA),
    biggest_challenge: str(raw.biggest_challenge, MAX_TEXTAREA),
    heard_from: str(raw.heard_from, 40),
    utm_source: str(raw.utm_source, 120),
    utm_medium: str(raw.utm_medium, 120),
    utm_campaign: str(raw.utm_campaign, 120),
    referrer: str(raw.referrer, 500),
  };

  const errors: FieldErrors = {};

  if (!data.full_name) errors.full_name = 'Please add your name.';
  if (!data.business_name) {
    errors.business_name = 'Please add your business name.';
  }
  if (!data.instagram) {
    errors.instagram = 'Please add your Instagram handle.';
  } else if (!/^[A-Za-z0-9._]{1,30}$/.test(data.instagram)) {
    errors.instagram = 'That does not look like an Instagram handle.';
  }
  if (data.website && !isUrl(data.website)) {
    errors.website = 'Please check that web address.';
  }
  if (!data.email) {
    errors.email = 'Please add your email.';
  } else if (!EMAIL_RE.test(data.email)) {
    errors.email = 'Please check that email address.';
  }
  if (!data.location) {
    errors.location = 'Please add your city and state or country.';
  }
  if (!(YEARS_IN_BUSINESS as readonly string[]).includes(data.years_in_business)) {
    errors.years_in_business = 'Please pick how long you have been going.';
  }
  if (data.services.length === 0) {
    errors.services = 'Please pick at least one.';
  }
  if (!(TEAM_SIZES as readonly string[]).includes(data.team_size)) {
    errors.team_size = 'Please pick your team size.';
  }
  if (!data.talk_about) {
    errors.talk_about = 'Please tell me a little about what you would cover.';
  }
  if (data.heard_from && !(HEARD_FROM as readonly string[]).includes(data.heard_from)) {
    data.heard_from = '';
  }

  return { ok: Object.keys(errors).length === 0, errors, data };
}
