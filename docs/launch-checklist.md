# Launch checklist

Everything still standing between the repo and a working site, in the order it
has to happen. Each step says exactly what to click, what to paste, and what
you should see when it worked.

Total time is about 40 minutes, most of it waiting for DNS.

Do them in order. Step D depends on B, and step H depends on all of them.

---

## A. Create the Supabase table

About 5 minutes.

1. Go to <https://supabase.com/dashboard> and open your project. If you have
   not made one yet, click **New project**, name it `epoxygrowthguy`, pick the
   region closest to you, and save the database password somewhere. You will
   not need that password for this site, but you will want it later.
2. In the left sidebar click **SQL Editor**.
3. Click **New query** at the top.
4. Open `docs/supabase.sql` from this repo, copy the whole file, and paste it
   into the editor.
5. Click **Run**, or press `Ctrl+Enter`.

**You should see:** "Success. No rows returned" in the results panel below.

6. Click **Table Editor** in the left sidebar and select `interview_requests`.

**You should see:** an empty table with columns `id`, `created_at`,
`full_name`, through to `followup_due_at`, and a label near the table name
reading **RLS enabled** with no policies listed.

That badge matters. No policies means the public anon key cannot read or write
this table at all. Only the service role key, which lives in the Pages Function
and never reaches a browser, can insert. If you ever see "RLS disabled" here,
stop and re-run the `alter table` line from the SQL file.

### Get the two values the site needs

7. Click the **gear icon** (Project Settings) at the bottom of the left
   sidebar, then **API** in the settings menu. On newer dashboards this may be
   called **API Keys**.
8. Copy **Project URL**. It looks like `https://abcdefghijkl.supabase.co`.
   Keep it for step E, where it becomes `SUPABASE_URL`.
9. Find **service_role** under Project API keys. Click **Reveal**, then copy
   it. It is a long string starting `eyJ`. Keep it for step E, where it becomes
   `SUPABASE_SERVICE_ROLE_KEY`.

**Careful with that second one.** The service role key bypasses row level
security completely. It goes into Cloudflare as an encrypted variable and
nowhere else. Never put it in a file in this repo, never paste it into a
browser console, and never use it in any front end code.

---

## B. Create the KV namespace for rate limiting

About 2 minutes. This is what stops someone submitting the form a hundred
times.

1. In this Claude Code session, run both of these. The `!` prefix runs them in
   your shell so you see the output here:

   ```
   ! npx wrangler kv namespace create RATE_LIMIT
   ```

   ```
   ! npx wrangler kv namespace create RATE_LIMIT --preview
   ```

2. If this is your first wrangler command, a browser window opens asking you to
   authorize Wrangler against your Cloudflare account. Click **Allow**.

**You should see** output from each command containing an id, like:

```
🌀 Creating namespace with title "epoxygrowthguy-RATE_LIMIT"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{
  "binding": "RATE_LIMIT",
  "id": "9f8e7d6c5b4a3210fedcba9876543210"
}
```

3. Paste both outputs into the chat and I will put the ids into
   `wrangler.toml` and commit them. Or edit it yourself: open `wrangler.toml`,
   find the `[[kv_namespaces]]` block, and replace
   `replace-with-your-kv-namespace-id` with the id from the first command and
   `replace-with-your-preview-kv-namespace-id` with the id from the second.

These ids are not secret. They are safe to commit, which is why they live in
the file rather than in the dashboard.

---

## C. Get the Resend API key

About 2 minutes. **No DNS to change.**

Email goes through Resend, the same provider the Autosinq site uses. Cloudflare
Email Sending was the first choice but it needs a paid Workers plan. Resend
verifies a whole domain, autosinq.com is already verified there, and this site
sends from `muhammad.saqib@autosinq.com`. So the verification is already done.

### Steps

1. Open <https://resend.com/api-keys> and sign in with the account that has
   autosinq.com on it.
2. Either copy the existing key the Autosinq site uses, or click **Create API
   Key**, name it `epoxygrowthguy`, give it **Sending access**, and copy the
   value. It starts `re_`.
