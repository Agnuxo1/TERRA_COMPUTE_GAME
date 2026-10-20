// Browser side of i18n: lazy-loads one JSON dictionary per language and remembers the choice.
import { useSyncExternalStore } from 'react';
import { getLocale, installLocale, LOCALES, subscribeLocale, type Locale } from './index';

const KEY = 'terra_compute_locale';
const files = import.meta.glob<{ default: Record<string, string> }>('./locales/*.json');

function detect(): Locale {
  try {
    const saved = localStorage.getItem(KEY) as Locale | null;
    if (saved && LOCALES.some(l => l.id === saved)) return saved;
  } catch { /* storage unavailable */ }
  const nav = (navigator.language || 'en').toLowerCase();
  const hit = LOCALES.find(l => nav === l.id || nav.startsWith(`${l.id}-`));
  return hit?.id ?? 'en';
}

export async function setLocale(l: Locale) {
  try { localStorage.setItem(KEY, l); } catch { /* storage unavailable */ }
  document.documentElement.lang = l === 'zh' ? 'zh-Hans' : l === 'pt' ? 'pt-BR' : l;
  if (l === 'en') { installLocale('en', {}); return; }
  const load = files[`./locales/${l}.json`];
  if (!load) { installLocale('en', {}); return; }
  try { installLocale(l, (await load()).default); } catch { installLocale('en', {}); }
}

/** Loads the saved or browser language before the first render. */
export function initLocale(): Promise<void> { return setLocale(detect()); }

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, getLocale);
}
