// Applies accessibility settings to the document: colour-vision remap (CSS variables in
// accessibility.css), status shapes (.cb-shapes), text scale and subtitle flag.
// Self-applies on module load and on every settings change, so importing this module once is enough.
import { getSettings, subscribeSettings, type Settings } from './settings';
import '../accessibility.css';

export function applyAccessibility(s: Settings = getSettings()): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.colorblind = s.colorblind;
  root.classList.toggle('cb-shapes', s.colorblind !== 'off');
  root.style.fontSize = s.textScale === 1 ? '' : `${Math.round(s.textScale * 100)}%`;
  root.dataset.subtitles = s.subtitles ? 'on' : 'off';
}

applyAccessibility();
subscribeSettings(() => applyAccessibility());
