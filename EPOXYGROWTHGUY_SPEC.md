# Build Spec: epoxygrowthguy.com

**For:** Claude Code
**Owner:** Muhammad Saqib (@epoxy_growth_guy)
**Goal:** A one-page site for the interview series. It does three jobs, in this order:

1. Shows who has already been on the series, so new guests want in.
2. Collects interview requests through a short form, instead of Instagram DMs.
3. Quietly points to Autosinq for anyone who wants to know what Saqib builds.

The page must feel like a show people want to be on. It must never feel like a sales funnel.

---

## 0. Rules for the build

- **Copy rule:** never use em dashes anywhere in the site copy. Use commas, full stops or "and".
- Keep language short, plain and warm. US English spelling.
- Every guest name, photo and reel must be easy to add or remove in one data file. No guest content hard-coded in components.
- **Only show guests who have agreed to be listed.** Saqib confirms each one before it goes live. Ship with placeholder data and an `approved: false` flag by default.

---

## 1. Stack

Use the same stack as autosinq.com so it is familiar:

| Part | Choice |
|---|---|
| Framework | Astro 5, static output |
| Styling | Tailwind CSS |
| Hosting | Cloudflare Pages |
| Form handling | Cloudflare Pages Function at `/api/request` |
| Storage | Supabase table `interview_requests` (Airtable is fine as an alternative, see section 7) |
| Automation | Pages Function forwards each valid request to an n8n webhook |
| Spam protection | Cloudflare Turnstile + hidden honeypot field |
| Analytics | Cloudflare Web Analytics (no cookie banner needed) |

No React unless a component truly needs it. The form can be plain HTML with a small script for the submit state.

JavaScript budget: under 30 KB on the page, excluding the Turnstile script.

---

## 2. Design direction

**Feel:** a premium show, not an agency site. Think podcast or talk show landing page.

- Dark background, high contrast. Near-black `#0B0B0C` base.
- One accent colour pulled from epoxy finishes: a warm metallic gold `#D4A84B`. Use it sparingly for buttons, highlights and the series name.
- Optional subtle texture behind the hero: a very faint metallic epoxy swirl image at low opacity. It must not hurt text contrast.
- Typography: a strong condensed display font for headings (for example "Anton" or "Bebas Neue" from Google Fonts) and a clean sans for body ("Inter").
- Big type, lots of space, very few words per section.
- Must look great on a phone first. Most visitors arrive from the Instagram bio.

Do **not** reuse the Autosinq logo or colours in the hero. This is Saqib's personal brand. Autosinq only appears in the small section near the bottom.

---

## 3. Page structure and copy

All copy below is final unless marked `[CONFIG]`. Keep `[CONFIG]` values in `src/config.ts` so they can change without touching components.

### 3.1 Top bar
- Left: "Epoxy Growth Guy" wordmark (text, no logo needed yet).
- Right: one button, "Request an interview", which scrolls to the form.
- Sticky on scroll, with a subtle blur background.

### 3.2 Hero

**Eyebrow:** `[CONFIG] seriesName` default: "THE EPOXY GROWTH SESSIONS"

**Headline:**
> Conversations with the people building the epoxy industry.

**Subheadline:**
> Short, honest interviews with installers, artists, suppliers and educators across the US, Canada, the UK and Australia.

**Buttons:**
- Primary: "Request an interview" (scrolls to form)
- Secondary: "Watch the interviews" (links to Instagram profile, opens in new tab)

**Under the buttons, a small line:**
> Hosted by Saqib · @epoxy_growth_guy

### 3.3 Guest wall (social proof)

**Heading:**
> Who's been on

**Layout:** grid of guest cards. 2 columns on mobile, 4 on desktop.

Each card shows:
- Round profile photo (or a clean initials avatar if no photo)
- Guest name
- Business name
- Location (city and state or country)
- Small Instagram handle that links to their profile

