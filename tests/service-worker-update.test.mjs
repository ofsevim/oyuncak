import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

class FakeWorker extends EventTarget {
  state = 'installing';
  messages = [];

  postMessage(message) {
    this.messages.push(message);
  }
}

class FakeRegistration extends EventTarget {
  installing = null;
  waiting = null;
}

export async function run() {
  const {
    watchForServiceWorkerUpdate,
    requestWaitingServiceWorkerActivation,
  } = await loadTsModule('src/utils/serviceWorkerUpdate.ts');

  const registration = new FakeRegistration();
  let controlled = false;
  let readyCount = 0;
  const stop = watchForServiceWorkerUpdate(
    registration,
    () => controlled,
    () => { readyCount += 1; },
  );

  const firstInstall = new FakeWorker();
  registration.installing = firstInstall;
  registration.dispatchEvent(new Event('updatefound'));
  firstInstall.state = 'installed';
  firstInstall.dispatchEvent(new Event('statechange'));
  assert.equal(readyCount, 0, 'ilk kurulum güncelleme bildirimi göstermemeli');

  controlled = true;
  const update = new FakeWorker();
  registration.installing = update;
  registration.dispatchEvent(new Event('updatefound'));
  update.state = 'installed';
  update.dispatchEvent(new Event('statechange'));
  assert.equal(readyCount, 1, 'mevcut uygulama güncellemesi bildirilmelidir');

  registration.waiting = update;
  assert.equal(requestWaitingServiceWorkerActivation(registration), true);
  assert.deepEqual(update.messages, [{ type: 'SKIP_WAITING' }]);

  stop();
}

export default run;
