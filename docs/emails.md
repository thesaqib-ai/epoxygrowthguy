# The two emails

Both are sent from `src/lib/notify.ts` through the Cloudflare Email Sending
binding, straight from the Pages Function. There is no n8n, no Zapier and no
email API key to rotate.

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
> If it's a fit, I'll send you a link to pick a time. The call is relaxed,
> about 15 to 20 minutes, and I'll send you the questions before we record.
>
> Talk soon,
> Saqib
> @epoxy_growth_guy

The first name is the first word of what they typed. If they only gave one
word, that word is used. If the name is somehow blank, it falls back to
"there", so no one ever gets "Hi ,".

Both emails go out as plain text and HTML together, which is what keeps them
out of spam folders.

## Setup

The `from` address is `muhammad.saqib@autosinq.com`, set in `src/config.ts`.
So the domain to onboard is **autosinq.com**, not epoxygrowthguy.com. The
sending domain follows the from address, not the website.

### Read this before onboarding

autosinq.com already sends email. That makes this different from onboarding a
fresh domain, and getting it wrong damages mail you already rely on.

**A domain can only have one SPF record.** autosinq.com almost certainly has
one already, put there by whoever hosts the mailbox. If a second SPF TXT record
appears alongside it, the standard says both are invalid, and every email
autosinq.com sends starts failing SPF. Quotes and invoices land in spam, not
just these two emails.

So do not blindly accept an added record. Do this instead:

```bash
npx wrangler email sending enable autosinq.com
npx wrangler email sending dns get autosinq.com
```

Then open the DNS tab for autosinq.com and check the TXT records:

- **If there is now one SPF record,** nothing to do.
- **If there are two,** merge them. Take the `include:` value that Cloudflare
  added, paste it into the SPF record that was already there, and delete the
  one Cloudflare created. One record, both includes, for example
  `v=spf1 include:_spf.google.com include:<whatever Cloudflare listed> ~all`.
  Use the exact value from `dns get`, do not type it from memory.

DKIM is safe either way. It uses its own selector subdomain, so the new record
cannot collide with an existing one.

If autosinq.com has a DMARC record set to `quarantine` or `reject`, wait for
DNS to settle before the form goes live. Send a test to yourself first. A guest
whose confirmation lands in spam is a guest who thinks you ignored them.

### Verifying

```bash
npx wrangler email sending dns get autosinq.com
```

Sending from a domain you have not onboarded is rejected with
`E_SENDER_NOT_VERIFIED`, which is the whole point of DKIM.

### Receiving

Nothing to set up. `muhammad.saqib@autosinq.com` is already a real mailbox, so
replies to the auto reply and anything sent to the address in the footer land
where you already read mail.

## Testing before launch

`wrangler pages dev` does not send real mail. It writes each message to
`.wrangler/tmp/email/` instead, which is useful for reading exactly what would
have gone out.

To send for real, temporarily add `remote = true` under `[[send_email]]` in
`wrangler.toml`, submit the form at `http://127.0.0.1:8788` using addresses you
control, then take it out again before deploying.

Bounces from made up addresses count against your sender reputation, so do not
test with `test@test.com`.

## If you ever want n8n back

The earlier build posted the payload to an n8n webhook instead. Everything that
needs changing lives in `src/lib/notify.ts` and the one `waitUntil` call in
`functions/api/request.ts`. Nothing else in the app knows how a request gets
announced.
