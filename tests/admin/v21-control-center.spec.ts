import { test, expect, type Page } from '@playwright/test';

type HarnessOptions = {
  adminClaim?: boolean;
  errorCode?: string;
};

function firebaseHarness(options: HarnessOptions = {}) {
  const settings = { adminClaim: true, errorCode: '', ...options };
  const source = String.raw`(function (settings) {
    const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
    const store = {
      docs: Object.create(null),
      revisions: [],
      audits: [],
      calls: [],
      counter: 0,
      now() {
        this.counter += 1;
        return new Date(1700000000000 + this.counter * 1000).toISOString();
      }
    };
    const user = {
      uid: 'browser-admin-uid',
      email: 'admin@example.test',
      displayName: 'Browser Admin',
      async getIdTokenResult() {
        return { claims: settings.adminClaim ? { admin: true, email: this.email } : {} };
      }
    };
    const auth = {
      currentUser: user,
      listeners: [],
      onAuthStateChanged(callback) {
        this.listeners.push(callback);
        setTimeout(() => callback(this.currentUser), 0);
        return () => {};
      },
      async signInWithEmailAndPassword() { return { user: this.user }; },
      async signOut() {
        this.currentUser = null;
        this.listeners.forEach((callback) => callback(null));
      }
    };
    auth.user = user;

    function resultFor(collection, id) {
      const value = store.docs[collection + '/' + id];
      return { exists: Boolean(value), data: () => clone(value) };
    }

    function queryFor(collection) {
      return {
        orderBy() { return this; },
        limit() { return this; },
        async get() {
          const values = collection === 'websiteControlAudit' ? store.audits : store.revisions;
          return { docs: values.slice().reverse().map((value) => ({ id: value.id, data: () => clone(value) })) };
        }
      };
    }

    const firestore = {
      collection(collection) {
        return {
          doc(id) {
            return {
              async get() { return resultFor(collection, id); }
            };
          },
          ...queryFor(collection)
        };
      }
    };

    function changedFeatures(previous, next) {
      return Object.keys(next).filter((id) => (previous?.[id]?.state || 'LIVE') !== (next?.[id]?.state || 'LIVE'));
    }

    function appendAudit(action, fromRevision, toRevision, changed) {
      store.audits.push({
        id: 'audit-' + store.counter,
        action,
        uid: user.uid,
        userEmail: user.email,
        timestamp: store.now(),
        fromRevision,
        toRevision,
        changedFeatures: changed
      });
    }

    function appendRevision(source, action, revision, previousRevision, features) {
      store.revisions.push({
        id: 'revision-' + store.counter,
        schemaVersion: 1,
        status: 'snapshot',
        source,
        action,
        features: clone(features),
        revision,
        previousRevision,
        createdAt: store.now(),
        createdBy: user.uid,
        actorEmail: user.email
      });
      return store.revisions[store.revisions.length - 1];
    }

    function callTrusted(name, payload) {
      store.calls.push({ name, payload: clone(payload) });
      return async () => {
        if (settings.errorCode) {
          const error = new Error('The trusted Admin backend denied this operation.');
          error.code = 'functions/' + settings.errorCode;
          throw error;
        }
        if (name === 'saveWebsiteDraft') {
          const existing = store.docs['websiteControl/draft'];
          const currentRevision = existing?.revision || 0;
          if (currentRevision !== payload.expectedRevision) {
            const error = new Error('This configuration changed in another session.');
            error.code = 'functions/aborted';
            throw error;
          }
          const changed = changedFeatures(existing?.features, payload.config.features);
          if (existing && changed.length === 0) return { status: 'unchanged', revision: currentRevision };
          const nextRevision = currentRevision + 1;
          const timestamp = store.now();
          store.docs['websiteControl/draft'] = {
            schemaVersion: 1,
            status: 'draft',
            features: clone(payload.config.features),
            createdAt: existing?.createdAt || timestamp,
            createdBy: existing?.createdBy || user.uid,
            updatedAt: timestamp,
            updatedBy: user.uid,
            revision: nextRevision
          };
          appendRevision('draft', existing ? 'DRAFT_UPDATED' : 'DRAFT_CREATED', nextRevision, currentRevision, payload.config.features);
          appendAudit(existing ? 'DRAFT_UPDATED' : 'DRAFT_CREATED', currentRevision, nextRevision, changed.length ? changed : Object.keys(payload.config.features));
          return { status: 'saved', revision: nextRevision, changedFeatures: changed, dependencyImpacts: [] };
        }
        if (name === 'validateWebsiteDraftForPublish') {
          const draft = store.docs['websiteControl/draft'];
          if (!draft || draft.revision !== payload.expectedDraftRevision) {
            const error = new Error('This Draft changed in another session.');
            error.code = 'functions/aborted';
            throw error;
          }
          return { revision: draft.revision, changedFeatures: [], dependencyImpacts: [], publicIntegration: false };
        }
        if (name === 'publishWebsiteConfiguration') {
          const draft = store.docs['websiteControl/draft'];
          if (!draft || draft.revision !== payload.expectedDraftRevision) {
            const error = new Error('This Draft changed in another session.');
            error.code = 'functions/aborted';
            throw error;
          }
          const previous = store.docs['websiteControl/published'];
          const revision = (previous?.revision || 0) + 1;
          store.docs['websiteControl/published'] = {
            schemaVersion: 1,
            status: 'published',
            features: clone(draft.features),
            revision,
            publishedAt: store.now(),
            publishedBy: user.uid,
            sourceDraftRevision: draft.revision
          };
          const changed = changedFeatures(previous?.features, draft.features);
          appendRevision('published', 'PUBLISHED', revision, previous?.revision || 0, draft.features);
          appendAudit('PUBLISHED', previous?.revision || 0, revision, changed);
          return { status: 'published-storage-only', revision, sourceDraftRevision: draft.revision, changedFeatures: changed, dependencyImpacts: [], publicIntegration: false };
        }
        if (name === 'restoreWebsiteRevision') {
          const selected = store.revisions.find((revision) => revision.id === payload.revisionId);
          const existing = store.docs['websiteControl/draft'];
          const currentRevision = existing?.revision || 0;
          if (!selected || selected.source !== 'draft') {
            const error = new Error('That revision is unavailable.');
            error.code = 'functions/not-found';
            throw error;
          }
          if (currentRevision !== payload.expectedRevision) {
            const error = new Error('This configuration changed in another session.');
            error.code = 'functions/aborted';
            throw error;
          }
          const revision = currentRevision + 1;
          const timestamp = store.now();
          const changed = changedFeatures(existing?.features, selected.features);
          store.docs['websiteControl/draft'] = {
            schemaVersion: 1,
            status: 'draft',
            features: clone(selected.features),
            createdAt: existing?.createdAt || timestamp,
            createdBy: existing?.createdBy || user.uid,
            updatedAt: timestamp,
            updatedBy: user.uid,
            revision
          };
          appendRevision('draft', 'DRAFT_RESTORED', revision, currentRevision, selected.features);
          appendAudit('DRAFT_RESTORED', currentRevision, revision, changed);
          return { status: 'restored', revision, changedFeatures: changed, dependencyImpacts: [] };
        }
        throw new Error('Unknown trusted function: ' + name);
      };
    }

    const app = {
      name: 'gpbc-v21-admin',
      auth() { return auth; },
      firestore() { return firestore; },
      functions() { return { httpsCallable(name) { return async (payload) => ({ data: await callTrusted(name, payload)() }); } }; }
    };
    window.__v21Harness = store;
    window.firebase = {
      apps: [],
      initializeApp(_config, name) { app.name = name; this.apps.push(app); return app; },
      app() { return app; },
      firestore() { return firestore; },
      functions() { return app.functions(); }
    };
    window.firebase.firestore.FieldValue = { serverTimestamp() { return new Date().toISOString(); } };
    window.confirm = () => true;
  })(${JSON.stringify(settings)})`;
  return source;
}

