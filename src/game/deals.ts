// Phase G: bilateral deals between the player and one bloc (money, chips, steel, intel, a treaty, a non-aggression pact).
// Pure module: no engine imports (the engine's reducer and the DealPanel call it). Federated model: applyDeal() moves only
// the side of the bloc it is given, so every human applies their own half and the host applies the AI bloc's half.

import { t } from '../i18n/index.ts';
import { personalityOf } from './ai/personality.ts';
import { fmtMoney } from './format.ts';
import type { DEHelpers } from './bonuses.ts';
import { basePrice } from './market.ts';
import type { GameState, Rival, TreatyId } from './types.ts';

export interface DealSide {
  money?: number;   // $B
  chips?: number;   // M chips
  steel?: number;   // kt steel
  intel?: boolean;  // exact numbers of the giver for INTEL_YEARS
}

export interface DealTerms {
  give: DealSide;          // what the proposer (`from`) pays out
  get: DealSide;           // what the proposer receives from `to`
  treaty?: TreatyId;       // a treaty both blocs sign (relation/tech gates are enforced by the engine on acceptance)
  napYears?: number;       // 0..10 non-aggression pact
  penalty?: number;        // $B the breaker pays the victim
}

export interface Deal {
  id: string;
  from: string;
  to: string;
  terms: DealTerms;
  year: number;
  status: 'open' | 'accepted' | 'declined' | 'broken';
}

/** Returned by applyDeal instead of writing state: the engine stores it in s.pacts. */
export interface PactRecord { with: string; until: number; penalty: number }

export const MAX_NAP_YEARS = 10;
/** Years of exact numbers gained from an intel exchange. */
export const INTEL_YEARS = 5;

// Value model for AI decisions, in $B-equivalent. Personality weights tilt it (see aiEvaluate).
const INTEL_VALUE = 8;
const TREATY_VALUE = 6;
const NAP_VALUE_PER_YEAR = 0.5;
const TREATY_IDS: TreatyId[] = ['trade', 'research', 'climate', 'safety'];

const num = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** The player's bloc (same rule as the UI: MP faction, else the chosen continent). */
export function playerBloc(s: GameState): string {
  return s.mp?.me ?? s.playerContinent ?? '';
}

function rivalOf(s: GameState, id: string): Rival | undefined {
  return s.rivals.find(r => r.id === id);
}

/** Cash, chips and steel a bloc can put into a deal, and the per-deal money cap. */
function stockOf(s: GameState, id: string): { money: number; moneyCap: number; chips: number; steel: number } {
  if (id === playerBloc(s)) {
    return { money: s.budget, moneyCap: Math.max(0, 3 * num(s.eco?.income)), chips: s.chips, steel: s.steel };
  }
  const r = rivalOf(s, id);
  if (!r) return { money: 0, moneyCap: 0, chips: 0, steel: 0 };
  // AI blocs keep cash in nation.budget (yearly income is gdp * 0.05). Chip and steel stocks are not modelled for rivals.
  return { money: r.nation?.budget ?? 0, moneyCap: 3 * r.gdp * 0.05, chips: Infinity, steel: Infinity };
}

export interface DealCheck { ok: boolean; reason: string }

/**
 * Checks a deal. side = 'from' | 'to' checks only that party's payments; 'both' checks both.
 * Money is capped at 3 years of income and at the payer's cash; chips and steel at the payer's stock.
 */
