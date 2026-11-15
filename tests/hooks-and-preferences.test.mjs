import assert from 'node:assert/strict';
import path from 'node:path';
import { build } from 'esbuild';

function createReactHarness() {
  let states = [];
  let refs = [];
  let effects = [];
  let cleanups = [];
  let cursor = 0;

  const react = {
    useState(initial) {
      const idx = cursor++;
      if (!(idx in states)) {
        states[idx] = typeof initial === 'function' ? initial() : initial;
      }
      const setState = (updater) => {
        states[idx] = typeof updater === 'function' ? updater(states[idx]) : updater;
      };
      return [states[idx], setState];
    },
    useRef(initial) {
      const idx = cursor++;
      if (!(idx in refs)) refs[idx] = { current: initial };
      return refs[idx];
    },
    useCallback(fn) {
      return fn;
    },
    useEffect(effect, deps) {
      const idx = cursor++;
      effects.push({ idx, effect, deps });
    },
  };

  let prevDeps = new Map();
  let lastResult;

  return {
    react,
    render(renderFn) {
      cursor = 0;
      effects = [];
      lastResult = renderFn();
      for (const item of effects) {
        const old = prevDeps.get(item.idx);
        const changed = !old || !item.deps || item.deps.length !== old.length || item.deps.some((d, i) => !Object.is(d, old[i]));
        if (changed) {
          cleanups[item.idx]?.();
          cleanups[item.idx] = item.effect() || undefined;
          prevDeps.set(item.idx, item.deps);
        }
      }
      return lastResult;
    },
    unmount() {
      for (const cleanup of cleanups) cleanup?.();
      cleanups = [];
      states = [];
      refs = [];
      prevDeps = new Map();
    },
  };
}

async function bundleHook(entryPoint, reactObj) {
  globalThis.__hookReact = reactObj;
  const plugin = {
    name: 'hook-test-mocks',
    setup(buildApi) {
      buildApi.onResolve({ filter: /^react$/ }, () => ({ path: 'react-mock', namespace: 'mock' }));
      buildApi.onResolve({ filter: /^@\// }, (args) => ({
        path: path.resolve('src', args.path.slice(2)) + (args.path.endsWith('.ts') ? '' : '.ts'),
      }));
      buildApi.onLoad({ filter: /^react-mock$/, namespace: 'mock' }, () => ({
        contents: 'export const useState = (...a) => globalThis.__hookReact.useState(...a); export const useEffect = (...a) => globalThis.__hookReact.useEffect(...a); export const useCallback = (...a) => globalThis.__hookReact.useCallback(...a); export const useRef = (...a) => globalThis.__hookReact.useRef(...a);',
        loader: 'js',
      }));
    },
  };
  const res = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    plugins: [plugin],
    logLevel: 'silent',
  });
  return import(`data:text/javascript;base64,${Buffer.from(res.outputFiles[0].text).toString('base64')}`);
}

function createWindowMock() {
  const listeners = new Map();
  const store = new Map();
  let setCalls = 0;
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      setCalls++;
      store.set(k, String(v));
    },
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
  const win = {
    localStorage,
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
    dispatchEvent: (event) => {
      for (const fn of listeners.get(event.type) ?? []) fn(event);
      return true;
    },
  };
  return {
    win,
    store,
    getSetCalls: () => setCalls,
    resetSetCalls: () => { setCalls = 0; },
  };
}

export async function run() {
  const prevWindow = globalThis.window;
  const prevLocalStorage = globalThis.localStorage;

  try {
    // 1. useGameLibrary: storage event filtering and recent limit
    const harnessA = createReactHarness();
    const winA = createWindowMock();
    globalThis.window = winA.win;
    globalThis.localStorage = winA.win.localStorage;

    const { useGameLibrary } = await bundleHook('src/hooks/useGameLibrary.ts', harnessA.react);
    let lib = harnessA.render(() => useGameLibrary());
    assert.deepEqual(lib.favorites, []);
    assert.deepEqual(lib.recent, []);

    lib.toggleFavorite('math');
    for (const id of ['snake', 'tetris', 'maze', '2048', 'balloon', 'counting']) {
      lib.remember(id);
    }
    lib = harnessA.render(() => useGameLibrary());
    assert.deepEqual(lib.favorites, ['math']);
    assert.deepEqual(lib.recent, ['counting', 'balloon', '2048', 'maze', 'tetris']);

    // Mutate storage directly then fire an unrelated storage event: session must NOT reload
    winA.store.set('oyuncak.library.v1', JSON.stringify({ favorites: ['snake'], recent: [] }));
    winA.win.dispatchEvent({ type: 'storage', key: 'unrelated.key' });
    lib = harnessA.render(() => useGameLibrary());
    assert.deepEqual(lib.favorites, ['math'], 'unrelated storage key must not drop local session');

    // Firing matching storage event resets session cache and syncs from localStorage
    winA.win.dispatchEvent({ type: 'storage', key: 'oyuncak.library.v1' });
    lib = harnessA.render(() => useGameLibrary());
    assert.deepEqual(lib.favorites, ['snake']);

    // key === null (storage.clear()) must also reload
    winA.store.clear();
    winA.win.dispatchEvent({ type: 'storage', key: null });
    lib = harnessA.render(() => useGameLibrary());
    assert.deepEqual(lib.favorites, []);
    harnessA.unmount();

    // 2. useLocalStorageState: inline default object reference does not rewrite localStorage
    const harnessB = createReactHarness();
    const winB = createWindowMock();
    globalThis.window = winB.win;
    globalThis.localStorage = winB.win.localStorage;

    const { useLocalStorageState } = await bundleHook('src/hooks/useLocalStorageState.ts', harnessB.react);
    let key = 'pref-a';
    let pair = harnessB.render(() => useLocalStorageState(key, { theme: 'dark' }));
    assert.deepEqual(pair[0], { theme: 'dark' });
    assert.equal(winB.getSetCalls(), 0, 'mount must not eagerly write default value');

    // Re-render with fresh inline defaultValue object
    pair = harnessB.render(() => useLocalStorageState(key, { theme: 'dark' }));
    pair = harnessB.render(() => useLocalStorageState(key, { theme: 'dark' }));
    assert.equal(winB.getSetCalls(), 0, 'fresh defaultValue object reference must not trigger write');

    pair[1]({ theme: 'light' });
    pair = harnessB.render(() => useLocalStorageState(key, { theme: 'dark' }));
    assert.equal(winB.getSetCalls(), 1);
    assert.equal(winB.store.get('pref-a'), '{"theme":"light"}');

    // Switching key reads new key value without clobbering
    winB.store.set('pref-b', JSON.stringify({ theme: 'mint' }));
    key = 'pref-b';
    pair = harnessB.render(() => useLocalStorageState(key, { theme: 'dark' }));
    pair = harnessB.render(() => useLocalStorageState(key, { theme: 'dark' }));
    assert.deepEqual(pair[0], { theme: 'mint' });
    harnessB.unmount();
  } finally {
    delete globalThis.__hookReact;
    globalThis.window = prevWindow;
    globalThis.localStorage = prevLocalStorage;
  }
}
