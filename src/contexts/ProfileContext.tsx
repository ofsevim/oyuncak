import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';

// Avatar seçenekleri
export const AVATARS = [
  { id: 'bear', emoji: '🐻', name: 'Ayıcık' },
  { id: 'bunny', emoji: '🐰', name: 'Tavşan' },
  { id: 'cat', emoji: '🐱', name: 'Kedicik' },
  { id: 'dog', emoji: '🐶', name: 'Köpek' },
  { id: 'fox', emoji: '🦊', name: 'Tilki' },
  { id: 'lion', emoji: '🦁', name: 'Aslan' },
  { id: 'panda', emoji: '🐼', name: 'Panda' },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn' },
  { id: 'dragon', emoji: '🐉', name: 'Ejderha' },
  { id: 'star', emoji: '⭐', name: 'Yıldız' },
  { id: 'rocket', emoji: '🚀', name: 'Roket' },
  { id: 'rainbow', emoji: '🌈', name: 'Gökkuşağı' },
];

export interface Profile {
  name: string;
  avatarId: string;
  createdAt: number;
}

interface ProfileContextType {
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  updateProfile: (name: string, avatarId?: string) => void;
  clearProfile: () => void;
  getAvatar: () => typeof AVATARS[0] | undefined;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const STORAGE_KEY = 'oyuncak-profile';
const NICKNAME_KEY = 'oyuncak.nickname';
const DEFAULT_AVATAR_ID = AVATARS[0].id;

function readInitialProfile(): Profile | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (
        typeof parsed === 'object' && parsed !== null &&
        typeof (parsed as Profile).name === 'string' &&
        typeof (parsed as Profile).avatarId === 'string' &&
        typeof (parsed as Profile).createdAt === 'number'
      ) {
        return parsed as Profile;
      }
      localStorage.removeItem(STORAGE_KEY);
    }
    const legacyNickname = localStorage.getItem(NICKNAME_KEY)?.trim();
    if (legacyNickname) {
      return { name: legacyNickname, avatarId: DEFAULT_AVATAR_ID, createdAt: Date.now() };
    }
  } catch { /* localStorage kullanılamıyor olabilir */ }
  return null;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(readInitialProfile);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === STORAGE_KEY || event.key === NICKNAME_KEY) {
        setProfileState(readInitialProfile());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setProfile = useCallback((newProfile: Profile) => {
    setProfileState(newProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
      localStorage.setItem(NICKNAME_KEY, newProfile.name);
    } catch { /* ignore */ }
  }, []);

  const updateProfile = useCallback((name: string, avatarId?: string) => {
    setProfileState((prev) => {
      const next: Profile = {
        name,
        avatarId: avatarId ?? prev?.avatarId ?? DEFAULT_AVATAR_ID,
        createdAt: prev?.createdAt ?? Date.now(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        localStorage.setItem(NICKNAME_KEY, name);
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(NICKNAME_KEY);
    } catch { /* ignore */ }
  }, []);

  const getAvatar = useCallback(() => {
    if (!profile) return undefined;
    return AVATARS.find((a) => a.id === profile.avatarId);
  }, [profile]);

  const value = useMemo(
    () => ({ profile, setProfile, updateProfile, clearProfile, getAvatar }),
    [profile, setProfile, updateProfile, clearProfile, getAvatar],
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
}