export function validateDeal(s: GameState, deal: Deal, side: 'from' | 'to' | 'both' = 'both'): DealCheck {
  const fail = (reason: string): DealCheck => ({ ok: false, reason });
  if (!deal.from || !deal.to || deal.from === deal.to) return fail(t('A deal needs two different blocs.'));
  const { give, get } = deal.terms;
  const all = [give.money, give.chips, give.steel, get.money, get.chips, get.steel, deal.terms.penalty];
  if (all.some(v => v !== undefined && (!Number.isFinite(v) || v < 0))) return fail(t('Amounts must be zero or more.'));
  const nap = deal.terms.napYears ?? 0;
  if (!Number.isInteger(nap) || nap < 0 || nap > MAX_NAP_YEARS) return fail(t('A non-aggression pact lasts 0 to {max} years.', { max: MAX_NAP_YEARS }));
  if (deal.terms.treaty && !TREATY_IDS.includes(deal.terms.treaty)) return fail(t('Unknown treaty.'));
  const empty = !give.money && !give.chips && !give.steel && !give.intel && !get.money && !get.chips && !get.steel && !get.intel && !deal.terms.treaty && nap === 0;
  if (empty) return fail(t('Empty deal: add something to give or get.'));

  const payers: Array<[string, DealSide]> = [];
  if (side === 'from' || side === 'both') payers.push([deal.from, give]);
  if (side === 'to' || side === 'both') payers.push([deal.to, get]);
  for (const [id, pay] of payers) {
    const st = stockOf(s, id);
    const money = num(pay.money), chips = num(pay.chips), steel = num(pay.steel);
    if (money > st.moneyCap) return fail(t('Money above {cap} per deal (3 years of income).', { cap: fmtMoney(st.moneyCap) }));
    if (money > st.money) return fail(t('Not enough money: {have} available.', { have: fmtMoney(st.money) }));
    if (chips > st.chips) return fail(t('Not enough chips: {have}M in stock.', { have: Math.floor(st.chips) }));
    if (steel > st.steel) return fail(t('Not enough steel: {have} kt in stock.', { have: Math.floor(st.steel) }));
  }
  const maxPenalty = Math.max(stockOf(s, deal.from).moneyCap, stockOf(s, deal.to).moneyCap);
  if (num(deal.terms.penalty) > maxPenalty) return fail(t('Penalty above {cap}.', { cap: fmtMoney(maxPenalty) }));
  return { ok: true, reason: '' };
}

/**
 * Moves the resources of ONE side (`me`, a bloc id) and returns the pact to record, if any.
 * The player's side changes s.budget / s.chips / s.steel and, for intel received, the rival's intelUntil.
 * An AI side changes its nation.budget. Call it once per participating side; it never touches the other side.
 */
export function applyDeal(s: GameState, deal: Deal, me: string): PactRecord | null {
  if (me !== deal.from && me !== deal.to) return null;
  const other = me === deal.from ? deal.to : deal.from;
  const pay = me === deal.from ? deal.terms.give : deal.terms.get;
  const got = me === deal.from ? deal.terms.get : deal.terms.give;
  const netMoney = num(got.money) - num(pay.money);
  if (me === playerBloc(s)) {
    s.budget = s.budget + netMoney;
    s.chips = s.chips + num(got.chips) - num(pay.chips);
    s.steel = s.steel + num(got.steel) - num(pay.steel);
    if (got.intel) s.rivals = s.rivals.map(r => (r.id === other ? { ...r, intelUntil: Math.max(r.intelUntil, s.year + INTEL_YEARS) } : r));
  } else {
    s.rivals = s.rivals.map(r => (r.id === me && r.nation
      ? { ...r, nation: { ...r.nation, budget: Math.max(0, r.nation.budget + netMoney) } }
      : r));
  }
  const nap = deal.terms.napYears ?? 0;
  return nap > 0 ? { with: other, until: s.year + nap, penalty: num(deal.terms.penalty) } : null;
}

/**
 * Would this AI bloc accept the player's terms? terms.give is what the AI receives, terms.get what it pays.
 * It accepts when what it receives is at least (1 + margin) times what it pays, with the margin set by relation
 * (friends accept a small loss, enemies want a clear gain). Hard gates: intel below relation 20, pacts with enemies,
 * treaties while relations are negative, and money it does not have.
 */
