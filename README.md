# epoxygrowthguy.com

A one page site for The Epoxy Growth Sessions. It shows who has been on the
series, takes interview requests through a short form instead of Instagram DMs,
and quietly points to Autosinq near the bottom.

Astro 5 (static) + Tailwind 4, hosted on Cloudflare Pages, with one Pages
Function at `/api/request`.

## Run it locally

```bash
npm install
npm run dev          # the site on http://localhost:4321
```

The form needs the Pages Function, which `astro dev` does not run. To work on
the form end to end:

```bash
npm run build
npx wrangler pages dev      # the whole thing on http://127.0.0.1:8788
```

Put local secrets in `.dev.vars` (gitignored). See `.env.example` for the list.
With no `TURNSTILE_SECRET_KEY` set, the function skips the bot check and logs a
warning, which is what you want locally.

### Useful scripts

```bash
node scripts/make-images.mjs     # regenerate favicon png and the OG image
FACES=1 node scripts/make-images.mjs   # same, with a row of guest faces
node scripts/stub-server.mjs     # fake Supabase for local testing
```

## Adding a guest

Everything lives in `src/data/guests.ts`. No guest content is in any component.

1. Add or edit the row.
2. Drop a square photo in `src/assets/guests/` and set `photo` to the file name.
   No photo is fine, the card falls back to clean initials.
3. Set `approved: true` once that person has agreed to be listed.

Anything still unconfirmed stays an empty string and renders nothing at all.

The guest wall hides itself entirely until at least four guests are approved
(`site.minApprovedGuests` in `src/config.ts`). The same goes for the reels
section: it only appears when there is something approved to show.

Reel thumbnails work the same way, from `src/assets/reels/`. There is no
Instagram embed script anywhere. The cards are local images that link out.

> Photos live under `src/assets/` rather than `/public/` because only files
> inside `src` can go through Astro's image pipeline, which is what produces
> the AVIF and WebP output at 160px and 320px.

## Copy

All `[CONFIG]` values are in `src/config.ts`. The form fields, their options
and their validation rules are in `src/lib/form-schema.ts`, which the page,
the browser and the Pages Function all share, so the three can never drift.

House rule: no em dashes anywhere in the copy. Commas, full stops or "and".

## How a request flows

```
Browser form
   |  POST /api/request (JSON)
   v
functions/api/request.ts
   1. Check the Turnstile token, advisory only, never blocks
   2. Honeypot filled, return 200 and save nothing
   3. Validate and clean every field again, server side
   4. Rate limit, 3 per IP per hour, in KV
   5. Insert the row (src/lib/store.ts)
   6. Email Saqib and auto reply to the requester (src/lib/notify.ts)
   7. Return { ok: true }
```

Step 6 runs after the response has already gone back to the browser, so a mail
outage cannot turn a saved request into an error on screen. Failures go to the
Pages Function logs. See `docs/emails.md` for both emails and the one time
domain setup.

### Storage

Supabase by default. Run `docs/supabase.sql` once in the SQL editor. The
service role key is only ever used inside the Pages Function.

To use Airtable instead, set `STORE_TARGET=airtable` and fill in
`AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID` and `AIRTABLE_TABLE`. The base needs the
same fields plus a single select `Status`. Nothing else changes, the swap lives
entirely in `src/lib/store.ts`.

## Deploying

**Setting this up for the first time? Follow `docs/launch-checklist.md`.** It
walks through every step with the exact clicks and values. The summary below is
for when you already know the shape of it.

1. Push to GitHub and connect the repo in Cloudflare Pages.
   - Build command: `npm run build`
   - Output directory: `dist`
   - Production branch: `main`. Every other branch gets a preview deploy.
2. Create the KV namespace for the rate limit and paste the ids into
   `wrangler.toml`:
   ```bash
   npx wrangler kv namespace create RATE_LIMIT
   npx wrangler kv namespace create RATE_LIMIT --preview
   ```
3. Add the variables in the Pages project settings:

   | Name | Where | Notes |
   |---|---|---|
   | `PUBLIC_TURNSTILE_SITE_KEY` | build time | safe to expose |
   | `TURNSTILE_SECRET_KEY` | secret | |
   | `SUPABASE_URL` | secret | |
   | `SUPABASE_SERVICE_ROLE_KEY` | secret | never goes near the browser |
   | `RESEND_API_KEY` | secret | same key as the Autosinq site |
   | `NOTIFY_EMAIL` | secret | where the heads up lands, keeps a personal inbox out of the repo |
   | `STORE_TARGET` | plain | `supabase` or `airtable` |

4. Add `RESEND_API_KEY`, the same key the Autosinq site uses. Email goes
   through Resend because Cloudflare Email Sending needs a paid Workers plan,
   and autosinq.com is already a verified sending domain there, so there is no
   DNS to change. See `docs/emails.md`.
5. Add `epoxygrowthguy.com` as a custom domain, and `www.epoxygrowthguy.com`
   too. HTTPS is forced by Cloudflare.
6. Send `www` to the apex with a Redirect Rule on the zone
   (Rules, Redirect Rules, single redirect): when hostname equals
   `www.epoxygrowthguy.com`, a 301 to
   `https://epoxygrowthguy.com` with the path and query preserved.
   `_redirects` cannot do this, it only accepts relative paths.
7. Turn on Web Analytics for the Pages project. Cloudflare injects the beacon,
   there is nothing to add to the code and no cookie banner is needed.

### Spam protection, and why Turnstile does not block

Three layers, and only two of them are gates:

| Layer | Blocks? | What it does |
|---|---|---|
| Honeypot | **yes** | a hidden field. Filled in means a bot. Returns 200 and saves nothing, so the bot never learns |
| Rate limit | **yes** | 3 per IP per hour, in KV. Per visitor, never a cap on what you receive |
| Turnstile | no | records what it thought, and says so in the notification email |

Turnstile is deliberately advisory. It fails for reasons that have nothing to
do with bots: a hostname missing from the widget config, an ad blocker, a
corporate proxy, or a token that quietly expired while someone filled the form
in slowly. Every one of those used to show a real person a red error and lose
the request. A blocked guest costs far more than a spam row that takes two
seconds to delete, and every request is read by hand anyway.

When a request arrives without a clean check, the notification email says so
near the top, so it can be judged rather than silently trusted.

## Things worth knowing

- JavaScript on the page is about 5 KB, well under the 30 KB budget. The
  Turnstile script is loaded separately and only when a site key is set.
- With JavaScript off, the whole page still reads and the form is replaced by a
  short message pointing at Instagram and email.
- `prefers-reduced-motion` removes every bit of movement.
- Fonts are self hosted, so there is no third party request on first paint.
