import { useEffect, useState, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { getPlayerPreferences, PREFERENCES_EVENT } from '@/utils/playerPreferences';

export default function ExperiencePreferences({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(getPlayerPreferences);
  useEffect(() => {
    const update = () => setPreferences(getPlayerPreferences());
    window.addEventListener(PREFERENCES_EVENT, update);
    return () => window.removeEventListener(PREFERENCES_EVENT, update);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', preferences.reducedMotion);
  }, [preferences.reducedMotion]);
  return <MotionConfig reducedMotion={preferences.reducedMotion ? 'always' : 'user'}>{children}</MotionConfig>;
}
