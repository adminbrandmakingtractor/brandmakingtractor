/**
 * BrandMakingTractor — Instant email notification for every form submission.
 *
 * Sends the submitted fields to the admin inbox through FormSubmit
 * (formsubmit.co), independently of Supabase, so a lead always reaches the
 * team even if the database or the Resend edge function is misconfigured.
 *
 * One-time setup: the very first submission triggers an "Activate Form" email
 * from FormSubmit to the address below — open it and click Activate. After
 * that every submission arrives as a formatted email.
 */
(function (window) {
  var NOTIFY_EMAIL = "admin.brandmakingtractor@gmail.com";
  var ENDPOINT = "https://formsubmit.co/ajax/" + NOTIFY_EMAIL;

  var LABELS = {
    name: "Name", email: "Email", phone: "Phone", company: "Company",
    service: "Service", budget: "Budget", message: "Message",
    source: "Source", medium: "Medium", campaign: "Campaign",
    gclid: "Google Click ID", fbclid: "Facebook Click ID"
  };

  function notify(formName, data) {
    try {
      var body = {
        _subject: "New " + formName + ": " + (data.name || data.email || "website enquiry"),
        _template: "table",
        _captcha: "false",
        "Form": formName,
        "Page": window.location.href,
        "Submitted at": new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      };
      Object.keys(LABELS).forEach(function (key) {
        if (data[key]) body[LABELS[key]] = String(data[key]);
      });
      if (data.email) body._replyto = data.email;

      return fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        keepalive: true
      }).catch(function (err) {
        console.error("Notification email failed:", err);
      });
    } catch (err) {
      console.error("Notification email failed:", err);
    }
  }

  window.BMT = window.BMT || {};
  window.BMT.notify = notify;
})(window);
