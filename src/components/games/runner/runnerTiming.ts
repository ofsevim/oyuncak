export const TARGET_FRAME_MS = 1000 / 60;
export const MAX_RENDER_FPS = 90;
export const MIN_RENDER_INTERVAL_MS = 1000 / MAX_RENDER_FPS;
export const MAX_PHYSICS_STEPS_PER_FRAME = 3;

export interface PhysicsFramePlan {
  steps: number;
  accumulator: number;
}

/**
 * Produces a bounded fixed-timestep plan. Long browser/GC pauses do not cause
 * an expensive catch-up spiral on the next rendered frame.
 */
export function planPhysicsFrame(
  elapsedMs: number,
  accumulator: number,
): PhysicsFramePlan {
  const cappedElapsed = Math.min(Math.max(elapsedMs, 0), 100);
  let nextAccumulator = accumulator + cappedElapsed / TARGET_FRAME_MS;
  const steps = Math.min(MAX_PHYSICS_STEPS_PER_FRAME, Math.floor(nextAccumulator));
  nextAccumulator -= steps;

  if (steps === MAX_PHYSICS_STEPS_PER_FRAME && nextAccumulator >= 1) {
    nextAccumulator %= 1;
  }

  return { steps, accumulator: nextAccumulator };
}

export function shouldRenderFrame(
  elapsedSinceRenderMs: number,
  maxRenderFps = MAX_RENDER_FPS,
): boolean {
  const renderIntervalMs = maxRenderFps > 0
    ? 1000 / maxRenderFps
    : MIN_RENDER_INTERVAL_MS;
  return elapsedSinceRenderMs >= renderIntervalMs;
}

/** Keeps fractional refresh-rate time so 60 FPS stays close to 60 on 144 Hz displays. */
export function alignRenderTimestamp(
  timestamp: number,
  previousRenderTimestamp: number,
  maxRenderFps = MAX_RENDER_FPS,
): number {
  if (maxRenderFps <= 0) return timestamp;
  const renderIntervalMs = 1000 / maxRenderFps;
  const elapsed = Math.max(0, timestamp - previousRenderTimestamp);
  return timestamp - (elapsed % renderIntervalMs);
}
