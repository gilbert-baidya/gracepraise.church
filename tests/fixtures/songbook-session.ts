import type { Page } from '@playwright/test';

export async function mockSongbookSession(page: Page, signedIn = true, delay = 0) {
  await page.route('https://www.gstatic.com/firebasejs/9.22.0/firebase-*-compat.js', route => {
    const url = route.request().url();
    if (!url.endsWith('/firebase-app-compat.js')) return route.fulfill({ contentType: 'text/javascript', body: '' });
    return route.fulfill({ contentType: 'text/javascript', body: `
      (() => {
        const listeners = [];
        const key = 'gpbc-test-songbook-user';
        if (localStorage.getItem(key) === null) localStorage.setItem(key, '${signedIn}');
        const user = { uid: 'test-member', displayName: 'Test Member', email: 'member@example.test' };
        const session = {
          get currentUser() { return localStorage.getItem(key) === 'true' ? user : null; },
          onAuthStateChanged(callback) {
            listeners.push(callback);
            setTimeout(() => callback(session.currentUser), ${delay});
            return () => listeners.splice(listeners.indexOf(callback), 1);
          },
          async signInWithPopup() {
            localStorage.setItem(key, 'true');
            listeners.forEach(callback => callback(user));
            return { user };
          },
          async signOut() {
            localStorage.setItem(key, 'false');
            listeners.forEach(callback => callback(null));
          }
        };
        addEventListener('storage', event => {
          if (event.key === key) listeners.forEach(callback => callback(session.currentUser));
        });
        const auth = () => session;
        auth.GoogleAuthProvider = class {};
        window.firebase = {
          apps: [], initializeApp(config) { this.apps.push({ options: config }); },
          auth,
          database: () => ({ ref: () => ({ orderByChild: () => ({ once: (_, callback) => callback({ forEach() {} }) }) }) })
        };
      })();
    ` });
  });
}

export async function useEmulatedSongbookAuth(page: Page) {
  const emulator = process.env.SONGBOOK_AUTH_EMULATOR ?? 'http://127.0.0.1:9198';
  await page.route('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js', async route => {
    const response = await route.fetch();
    const sdk = await response.text();
    await route.fulfill({ response, body: sdk + `
      (() => {
        const original = firebase.auth;
        let connected = false;
        function emulatedAuth(...args) {
          const auth = original(...args);
          if (!connected) {
            auth.useEmulator(${JSON.stringify(emulator)}, { disableWarnings: true });
            connected = true;
          }
          return auth;
        }
        Object.assign(emulatedAuth, original);
        firebase.auth = emulatedAuth;
      })();
    ` });
  });
  await page.route('https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js', route =>
    route.fulfill({ contentType: 'text/javascript', body: `
      firebase.database = () => ({
        ref: () => ({ orderByChild: () => ({ once: (_, callback) => callback({ forEach() {} }) }) })
      });
    ` }));
}
