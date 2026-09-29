(() => {
  'use strict';

  const FIREBASE_CONFIG = Object.freeze({
    apiKey: 'AIzaSyDVk2zgUvrJ9la3ovbI6z8NhyvB1_VYTjI',
    authDomain: 'admin-gpbc-website.firebaseapp.com',
    projectId: 'admin-gpbc-website',
    storageBucket: 'admin-gpbc-website.firebasestorage.app',
    messagingSenderId: '935536706617',
    appId: '1:935536706617:web:5d44b8785e5dd0c99eb9e8',
    measurementId: 'G-0LXZHC0CLP'
  });
  // Reuse the Admin app name so Firebase Auth persistence is shared with the
  // authenticated Admin Control Center tab. The Preview tab still performs
  // its own admin-claim check before invoking the callable backend.
  const APP_NAME = 'gpbc-v21-admin';
  const REGION = 'us-central1';
  const listeners = new Set();
  let auth = null;
  let functions = null;
  let monitor = null;
  let sdkPromise = null;

  function notifyAuthLost() {
    listeners.forEach((listener) => listener());
    if (typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('gpbc-preview-auth-lost'));
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.gpbcLoaded === 'true') {
          resolve();
          return;
        }
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error('preview-sdk-unavailable')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.addEventListener('load', () => {
        script.dataset.gpbcLoaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error('preview-sdk-unavailable')), { once: true });
      document.head.appendChild(script);
    });
  }

  async function ensureSdk() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = (async () => {
      const base = 'https://www.gstatic.com/firebasejs/9.22.0';
      await loadScript(`${base}/firebase-app-compat.js`);
      await loadScript(`${base}/firebase-auth-compat.js`);
      await loadScript(`${base}/firebase-functions-compat.js`);
      if (!window.firebase) throw new Error('preview-sdk-unavailable');
      let app;
      try {
        app = firebase.app(APP_NAME);
      } catch (error) {
        app = firebase.initializeApp(FIREBASE_CONFIG, APP_NAME);
      }
      auth = app.auth();
      functions = typeof app.functions === 'function'
        ? app.functions(REGION)
        : firebase.functions(app, REGION);
      auth.onIdTokenChanged(async (user) => {
        if (!user) {
          notifyAuthLost();
          return;
        }
        try {
          const token = await user.getIdTokenResult();
          if (token.claims?.admin !== true) notifyAuthLost();
        } catch (error) {
          notifyAuthLost();
        }
      });
      return { auth, functions };
    })();
    return sdkPromise;
  }

  function waitForUser() {
    if (auth.currentUser) return Promise.resolve(auth.currentUser);
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('preview-auth-required'));
        }
      }, 8000);
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        if (typeof unsubscribe === 'function') unsubscribe();
        if (user) resolve(user);
        else reject(new Error('preview-auth-required'));
      });
    });
  }

  async function load() {
    await ensureSdk();
    const user = await waitForUser();
    const token = await user.getIdTokenResult();
    if (token.claims?.admin !== true) throw new Error('preview-admin-required');
    const response = await functions.httpsCallable('getWebsiteDraftPreview')({});
    if (!response || !response.data) throw new Error('preview-response-empty');
    if (!monitor) {
      monitor = window.setInterval(async () => {
        if (!auth.currentUser) {
          notifyAuthLost();
          return;
        }
        try {
          const currentToken = await auth.currentUser.getIdTokenResult(true);
          if (currentToken.claims?.admin !== true) notifyAuthLost();
        } catch (error) {
          notifyAuthLost();
        }
      }, 60000);
    }
    return response.data;
  }

  function onAuthLost(listener) {
    if (typeof listener === 'function') listeners.add(listener);
    return () => listeners.delete(listener);
  }

  window.GPBCWebsitePreview = Object.freeze({ load, onAuthLost });
})();
