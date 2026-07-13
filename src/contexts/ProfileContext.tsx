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
  clearProfile: () => void;
  getAvatar: () => typeof AVATARS[0] | undefined;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const STORAGE_KEY = 'oyuncak-profile';

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);

  useEffect(() => {
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
          setProfileState(parsed as Profile);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch { /* localStorage kullanılamıyor olabilir */ }
  }, []);

  const setProfile = useCallback((newProfile: Profile) => {
    setProfileState(newProfile);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile)); } catch { /* ignore */ }
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const getAvatar = useCallback(() => {
    if (!profile) return undefined;
    return AVATARS.find(a => a.id === profile.avatarId);
  }, [profile]);

  const value = useMemo(
    () => ({ profile, setProfile, clearProfile, getAvatar }),
    [profile, setProfile, clearProfile, getAvatar],
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


