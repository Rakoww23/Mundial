import { useState, useCallback } from 'react';

export interface TutorialStep {
  /** data-tut attribute value on the target element, or null for a centred card */
  target: string | null;
  title: string;
  body: string;
}

const STORAGE_KEYS: Record<string, string> = {
  sim: 'mundial_tut_sim_v1',
  wc:  'mundial_tut_wc_v1',
  pk:  'mundial_tut_pk_v1',
};

export function useTutorial(mode: 'sim' | 'wc' | 'pk', steps: TutorialStep[]) {
  const key = STORAGE_KEYS[mode];

  const [active, setActive] = useState(() => localStorage.getItem(key) !== 'done');
  const [step,   setStep]   = useState(0);

  const close = useCallback(() => {
    localStorage.setItem(key, 'done');
    setActive(false);
  }, [key]);

  const next = useCallback(() => {
    setStep((s) => {
      const isLast = s >= steps.length - 1;
      if (isLast) {
        localStorage.setItem(key, 'done');
        setActive(false);
        return s;
      }
      return s + 1;
    });
  }, [steps.length, key]);

  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  const restart = useCallback(() => {
    localStorage.removeItem(key);
    setStep(0);
    setActive(true);
  }, [key]);

  return { active, step, next, prev, close, restart, total: steps.length };
}
