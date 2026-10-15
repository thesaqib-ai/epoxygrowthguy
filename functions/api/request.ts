/**
 * POST /api/request
 *
 * 1. Verify the Turnstile token
 * 2. Honeypot filled, return 200 and do nothing else
 * 3. Validate and clean every field again, server side
 * 4. Rate limit to 3 requests per IP per hour
 * 5. Save to Supabase (or Airtable)
 * 6. Forward to the n8n webhook, fire and forget, 3 second timeout
 * 7. Return { ok: true }
 *
 * If n8n is down the row is still saved and the person still sees success.
 */
import { validateRequest, HONEYPOT_FIELD } from '../../src/lib/form-schema';
import { saveRequest, type StoreEnv } from '../../src/lib/store';

type Env = StoreEnv & {
  TURNSTILE_SECRET_KEY?: string;
  N8N_WEBHOOK_URL?: string;
  N8N_WEBHOOK_SECRET?: string;
  RATE_LIMIT?: KVNamespace;
};

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const N8N_TIMEOUT_MS = 3000;

const GENERIC_ERROR =
  'Something went wrong sending that. Please try again, or DM me on Instagram at @epoxy_growth_guy.';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

async function verifyTurnstile(
  token: string,
  ip: string,
  secret: string,
): Promise<boolean> {
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);

  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: form, signal: AbortSignal.timeout(5000) },
    );
    const body = (await res.json()) as { success?: boolean };
    return body.success === true;
  } catch (error) {
    console.error('Turnstile verification error', error);
    return false;
  }
}

/**
 * Simple fixed window counter in KV. Good enough for a contact form, and it
 * costs nothing when nobody is submitting.
 */
async function overRateLimit(kv: KVNamespace, ip: string): Promise<boolean> {
  const bucket = Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW_SECONDS);
  const key = `rl:${ip}:${bucket}`;
  const current = Number((await kv.get(key)) ?? '0');

  if (current >= RATE_LIMIT_MAX) return true;

  await kv.put(key, String(current + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS + 60,
  });
  return false;
}

async function forwardToN8n(
  payload: unknown,
  env: Env,
  recordId: string | null,
): Promise<void> {
  if (!env.N8N_WEBHOOK_URL) return;
  try {
    const res = await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.N8N_WEBHOOK_SECRET
          ? { 'x-webhook-secret': env.N8N_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify({ ...(payload as object), record_id: recordId }),
      signal: AbortSignal.timeout(N8N_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('n8n webhook returned', res.status, await res.text());
    }
  } catch (error) {
    // The row is already saved, so a failure here never reaches the person.
    console.error('n8n webhook failed', error);
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, waitUntil } = context;

  let raw: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Body is not an object');
    }
    raw = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, message: GENERIC_ERROR }, 400);
  }

  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '';

  // 1. Turnstile. Skipped only when no secret is configured, which is the
  //    local development case.
  if (env.TURNSTILE_SECRET_KEY) {
    const token = typeof raw['cf-turnstile-response'] === 'string'
      ? raw['cf-turnstile-response']
      : '';
    const passed = token
      ? await verifyTurnstile(token, ip, env.TURNSTILE_SECRET_KEY)
      : false;
    if (!passed) {
      return json(
        {
          ok: false,
          message:
            'That security check did not pass. Please reload the page and try again.',
        },
        403,
      );
    }
  } else {
    console.warn('TURNSTILE_SECRET_KEY is not set, skipping verification.');
  }

  // 2. Honeypot. Look successful, save nothing.
  const honeypot = raw[HONEYPOT_FIELD];
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    console.warn('Honeypot triggered, discarding submission.');
    return json({ ok: true });
  }

  // 3. Never trust the browser. Validate the same way again.
  const { ok, errors, data } = validateRequest(raw);
  if (!ok) {
    return json(
      {
        ok: false,
        errors,
        message: 'Please check the fields marked below.',
      },
      400,
    );
  }

  // 4. Rate limit.
  if (env.RATE_LIMIT && ip) {
    try {
      if (await overRateLimit(env.RATE_LIMIT, ip)) {
        return json(
          {
            ok: false,
            message:
              'You have sent a few requests already. Give it an hour and try again, or DM me on Instagram at @epoxy_growth_guy.',
          },
          429,
        );
      }
    } catch (error) {
      // A rate limit outage should never block a real person.
      console.error('Rate limit check failed', error);
    }
  }

  // 5. Save it.
  let recordId: string | null = null;
  try {
    const saved = await saveRequest(data, env);
    recordId = saved.id;
  } catch (error) {
    console.error('Saving the request failed', error);
    return json({ ok: false, message: GENERIC_ERROR }, 500);
  }

  // 6. Hand it to n8n without making the person wait.
  waitUntil(forwardToN8n(data, env, recordId));

  // 7. Done.
  return json({ ok: true });
};

/** Someone opening the endpoint in a browser gets a short, honest answer. */
export const onRequestGet: PagesFunction<Env> = async () =>
  json({ ok: false, message: 'Send this as a POST request.' }, 405);
