/**
 * POST /api/request
 *
 * 1. Verify the Turnstile token
 * 2. Honeypot filled, return 200 and do nothing else
 * 3. Validate and clean every field again, server side
 * 4. Check the rate limit of 3 accepted requests per IP per hour
 * 5. Save to Supabase (or Airtable)
 * 6. Email Saqib, and send the person a short "got it", after the response
 * 7. Return { ok: true }
 *
 * If the email step fails the row is still saved and the person still sees
 * success. The failure is logged.
 *
 * If the save fails, the whole request is emailed to Saqib instead, and the
 * person only sees success once that email has been accepted. They see the
 * error only when both copies failed, because then nothing of theirs exists.
 */
import { validateRequest, HONEYPOT_FIELD } from '../../src/lib/form-schema';
import { saveRequest, type StoreEnv } from '../../src/lib/store';
import {
  sendNotifications,
  sendRescue,
  sendAutoReply,
  type MailEnv,
  type BotCheck,
} from '../../src/lib/notify';

type Env = StoreEnv &
  MailEnv & {
    TURNSTILE_SECRET_KEY?: string;
    RATE_LIMIT?: KVNamespace;
  };

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

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
 *
 * Checking and counting are separate on purpose. Only a request that was
 * actually kept is counted, so someone retrying through an outage of ours is
 * never locked out by our own failure.
 */
const rateLimitKey = (ip: string): string =>
  `rl:${ip}:${Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW_SECONDS)}`;

async function overRateLimit(kv: KVNamespace, ip: string): Promise<boolean> {
  const current = Number((await kv.get(rateLimitKey(ip))) ?? '0');
  return current >= RATE_LIMIT_MAX;
}

/** Runs after the response, so it must never throw. */
async function countRequest(kv: KVNamespace, ip: string): Promise<void> {
  try {
    const key = rateLimitKey(ip);
    const current = Number((await kv.get(key)) ?? '0');
    await kv.put(key, String(current + 1), {
      expirationTtl: RATE_LIMIT_WINDOW_SECONDS + 60,
    });
  } catch (error) {
    console.error('Rate limit count failed', error);
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

  /**
   * 1. Turnstile, ADVISORY ONLY. It never blocks a submission.
   *
   * A blocked guest costs far more than a spam row that takes two seconds to
   * delete, and Saqib reads every request by hand anyway. The widget also
   * fails for reasons that have nothing to do with bots: a hostname missing
   * from the widget config, a blocked third party script, a corporate proxy,
   * or simply a token that expired while someone filled the form in slowly.
   * Every one of those used to produce a red error on a real person's screen.
   *
   * The honeypot and the rate limit are the gates that actually hold. This
   * records what the check thought and passes it along for Saqib to judge.
   */
  let botCheck: BotCheck = 'skipped';
  if (env.TURNSTILE_SECRET_KEY) {
    const token =
      typeof raw['cf-turnstile-response'] === 'string'
        ? raw['cf-turnstile-response']
        : '';
    if (!token) {
      botCheck = 'missing';
    } else {
      botCheck = (await verifyTurnstile(token, ip, env.TURNSTILE_SECRET_KEY))
        ? 'verified'
        : 'failed';
    }
    if (botCheck !== 'verified') {
      console.warn(
        `Turnstile ${botCheck}, letting the request through anyway. IP ${ip || 'unknown'}`,
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

  // 5. Save it. If storage is down, the rescue email becomes the only copy,
  // so wait for it here: success must not be shown until it has been accepted.
  let recordId: string | null = null;
  let saved = false;
  try {
    recordId = (await saveRequest(data, env)).id;
    saved = true;
  } catch (error) {
    console.error('Saving the request failed', error);
    if (!(await sendRescue(data, env, botCheck))) {
      console.error('Rescue email failed too, this request was not kept.');
      return json({ ok: false, message: GENERIC_ERROR }, 500);
    }
  }

  if (env.RATE_LIMIT && ip) waitUntil(countRequest(env.RATE_LIMIT, ip));

  // 6. Send the emails without making the person wait for them.
  waitUntil(
    saved
      ? sendNotifications(data, env, recordId, botCheck)
      : sendAutoReply(data, env),
  );

  // 7. Done.
  return json({ ok: true });
};

/** Someone opening the endpoint in a browser gets a short, honest answer. */
export const onRequestGet: PagesFunction<Env> = async () =>
  json({ ok: false, message: 'Send this as a POST request.' }, 405);
