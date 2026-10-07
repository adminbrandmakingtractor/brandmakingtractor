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

  function readCookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  /** Unique id shared by the browser Pixel event and the matching CAPI event (deduplication). */
  function newEventId(prefix) {
    return (prefix || "evt") + "_" + Date.now() + "_" + Math.random().toString(36).substring(2, 12);
  }

  /**
   * Server-side Meta Conversions API event via the `meta-capi` Supabase
   * function. Sends the same event_id as the browser Pixel plus the _fbp /
   * _fbc browser ids and user agent, which raise Meta's match quality.
   * Best-effort: never blocks or breaks the form.
   */
  function capi(eventName, eventId, data) {
    try {
      if (!window.bmtSupabase || !window.bmtSupabase.functions) return;
      var fbc = readCookie("_fbc");
      if (!fbc) {
        var fbclid = new URLSearchParams(window.location.search).get("fbclid") ||
          (window.BMT.attribution && (window.BMT.attribution.getAttributionForSubmission() || {}).fbclid);
        if (fbclid) fbc = "fb.1." + Date.now() + "." + fbclid;
      }
      var names = String((data && data.name) || "").trim().split(/\s+/);
      window.bmtSupabase.functions
        .invoke("meta-capi", {
          body: {
            event_name: eventName,
            event_id: eventId,
            email: data && data.email,
            phone: (data && data.phone) || null,
            first_name: names[0] || null,
            last_name: names.slice(1).join(" ") || null,
            fbp: readCookie("_fbp"),
            fbc: fbc,
            client_user_agent: navigator.userAgent,
            event_source_url: window.location.href
          }
        })
        .then(function (res) {
          if (res.error) console.error("Meta CAPI error:", res.error);
        })
        .catch(function (err) { console.error("Meta CAPI network error:", err); });
    } catch (err) {
      console.error("Meta CAPI error:", err);
    }
  }

  window.BMT = window.BMT || {};
  window.BMT.track = track;
  window.BMT.capi = capi;
  window.BMT.newEventId = newEventId;
  window.BMT.push = push;
})(window);
