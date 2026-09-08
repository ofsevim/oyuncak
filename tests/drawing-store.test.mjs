import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map();
  globalThis.localStorage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
  const store = await loadTsModule('src/utils/drawingStore.ts');
  const image = 'data:image/png;base64,aGVsbG8=';
  try {
    await store.clearDrawings();
    data.set('oyuncak-drawings', '{invalid');
    assert.equal((await store.getDrawings()).length, 0);
    assert.equal(data.get('oyuncak-drawings'), '{invalid', 'Corrupt legacy source is preserved');
    assert.equal(store.getLegacyDrawingBackup(), '{invalid');
    assert.ok(store.getDrawingRecoveryWarning());
    const saved = await store.saveDrawing(image, 'Yeni çizim');
    assert.equal((await store.getDrawings())[0].id, saved.id, 'Corrupt legacy source does not block new drawings');
    await store.deleteDrawing(saved.id);
    data.set('oyuncak-drawings', JSON.stringify([{ id: '1', dataUrl: image, name: 'Eski resim', createdAt: 1 }]));
    const migrated = await store.getDrawings();
    assert.equal(migrated.length, 1);
    assert.equal(await migrated[0].blob.text(), 'hello');
    assert.equal(data.has('oyuncak-drawings'), false);
    assert.equal(store.getDrawingRecoveryWarning(), '', 'Recovery warning clears after a successful retry');
    assert.equal((await store.getDrawings()).length, 1, 'Migration is idempotent');
    await Promise.all(Array.from({ length: 18 }, (_, i) => store.saveDrawing(image, `Resim ${i}`)));
    const saves = await Promise.allSettled([store.saveDrawing(image, 'Son 1'), store.saveDrawing(image, 'Son 2')]);
    assert.equal(saves.filter((entry) => entry.status === 'fulfilled').length, 1, 'Capacity enforced atomically');
    assert.equal((await store.getDrawings()).length, 20);
    await assert.rejects(store.saveDrawing(image, 'Fazla'), /Galerin dolu/);
    assert.ok((await store.getDrawings()).some((drawing) => drawing.id === migrated[0].id), 'Oldest drawing is never evicted');
    await store.deleteDrawing(migrated[0].id);
    assert.equal((await store.getDrawings()).length, 19);
    await assert.rejects(store.saveDrawing('data:text/html;base64,eA==', 'Geçersiz'));
    await store.clearDrawings();
    const bad = { id: 'broken', dataUrl: 'bad', name: 'Bozuk', createdAt: 2 };
    data.set('oyuncak-drawings', JSON.stringify([
      { id: 'valid', dataUrl: image, name: 'Sağlam', createdAt: 1 }, bad, null,
    ]));
    assert.equal((await store.getDrawings()).length, 1, 'Valid entries migrate even if adjacent entries are corrupt');
    assert.deepEqual(JSON.parse(store.getLegacyDrawingBackup()), [bad, null]);
    assert.ok(store.getDrawingRecoveryWarning());
    assert.equal((await store.getDrawings()).length, 1, 'Partial migration is idempotent');
  } finally {
    await store.clearDrawings();
    if (previous === undefined) delete globalThis.localStorage; else Object.defineProperty(globalThis, 'localStorage', previous);
  }
}
