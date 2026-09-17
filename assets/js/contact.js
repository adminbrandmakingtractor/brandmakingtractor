/**
 * BrandMakingTractor — Contact form.
 * Supabase contact insert + Meta CAPI + Browser Pixel deduplication.
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
        window.BMT.track.contactStart({
          form_name: "contact"
        });
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

      if (fields.phone.value && !f.validatePhone(fields.phone.value)) {
        f.setFieldError(
          fields.phone.closest(".form-field"),
          "Enter a valid phone number."
        );
        valid = false;
      } else {
        f.setFieldError(fields.phone.closest(".form-field"), "");
      }

      if (!f.validateRequired(fields.message.value)) {
        f.setFieldError(
          fields.message.closest(".form-field"),
          "Please enter a message."
        );
        valid = false;
      } else {
        f.setFieldError(fields.message.closest(".form-field"), "");
      }

      if (!valid) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      var attribution =
        window.BMT.attribution.getAttributionForSubmission();

      // Unique ID shared by Browser Pixel + Meta CAPI
      var eventId =
        "contact_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2, 12);

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
          if (res.error) {
            console.error(res.error);

            submitBtn.disabled = false;
            submitBtn.textContent = "Send Message";

            f.showStatus(
              statusEl,
              "Something went wrong. Please try again or email us directly.",
              "error"
            );

            return;
          }

          /*
           * Send Contact event to Meta CAPI.
           */
          if (
            window.bmtSupabase &&
            window.bmtSupabase.functions
          ) {
            window.bmtSupabase.functions
              .invoke("meta-capi", {
                body: {
                  event_name: "Contact",
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
                    "Meta CAPI Contact sent:",
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

          // Send same event_id to GTM → Browser Meta Pixel
          window.BMT.track.contactSubmit({
            form_name: "contact",
            event_id: eventId
          });

          submitBtn.disabled = false;
          submitBtn.textContent = "Send Message";

          form.hidden = true;

          if (successPanel) {
            successPanel.hidden = false;
          }
        })
        .catch(function (err) {
          console.error(err);

          submitBtn.disabled = false;
          submitBtn.textContent = "Send Message";

          f.showStatus(
            statusEl,
            "Network error. Please check your connection and try again.",
            "error"
          );
        });
    });
  });
})();
