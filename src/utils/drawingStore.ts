export interface SavedDrawing {
  id: string;
  blob: Blob;
  thumbnail: Blob;
  createdAt: number;
  name: string;
}

const LEGACY_KEY = 'oyuncak-drawings';
const DATABASE = 'oyuncak-drawings-v1';
const STORE = 'drawings';
export const MAX_DRAWINGS = 20;
let database: Promise<IDBDatabase> | undefined;
let migration: Promise<void> | undefined;
let migrationWarning = '';

export function getDrawingRecoveryWarning(): string { return migrationWarning; }
export function getLegacyDrawingBackup(): string | null {
  try { return localStorage.getItem(LEGACY_KEY); } catch { return null; }
}

function openDatabase(): Promise<IDBDatabase> {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('Bu tarayıcı çizim depolamayı desteklemiyor. Çizimini İndir düğmesiyle saklayabilirsin.'));
        return;
      }
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Diğer Oyuncak sekmelerini kapatıp tekrar dene.'));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); database = undefined; migration = undefined; };
        resolve(db);
      };
    }).catch((error) => { database = undefined; throw error; });
  }
  return database;
}

function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Çizim kaydedilemedi.'));
    transaction.onerror = () => reject(transaction.error);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error('Çizim biçimi desteklenmiyor.');
  const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}

async function thumbnail(blob: Blob): Promise<Blob> {
  if (typeof document === 'undefined') return blob;
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Çizim önizlemesi oluşturulamadı.'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 240 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => canvas.toBlob((result) => resolve(result ?? blob), 'image/webp', 0.8));
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function migrateLegacy(): Promise<void> {
  migrationWarning = '';
  let raw: string | null;
  try { raw = localStorage.getItem(LEGACY_KEY); } catch { return; }
  if (!raw) return;
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Eski çizimler okunamadı; orijinal kayıtlar korunuyor.');
  const drawings: SavedDrawing[] = [];
  const remaining: unknown[] = [];
  for (const [index, value] of parsed.entries()) {
    if (!value || typeof value.id !== 'string' || typeof value.dataUrl !== 'string' ||
      typeof value.name !== 'string' || !Number.isFinite(value.createdAt)) {
      remaining.push(value);
      continue;
    }
    try {
      const blob = dataUrlToBlob(value.dataUrl);
      drawings.push({ id: `legacy-${value.id}-${index}`, blob, thumbnail: await thumbnail(blob), createdAt: value.createdAt, name: value.name });
    } catch { remaining.push(value); }
  }
  const db = await openDatabase();
  const transaction = db.transaction(STORE, 'readwrite');
  const done = complete(transaction);
  for (const drawing of drawings) transaction.objectStore(STORE).put(drawing);
  await done;
  // Remove the old copy only after the entire migration has committed.
  try {
    if (localStorage.getItem(LEGACY_KEY) === raw) {
      if (remaining.length) localStorage.setItem(LEGACY_KEY, JSON.stringify(remaining));
      else localStorage.removeItem(LEGACY_KEY);
    }
  } catch { /* Keep the backup. */ }
  if (remaining.length) migrationWarning = 'Bazı eski çizimler okunamadı. Sağlam çizimlerin kullanılabilir; okunamayan kayıtların yedeği korunuyor.';
}

async function ready(): Promise<IDBDatabase> {
  const db = await openDatabase();
  if (!migration) migration = migrateLegacy().catch(() => {
    migration = undefined;
    migrationWarning = 'Eski çizimler aktarılamadı. Mevcut galerini kullanabilir ve yeni çizim kaydedebilirsin. Eski kayıtların yedeği korunuyor.';
  });
  await migration;
  return db;
}

export async function getDrawings(): Promise<SavedDrawing[]> {
  const db = await ready();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as SavedDrawing[]).sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error);
  });
}

export async function saveDrawing(dataUrl: string, name: string): Promise<SavedDrawing> {
  const blob = dataUrlToBlob(dataUrl);
  const drawing: SavedDrawing = {
    id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join(''), blob, thumbnail: await thumbnail(blob), createdAt: Date.now(), name,
  };
  const db = await ready();
  const transaction = db.transaction(STORE, 'readwrite');
  const done = complete(transaction);
  let full = false;
  const store = transaction.objectStore(STORE);
  const count = store.count();
  count.onsuccess = () => {
    if (count.result >= MAX_DRAWINGS) { full = true; transaction.abort(); }
    else store.add(drawing);
  };
  try { await done; } catch {
    throw new Error(full
      ? 'Galerin dolu. Yeni çizimi indirdikten sonra galeriden saklamak istemediğin bir çizimi silebilirsin.'
      : 'Çizim kaydedilemedi. Çizimini indirerek saklayabilirsin; mevcut çizimlerin korunuyor.');
  }
  return drawing;
}

export async function deleteDrawing(id: string): Promise<void> {
  const db = await ready();
  const transaction = db.transaction(STORE, 'readwrite');
  const done = complete(transaction);
  transaction.objectStore(STORE).delete(id);
  await done;
}

export async function clearDrawings(): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE, 'readwrite');
  const done = complete(transaction);
  transaction.objectStore(STORE).clear();
  await done;
  localStorage.removeItem(LEGACY_KEY);
  migration = undefined;
  migrationWarning = '';
}
