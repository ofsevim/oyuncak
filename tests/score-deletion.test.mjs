import assert from 'node:assert/strict';
import { build } from 'esbuild';

export async function run() {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let finish;
  let fail;
  let commits = 0;
  const deleted = [];
  const state = {
    commit: () => {
      commits += 1;
      return new Promise((resolve, reject) => { finish = resolve; fail = reject; });
    },
    deleted,
  };
  globalThis.__scoreDeletionTest = state;
  globalThis.window = new EventTarget();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  const mocks = {
    'firebase/firestore': `
      export const doc = (_, ...parts) => parts.join('/');
      export const writeBatch = () => ({
        delete: (ref) => globalThis.__scoreDeletionTest.deleted.push(ref),
        commit: () => globalThis.__scoreDeletionTest.commit(),
      });
      const unexpected = () => { throw new Error('Unexpected Firebase call'); };
      export { unexpected as collection, unexpected as getDoc, unexpected as getDocs,
        unexpected as limit, unexpected as orderBy, unexpected as query,
        unexpected as runTransaction, unexpected as serverTimestamp, unexpected as setDoc };`,
    '@/lib/firebase': 'export const db = {};',
    './authService': 'export const getExistingUser = async () => ({ uid: "test-player" }); export const ensureAuth = getExistingUser;',
    '@/utils/playerPreferences': 'export const getPlayerPreferences = () => ({ shareScores: true });',
    '@/lib/logger': 'export const logger = { warn: () => {} };',
    '@/lib/utils': 'export const sanitizeNickname = (value) => value;',
  };
  try {
    const built = await build({
      entryPoints: ['src/services/scoreService.ts'], bundle: true, write: false, format: 'esm', platform: 'node',
      plugins: [{ name: 'isolated-firebase', setup(builder) {
        builder.onResolve({ filter: /.*/ }, ({ path }) => path in mocks ? { path, namespace: 'mock' } : undefined);
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }));
      } }],
    });
    const service = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
    const first = service.deleteCloudScores();
    assert.equal(service.deleteCloudScores(), first, 'Retries reuse the pending deletion');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(commits, 1);
    assert.equal(deleted.length, 24, 'All 23 game documents and the private profile are deleted');
    assert.ok(deleted.every((ref) => ref.endsWith('/test-player')));
    await assert.rejects(service.syncScore('basketball', 100), /silme isteğinin/);
    await assert.rejects(service.updateNicknameInScores('Yeni ad'), /silme isteğinin/);
    finish();
    await first;

    const retry = service.deleteCloudScores();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(commits, 2, 'A completed request releases the pending lock');
    fail(new Error('permission-denied'));
    await assert.rejects(retry, /permission-denied/);
    const afterFailure = service.deleteCloudScores();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(commits, 3, 'A rejected request also releases the pending lock');
    finish();
    await afterFailure;
  } finally {
    delete globalThis.__scoreDeletionTest;
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else delete globalThis.window;
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator); else delete globalThis.navigator;
  }
}
