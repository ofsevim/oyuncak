import type { StoryPage } from '@/data/stories';

/**
 * Hikaye ilerleme kaydı (localStorage).
 * - Client-side: hızlı ve basit
 * - Hata durumunda sessizce no-op (SSR / privacy mode)
 */

const keyOf = (storyId: string) => `oyuncak.storyProgress.${storyId}`;
const journeyKeyOf = (storyId: string) => `oyuncak.storyJourney.v1.${storyId}`;

export function nextStoryPage(pages: readonly StoryPage[], index: number): number | null {
  const page = pages[index];
  if (!page || page.choices?.length) return null;
  const next = page.nextPageIndex ?? index + 1;
  return Number.isInteger(next) && next >= 0 && next < pages.length ? next : null;
}

function targets(pages: readonly StoryPage[], index: number): number[] {
  const choices = pages[index]?.choices;
  if (choices?.length) return choices.map(choice => choice.nextPageIndex);
  const next = nextStoryPage(pages, index);
  return next === null ? [] : [next];
}

/** Keeps the selected route, including branch joins; older numeric saves migrate locally. */
export function loadStoryJourney(storyId: string, pages: readonly StoryPage[]): number[] {
  try {
    const raw = window.localStorage.getItem(journeyKeyOf(storyId));
    if (raw !== null) {
      const path: unknown = JSON.parse(raw)?.pages;
      if (!Array.isArray(path) || !path.length || path[0] !== 0 || path.length > pages.length) return [0];
      const valid = path.every((index, position) => Number.isInteger(index) && index >= 0 && index < pages.length
        && (position === 0 || targets(pages, path[position - 1]).includes(index)));
      return valid ? path : [0];
    }
    const saved = loadStoryProgress(storyId);
    if (saved === null || saved >= pages.length) return [0];
    const queue = [[0]];
    const seen = new Set([0]);
    while (queue.length) {
      const path = queue.shift()!;
      const last = path[path.length - 1];
      if (last === saved) return path;
      for (const next of targets(pages, last)) {
        if (next >= 0 && next < pages.length && !seen.has(next)) {
          seen.add(next);
          queue.push([...path, next]);
        }
      }
    }
  } catch { /* Reading remains available when storage is blocked or damaged. */ }
  return [0];
}

export function saveStoryJourney(storyId: string, pages: number[]) {
  try {
    window.localStorage.setItem(journeyKeyOf(storyId), JSON.stringify({ pages }));
    saveStoryProgress(storyId, pages[pages.length - 1]);
  } catch { /* The current session still holds the reading path. */ }
}

export function loadStoryProgress(storyId: string): number | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(keyOf(storyId));
    if (!raw?.trim()) return null;
    const num = Number(raw);
    return Number.isSafeInteger(num) && num >= 0 ? num : null;
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
    window.localStorage.removeItem(journeyKeyOf(storyId));
  } catch {
    // ignore
  }
}


