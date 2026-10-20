// Phase D1: strategic zones. Pure logic: the engine passes its shallow copy `s` and the DEHelpers services.
// Never imports engine.ts (circular). Every function copes with `s.zones` being undefined (not initialised yet).
import { t } from '../i18n/index.ts';
import { personalityOf } from './ai/personality.ts';
import { combine, type DEHelpers, type WorldBonus } from './bonuses.ts';
import type { GameState, ZoneId, ZoneState } from './types.ts';

export interface ZoneDef { id: ZoneId; name: string; resource: string; bonus: string; from: number; lat: number; lon: number }

// Names and texts are English source; the UI translates them with t(). lat/lon are reference data only
// (the world view places markers on territory anchors, see EvolvingMap).
export const ZONES: ZoneDef[] = [
  { id: 'taiwan', name: 'Taiwan Strait', resource: 'Chips', bonus: 'Chip imports −30%', from: 1960, lat: 24, lon: 121 },
  { id: 'gulf', name: 'Persian Gulf', resource: 'Energy', bonus: 'Power supply +10%', from: 1960, lat: 26, lon: 52 },
  { id: 'arctic', name: 'Arctic', resource: 'Cooling', bonus: 'Compute energy −10%', from: 2000, lat: 78, lon: 20 },
  { id: 'congo', name: 'Congo Basin', resource: 'Minerals', bonus: 'Steel +20%', from: 1960, lat: -4, lon: 22 },
  { id: 'suez', name: 'Suez Canal', resource: 'Trade', bonus: 'Trade treaties +25%', from: 1960, lat: 30.5, lon: 32.3 },
  { id: 'orbit', name: 'Earth orbit', resource: 'Satellites', bonus: 'Covert success +10%', from: 1965, lat: 10, lon: -40 },
];

// Historical starting influence (all other blocs start at 0).
const SEEDS: Partial<Record<ZoneId, Record<string, number>>> = {
  gulf: { na: 15, su: 10 },
  suez: { eu: 15 },
  taiwan: { na: 12, cn: 8 },
  congo: { eu: 10 },
  arctic: { su: 12, na: 8 },
};

// Zones each AI bloc courts every year (fixed table).
const FAVOURITES: Record<string, ZoneId[]> = {
  na: ['taiwan', 'gulf'], eu: ['suez', 'congo'], su: ['arctic', 'gulf'], cn: ['taiwan', 'congo'],
  af: ['congo', 'suez'], sa: ['congo', 'gulf'], in: ['suez', 'orbit'], oc: ['taiwan', 'arctic'],
};

const ZONE_BONUS: Record<ZoneId, Partial<WorldBonus>> = {
  taiwan: { chipImport: 0.7 },
  gulf: { powerSupply: 1.1 },
  arctic: { computeEnergy: 0.9 },
  congo: { steel: 1.2 },
  suez: { trade: 1.25 },
  orbit: { covert: 0.1 },
};

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function initZones(blocs: string[]): Record<ZoneId, ZoneState> {
  const out = {} as Record<ZoneId, ZoneState>;
  for (const z of ZONES) {
    const influence: Record<string, number> = {};
    for (const b of blocs) influence[b] = 0;
    for (const [b, v] of Object.entries(SEEDS[z.id] ?? {})) influence[b] = v;
    out[z.id] = { influence, holder: null };
  }
  return out;
}

export function zoneById(id: ZoneId): ZoneDef | undefined {
  return ZONES.find(z => z.id === id);
}

export function zoneOpen(id: ZoneId, year: number): boolean {
  const z = zoneById(id);
  return z !== undefined && year >= z.from;
}

/** The bloc with at least 40 influence and at least 10 more than every other bloc; otherwise null. */
export function zoneHolder(z: ZoneState | undefined): string | null {
  if (!z) return null;
  const ranked = Object.entries(z.influence).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;
  const [top, topV] = ranked[0];
  const second = ranked[1]?.[1] ?? 0;
  return topV >= 40 && topV - second >= 10 ? top : null;
}

function zoneLabel(id: ZoneId): string {
  const z = zoneById(id);
  return z ? t(z.name) : id;
}

/** 4 % of yearly income, at least 20, rounded to 5. */
export function influenceCost(s: GameState): number {
  const income = s.eco?.income ?? 0;
  return Math.max(20, Math.round((income * 0.04) / 5) * 5);
}

/** A coup costs twice an influence action. */
export function coupCost(s: GameState): number {
  return 2 * influenceCost(s);
}

export function influenceGain(s: GameState, zone: ZoneId, h: DEHelpers): number {
  return zone === 'orbit' && h.countBuildings(s, 'satellite') > 0 ? 12 : 8;
}

/** Sets one bloc's influence (clamped 0..100) without touching the holder. */
function setInfluence(s: GameState, zone: ZoneId, bloc: string, delta: number): void {
  const zones = s.zones;
  const z = zones?.[zone];
  if (!zones || !z) return;
  const cur = z.influence[bloc] ?? 0;
  s.zones = { ...zones, [zone]: { ...z, influence: { ...z.influence, [bloc]: clamp(cur + delta, 0, 100) } } };
}

