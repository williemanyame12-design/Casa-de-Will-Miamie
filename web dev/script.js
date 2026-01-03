document.addEventListener('DOMContentLoaded', function () {
  const header = document.querySelector('.site-header');
  const maxScroll = 220; // px at which header becomes fully solid
  const shrinkThreshold = 0.22; // fraction of maxScroll at which header enters compact mode

  // Header transparency and shrink logic applies to all pages
  if (header) {
    function updateHeader() {
      const y = window.scrollY || window.pageYOffset || 0;
      const alpha = 1 - Math.min(y / maxScroll, 1);
      header.style.setProperty('--header-alpha', alpha.toFixed(3));

      // add/remove scrolled class when past the shrink threshold
      if (alpha < shrinkThreshold) header.classList.add('scrolled'); else header.classList.remove('scrolled');
    }

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('resize', updateHeader);
  }
  // No floating scroll controls: only header transparency behavior kept.
  // --- Center hash targets instead of letting the browser jump them to the top ---
  function scrollToHashCentered(hash, smooth = true) {
    if (!hash) return;
    const id = hash.startsWith('#') ? hash.slice(1) : hash;
    const el = document.getElementById(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const elCenter = rect.top + window.pageYOffset + rect.height / 2;
    const viewportCenter = window.innerHeight / 2;
    const scrollY = Math.max(elCenter - viewportCenter, 0);
    try {
      window.scrollTo({ top: scrollY, behavior: smooth ? 'smooth' : 'auto' });
    } catch (err) {
      // fallback for older browsers
      window.scrollTo(0, scrollY);
    }
  }


  // Prevent browser from automatically restoring scroll position on history navigation
  if ('scrollRestoration' in history) {
    try { history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
  }

  // If the page loaded with a hash (e.g., linking from another page), recenter it on ALL pages.
  window.addEventListener('load', function () {
    if (location.hash) {
      setTimeout(function () { scrollToHashCentered(location.hash, true); }, 250);
    }
  });

  // Re-center when the hash changes (back/forward or in-page links)
  window.addEventListener('hashchange', function () { scrollToHashCentered(location.hash, true); expandServicePanel(location.hash); });

  // Intercept same-page anchor clicks so we can center smoothly instead of jumping
  // (do NOT mark this listener as passive because we call preventDefault)
  document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';

    // Only handle same-page hash links (e.g. `#services`)
    if (href.startsWith('#')) {
      e.preventDefault();
      history.pushState(null, '', href);
      scrollToHashCentered(href, true);
      // update active state for header links on same-page navigation
      setActiveNav();
      return;
    }
    // For non-hash links (including cross-page links with hashes), allow normal navigation.
  });

  // Highlight the current page's nav link using a simple basename comparison.
  function setActiveNav() {
    const links = document.querySelectorAll('.site-header nav a');
    const getBasename = (p) => {
      const parts = String(p || '').split('/').filter(Boolean);
      return parts.length ? parts[parts.length - 1] : 'index.html';
    };
    const currentBase = getBasename(location.pathname);
    links.forEach(a => {
      a.classList.remove('active');
      try {
        const url = new URL(a.getAttribute('href'), location.href);
        const linkBase = getBasename(url.pathname);
        if (linkBase === currentBase) a.classList.add('active');
      } catch (err) {
        // ignore malformed URLs
      }
    });
  }

  // Run once initially and also when navigating history
  setActiveNav();
  window.addEventListener('popstate', setActiveNav);
  
  // --- Service panel expand/collapse helpers (services page) ---
  function closeAllPanels() {
    const opened = document.querySelectorAll('.service-panel.open');
    opened.forEach(p => {
      p.classList.remove('open');
      const summary = p.querySelector('.service-summary');
      if (summary) summary.setAttribute('aria-expanded', 'false');
    });
  }

  function openPanel(panel, center = true) {
    if (!panel) return;
    // If already open, keep it open (do nothing)
    if (panel.classList.contains('open')) return;
    // Close others so only one is open at once
    closeAllPanels();
    panel.classList.add('open');
    const summary = panel.querySelector('.service-summary');
    if (summary) summary.setAttribute('aria-expanded', 'true');
    if (center) scrollToHashCentered('#' + panel.id, true);
  }

  function setupServicePanels() {
    const panels = document.querySelectorAll('.service-panel');
    panels.forEach(panel => {
      const summary = panel.querySelector('.service-summary');
      if (!summary) return;
      // click opens the panel (accordion behavior)
      summary.addEventListener('click', function () { openPanel(panel, true); });
      // keyboard support: Enter/Space to open
      summary.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openPanel(panel, true);
        }
      });
    });
    // Ensure only one panel is open on init: if multiple have .open, keep the first
    const initiallyOpen = document.querySelector('.service-panel.open');
    if (initiallyOpen) {
      // close all others
      panels.forEach(p => { if (p !== initiallyOpen) p.classList.remove('open'); });
      // ensure aria-expanded attributes match
      panels.forEach(p => {
        const s = p.querySelector('.service-summary');
        if (s) s.setAttribute('aria-expanded', p === initiallyOpen ? 'true' : 'false');
      });
    } else {
      // if none marked open, open the first panel by default
      if (panels[0]) {
        openPanel(panels[0], false);
      }
    }
  }

  function expandServicePanel(hash) {
    if (!hash) return;
    const id = hash.startsWith('#') ? hash.slice(1) : hash;
    const panel = document.getElementById(id);
    if (!panel) return;
    openPanel(panel, true);
  }

  // If we are on the services page, initialize panel toggles and open any hash target
  if (document.body && document.querySelector('.service-panel')) {
    setupServicePanels();
    if (location.hash) {
      // ensure expand runs after load/jump override
      window.addEventListener('load', function () { setTimeout(function () { expandServicePanel(location.hash); }, 260); });
    }
  }
});
