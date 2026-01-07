/**
 * Hikaye ilerleme kaydı (localStorage).
 * - Client-side: hızlı ve basit
 * - Hata durumunda sessizce no-op (SSR / privacy mode)
 */

const keyOf = (storyId: string) => `oyuncak.storyProgress.${storyId}`;

export function loadStoryProgress(storyId: string): number | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(keyOf(storyId));
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

export function saveStoryProgress(storyId: string, pageIndex: number) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(keyOf(storyId), String(pageIndex));
  } catch {
    // ignore
  }
}

export function clearStoryProgress(storyId: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(keyOf(storyId));
  } catch {
    // ignore
  }
}


