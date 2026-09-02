/**
 * BrandMakingTracktor — Contact form.
 * Validates client-side, then inserts into Supabase `contacts` table (RLS
 * allows anonymous INSERT only — see /supabase/schema.sql) with attribution.
 */
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("contactForm");
    if (!form) return;

    var statusEl = document.getElementById("contactStatus");
    var submitBtn = document.getElementById("contactSubmit");
    var successPanel = document.getElementById("contactSuccess");
    var f = window.BMT.forms;
    var startedTracked = false;

    form.addEventListener("focusin", function () {
      if (!startedTracked) {
        startedTracked = true;
        window.BMT.track.contactStart({ form_name: "contact" });
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var fields = {
        name: form.querySelector("#cName"),
        email: form.querySelector("#cEmail"),
        phone: form.querySelector("#cPhone"),
        company: form.querySelector("#cCompany"),
        message: form.querySelector("#cMessage")
      };

      var valid = true;

      if (!f.validateRequired(fields.name.value)) {
        f.setFieldError(fields.name.closest(".form-field"), "Full name is required.");
        valid = false;
      } else f.setFieldError(fields.name.closest(".form-field"), "");

      if (!f.validateEmail(fields.email.value)) {
        f.setFieldError(fields.email.closest(".form-field"), "Enter a valid email address.");
        valid = false;
      } else f.setFieldError(fields.email.closest(".form-field"), "");

      if (fields.phone.value && !f.validatePhone(fields.phone.value)) {
        f.setFieldError(fields.phone.closest(".form-field"), "Enter a valid phone number.");
        valid = false;
      } else f.setFieldError(fields.phone.closest(".form-field"), "");

      if (!f.validateRequired(fields.message.value)) {
        f.setFieldError(fields.message.closest(".form-field"), "Please enter a message.");
        valid = false;
      } else f.setFieldError(fields.message.closest(".form-field"), "");

      if (!valid) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      var attribution = window.BMT.attribution.getAttributionForSubmission();

      var payload = Object.assign(
        {
          name: fields.name.value.trim(),
          email: fields.email.value.trim(),
          phone: fields.phone.value.trim() || null,
          company: fields.company.value.trim() || null,
          message: fields.message.value.trim()
        },
        {
          source: attribution.source,
          medium: attribution.medium,
          campaign: attribution.campaign,
          gclid: attribution.gclid,
          fbclid: attribution.fbclid
        }
      );

      window.bmtSupabase
        .from("contacts")
        .insert([payload])
        .then(function (res) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Send Message";
          if (res.error) {
            console.error(res.error);
            f.showStatus(statusEl, "Something went wrong. Please try again or email us directly.", "error");
            return;
          }
          window.BMT.track.contactSubmit({ form_name: "contact" });
          form.hidden = true;
          if (successPanel) successPanel.hidden = false;
        })
        .catch(function (err) {
          console.error(err);
          submitBtn.disabled = false;
          submitBtn.textContent = "Send Message";
          f.showStatus(statusEl, "Network error. Please check your connection and try again.", "error");
        });
    });
  });
})();
