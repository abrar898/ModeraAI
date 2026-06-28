import { useEffect, useState } from 'react';

/**
 * Tracks the user's OS/browser color-scheme preference live.
 * Tailwind's `darkMode: 'media'` handles the actual styling via CSS,
 * this hook is only for cases where JS needs to know the mode too
 * (e.g. picking chart colors, GSAP-driven color values).
 */
export default function useSystemTheme() {
  const [isDark, setIsDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDark ? 'dark' : 'light';
}
