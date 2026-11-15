import assert from 'node:assert/strict';
import path from 'node:path';
import { build } from 'esbuild';

async function loadAuthService() {
  const warnings = [];
  let signInCalls = 0;
  let currentUser = null;
  let authListener = null;
  let authReadyImpl = async () => {};
  let signInImpl = async () => ({ user: { uid: 'anon-1' } });

  globalThis.__authTest = {
    warnings,
    auth: {
      get currentUser() {
        return currentUser;
      },
      authStateReady: () => authReadyImpl(),
    },
    onAuthStateChanged: (_auth, cb) => {
      authListener = cb;
      cb(currentUser);
      return () => { authListener = null; };
    },
    signInAnonymously: async () => {
      signInCalls++;
      return signInImpl();
    },
  };

  const mockPlugin = {
    name: 'auth-test-mocks',
    setup(buildApi) {
      buildApi.onResolve({ filter: /^firebase\/auth$/ }, () => ({ path: 'firebase-auth', namespace: 'mock' }));
      buildApi.onResolve({ filter: /^@\/lib\/firebase$/ }, () => ({ path: 'lib-firebase', namespace: 'mock' }));
      buildApi.onResolve({ filter: /^@\/lib\/logger$/ }, () => ({ path: 'lib-logger', namespace: 'mock' }));
      buildApi.onResolve({ filter: /^@\// }, (args) => ({
        path: path.resolve('src', args.path.slice(2)) + (args.path.endsWith('.ts') ? '' : '.ts'),
      }));
      buildApi.onLoad({ filter: /^firebase-auth$/, namespace: 'mock' }, () => ({
        contents: 'export const signInAnonymously = (...a) => globalThis.__authTest.signInAnonymously(...a); export const onAuthStateChanged = (...a) => globalThis.__authTest.onAuthStateChanged(...a);',
        loader: 'js',
      }));
      buildApi.onLoad({ filter: /^lib-firebase$/, namespace: 'mock' }, () => ({
        contents: 'export const auth = globalThis.__authTest.auth;',
        loader: 'js',
      }));
      buildApi.onLoad({ filter: /^lib-logger$/, namespace: 'mock' }, () => ({
        contents: 'export const logger = { warn: (...a) => globalThis.__authTest.warnings.push(a), info() {}, error() {}, debug() {} };',
        loader: 'js',
      }));
    },
  };

  const result = await build({
    entryPoints: ['src/services/authService.ts'],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    plugins: [mockPlugin],
    logLevel: 'silent',
  });
  const mod = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  return {
    mod,
    warnings,
    getSignInCalls: () => signInCalls,
    setCurrentUser: (u) => {
      currentUser = u;
      authListener?.(u);
    },
    setAuthReady: (fn) => { authReadyImpl = fn; },
    setSignInImpl: (fn) => { signInImpl = fn; },
  };
}

export async function run() {
  const ctx = await loadAuthService();
  try {
    // 1. Existing user short-circuits signInAnonymously
    ctx.setCurrentUser({ uid: 'existing-uid' });
    assert.equal(ctx.mod.getUid(), 'existing-uid');
    const existing = await ctx.mod.ensureAuth();
    assert.equal(existing.uid, 'existing-uid');
    assert.equal(ctx.getSignInCalls(), 0);
    assert.equal((await ctx.mod.getExistingUser())?.uid, 'existing-uid');

    // 2. Concurrent ensureAuth calls deduplicate into one signInAnonymously call
    ctx.setCurrentUser(null);
    let releaseSignIn;
    ctx.setSignInImpl(() => new Promise((resolve) => {
      releaseSignIn = () => {
        const user = { uid: 'anon-dedup' };
        ctx.setCurrentUser(user);
        resolve({ user });
      };
    }));
    const p1 = ctx.mod.ensureAuth();
    const p2 = ctx.mod.ensureAuth();
    await new Promise(r => setTimeout(r, 10));
    releaseSignIn();
    const [u1, u2] = await Promise.all([p1, p2]);
    assert.equal(u1.uid, 'anon-dedup');
    assert.equal(u2.uid, 'anon-dedup');
    assert.equal(ctx.getSignInCalls(), 1);

    // 3. Failure clears authPromise so subsequent ensureAuth retries
    ctx.setCurrentUser(null);
    ctx.setSignInImpl(async () => { throw new Error('network-down'); });
    await assert.rejects(ctx.mod.ensureAuth(), /network-down/);
    assert.equal(ctx.warnings.length, 1);

    ctx.setSignInImpl(async () => {
      const user = { uid: 'anon-retry' };
      ctx.setCurrentUser(user);
      return { user };
    });
    const retried = await ctx.mod.ensureAuth();
    assert.equal(retried.uid, 'anon-retry');
    assert.equal(ctx.getSignInCalls(), 3);

    // 4. 8s auth timeout rejects cleanly
    ctx.setCurrentUser(null);
    ctx.setAuthReady(() => new Promise(() => {}));
    const origSetTimeout = globalThis.setTimeout;
    const origClearTimeout = globalThis.clearTimeout;
    const delays = [];
    try {
      globalThis.setTimeout = (fn, delay) => {
        delays.push(delay);
        queueMicrotask(fn);
        return 1;
      };
      globalThis.clearTimeout = () => {};
      await assert.rejects(ctx.mod.ensureAuth(), /auth-timeout/);
      await assert.rejects(ctx.mod.getExistingUser(), /auth-timeout/);
      assert.deepEqual(delays, [8000, 8000]);
    } finally {
      globalThis.setTimeout = origSetTimeout;
      globalThis.clearTimeout = origClearTimeout;
    }
  } finally {
    delete globalThis.__authTest;
  }
}
