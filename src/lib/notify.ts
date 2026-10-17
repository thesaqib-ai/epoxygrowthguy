/**
 * The two emails that go out when a request comes in:
 *
 *   1. A heads up to Saqib, with Reply-To set to the person who asked, so
 *      hitting reply on a phone answers them rather than an unattended address.
 *   2. A short "got it" to the person who asked.
 *
 * VIA RESEND, NOT CLOUDFLARE EMAIL SENDING. The binding needed no credential
 * and was the first choice, but it is gated behind a paid Workers plan.
 * autosinq.com is already a verified sending domain on Resend for the Autosinq
 * site, so this reuses that: same provider, same verified domain, no new DNS.
 * Resend's free tier is 3,000 a month and 100 a day, shared across both sites
 * and far beyond what either needs. See Autosinq's src/lib/email.ts, which this
 * deliberately mirrors.
 *
 * THE GOVERNING RULE: AN EMAIL FAILURE MUST NEVER COST A REQUEST.
 *
 * The row is in Supabase before any of this runs, and this whole module is
 * called inside waitUntil, after the response has already gone back to the
 * browser. Nothing here is allowed to throw. Every failure becomes a
 * console.error and a `false`. A missed notification is an annoyance that
 * Supabase still has a record of; a 500 on the form is a lost guest.
 */
import type { RequestPayload } from './form-schema';
import { site } from '../config';

const ENDPOINT = 'https://api.resend.com/emails';

export type MailEnv = {
  RESEND_API_KEY?: string;
  /** Where the heads up goes. Falls back to the site contact address. */
  NOTIFY_EMAIL?: string;
};

/**
 * What the Turnstile check thought. It never blocks a submission, so this is
 * a note for Saqib rather than a verdict.
 *
 *   verified  the visitor passed, which is the ordinary case
 *   missing   no token arrived, usually the widget failed to load
 *   failed    a token arrived but did not check out, often simply expired
 *   skipped   no secret key configured, which is local development
 */
export type BotCheck = 'verified' | 'missing' | 'failed' | 'skipped';

const BOT_CHECK_NOTE: Record<Exclude<BotCheck, 'verified'>, string> = {
  missing:
    'Heads up: the bot check did not run for this one, usually because the widget failed to load. Worth a glance before you reply.',
  failed:
    'Heads up: the bot check did not pass for this one. That often just means the form was open a long time and the token expired, so read it before assuming anything.',
  skipped:
    'Heads up: no bot check was configured when this arrived.',
};

/** Escapes anything a stranger typed before it goes near an HTML body. */
const esc = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const firstName = (fullName: string): string =>
  fullName.trim().split(/\s+/)[0] || 'there';

/** Resend takes one RFC 5322 string rather than a name and address pair. */
const FROM = `${site.mail.fromName} <${site.mail.from}>`;

type Message = {
  to: string;
  reply_to?: string;
  subject: string;
  text: string;
  html: string;
};

async function deliver(
  apiKey: string | undefined,
  what: string,
  message: Message,
): Promise<boolean> {
  if (!apiKey) {
    /**
     * EMPTY and MISSING are reported separately on purpose.
     *
     * `wrangler secret put NAME` prompts on stdin. Run from a non-interactive
     * shell it reads EOF, uploads an empty string, and still prints "Success".
     * The secret list then looks perfect while every send fails. Set this one
     * through the dashboard.
     */
    console.error(
      `RESEND_API_KEY ${apiKey === '' ? 'is EMPTY (set it in the dashboard, not a non-interactive shell)' : 'is not set'}, ${what} not sent`,
    );
    return false;
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, ...message }),
    });

    if (response.ok) return true;

    // Resend explains refusals in plain words ("domain is not verified", "you
    // can only send to your own address on a free account"). That sentence is
    // the difference between a five minute fix and an afternoon, so never
    // swallow it.
    const detail = await response.text().catch(() => '');
    console.error(
      `Email send failed, ${what}, HTTP ${response.status}: ${detail.slice(0, 500)}`,
    );
    return false;
  } catch (error) {
    console.error(`Email send threw, ${what}:`, error);
    return false;
  }
}