/** Recomputes one zone's holder and reports the change: player lost (approval -2), player gained, rival gained. */
function refreshHolder(s: GameState, zone: ZoneId, h: DEHelpers): void {
  const zones = s.zones;
  const z = zones?.[zone];
  if (!zones || !z) return;
  const prev = z.holder;
  const next = zoneHolder(z);
  if (next === prev) return;
  s.zones = { ...zones, [zone]: { ...z, holder: next } };
  const me = h.me(s);
  const label = zoneLabel(zone);
  if (prev === me) {
    const text = next
      ? t('You lost the {zone} zone to {bloc}.', { zone: label, bloc: h.rivalName(next) })
      : t('You lost control of the {zone} zone.', { zone: label });
    h.notify(s, text, 'warning');
    s.approval = Math.max(0, s.approval - 2);
    h.pushLog(s, h.rivalName(me), text, 'warning');
  } else if (next === me) {
    const text = t('You now hold the {zone} zone.', { zone: label });
    h.notify(s, text, 'success');
    h.pushLog(s, h.rivalName(me), text, 'success');
  } else if (next) {
    h.pushLog(s, h.rivalName(next), t('{bloc} now holds the {zone} zone.', { bloc: h.rivalName(next), zone: label }), 'info');
  }
}

export function addInfluence(s: GameState, zone: ZoneId, bloc: string, delta: number, h: DEHelpers): void {
  if (!s.zones) return;
  setInfluence(s, zone, bloc, delta);
  refreshHolder(s, zone, h);
}

/** Zones held by a bloc (open zones only, by stored holder). */
export function heldBy(s: GameState, bloc: string): ZoneId[] {
  const zones = s.zones;
  if (!zones) return [];
  return ZONES.filter(z => zoneOpen(z.id, s.year) && zones[z.id]?.holder === bloc).map(z => z.id);
}

/** Player spends influenceCost and gains influenceGain in an open zone. */
export function playerInfluence(s: GameState, zone: ZoneId, h: DEHelpers): boolean {
  if (!s.zones || !zoneOpen(zone, s.year)) return false;
  const cost = influenceCost(s);
  if (s.budget < cost) return false;
  s.budget -= cost;
  addInfluence(s, zone, h.me(s), influenceGain(s, zone, h), h);
  return true;
}

/** Covert coup against a rival's influence in a zone: 45 % success. */
export function playerCoup(s: GameState, zone: ZoneId, target: string, h: DEHelpers): 'ok' | 'fail' | 'invalid' {
  const me = h.me(s);
  if (!s.zones || !zoneOpen(zone, s.year) || target === me) return 'invalid';
  const z = s.zones[zone];
  if (!z || !((z.influence[target] ?? 0) > 0)) return 'invalid';
  const cost = coupCost(s);
  if (s.budget < cost) return 'invalid';
  s.budget -= cost;
  const label = zoneLabel(zone);
  const bloc = h.rivalName(target);
  if (h.rand() < 0.45) {
    addInfluence(s, zone, target, -15, h);
    h.raiseTension(s, 6, me);
    const text = t('Your agents undermined {bloc} in the {zone} zone.', { bloc, zone: label });
    h.notify(s, text, 'success');
    h.pushLog(s, h.rivalName(me), text, 'info');
    return 'ok';
  }
  s.rivals = s.rivals.map(r => (r.id === target ? { ...r, relation: clamp(r.relation - 15, -100, 100) } : r));
  h.raiseTension(s, 9, me);
  const text = t('Your agents were exposed in the {zone} zone. {bloc} hardens its stance.', { bloc, zone: label });
  h.notify(s, text, 'danger');
  h.pushLog(s, bloc, text, 'danger');
  return 'fail';
}

/** Yearly tick: influence decays 5 %, AI blocs court their zones, aggressive blocs may strike the player, holders are refreshed. */
export function tickZones(s: GameState, h: DEHelpers): void {
  const zones0 = s.zones;
  if (!zones0) return;

  // 1. Decay 5 % a year.
  const decayed: Record<ZoneId, ZoneState> = { ...zones0 };
  for (const id of Object.keys(decayed) as ZoneId[]) {
    const z = decayed[id];
    const infl: Record<string, number> = {};
    for (const [b, v] of Object.entries(z.influence)) infl[b] = v * 0.95;
    decayed[id] = { ...z, influence: infl };
  }
  s.zones = decayed;

  // 2. AI blocs (not remote, with budget) court their favourite open zones; aggressive ones may strike the player.
  for (const r of s.rivals) {
    if (h.isRemote(s, r.id) || !((r.nation?.budget ?? 0) > 0)) continue;
    const covert = personalityOf(r.id).covert;
    // One favourite a year, 70 % of years: a focused bloc settles around 20–45 influence (gain × 0.7 / 2 / 5 % decay),
    // so it can hold a zone nobody contests, and a player spending every year can still take it.
    const gain = clamp(Math.round((4 * covert) / 0.2), 3, 6);
    const open = (FAVOURITES[r.id] ?? []).filter(zone => zoneOpen(zone, s.year));
    if (open.length && h.rand() < 0.7) setInfluence(s, open[Math.floor(h.rand() * open.length)], r.id, gain);
    const aggressive = r.strategy === 'aggressive' || covert >= 0.25;
    if (aggressive && h.rand() < 0.2) {
      const me = h.me(s);
      const held = heldBy(s, me);
      if (held.length > 0) {
        const zone = held[Math.floor(h.rand() * held.length)];
        setInfluence(s, zone, me, -15);
        const label = zoneLabel(zone);
        const text = t('{bloc} is running covert operations against your {zone} zone.', { bloc: h.rivalName(r.id), zone: label });
        h.notify(s, text, 'danger');
        h.pushLog(s, h.rivalName(r.id), text, 'danger');
      }
    }
  }

  // 3. Recompute holders (notifications fire on change).
  for (const z of ZONES) refreshHolder(s, z.id, h);
}

/** Sum of the zone effects held by a bloc, as a bonus for the engine to apply. */
export function zoneBonus(s: GameState, bloc: string): Partial<WorldBonus> {
  return combine(...heldBy(s, bloc).map(id => ZONE_BONUS[id]));
}
