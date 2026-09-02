/**
 * BrandMakingTracktor — Admin authentication.
 *
 * The login screen shows a simple username ("admin") + password, but under
 * the hood it still signs in through Supabase Auth (email/password) — the
 * username is mapped to a fixed internal email. Real write access to
 * blog_posts is enforced by RLS policies requiring an authenticated session
 * AND membership in the `admin_users` table (see /supabase/schema.sql).
 * This client-side guard only controls page UX; it is not the security
 * boundary — that's Postgres RLS.
 *
 * One-time setup (see README.md): create a Supabase Auth user with email
 * admin@brandmakingtractor.com and the password you want staff to use, then
 * add that user's id to public.admin_users.
 */
(function () {
  var ADMIN_USERNAME = "admin";
  var ADMIN_EMAIL = "admin@brandmakingtractor.com";

  window.BMT_ADMIN = window.BMT_ADMIN || {};

  window.BMT_ADMIN.requireSession = function (onReady) {
    window.bmtSupabase.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session) {
        window.location.href = "/blog/login";
        return;
      }
      onReady(session);
    });
  };

  window.BMT_ADMIN.logout = function () {
    window.bmtSupabase.auth.signOut().then(function () {
      window.location.href = "/blog/login";
    });
  };

  document.addEventListener("DOMContentLoaded", function () {
    var loginForm = document.getElementById("adminLoginForm");
    if (!loginForm) return;

    // If already logged in, skip straight to dashboard.
    window.bmtSupabase.auth.getSession().then(function (res) {
      if (res.data && res.data.session) {
        window.location.href = "/blog/dashboard";
      }
    });

    var statusEl = document.getElementById("adminLoginStatus");
    var submitBtn = document.getElementById("adminLoginSubmit");

    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var username = document.getElementById("adminUsername").value.trim().toLowerCase();
      var password = document.getElementById("adminPassword").value;

      if (!username || !password) {
        window.BMT.forms.showStatus(statusEl, "Enter your username and password.", "error");
        return;
      }

      if (username !== ADMIN_USERNAME) {
        window.BMT.forms.showStatus(statusEl, "Invalid username or password.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Signing in...";

      window.bmtSupabase.auth
        .signInWithPassword({ email: ADMIN_EMAIL, password: password })
        .then(function (res) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Sign In";
          if (res.error) {
            window.BMT.forms.showStatus(statusEl, "Invalid username or password.", "error");
            return;
          }
          window.location.href = "/blog/dashboard";
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Sign In";
          window.BMT.forms.showStatus(statusEl, "Network error. Please try again.", "error");
        });
    });
  });
})();