/** The request as label and value pairs, with blanks dropped. */
const fields = (data: RequestPayload): Array<[string, string]> =>
  (
    [
      ['Name', data.full_name],
      ['Business', data.business_name],
      ['Instagram', data.instagram ? `@${data.instagram}` : ''],
      ['Website', data.website],
      ['Email', data.email],
      ['Phone', data.phone],
      ['Location', data.location],
      ['Years in business', data.years_in_business],
      ['What they do', data.services.join(', ')],
      ['Team size', data.team_size],
      ['Wants to talk about', data.talk_about],
      ['Biggest challenge', data.biggest_challenge],
      ['Heard about the series from', data.heard_from],
      ['Campaign source', data.utm_source],
      ['Campaign medium', data.utm_medium],
      ['Campaign name', data.utm_campaign],
      ['Came from', data.referrer],
    ] as Array<[string, string]>
  ).filter(([, value]) => value !== '');

/**
 * The one that matters. Reply-To is the requester, so answering from a phone
 * goes straight to them with no copy and paste.
 */
async function notifyOwner(
  apiKey: string | undefined,
  data: RequestPayload,
  to: string,
  recordId: string | null,
  botCheck: BotCheck,
): Promise<boolean> {
  const rows = fields(data);
  // Only say anything when it is not the ordinary case, so a normal request
  // stays a clean read.
  const note = botCheck === 'verified' ? '' : BOT_CHECK_NOTE[botCheck];

  const text = [
    'New interview request.',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    ...(recordId ? [`Row: ${recordId}`, ''] : []),
    ...(note ? [note, ''] : []),
    'Reply to this email to answer them directly.',
  ].join('\n');

  const html = `<div style="font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif">
<p style="margin:0 0 16px"><strong>New interview request.</strong></p>
${note ? `<p style="margin:0 0 16px;padding:10px 12px;background:#fff1f3;border-left:3px solid #ff0033;color:#8a1026;font-size:14px">${esc(note)}</p>` : ''}
<table cellpadding="6" style="border-collapse:collapse">
${rows
  .map(
    ([label, value]) =>
      `<tr><td style="color:#666;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="vertical-align:top"><strong>${esc(value)}</strong></td></tr>`,
  )
  .join('\n')}
</table>
${recordId ? `<p style="margin:16px 0 0;color:#888;font-size:13px">Row ${esc(recordId)}</p>` : ''}
<p style="margin:16px 0 0;color:#666;font-size:13px">Reply to this email to answer them directly.</p>
</div>`;

  return deliver(apiKey, 'interview request notification', {
    to,
    reply_to: data.email,
    subject: `Interview request: ${data.full_name}, ${data.business_name}`,
    text,
    html,
  });
}

/** The short "got it", so nobody is left wondering whether it sent. */
async function autoReply(
  apiKey: string | undefined,
  data: RequestPayload,
): Promise<boolean> {
  const name = firstName(data.full_name);

  const text = `Hi ${name},

Thanks for reaching out about the Epoxy Growth Sessions. I've got your details and I'll look through them in the next 48 hours.

If it's a fit, I'll contact you to arrange a time. The call is relaxed and takes about 15 to 20 minutes.

Talk soon,
${site.hostName}
@${site.instagramHandle}`;

  const html = `<div style="font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;max-width:34rem">
<p>Hi ${esc(name)},</p>
<p>Thanks for reaching out about the Epoxy Growth Sessions. I've got your details and I'll look through them in the next 48 hours.</p>
<p>If it's a fit, I'll contact you to arrange a time. The call is relaxed and takes about 15 to 20 minutes.</p>
<p>Talk soon,<br />${esc(site.hostName)}<br /><a href="https://www.instagram.com/${esc(site.instagramHandle)}/" style="color:#d1002a">@${esc(site.instagramHandle)}</a></p>
</div>`;

  return deliver(apiKey, 'requester auto reply', {
    to: data.email,
    // A reply here is a real person asking about the series. Route it to Saqib.
    reply_to: site.contactEmail,
    subject: 'Got your interview request',
    text,
    html,
  });
}

export async function sendNotifications(
  data: RequestPayload,
  env: MailEnv,
  recordId: string | null,
  botCheck: BotCheck = 'skipped',
): Promise<void> {
  // Neither call rejects, so this cannot throw into waitUntil.
  await Promise.all([
    notifyOwner(
      env.RESEND_API_KEY,
      data,
      env.NOTIFY_EMAIL || site.contactEmail,
      recordId,
      botCheck,
    ),
    autoReply(env.RESEND_API_KEY, data),
  ]);
}
