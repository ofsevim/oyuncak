import { logger } from '@/lib/logger';
import {
  completeScoreSyncJob,
  markScoreSyncFailure,
  mergeScoreSyncJob,
  type ScoreSyncJob,
} from './scoreSyncQueueState';

const STORAGE_KEY = 'oyuncak.score-sync-queue.v1';
export const SCORE_SYNC_STATUS_EVENT = 'oyuncak:score-sync-status';

export interface ScoreSyncStatus {
  state: 'offline' | 'retry_scheduled' | 'synced';
  pending: number;
}

let flushPromise: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function readQueue(): ScoreSyncJob[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((job): job is ScoreSyncJob => (
      typeof job === 'object' && job !== null
      && typeof job.gameId === 'string'
      && Number.isSafeInteger(job.score) && job.score > 0
      && Number.isInteger(job.attempts) && job.attempts >= 0
      && typeof job.nextAttemptAt === 'number' && Number.isFinite(job.nextAttemptAt)
    ));
  } catch {
    return [];
  }
}

function writeQueue(jobs: readonly ScoreSyncJob[]): void {
  try {
    if (jobs.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch (err) {
    logger.warn('Score sync queue could not be persisted', { err: String(err) });
  }
}

function announce(status: ScoreSyncStatus): void {
  window.dispatchEvent(new CustomEvent<ScoreSyncStatus>(SCORE_SYNC_STATUS_EVENT, { detail: status }));
}

function scheduleNextAttempt(jobs: readonly ScoreSyncJob[]): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  if (jobs.length === 0 || !navigator.onLine) return;

  const nextAttemptAt = Math.min(...jobs.map((job) => job.nextAttemptAt));
  const delay = Math.max(0, Math.min(nextAttemptAt - Date.now(), 5 * 60_000));
  retryTimer = setTimeout(() => void flushScoreSyncQueue(), delay);
}

export function enqueueScoreSync(gameId: string, score: number): void {
  if (!Number.isSafeInteger(score) || score <= 0) return;
  const jobs = mergeScoreSyncJob(readQueue(), gameId, score, Date.now());
  writeQueue(jobs);
  if (navigator.onLine) void flushScoreSyncQueue();
  else announce({ state: 'offline', pending: jobs.length });
}

export function getPendingScoreSyncCount(): number {
  return readQueue().length;
}

export function flushScoreSyncQueue(force = false): Promise<void> {
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    if (!navigator.onLine) {
      const jobs = readQueue();
      if (jobs.length > 0) announce({ state: 'offline', pending: jobs.length });
      return;
    }

    let jobs = readQueue();
    if (jobs.length === 0) return;
    const { syncScore } = await import('@/services/scoreService');

    for (const queuedJob of [...jobs]) {
      const job = jobs.find((candidate) => candidate.gameId === queuedJob.gameId);
      if (!job || (!force && job.nextAttemptAt > Date.now())) continue;

      try {
        await syncScore(job.gameId, job.score);
        const latestJobs = readQueue();
        jobs = completeScoreSyncJob(latestJobs, job.gameId, job.score);
        writeQueue(jobs);
      } catch (err) {
        const latestJobs = readQueue();
        const latestJob = latestJobs.find((candidate) => candidate.gameId === job.gameId);
        jobs = latestJob?.score === job.score
          ? markScoreSyncFailure(latestJobs, job.gameId, Date.now())
          : latestJobs;
        writeQueue(jobs);
        logger.warn('Queued score sync failed', { gameId: job.gameId, err: String(err) });
      }
    }

    jobs = readQueue();
    announce(jobs.length === 0
      ? { state: 'synced', pending: 0 }
      : { state: navigator.onLine ? 'retry_scheduled' : 'offline', pending: jobs.length });
    scheduleNextAttempt(jobs);
  })()
    .catch((err) => {
      const jobs = readQueue();
      if (jobs.length > 0) {
        announce({ state: navigator.onLine ? 'retry_scheduled' : 'offline', pending: jobs.length });
      }
      scheduleNextAttempt(jobs);
      logger.warn('Score sync queue flush failed', { err: String(err) });
    })
    .finally(() => {
      flushPromise = null;
    });

  return flushPromise;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushScoreSyncQueue(true));
  window.setTimeout(() => void flushScoreSyncQueue(), 1_500);
}
