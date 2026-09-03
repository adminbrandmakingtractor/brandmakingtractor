-- ============================================================================
-- BrandMakingTractor — Supabase database schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- admin_users
-- Allow-list mapping a Supabase Auth user to CMS/admin access.
-- Rows are created manually by a project owner in the Supabase dashboard
-- (Table Editor) after creating the corresponding Auth user — there is no
-- public sign-up flow for admins.
-- ----------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admin_users where id = auth.uid());
$$;

-- ----------------------------------------------------------------------------
-- blog_categories
-- ----------------------------------------------------------------------------
create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- blog_posts
-- ----------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  featured_image text,
  category_id uuid references public.blog_categories (id) on delete set null,
  author text,
  meta_title text,
  meta_description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_published_idx
  on public.blog_posts (status, published_at desc);

-- ----------------------------------------------------------------------------
-- leads  (Get Started form — short form: name/email/phone/service/budget.
-- company, website, project_description, timeline and preferred_contact_method
-- are nullable so the CRM schema still supports a more detailed form later
-- without a migration.)
-- ----------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  email text not null,
  phone text not null,
  company text,
  website text,
  service text not null,
  budget text not null,
  project_description text,
  timeline text,
  preferred_contact_method text,

  -- attribution
  source text,
  medium text,
  campaign text,
  content text,
  term text,
  gclid text,
  fbclid text,
  landing_page text,
  referrer text,

  -- business / CRM fields
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  notes text,
  assigned_to text,
  project_value numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

-- ----------------------------------------------------------------------------
-- contacts  (Contact Us form)
-- ----------------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  email text not null,
  phone text,
  company text,
  message text not null,

  -- attribution
  source text,
  medium text,
  campaign text,
  gclid text,
  fbclid text,

  created_at timestamptz not null default now()
);

create index if not exists contacts_created_at_idx on public.contacts (created_at desc);

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_leads on public.leads;
create trigger set_updated_at_leads
  before update on public.leads
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_blog_posts on public.blog_posts;
create trigger set_updated_at_blog_posts
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Base table-level grants
-- RLS policies below control *row-level* access, but Postgres also requires
-- baseline *table-level* GRANTs for the anon/authenticated roles before RLS
-- even gets evaluated. Supabase's dashboard Table Editor sets these up
-- automatically; tables created via raw SQL (like this script) need them
-- explicit, or every query fails with "permission denied for table ...".
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert on all tables in schema public to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select, insert on tables to anon;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.admin_users enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;
alter table public.leads enable row level security;
alter table public.contacts enable row level security;

-- admin_users: an admin may read their own row (and other admins) — no public access.
drop policy if exists "admin_users_select_admin_only" on public.admin_users;
create policy "admin_users_select_admin_only"
  on public.admin_users for select
  using (public.is_admin());

-- blog_categories: public can read; only admins can write.
drop policy if exists "blog_categories_public_read" on public.blog_categories;
create policy "blog_categories_public_read"
  on public.blog_categories for select
  using (true);

drop policy if exists "blog_categories_admin_write" on public.blog_categories;
create policy "blog_categories_admin_write"
  on public.blog_categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- blog_posts: public can read only published posts; admins can do everything.
drop policy if exists "blog_posts_public_read_published" on public.blog_posts;
create policy "blog_posts_public_read_published"
  on public.blog_posts for select
  using (status = 'published' or public.is_admin());

drop policy if exists "blog_posts_admin_write" on public.blog_posts;
create policy "blog_posts_admin_write"
  on public.blog_posts for insert
  with check (public.is_admin());

drop policy if exists "blog_posts_admin_update" on public.blog_posts;
create policy "blog_posts_admin_update"
  on public.blog_posts for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "blog_posts_admin_delete" on public.blog_posts;
create policy "blog_posts_admin_delete"
  on public.blog_posts for delete
  using (public.is_admin());

