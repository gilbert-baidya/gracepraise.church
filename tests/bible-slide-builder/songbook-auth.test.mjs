import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../../firebase-config.js', import.meta.url), 'utf8');

function harness(pathname = '/bible-slide-builder/', search = '') {
    const nodes = new Map(['builderApp', 'localAccessGate', 'accessGateTitle', 'accessGateDetail']
        .map(id => [id, { hidden: id === 'builderApp', textContent: '' }]));
    const events = new Map();
    const redirects = [];
    let observer;
    let observations = 0;
    let initializations = 0;
    let errors = 0;
    const auth = {
        onAuthStateChanged(callback) {
            observations++;
            observer = callback;
            return () => {};
        }
    };
    const firebase = {
        apps: [],
        initializeApp() { initializations++; this.apps.push({}); },
        auth: () => auth
    };
    const context = vm.createContext({
        firebase, URLSearchParams, Set, Promise,
        console: { error() { errors++; } },
        document: { getElementById: id => nodes.get(id) },
        window: {
            location: { pathname, search, replace: value => redirects.push(value) },
            addEventListener: (name, callback) => events.set(name, callback)
        }
    });
    vm.runInContext(source, context);
    return {
        context, nodes, events, redirects,
        emit: user => observer(user),
        get observations() { return observations; },
        get initializations() { return initializations; },
        get errors() { return errors; }
    };
}

test('shared Firebase observer waits for auth, starts once and redirects on logout', async () => {
    const state = harness();
    let starts = 0;
    state.context.start = () => { starts++; };
    vm.runInContext('protectSongbookTool(start)', state.context);
    assert.equal(starts, 0);
    assert.equal(state.nodes.get('builderApp').hidden, true);
    assert.equal(state.redirects.length, 0);
    state.emit({ uid: 'member' });
    await Promise.resolve();
    assert.equal(starts, 1);
    assert.equal(state.nodes.get('builderApp').hidden, false);
    state.emit({ uid: 'member' });
    await Promise.resolve();
    assert.equal(starts, 1);
    state.events.get('pagehide')();
    assert.equal(state.nodes.get('builderApp').hidden, true);
    state.events.get('pageshow')({ persisted: true });
    assert.equal(state.observations, 2);
    assert.equal(state.initializations, 1);
    assert.equal(state.nodes.get('builderApp').hidden, true);
    state.emit(null);
    assert.deepEqual(state.redirects, ['/songbook.html?returnTo=%2Fbible-slide-builder%2F#authButton']);
});

test('signed-out review access is rejected; missing SDK fails closed explicitly', () => {
    const state = harness('/bible-slide-builder/review.html');
    vm.runInContext('protectSongbookTool(() => { throw new Error("must not start"); })', state.context);
    state.emit(null);
    assert.deepEqual(state.redirects, ['/songbook.html?returnTo=%2Fbible-slide-builder%2Freview.html#authButton']);
    const failed = harness();
    failed.context.firebase = undefined;
    vm.runInContext('protectSongbookTool(() => {})', failed.context);
    assert.equal(failed.nodes.get('builderApp').hidden, true);
    assert.equal(failed.nodes.get('accessGateTitle').textContent, 'Unable to verify your Songbook session');
    assert.equal(failed.errors, 1);
    assert.equal(failed.redirects.length, 0);
});

test('return navigation accepts only exact Builder destinations', () => {
    for (const destination of ['/bible-slide-builder/', '/bible-slide-builder/review.html',
        'https://evil.example/', '//evil.example/', '/admin/v21/', '/bible-slide-builder/?bypass=true']) {
        const state = harness('/songbook.html', `?returnTo=${encodeURIComponent(destination)}`);
        const result = vm.runInContext('requestedSongbookTool()', state.context);
        assert.equal(result, ['/bible-slide-builder/', '/bible-slide-builder/review.html'].includes(destination)
            ? destination : null);
    }
});
