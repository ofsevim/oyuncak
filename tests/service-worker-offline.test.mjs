import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

export async function run() {
  const listeners = {};
  const entries = new Map([['/index.html', new Response('shell')], ['/assets/game-Abc_X-12.js', new Response('game')]]);
  let networkCalls = 0;
  const context = {
    URL, Response, AbortController, setTimeout, clearTimeout,
    self: { registration: { scope: 'https://example.test/' }, addEventListener: (name, fn) => { listeners[name] = fn; } },
    caches: { open: async () => ({ match: async (request) => entries.get(typeof request === 'string' ? request : new URL(request.url).pathname)?.clone() }) },
    fetch: async () => { networkCalls++; throw new Error('offline'); },
  };
  vm.runInNewContext(await readFile('public/sw.js', 'utf8'), context);
  const request = async (pathname, mode = 'cors') => {
    let response;
    listeners.fetch({ request: { method: 'GET', url: `https://example.test${pathname}`, mode, redirect: mode === 'navigate' ? 'manual' : 'follow' }, respondWith: (promise) => { response = promise; }, waitUntil: () => {} });
    return response;
  };
  assert.equal(await (await request('/games/math', 'navigate')).text(), 'shell');
  assert.equal(await (await request('/games/word-search', 'navigate')).text(), 'shell');
  assert.equal(await (await request('/assets/game-Abc_X-12.js')).text(), 'game');
  assert.equal(networkCalls, 2, 'Hashed assets do not hit the network');
  assert.equal((await request('/games/battlecity/missing.html', 'navigate')).status, 503, 'An iframe must never receive the React shell');
  assert.equal((await request('/missing.png')).status, 503);

  const redirected = () => {
    const response = new Response('<canvas id="canvas"></canvas>', { headers: { 'Content-Type': 'text/html', 'X-Test': 'preserved' } });
    Object.defineProperty(response, 'redirected', { value: true });
    response.clone = redirected;
    return response;
  };
  entries.set('/games/battlecity/BattleCity.html', redirected());
  const cachedFrame = await request('/games/battlecity/BattleCity.html', 'navigate');
  assert.equal(cachedFrame.redirected, false, 'A cached redirected document must be safe for manual-redirect iframe navigation');
  assert.equal(cachedFrame.headers.get('Content-Type'), 'text/html');
  assert.equal(cachedFrame.headers.get('X-Test'), 'preserved');
  assert.equal(await cachedFrame.text(), '<canvas id="canvas"></canvas>');
  context.fetch = async () => redirected();
  const networkFrame = await request('/games/battlecity/BattleCity.html', 'navigate');
  assert.equal(networkFrame.redirected, false);
  assert.equal(await networkFrame.text(), '<canvas id="canvas"></canvas>');

  const opaque = new Response(null);
  Object.defineProperties(opaque, { type: { value: 'opaqueredirect' }, status: { value: 0 }, ok: { value: false } });
  context.fetch = async () => opaque;
  assert.equal(await request('/games/battlecity/BattleCity.html', 'navigate'), opaque,
    'A fresh opaque redirect must reach the browser instead of falling back to an older cached document');

  const stored = new Map();
  context.caches.open = async () => ({ addAll: async () => {}, put: async (key, value) => stored.set(key, value) });
  context.fetch = async (url) => {
    if (url === '/precache-manifest.json') return new Response(JSON.stringify({ assets:['/games/battlecity/BattleCity.html'] }));
    const document = redirected();
    Object.defineProperty(document, 'url', { value:'https://example.test/games/battlecity/battlecity' });
    return document;
  };
  let installation;
  listeners.install({ waitUntil: promise => { installation = promise; } });
  await installation;
  assert.ok(stored.has('/games/battlecity/BattleCity.html'));
  assert.ok(stored.has('https://example.test/games/battlecity/battlecity'), 'Remembered browser redirects must resolve to a precached destination offline');
}