-- leads: anonymous + authenticated visitors may INSERT only. Only admins can
-- read/update/delete (CRM triage happens from the admin dashboard or DB directly).
drop policy if exists "leads_public_insert" on public.leads;
create policy "leads_public_insert"
  on public.leads for insert
  with check (true);

drop policy if exists "leads_admin_select" on public.leads;
create policy "leads_admin_select"
  on public.leads for select
  using (public.is_admin());

drop policy if exists "leads_admin_update" on public.leads;
create policy "leads_admin_update"
  on public.leads for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "leads_admin_delete" on public.leads;
create policy "leads_admin_delete"
  on public.leads for delete
  using (public.is_admin());

-- contacts: same pattern as leads.
drop policy if exists "contacts_public_insert" on public.contacts;
create policy "contacts_public_insert"
  on public.contacts for insert
  with check (true);

drop policy if exists "contacts_admin_select" on public.contacts;
create policy "contacts_admin_select"
  on public.contacts for select
  using (public.is_admin());

drop policy if exists "contacts_admin_delete" on public.contacts;
create policy "contacts_admin_delete"
  on public.contacts for delete
  using (public.is_admin());

-- ============================================================================
-- Storage — `blog-images` bucket
-- Create the bucket once via Dashboard > Storage (name: blog-images, Public: yes),
-- then run the policies below against storage.objects.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

drop policy if exists "blog_images_public_read" on storage.objects;
create policy "blog_images_public_read"
  on storage.objects for select
  using (bucket_id = 'blog-images');

