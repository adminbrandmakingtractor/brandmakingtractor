/**
 * BrandMakingTracktor — Supabase Edge Function: sync new leads/contacts to HubSpot
 * and email the team a notification. (Kept in the `hubspot-sync` function/name
 * so the Database Webhooks already wired up in Supabase don't need to change —
 * see supabase/hubspot-sync-setup.md.)
 *
 * Triggered by a Supabase Database Webhook on INSERT into `public.leads` and
 * `public.contacts`. For every single submission it:
 *   1. Creates or updates a HubSpot Contact (one per email — HubSpot enforces
 *      this) so the person's latest name/phone is always current.
 *   2. Creates a brand-new HubSpot Deal for THIS submission, associated with
 *      that contact. Deals are never deduplicated — every form-fill gets its
 *      own card in HubSpot regardless of repeat emails, so nothing is ever
 *      merged away. Mark a deal won/lost or delete it in HubSpot to triage
 *      valid vs. invalid leads yourself; Supabase keeps the full permanent
 *      record of every submission either way.
 *   3. Emails the team (partnerships@brandmakingtractor.com and
 *      admin.brandmakingtractor@gmail.com by default) via Resend so a new
 *      lead/contact is never missed even before anyone checks HubSpot.
 *
 * Required secrets (Edge Functions > Secrets):
 *   HUBSPOT_ACCESS_TOKEN — a HubSpot Private App token with
 *     crm.objects.contacts.read/write and crm.objects.deals.read/write scopes.
 *   RESEND_API_KEY — a Resend API key used to send the notification email.
 *
 * Optional secrets:
 *   NOTIFY_TO_EMAILS — comma-separated override for the notification
 *     recipients (default: partnerships@brandmakingtractor.com,
 *     admin.brandmakingtractor@gmail.com).
 *   NOTIFY_FROM_EMAIL — the "from" address. Defaults to Resend's shared
 *     onboarding@resend.dev sender, which works immediately with no domain
 *     setup, but Resend only delivers mail from that address to the email
 *     you signed up to Resend with. Once brandmakingtractor.com is verified
 *     in Resend (Domains tab), set this to e.g.
 *     "BrandMakingTracktor <leads@brandmakingtractor.com>" to notify both
 *     real team inboxes.
 */

const HUBSPOT_TOKEN = Deno.env.get("HUBSPOT_ACCESS_TOKEN");
const CONTACTS_API = "https://api.hubapi.com/crm/v3/objects/contacts";
const DEALS_API = "https://api.hubapi.com/crm/v3/objects/deals";
const DEAL_TO_CONTACT_ASSOCIATION_TYPE_ID = 3; // HubSpot-defined default

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_API = "https://api.resend.com/emails";
const NOTIFY_TO_EMAILS = (Deno.env.get("NOTIFY_TO_EMAILS") || "partnerships@brandmakingtractor.com,admin.brandmakingtractor@gmail.com")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const NOTIFY_FROM_EMAIL = Deno.env.get("NOTIFY_FROM_EMAIL") || "BrandMakingTracktor <onboarding@resend.dev>";

function escapeHtml(value: string) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

/** Best-effort — a failed email never blocks HubSpot sync or the response. */
async function sendLeadNotificationEmail(table: "leads" | "contacts", record: Record<string, any>) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email notification");
    return;
  }

  const kind = table === "leads" ? "New Get Started Lead" : "New Contact Message";
  const subject = `${kind}: ${record.name || record.email}${record.service ? " — " + record.service : ""}`;

  const rows: Array<[string, string | null | undefined]> = [
    ["Name", record.name],
    ["Email", record.email],
    ["Phone", record.phone],
    ["Company", record.company],
    ["Service", record.service],
    ["Budget", record.budget],
    ["Message", record.message || record.project_description],
    ["Source", [record.source, record.medium].filter(Boolean).join(" / ")]
  ].filter(([, v]) => v);

  const htmlRows = rows
    .map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#64748b;font-weight:600;">${escapeHtml(label)}</td><td style="padding:4px 0;">${escapeHtml(String(value))}</td></tr>`)
    .join("");

  const html = `<h2 style="margin:0 0 12px;">${escapeHtml(kind)}</h2><table cellpadding="0" cellspacing="0">${htmlRows}</table>`;

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: NOTIFY_FROM_EMAIL,
      to: NOTIFY_TO_EMAILS,
      subject,
      html
    })
  });

  if (!res.ok) {
    console.error("Email notification failed:", res.status, await res.text());
  }
}

function splitName(fullName: string) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstname: parts[0] || "",
    lastname: parts.slice(1).join(" ") || ""
  };
}

function hubspotHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${HUBSPOT_TOKEN}`
  };
}

async function createContact(properties: Record<string, string>) {
  return fetch(CONTACTS_API, {
    method: "POST",
    headers: hubspotHeaders(),
    body: JSON.stringify({ properties })
  });
}

async function updateContactByEmail(email: string, properties: Record<string, string>) {
  const url = `${CONTACTS_API}/${encodeURIComponent(email)}?idProperty=email`;
  return fetch(url, {
    method: "PATCH",
    headers: hubspotHeaders(),
    body: JSON.stringify({ properties })
  });
}

/** Create-or-update a contact; returns { ok, contactId }. Never fatal for the sync. */
async function upsertContact(properties: Record<string, string>) {
  let res = await createContact(properties);

  if (res.status === 409) {
    res = await updateContactByEmail(properties.email, properties);
  }
  if (!res.ok) {
    return { ok: false, contactId: null as string | null };
  }
  const data = await res.json();
  return { ok: true, contactId: data.id as string };
}

function buildDescription(table: string, record: Record<string, any>) {
  const lines: string[] = [];
  if (record.service) lines.push(`Service: ${record.service}`);
  if (record.budget) lines.push(`Budget: ${record.budget}`);
  if (record.company) lines.push(`Company: ${record.company}`);
  if (record.website) lines.push(`Website: ${record.website}`);
  if (record.timeline) lines.push(`Timeline: ${record.timeline}`);
  if (record.preferred_contact_method) lines.push(`Preferred contact: ${record.preferred_contact_method}`);
  if (record.message) lines.push(`Message: ${record.message}`);
  if (record.project_description) lines.push(`Project description: ${record.project_description}`);
  if (record.source) lines.push(`Source: ${record.source}${record.medium ? " / " + record.medium : ""}`);
  lines.push(`Email: ${record.email}`);
  lines.push(`Phone: ${record.phone || "-"}`);
  return lines.join("\n");
}

/** Creates one new Deal for this submission — never merged, never overwritten. */
async function createSubmissionDeal(contactId: string | null, table: string, record: Record<string, any>) {
  const dealName = `${table === "leads" ? "Get Started" : "Contact form"} — ${record.name || record.email} — ${new Date().toLocaleDateString("en-GB")}`;

  const body: Record<string, any> = {
    properties: {
      dealname: dealName,
      description: buildDescription(table, record)
    }
  };

  if (contactId) {
    body.associations = [
      {
        to: { id: contactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: DEAL_TO_CONTACT_ASSOCIATION_TYPE_ID }]
      }
    ];
  }

  const res = await fetch(DEALS_API, {
    method: "POST",
    headers: hubspotHeaders(),
    body: JSON.stringify(body)
  });

  return res;
}

Deno.serve(async (req: Request) => {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { type, table, record } = payload || {};

  if (type !== "INSERT" || !record) {
    return new Response("Ignored (not an insert)", { status: 200 });
  }
  if (table !== "leads" && table !== "contacts") {
    return new Response("Ignored (unrelated table)", { status: 200 });
  }
  if (!record.email) {
    return new Response("Ignored (no email)", { status: 200 });
  }

  // Email notification and HubSpot sync are independent — one failing must
  // never stop or hide the other, so every submission still reaches the team.
  const emailResult = await sendLeadNotificationEmail(table, record).then(
    () => ({ ok: true }),
    (err) => {
      console.error("Email notification exception:", err);
      return { ok: false, error: String(err) };
    }
  );

  if (!HUBSPOT_TOKEN) {
    console.warn("HUBSPOT_ACCESS_TOKEN not set — skipping HubSpot sync");
    return new Response(JSON.stringify({ email: emailResult, hubspot: "skipped (no token)" }), { status: 200 });
  }

  const { firstname, lastname } = splitName(record.name);

  try {
    // Keep the Contact's identity current (best-effort — a deal is still
    // created below even if this fails, so no submission is ever lost).
    const contactResult = await upsertContact({
      email: record.email,
      firstname,
      lastname,
      phone: record.phone || ""
    });

    const dealRes = await createSubmissionDeal(contactResult.contactId, table, record);

    if (!dealRes.ok) {
      const errText = await dealRes.text();
      console.error("Deal creation failed:", dealRes.status, errText);
      return new Response(JSON.stringify({ email: emailResult, hubspot: `error: ${errText}` }), { status: 200 });
    }

    return new Response(JSON.stringify({ email: emailResult, hubspot: "synced" }), { status: 200 });
  } catch (err) {
    console.error("HubSpot sync exception:", err);
    return new Response(JSON.stringify({ email: emailResult, hubspot: `exception: ${err}` }), { status: 200 });
  }
});
