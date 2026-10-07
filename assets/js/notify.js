/**
 * BrandMakingTractor — Instant email notification for every form submission.
 *
 * Sends the submitted fields to admin.brandmakingtractor@gmail.com through
 * Web3Forms (web3forms.com), independently of Supabase, so a lead always
 * reaches the inbox even if the database or an edge function has a problem.
 *
 * Setup: put the Web3Forms access key in assets/js/config.js as
 * WEB3FORMS_ACCESS_KEY. The key is created for the admin email address, so
 * notifications always go there — no activation link, works on any domain.
 */
(function (window) {
  var ENDPOINT = "https://api.web3forms.com/submit";

  var LABELS = {
    name: "Name", email: "Email", phone: "Phone", company: "Company",
    service: "Service", budget: "Budget", message: "Message",
    source: "Source", medium: "Medium", campaign: "Campaign",
    gclid: "Google Click ID", fbclid: "Facebook Click ID"
  };

  function notify(formName, data) {
    var key = window.BMT_CONFIG && window.BMT_CONFIG.WEB3FORMS_ACCESS_KEY;
    if (!key) {
      console.warn("WEB3FORMS_ACCESS_KEY missing in config.js — email notification skipped.");
      return;
    }
    try {
      var body = {
        access_key: key,
        subject: "New " + formName + ": " + (data.name || data.email || "website enquiry"),
        from_name: "BrandMakingTractor Website",
        "Form": formName,
        "Page": window.location.href,
        "Submitted at": new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      };
      Object.keys(LABELS).forEach(function (k) {
        if (data[k]) body[LABELS[k]] = String(data[k]);
      });
      if (data.email) body.replyto = data.email;

      return fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        keepalive: true
      })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (!json.success) console.error("Notification email failed:", json.message);
        })
        .catch(function (err) { console.error("Notification email failed:", err); });
    } catch (err) {
      console.error("Notification email failed:", err);
    }
  }

  window.BMT = window.BMT || {};
  window.BMT.notify = notify;
})(window);