3. Keep it for step E, where it becomes `RESEND_API_KEY`.

Alternatively, copy it from the Autosinq Pages project under **Settings** then
**Environment variables**, if it is readable there.

4. Confirm the domain is verified. Open <https://resend.com/domains>.

**You should see** `autosinq.com` listed as **Verified**. If it is not, stop
and tell me, because nothing will send until it is.

### Do not touch autosinq.com's DNS

Nothing in this project needs a DNS change, and two things would actively break
if you made one:

- **Never enable Cloudflare Email Routing on autosinq.com.** It replaces the MX
  records, which point at `mx1.hostinger.com` and `mx2.hostinger.com`, and that
  would silently kill the `muhammad.saqib@autosinq.com` mailbox.
- **Never merge the two SPF records.** `autosinq.com` carries the Hostinger
  include for the mailboxes, `send.autosinq.com` carries the Amazon SES include
  for Resend's sending path. They are on different hostnames, so both are
  valid. Merging them would break one.

---

## D. Connect the repo to Cloudflare Pages

About 5 minutes.

1. Go to <https://dash.cloudflare.com> and pick your account.
2. In the left sidebar click **Workers & Pages**.
3. Click **Create**, then the **Pages** tab, then **Connect to Git**.
4. Authorize Cloudflare against GitHub if it asks. Grant it access to the
   `thesaqib-ai/epoxygrowthguy` repository. Granting access to just that one
   repo is enough and is the better choice.
5. Select **epoxygrowthguy** from the list and click **Begin setup**.
6. Fill in the build settings:

   | Field | Value |
   |---|---|
   | Project name | `epoxygrowthguy` |
   | Production branch | `main` |
   | Framework preset | `Astro` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | leave blank |

7. Expand **Environment variables (advanced)** and add this one now, because
   the very first build needs it:

   | Name | Value |
   |---|---|
   | `PUBLIC_TURNSTILE_SITE_KEY` | your Turnstile **site** key |

   Add it as a **plain text** variable, not encrypted. It is a public value
   that gets written into the HTML, so there is nothing to protect, and
   plaintext removes any doubt about whether the build can read it.

8. Click **Save and Deploy**.

**You should see** a build log that ends with `Success: Assets published!` and
a URL like `https://epoxygrowthguy.pages.dev`.

9. Open that URL.

**You should see** the full page: hero, all twelve guests, the form, the
footer. The form will not submit successfully yet. That is step E.

---

## E. Add the rest of the variables

About 5 minutes.

1. In your Pages project click **Settings**, then **Environment variables**.
2. Make sure you are adding to **Production**. Add each of these with
   **Add variable**:

   | Name | Value | Type |
   |---|---|---|
   | `PUBLIC_TURNSTILE_SITE_KEY` | your Turnstile site key | plain text |
   | `TURNSTILE_SECRET_KEY` | your Turnstile secret key | **encrypt** |
   | `SUPABASE_URL` | the project URL from step A8 | plain text |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service role key from step A9 | **encrypt** |
   | `RESEND_API_KEY` | the key from step C, starts `re_` | **encrypt** |
   | `NOTIFY_EMAIL` | your personal inbox, the gmail one | **encrypt** |

   `YOUR-PERSONAL-INBOX` is written out rather than spelled in this file
   because the repo is public and harvesters scrape addresses out of GitHub.
   The real value is already in `.dev.vars` locally, which git ignores.

   Click the **Encrypt** button on the three marked rows before saving. Once
   encrypted a value cannot be read back, only replaced, which is the point.

   `STORE_TARGET` is already set in `wrangler.toml` and does not need adding
   here.

3. Repeat the same five for the **Preview** environment if you want branch
   deploys to work. You can point preview at the same Supabase project, or make
   a second one so test submissions do not mix with real ones.
4. Click **Save**.
5. Go to **Deployments**, find the most recent one, click the three dots on the
   right and choose **Retry deployment**. Variables only take effect on a build
   that runs after they are set.

**You should see** a new successful build.

---

## F. Custom domain and the www redirect

