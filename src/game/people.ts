// Phase E2: great scientists. Fictional people, hired for a bonus; rival spies can poach the best one.
// Pure logic: services arrive through DEHelpers so this module never imports engine.ts.
import { t } from '../i18n/index.ts';
import type { GameState, ScientistField, TalentState } from './types.ts';
import { combine, type DEHelpers, type WorldBonus } from './bonuses.ts';
import { fmtMoney } from './format.ts';

export interface ScientistDef { id: string; name: string; field: ScientistField; bonus: number; era: number }

/** English source labels; the UI renders them with t(). */
export const FIELD_LABEL: Record<ScientistField, string> = {
  compute: 'Compute',
  research: 'Research',
  alignment: 'Alignment',
  chips: 'Chips',
  economy: 'Economy',
  covert: 'Covert ops',
};

export const MAX_HIRED = 4;

const ERAS = [1960, 1970, 1980, 1990, 2000, 2010, 2020, 2030];

// Fictional roster: [name, field, bonus %, era]. Three per era, each era has three different fields, each field appears four times.
const ROSTER: Array<[string, ScientistField, number, number]> = [
  ['Ada Vance', 'compute', 6, 1960], ['Konrad Zeller', 'research', 7, 1960], ['Grace Holloway', 'economy', 8, 1960],
  ['Johann Neumark', 'alignment', 8, 1970], ['Ilya Sorokin', 'chips', 9, 1970], ['Mei Tanaka', 'covert', 7, 1970],
  ['Rafael Okoro', 'compute', 9, 1980], ['Ingrid Lund', 'alignment', 10, 1980], ['Dmitri Volna', 'economy', 9, 1980],
  ['Priya Raman', 'research', 10, 1990], ['Hugo Ferrand', 'chips', 11, 1990], ['Lena Kowalska', 'covert', 10, 1990],
  ['Tomás Iriarte', 'compute', 11, 2000], ['Yuki Hoshino', 'alignment', 12, 2000], ['Amara Diallo', 'covert', 11, 2000],
  ['Viktor Haas', 'research', 12, 2010], ['Sofia Marchetti', 'economy', 13, 2010], ['Chen Wei-Lan', 'chips', 13, 2010],
  ['Oskar Brandt', 'covert', 13, 2020], ['Nadia Haddad', 'compute', 14, 2020], ['Lucas Moreau', 'alignment', 14, 2020],
  ['Anya Petrova', 'research', 14, 2030], ['Kenji Arai', 'chips', 15, 2030], ['Beatriz Lobo', 'economy', 15, 2030],
];

