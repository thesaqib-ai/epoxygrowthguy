# The two emails

Both are sent from `src/lib/notify.ts` through the Cloudflare Email Sending
binding, straight from the Pages Function. There is no n8n, no Zapier and no
email API key to rotate.

They go out after the row is saved and after the response has gone back to the
browser, so a mail outage can never turn a good request into an error on
screen. Failures land in the Pages Function logs.

## 1. Heads up to Saqib

- **To:** `NOTIFY_EMAIL`, or the contact address in `src/config.ts` if that
  variable is not set
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

One command, once, before the first send:

```bash
npx wrangler email sending enable epoxygrowthguy.com
```

That adds the SPF and DKIM records to the zone. They usually take five to
fifteen minutes. Check them with:

```bash
npx wrangler email sending dns get epoxygrowthguy.com
```

The `from` address is `requests@epoxygrowthguy.com`, set in `src/config.ts`.
It has to stay on the onboarded domain. Sending from gmail.com or any domain
you do not control is rejected, which is the whole point of DKIM.

### Receiving replies at that address

Sending and receiving are separate. If you want mail sent to
`requests@epoxygrowthguy.com` or the contact address to reach an inbox you
actually read, turn on Email Routing for the domain and forward it:

```bash
npx wrangler email routing enable epoxygrowthguy.com
npx wrangler email routing addresses create you@gmail.com
```

Then add a rule pointing the address at your verified destination. Until you
do that, replies to the contact address go nowhere.

## Testing before launch

`wrangler pages dev` does not send real mail unless the binding is marked
remote. To send genuinely, temporarily add `remote = true` under
`[[send_email]]` in `wrangler.toml`, submit the form at
`http://127.0.0.1:8788`, and use addresses you control. Take it out again
before deploying.

Bounces from made up addresses count against your sender reputation, so do not
test with `test@test.com`.

## If you ever want n8n back

The earlier build posted the payload to an n8n webhook instead. Everything that
needs changing lives in `src/lib/notify.ts` and the one `waitUntil` call in
`functions/api/request.ts`. Nothing else in the app knows how a request gets
announced.