async function openAdmin(page: Page, options: HarnessOptions = {}) {
  await page.route('https://www.gstatic.com/**', (route) => route.abort());
  await page.addInitScript({ content: firebaseHarness(options) });
  await page.goto('/admin/v21/index.html');
}

test.describe('V21 Admin Control Center trusted backend contract', () => {
  test('authorized Admin saves, publishes to storage only, and restores Draft revisions', async ({ page }) => {
    await openAdmin(page);
    await expect(page.locator('#dashboardView')).toBeVisible();
    await expect(page.locator('.state-select')).toHaveCount(50);
    await expect(page.locator('.feature-id').filter({ hasText: 'homepage.planVisit' }).locator('..').locator('.dependency-note'))
      .toContainText('Plan Your Visit');

    await page.locator('.state-select[data-feature-id="pages.prayer"]').selectOption('HIDDEN');
    await page.locator('#saveDraftButton').click();
    await expect(page.locator('#dashboardNotice')).toContainText('Draft saved to Firestore as Revision 1');
    await expect(page.locator('#publishButton')).toBeEnabled();
    await expect(page.locator('#recentRevisions .recent-revision')).toHaveCount(1);

    await page.locator('#publishButton').click();
    await expect(page.locator('#dashboardNotice')).toContainText('Public website integration is not enabled yet');
    await expect(page.locator('#recentRevisions .recent-revision')).toHaveCount(2);
    const publishedStorageOnly = await page.evaluate(() => {
      const harness = (window as any).__v21Harness;
      return {
        published: harness.docs['websiteControl/published']?.status,
        publicIntegration: harness.calls.every((call: any) => call.name !== 'publicIntegration')
      };
    });
    expect(publishedStorageOnly).toEqual({ published: 'published', publicIntegration: true });

    const draftRevision = page.locator('.recent-revision').filter({ has: page.locator('.revision-restore') }).first();
    await draftRevision.locator('summary').click();
    await draftRevision.locator('.revision-restore').click();
    await expect(page.locator('#dashboardNotice')).toContainText('Revision restored to Draft Revision 2');
    await expect(page.locator('#publishButton')).toBeEnabled();
  });

  test('claim-missing users are denied and trusted backend errors are user-safe', async ({ page }) => {
    await openAdmin(page, { adminClaim: false });
    await expect(page.locator('#accessDeniedView')).toBeVisible();
    await expect(page.locator('#accessDeniedReason')).toContainText('Administrator access was recently updated');

    await openAdmin(page, { errorCode: 'permission-denied' });
    await expect(page.locator('#dashboardView')).toBeVisible();
    await page.locator('.state-select[data-feature-id="pages.prayer"]').selectOption('HIDDEN');
    await page.locator('#saveDraftButton').click();
    await expect(page.locator('#dashboardNotice')).toContainText('trusted Admin backend denied this operation');
    await expect(page.locator('#dashboardNotice')).not.toContainText('stack');
  });

  for (const width of [375, 390, 768, 1024, 1440]) {
    test(`responsive Admin layout remains usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openAdmin(page);
      await expect(page.locator('#dashboardView')).toBeVisible();
      await expect(page.locator('#publishButton')).toBeDisabled();
      await expect(page.locator('.publish-warning-panel')).toBeVisible();
      await expect(page.locator('#recentRevisions')).toBeVisible();
      const layout = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        revisionText: document.querySelector('#revisions-title')?.textContent
      }));
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
      expect(layout.revisionText).toBe('Revision History');
    });
  }
});
