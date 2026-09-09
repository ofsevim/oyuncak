type Handle = ReturnType<typeof setTimeout>;
interface Job { handle: Handle; startedAt: number; remaining: number; delay: number; repeat: boolean; callback: () => void }

/** Stable handles allow callers to cancel a timer even after a pause/resume. */
export function createPausableTimers(clock = {
  now: () => performance.now(),
  // Browser timer functions require their Window receiver, not the clock object.
  set: (callback: () => void, delay: number) => globalThis.setTimeout(callback, delay),
  clear: (handle: Handle) => globalThis.clearTimeout(handle),
}) {
  const jobs = new Map<Handle, Job>();
  let paused = false;
  const clear = (key: Handle) => {
    const job = jobs.get(key);
    if (job) clock.clear(job.handle);
    jobs.delete(key);
  };
  const arm = (key: Handle, job: Job) => {
    job.startedAt = clock.now();
    job.handle = clock.set(() => fire(key), job.remaining);
  };
  const fire = (key: Handle) => {
    const job = jobs.get(key);
    if (!job || paused) return;
    if (!job.repeat) jobs.delete(key);
    try { job.callback(); }
    finally {
      if (job.repeat && jobs.has(key)) { job.remaining = job.delay; if (!paused) arm(key, job); }
    }
  };
  const add = (callback: () => void, delay: number, repeat: boolean) => {
    const duration = Math.max(repeat ? 1 : 0, delay);
    const key = clock.set(() => fire(key), duration);
    jobs.set(key, { handle: key, callback, delay: duration, remaining: duration, startedAt: clock.now(), repeat });
    if (paused) clock.clear(key);
    return key;
  };
  return {
    timeout: (callback: () => void, delay: number) => add(callback, delay, false),
    interval: (callback: () => void, delay: number) => add(callback, delay, true),
    clear,
    clearAll: (repeat?: boolean) => { for (const [key, job] of jobs) if (repeat === undefined || job.repeat === repeat) clear(key); },
    setPaused: (value: boolean) => {
      if (value === paused) return;
      paused = value;
      for (const [key, job] of jobs) {
        if (paused) { clock.clear(job.handle); job.remaining = Math.max(0, job.remaining - (clock.now() - job.startedAt)); }
        else arm(key, job);
      }
    },
  };
}
