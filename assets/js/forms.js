/**
 * BrandMakingTracktor — Shared client-side form validation helpers.
 * Framework-free: small utilities reused by get-started.js and contact.js.
 */
(function (window) {
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_RE = /^[+\d][\d\s()-]{6,18}$/;

  function setFieldError(fieldEl, message) {
    fieldEl.classList.toggle("has-error", !!message);
    var errorEl = fieldEl.querySelector(".field-error");
    if (errorEl) errorEl.textContent = message || "";
  }

  function validateRequired(value) {
    return value && value.trim().length > 0;
  }

  function validateEmail(value) {
    return EMAIL_RE.test(String(value || "").trim());
  }

  function validatePhone(value) {
    return PHONE_RE.test(String(value || "").trim());
  }

  function showStatus(statusEl, message, type) {
    statusEl.textContent = message;
    statusEl.className = "form-status is-" + type;
  }

  window.BMT = window.BMT || {};
  window.BMT.forms = {
    setFieldError: setFieldError,
    validateRequired: validateRequired,
    validateEmail: validateEmail,
    validatePhone: validatePhone,
    showStatus: showStatus
  };
})(window);
