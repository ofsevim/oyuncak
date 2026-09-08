import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const { createPausableTimers } = await loadTsModule('src/utils/pausableTimers.ts');
  let now = 0, id = 0;
  const tasks = new Map();
  const clock = { now: () => now, set: (fn, delay) => { tasks.set(++id, { fn, at: now + delay }); return id; }, clear: (key) => tasks.delete(key) };
  const advance = (ms) => {
    const end = now + ms;
    for (;;) {
      const next = [...tasks].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      now = next[1].at; tasks.delete(next[0]); next[1].fn();
    }
    now = end;
  };
  const timers = createPausableTimers(clock);
  let calls = 0;
  timers.timeout(() => calls++, 100);
  advance(40); timers.setPaused(true); advance(10_000);
  assert.equal(calls, 0);
  timers.setPaused(false); advance(59); assert.equal(calls, 0);
  advance(1); assert.equal(calls, 1);
  const interval = timers.interval(() => calls++, 100);
  advance(30); timers.setPaused(true); advance(1000); timers.setPaused(false);
  advance(70); assert.equal(calls, 2, 'No burst of missed intervals on resume');
  timers.clear(interval); advance(500); assert.equal(calls, 2, 'Original handle cancels resumed timer');
  timers.setPaused(true); timers.timeout(() => calls++, 50);
  advance(500); timers.setPaused(false); advance(50); assert.equal(calls, 3);
  const selfClearing = timers.interval(() => { calls++; timers.clear(selfClearing); }, 10);
  advance(100); assert.equal(calls, 4);
  timers.timeout(() => calls++, 5); timers.interval(() => calls++, 5);
  timers.clearAll(); advance(100); assert.equal(calls, 4);
}
