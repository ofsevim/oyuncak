import { useCallback, useEffect, useState } from 'react';
import { isGameRouteId, type GameRouteId } from '@/constants/gameIds';

const KEY = 'oyuncak.library.v1';
const EVENT = 'oyuncak:library-changed';
interface Library { favorites: GameRouteId[]; recent: GameRouteId[] }
let session: Library | undefined;
function readLibrary(): Library {
  if (session) return session;
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const valid = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((id): id is GameRouteId => typeof id === 'string' && isGameRouteId(id)))] : [];
    return { favorites: valid(data.favorites), recent: valid(data.recent).slice(0, 5) };
  } catch { return { favorites: [], recent: [] }; }
}

export function useGameLibrary() {
  const [library, setLibrary] = useState(readLibrary);
  useEffect(() => {
    const update = (event: Event) => { if (event.type === 'storage') session = undefined; setLibrary(readLibrary()); };
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  const update = useCallback((change: (previous: Library) => Library) => {
    const next = change(readLibrary());
    session = next;
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Use session state. */ }
    window.dispatchEvent(new Event(EVENT));
    setLibrary(next);
  }, []);
  const toggleFavorite = useCallback((id: GameRouteId) => update((previous) => ({ ...previous,
    favorites: previous.favorites.includes(id) ? previous.favorites.filter((value) => value !== id) : [...previous.favorites, id],
  })), [update]);
  const remember = useCallback((id: GameRouteId) => update((previous) => ({ ...previous,
    recent: [id, ...previous.recent.filter((value) => value !== id)].slice(0, 5),
  })), [update]);
  return { ...library, toggleFavorite, remember };
}