About 5 minutes, plus DNS.

1. In the Pages project click **Custom domains**, then **Set up a custom
   domain**.
2. Enter `epoxygrowthguy.com` and click **Continue**, then **Activate domain**.
3. Do the same again for `www.epoxygrowthguy.com`.

**You should see** both listed as **Active** within a few minutes.

Cloudflare forces HTTPS automatically. There is nothing to switch on.

### Send www to the apex

`_redirects` cannot do this, because Cloudflare Pages only accepts relative
paths there. It needs a rule on the zone instead.

4. Go back to the account home, select the **epoxygrowthguy.com** zone.
5. In the left sidebar click **Rules**, then **Redirect Rules**.
6. Click **Create rule**, then **Single Redirect**.
7. Name it `www to apex`.
8. Under **If incoming requests match**, choose **Custom filter expression**:
   - Field: **Hostname**
   - Operator: **equals**
   - Value: `www.epoxygrowthguy.com`
9. Under **Then**:
   - Type: **Dynamic**
   - Expression: `concat("https://epoxygrowthguy.com", http.request.uri.path)`
   - Status code: **301**
   - Tick **Preserve query string**
10. Click **Deploy**.

**You should see:** visiting `https://www.epoxygrowthguy.com/privacy` land on
`https://epoxygrowthguy.com/privacy` with the path intact.

---

## G. Turn on Web Analytics

About 1 minute.

1. In the Pages project click **Settings**, then find **Web Analytics**.
2. Click **Enable**.

Cloudflare injects the beacon itself. There is nothing to add to the code, it
sets no cookies, and it needs no cookie banner.

---

## H. Test the whole thing end to end

Do this on your phone, because that is where almost every visitor will be,
arriving from your Instagram bio.

1. Open `https://epoxygrowthguy.com` on your phone.
2. Scroll to the form and fill it in with your own real details. Use an email
   address you can actually open.
3. Submit.

**You should see** the form replaced, without the page reloading, by:

> Got it, thank you. I'll take a look and get back to you within 48 hours.

Now confirm all four things that should have happened:

4. **The row saved.** Supabase > Table Editor > `interview_requests`. One row,
   with `status` reading `requested`, your Instagram handle stored without the
   `@`, and your email in lowercase.
5. **You were told.** Check `YOUR-PERSONAL-INBOX` for a message with the
   subject `Interview request: <your name>, <your business>`. Hit reply on it.
   The To field should be the email **you typed into the form**, not your own
   address. That is the reply-to doing its job.
6. **They were told.** Check the inbox you used in the form for
   `Got your interview request`. Check the spam folder too. If it is in spam,
   go back to step C6.
7. **The bot checks work.** Submit the form three more times. The fourth
   attempt within the hour should be refused with:

   > You have sent a few requests already. Give it an hour and try again.

8. Delete your test rows from the Supabase table when you are done.

---

## If something does not work

**The form says "That security check did not pass."**
The Turnstile keys are mismatched or the site key never reached the build. View
source on the live page and search for `cf-turnstile`. If it is missing, the
site key was not present at build time: check it is set as plain text in
Production, then retry the deployment. If it is present, the secret key in
Cloudflare does not match the widget the site key came from.

**The form says "Something went wrong sending that."**
Supabase rejected the insert. Pages project > **Functions** > **Logs**, submit
again, and read the error. Most likely the service role key is wrong, or the
SQL in step A never ran.

**The row saves but no email arrives.**
Sending is not working but the site is fine, which is exactly how it was
designed to fail. Check the Functions logs for a line starting `Email send
failed`. Resend says why in plain words in that line: "domain is not verified"
means autosinq.com needs checking at <https://resend.com/domains>, and a 401
means the key is wrong. A line saying `RESEND_API_KEY is EMPTY` means the
secret was uploaded as a blank string, so set it again through the dashboard
rather than a script. Nothing is lost either way, the requests are all in
Supabase.

**A guest's card looks half empty.**
That guest is missing details in `src/data/guests.ts`. Blank fields render as
nothing on purpose. Send me the values and I will fill them in.
