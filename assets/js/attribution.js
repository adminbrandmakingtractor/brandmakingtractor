/**
 * BrandMakingTracktor — Marketing attribution capture.
 *
 * Captures utm_source / utm_medium / utm_campaign / utm_content / utm_term /
 * gclid / fbclid plus landing_page + referrer on first visit, persists them
 * as FIRST-TOUCH attribution (localStorage, survives across sessions), and
 * also keeps a LAST-TOUCH copy (sessionStorage, refreshed whenever new
 * campaign params show up) so both models are available to forms/analytics
 * later without re-architecting anything.
 */
(function (window) {
  var FIRST_TOUCH_KEY = "bmt_attribution_first_touch";
  var LAST_TOUCH_KEY = "bmt_attribution_last_touch";

  var PARAM_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "fbclid"
  ];

  function readUrlParams() {
    var params = new URLSearchParams(window.location.search);
    var out = {};
    var found = false;
    PARAM_KEYS.forEach(function (key) {
      var val = params.get(key);
      if (val) {
        out[key] = val;
        found = true;
      }
    });
    return found ? out : null;
  }

  function safeGet(storage, key) {
    try {
      var raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function safeSet(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable (private mode, quota) — fail silently */
    }
  }

  function buildTouch(paramData) {
    return Object.assign(
      {
        source: paramData.utm_source || (document.referrer ? "referral" : "direct"),
        medium: paramData.utm_medium || (document.referrer ? "referral" : "none"),
        campaign: paramData.utm_campaign || null,
        content: paramData.utm_content || null,
        term: paramData.utm_term || null,
        gclid: paramData.gclid || null,
        fbclid: paramData.fbclid || null,
        landing_page: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
        captured_at: new Date().toISOString()
      }
    );
  }

  function init() {
    var urlParams = readUrlParams() || {};
    var hasCampaignSignal = Object.keys(urlParams).length > 0;

    // FIRST TOUCH: only ever written once per browser (localStorage).
    var existingFirstTouch = safeGet(window.localStorage, FIRST_TOUCH_KEY);
    if (!existingFirstTouch) {
      safeSet(window.localStorage, FIRST_TOUCH_KEY, buildTouch(urlParams));
    }

    // LAST TOUCH: written on every visit that carries new campaign params,
    // otherwise falls back to the first-touch record for this session.
    var existingLastTouch = safeGet(window.sessionStorage, LAST_TOUCH_KEY);
    if (hasCampaignSignal || !existingLastTouch) {
      safeSet(window.sessionStorage, LAST_TOUCH_KEY, buildTouch(urlParams));
    }
  }

  function getFirstTouch() {
    return safeGet(window.localStorage, FIRST_TOUCH_KEY) || buildTouch({});
  }

  function getLastTouch() {
    return safeGet(window.sessionStorage, LAST_TOUCH_KEY) || getFirstTouch();
  }

  /**
   * Attribution payload attached to lead/contact submissions.
   * Defaults to first-touch (the field names required by the leads/contacts
   * schema). Swap to getLastTouch() here if last-touch becomes the model of
   * record — both are already tracked independently.
   */
  function getAttributionForSubmission() {
    var touch = getFirstTouch();
    return {
      source: touch.source,
      medium: touch.medium,
      campaign: touch.campaign,
      content: touch.content,
      term: touch.term,
      gclid: touch.gclid,
      fbclid: touch.fbclid,
      landing_page: touch.landing_page,
      referrer: touch.referrer
    };
  }

  init();

  window.BMT = window.BMT || {};
  window.BMT.attribution = {
    getFirstTouch: getFirstTouch,
    getLastTouch: getLastTouch,
    getAttributionForSubmission: getAttributionForSubmission
  };
})(window);
