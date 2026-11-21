(() => {
  'use strict';
  if (window.GPBCLanguage) return;

  const root = document.documentElement;
  const valid = value => value === 'en' || value === 'bn';
  const originalTitle = document.title;
  const identity = location.pathname.replace(/\/+$/, '').replace(/\.html$/, '') || '/index';
  const titles = {
    '/index': ['Welcome', 'স্বাগতম'],
    '/plan-visit': ['Plan Your Visit', 'আপনার প্রথম রবিবার'],
    '/gallery': ['Photo Gallery', 'ছবির গ্যালারি']
  };
  let current;
  let scheduled = false;
  let syncingContent = false;
  const contentRequests = new Map();

  function savedLanguage() {
    try { return localStorage.getItem('gpbc-language'); } catch { return null; }
  }

  function resolve() {
    const query = new URL(location.href).searchParams.get('lang');
    const saved = savedLanguage();
    return valid(query) ? query : valid(saved) ? saved : 'en';
  }

  function setAttribute(element, name, value) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }

  function languageRow() {
    const row = document.createElement('div');
    row.className = 'site-language-row';
    row.innerHTML = '<span class="site-language-location" lang="en" data-lang="en">San Bernardino, CA</span><span class="site-language-location" lang="bn" data-lang="bn">সান বার্নার্ডিনো</span><div class="site-language-choices" role="group" aria-label="Site locale / সাইটের ভাষা"><a href="?lang=en#gpbc-language-en" data-site-language="en" lang="en">English</a><a href="?lang=bn#gpbc-language-bn" data-site-language="bn" lang="bn">বাংলা</a></div>';
    return row;
  }

  function update() {
    root.classList.add('site-language-ready');
    setAttribute(root, 'lang', current);
    if (!document.querySelector('.site-language-row')) {
      const header = document.querySelector('body > header, #site-header header');
      if (header) header.append(languageRow());
    }
    const translatedTitle = titles[identity];
    const routeHeading = document.querySelector('#gpbc-route-state:not([hidden]) h1')?.textContent;
    const title = routeHeading ? `${routeHeading} | Grace and Praise Bangladeshi Church${current === 'bn' ? ' · বাংলা' : ''}` : current === 'en' ? originalTitle : translatedTitle
      ? `${translatedTitle[current === 'bn' ? 1 : 0]} | Grace and Praise Bangladeshi Church`
      : `${originalTitle}${current === 'bn' ? ' · বাংলা' : ''}`;
    if (document.title !== title) document.title = title;
    document.querySelectorAll('[data-lang="en"], [data-lang="bn"]').forEach(element => {
      if (!element.hasAttribute('lang')) setAttribute(element, 'lang', element.dataset.lang);
      const active = element.dataset.lang === current;
      if (element.hidden === active) element.hidden = !active;
      if (!active && element.style.display !== 'none') element.style.setProperty('display', 'none', 'important');
      if (active && element.style.display === 'none') element.style.removeProperty('display');
    });
    document.querySelectorAll('[data-site-language]').forEach(link => {
      const selected = link.dataset.siteLanguage;
      setAttribute(link, 'role', 'button');
      setAttribute(link, 'aria-pressed', String(selected === current));
      const url = new URL(location.href);
      url.searchParams.set('lang', selected);
      setAttribute(link, 'href', `${url.pathname}${url.search}${url.hash}`);
    });
    document.querySelectorAll('[data-label-en][data-label-bn]').forEach(element => {
      setAttribute(element, 'aria-label', element.dataset[current === 'bn' ? 'labelBn' : 'labelEn']);
      setAttribute(element, 'lang', current);
    });
    document.querySelectorAll('main:not([data-site-bilingual]), main[data-site-bilingual] > section:not(.visit-essentials), .site-footer, body > header, #site-header header, .admin-header, header .nav-links').forEach(element => {
      if (!element.hasAttribute('lang')) setAttribute(element, 'lang', 'en');
    });
    if (!syncingContent) {
      syncingContent = true;
      for (const prefix of ['lang', 'cdLang']) {
        const control = document.getElementById(`${prefix}${current === 'bn' ? 'Bn' : 'En'}`);
        if (control && !control.disabled && contentRequests.get(prefix) !== current) {
          contentRequests.set(prefix, current);
          if (!control.classList.contains('active') && !control.classList.contains('is-active')) control.click();
        }
      }
      syncingContent = false;
    }
    document.querySelectorAll('#verseTextBn, #reflectionTextBn, #prayerTextBn').forEach(element => {
      if (!element.hasAttribute('lang')) setAttribute(element, 'lang', 'bn');
    });
    document.querySelectorAll('a[href]:not([data-site-language]):not([download])').forEach(link => {
      const raw = link.getAttribute('href');
      if (!raw || raw.startsWith('#')) return;
      let url;
      try { url = new URL(raw, location.href); } catch { return; }
      if (!/^https?:$/.test(url.protocol)) return;
      if (url.origin !== location.origin || /\.[^/]+$/.test(url.pathname) && !/\.html$/.test(url.pathname)) return;
      url.searchParams.set('lang', current);
      setAttribute(link, 'href', `${url.pathname}${url.search}${url.hash}`);
    });
    const themeButton = document.getElementById('darkModeToggle');
    if (themeButton) {
      const dark = root.dataset.theme === 'dark';
      const label = current === 'bn' ? dark ? 'দিনের মোড চালু করুন' : 'রাতের মোড চালু করুন' : dark ? 'Switch to Day mode' : 'Switch to Night mode';
      setAttribute(themeButton, 'aria-label', label);
      setAttribute(themeButton, 'title', label);
      setAttribute(themeButton, 'lang', current);
    }
  }

  function switchLanguage(language, historyChange = true) {
    if (!valid(language)) return;
    const x = scrollX;
    const y = scrollY;
    if (historyChange && language !== current) {
      const previous = new URL(location.href);
      if (!valid(previous.searchParams.get('lang'))) {
        previous.searchParams.set('lang', current);
        history.replaceState(history.state, '', previous);
      }
      const next = new URL(location.href);
      next.searchParams.set('lang', language);
      history.pushState(null, '', next);
    }
    current = language;
    try { localStorage.setItem('gpbc-language', language); } catch { /* Query state remains authoritative. */ }
    update();
    window.dispatchEvent(new CustomEvent('gpbc:languagechange', { detail: { language } }));
    window.scrollTo({ left: x, top: y, behavior: 'instant' });
  }

  window.GPBCLanguage = { get language() { return current; }, set: switchLanguage };

  function boot() {
    current = resolve();
    update();
    document.addEventListener('click', event => {
      const contentLanguage = event.target.closest?.('#langEn, #langBn, #cdLangEn, #cdLangBn');
      if (contentLanguage && !syncingContent) {
        switchLanguage(contentLanguage.id.endsWith('Bn') ? 'bn' : 'en');
        return;
      }
      const link = event.target.closest?.('[data-site-language]');
      if (!link || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      switchLanguage(link.dataset.siteLanguage);
    });
    document.addEventListener('keydown', event => {
      if (event.key === ' ' && event.target.matches('[data-site-language]')) {
        event.preventDefault();
        event.target.click();
      }
    });
    window.addEventListener('popstate', () => switchLanguage(resolve(), false));
    window.addEventListener('pageshow', () => switchLanguage(resolve(), false));
    document.addEventListener('DEVOTION_RENDER_COMPLETE', () => {
      contentRequests.delete('lang');
      update();
    });
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => { scheduled = false; update(); });
    }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'lang', 'data-theme', 'aria-label'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
