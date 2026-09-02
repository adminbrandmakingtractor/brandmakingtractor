/**
 * BrandMakingTracktor — Enquiry popup.
 * Shows once per browser session, once the visitor scrolls 70% of the way
 * down the page (with a generous time-based fallback for short pages that
 * never reach that scroll depth). Submits Name / Email / Phone to Supabase
 * `contacts` (same table + RLS policy the Contact page uses) tagged with
 * source "popup".
 */
(function () {
  var SESSION_KEY = "bmt_popup_shown";
  var DELAY_MS = 45000;
  var SCROLL_TRIGGER_RATIO = 0.7;

  function alreadyShown() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markShown() {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (e) {
      /* ignore */
    }
  }

  function renderModal() {
    var html =
      '<div class="enquiry-overlay" id="enquiryOverlay" role="dialog" aria-modal="true" aria-labelledby="enquiryTitle">' +
      '<div class="enquiry-modal">' +
      '<button type="button" class="enquiry-close" id="enquiryClose" aria-label="Close">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      "</button>" +
      '<span class="badge">Limited Availability</span>' +
      '<h3 id="enquiryTitle">Let\'s see if we\'re a fit.</h3>' +
      '<p class="enquiry-sub">Share a few details and a specialist will reach out to scope your project &mdash; no obligation.</p>' +
      '<form id="enquiryForm" novalidate>' +
      '<div class="form-field"><label for="popName">Full Name <span class="required">*</span></label><input type="text" id="popName" autocomplete="name"><span class="field-error"></span></div>' +
      '<div class="form-field"><label for="popEmail">Email <span class="required">*</span></label><input type="email" id="popEmail" autocomplete="email"><span class="field-error"></span></div>' +
      '<div class="form-field"><label for="popPhone">Phone <span class="required">*</span></label><input type="tel" id="popPhone" autocomplete="tel"><span class="field-error"></span></div>' +
      '<button type="submit" id="enquirySubmit" class="btn btn-primary btn-block">Request a Callback</button>' +
      '<div class="form-status" id="enquiryStatus"></div>' +
      "</form>" +
      '<div class="success-panel" id="enquirySuccess" hidden>' +
      '<div class="icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>' +
      "<h3>Thanks &mdash; we'll be in touch</h3>" +
      "<p>A member of our team will reach out shortly.</p>" +
      "</div>" +
      "</div>" +
      "</div>";
    document.body.insertAdjacentHTML("beforeend", html);
  }

  function openModal() {
    if (alreadyShown() || document.getElementById("enquiryOverlay")) return;
    markShown();
    renderModal();
    var overlay = document.getElementById("enquiryOverlay");
    requestAnimationFrame(function () {
      overlay.classList.add("is-visible");
    });

    function close() {
      overlay.classList.remove("is-visible");
      setTimeout(function () {
        overlay.remove();
      }, 300);
    }

    document.getElementById("enquiryClose").addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", escHandler);
      }
    });

    var form = document.getElementById("enquiryForm");
    var statusEl = document.getElementById("enquiryStatus");
    var submitBtn = document.getElementById("enquirySubmit");
    var f = window.BMT.forms;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nameEl = document.getElementById("popName");
      var emailEl = document.getElementById("popEmail");
      var phoneEl = document.getElementById("popPhone");
      var valid = true;

      if (!f.validateRequired(nameEl.value)) {
        f.setFieldError(nameEl.closest(".form-field"), "Name is required.");
        valid = false;
      } else f.setFieldError(nameEl.closest(".form-field"), "");

      if (!f.validateEmail(emailEl.value)) {
        f.setFieldError(emailEl.closest(".form-field"), "Enter a valid email.");
        valid = false;
      } else f.setFieldError(emailEl.closest(".form-field"), "");

      if (!f.validatePhone(phoneEl.value)) {
        f.setFieldError(phoneEl.closest(".form-field"), "Enter a valid phone number.");
        valid = false;
      } else f.setFieldError(phoneEl.closest(".form-field"), "");

      if (!valid || !window.bmtSupabase) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";

      var attribution = window.BMT.attribution.getAttributionForSubmission();
      var payload = {
        name: nameEl.value.trim(),
        email: emailEl.value.trim(),
        phone: phoneEl.value.trim(),
        message: "Quick enquiry via site popup",
        source: attribution.source || "popup",
        medium: attribution.medium,
        campaign: attribution.campaign,
        gclid: attribution.gclid,
        fbclid: attribution.fbclid
      };

      window.bmtSupabase
        .from("contacts")
        .insert([payload])
        .then(function (res) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Request a Callback";
          if (res.error) {
            f.showStatus(statusEl, "Something went wrong. Please try again.", "error");
            return;
          }
          if (window.BMT && window.BMT.track) {
            window.BMT.track.leadSubmit({ form_name: "popup" });
          }
          form.hidden = true;
          document.getElementById("enquirySuccess").hidden = false;
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Request a Callback";
          f.showStatus(statusEl, "Network error. Please try again.", "error");
        });
    });
  }

  function init() {
    if (alreadyShown()) return;

    var timerId = setTimeout(openModal, DELAY_MS);

    window.addEventListener(
      "scroll",
      function onScroll() {
        var scrolled = window.scrollY + window.innerHeight;
        var full = document.documentElement.scrollHeight;
        if (full > 0 && scrolled / full >= SCROLL_TRIGGER_RATIO) {
          clearTimeout(timerId);
          window.removeEventListener("scroll", onScroll);
          openModal();
        }
      },
      { passive: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
