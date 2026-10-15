/**
 * Where a request gets saved.
 *
 * Supabase is the default. Airtable is a drop in alternative: set
 * STORE_TARGET=airtable and fill in the Airtable variables. Nothing else in
 * the app needs to change.
 */
import type { RequestPayload } from './form-schema';

export type StoreEnv = {
  STORE_TARGET?: string;

  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;

  AIRTABLE_TOKEN?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_TABLE?: string;
};

export type StoredRequest = RequestPayload & {
  status: 'requested';
};

export type SaveResult = { id: string | null };

/** Everything written to storage, in one place. */
export const toRow = (data: RequestPayload): StoredRequest => ({
  ...data,
  status: 'requested',
});

/** Turn empty strings into null so the table does not fill up with "". */
const orNull = (value: string): string | null => (value === '' ? null : value);

async function saveToSupabase(
  row: StoredRequest,
  env: StoreEnv,
): Promise<SaveResult> {
  const url = env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase is not configured.');
  }

  const res = await fetch(`${url}/rest/v1/interview_requests`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: key,
      authorization: `Bearer ${key}`,
      prefer: 'return=representation',
    },
    body: JSON.stringify({
      full_name: row.full_name,
      business_name: row.business_name,
      instagram: row.instagram,
      website: orNull(row.website),
      email: row.email,
      phone: orNull(row.phone),
      location: row.location,
      years_in_business: row.years_in_business,
      services: row.services,
      team_size: row.team_size,
      talk_about: row.talk_about,
      biggest_challenge: orNull(row.biggest_challenge),
      heard_from: orNull(row.heard_from),
      utm_source: orNull(row.utm_source),
      utm_medium: orNull(row.utm_medium),
      utm_campaign: orNull(row.utm_campaign),
      referrer: orNull(row.referrer),
      status: row.status,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Supabase insert failed (${res.status}): ${detail}`);
  }

  const body = (await res.json().catch(() => null)) as
    | Array<{ id?: string }>
    | null;
  return { id: body?.[0]?.id ?? null };
}

async function saveToAirtable(
  row: StoredRequest,
  env: StoreEnv,
): Promise<SaveResult> {
  const token = env.AIRTABLE_TOKEN;
  const base = env.AIRTABLE_BASE_ID;
  const table = env.AIRTABLE_TABLE || 'interview_requests';
  if (!token || !base) {
    throw new Error('Airtable is not configured.');
  }

  const res = await fetch(
    `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        typecast: true,
        fields: {
          full_name: row.full_name,
          business_name: row.business_name,
          instagram: row.instagram,
          website: row.website,
          email: row.email,
          phone: row.phone,
          location: row.location,
          years_in_business: row.years_in_business,
          // Airtable multiple select.
          services: row.services,
          team_size: row.team_size,
          talk_about: row.talk_about,
          biggest_challenge: row.biggest_challenge,
          heard_from: row.heard_from,
          utm_source: row.utm_source,
          utm_medium: row.utm_medium,
          utm_campaign: row.utm_campaign,
          referrer: row.referrer,
          Status: 'requested',
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Airtable insert failed (${res.status}): ${detail}`);
  }

  const body = (await res.json().catch(() => null)) as { id?: string } | null;
  return { id: body?.id ?? null };
}

export async function saveRequest(
  data: RequestPayload,
  env: StoreEnv,
): Promise<SaveResult> {
  const row = toRow(data);
  return env.STORE_TARGET === 'airtable'
    ? saveToAirtable(row, env)
    : saveToSupabase(row, env);
}
