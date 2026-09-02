/**
 * BrandMakingTracktor — Get Started lead form (short, popup-style).
 * Validates client-side, then inserts into Supabase `leads` table (RLS
 * allows anonymous INSERT only — see /supabase/schema.sql) with attribution.
 */
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("getStartedForm");
    if (!form) return;

    var statusEl = document.getElementById("getStartedStatus");
    var submitBtn = document.getElementById("getStartedSubmit");
    var successPanel = document.getElementById("getStartedSuccess");
    var f = window.BMT.forms;
    var startedTracked = false;

    form.addEventListener("focusin", function () {
      if (!startedTracked) {
        startedTracked = true;
        window.BMT.track.contactStart({ form_name: "get_started" });
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var fields = {
        name: form.querySelector("#gsName"),
        email: form.querySelector("#gsEmail"),
        phone: form.querySelector("#gsPhone"),
        service: form.querySelector("#gsService"),
        budget: form.querySelector("#gsBudget")
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

      if (!f.validatePhone(fields.phone.value)) {
        f.setFieldError(fields.phone.closest(".form-field"), "Enter a valid phone number.");
        valid = false;
      } else f.setFieldError(fields.phone.closest(".form-field"), "");

      if (!f.validateRequired(fields.service.value)) {
        f.setFieldError(fields.service.closest(".form-field"), "Please select a service.");
        valid = false;
      } else f.setFieldError(fields.service.closest(".form-field"), "");

      if (!f.validateRequired(fields.budget.value)) {
        f.setFieldError(fields.budget.closest(".form-field"), "Please select a budget range.");
        valid = false;
      } else f.setFieldError(fields.budget.closest(".form-field"), "");

      if (!valid) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";

      var attribution = window.BMT.attribution.getAttributionForSubmission();

      var payload = Object.assign(
        {
          name: fields.name.value.trim(),
          email: fields.email.value.trim(),
          phone: fields.phone.value.trim(),
          service: fields.service.value,
          budget: fields.budget.value,
          status: "new"
        },
        attribution
      );

      window.bmtSupabase
        .from("leads")
        .insert([payload])
        .then(function (res) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit Request";
          if (res.error) {
            console.error(res.error);
            f.showStatus(statusEl, "Something went wrong. Please try again or email us directly.", "error");
            return;
          }
          window.BMT.track.leadSubmit({ service: payload.service, budget: payload.budget });
          form.hidden = true;
          if (successPanel) successPanel.hidden = false;
        })
        .catch(function (err) {
          console.error(err);
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit Request";
          f.showStatus(statusEl, "Network error. Please check your connection and try again.", "error");
        });
    });
  });
})();
