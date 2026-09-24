# BrandMakingTractor — brandmakingtractor.com

Production-ready marketing website + blog CMS. Pure **HTML5 / CSS3 / vanilla JavaScript** on the frontend, **Supabase** (Postgres + Auth + Storage + Row Level Security) as the backend. No React, no Next.js, no Tailwind, no build step.

Every internal link is a clean URL with no `.html` (`/about`, `/services/branding`, `/blog/some-post`) — see [Clean URLs](#9-clean-urls) for how that's wired up in both production and local dev.

## 1. Project structure

```
/index.html                     Home
/about.html                     -> served at /about
/services.html                  -> served at /services (overview)
/services/website-development.html
/services/performance-marketing.html
/services/content-marketing.html
/services/seo-aeo-geo.html
/services/branding.html
/services/social-media-marketing.html
/services/market-research.html
/faq.html                       -> served at /faq
/contact.html                   -> served at /contact
/get-started.html               -> served at /get-started — short lead form -> Supabase `leads`
/blog/index.html                Blog listing (reads Supabase `blog_posts`) -> served at /blog/
/blog/post.html                 Single post + "Popular Blogs" sidebar, served for /blog/<slug>
/blog/login.html                -> served at /blog/login — admin sign-in
/blog/dashboard.html            -> served at /blog/dashboard — manage posts + categories
/blog/editor.html               -> served at /blog/editor — write/edit a post (WYSIWYG)
/assets/css/style.css           Design system
/assets/css/admin.css           Admin-only additions
/assets/js/config.js            Public runtime config (Supabase URL/anon key, GTM id)
/assets/js/supabase-client.js   Supabase client bootstrap
/assets/js/attribution.js       UTM/gclid/fbclid capture (first + last touch)
/assets/js/datalayer.js         dataLayer helper + tracked events
/assets/js/partials.js          Header/footer/mobile tab bar/WhatsApp button, injected on every page
/assets/js/main.js              Global click tracking, accordion, scroll-reveal animations
/assets/js/forms.js             Shared form validation helpers
/assets/js/get-started.js       Get Started form -> Supabase
/assets/js/contact.js           Contact form -> Supabase
/assets/js/popup.js             70%-scroll enquiry popup -> Supabase `contacts`
/assets/js/blog.js              Blog listing renderer
/assets/js/post.js              Single post renderer + "Popular Blogs" sidebar + meta tags
/assets/js/admin/auth.js        Login (admin/•••• mapped to Supabase Auth) + session guard
/assets/js/admin/dashboard.js   Post/category management
/assets/js/admin/editor.js      WYSIWYG editor: formatting, internal links, backlinks, image upload
/supabase/schema.sql            Full DB schema, RLS policies, storage bucket
/.htaccess                      Apache clean-URL rewrites (production)
/dev-server.py                  Local dev server that mirrors the same rewrites
```

Every internal link uses root-relative paths, so the site is expected to be deployed at the domain root.

## 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the entire contents of [`supabase/schema.sql`](supabase/schema.sql). This creates:
   - `leads`, `contacts`, `blog_posts`, `blog_categories`, `admin_users`
   - Row Level Security policies (public can only INSERT leads/contacts and READ published blog content; only rows in `admin_users` can manage blog content or read leads/contacts)
   - The `blog-images` public Storage bucket + its policies
3. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**.
4. Paste them into [`assets/js/config.js`](assets/js/config.js):
   ```js
   window.BMT_CONFIG = {
     SUPABASE_URL: "https://xxxx.supabase.co",
     SUPABASE_ANON_KEY: "eyJ...",
     GTM_CONTAINER_ID: "GTM-KHT4QTCC",
     SITE_URL: "https://brandmakingtractor.com"
   };
   ```
   **Never** put the `service_role` key here or anywhere in frontend code — only the `anon` key belongs in the browser. RLS is what keeps the anon key safe to expose.

### Creating the admin login

The sign-in screen at `/blog/login` asks for a simple **username (`admin`) + password** — but under the hood it still authenticates through real Supabase Auth for security. `assets/js/admin/auth.js` maps the username to a fixed email.

1. In Supabase, go to **Authentication → Users → Add User**:
   - Email: `admin@brandmakingtractor.com`
   - Password: whatever you want staff to type in at `/blog/login`
2. Copy that user's UID.
3. In **SQL Editor**, run:
   ```sql
   insert into public.admin_users (id, email) values ('<uid>', 'admin@brandmakingtractor.com');
   ```
4. Sign in at `/blog/login` with username `admin` and the password from step 1.

There is no public admin sign-up, and `/blog/login`, `/blog/dashboard`, `/blog/editor` are excluded from `robots.txt` — this is intentional.

## 3. Writing blog posts (no code required)

`/blog/editor` has a small WYSIWYG toolbar so anyone can write a post without touching HTML:
- **Bold / Italic / Underline**, headings (H2/H3), paragraph, bullet/numbered lists, blockquote.
- **+ Internal Link** — pick any page on the site from a dropdown and it's inserted as a link (great for internal linking / SEO).
- **+ External Link** — prompts for a URL (and link text) to reference or backlink another site; opens in a new tab with `rel="noopener"`.
- **Meta Title / Meta Description** fields for on-page SEO, plus slug (auto-generated from the title, editable) and a featured image upload.

## 4. Google Tag Manager

Container **GTM-KHT4QTCC** is wired into every public page — both the `<head>` script and the `<body>` noscript fallback. No analytics vendor script (GA4, Meta Pixel, Google Ads conversion tags) is hard-coded anywhere; configure those **inside GTM** using the `dataLayer` events already being pushed (see `assets/js/datalayer.js`):

| Event | Fired when |
|---|---|
| `page_view` | Every page load |
| `cta_click` | Any element with `data-cta="..."` is clicked |
| `service_view` | Landing on a `/services/*` page or clicking a service card |
| `contact_start` | First focus into the Contact, Get Started, or popup form |
| `contact_submit` | Contact form successfully saved to Supabase |
| `lead_submit` | Get Started form (or the enquiry popup) successfully saved to Supabase |
| `phone_click` | Any `[data-track-phone]` link clicked |
| `whatsapp_click` | Any `[data-track-whatsapp]` link (including the floating button) clicked |
| `blog_view` | A published blog post finishes loading |

To change the container ID later, update `GTM_CONTAINER_ID` in `assets/js/config.js` **and** the hardcoded `id=` in each page's `<noscript>` fallback (noscript can't read JS config).