Show only guests where `approved: true`. If fewer than 4 are approved, hide the section entirely rather than showing a thin grid.

Below the grid, one line:
> And more coming every week.

### 3.4 Featured interviews

**Heading:**
> Watch a few

Show 3 or 4 featured reels as vertical 9:16 cards. Each card:
- Thumbnail image (stored locally in `/public/reels/`)
- Guest name and a short pull quote (one line)
- Play icon overlay
- Clicking opens the reel on Instagram in a new tab

**Do not use the official Instagram embed script.** It is heavy and slows the page. Use local thumbnails that link out.

### 3.5 What guests get

**Heading:**
> Why guests come on

Three short items, icon plus one line each:
1. **Your story, edited properly.** One relaxed call turns into several short reels.
2. **Posted on both profiles.** Every reel goes out as an Instagram collab, so it reaches your audience and mine.
3. **About 15 minutes of your time.** I handle the questions, editing and posting.

### 3.6 How it works

**Heading:**
> How it works

Three numbered steps:
1. **Request.** Fill out the short form below.
2. **Chat.** If it's a fit, I'll send you a time. We record a relaxed 15 to 20 minute video call.
3. **Go live.** I edit the reels, send them to you first, then we post them together.

### 3.7 Request form

**Heading:**
> Request an interview

**Intro line:**
> Tell me a little about you and your business. It takes about two minutes.

**Fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| Full name | text | yes | |
| Business name | text | yes | |
| Instagram handle | text | yes | Strip a leading "@" before saving |
| Website | url | no | |
| Email | email | yes | Used for the reply |
| Phone or WhatsApp | tel | no | |
| City and state or country | text | yes | |
| Years in business | select | yes | Less than 1, 1 to 3, 3 to 5, 5 to 10, 10+ |
| What do you do? | multi-select chips | yes | Flake / chip, Metallic, Polished concrete, Decorative or overlays, Commercial or industrial, Supply or products, Training or education, Other |
| Team size | select | yes | Just me, 2 to 5, 6 to 15, 16+ |
| What would you love to talk about? | textarea | yes | max 600 characters |
| What's the biggest challenge in your business right now? | textarea | no | max 600 characters |
| How did you hear about the series? | select | no | Instagram, A past guest, Facebook, Someone sent me, Other |

Hidden fields:
- Honeypot field named `company_website` (hidden with CSS, not `type="hidden"`). If filled, silently accept and discard.
- `utm_source`, `utm_medium`, `utm_campaign` captured from the URL if present.
- `referrer` from `document.referrer`.

**Submit button:**
> Send my request

**Line under the button:**
> I review every request personally and reply within 48 hours.

**Success state (replaces the form, no page reload):**
> Got it, thank you. I'll take a look and get back to you within 48 hours. Keep an eye on your email and Instagram DMs.

**Error state:**
> Something went wrong sending that. Please try again, or DM me on Instagram at @epoxy_growth_guy.

Validation rules:
- Client-side and server-side. Never trust the client alone.
- Inline error messages under each field in plain words, for example "Please add your business name."
- Keep entered values if submission fails.

### 3.8 What I build (Autosinq, kept quiet)

Small section, visually lighter than everything above it. No big headline.

**Heading (small):**
> Outside the interviews

**Body:**
> I also build AI phone systems for coating companies. They answer the calls you miss while you're on a job, qualify the homeowner and book the estimate into your calendar.

**Link:**
> See how it works at autosinq.com →

Link goes to `https://autosinq.com/?utm_source=epoxygrowthguy&utm_medium=referral&utm_campaign=site`.

### 3.9 Footer

- "Epoxy Growth Guy" wordmark
- Instagram link
- Email `[CONFIG] contactEmail`
- Small line: "© 2026 Muhammad Saqib"
- Link to a simple `/privacy` page (see section 9)

---

## 4. Guest and reel data

All guest and reel content lives in `src/data/guests.ts`. Example shape:

