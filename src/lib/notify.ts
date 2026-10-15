/**
 * The two emails that go out when a request comes in:
 *
 *   1. A heads up to Saqib, with reply-to set to the person who asked, so
 *      hitting reply in any mail client goes straight back to them.
 *   2. A short "got it" to the person who asked.
 *
 * Both are sent through the Cloudflare Email Sending binding, so there are no
 * API keys to manage. Neither can block the response: they run after the row
 * is already saved, and every failure is caught and logged.
 */
import type { RequestPayload } from './form-schema';
import { site } from '../config';

export type MailEnv = {
  EMAIL?: SendEmail;
  /** Where the heads up goes. Falls back to the site contact address. */
  NOTIFY_EMAIL?: string;
};

const esc = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const firstName = (fullName: string): string =>
  fullName.trim().split(/\s+/)[0] || 'there';

/** The request, laid out as label and value pairs, blanks dropped. */
const fields = (data: RequestPayload): Array<[string, string]> =>
  (
    [
      ['Name', data.full_name],
      ['Business', data.business_name],
      ['Instagram', `@${data.instagram}`],
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
  ).filter(([, value]) => value !== '' && value !== '@');

function notifyEmail(data: RequestPayload, recordId: string | null) {
  const rows = fields(data);

  const text = [
    'New interview request.',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    // Spread rather than filter, so the blank spacer lines above survive.
    ...(recordId ? [`Row: ${recordId}`, ''] : []),
    'Reply to this email to answer them directly.',
  ].join('\n');

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#111">
  <p style="margin:0 0 16px"><strong>New interview request.</strong></p>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    ${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#666;vertical-align:top;white-space:nowrap">${esc(label)}</td><td style="padding:4px 0;vertical-align:top">${esc(value)}</td></tr>`,
      )
      .join('\n    ')}
  </table>
  ${recordId ? `<p style="margin:16px 0 0;color:#888;font-size:13px">Row ${esc(recordId)}</p>` : ''}
  <p style="margin:16px 0 0;color:#666;font-size:13px">Reply to this email to answer them directly.</p>
</div>`;

  return {
    subject: `Interview request: ${data.full_name}, ${data.business_name}`,
    text,
    html,
  };
}

function autoReplyEmail(data: RequestPayload) {
  const name = firstName(data.full_name);

  const lines = [
    `Hi ${name},`,
    '',
    "Thanks for reaching out about the Epoxy Growth Sessions. I've got your details and I'll look through them in the next 48 hours.",
    '',
    "If it's a fit, I'll send you a link to pick a time. The call is relaxed, about 15 to 20 minutes, and I'll send you the questions before we record.",
    '',
    'Talk soon,',
    site.hostName,
    `@${site.instagramHandle}`,
  ];

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#111">
  <p style="margin:0 0 16px">Hi ${esc(name)},</p>
  <p style="margin:0 0 16px">Thanks for reaching out about the Epoxy Growth Sessions. I've got your details and I'll look through them in the next 48 hours.</p>
  <p style="margin:0 0 16px">If it's a fit, I'll send you a link to pick a time. The call is relaxed, about 15 to 20 minutes, and I'll send you the questions before we record.</p>
  <p style="margin:0">Talk soon,<br />${esc(site.hostName)}<br /><a href="https://www.instagram.com/${esc(site.instagramHandle)}/" style="color:#9a7520">@${esc(site.instagramHandle)}</a></p>
</div>`;

  return {
    subject: 'Got your interview request',
    text: lines.join('\n'),
    html,
  };
}

export async function sendNotifications(
  data: RequestPayload,
  env: MailEnv,
  recordId: string | null,
): Promise<void> {
  if (!env.EMAIL) {
    console.warn('No EMAIL binding, skipping both emails.');
    return;
  }

  const from = { email: site.mail.from, name: site.mail.fromName };
  const notify = notifyEmail(data, recordId);
  const reply = autoReplyEmail(data);

  const results = await Promise.allSettled([
    env.EMAIL.send({
      to: env.NOTIFY_EMAIL || site.contactEmail,
      from,
      // So a reply from the phone goes straight to the person who asked.
      replyTo: data.email,
      subject: notify.subject,
      text: notify.text,
      html: notify.html,
    }),
    env.EMAIL.send({
      to: data.email,
      from,
      replyTo: site.contactEmail,
      subject: reply.subject,
      text: reply.text,
      html: reply.html,
    }),
  ]);

  const labels = ['heads up to Saqib', 'auto reply to the requester'];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      // The row is already saved, so this never reaches the person.
      console.error(`Email failed (${labels[i]})`, result.reason);
    }
  });
}
