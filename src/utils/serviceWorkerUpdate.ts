export const SERVICE_WORKER_UPDATE_EVENT = 'oyuncak:sw-update-ready';

export type UpdateReadyHandler = () => void;

/**
 * Watches one registration and reports only updates to an already controlled app.
 * The first installation stays silent and becomes active on the next navigation.
 */
export function watchForServiceWorkerUpdate(
  registration: ServiceWorkerRegistration,
  hasController: () => boolean,
  onReady: UpdateReadyHandler,
): () => void {
  let observedWorker: ServiceWorker | null = null;

  const onStateChange = () => {
    if (observedWorker?.state === 'installed' && hasController()) onReady();
  };

  const onUpdateFound = () => {
    observedWorker?.removeEventListener('statechange', onStateChange);
    observedWorker = registration.installing;
    observedWorker?.addEventListener('statechange', onStateChange);
  };

  registration.addEventListener('updatefound', onUpdateFound);
  if (registration.waiting && hasController()) onReady();

  return () => {
    registration.removeEventListener('updatefound', onUpdateFound);
    observedWorker?.removeEventListener('statechange', onStateChange);
  };
}

export function requestWaitingServiceWorkerActivation(
  registration: ServiceWorkerRegistration,
): boolean {
  if (!registration.waiting) return false;
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}