function slug(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export const SCIENTISTS: ScientistDef[] = ROSTER.map(([name, field, bonus, era]) => ({ id: slug(name), name, field, bonus, era }));

const byId = (id: string): ScientistDef | undefined => SCIENTISTS.find(x => x.id === id);

/** Latest era start (1960, 1970, ...) that is <= year; never before 1960. */
export function currentEra(year: number): number {
  let era = ERAS[0];
  for (const e of ERAS) if (year >= e) era = e;
  return era;
}

function talentOf(s: GameState): TalentState {
  return s.talent ?? { hired: [], lost: [] };
}

export function initTalent(): TalentState {
  return { hired: [], lost: [] };
}

/** Scientists of the current era that are neither hired nor lost. */
export function available(s: GameState): ScientistDef[] {
  const tal = talentOf(s);
  const era = currentEra(s.year);
  return SCIENTISTS.filter(x => x.era === era && !tal.hired.includes(x.id) && !tal.lost.includes(x.id));
}

/** 15 % of yearly income, at least 30, rounded to 10. */
export function hireCost(s: GameState): number {
  return Math.max(30, Math.round((s.eco.income * 0.15) / 10) * 10);
}

/** Short bonus text for a card or a log line. */
export function bonusLabel(sc: ScientistDef): string {
  if (sc.field === 'alignment') return t('+{n} alignment/yr', { n: (sc.bonus / 10).toFixed(1) });
  return t('+{bonus}%', { bonus: sc.bonus });
}

export function canHire(s: GameState, id: string): { ok: boolean; reason?: string } {
  if (!available(s).some(x => x.id === id)) return { ok: false, reason: t('Not available in this era') };
  const tal = talentOf(s);
  if (tal.hired.length >= MAX_HIRED) return { ok: false, reason: t('Team full ({n}/{max})', { n: tal.hired.length, max: MAX_HIRED }) };
  const cost = hireCost(s);
  if (s.budget < cost) return { ok: false, reason: t('Not enough budget ({cost} needed)', { cost: fmtMoney(cost) }) };
  return { ok: true };
}

export function hire(s: GameState, id: string, h: DEHelpers): boolean {
  if (!canHire(s, id).ok) return false;
  const sc = byId(id);
  if (!sc) return false;
  const tal = talentOf(s);
  const cost = hireCost(s);
  s.budget -= cost;
  s.talent = { hired: [...tal.hired, id], lost: tal.lost };
  const field = t(FIELD_LABEL[sc.field]);
  h.notify(s, t('{name} joins your team: {field}, {bonus}.', { name: sc.name, field, bonus: bonusLabel(sc) }), 'success');
  h.pushLog(s, h.rivalName(h.me(s)), t('Hired {name} ({field}) for {cost}.', { name: sc.name, field, cost: fmtMoney(cost) }), 'success');
  return true;
}

/** Releases a hired scientist. No refund; a dismissed scientist does not come back (listed with the lost ones). */
export function dismiss(s: GameState, id: string): void {
  const tal = talentOf(s);
  if (!tal.hired.includes(id)) return;
  s.talent = {
    hired: tal.hired.filter(x => x !== id),
    lost: tal.lost.includes(id) ? tal.lost : [...tal.lost, id],
  };
}

/** Called by the director when a rival's steal succeeds against the player: 25 % chance to lose the best hired scientist. */
export function poach(s: GameState, thief: string, h: DEHelpers): string | null {
  if (h.rand() >= 0.25) return null;
  const tal = talentOf(s);
  if (!tal.hired.length) return null;
  let best = tal.hired[0];
  let bestBonus = -Infinity;
  for (const id of tal.hired) {
    const b = byId(id)?.bonus ?? 0;
    if (b > bestBonus) { best = id; bestBonus = b; }
  }
  const sc = byId(best);
  s.talent = { hired: tal.hired.filter(x => x !== best), lost: [...tal.lost, best] };
  const bloc = h.rivalName(thief);
  const name = sc?.name ?? best;
  const field = sc ? t(FIELD_LABEL[sc.field]) : '';
  h.notify(s, t('🕵 {bloc} poached {name}, your {field} lead.', { bloc, name, field }), 'danger');
  h.pushLog(s, bloc, t('Poached {name} ({field}).', { name, field }), 'danger');
  return best;
}

/** Effect of the hired team on a bloc's world bonuses (multipliers compound across scientists). */
export function talentBonus(s: GameState): Partial<WorldBonus> {
  const parts: Array<Partial<WorldBonus>> = [];
  for (const id of talentOf(s).hired) {
    const sc = byId(id);
    if (!sc) continue;
    const b = sc.bonus;
    switch (sc.field) {
      case 'compute': parts.push({ compute: 1 + b / 100 }); break;
      case 'research': parts.push({ research: 1 + b / 100 }); break;
      case 'chips': parts.push({ chips: 1 + b / 100 }); break;
      case 'economy': parts.push({ economy: 1 + b / 100 }); break;
      case 'alignment': parts.push({ alignment: b / 10 }); break;
      case 'covert': parts.push({ covert: b / 100 }); break;
    }
  }
  return combine(...parts);
}

/** Two-letter portrait text: first and last initial, or the first two letters of a one-word name. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = (w: string) => Array.from(w)[0] ?? '';
  if (words.length >= 2) return (first(words[0]) + first(words[words.length - 1])).toUpperCase();
  return Array.from(name.trim()).slice(0, 2).join('').toUpperCase();
}
