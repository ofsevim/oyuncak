import { withTimeout } from './promiseTimeout';

/** A timeout stops waiting, not a Firestore write that has already been sent. */
export async function deleteAfterSync(
  settle: () => Promise<void>,
  remove: () => Promise<void>,
  milliseconds = 10_000,
): Promise<void> {
  await withTimeout(settle(), milliseconds,
    'Önceki skor gönderiminin bitmesi bekleniyor. Silme başlatılmadı; bağlantıyı kontrol edip tekrar deneyin.');
  await withTimeout(remove(), milliseconds,
    'Sunucudan silme onayı alınamadı. İstek bağlantı geldiğinde tamamlanabilir; tekrar deneyerek sonucu kontrol edin.');
}
