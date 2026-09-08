import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const { deleteAfterSync } = await loadTsModule('src/utils/cloudDeletion.ts');
  const events = [];
  await deleteAfterSync(async () => { events.push('settled'); }, async () => { events.push('deleted'); });
  assert.deepEqual(events, ['settled', 'deleted']);

  let releaseSync;
  let removed = false;
  const sync = new Promise((resolve) => { releaseSync = resolve; });
  await assert.rejects(deleteAfterSync(() => sync, async () => { removed = true; }, 10), /Silme başlatılmadı/);
  releaseSync();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(removed, false, 'An expired wait must never start a late deletion');

  let confirmWrite;
  const write = new Promise((resolve) => { confirmWrite = resolve; });
  await assert.rejects(deleteAfterSync(async () => {}, () => write, 10), /İstek bağlantı geldiğinde tamamlanabilir/);
  confirmWrite();
  await write;
  await assert.rejects(deleteAfterSync(async () => {}, async () => { throw new Error('permission-denied'); }), /permission-denied/);
}
