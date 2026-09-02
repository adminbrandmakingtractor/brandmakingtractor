/**
 * BrandMakingTracktor — Public runtime configuration.
 *
 * Only PUBLIC, publishable values belong here (Supabase URL + anon/public key,
 * GTM container id). The anon key is safe to expose client-side because
 * Supabase Row Level Security (see /supabase/schema.sql) governs what it can
 * actually read/write. NEVER put the service_role key in this file or in any
 * file shipped to the browser.
 */
window.BMT_CONFIG = {
  SUPABASE_URL: "https://pxvlfsypycbfxabndfqm.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_HFy07cvauuqerLUeQNypcg_vj1Nt5Ch",
  GTM_CONTAINER_ID: "GTM-KHT4QTCC",
  SITE_URL: "https://brandmakingtractor.com"
};
