export const extractBattleCityGameOverScore = (data: unknown): number | null => {
  if (!data || typeof data !== 'object') return null;
  const payload = data as { type?: unknown; score?: unknown };
  if (payload.type !== 'battlecity:gameover') return null;
  if (typeof payload.score !== 'number' || !Number.isFinite(payload.score)) return null;
  const score = Math.floor(payload.score);
  return score > 0 ? score : null;
};

export const isTrustedBattleCityMessage = (
  eventSource: unknown,
  iframeWindow: unknown,
  eventOrigin: string,
  expectedOrigin: string,
): boolean => {
  if (!iframeWindow || eventSource !== iframeWindow) return false;
  return eventOrigin === expectedOrigin;
};
