// Autosave to slot 'auto' every N in-game years (Settings → autosaveYears; 0 = off).
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../App';
import { saveGame } from '../game/save';
import { useSettings } from '../lib/settings';

const TOAST_MS = 2200;

/** Returns `justSaved` (true for ~2 s after each autosave) so the UI can show <AutosaveToast />. */
export function useAutosave(): { justSaved: boolean; lastSavedYear: number | null } {
  const { state } = useGame();
  const [settings] = useSettings();
  const [justSaved, setJustSaved] = useState(false);
  const [lastSavedYear, setLastSavedYear] = useState<number | null>(null);
  const baseline = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(state);
  latest.current = state;

  const inGame = state.screen === 'game' && !state.mp;
  const year = Math.floor(state.year);
  const every = settings.autosaveYears;

  useEffect(() => {
    if (!inGame) {
      baseline.current = null;
      return;
    }
    // First year seen in this game, or a load jumped backwards: restart the count from here.
    if (baseline.current === null || year < baseline.current) {
      baseline.current = year;
      return;
    }
    if (every <= 0 || year - baseline.current < every) return;
    baseline.current = year;
    if (saveGame(latest.current, 'auto')) {
      setLastSavedYear(year);
      setJustSaved(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setJustSaved(false), TOAST_MS);
    }
  }, [inGame, year, every]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { justSaved, lastSavedYear };
}
