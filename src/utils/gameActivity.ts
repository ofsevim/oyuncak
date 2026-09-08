export const GAME_ACTIVITY_EVENT = 'oyuncak:game-activity';
let manuallyPaused = false;
export function isGamePaused(): boolean {
  return manuallyPaused || (typeof document !== 'undefined' && document.visibilityState === 'hidden');
}
export function setGamePaused(paused: boolean): void {
  manuallyPaused = paused;
  document.documentElement.classList.toggle('game-paused', paused);
  window.dispatchEvent(new Event(GAME_ACTIVITY_EVENT));
}
