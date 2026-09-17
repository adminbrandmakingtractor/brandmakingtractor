/**
 * BrandMakingTractor — Get Started lead form
 * Supabase lead insert + Meta CAPI + Browser Pixel deduplication
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
        window.BMT.track.contactStart({
          form_name: "get_started"
        });
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
        f.setFieldError(
          fields.name.closest(".form-field"),
          "Full name is required."
        );
        valid = false;
      } else {
        f.setFieldError(fields.name.closest(".form-field"), "");
      }

      if (!f.validateEmail(fields.email.value)) {
        f.setFieldError(
          fields.email.closest(".form-field"),
          "Enter a valid email address."
        );
        valid = false;
      } else {
        f.setFieldError(fields.email.closest(".form-field"), "");
      }

      if (!f.validatePhone(fields.phone.value)) {
        f.setFieldError(
          fields.phone.closest(".form-field"),
          "Enter a valid phone number."
        );
        valid = false;
      } else {
        f.setFieldError(fields.phone.closest(".form-field"), "");
      }

      if (!f.validateRequired(fields.service.value)) {
        f.setFieldError(
          fields.service.closest(".form-field"),
          "Please select a service."
        );
        valid = false;
      } else {
        f.setFieldError(fields.service.closest(".form-field"), "");
      }

      if (!f.validateRequired(fields.budget.value)) {
        f.setFieldError(
          fields.budget.closest(".form-field"),
          "Please select a budget range."
        );
        valid = false;
      } else {
        f.setFieldError(fields.budget.closest(".form-field"), "");
      }

      if (!valid) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";

      var attribution =
        window.BMT.attribution.getAttributionForSubmission();

      // Unique ID shared by Browser Pixel + Meta CAPI
      var eventId =
        "lead_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2, 12);

      var payload = Object.assign(
        {
          name: fields.name.value.trim(),
          email: fields.email.value.trim(),
          phone: fields.phone.value.trim(),
          service: fields.service.value,
          budget: fields.budget.value,
          status: "new",

          // Meta CAPI deduplication ID
          //event_id: eventId
        },
        attribution
      );

      window.bmtSupabase
        .from("leads")
        .insert([payload])
        .then(function (res) {
          if (res.error) {
            console.error(res.error);

            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Request";

            f.showStatus(
              statusEl,
              "Something went wrong. Please try again or email us directly.",
              "error"
            );

            return;
          }

          /*
           * Send Lead event to Meta CAPI.
           * The same event_id is also sent to GTM/Browser Pixel.
           */
          if (
            window.bmtSupabase &&
            window.bmtSupabase.functions
          ) {
            window.bmtSupabase.functions
              .invoke("meta-capi", {
                body: {
                  event_name: "Lead",
                  event_id: eventId,
                  email: payload.email,
                  phone: payload.phone,
                  event_source_url: window.location.href
                }
              })
              .then(function (capiRes) {
                if (capiRes.error) {
                  console.error(
                    "Meta CAPI error:",
                    capiRes.error
                  );
                } else {
                  console.log(
                    "Meta CAPI Lead sent:",
                    capiRes.data
                  );
                }
              })
              .catch(function (err) {
                console.error(
                  "Meta CAPI network error:",
                  err
                );
              });
          }

          // Send event_id to GTM → Browser Meta Pixel
          window.BMT.track.leadSubmit({
            service: payload.service,
            budget: payload.budget,
            event_id: eventId
          });

          submitBtn.disabled = false;
          submitBtn.textContent = "Submit Request";

          form.hidden = true;

          if (successPanel) {
            successPanel.hidden = false;
          }
        })
        .catch(function (err) {
          console.error(err);

          submitBtn.disabled = false;
          submitBtn.textContent = "Submit Request";

          f.showStatus(
            statusEl,
            "Network error. Please check your connection and try again.",
            "error"
          );
        });
    });
  });
})();