```ts
export type Guest = {
  slug: string;
  name: string;
  business: string;
  location: string;
  instagram: string;      // handle without @
  photo?: string;         // path in /public/guests/
  approved: boolean;      // only true guests are shown
  order: number;          // lower shows first
};

export type FeaturedReel = {
  guestSlug: string;
  quote: string;          // one short line
  thumbnail: string;      // path in /public/reels/
  url: string;            // Instagram reel URL
  approved: boolean;
};
```

Seed the file with these guests as **placeholders, all `approved: false`**. Saqib will flip each one to `true` after confirming:

| name | business | location | instagram |
|---|---|---|---|
| Christopher Land | Dallas Epoxy Guys | Dallas, TX | dallasepoxyguys |
| Don Resin | Don Resin Studios | Miami, FL | don_resin |
| Sam Serio | El Patron Resin | Australia | elpatron_resin |
| Eagle Kianes | Marbleous Creationz | `[confirm]` | marbleouscreationz_epoxy `[confirm]` |
| Lee Sartain | Ace High Concrete Supply | `[confirm]` | acehighconcrete |
| Garage Style | Garage Style Ltd | Hertfordshire, UK | garagestyleltd |
| Danny Carpenter | Mint Concrete Polishing | Gilbert, AZ | dannyjcarpenter |
| Sez | N&A Epoxy Flooring | Sydney, Australia | na_epoxy_floors |
| Jay | Limitless Epoxy Designs | Plainville, CT | jay_380_ |
| `[confirm]` | Superior Concrete Solutions | Alabama and Florida | `[confirm]` |
| `[confirm]` | Smooth Coatings | Southwest Virginia | smooth_coatings |
| `[confirm]` | Lone Wolf Coatings | `[confirm]` | lonewolfcoatings |

Any value marked `[confirm]` must render nothing (not the word "confirm") until Saqib fills it in.

Photos: Saqib will drop square images into `/public/guests/`, named by slug. Process them through Astro's `<Image>` for AVIF/WebP output at 160px and 320px.

---

## 5. Form submission flow

```
Browser form
   │  POST /api/request (JSON)
   ▼
Cloudflare Pages Function
   1. Verify Turnstile token (reject if invalid)
   2. If honeypot filled → return 200 OK, do nothing else
   3. Validate and clean every field server-side
   4. Rate limit: max 3 requests per IP per hour (use KV or a simple Durable Object)
   5. Insert row into Supabase `interview_requests`
   6. POST the same payload to the n8n webhook (fire and forget, with a 3 second timeout)
   7. Return { ok: true }
   ▼
n8n workflow (Saqib builds this side)
   a. Notify Saqib (email, Telegram or WhatsApp)
   b. Send the requester an automatic "Got it" email
```

If the n8n call fails, the request must still be saved in Supabase and the user must still see success. Log the failure.

Environment variables (Cloudflare Pages settings, never committed):

```
TURNSTILE_SECRET_KEY=
PUBLIC_TURNSTILE_SITE_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=        # sent as a header so n8n can reject anything else
```

The service role key is only ever used inside the Pages Function. Never expose it to the browser.

---

## 6. Database

Supabase table `interview_requests`:

```sql
create table interview_requests (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  full_name       text not null,
  business_name   text not null,
  instagram       text not null,
  website         text,
  email           text not null,
  phone           text,
  location        text not null,
  years_in_business text not null,
  services        text[] not null,
  team_size       text not null,
  talk_about      text not null,
  biggest_challenge text,
  heard_from      text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  referrer        text,
  status          text not null default 'requested',
    -- requested | approved | scheduled | recorded | posted | declined
  notes           text,
  recorded_at     timestamptz,
  posted_at       timestamptz,
  followup_due_at timestamptz
);

alter table interview_requests enable row level security;
-- No public policies. Only the service role (used by the Pages Function) can write.
```

Saqib manages statuses in the Supabase table editor for now. No admin dashboard needed in this build.

