import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

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
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProfileState(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const setProfile = useCallback((newProfile: Profile) => {
    setProfileState(newProfile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getAvatar = useCallback(() => {
    if (!profile) return undefined;
    return AVATARS.find(a => a.id === profile.avatarId);
  }, [profile]);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, clearProfile, getAvatar }}>
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

