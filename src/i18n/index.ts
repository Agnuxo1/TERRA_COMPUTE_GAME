// Translation core. The English source text IS the key: t('Collective Farm') → 'Granja colectiva'.
// Placeholders use braces: t('{name} sabotaged your {building}!', { name, building }).
// Pure module (no bundler features) so the engine and the Node simulators can use it too;
// dictionaries are loaded by ./loader.ts in the browser.

export type Locale = 'en' | 'es' | 'zh' | 'ja' | 'ru' | 'de' | 'fr' | 'ko' | 'pt' | 'pl' | 'it';

export const LOCALES: Array<{ id: Locale; name: string; english: string }> = [
  { id: 'en', name: 'English', english: 'English' },
  { id: 'es', name: 'Español', english: 'Spanish' },
  { id: 'zh', name: '简体中文', english: 'Chinese (Simplified)' },
  { id: 'ja', name: '日本語', english: 'Japanese' },
  { id: 'ru', name: 'Русский', english: 'Russian' },
  { id: 'de', name: 'Deutsch', english: 'German' },
  { id: 'fr', name: 'Français', english: 'French' },
  { id: 'ko', name: '한국어', english: 'Korean' },
  { id: 'pt', name: 'Português (Brasil)', english: 'Portuguese (Brazil)' },
  { id: 'pl', name: 'Polski', english: 'Polish' },
  { id: 'it', name: 'Italiano', english: 'Italian' },
];

let locale: Locale = 'en';
let dict: Record<string, string> = {};
const listeners = new Set<() => void>();

export function getLocale(): Locale { return locale; }

/** Installs a dictionary (called by the loader once the JSON has arrived). */
export function installLocale(l: Locale, d: Record<string, string>) {
  locale = l;
  dict = l === 'en' ? {} : d;
  for (const fn of listeners) fn();
}

export function subscribeLocale(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Translates an English source string; unknown strings fall back to English. */
export function t(src: string, params?: Record<string, string | number>): string {
  if (typeof src !== 'string') return String(src ?? '');
  const s = dict[src] || src;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (params[k] !== undefined ? String(params[k]) : m));
}
