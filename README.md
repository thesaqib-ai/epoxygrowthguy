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
node scripts/stub-server.mjs     # fake Supabase and n8n for local testing
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
   1. Verify the Turnstile token
   2. Honeypot filled, return 200 and save nothing
   3. Validate and clean every field again, server side
   4. Rate limit, 3 per IP per hour, in KV
   5. Insert the row (src/lib/store.ts)
   6. POST to the n8n webhook, fire and forget, 3 second timeout
   7. Return { ok: true }
   v
n8n (built outside this repo, see docs/n8n-auto-reply.md)
```

If n8n is down the row is still saved and the person still sees success. The
failure goes to the Pages Function logs.

### Storage

Supabase by default. Run `docs/supabase.sql` once in the SQL editor. The
service role key is only ever used inside the Pages Function.

To use Airtable instead, set `STORE_TARGET=airtable` and fill in
`AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID` and `AIRTABLE_TABLE`. The base needs the
same fields plus a single select `Status`. Nothing else changes, the swap lives
entirely in `src/lib/store.ts`.

## Deploying

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
   | `N8N_WEBHOOK_URL` | secret | |
   | `N8N_WEBHOOK_SECRET` | secret | sent as `x-webhook-secret` |
   | `STORE_TARGET` | plain | `supabase` or `airtable` |

4. Add `epoxygrowthguy.com` as a custom domain, and `www.epoxygrowthguy.com`
   too. HTTPS is forced by Cloudflare.
5. Send `www` to the apex with a Redirect Rule on the zone
   (Rules, Redirect Rules, single redirect): when hostname equals
   `www.epoxygrowthguy.com`, a 301 to
   `https://epoxygrowthguy.com` with the path and query preserved.
   `_redirects` cannot do this, it only accepts relative paths.
6. Turn on Web Analytics for the Pages project. Cloudflare injects the beacon,
   there is nothing to add to the code and no cookie banner is needed.

## Things worth knowing

- JavaScript on the page is about 5 KB, well under the 30 KB budget. The
  Turnstile script is loaded separately and only when a site key is set.
- With JavaScript off, the whole page still reads and the form is replaced by a
  short message pointing at Instagram and email.
- `prefers-reduced-motion` removes every bit of movement.
- Fonts are self hosted, so there is no third party request on first paint.