export function aiEvaluate(s: GameState, rival: Rival, terms: DealTerms): { accept: boolean; reason: string } {
  const no = (reason: string) => ({ accept: false, reason });
  const w = personalityOf(rival.id);
  const rel = rival.relation;
  const nap = terms.napYears ?? 0;
  if (rel <= -60) return no(t('They refuse to deal with you.'));
  if (num(terms.get.money) > (rival.nation?.budget ?? 0)) return no(t('They lack the funds.'));
  if (terms.get.intel && rel < 20) return no(t('They will not share intelligence below relation 20.'));
  if (nap > 0 && rel < -40) return no(t('They will not sign a pact with an enemy.'));
  if (terms.treaty && rel < 0) return no(t('They will not sign a treaty while relations are negative.'));

  const price = { chips: basePrice('chips', s.year), steel: basePrice('steel', s.year) };
  const chipW = 1 + w.compute + w.research;
  const steelW = 1 + w.defense;
  const intelW = 1 + 2 * w.covert;
  const napW = 1 + 2 * w.safety;
  const worth = (x: DealSide) => num(x.money) + num(x.chips) * price.chips * chipW + num(x.steel) * price.steel * steelW + (x.intel ? INTEL_VALUE * intelW : 0);
  const received = worth(terms.give) + (terms.treaty ? TREATY_VALUE : 0) + nap * NAP_VALUE_PER_YEAR * napW;
  const paid = worth(terms.get);
  if (received <= 0 && paid <= 0) return no(t('Nothing on the table.'));

  const margin = Math.min(0.4, Math.max(-0.05, 0.1 - rel / 500));
  const gain = received - paid;
  const need = margin * paid;
  if (gain >= need) return { accept: true, reason: t('Good terms for them.') };
  return no(t('Short by about {gap} of value.', { gap: fmtMoney(need - gain) }));
}

function treatyName(id: TreatyId): string {
  switch (id) {
    case 'trade': return t('Trade Treaty');
    case 'research': return t('Research Pact');
    case 'climate': return t('Climate Accord');
    case 'safety': return t('AI Safety Treaty');
  }
}

/** Plain-language lines for a deal, written from the proposer's side ("You give ..."). */
export function describeTerms(terms: DealTerms): string[] {
  const out: string[] = [];
  const g = terms.give, r = terms.get;
  if (num(g.money) > 0) out.push(t('You give {amount}', { amount: fmtMoney(num(g.money)) }));
  if (num(g.chips) > 0) out.push(t('You give {amount}M chips', { amount: num(g.chips) }));
  if (num(g.steel) > 0) out.push(t('You give {amount} kt steel', { amount: num(g.steel) }));
  if (g.intel) out.push(t('You give intelligence'));
  if (num(r.money) > 0) out.push(t('You get {amount}', { amount: fmtMoney(num(r.money)) }));
  if (num(r.chips) > 0) out.push(t('You get {amount}M chips', { amount: num(r.chips) }));
  if (num(r.steel) > 0) out.push(t('You get {amount} kt steel', { amount: num(r.steel) }));
  if (r.intel) out.push(t('You get intelligence'));
  if (terms.treaty) out.push(t('Treaty: {treaty}', { treaty: treatyName(terms.treaty) }));
  const nap = terms.napYears ?? 0;
  if (nap > 0) {
    out.push(t('Non-aggression pact for {years} years', { years: nap }));
    if (num(terms.penalty) > 0) out.push(t('Penalty if broken: {amount}', { amount: fmtMoney(num(terms.penalty)) }));
  }
  return out;
}

/** Logs and notifies the outcome of a deal for the player (engine-free: uses the DEHelpers services). */
export function reportDeal(s: GameState, h: DEHelpers, deal: Deal, outcome: 'proposed' | 'accepted' | 'declined'): void {
  const other = deal.from === h.me(s) ? deal.to : deal.from;
  const name = h.rivalName(other);
  const text = outcome === 'accepted' ? t('Deal with {name} accepted.', { name })
    : outcome === 'declined' ? t('{name} declined the deal.', { name })
      : t('Deal proposed to {name}.', { name });
  const tone = outcome === 'accepted' ? 'success' : outcome === 'declined' ? 'warning' : 'info';
  h.notify(s, text, tone);
  h.pushLog(s, name, text, tone);
}
