/**
 * BrandMakingTractor — Header, mobile menu & footer partials.
 * Injected via JS so nav/footer markup lives in one place across every page
 * (no build step, no framework — just template strings + DOM injection).
 * Pages include a <div id="site-header"></div> and <div id="site-footer"></div>.
 */
(function () {
  var NAV_LINKS = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/faq", label: "FAQ" },
    { href: "/blog/", label: "Blog" },
    { href: "/contact", label: "Contact" }
  ];

  var WHATSAPP_NUMBER = "919791718488";
  var ARROW = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  document.documentElement.classList.add("js");

  function normalizedPath() {
    var path = window.location.pathname || "/";
    if (path !== "/" && path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return path;
  }

  function isActive(href) {
    var current = normalizedPath();
    if (href === "/blog/") return current.indexOf("/blog") === 0;
    if (href === "/services") return current === "/services" || current.indexOf("/services/") === 0;
    var hrefNorm = href !== "/" && href.endsWith("/") ? href.slice(0, -1) : href;
    return current === hrefNorm;
  }

  /**
   * logo.svg is a full lockup (icon + wordmark + tagline) on a white
   * background, which can't sit on the dark header. So the header crops just
   * the icon into a white tile and sets the name as live text beside it.
   */
  function renderLogo() {
    return (
      '<a href="/" class="logo-link" aria-label="BrandMakingTractor home">' +
      '<span class="brand-tile"><img src="/assets/images/logo-icon-96.webp" alt="" width="34" height="34" decoding="async"></span>' +
      '<span class="brand-word">Brand<b>Making</b>Tractor</span>' +
      "</a>"
    );
  }

  function renderNavLinks(withArrow) {
    return NAV_LINKS.map(function (link) {
      var active = isActive(link.href);
      return (
        '<a href="' + link.href + '"' + (active ? ' class="active" aria-current="page"' : "") + ">" +
        link.label + (withArrow ? ARROW : "") + "</a>"
      );
    }).join("");
  }

  function renderHeader() {
    return (
      '<header class="site-header" id="siteHeaderEl">' +
      '<div class="header-inner">' +
      renderLogo() +
      '<nav class="main-nav" aria-label="Primary">' + renderNavLinks(false) + "</nav>" +
      '<div class="header-actions">' +
      '<a href="/get-started" class="btn btn-primary desktop-only" data-cta="get_started_nav">Get Started' + ARROW + "</a>" +
      '<button type="button" class="hamburger" id="hamburgerBtn" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu">' +
      "<span></span><span></span><span></span>" +
      "</button>" +
      "</div>" +
      "</div>" +
      "</header>" +
      '<div class="mobile-menu" id="mobileMenu" aria-hidden="true">' +
      '<nav aria-label="Mobile">' + renderNavLinks(true) + "</nav>" +
      '<div class="mobile-menu-foot">' +
      "<p>Let&rsquo;s Grow Together</p>" +
      '<a href="/get-started" class="btn btn-primary btn-lg" data-cta="get_started_mobile_nav">Get Started' + ARROW + "</a>" +
      '<div class="mobile-menu-contact">' +
      '<a href="mailto:partnerships@brandmakingtractor.com" data-track-email>partnerships@brandmakingtractor.com</a>' +
      '<a href="tel:+' + WHATSAPP_NUMBER + '" data-track-phone>+91 97917 18488</a>' +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  var SOCIAL =
    '<div class="social-row">' +
    '<a href="https://www.facebook.com/profile.php?id=61593951004405" target="_blank" rel="noopener" aria-label="BrandMakingTractor on Facebook"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33V22c4.78-.79 8.44-4.94 8.44-9.94z"/></svg></a>' +
    '<a href="https://www.instagram.com/brandmakingtractor/" target="_blank" rel="noopener" aria-label="BrandMakingTractor on Instagram"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c2.7 0 3.05.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.5.5.9 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.07.06 1.42.06 4.12s-.01 3.05-.06 4.12c-.05 1.06-.22 1.79-.47 2.430a4.9 4.9 0 01-1.15 1.76c-.5.5-1.1.9-1.76 1.15-.64.25-1.37.42-2.43.47-1.07.05-1.42.06-4.12.06s-3.05-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 01-1.76-1.15 4.9 4.9 0 01-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.05 2 14.7 2 12s.01-3.05.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76A4.9 4.9 0 015.44 2.53c.64-.25 1.37-.42 2.43-.47C8.95 2.01 9.3 2 12 2zm0 5a5 5 0 100 10 5 5 0 000-10zm0 8.2a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm5.2-8.4a1.17 1.17 0 100-2.34 1.17 1.17 0 000 2.34z"/></svg></a>' +
    "</div>";

  function renderFooter() {
    var year = new Date().getFullYear();
    return (
      '<footer class="site-footer">' +
      '<div class="container">' +
      '<div class="footer-grid">' +
      '<div class="footer-brand">' +
      renderLogo() +
      "<p>Digital marketing and creative growth partner. Strategy, creative, performance and technology &mdash; measured by outcomes, not activity.</p>" +
      SOCIAL +
      "</div>" +
      '<div class="footer-col"><h5>Navigate</h5><ul>' +
      '<li><a href="/">Home</a></li>' +
      '<li><a href="/about">About</a></li>' +
      '<li><a href="/services">Services</a></li>' +
      '<li><a href="/faq">FAQ</a></li>' +
      '<li><a href="/contact">Contact</a></li>' +
      "</ul></div>" +
      '<div class="footer-col"><h5>Services</h5><ul>' +
      '<li><a href="/services/performance-marketing">Performance Marketing</a></li>' +
      '<li><a href="/services/seo-aeo-geo">SEO / AEO / GEO</a></li>' +
      '<li><a href="/services/content-marketing">Content Marketing</a></li>' +
      '<li><a href="/services/website-development">Website Development</a></li>' +
      '<li><a href="/services/branding">Branding</a></li>' +
      '<li><a href="/services/social-media-marketing">Social Media</a></li>' +
      '<li><a href="/services/market-research">Market Research</a></li>' +
      '<li><a href="/services/ugc-video">UGC Video</a></li>' +
      "</ul></div>" +
      '<div class="footer-col"><h5>Resources</h5><ul>' +
      '<li><a href="/blog/">Blog</a></li>' +
      '<li><a href="/faq">FAQ</a></li>' +
      '<li><a href="/get-started">Start a project</a></li>' +
      "</ul></div>" +
      '<div class="footer-col col-contact"><h5>Contact</h5><ul>' +
      '<li><a href="mailto:partnerships@brandmakingtractor.com" data-track-email>partnerships@brandmakingtractor.com</a></li>' +
      '<li><a href="tel:+' + WHATSAPP_NUMBER + '" data-track-phone>+91 97917 18488</a></li>' +
      '<li><a href="https://api.whatsapp.com/send?phone=' + WHATSAPP_NUMBER + '" target="_blank" rel="noopener" data-track-whatsapp>WhatsApp us</a></li>' +
      "</ul></div>" +
      "</div>" +
      '<svg class="footer-word" viewBox="0 0 1000 120" aria-hidden="true" focusable="false"><text x="0" y="98" font-size="118" textLength="1000" lengthAdjust="spacingAndGlyphs">BrandMakingTractor</text></svg>' +
      '<div class="footer-bottom">' +
      "<span>&copy; " + year + " BrandMakingTractor. All rights reserved.</span>" +
      // TODO: add Privacy Policy / Terms links here once those pages exist.
      '<div class="footer-legal"><a href="/contact">Contact</a><a href="/faq">FAQ</a></div>' +
      "</div>" +
      "</div>" +
      "</footer>"
    );
  }

  function renderWhatsappFloat() {
    return (
      '<a href="https://api.whatsapp.com/send?phone=' + WHATSAPP_NUMBER + '&text=' + encodeURIComponent("Hi BrandMakingTractor, I'd like to know more about your services.") + '" ' +
      'target="_blank" rel="noopener" class="whatsapp-float" aria-label="Chat with us on WhatsApp" data-track-whatsapp>' +
      '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.01 3C9.38 3 4 8.36 4 14.98c0 2.2.6 4.26 1.63 6.04L4 29l8.2-1.57a13 13 0 003.8.57h.01c6.63 0 12.01-5.36 12.01-11.98C28.02 8.36 22.64 3 16.01 3zm0 21.6c-1.94 0-3.75-.53-5.3-1.44l-.38-.22-4.87.93.94-4.75-.25-.4a9.550 9.550 0 01-1.5-5.14c0-5.3 4.36-9.6 9.7-9.6 2.6 0 5.04 1 6.870 2.830a9.5 9.5 0 012.85 6.79c0 5.3-4.37 9.6-9.7 9.6zm5.32-7.17c-.29-.15-1.72-.85-1.98-.94-.27-.1-.46-.15-.66.14-.2.3-.75.94-.92 1.13-.17.2-.34.22-.63.08-.29-.15-1.22-.45-2.33-1.44-.86-.77-1.44-1.71-1.6-2-.17-.3-.02-.46.13-.6.13-.13.29-.34.44-.5.15-.18.2-.3.29-.5.1-.19.05-.37-.02-.51-.08-.15-.66-1.6-.91-2.19-.24-.58-.48-.5-.66-.5h-.56c-.19 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.42 0 1.43 1.04 2.82 1.190 3.010.15.2 2.05 3.13 4.96 4.39.7.3 1.24.48 1.66.61.7.22 1.34.19 1.84.12.56-.09 1.72-.7 1.96-1.38.24-.68.24-1.26.17-1.38-.07-.13-.26-.2-.55-.34z"/></svg>' +
      "</a>"
    );
  }

  function renderBackToTop() {
    return (
      '<button type="button" class="back-to-top" id="backToTop" aria-label="Back to top">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>' +
      "</button>"
    );
  }

  /* Thumb-friendly bottom navigation (mobile only, hidden by CSS above 767px). */
  function renderTabbar() {
    var icon = function (d) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
    };
    var tabs = [
      { href: "/", label: "Home", d: '<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10v9h4v-5h4v5h4v-9"/>' },
      { href: "/services", label: "Services", d: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>' },
      { href: "/get-started", label: "Start", cta: true, d: '<path d="M5 12h14M13 6l6 6-6 6"/>' },
      { href: "/blog/", label: "Blog", d: '<path d="M5 4h11l3 3v13H5z"/><path d="M9 10h6M9 14h6"/>' },
      { href: "/contact", label: "Contact", d: '<path d="M21 11.5a8.4 8.4 0 01-12.4 7.4L3 21l2.1-5.5A8.4 8.4 0 1121 11.5z"/>' }
    ];
    return (
      '<nav class="tabbar" aria-label="Quick navigation"><div class="tabbar-inner">' +
      tabs.map(function (t) {
        var active = !t.cta && isActive(t.href);
        if (t.cta) {
          return '<a href="' + t.href + '" class="tab tab-cta" data-cta="get_started_tabbar"><span class="tab-cta-btn">' + icon(t.d) + "</span><span>" + t.label + "</span></a>";
        }
        return '<a href="' + t.href + '" class="tab' + (active ? " active" : "") + '"' + (active ? ' aria-current="page"' : "") + ">" + icon(t.d) + "<span>" + t.label + "</span></a>";
      }).join("") +
      "</div></nav>"
    );
  }

  function initMobileMenu() {
    var btn = document.getElementById("hamburgerBtn");
    var menu = document.getElementById("mobileMenu");
    if (!btn || !menu) return;

    function setOpen(open) {
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", open ? "false" : "true");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("menu-open", open);
      if (open) {
        var first = menu.querySelector("a");
        if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 250);
      }
    }

    btn.addEventListener("click", function () {
      setOpen(!menu.classList.contains("is-open"));
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        setOpen(false);
        btn.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1024 && menu.classList.contains("is-open")) setOpen(false);
    });
  }

  function mount() {
    var headerEl = document.getElementById("site-header");
    var footerEl = document.getElementById("site-footer");
    if (headerEl) headerEl.innerHTML = renderHeader();
    if (footerEl) footerEl.innerHTML = renderFooter();

    if (!document.querySelector(".whatsapp-float")) {
      document.body.insertAdjacentHTML("beforeend", renderWhatsappFloat());
    }
    if (!document.querySelector(".back-to-top")) {
      document.body.insertAdjacentHTML("beforeend", renderBackToTop());
    }
    if (!document.querySelector(".tabbar") && !/^\/blog\/(login|dashboard|editor)/.test(normalizedPath())) {
      document.body.insertAdjacentHTML("beforeend", renderTabbar());
    }

    var backToTop = document.getElementById("backToTop");
    var headerBar = document.getElementById("siteHeaderEl");
    var ticking = false;
    function onScroll() {
      var y = window.scrollY;
      if (headerBar) headerBar.classList.toggle("is-scrolled", y > 12);
      if (backToTop) backToTop.classList.toggle("is-visible", y > 640);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();

    if (backToTop) {
      backToTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    initMobileMenu();
    requestAnimationFrame(function () { document.documentElement.classList.add("is-ready"); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
