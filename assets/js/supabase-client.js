/**
 * BrandMakingTracktor — Supabase client bootstrap.
 * Requires the Supabase JS CDN script to be loaded first:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * Uses only the public anon key from config.js. RLS policies (see
 * /supabase/schema.sql) enforce what anonymous vs. authenticated users can do.
 */
(function () {
  if (!window.supabase || !window.BMT_CONFIG) {
    console.error("BMT: Supabase SDK or config not loaded.");
    return;
  }
  window.bmtSupabase = window.supabase.createClient(
    window.BMT_CONFIG.SUPABASE_URL,
    window.BMT_CONFIG.SUPABASE_ANON_KEY
  );
})();
