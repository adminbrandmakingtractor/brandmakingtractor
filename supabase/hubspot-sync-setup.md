# Syncing Supabase leads/contacts → HubSpot + email notifications

This wires up `supabase/functions/hubspot-sync/index.ts` so that every new row
in `leads` or `contacts` automatically:
1. Creates (or updates) a contact in HubSpot, **and** logs that specific
   submission as a Note on the contact's timeline — so repeat submissions
   from the same email update the contact's headline info (name/phone) but
   never overwrite or lose earlier submissions; those stay visible in the
   timeline, and Supabase always keeps the full, permanent record of every
   submission regardless.
2. Emails the team — by default **partnerships@brandmakingtractor.com** and
   **admin.brandmakingtractor@gmail.com** — with the submission's details, via
   [Resend](https://resend.com).

Both the HubSpot token and the Resend API key live only on the server side
(as Edge Function secrets) — they're never exposed to the website's frontend
code. The two integrations are independent: if one fails, the other still
runs, so a submission is never silently lost either way.

## 1. Create a HubSpot Private App token

1. In HubSpot: **Settings (gear icon) → Integrations → Private Apps**.
2. Click **Create a private app**.
3. Name it something like "BrandMakingTracktor Website Sync".
4. Go to the **Scopes** tab → under **CRM**, enable:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
5. Click **Create app**, confirm, then **copy the Access Token** shown (starts with `pat-...`). You won't be able to see it again after leaving this screen — copy it now.

## 2. Deploy the Edge Function

Easiest path — directly in the Supabase Dashboard, no CLI install needed:

1. In Supabase: **Edge Functions** (left sidebar) → **Create a new function**.
2. Name it exactly: `hubspot-sync`
3. Paste in the entire contents of [`supabase/functions/hubspot-sync/index.ts`](functions/hubspot-sync/index.ts) from this project, replacing whatever template code is there.
4. Deploy it.

(If you prefer the CLI instead: `supabase functions deploy hubspot-sync --project-ref pxvlfsypycbfxabndfqm`.)

## 3. Add the HubSpot token as a secret

1. Still in **Edge Functions**, find **Secrets** (sometimes under a "Manage secrets" or settings button).
2. Add a new secret:
   - **Name**: `HUBSPOT_ACCESS_TOKEN`
   - **Value**: the `pat-...` token you copied in step 1.
3. Save.

## 3b. Set up email notifications (Resend — free plan: 3,000 emails/month)

1. Create a free account at [resend.com](https://resend.com) (sign up with
   `admin.brandmakingtractor@gmail.com` so step 2 works immediately).
2. **API Keys** (left sidebar) → **Create API Key** → copy the key (starts
   with `re_...`). You won't see it again after leaving the screen.
3. In Supabase: **Edge Functions → Secrets**, add:
   - **Name**: `RESEND_API_KEY`
   - **Value**: the key from step 2.
4. Redeploy the function (paste the latest [`index.ts`](functions/hubspot-sync/index.ts) content again — see step 2 above) so it picks up the Resend code path.

That's enough to start receiving mail — no domain setup required yet. By
default the function sends from Resend's shared `onboarding@resend.dev`
address, which Resend will only actually deliver to **the email you signed up
to Resend with**. So right now, submissions will email
`admin.brandmakingtractor@gmail.com` but **not** `partnerships@brandmakingtractor.com`
until you verify your domain:

5. (When ready) **Domains** → **Add Domain** → add `brandmakingtractor.com`
   and add the DNS records Resend gives you (in Hostinger's DNS settings).
6. Once verified, add one more secret so both inboxes get notified:
   - **Name**: `NOTIFY_FROM_EMAIL`
   - **Value**: `BrandMakingTractor <leads@brandmakingtractor.com>`

## 4. Create the Database Webhooks

You need one webhook per table (`leads` and `contacts`), both pointing at the same function.

1. In Supabase: **Database → Webhooks** → **Create a new webhook**.
2. First webhook:
   - **Name**: `leads-to-hubspot`
   - **Table**: `leads`
   - **Events**: check only **Insert**
   - **Type**: **Supabase Edge Functions** (if offered — it auto-fills the auth header for you) or **HTTP Request** pointing to `https://pxvlfsypycbfxabndfqm.supabase.co/functions/v1/hubspot-sync`
   - If it asks for HTTP headers manually, add: `Authorization: Bearer <your anon or service_role key>` (the Edge Function itself doesn't check this header, but Supabase's own gateway requires *some* valid Supabase key to let the request through unless you've disabled JWT verification for this function).
3. Repeat the same steps for a second webhook named `contacts-to-hubspot`, with **Table**: `contacts`.

## 5. (Optional) Capture service/budget/message too

By default, HubSpot only has standard fields (email, first/last name, phone). To also capture what service someone wants, their budget, or their message:

1. In HubSpot: **Settings → Properties → Contact properties → Create property**.
2. Create three single-line text properties with these **exact internal names**:
   - `service_interest`
   - `budget_range`
   - `message`

The function already sends these fields if the properties exist — if they don't exist yet, it automatically retries with just the standard fields so nothing breaks either way.

## 6. Test it

Submit a test entry through the real website's Get Started or Contact form
(or the 70%-scroll popup), then:
- Check **partnerships@brandmakingtractor.com** and **admin.brandmakingtractor@gmail.com** — a notification email should land within seconds.
- Check **HubSpot → Contacts** — the contact and a new Deal should appear.

If either doesn't show up, check **Supabase → Edge Functions → hubspot-sync → Logs** for the error (email and HubSpot failures are logged separately and don't block each other).