## 5. Marketing attribution

`assets/js/attribution.js` runs on every page load:

- Reads `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, `fbclid` from the URL.
- Stores the **first-touch** record in `localStorage` (written once per browser, never overwritten).
- Stores a **last-touch** record in `sessionStorage` (refreshed whenever new campaign params appear).
- Captures `landing_page` and `referrer` alongside both.
- `window.BMT.attribution.getAttributionForSubmission()` returns the payload attached to every `leads`/`contacts` row — currently sourced from first-touch; swap to `getLastTouch()` in that one function if you later prefer last-touch as the model of record.

## 6. The enquiry popup

`assets/js/popup.js` shows a compact Name/Email/Phone modal once per browser session, triggered at **70% scroll depth** (with a 45-second fallback timer for short pages that never reach that far). Submits to the `contacts` table tagged `source: "popup"`. It's loaded on every public page except the dedicated Get Started/Contact pages (to avoid asking twice) and the admin pages.

## 7. WhatsApp

The floating WhatsApp button, footer link, and Contact page all point to **+91 97917 18488** (`assets/js/partials.js`, `WHATSAPP_NUMBER` constant) — update that one constant if the number changes.

## 8. Currency

Budget ranges (Get Started form) are in **INR (₹)**.

## 9. Clean URLs

Production (`.htaccess`, Apache/Hostinger) rewrites any extensionless request to its matching `.html` file at any depth (`/about` → `about.html`, `/services/branding` → `services/branding.html`), and any unmatched `/blog/<x>` to `blog/post.html`. Locally, Python's plain `http.server` doesn't understand `.htaccess`, so use the included dev server instead, which mirrors the same rules:

```bash
python dev-server.py 8080
```

Then visit `http://localhost:8080`. (`.claude/launch.json` already runs this automatically if you're using the Claude Code preview.)

## 10. Deploying to Hostinger

1. Push this repository to GitHub.
2. In Hostinger's hPanel, connect the GitHub repo (Git deployment) or upload the files via File Manager/FTP to `public_html/`.
3. Confirm `.htaccess` is present in `public_html/` (Hostinger runs Apache, so the rewrite rules apply automatically).
4. Point your domain/DNS at Hostinger if not already done, and issue an SSL certificate (Hostinger provides free SSL).
5. Update `assets/js/config.js` with production Supabase credentials before going live (GTM ID is already set).

## 11. Security notes

- RLS is enabled on every table. Public (anon) access is limited to: INSERT on `leads`/`contacts`, SELECT on published `blog_posts` and all `blog_categories`.
- All admin writes (blog CRUD, reading leads/contacts) require both a valid Supabase Auth session **and** a matching row in `admin_users` — see `public.is_admin()` in `supabase/schema.sql`.
- The `service_role` key must never be added to any file under `/assets` or any other file served to the browser.
- Client-side admin route guards (`assets/js/admin/auth.js`) are a UX convenience only; the real security boundary is Postgres RLS. The "admin" username shown on the login screen is cosmetic — the actual credential check happens against the Supabase Auth password you set for `admin@brandmakingtractor.com`.
