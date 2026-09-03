/**
 * BrandMakingTractor — Cookie/consent foundation.
 *
 * Pairs with the Consent Mode v2 default signal inlined in each page's
 * <head> (before the GTM snippet). This file renders the banner, records
 * the visitor's choice in localStorage (first-party, no cookie needed),
 * and pushes a `consent update` once they decide — GTM/GA4/Ads tags
 * configured later will automatically respect it.
 */
(function () {
  var STORAGE_KEY = "bmt_cookie_consent";

  function getStoredConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function storeConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable — consent still applies for this page view */
    }
  }

  function pushConsentUpdate(value) {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    var granted = value.marketing ? "granted" : "denied";
    gtag("consent", "update", {
      ad_storage: granted,
      ad_user_data: granted,
      ad_personalization: granted,
      analytics_storage: value.analytics ? "granted" : "denied"
    });
  }

  function applyChoice(analytics, marketing) {
    var value = { analytics: analytics, marketing: marketing, timestamp: new Date().toISOString() };
    storeConsent(value);
    pushConsentUpdate(value);
    var banner = document.getElementById("cookieConsentBanner");
    if (banner) banner.remove();
  }

  function renderBanner() {
    var html =
      '<div class="cookie-consent-banner" id="cookieConsentBanner" role="dialog" aria-label="Cookie preferences">' +
      '<div class="cookie-consent-inner">' +
      '<p>We use first-party analytics and marketing cookies to understand site traffic and improve BrandMakingTractor. You can accept all cookies or continue with only the essential ones.</p>' +
      '<div class="cookie-consent-actions">' +
      '<button type="button" class="btn btn-secondary btn-sm" id="cookieRejectBtn">Essential Only</button>' +
      '<button type="button" class="btn btn-primary btn-sm" id="cookieAcceptBtn">Accept All</button>' +
      "</div>" +
      "</div>" +
      "</div>";
    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById("cookieAcceptBtn").addEventListener("click", function () {
      applyChoice(true, true);
    });
    document.getElementById("cookieRejectBtn").addEventListener("click", function () {
      applyChoice(false, false);
    });
  }

  function init() {
    if (!getStoredConsent()) {
      renderBanner();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.BMT = window.BMT || {};
  window.BMT.consent = {
    get: getStoredConsent,
    set: applyChoice
  };
})();
