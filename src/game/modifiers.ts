// H3: pre-game modifiers. Plain data and helpers, no engine import (the engine receives `mods` through START_GAME).
// Labels and descriptions are English source keys; the UI translates them at render time with t(def.label).
// Mods absent or neutral = the historical balance, so default games are unchanged.
import { t } from '../i18n/index.ts';
import type { GameMods } from './types.ts';

export const MODS_KEY = 'terra_compute_mods';

export interface ModOption { value: number; label: string }

interface ModBase { label: string; description: string }

export interface ToggleModDef extends ModBase {
  key: 'noDynamicEvents' | 'fragilePlanet' | 'noCoal';
  control: 'toggle';
}

export interface OptionModDef extends ModBase {
  key: 'aiAggression' | 'pace' | 'chipPrice';
  control: 'options';
  /** Value that means "no modifier"; always one of `options`. */
  neutral: number;
  options: ModOption[];
}

export type ModDef = ToggleModDef | OptionModDef;

export const MOD_DEFS: ModDef[] = [
  {
    key: 'aiAggression', control: 'options', neutral: 1,
    label: 'Rival aggression',
    description: 'How often rivals act covertly against you.',
    options: [
      { value: 0.5, label: 'Calm' },
      { value: 1, label: 'Standard' },
      { value: 1.5, label: 'Hostile' },
    ],
  },
  {
    key: 'pace', control: 'options', neutral: 1,
    label: 'History pace',
    description: 'How fast the calendar moves.',
    options: [
      { value: 0.75, label: 'Slow' },
      { value: 1, label: 'Standard' },
      { value: 1.25, label: 'Fast' },
      { value: 1.5, label: 'Very fast' },
    ],
  },
  {
    key: 'chipPrice', control: 'options', neutral: 1,
    label: 'Chip prices',
    description: 'Multiplier on the chip market price.',
    options: [
      { value: 1, label: 'Standard' },
      { value: 2, label: 'Double' },
      { value: 3, label: 'Triple' },
    ],
  },
  {
    key: 'noDynamicEvents', control: 'toggle',
    label: 'No surprise events',
    description: 'Only the historical timeline. Dynamic, non-historical events are switched off.',
  },
  {
    key: 'fragilePlanet', control: 'toggle',
    label: 'Fragile planet',
    description: 'Planet damage from emissions is multiplied by 1.5.',
  },
  {
    key: 'noCoal', control: 'toggle',
    label: 'No coal',
    description: 'Coal plants cannot be built.',
  },
];

/** True when every field is absent or at its neutral value. */
export function isNeutral(m?: GameMods | null): boolean {
  if (!m) return true;
  return (m.aiAggression === undefined || m.aiAggression === 1)
    && (m.pace === undefined || m.pace === 1)
    && (m.chipPrice === undefined || m.chipPrice === 1)
    && !m.noDynamicEvents
    && !m.fragilePlanet
    && !m.noCoal;
}

/** Copy holding only the non-neutral fields. */
export function activeMods(m?: GameMods | null): GameMods {
  const out: Record<string, unknown> = {};
  if (!m) return out as GameMods;
  if (m.aiAggression !== undefined && m.aiAggression !== 1) out.aiAggression = m.aiAggression;
  if (m.pace !== undefined && m.pace !== 1) out.pace = m.pace;
  if (m.chipPrice !== undefined && m.chipPrice !== 1) out.chipPrice = m.chipPrice;
  if (m.noDynamicEvents) out.noDynamicEvents = true;
  if (m.fragilePlanet) out.fragilePlanet = true;
  if (m.noCoal) out.noCoal = true;
  return out as GameMods;
}

/** Value for the START_GAME `mods` field: undefined when neutral, so default games stay byte-identical. */
export function modsForGame(m?: GameMods | null): GameMods | undefined {
  return isNeutral(m) ? undefined : activeMods(m);
}

/** Returns a new mods object with one field set; neutral values are removed. */
export function setMod(m: GameMods, def: ModDef, value: number | boolean): GameMods {
  const next: Record<string, unknown> = { ...m };
  const neutralValue = def.control === 'toggle' ? value === false : value === def.neutral;
  if (neutralValue) delete next[def.key];
  else next[def.key] = value;
  return next as GameMods;
}

/** Short English chips for the non-neutral options, translated at call time. */
export function describeMods(m?: GameMods | null): string[] {
  const out: string[] = [];
  if (!m) return out;
  if (m.aiAggression !== undefined && m.aiAggression !== 1) {
    if (m.aiAggression >= 1.25) out.push(t('Hostile AI'));
    else if (m.aiAggression <= 0.75) out.push(t('Calm AI'));
    else out.push(t('AI aggression ×{x}', { x: m.aiAggression }));
  }
  if (m.pace !== undefined && m.pace !== 1) {
    if (m.pace >= 1.5) out.push(t('Very fast history'));
    else if (m.pace > 1) out.push(t('Fast history'));
    else if (m.pace <= 0.75) out.push(t('Slow history'));
    else out.push(t('History pace ×{x}', { x: m.pace }));
  }
  if (m.chipPrice !== undefined && m.chipPrice !== 1) {
    if (m.chipPrice === 3) out.push(t('Chips at triple price'));
    else if (m.chipPrice === 2) out.push(t('Chips at double price'));
    else out.push(t('Chips at {n}× price', { n: m.chipPrice }));
  }
  if (m.noDynamicEvents) out.push(t('No surprise events'));
  if (m.fragilePlanet) out.push(t('Fragile planet'));
  if (m.noCoal) out.push(t('No coal'));
  return out;
}

/** Last choice from localStorage. Unknown keys and off-list values are dropped. */
export function loadMods(): GameMods {
  try {
    const raw = localStorage.getItem(MODS_KEY);
    if (!raw) return {} as GameMods;
    const v = JSON.parse(raw) as Record<string, unknown> | null;
    const out: Record<string, unknown> = {};
    for (const def of MOD_DEFS) {
      const x = v?.[def.key];
      if (def.control === 'toggle') {
        if (x === true) out[def.key] = true;
      } else if (typeof x === 'number' && def.options.some(o => o.value === x) && x !== def.neutral) {
        out[def.key] = x;
      }
    }
    return out as GameMods;
  } catch {
    return {} as GameMods;
  }
}

export function saveMods(m: GameMods): void {
  try {
    localStorage.setItem(MODS_KEY, JSON.stringify(activeMods(m)));
  } catch {
    // storage unavailable
  }
}
