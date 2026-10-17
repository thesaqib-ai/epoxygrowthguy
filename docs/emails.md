# The two emails

Both are sent from `src/lib/notify.ts` through Resend's REST API, straight from
the Pages Function. There is no n8n and no Zapier.

**Why Resend and not Cloudflare Email Sending.** The Cloudflare binding needed
no credential at all and was the first choice, but it is gated behind a paid
Workers plan. The Autosinq site hit exactly the same wall and moved to Resend,
and autosinq.com is already a verified sending domain there. Since this site
sends from `muhammad.saqib@autosinq.com`, it can reuse that verification: same
provider, same domain, same API key, **no DNS changes at all**. Autosinq's
`src/lib/email.ts` is the sibling of this module and they are deliberately
alike.

Free tier is 3,000 emails a month and 100 a day, shared across both sites. This
form would have to go properly viral to notice.

They go out after the row is saved and after the response has gone back to the
browser, so a mail outage can never turn a good request into an error on
screen. Failures land in the Pages Function logs.

## 1. Heads up to Saqib

- **To:** `NOTIFY_EMAIL`, which is set in Cloudflare rather than committed here.
  If it is missing, this falls back to the contact address in `src/config.ts`,
  which is also read, so a forgotten variable never loses a request.
- **Reply-To:** the person who sent the request, so hitting reply on your phone
  answers them directly instead of emailing yourself
- **Subject:** `Interview request: Jane Doe, Doe Coatings`

The body is every field they filled in, as a plain label and value list. Blank
fields are left out rather than shown empty, so a short request makes a short
email. The Supabase row id is at the bottom.

## 2. Auto reply to the person who asked

- **To:** them
- **Reply-To:** the contact address in `src/config.ts`
- **Subject:** Got your interview request

> Hi {first name},
>
> Thanks for reaching out about the Epoxy Growth Sessions. I've got your
> details and I'll look through them in the next 48 hours.
>
> If it's a fit, I'll contact you to arrange a time. The call takes about 15 to
> 20 minutes.
>
> Talk soon,
> Muhammad Saqib S.
> @epoxy_growth_guy

It deliberately promises nothing about *how* contact happens. No booking link,
no questions in advance. That keeps the reply honest whatever you decide to do
next, and leaves you free to change the process without the email going stale.

The first name is the first word of what they typed. If they only gave one
word, that word is used. If the name is somehow blank, it falls back to
"there", so no one ever gets "Hi ,".

Both emails go out as plain text and HTML together, which is what keeps them
out of spam folders.

## Setup

One secret, no DNS.

The `from` address is `muhammad.saqib@autosinq.com`, set in `src/config.ts`.
Resend verifies a whole **domain**, not individual addresses, and autosinq.com
is already verified from the Autosinq site. So any address on that domain can
send, and there is nothing to add to DNS for this project.

1. Get the key. Either copy `RESEND_API_KEY` from the Autosinq Pages project,
   or open <https://resend.com/api-keys> and create one with **Sending access**.
2. In the epoxygrowthguy Pages project go to **Settings**, then **Environment
   variables**, add `RESEND_API_KEY` under Production, and click **Encrypt**
   before saving.
3. Redeploy. Variables only reach builds that run after they are set.

### Set it in the dashboard, not from a script

`wrangler secret put RESEND_API_KEY` reads the value from stdin. Run from a
non-interactive shell it reads EOF, uploads an **empty string**, and still
prints "Success". The secret list then looks perfect while every send fails.
The code tells empty and missing apart in its logs for exactly this reason, but
using the dashboard avoids the trap entirely.

### What must never happen to autosinq.com

Do not enable Cloudflare Email **Routing** on autosinq.com. It replaces the MX
records, which currently point at `mx1.hostinger.com` and `mx2.hostinger.com`,
and that would silently kill the `muhammad.saqib@autosinq.com` mailbox. Nothing
in this project needs it.

The two existing SPF records are both correct and must be left alone:

| Name | Content | What it is |
|---|---|---|
| `autosinq.com` | `v=spf1 include:_spf.mail.hostinger.com ~all` | the mailboxes |
| `send.autosinq.com` | `v=spf1 include:amazonses.com ~all` | Resend's sending path |

Two SPF records only conflict when they sit on the **same** hostname. These are
on different names, so both are valid. Merging them would break one.

### Receiving

Nothing to set up. `muhammad.saqib@autosinq.com` is a real Hostinger mailbox,
so replies to the auto reply, and anything sent to the address in the footer,
land where mail is already read.

## Testing before launch

`wrangler pages dev` sends for real, because Resend is just an HTTPS call. Put
`RESEND_API_KEY` in `.dev.vars` and submit the form at
`http://127.0.0.1:8788`.

Use addresses you control. Bounces from made up addresses count against sender
reputation, so never test with `test@test.com`.

With no key set nothing sends, the request still saves, and the log says
whether the key was missing or empty.

## Swapping provider later

`deliver()` in `src/lib/notify.ts` is the only Resend specific function. The
two messages above it are provider agnostic. Changing provider means rewriting
that one function.

## If you ever want n8n back

An earlier build posted the payload to an n8n webhook instead. Everything that
would need changing lives in `src/lib/notify.ts` and the single `waitUntil`
call in `functions/api/request.ts`. Nothing else in the app knows how a request
gets announced.