drop policy if exists "blog_images_admin_write" on storage.objects;
create policy "blog_images_admin_write"
  on storage.objects for insert
  with check (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "blog_images_admin_update" on storage.objects;
create policy "blog_images_admin_update"
  on storage.objects for update
  using (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "blog_images_admin_delete" on storage.objects;
create policy "blog_images_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'blog-images' and public.is_admin());

-- ============================================================================
-- Seed data (optional) — remove or edit before production use.
-- ============================================================================
insert into public.blog_categories (name, slug, description) values
  ('Marketing Strategy', 'marketing-strategy', 'Growth and positioning insights'),
  ('SEO & AEO', 'seo-aeo', 'Search and answer-engine optimization'),
  ('Branding', 'branding', 'Identity and creative direction')
on conflict (slug) do nothing;

-- Five temporary sample posts so the blog isn't empty on day one — publish,
-- edit or delete them any time from /blog/dashboard once real content is ready.
insert into public.blog_posts (title, slug, excerpt, content, category_id, author, meta_title, meta_description, status, published_at) values
(
  '7 Signs Your Website Needs a Redesign in 2026',
  '7-signs-your-website-needs-a-redesign-in-2026',
  'Slow load times, high bounce rates and an outdated look are costing you customers. Here''s how to know it''s time for a rebuild.',
  '<p>Your website is often the first impression a potential customer has of your business. If it feels slow, cluttered or out of date, visitors notice within seconds — and most of them leave without a second look.</p>
  <h2>1. It takes more than 3 seconds to load</h2>
  <p>Page speed directly affects both user experience and search rankings. If your site is dragging, a rebuild focused on performance can recover lost visitors and lost revenue.</p>
  <h2>2. It isn''t built mobile-first</h2>
  <p>The majority of traffic to most businesses now comes from mobile devices. A site that was designed for desktop and merely "shrinks" on mobile creates friction at exactly the moment a visitor is deciding whether to trust you.</p>
  <h2>3. Your bounce rate keeps climbing</h2>
  <p>A rising bounce rate is usually a signal, not a coincidence — confusing navigation, unclear messaging or a slow experience are common culprits.</p>
  <h2>4. It doesn''t reflect your current brand</h2>
  <p>If your logo, offers or positioning have evolved but your website hasn''t, you''re sending mixed signals to new visitors.</p>
  <h2>5. Updating content requires a developer</h2>
  <p>A modern site should let your team update copy, images and blog posts without waiting on a developer for every small change.</p>
  <h2>6. It wasn''t built with SEO in mind</h2>
  <p>Clean code, proper heading structure and fast load times are foundational to search visibility — retrofitting SEO onto a poorly structured site only goes so far.</p>
  <h2>7. It doesn''t have a clear call-to-action</h2>
  <p>If a first-time visitor can''t tell what to do next within a few seconds, you''re losing conversions you''ve already paid to earn.</p>
  <p>If two or more of these sound familiar, it may be time to talk to a specialist about a rebuild rather than another patch. <a href="/services/website-development">See how we approach website development</a> or <a href="/get-started">get started</a> with a quick project scope.</p>',
  (select id from public.blog_categories where slug = 'marketing-strategy'),
  'BrandMakingTractor Team',
  '7 Signs Your Website Needs a Redesign in 2026',
  'Slow load times, high bounce rates and an outdated look are costing you customers. Here are 7 signs it''s time for a website redesign.',
  'published',
  now() - interval '2 days'
),
(
  'SEO vs AEO: What''s the Difference and Why It Matters Now',
  'seo-vs-aeo-whats-the-difference',
  'Search is changing as AI answer engines rise. Here''s what SEO and AEO actually mean, and why you need both.',
  '<p>For two decades, SEO meant one thing: ranking on Google''s results page. That''s no longer the whole picture.</p>
  <h2>What is SEO?</h2>
  <p>Search Engine Optimization is the practice of improving a website''s visibility in traditional search results through technical health, on-page content and off-page authority signals like backlinks.</p>
  <h2>What is AEO?</h2>
  <p>Answer Engine Optimization focuses on structuring content so it can be pulled directly into featured snippets, voice assistants and AI-generated answers — where there may be no "click" at all, just a direct answer.</p>
  <h2>Why the difference matters</h2>
  <p>A page can rank well in traditional search while being completely invisible to an AI answer engine, because the two systems evaluate content differently. AEO rewards clear, well-structured answers to specific questions; SEO rewards broader topical authority and backlink profiles.</p>
  <h2>How they work together</h2>
  <p>The strongest approach treats AEO as an extension of SEO, not a replacement for it. Technical SEO fundamentals — fast load times, clean structure, mobile usability — remain the foundation both systems are built on.</p>
  <p>We break this down in more detail on our <a href="/services/seo-aeo-geo">SEO / AEO / GEO service page</a>, including how GEO (Generative Engine Optimization) fits into the picture as generative AI search grows.</p>',
  (select id from public.blog_categories where slug = 'seo-aeo'),
  'BrandMakingTractor Team',
  'SEO vs AEO: What''s the Difference and Why It Matters Now',
  'SEO and AEO are not the same thing. Learn the difference between traditional search optimization and answer engine optimization.',
  'published',
  now() - interval '9 days'
),
(
  'Why Consistent Branding Builds Customer Trust',
  'why-consistent-branding-builds-customer-trust',
  'A brand that looks different everywhere it appears quietly erodes trust. Here''s why consistency is a growth lever, not just a design preference.',
  '<p>Trust is built through repetition. Every time a customer sees your logo, colors and tone presented the same way, it reinforces that you are a stable, credible business — even before they''ve read a word of your message.</p>
  <h2>Consistency reduces cognitive friction</h2>
  <p>When a brand looks and sounds different across its website, ads and social channels, customers have to work harder to recognize and trust it. That friction shows up as lower conversion rates, even when the underlying offer is strong.</p>
  <h2>It compounds over time</h2>
  <p>A consistent brand becomes more valuable the longer it stays consistent — each touchpoint reinforces the last, building recognition that a one-off campaign never could.</p>
  <h2>It speeds up everything downstream</h2>
  <p>Clear brand guidelines mean your team (or your specialists) can produce new marketing material faster, without re-litigating basic design decisions on every project.</p>
  <p>If your visual identity has drifted across channels, a brand guidelines project is often one of the highest-leverage investments you can make. <a href="/services/branding">Learn more about our branding service</a>.</p>',
  (select id from public.blog_categories where slug = 'branding'),
  'BrandMakingTractor Team',
  'Why Consistent Branding Builds Customer Trust',
  'A brand that looks different everywhere it appears erodes trust. Here is why visual and messaging consistency is a growth lever.',
  'published',
  now() - interval '16 days'
),
(
  'Google Ads vs Meta Ads: Which Should You Choose First?',
  'google-ads-vs-meta-ads-which-first',
  'Both platforms can drive results, but they work very differently. Here''s how to decide where to put your first rupee of ad spend.',
  '<p>One of the most common questions we hear from new clients is where to start with paid advertising. The honest answer is: it depends on how your customers buy.</p>
  <h2>Google Ads captures existing demand</h2>
  <p>Search ads put you in front of people actively searching for a solution right now. This makes Google Ads a strong fit for businesses with clear, searchable intent — emergency services, specific products, or well-defined B2B needs.</p>
  <h2>Meta Ads creates new demand</h2>
  <p>Meta''s strength is reaching people who aren''t actively searching yet, using interest and behavior-based targeting. This works well for visually driven products, brand awareness and impulse-friendly offers.</p>
  <h2>A simple way to decide</h2>
  <p>Ask: "Do people already search for what I offer?" If yes, start with Google Ads. If your product or service needs to be discovered and explained, Meta Ads is often the stronger starting point.</p>
  <p>Most mature accounts eventually run both, coordinated through shared tracking and consistent creative. See how we approach this on our <a href="/services/performance-marketing">performance marketing page</a>.</p>',
  (select id from public.blog_categories where slug = 'marketing-strategy'),
  'BrandMakingTractor Team',
  'Google Ads vs Meta Ads: Which Should You Choose First?',
  'Google Ads and Meta Ads work differently. Learn how to decide which platform deserves your first advertising budget.',
  'published',
  now() - interval '23 days'
),
(
  '5 Content Marketing Mistakes Small Businesses Make',
  '5-content-marketing-mistakes-small-businesses-make',
  'Publishing content without a strategy rarely works. Here are the five most common mistakes we see, and how to fix them.',
  '<p>Content marketing works — but only when it''s built on a plan. Here are the mistakes that quietly waste the most time and budget.</p>
  <h2>1. Publishing without a defined audience</h2>
  <p>Content written for "everyone" tends to resonate with no one. Every piece should have a specific reader in mind, at a specific stage of their decision.</p>
  <h2>2. No connection to SEO</h2>
  <p>Great writing that no one can find has limited business value. Content should be built around real search demand from day one.</p>
  <h2>3. Inconsistent publishing</h2>
  <p>A burst of five posts followed by three months of silence rarely builds momentum. A modest, consistent cadence outperforms sporadic bursts almost every time.</p>
  <h2>4. No clear next step</h2>
  <p>Every piece of content should point somewhere — a related service, a related article, or a way to get in touch. Content without a next step is a dead end for otherwise interested readers.</p>
  <h2>5. Never measuring what''s working</h2>
  <p>Without reviewing which topics actually drive traffic, leads or shares, it''s impossible to double down on what''s working and cut what isn''t.</p>
  <p>Our <a href="/services/content-marketing">content marketing service</a> is built specifically to avoid these traps — strategy first, content second.</p>',
  (select id from public.blog_categories where slug = 'marketing-strategy'),
  'BrandMakingTractor Team',
  '5 Content Marketing Mistakes Small Businesses Make',
  'Publishing content without a strategy rarely works. Here are 5 common content marketing mistakes and how to avoid them.',
  'published',
  now() - interval '30 days'
)
on conflict (slug) do nothing;

-- Admin login (see /blog/login): the login form asks for a simple
-- "admin" username, but it signs in through real Supabase Auth underneath —
-- assets/js/admin/auth.js maps that username to a fixed email. To set it up:
--   1. Authentication > Users > Add User
--      email: admin@brandmakingtractor.com   password: <choose your own>
--   2. Copy that user's UID, then run:
--      insert into public.admin_users (id, email) values ('<uid>', 'admin@brandmakingtractor.com');
-- The password you set in step 1 is what staff type into the login form.
