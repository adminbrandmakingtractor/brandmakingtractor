/**
 * BrandMakingTractor — dataLayer utility (GTM-ready).
 *
 * No analytics vendor scripts (GA4, Meta Pixel, Google Ads) are hard-coded
 * here on purpose — those are configured inside Google Tag Manager using the
 * events pushed below as triggers. Add the GTM container snippet using
 * window.BMT_CONFIG.GTM_CONTAINER_ID in the <head>/<body> of each page.
 */
(function (window) {
  window.dataLayer = window.dataLayer || [];

  function push(event, data) {
    window.dataLayer.push(Object.assign({ event: event }, data || {}));
  }

  var track = {
    pageView: function (extra) {
      push("page_view", Object.assign({ page_path: window.location.pathname, page_title: document.title }, extra || {}));
    },
    ctaClick: function (ctaName, extra) {
      push("cta_click", Object.assign({ cta_name: ctaName }, extra || {}));
    },
    serviceView: function (serviceName, extra) {
      push("service_view", Object.assign({ service_name: serviceName }, extra || {}));
    },
    contactStart: function (extra) {
      push("contact_start", extra || {});
    },
    contactSubmit: function (extra) {
      push("contact_submit", extra || {});
    },
    leadSubmit: function (extra) {
      push("lead_submit", extra || {});
    },
    phoneClick: function (extra) {
      push("phone_click", extra || {});
    },
    whatsappClick: function (extra) {
      push("whatsapp_click", extra || {});
    },
    blogView: function (slug, extra) {
      push("blog_view", Object.assign({ blog_slug: slug }, extra || {}));
    }
  };

  window.BMT = window.BMT || {};
  window.BMT.track = track;
  window.BMT.push = push;
})(window);
