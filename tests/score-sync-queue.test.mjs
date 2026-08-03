import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const {
    completeScoreSyncJob,
    mergeScoreSyncJob,
    markScoreSyncFailure,
  } = await loadTsModule('src/utils/scoreSyncQueueState.ts');

  let jobs = mergeScoreSyncJob([], 'runner', 100, 1_000);
  assert.deepEqual(jobs, [{ gameId: 'runner', score: 100, attempts: 0, nextAttemptAt: 1_000 }]);

  jobs = markScoreSyncFailure(jobs, 'runner', 2_000);
  assert.equal(jobs[0].attempts, 1);
  assert.equal(jobs[0].nextAttemptAt, 7_000, 'ilk tekrar beş saniye ertelenmeli');

  jobs = mergeScoreSyncJob(jobs, 'runner', 80, 3_000);
  assert.equal(jobs[0].score, 100, 'daha düşük skor bekleyen rekoru değiştirmemeli');
  assert.equal(jobs[0].attempts, 1, 'daha düşük skor retry durumunu sıfırlamamalı');

  jobs = mergeScoreSyncJob(jobs, 'runner', 150, 4_000);
  assert.deepEqual(jobs, [{ gameId: 'runner', score: 150, attempts: 0, nextAttemptAt: 4_000 }]);

  const withNewerScore = completeScoreSyncJob(jobs, 'runner', 100);
  assert.equal(withNewerScore[0].score, 150, 'istek sürerken gelen daha yüksek skor korunmalı');

  jobs = completeScoreSyncJob(jobs, 'runner', 150);
  assert.deepEqual(jobs, []);
}

export default run;
