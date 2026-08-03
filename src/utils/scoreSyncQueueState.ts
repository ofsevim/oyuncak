export interface ScoreSyncJob {
  gameId: string;
  score: number;
  attempts: number;
  nextAttemptAt: number;
}

const MAX_RETRY_DELAY_MS = 5 * 60_000;

export function mergeScoreSyncJob(
  jobs: readonly ScoreSyncJob[],
  gameId: string,
  score: number,
  now: number,
): ScoreSyncJob[] {
  const current = jobs.find((job) => job.gameId === gameId);
  const nextScore = Math.max(current?.score ?? 0, score);
  const next: ScoreSyncJob = {
    gameId,
    score: nextScore,
    attempts: nextScore > (current?.score ?? 0) ? 0 : (current?.attempts ?? 0),
    nextAttemptAt: nextScore > (current?.score ?? 0) ? now : (current?.nextAttemptAt ?? now),
  };

  return [...jobs.filter((job) => job.gameId !== gameId), next];
}

export function markScoreSyncFailure(
  jobs: readonly ScoreSyncJob[],
  gameId: string,
  now: number,
): ScoreSyncJob[] {
  return jobs.map((job) => {
    if (job.gameId !== gameId) return job;
    const attempts = job.attempts + 1;
    const delay = Math.min(MAX_RETRY_DELAY_MS, 5_000 * 2 ** Math.min(attempts - 1, 8));
    return { ...job, attempts, nextAttemptAt: now + delay };
  });
}

export function removeScoreSyncJob(
  jobs: readonly ScoreSyncJob[],
  gameId: string,
): ScoreSyncJob[] {
  return jobs.filter((job) => job.gameId !== gameId);
}

/** Removes a completed job unless a newer, higher score arrived during the request. */
export function completeScoreSyncJob(
  jobs: readonly ScoreSyncJob[],
  gameId: string,
  syncedScore: number,
): ScoreSyncJob[] {
  const latest = jobs.find((job) => job.gameId === gameId);
  if (latest && latest.score > syncedScore) return [...jobs];
  return removeScoreSyncJob(jobs, gameId);
}
