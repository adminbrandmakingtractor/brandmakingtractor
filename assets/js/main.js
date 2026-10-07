/**
 * BrandMakingTractor — Global site behavior.
 * Runs on every page: dataLayer page_view, delegated CTA/phone/WhatsApp
 * click tracking, accordions, scroll reveals, and the home page's
 * interactive pieces (hero load, count-ups, progress lines, service tabs).
 * Everything animates transform/opacity only and respects reduced motion.
 */
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    initHero();
    initCountUps();
    initProgressLines();
    initServices();
    initWhatsappTuck();
  });

  /* ---------- helpers ---------- */
  function onVisible(els, cb, opts) {
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { cb(el); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          cb(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, opts || { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- reveals ---------- */
  function initScrollReveal() {
    // Inner-page components get an automatic reveal; home sections opt in via [data-reveal].
    var auto = document.querySelectorAll(
      ".section-head, .card, .step, .compare-card, .philosophy-quote, .blog-card, .form-card"
    );
    auto.forEach(function (el, i) {
      if (!el.hasAttribute("data-reveal") && !el.closest("[data-reveal]")) {
        el.setAttribute("data-reveal", "up");
        el.style.transitionDelay = (i % 4) * 70 + "ms";
      }
    });
    var targets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
    if (reduceMotion) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    onVisible(targets, function (el) { el.classList.add("is-visible"); }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
  }

  /* ---------- hero ---------- */
  function initHero() {
    var hero = document.querySelector(".hero");
    if (hero) requestAnimationFrame(function () { hero.classList.add("is-loaded"); });

    var gcc = document.querySelector(".gcc");
    if (!gcc) return;
    onVisible([gcc], function () {
      gcc.classList.add("is-active");
      gcc.querySelectorAll(".gcc-bar span[data-w]").forEach(function (bar, i) {
        setTimeout(function () { bar.style.width = bar.getAttribute("data-w") + "%"; }, reduceMotion ? 0 : 700 + i * 120);
      });
    }, { threshold: 0.2 });
  }

  /* ---------- count-up numbers ---------- */
  function initCountUps() {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
    onVisible(els, function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
      var delay = parseInt(el.getAttribute("data-delay") || "0", 10);
      if (reduceMotion || isNaN(target)) {
        el.textContent = isNaN(target) ? el.textContent : target.toFixed(decimals);
        return;
      }
      var duration = 1600;
      setTimeout(function () {
        var start = null;
        function step(ts) {
          if (!start) start = ts;
          var t = Math.min((ts - start) / duration, 1);
          var eased = 1 - Math.pow(1 - t, 4);
          el.textContent = (target * eased).toFixed(decimals);
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }, delay);
    }, { threshold: 0.4 });
  }

  /* ---------- scroll-driven progress lines (about + process timeline) ---------- */
  function initProgressLines() {
    var blocks = Array.prototype.slice.call(document.querySelectorAll("[data-progress]"));
    if (!blocks.length) return;

    function update() {
      var vh = window.innerHeight;
      blocks.forEach(function (block) {
        var rect = block.getBoundingClientRect();
        // 0 when the block's top hits 80% of the viewport, 1 when its bottom reaches 55%.
        var startY = vh * 0.8;
        var endY = vh * 0.55;
        var total = rect.height + (startY - endY);
        var p = reduceMotion ? 1 : Math.min(Math.max((startY - rect.top) / total, 0), 1);
        block.style.setProperty("--p", p.toFixed(3));
        var items = block.querySelectorAll("[data-step]");
        items.forEach(function (item, i) {
          var threshold = items.length > 1 ? i / (items.length - 1) : 0;
          item.classList.toggle("is-lit", p >= threshold * 0.96 && p > 0);
        });
      });
    }

    var ticking = false;
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () { update(); ticking = false; });
      }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- services: tabs on desktop, accordion on mobile ---------- */
  function initServices() {
    var root = document.querySelector(".svc");
    if (!root) return;
    var items = Array.prototype.slice.call(root.querySelectorAll(".svc-item"));
    var mq = window.matchMedia("(max-width: 767px)");

    function activate(item, focus) {
      items.forEach(function (it) {
        var on = it === item;
        it.classList.toggle("is-active", on);
        var tab = it.querySelector(".svc-tab");
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.setAttribute("tabindex", on ? "0" : "-1");
        it.querySelector(".svc-panel").setAttribute("aria-hidden", on ? "false" : "true");
      });
      if (focus) item.querySelector(".svc-tab").focus();
    }

    function toggleAccordion(item) {
      var panel = item.querySelector(".svc-panel");
      var tab = item.querySelector(".svc-tab");
      var open = !item.classList.contains("is-open");
      items.forEach(function (it) {
        if (it !== item && it.classList.contains("is-open")) {
          it.classList.remove("is-open");
          it.querySelector(".svc-panel").style.maxHeight = null;
          it.querySelector(".svc-tab").setAttribute("aria-expanded", "false");
        }
      });
      item.classList.toggle("is-open", open);
      panel.style.maxHeight = open ? panel.scrollHeight + "px" : null;
      tab.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function applyMode() {
      items.forEach(function (it) {
        var tab = it.querySelector(".svc-tab");
        var panel = it.querySelector(".svc-panel");
        if (mq.matches) {
          root.removeAttribute("role");
          tab.removeAttribute("role");
          tab.removeAttribute("aria-selected");
          tab.removeAttribute("tabindex");
          tab.setAttribute("aria-expanded", it.classList.contains("is-open") ? "true" : "false");
          panel.removeAttribute("role");
          panel.removeAttribute("aria-hidden");
          panel.style.maxHeight = it.classList.contains("is-open") ? panel.scrollHeight + "px" : null;
        } else {
          root.setAttribute("role", "tablist");
          tab.setAttribute("role", "tab");
          tab.removeAttribute("aria-expanded");
          panel.setAttribute("role", "tabpanel");
          panel.style.maxHeight = null;
        }
      });
      if (!mq.matches) activate(items.filter(function (i) { return i.classList.contains("is-active"); })[0] || items[0]);
    }

    items.forEach(function (item, idx) {
      var tab = item.querySelector(".svc-tab");
      tab.addEventListener("click", function () {
        if (mq.matches) toggleAccordion(item);
        else activate(item);
      });
      tab.addEventListener("mouseenter", function () {
        if (!mq.matches && window.matchMedia("(hover: hover)").matches) activate(item);
      });
      tab.addEventListener("keydown", function (e) {
        if (mq.matches) return;
        var next = null;
        if (e.key === "ArrowRight") next = items[(idx + 1) % items.length];
        if (e.key === "ArrowLeft") next = items[(idx - 1 + items.length) % items.length];
        if (e.key === "Home") next = items[0];
        if (e.key === "End") next = items[items.length - 1];
        if (next) { e.preventDefault(); activate(next, true); }
      });
    });

    if (mq.addEventListener) mq.addEventListener("change", applyMode);
    else if (mq.addListener) mq.addListener(applyMode);
    applyMode();
  }

  /* ---------- keep the WhatsApp button off primary CTAs on mobile ---------- */
  function initWhatsappTuck() {
    var zones = Array.prototype.slice.call(document.querySelectorAll("[data-wa-tuck]"));
    if (!zones.length) return;
    // Only the band just above the bottom nav matters — that is where the button sits.
    function check() {
      var wa = document.querySelector(".whatsapp-float");
      if (!wa || window.innerWidth >= 768) { if (wa) wa.classList.remove("is-tucked"); return; }
      var band = window.innerHeight - 160;
      var hit = zones.some(function (z) {
        var r = z.getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > band;
      });
      wa.classList.toggle("is-tucked", hit);
    }
    window.addEventListener("scroll", check, { passive: true });
    setTimeout(check, 300);
  }

  /* ---------- FAQ accordion ---------- */
  function initAccordions() {
    document.querySelectorAll(".accordion-item").forEach(function (item, idx) {
      var trigger = item.querySelector(".accordion-trigger");
      var panel = item.querySelector(".accordion-panel");
      if (!trigger || !panel) return;
      var pid = panel.id || "acc-panel-" + idx;
      panel.id = pid;
      trigger.setAttribute("aria-controls", pid);
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
