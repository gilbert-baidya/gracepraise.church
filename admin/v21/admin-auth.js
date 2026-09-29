(() => {
  'use strict';

  const ADMIN_APP_NAME = 'gpbc-v21-admin';

  // This is the public browser Firebase configuration for the dedicated V21 project.
  // It contains no Admin SDK credentials, database writes, or private secrets.
  const FIREBASE_CONFIG = Object.freeze({
    apiKey: 'AIzaSyDVk2zgUvrJ9la3ovbI6z8NhyvB1_VYTjI',
    authDomain: 'admin-gpbc-website.firebaseapp.com',
    projectId: 'admin-gpbc-website',
    storageBucket: 'admin-gpbc-website.firebasestorage.app',
    messagingSenderId: '935536706617',
    appId: '1:935536706617:web:5d44b8785e5dd0c99eb9e8',
    measurementId: 'G-0LXZHC0CLP'
  });

  let auth = null;
  let unsubscribe = null;

  function getFirebaseAuth() {
    if (typeof firebase === 'undefined' || typeof firebase.initializeApp !== 'function') {
      throw new Error('Firebase Auth SDK is unavailable.');
    }

    const existingApp = Array.isArray(firebase.apps)
      ? firebase.apps.find((app) => app.name === ADMIN_APP_NAME)
      : null;
    const app = existingApp || firebase.initializeApp(FIREBASE_CONFIG, ADMIN_APP_NAME);
    auth = auth || app.auth();
    return auth;
  }

  function friendlyAuthError(error) {
    const code = error && error.code;
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'We could not sign you in with those details. Check your email and password and try again.';
    }
    if (code === 'auth/too-many-requests' || code === 'auth/network-request-failed') {
      return 'Sign-in is temporarily unavailable. Please wait a moment and try again.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Admin email sign-in is not enabled for this Firebase project yet.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'This Admin domain is not authorized for Firebase sign-in yet.';
    }
    if (code === 'auth/invalid-api-key' || code === 'auth/app-not-authorized') {
      return 'The Admin sign-in service is not configured for this site yet.';
    }
    return 'Sign-in could not be completed. Please try again or contact a church administrator.';
  }

  async function resolveAdminAuthorization(user) {
    if (!user) {
      return { isAdmin: false, method: 'none', claims: {} };
    }

    try {
      const tokenResult = await user.getIdTokenResult(true);
      const claims = tokenResult.claims || {};
      // Keep the client gate identical to the Firestore rules. A friendly
      // frontend alias must never imply backend access that the rules reject.
      const isAdmin = claims.admin === true;

      return {
        isAdmin,
        method: 'Firebase Auth custom claim',
        claims,
        claimMissing: !isAdmin
      };
    } catch (error) {
      console.warn('[GPBC Admin] Authorization check unavailable.', error);
      return {
        isAdmin: false,
        method: 'Firebase Auth custom claim',
        claims: {},
        error: 'Authorization could not be verified.'
      };
    }
  }

  function subscribe(onStateChange) {
    if (typeof onStateChange !== 'function') return () => {};

    try {
      const currentAuth = getFirebaseAuth();
      if (unsubscribe) unsubscribe();

      unsubscribe = currentAuth.onAuthStateChanged(async (user) => {
        if (!user) {
          onStateChange({ status: 'signed-out', user: null, authorization: null });
          return;
        }

        onStateChange({ status: 'checking', user, authorization: null });
        const authorization = await resolveAdminAuthorization(user);
        onStateChange({
          status: authorization.isAdmin ? 'authorized' : 'unauthorized',
          user,
          authorization
        });
      }, (error) => {
        console.error('[GPBC Admin] Auth state listener failed.', error);
        onStateChange({
          status: 'error',
          user: null,
          authorization: null,
          error: 'The sign-in service could not be initialized.'
        });
      });

      return unsubscribe;
    } catch (error) {
      console.error('[GPBC Admin] Firebase initialization failed.', error);
      onStateChange({
        status: 'error',
        user: null,
        authorization: null,
        error: 'The sign-in service is unavailable on this page.'
      });
      return () => {};
    }
  }

  async function signIn(email, password) {
    const currentAuth = getFirebaseAuth();
    try {
      const result = await currentAuth.signInWithEmailAndPassword(email, password);
      return result.user;
    } catch (error) {
      const friendlyError = new Error(friendlyAuthError(error));
      friendlyError.code = error && error.code;
      throw friendlyError;
    }
  }

  async function signOut() {
    const currentAuth = getFirebaseAuth();
    await currentAuth.signOut();
  }

  window.GPBCAdminAuth = Object.freeze({
    subscribe,
    signIn,
    signOut,
    friendlyAuthError,
    getFirebaseAuth
  });
})();
