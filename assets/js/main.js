/**
 * BrandMakingTracktor — Global site behavior.
 * Runs on every page: dataLayer page_view, delegated CTA/phone/WhatsApp
 * click tracking, and generic accordion (FAQ) behavior.
 */
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    if (window.BMT && window.BMT.track) {
      window.BMT.track.pageView();
    }

    // Delegated click tracking — works even for elements injected by partials.js
    document.addEventListener("click", function (e) {
      var ctaEl = e.target.closest("[data-cta]");
      if (ctaEl && window.BMT) {
        window.BMT.track.ctaClick(ctaEl.getAttribute("data-cta"));
      }
      var phoneEl = e.target.closest("[data-track-phone]");
      if (phoneEl && window.BMT) {
        window.BMT.track.phoneClick({ phone_number: phoneEl.getAttribute("href") });
      }
      var waEl = e.target.closest("[data-track-whatsapp]");
      if (waEl && window.BMT) {
        window.BMT.track.whatsappClick({ link: waEl.getAttribute("href") });
      }
      var serviceEl = e.target.closest("[data-service-view]");
      if (serviceEl && window.BMT) {
        window.BMT.track.serviceView(serviceEl.getAttribute("data-service-view"));
      }
    });

    initAccordions();
    initScrollReveal();
  });

  function initScrollReveal() {
    var selectors = [
      ".section-head", ".card", ".step", ".compare-card", ".philosophy-quote",
      ".blog-card", ".form-card", ".hero-visual-card"
    ];
    var targets = document.querySelectorAll(selectors.join(","));
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.removeAttribute("data-reveal"); });
      return;
    }

    targets.forEach(function (el, i) {
      el.setAttribute("data-reveal", "up");
      el.style.transitionDelay = (i % 4) * 70 + "ms";
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    targets.forEach(function (el) { observer.observe(el); });
  }

  function initAccordions() {
    document.querySelectorAll(".accordion-item").forEach(function (item) {
      var trigger = item.querySelector(".accordion-trigger");
      var panel = item.querySelector(".accordion-panel");
      if (!trigger || !panel) return;
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", function () {
        var isOpen = item.classList.contains("is-open");
        document.querySelectorAll(".accordion-item.is-open").forEach(function (openItem) {
          if (openItem !== item) {
            openItem.classList.remove("is-open");
            openItem.querySelector(".accordion-panel").style.maxHeight = null;
            openItem.querySelector(".accordion-trigger").setAttribute("aria-expanded", "false");
          }
        });
        if (isOpen) {
          item.classList.remove("is-open");
          panel.style.maxHeight = null;
          trigger.setAttribute("aria-expanded", "false");
        } else {
          item.classList.add("is-open");
          panel.style.maxHeight = panel.scrollHeight + "px";
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });
  }
})();