---

## 7. Airtable alternative

If Saqib prefers Airtable over Supabase, swap step 5 for an Airtable API insert into a base called "Epoxy Growth Sessions" with the same fields, plus a single-select `Status` field with the same values. Keep everything else identical. Build it so the storage target is one small module (`src/lib/store.ts`) that can be switched.

---

## 8. n8n auto-reply email (copy for Saqib)

Not built in this repo, but include this text in `docs/n8n-auto-reply.md` so it is ready:

**Subject:** Got your interview request

**Body:**
> Hi {first_name},
>
> Thanks for reaching out about the Epoxy Growth Sessions. I've got your details and I'll look through them in the next 48 hours.
>
> If it's a fit, I'll send you a link to pick a time. The call is relaxed, about 15 to 20 minutes, and I'll send you the questions before we record.
>
> Talk soon,
> Saqib
> @epoxy_growth_guy

---

## 9. Privacy page

Simple `/privacy` page in plain language:

- What is collected: the form fields above.
- Why: to review interview requests and contact the person about them.
- Where it is stored: Supabase (or Airtable), and processed through n8n.
- Nothing is sold or shared for marketing by others.
- How to ask for deletion: email `[CONFIG] contactEmail`.

---

## 10. SEO and sharing

- `<title>`: "The Epoxy Growth Sessions | Interviews with the people building the epoxy industry"
- Meta description: "Short, honest interviews with epoxy installers, artists, suppliers and educators. Hosted by Saqib, @epoxy_growth_guy. Request an interview."
- Open Graph image 1200×630: dark background, series name in gold, a row of 4 to 6 guest faces once approved. Until then, text only.
- Canonical `https://epoxygrowthguy.com/`
- `robots.txt` allowing all, plus `sitemap.xml`.

---

## 11. Motion

Keep it light:

- Sections fade up 16px on first view, 400ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
- Guest cards stagger 60ms.
- Buttons lift 1px on hover and scale to 0.98 on press.
- Respect `prefers-reduced-motion`: no movement at all when set.
- Nothing hides text until scroll. Content must be readable with JavaScript off.

---

## 12. Domain and deploy

- Domain `epoxygrowthguy.com` is already purchased. Add it as a custom domain in Cloudflare Pages.
- Redirect `www` to the apex domain.
- Force HTTPS.
- Preview deploys on every branch, production on `main`.

---

## 13. Build order

1. Astro project, Tailwind, fonts, colour tokens, `src/config.ts`.
2. Static page with all sections and placeholder data.
3. `guests.ts` data file and the guest wall and reels components.
4. Form markup, client validation, success and error states.
5. Pages Function: Turnstile, honeypot, validation, rate limit.
6. Supabase insert.
7. n8n webhook call.
8. Privacy page, SEO, OG image, sitemap.
9. Motion pass.
10. Deploy to Cloudflare Pages with the custom domain.

---

## 14. Done checklist

- [ ] Lighthouse mobile: Performance 95+, Accessibility 100, Best Practices 100, SEO 100
- [ ] No em dashes anywhere in the site copy
- [ ] Form submits successfully on iPhone Safari and Android Chrome
- [ ] Honeypot submission returns success but saves nothing
- [ ] Invalid Turnstile token is rejected
- [ ] 4th request from the same IP within an hour is rejected with a friendly message
- [ ] Row appears in Supabase with correct fields and `status = requested`
- [ ] n8n receives the payload with the secret header
- [ ] If n8n is down, the row still saves and the user still sees success
- [ ] Guests with `approved: false` never appear
- [ ] Guest wall hides itself when fewer than 4 guests are approved
- [ ] Autosinq link carries the UTM parameters
- [ ] Page works with JavaScript disabled (form shows a message to DM on Instagram instead)
- [ ] `prefers-reduced-motion` removes all movement
- [ ] `www` redirects to apex, HTTPS forced
