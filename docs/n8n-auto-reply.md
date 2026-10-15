# n8n auto reply email

The Pages Function posts every valid request to `N8N_WEBHOOK_URL` with the
header `x-webhook-secret` set to `N8N_WEBHOOK_SECRET`. Reject anything without
that header.

The payload is the cleaned form data plus `record_id`, the id of the row that
was just saved:

```json
{
  "full_name": "Jane Doe",
  "business_name": "Doe Coatings",
  "instagram": "doecoatings",
  "website": "https://doecoatings.com",
  "email": "jane@doecoatings.com",
  "phone": "+1 555 0100",
  "location": "Austin, TX",
  "years_in_business": "3 to 5",
  "services": ["Flake / chip", "Metallic"],
  "team_size": "2 to 5",
  "talk_about": "How we moved from residential to commercial work.",
  "biggest_challenge": "Hiring.",
  "heard_from": "Instagram",
  "utm_source": "",
  "utm_medium": "",
  "utm_campaign": "",
  "referrer": "https://www.instagram.com/",
  "record_id": "6f0d1e7a-..."
}
```

`first_name` is not sent. Take it in n8n with the first word of `full_name`.

## Workflow

1. **Webhook** node, POST, with header auth on `x-webhook-secret`.
2. **Notify Saqib**: email, Telegram or WhatsApp, with the name, business,
   handle, location and what they want to talk about.
3. **Send the auto reply** below to `email`.

## Auto reply

**Subject:** Got your interview request

**Body:**

> Hi {first_name},
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

## If n8n is down

Nothing breaks. The row is already saved in Supabase before the webhook is
called, and the person still sees the success message. The failure is logged in
the Pages Function logs, so check Supabase for rows that never got an email.
