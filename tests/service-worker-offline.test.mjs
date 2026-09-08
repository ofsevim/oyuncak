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
    listeners.fetch({ request: { method: 'GET', url: `https://example.test${pathname}`, mode }, respondWith: (promise) => { response = promise; }, waitUntil: () => {} });
    return response;
  };
  assert.equal(await (await request('/games/math', 'navigate')).text(), 'shell');
  assert.equal(await (await request('/games/word-search', 'navigate')).text(), 'shell');
  assert.equal(await (await request('/assets/game-Abc_X-12.js')).text(), 'game');
  assert.equal(networkCalls, 2, 'Hashed assets do not hit the network');
  assert.equal((await request('/games/battlecity/missing.html', 'navigate')).status, 503, 'An iframe must never receive the React shell');
  assert.equal((await request('/missing.png')).status, 503);
}
