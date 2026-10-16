// ═══════════════════════════════════════════════════════════════════════════
//  TERRA COMPUTE — strategy engine (pure, deterministic given the RNG seed)
//
//  Loop: every tick advances time by dt years. Stocks (budget, population,
//  education, research, alignment, approval, world CO₂) integrate flows that
//  computeEconomy() derives from the buildings on the continent map.
//  Goal: reach 1 YottaFLOP + Superintelligence Theory and IGNITE with
//  alignment ≥ 80, before any rival does — without collapsing the planet.
// ═══════════════════════════════════════════════════════════════════════════

import {
  ASI_CAPABILITY, BONUS, COMPUTE_FLOPS, END_YEAR, LEVEL_MULT, MAX_LEVEL, SAFE_ALIGNMENT, SECTOR_GDP,
  ARCHIVE_MINIGAMES_STRATEGIST, buildingById, continentById, continents, historicalEvents, techById,
} from './data.ts';
import { generateContinentMap, neighbourTiles } from './mapgen.ts';
import { basePrice, PRICE_IMPACT, type Good } from './market.ts';
import { POLICY_COOLDOWN, POLICY_GDP_COST, policyById, policySlots } from './policies.ts';
import { mulberry32 } from './rng.ts';
import { applyDynamic, leaderOf, projectEvent, rollDynamic, type DynHelpers } from './dynamic-events.ts';
import { isHuman, isRemote, lagFor, outbox, playerName, type AIState, type MPMsg, type MPPlayer, type Snapshot } from './mp.ts';
import type {
  AIStrategy, BuildingId, Difficulty, Economy, ForecastWarning, GameEvent, GameMode, GameState, LogEntry, MapData, Modifier,
  Notification, PlacedBuilding, Rival, Tile, TreatyId,
} from './types.ts';

// ─── Time ────────────────────────────────────────────────────────────────
export const TICK_MS = 250;
export const YEARS_PER_TICK = 1 / 60; // 15 s per year at 1x

// ─── RNG kept outside React state so ticks stay cheap; reseeded per game ──
let rand = mulberry32(1);
export function reseed(seed: number) { rand = mulberry32(seed); }
const chance = (p: number) => rand() < p;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
let uid = 0;
const nid = (p: string) => `${p}-${++uid}-${Math.floor(rand() * 1e6)}`;

// ═══════════════════════════════════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type CovertOp = 'intel' | 'steal' | 'sabotage' | 'propaganda' | 'blackout';

export type Action =
  | { type: 'SET_MODE'; mode: GameMode }
  | { type: 'START_GAME'; continentId: string; seed?: number; difficulty?: Difficulty }
  | { type: 'TICK' }
  | { type: 'SELECT_TILE'; tileId: number | null }
  | { type: 'SET_PLACING'; building: BuildingId | null }
  | { type: 'BUILD'; tileId: number; building: BuildingId }
  | { type: 'UPGRADE'; tileId: number }
  | { type: 'DEMOLISH'; tileId: number }
  | { type: 'DEVELOP_REGION'; regionId: string }
  | { type: 'RESEARCH'; techId: string }
  | { type: 'SET_TAX'; rate: number }
  | { type: 'SET_POLICY'; policyId: string; on: boolean }
  | { type: 'TRADE'; good: Good; amount: number }
  | { type: 'DIPLOMACY'; rivalId: string; action: 'gift' | TreatyId | `cancel_${TreatyId}` }
  | { type: 'COVERT'; rivalId: string; op: CovertOp }
  | { type: 'RESOLVE_EVENT'; choice: number }
  | { type: 'MINIGAME_DONE'; minigame: string; stars: number }
  | { type: 'IGNITE_ASI' }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'OPEN_OVERLAY'; overlay: string }
  | { type: 'CLOSE_OVERLAY' }
  | { type: 'DISMISS_NOTIFICATION'; id: string }
  | { type: 'SET_SCREEN'; screen: GameState['screen'] }
  | { type: 'LOAD_STATE'; state: GameState }
  | { type: 'COUNTER_INTEL' }
  | { type: 'MP_RECV'; msg: MPMsg }
  | { type: 'MP_SNAPSHOT'; snap: Snapshot }
  | { type: 'MP_AI'; ai: AIState[] }
  | { type: 'MP_CLOCK'; speed: number; paused: boolean }
  | { type: 'MP_CLOCK_TENSION'; tension: number }
  | { type: 'MP_PLAYERS'; players: MPPlayer[]; offline?: boolean }
  | { type: 'MP_OUTBOX_CLEAR'; n: number };

// ═══════════════════════════════════════════════════════════════════════════
//  INITIAL STATE
// ═══════════════════════════════════════════════════════════════════════════

const emptyEconomy: Economy = {
  gdp: 0, income: 0, upkeep: 0, netBudget: 0, foodSupply: 0, foodDemand: 0, housingCap: 0, jobs: 0, workers: 0,
  unemployment: 0, energySupply: 0, energyDemand: 0, energyRatio: 1, researchRate: 0, computeRaw: 0, computeMult: 1,
  emissions: 0, alignmentGain: 0, alignmentPressure: 0, approvalTarget: 60, approvalFactors: [], eduTarget: 0, comfort: 0, staffing: 1,
  steelProd: 0, steelUse: 0, chipProd: 0, chipUse: 0, chipFactor: 1, policyCost: 0, imports: 0,
};

export const initialState: GameState = {
  screen: 'title', gameMode: null, seed: 1, year: 1960, startYear: 1960, tickCount: 0, playerContinent: null,
  map: null, ownedRegions: [], selectedTile: null, placing: null,
  budget: 0, steel: 0, chips: 0, population: 0, education: 0, researchPoints: 0, approval: 70, alignment: 50, capability: 6, compute: 1e6, taxRate: 0.22,
  legacy: { food: 0, housing: 0, jobs: 0, energy: 0, emissionsPerGW: 0.2 },
  eco: emptyEconomy,
  policies: [], policyCooldown: 0, priceMod: { steel: 1, chips: 1 }, history: [], difficulty: 'normal',
  unlockedTechs: [], researching: null, researchProgress: 0,
  rivals: [], co2: 0, temperature: 0.3, planetHealth: 100, doomClock: 12,
  firedEvents: [], eventQueue: [], activeEvent: null, modifiers: [], minigameResults: {}, playerLaunchReady: false,
  notifications: [], log: [], objectives: [], warnings: [], crisis: null,
  paused: false, speed: 1, overlay: null,
  gameOverReason: '', outcome: null, victoryYear: 0, totalBuildings: 0, totalTechs: 0, peakCapability: 6,
};

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function popScale(continentId: string | null): number {
  const c = continentById(continentId);
  return c ? clamp(c.basePopulation / 300, 0.05, 2.2) : 1;
}

function bonus<K extends string>(s: GameState, key: K): number | undefined {
  const b = BONUS[(s.playerContinent || 'na') as keyof typeof BONUS] as Record<string, number>;
  return b ? b[key] : undefined;
}

export const has = (s: GameState, tech: string) => s.unlockedTechs.includes(tech);
export const pol = (s: GameState, policy: string) => s.policies.includes(policy);

function modProduct(s: GameState, key: keyof Modifier): number {
  let v = 1;
  for (const m of s.modifiers) {
    const x = m[key];
    if (typeof x === 'number') v *= x;
  }
  return v;
}
function modSum(s: GameState, key: keyof Modifier): number {
  let v = 0;
  for (const m of s.modifiers) {
    const x = m[key];
    if (typeof x === 'number') v += x;
  }
  return v;
}
/** Permanent effects are modifiers that never expire. */
const PERMANENT = 9999;

export function operational(b?: PlacedBuilding): boolean {
  return !!b && (b.progress >= 1 || b.upgrading);
}
function effLevel(b: PlacedBuilding): number {
  return b.upgrading ? b.level - 1 : b.level;
}

export function countBuildings(s: GameState, type?: BuildingId, onlyOperational = false): number {
  if (!s.map) return 0;
  let n = 0;
  for (const t of s.map.tiles) {
    if (!t.building) continue;
    if (type && t.building.type !== type) continue;
    if (onlyOperational && !operational(t.building)) continue;
    n++;
  }
  return n;
}

export function scaledCost(s: GameState, type: BuildingId): number {
  const def = buildingById[type];
  const owned = countBuildings(s, type);
  let cost = def.cost * (1 + 0.06 * owned) * modProduct(s, 'buildCost');
  if (type === 'chipfab') cost *= modProduct(s, 'chipCost');
  if (type === 'gpucluster' && s.modifiers.some(m => m.id === 'alexnet_gpu')) cost *= 0.7;
  if ((type === 'solar' || type === 'nuclear') && s.modifiers.some(m => m.id === 'ukr_renew')) cost *= 0.7;
  cost *= policyCostMult(s, type);
  return Math.round(cost);
}

function policyCostMult(s: GameState, type: BuildingId): number {
  let m = 1;
  if (pol(s, 'mass_housing') && (type === 'housing' || type === 'hospital')) m *= 0.6;
  if (pol(s, 'education_drive') && (type === 'school' || type === 'uni')) m *= 0.75;
  if (pol(s, 'green_deal') && (type === 'solar' || type === 'nuclear')) m *= 0.75;
  if (pol(s, 'space_race') && type === 'satellite') m *= 0.7;
  return m;
}

/** Steel and chips needed to build a new copy. */
export function goodsCost(s: GameState, type: BuildingId): { steel: number; chips: number } {
  const def = buildingById[type];
  const k = 1 + 0.04 * countBuildings(s, type);
  return { steel: Math.round((def.steel ?? 0) * k), chips: Math.round((def.chips ?? 0) * k) };
}

export function upgradeGoods(s: GameState, tile: Tile): { steel: number; chips: number } {
  if (!tile.building) return { steel: 0, chips: 0 };
  const def = buildingById[tile.building.type];
  const f = tile.building.level === 1 ? 1.3 : 2.0;
  return { steel: Math.round((def.steel ?? 0) * f), chips: Math.round((def.chips ?? 0) * f) };
}

export function marketSpread(s: GameState): number {
  return pol(s, 'open_trade') ? 0.05 : 0.15;
}

export function marketPrice(s: GameState, good: Good, side: 'buy' | 'sell'): number {
  const p = basePrice(good, s.year) * s.priceMod[good] * (good === 'chips' && s.modifiers.some(m => m.id === 'chipwar_prices') ? 1.6 : 1);
  return side === 'buy' ? p * (1 + marketSpread(s)) : p * (1 - marketSpread(s));
}

export interface CostQuote {
  money: number;
  steel: number;
  chips: number;
  importSteel: number;
  importChips: number;
  importCost: number;
  total: number;
  ok: boolean;
  reason?: string;
}

/** Full price of a purchase: missing goods are imported at market price (unless Autarky forbids it). */
export function quote(s: GameState, money: number, goods: { steel: number; chips: number }): CostQuote {
  const importSteel = Math.max(0, goods.steel - Math.floor(s.steel));
  const importChips = Math.max(0, goods.chips - Math.floor(s.chips));
  const importCost = Math.round(importSteel * marketPrice(s, 'steel', 'buy') + importChips * marketPrice(s, 'chips', 'buy'));
  const total = money + importCost;
  let reason: string | undefined;
  if ((importSteel || importChips) && pol(s, 'autarky')) reason = `Autarky: produce ${importSteel ? `${importSteel} steel` : ''}${importSteel && importChips ? ' and ' : ''}${importChips ? `${importChips} chips` : ''} first`;
  else if (s.budget < total) reason = `Needs $${Math.round(total)}B`;
  return { money, steel: goods.steel, chips: goods.chips, importSteel, importChips, importCost, total, ok: !reason, reason };
}

export function buildQuote(s: GameState, type: BuildingId): CostQuote {
  return quote(s, scaledCost(s, type), goodsCost(s, type));
}

export function upgradeQuote(s: GameState, tile: Tile): CostQuote {
  return quote(s, upgradeCost(s, tile), upgradeGoods(s, tile));
}

/** Pays a quote: spends money, consumes stock, imports the rest and moves world prices. */
function payQuote(s: GameState, q: CostQuote) {
  s.budget -= q.total;
  s.steel = Math.max(0, s.steel - (q.steel - q.importSteel));
  s.chips = Math.max(0, s.chips - (q.chips - q.importChips));
  s.priceMod = {
    steel: s.priceMod.steel + q.importSteel * PRICE_IMPACT,
    chips: s.priceMod.chips + q.importChips * PRICE_IMPACT,
  };
}

export function upgradeCost(s: GameState, tile: Tile): number {
  if (!tile.building) return Infinity;
  const base = scaledCost(s, tile.building.type) / (1 + 0.06 * Math.max(0, countBuildings(s, tile.building.type) - 1));
  return Math.round(base * (tile.building.level === 1 ? 1.3 : 2.0));
}

export function buildTime(s: GameState, type: BuildingId): number {
  const unrest = s.approval < 35 ? 1.5 : 1;
  return buildingById[type].buildTime * (bonus(s, 'buildTime') ?? 1) * unrest;
}

export function regionCost(s: GameState, regionId: string): number {
  const region = s.map?.regions.find(r => r.id === regionId);
  if (!region) return Infinity;
  const owned = s.ownedRegions.length;
  return Math.round((80 + region.tiles.length * 18) * Math.pow(1.3, owned - 1) * (bonus(s, 'regionCost') ?? 1));
}

export function isUnlocked(s: GameState, type: BuildingId): boolean {
  const req = buildingById[type].requiresTech;
  return !req || has(s, req);
}

// ═══════════════════════════════════════════════════════════════════════════
//  PLACEMENT — terrain, deposits and adjacency. Shared by engine and UI.
// ═══════════════════════════════════════════════════════════════════════════

export interface Placement {
  ok: boolean;
  reason?: string;
  mult: number;
  notes: Array<{ label: string; value: string; good: boolean }>;
  energyFactor: number;
}

const COMPUTE_TYPES: BuildingId[] = ['mainframe', 'super', 'datacenter', 'gpucluster', 'aifactory'];
const POWER_TYPES: BuildingId[] = ['coal', 'nuclear', 'solar', 'fusion'];
const SMOKE_TYPES: BuildingId[] = ['coal', 'factory', 'chipfab'];

export function isCompute(type: BuildingId) { return COMPUTE_TYPES.includes(type); }

export function evaluatePlacement(s: GameState, tile: Tile, type: BuildingId, ignoreOccupied = false): Placement {
  const notes: Placement['notes'] = [];
  const fail = (reason: string): Placement => ({ ok: false, reason, mult: 0, notes, energyFactor: 1 });
  if (!s.map) return fail('No map');
  if (tile.terrain === 'water') return fail('Cannot build on water');
  if (!tile.region || !s.ownedRegions.includes(tile.region)) return fail('Region not developed yet');
  if (tile.building && !ignoreOccupied) return fail('Tile occupied');
  if (!isUnlocked(s, type)) return fail(`Requires ${techById[buildingById[type].requiresTech!]?.name}`);
  if (type === 'seaport' && !tile.coast) return fail('Seaports must be on the coast');
  if (type === 'nuclear' && !tile.coast && !tile.river) return fail('Needs cooling water: coast or river');

  const nb = neighbourTiles(s.map, tile).filter(n => n.building && n.building.progress > 0);
  const nbCount = (types: BuildingId[]) => nb.filter(n => types.includes(n.building!.type)).length;
  let mult = 1;
  const add = (label: string, delta: number) => {
    if (Math.abs(delta) < 0.001) return;
    mult += delta;
    notes.push({ label, value: `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}%`, good: delta > 0 });
  };
  const scale = (label: string, f: number) => {
    if (Math.abs(f - 1) < 0.001) return;
    mult *= f;
    notes.push({ label, value: `×${f.toFixed(2)}`, good: f > 1 });
  };
  const envprot = has(s, 'envprot');
  let energyFactor = 1;

  switch (type) {
    case 'farm': {
      const t = { fertile: 1.5, plains: 1, forest: 0.8, hills: 0.6, desert: 0.3, tundra: 0.3, water: 0 }[tile.terrain];
      scale(`Terrain: ${tile.terrain}`, t);
      add('Neighbouring farms', Math.min(0.3, nbCount(['farm']) * 0.1));
      const smoke = nbCount(SMOKE_TYPES);
      if (smoke) add('Smoke from industry', -(envprot ? 0.08 : 0.15) * smoke);
      break;
    }
    case 'solar': {
      const t = { desert: 1.6, tundra: 0.5, forest: 0.8, hills: 1.1, plains: 1, fertile: 1, water: 0 }[tile.terrain];
      scale(`Terrain: ${tile.terrain}`, t);
      const sun = continentById(s.playerContinent)?.solarPotential ?? 0.6;
      scale('National sunshine', sun / 0.6);
      break;
    }
    case 'coal':
      if (tile.deposit === 'coal') add('Coal seam', 0.5);
      break;
    case 'nuclear':
      if (tile.deposit === 'uranium') add('Uranium ore', 0.4);
      break;
    case 'factory':
      if (nbCount(['seaport', 'market'])) add('Logistics (port/market)', 0.2);
      if (tile.deposit === 'coal') add('Coal seam', 0.2);
      if (nbCount(['robot'])) add('Robotics next door', 0.3);
      break;
    case 'chipfab':
      if (tile.deposit === 'silicon') add('Silica deposit', 0.5);
      break;
    case 'market':
      add('Neighbouring housing', Math.min(0.4, nbCount(['housing']) * 0.1));
      break;
    case 'seaport':
      add('Neighbouring kombinats', Math.min(0.45, nbCount(['factory']) * 0.15));
      break;
    case 'school':
    case 'hospital':
      if (nbCount(['housing'])) add('Next to housing', 0.25);
      break;
    case 'uni':
      add('Academic cluster', Math.min(0.45, nbCount(['uni', 'lab']) * 0.15));
      break;
    case 'lab':
      add('Research cluster', Math.min(0.6, nbCount(['uni', 'lab', 'datacenter']) * 0.2));
      break;
    case 'defense':
      if (nbCount(['lab', 'uni', ...COMPUTE_TYPES])) add('Near researchers', 0.25);
      break;
    default:
      break;
  }
  if (isCompute(type)) {
    if (nbCount(POWER_TYPES)) add('Next to power plant', 0.1);
    if (nbCount(['chipfab'])) add('Next to chip foundry', 0.15);
    if (tile.terrain === 'tundra' || tile.coast) {
      energyFactor = 0.75;
      notes.push({ label: tile.terrain === 'tundra' ? 'Arctic cooling' : 'Sea-water cooling', value: '-25% energy', good: true });
    }
  }
  if (tile.terrain === 'forest' && type !== 'solar') notes.push({ label: 'Clears the forest', value: '-CO₂ sink', good: false });
  return { ok: true, mult: Math.max(0.1, mult), notes, energyFactor };
}

/** Comfort of a housing tile: +1 per nice neighbour, -2 per smoky one. */
export function housingComfort(s: GameState, tile: Tile): number {
  if (!s.map) return 0;
  let c = 0;
  const envprot = has(s, 'envprot');
  for (const n of neighbourTiles(s.map, tile)) {
    if (n.terrain === 'forest' && !n.building) c += 0.5;
    const b = n.building;
    if (!b || b.progress <= 0) continue;
    if (['school', 'hospital', 'market', 'uni'].includes(b.type)) c += 1;
    if (SMOKE_TYPES.includes(b.type)) c -= envprot ? 1 : 2;
  }
  return clamp(c, -4, 3);
}

// ═══════════════════════════════════════════════════════════════════════════
//  ECONOMY — all flows per year
// ═══════════════════════════════════════════════════════════════════════════

export function techComputeMult(s: GameState): number {
  let m = 1;
  for (const id of s.unlockedTechs) m *= techById[id]?.computeMult ?? 1;
  if (s.modifiers.some(x => x.id === 'moore_max')) m *= 1.5;
  return m;
}

export function computeEconomy(s: GameState): Economy {
  const map = s.map;
  const ps = popScale(s.playerContinent);
  const eco: Economy = { ...emptyEconomy, approvalFactors: [] };
  if (!map) return eco;

  // Aggregate building outputs
  let energySupply = s.legacy.energy * Math.max(0.35, 1 - 0.012 * (s.year - s.startYear));
  let energyDemandBuildings = 0;
  let foodFarms = 0, housingCap = 0, schoolCov = 0, uniCov = 0, hospitalCov = 0;
  let labRP = 0, uniRP = 0, spaceRP = 0;
  let jobs = s.legacy.jobs, automation = 0;
  let sectorGdp = 0, upkeep = 0, emissions = energySupply * s.legacy.emissionsPerGW;
  let computeRaw = 0, alignmentGain = 0, chipfabs = 0;
  let steelProd = 0, chipProd = 0, chipUse = 0;
  let comfortSum = 0, housingTiles = 0;
  let forestTiles = 0;

  const envprot = has(s, 'envprot');
  const farmMult = (has(s, 'greenrev') ? 1.4 : 1) * (bonus(s, 'farms') ?? 1) * modProduct(s, 'farms');
  const solarMult = (bonus(s, 'solar') ?? 1) * (has(s, 'renew') ? 1.5 : 1) * (s.modifiers.some(m => m.id === 'quantum_chem') ? 1.2 : 1);
  const industry = (bonus(s, 'industry') ?? 1);
  const safetyMult = (has(s, 'alignment') ? 1.5 : 1) * (has(s, 'interp') ? 1.5 : 1);
  const schoolMult = has(s, 'mass_edu') ? 1.2 : 1;
  const hospitalMult = s.modifiers.some(m => m.id === 'watson_health') ? 1.3 : 1;

  for (const t of map.tiles) {
    if (t.terrain === 'forest' && !t.building) forestTiles++;
    const b = t.building;
    if (!b) continue;
    const def = buildingById[b.type];
    // Buildings under construction still cost upkeep of their first level.
    const lvl = operational(b) ? effLevel(b) : 0;
    upkeep += def.upkeep * (lvl ? [0, 1, 1.8, 2.6][lvl] : 0.5) * (b.type === 'datacenter' && s.modifiers.some(m => m.id === 'dotcom_bailout') ? 0.7 : 1);
    if (!lvl) continue;
    const lm = LEVEL_MULT[lvl];
    const pl = evaluatePlacement(s, t, b.type, true);
    const m = pl.ok ? pl.mult : 1;
    jobs += def.jobs * ps * (1 + 0.5 * (lvl - 1));
    energyDemandBuildings += def.energyUse * lm * (pl.energyFactor || 1);
    let em = def.emissions * lm;
    if (envprot && (b.type === 'coal' || b.type === 'factory')) em *= 0.7;
    emissions += em;
    switch (b.type) {
      case 'farm': foodFarms += 30 * ps * lm * m * farmMult; break;
      case 'housing':
        housingCap += 30 * ps * lm;
        comfortSum += housingComfort(s, t); housingTiles++;
        break;
      case 'school': schoolCov += 30 * ps * lm * m * schoolMult; break;
      case 'uni': uniCov += 30 * ps * lm * m; uniRP += 8 * lm * m; break;
      case 'hospital': hospitalCov += 60 * ps * lm * m * hospitalMult; break;
      case 'lab': labRP += 12 * lm * m; break;
      case 'satellite': spaceRP += 10 * lm; break;
      case 'coal': case 'nuclear': case 'fusion': {
        let e = def.energyProduce * lm * m;
        if (b.type === 'nuclear') e *= bonus(s, 'nuclear') ?? 1;
        energySupply += e;
        break;
      }
      case 'solar': energySupply += def.energyProduce * lm * m * solarMult; break;
      case 'defense': alignmentGain += 0.8 * lm * m * safetyMult; break;
      case 'robot': automation += 6 * ps * lm; break;
      case 'chipfab':
        chipfabs++;
        chipProd += 30 * lm * m;
        break;
      case 'factory': steelProd += 6 * lm * m * industry; break;
      default: break;
    }
    if (def.chipUpkeep) chipUse += def.chipUpkeep * lm;
    const sg = SECTOR_GDP[b.type];
    if (sg) {
      let g = sg * lm * m;
      if (b.type === 'factory') g *= industry * (bonus(s, 'factory') ?? 1);
      sectorGdp += g;
    }
    const fl = COMPUTE_FLOPS[b.type];
    if (fl) computeRaw += fl * lm * m;
  }

  // Energy
  const householdDemand = s.population * 0.12 * (1 + s.education / 200) * (1 + (s.year - 1960) / 90);
  const energyDemand = (householdDemand + energyDemandBuildings) * modProduct(s, 'energyDemand');
  energySupply *= modProduct(s, 'energySupply');
  const energyRatio = energyDemand > 0 ? clamp(energySupply / energyDemand, 0, 1) : 1;

  // Labour
  if (pol(s, 'mass_housing')) housingCap *= 1.15;
  const workers = s.population * 0.45 + automation;
  const staffing = jobs > 0 ? clamp(workers / jobs, 0, 1) : 1;
  const unemployment = clamp(1 - jobs / Math.max(workers, 1), 0, 1);
  const employed = Math.min(workers, jobs);

  // Food, housing, education, health
  const foodSupply = (s.legacy.food + foodFarms) * climateFarmFactor(s);
  const foodDemand = s.population;
  const totalHousing = s.legacy.housing + housingCap;
  const baseEdu = 10 + (continentById(s.playerContinent)?.techLevel ?? 4) * 3;
  // Pre-1960 schooling holds the starting level; schools lift it towards ~75, universities towards 100.
  const eduTarget = clamp(baseEdu + (100 - baseEdu) * (0.62 * Math.min(1, schoolCov / Math.max(1, s.population)) + 0.38 * Math.min(1, uniCov / Math.max(1, s.population))), 0, 100);
  const health = clamp(hospitalCov / Math.max(1, s.population) * 2.5, 0, 1);

  // GDP
  let gdpMult = 1;
  if (has(s, 'pc')) gdpMult *= 1.1;
  if (has(s, 'web')) gdpMult *= 1.1;
  if (has(s, 'agentic')) gdpMult *= 1.15;
  gdpMult *= modProduct(s, 'gdp');
  if (pol(s, 'free_market')) gdpMult *= 1.12;
  if (pol(s, 'green_deal')) gdpMult *= 0.95;
  const unrest = s.approval < 35 ? 0.85 : 1;
  const productivity = baseProductivity(s);
  const gdp = (employed * productivity * (0.6 + s.education / 100 * 0.9) + sectorGdp * staffing) * gdpMult * unrest * (0.5 + 0.5 * energyRatio);
  const tradeIncome = s.rivals.reduce((sum, r) => sum + (r.treaties.includes('trade') ? tradeValue(s, r) : 0), 0) * (pol(s, 'open_trade') ? 1.5 : 1);
  const income = gdp * s.taxRate + tradeIncome;
  if (s.modifiers.some(m => m.id === 'agents_state')) upkeep *= 0.85;
  if (pol(s, 'austerity')) upkeep *= 0.85;
  const policyCost = s.policies.reduce((sum, p) => sum + (POLICY_GDP_COST[p] ?? 0) * gdp, 0);
  const debtInterest = s.budget < 0 ? -s.budget * 0.1 : 0;

  // Goods: own production, and chips the hardware burns every year
  const goodsMult = staffing * energyRatio * (pol(s, 'autarky') ? 1.25 : 1);
  steelProd *= goodsMult * (pol(s, 'five_year_plan') ? 1.35 : 1) * (pol(s, 'free_market') ? 0.9 : 1) * (pol(s, 'open_trade') ? 0.9 : 1);
  chipProd *= goodsMult * (0.5 + s.education / 200);
  const chipGap = Math.max(0, chipUse - chipProd);
  const imports = s.chips <= 1 && !pol(s, 'autarky') ? chipGap * marketPrice(s, 'chips', 'buy') : 0;
  const netBudget = income - upkeep - policyCost - debtInterest - imports;

  // Research
  let researchMult = (bonus(s, 'research') ?? 1) * modProduct(s, 'research');
  if (has(s, 'internet')) researchMult *= 1.15;
  if (has(s, 'backprop')) researchMult *= 1.1;
  if (has(s, 'agentic')) researchMult *= 1.2;
  if (has(s, 'agi')) researchMult *= 1.5;
  researchMult *= 1 + 0.1 * s.rivals.filter(r => r.treaties.includes('research')).length;
  if (pol(s, 'space_race')) researchMult *= 1.1;
  if (pol(s, 'propaganda')) researchMult *= 0.95;
  if (pol(s, 'manhattan_ai')) researchMult *= 1.15;
  const policyCompute = (pol(s, 'manhattan_ai') ? 1.35 : 1) * (pol(s, 'safety_first') ? 0.9 : 1);
  const chipFactor = s.eco.chipFactor ?? 1;
  const baseRP = 15 + (continentById(s.playerContinent)?.techLevel ?? 4) * 3;
  const humanRP = (baseRP + (labRP + uniRP + spaceRP) * staffing * energyRatio) * (0.4 + s.education / 100);
  const compute = computeRaw * techComputeMult(s) * (1 + 0.12 * Math.min(4, chipfabs)) * policyCompute * chipFactor * energyRatio * Math.sqrt(staffing);
  const capability = Math.log10(Math.max(1, compute));
  const computeRP = has(s, 'dl') ? 30 * Math.max(0, capability - 14) ** 2 : 0;
  const researchRate = (humanRP + computeRP) * researchMult;

  // Alignment
  const pressure = Math.max(0, capability - 15) ** 2 * 0.12 * (has(s, 'interp') ? 0.75 : 1) * (pol(s, 'manhattan_ai') ? 1.5 : 1);
  alignmentGain = alignmentGain * energyRatio * (pol(s, 'safety_first') ? 1.6 : 1) + modSum(s, 'alignment');

  // Emissions (forests absorb)
  const sink = forestTiles * 0.4 * (bonus(s, 'forestSink') ?? 1);
  if (pol(s, 'green_deal')) emissions *= 0.7;
  emissions = Math.max(0, emissions - sink) + (s.modifiers.some(m => m.id === 'ukr_coal') ? 40 : 0) + (s.modifiers.some(m => m.id === 'greenrev_adopt') ? 3 : 0);

  // Approval target
  const f: Array<{ label: string; value: number }> = [];
  f.push({ label: 'Baseline', value: 55 + (bonus(s, 'approval') ?? 0) });
  const fr = foodSupply / Math.max(1, foodDemand);
  f.push({ label: 'Food', value: fr >= 1.05 ? 5 : fr >= 1 ? 0 : -(1 - fr) * 120 });
  const over = s.population / Math.max(1, totalHousing);
  f.push({ label: 'Housing', value: over > 1 ? -(over - 1) * 150 : over < 0.95 ? 3 : 0 });
  f.push({ label: 'Jobs', value: unemployment > 0.06 ? -(unemployment - 0.06) * 150 : unemployment < 0.03 ? 3 : 0 });
  f.push({ label: 'Healthcare', value: health * 10 - 3 });
  const comfort = housingTiles ? comfortSum / housingTiles : 0;
  f.push({ label: 'Neighbourhoods', value: clamp(comfort * 2, -6, 6) });
  f.push({ label: 'Taxes', value: -(s.taxRate - 0.2) * 100 });
  f.push({ label: 'Power cuts', value: -(1 - energyRatio) * 60 });
  f.push({ label: 'Climate damage', value: -(100 - s.planetHealth) * 0.12 });
  f.push({ label: 'Education', value: s.education * 0.05 });
  const modApproval = modSum(s, 'approval');
  if (modApproval) f.push({ label: 'Events', value: modApproval });
  const polApproval = (pol(s, 'welfare') ? 8 : 0) + (pol(s, 'austerity') ? -8 : 0) + (pol(s, 'five_year_plan') ? -4 : 0) + (pol(s, 'free_market') ? -2 : 0)
    + (pol(s, 'autarky') ? 3 : 0) + (pol(s, 'open_trade') ? -2 : 0) + (pol(s, 'propaganda') ? 7 : 0) + (pol(s, 'security_state') ? -5 : 0);
  if (polApproval) f.push({ label: 'Policies', value: polApproval });
  if (s.budget < 0) f.push({ label: 'Debt', value: -8 });
  const approvalTarget = clamp(f.reduce((a, b) => a + b.value, 0), 0, 100);

  return {
    gdp, income, upkeep, netBudget, foodSupply, foodDemand, housingCap: totalHousing, jobs, workers, unemployment,
    energySupply, energyDemand, energyRatio, researchRate, computeRaw, computeMult: techComputeMult(s) * (1 + 0.12 * Math.min(4, chipfabs)) * policyCompute,
    emissions, alignmentGain, alignmentPressure: pressure, approvalTarget, approvalFactors: f, eduTarget, comfort, staffing,
    steelProd, steelUse: 0, chipProd, chipUse, chipFactor, policyCost, imports,
  };
}

function climateFarmFactor(s: GameState): number {
  const drought = s.modifiers.filter(m => m.id.startsWith('drought')).length ? 0.8 : 1;
  const heat = s.planetHealth < 30 ? 0.85 : s.planetHealth < 50 ? 0.93 : 1;
  return drought * heat;
}

function baseProductivity(s: GameState): number {
  // $B of GDP per million employed workers, growing with general technical progress.
  const c = continentById(s.playerContinent);
  const base = c ? (700 + c.gdp1960 * 0.3) / (c.basePopulation * 0.45 * 0.93 * (0.6 + (10 + c.techLevel * 3) / 100 * 0.9)) : 5;
  return base * Math.pow(1.018, s.year - 1960);
}

function tradeValue(s: GameState, r: Rival): number {
  return 0.015 * Math.min(s.eco.gdp || 1000, r.gdp) * (1 + 0.15 * countBuildings(s, 'seaport', true));
}

// ═══════════════════════════════════════════════════════════════════════════
//  RIVALS
// ═══════════════════════════════════════════════════════════════════════════

const CURVE: Array<[number, number]> = [
  [1960, 6], [1970, 8], [1980, 10.5], [1990, 12.5], [2000, 14.5], [2010, 17], [2015, 18.5], [2020, 20], [2025, 21.5], [2030, 23], [2036, 24.2], [2045, 26],
];
export function historicalCapability(year: number): number {
  if (year <= CURVE[0][0]) return CURVE[0][1];
  for (let i = 1; i < CURVE.length; i++) {
    if (year <= CURVE[i][0]) {
      const [y0, c0] = CURVE[i - 1];
      const [y1, c1] = CURVE[i];
      return c0 + ((year - y0) / (y1 - y0)) * (c1 - c0);
    }
  }
  return CURVE[CURVE.length - 1][1];
}

const STRATEGY_OF: Record<string, AIStrategy> = { na: 'tech', eu: 'balanced', su: 'aggressive', cn: 'aggressive', af: 'balanced', sa: 'economic', in: 'tech', oc: 'defensive' };
const LAG_OF: Record<AIStrategy, number> = { aggressive: -2.2, tech: -1.2, balanced: 0.3, economic: 1.2, defensive: 2 };
const ALIGN_OF: Record<AIStrategy, number> = { aggressive: 32, tech: 48, balanced: 52, economic: 45, defensive: 60 };
// Cold-war affinities (symmetric), -40..40
const AFFINITY: Record<string, number> = {
  'na-eu': 35, 'na-su': -35, 'na-cn': -15, 'na-oc': 30, 'na-sa': 10, 'na-in': 5, 'na-af': 0,
  'eu-su': -25, 'eu-cn': -5, 'eu-oc': 20, 'eu-af': 10, 'eu-in': 10, 'eu-sa': 10,
  'su-cn': 10, 'su-in': 15, 'su-af': 5, 'su-sa': 0, 'su-oc': -20,
  'cn-in': -15, 'cn-af': 10, 'cn-sa': 5, 'cn-oc': -10,
  'af-sa': 15, 'af-in': 10, 'af-oc': 0, 'sa-in': 5, 'sa-oc': 5, 'in-oc': 5,
};
export function affinity(a: string, b: string): number {
  return AFFINITY[`${a}-${b}`] ?? AFFINITY[`${b}-${a}`] ?? 0;
}

const DIFF_LAG: Record<Difficulty, number> = { easy: 1.5, normal: 0, hard: -1.2 };
const DIFF_CLIMATE: Record<Difficulty, number> = { easy: 0.85, normal: 1, hard: 1.15 };

function createRivals(player: string, mode: GameMode, startYear: number, difficulty: Difficulty): Rival[] {
  return continents.filter(c => c.id !== player).map(c => {
    const strategy = STRATEGY_OF[c.id];
    const techLag = (5 - c.techLevel) * 0.25;
    const lag = LAG_OF[strategy] + techLag + (rand() - 0.5) * 1.2 + (mode === 'pioneer' ? 3 : mode === 'strategist' ? 1.8 : 0) + DIFF_LAG[difficulty];
    const yearsIn = startYear - 1960;
    return {
      id: c.id, strategy,
      gdp: (700 + c.gdp1960 * 0.3) * Math.pow(1.03, yearsIn),
      population: c.basePopulation * Math.pow(1.014, yearsIn),
      capability: historicalCapability(startYear - lag),
      lag,
      alignment: ALIGN_OF[strategy],
      emissions: 0,
      cleanShare: 0.05,
      stability: 70,
      relation: affinity(player, c.id),
      treaties: [],
      intelUntil: 0,
      asiLaunched: false,
      lastAction: '',
      cooldown: 1 + rand() * 3,
    };
  });
}

function rivalName(id: string) { return continentById(id)?.name ?? id; }

function tickRivals(s: GameState, dt: number) {
  const year = s.year;
  const pioneer = s.gameMode === 'pioneer';
  // A clear lead frightens the hawks: aggressive and tech-first blocs turn hostile and target your compute.
  const lead = s.capability - Math.max(...s.rivals.map(r => r.capability));
  const feared = !pioneer && lead > 0.6 && year > 1965;
  if (feared && !s.firedEvents.includes('lead-fear')) {
    s.firedEvents = [...s.firedEvents, 'lead-fear'];
    notify(s, '⚠ Your lead in the race alarms the world. Hawkish rivals will turn on your compute — AI Safety Institutes defend it.', 'warning');
    pushLog(s, 'World', 'Your bloc now leads the race to superintelligence.', 'warning');
  }
  s.rivals = s.rivals.map(r0 => {
    const r = { ...r0, treaties: [...r0.treaties] };
    const remote = isRemote(s, r.id);   // multiplayer: world values arrive from the network
    const human = isHuman(s, r.id);
    if (r.heat) r.heat = Math.max(0, r.heat - 0.3 * dt);
    if (!remote) {
      const climateDrag = s.planetHealth < 40 ? 0.01 : 0;
      const growth = 0.028 + (r.strategy === 'economic' ? 0.008 : 0) - (r.stability < 40 ? 0.015 : 0) - climateDrag;
      r.gdp *= 1 + growth * dt;
      r.population *= 1 + 0.012 * dt;
      if (r.stability < 40) r.lag += 0.25 * dt;
      if (r.treaties.includes('safety')) r.lag += 0.08 * dt;
      r.capability = Math.max(r.capability, historicalCapability(year - r.lag));
      r.stability = clamp(r.stability + 3 * dt, 0, 85);
      // Alignment drift
      if (year > 2012) r.alignment = clamp(r.alignment + (r.strategy === 'aggressive' ? -0.35 : 0.25) * dt + (r.treaties.includes('safety') ? 1.2 * dt : 0), 5, 95);
      // Energy transition
      const cleanTrend = 0.02 + Math.max(0, year - 1970) * (r.strategy === 'defensive' || r.strategy === 'balanced' ? 0.009 : r.strategy === 'aggressive' ? 0.005 : 0.007);
      r.cleanShare = clamp(Math.max(r.cleanShare, cleanTrend + (r.treaties.includes('climate') ? 0.25 : 0)), 0, 0.92);
      r.emissions = 34 * Math.pow(r.gdp / 1000, 0.75) * (1 - r.cleanShare);
    }
    // Relations relax toward the cold-war baseline
    const base = affinity(s.playerContinent || '', r.id) - (feared && (r.strategy === 'aggressive' || r.strategy === 'tech') ? 25 : 0);
    r.relation = clamp(r.relation + (base - r.relation) * 0.04 * dt + (r.treaties.length ? 0.6 * dt : 0) - (pol(s, 'propaganda') ? dt : 0), -100, 100);

    // Notable actions (human players act for themselves)
    r.cooldown -= dt;
    if (r.cooldown <= 0 && !human) {
      r.cooldown = 2 + rand() * 3;
      rivalAction(s, r, pioneer);
    }

    // Final act: a rival close to ignition announces a crash project (one decision per rival).
    if (!pioneer && !remote && r.project === undefined && year >= 2012 && s.gameMode !== 'logic') {
      const eta = rivalEta(r);
      if (eta - year <= 4) {
        r.project = Math.floor(year);
        pushLog(s, rivalName(r.id), `${leaderOf(r.id)} announced a national ASI project.`, 'danger');
        // One crisis decision every two years at most; later projects are announced on the news.
        if (year - (s.dyn?.lastProject ?? -99) >= 2) {
          s.dyn = { ...(s.dyn ?? { last: {}, nextElection: s.startYear + 6, lastAny: 0 }), lastProject: year };
          queueEvent(s, projectEvent(s, r, eta, H));
        } else notify(s, `🚨 ${rivalName(r.id)} has also launched an ASI project.`, 'danger');
      }
    }

    // ASI launch
    if (!pioneer && !remote && !r.asiLaunched && r.capability >= ASI_CAPABILITY && year >= 2027) {
      r.asiLaunched = true;
      const rogue = rand() < Math.max(0, (SAFE_ALIGNMENT - r.alignment) / SAFE_ALIGNMENT);
      outbox(s, { t: 'end', who: r.id, human: false, safe: !rogue, year: Math.floor(year) });
      s.outcome = rogue ? 'rogue_rival' : 'rival_asi';
      s.gameOverReason = rogue
        ? `${rivalName(r.id)} ignited an unaligned superintelligence in ${Math.floor(year)} (alignment ${Math.round(r.alignment)}%). It optimised the planet for its own goals. Humanity's story ended with a prompt.`
        : `${rivalName(r.id)} ignited a safe superintelligence in ${Math.floor(year)}. The future is theirs to write — your bloc becomes a footnote.`;
    }
    return r;
  });
}

function rivalAction(s: GameState, r: Rival, pioneer: boolean) {
  const name = rivalName(r.id);
  const defense = countBuildings(s, 'defense', true);
  const opsMult = bonus(s, 'enemyOps') ?? 1;
  if (!pioneer && r.relation < -20 && (r.strategy === 'aggressive' || r.relation < -50) && s.year > 1970 && chance(0.6)) {
    const powers = s.modifiers.some(m => m.id === 'emergency_powers') ? 0.7 : 1;
    const sweep = s.modifiers.some(m => m.id === 'counterintel') ? 0.6 : 1;
    raiseTension(s, 3);
    const success = clamp((0.55 - defense * 0.08) * opsMult * powers * sweep * (pol(s, 'security_state') ? 0.5 : 1), 0.05, 0.9);
    if (rand() < success) {
      if (s.capability > 12 && chance(0.5)) {
        const targets = s.map!.tiles.filter(t => t.building && isCompute(t.building.type) && t.building.progress >= 1);
        if (targets.length) {
          const t = pick(targets);
          t.building = { ...t.building!, progress: 0.4 };
          pushLog(s, name, `Cyber-sabotage hit your ${buildingById[t.building.type].name}. Repairs underway.`, 'danger');
          notify(s, `⚠ ${name} sabotaged a ${buildingById[t.building.type].short}! Build AI Safety Institutes to defend.`, 'danger');
          r.lastAction = 'Sabotaged your compute';
          return;
        }
      }
      const stolen = Math.round(s.researchPoints * 0.15 + s.researchProgress * 0.2);
      s.researchPoints = Math.max(0, s.researchPoints - s.researchPoints * 0.15);
      s.researchProgress = Math.max(0, s.researchProgress * 0.8);
      pushLog(s, name, `Spies stole ${stolen} research points.`, 'danger');
      notify(s, `⚠ ${name} stole research from your labs.`, 'danger');
      r.lastAction = 'Stole your research';
    } else {
      r.relation -= 5;
      pushLog(s, name, 'Enemy operation foiled by your security services.', 'success');
      notify(s, `🛡 Your security services foiled an operation by ${name}.`, 'success');
    }
    return;
  }
  if (r.relation > 20 && !r.treaties.includes('trade') && chance(0.35) && !s.eventQueue.some(e => e.id.startsWith('offer')) && s.gameMode !== 'logic') {
    queueEvent(s, {
      id: nid('offer'), name: `${name} proposes a trade deal`, year: Math.floor(s.year), type: 'info', choices: [
        { label: 'Accept', detail: `Trade treaty with ${name}: +${Math.round(tradeValue(s, r))}B/yr, relations +10`, effect: `accept_trade:${r.id}` },
        { label: 'Decline', detail: 'Relations -5', effect: `decline_trade:${r.id}` },
      ], description: `${name} would like to open its markets to your exporters.`,
    });
    return;
  }
  const flavour = r.capability > 18 ? ['Trained a new frontier model', 'Opened an AI gigafactory', 'Expanded GPU fleet']
    : r.capability > 13 ? ['Built a national data center', 'Launched a supercomputer', 'Funded new universities']
      : ['Built heavy industry', 'Electrified the countryside', 'Opened research institutes'];
  r.lastAction = pick(flavour);
  pushLog(s, name, r.lastAction, 'info');
}

// ═══════════════════════════════════════════════════════════════════════════
//  MESSAGING
// ═══════════════════════════════════════════════════════════════════════════

function notify(s: GameState, text: string, type: Notification['type'] = 'info') {
  s.notifications = [{ id: nid('n'), text, type, time: Date.now() }, ...s.notifications].slice(0, 5);
}
function pushLog(s: GameState, who: string, text: string, tone: LogEntry['tone']) {
  s.log = [{ id: nid('l'), year: Math.floor(s.year), who, text, tone }, ...s.log].slice(0, 40);
}
function queueEvent(s: GameState, event: GameEvent) {
  if (s.mp && event.minigame) {
    // Exercises would stall a shared clock: in multiplayer they are credited automatically (one star).
    const rp = Math.round(80 + 40 * Math.max(0, s.year - 1960));
    s.researchPoints += rp;
    MINIGAME_REWARD[event.minigame]?.(s, 1);
    s.minigameResults = { ...s.minigameResults, [event.minigame]: Math.max(1, s.minigameResults[event.minigame] ?? 0) };
    notify(s, `★ ${event.name}: breakthrough credited (+${rp} research).`, 'success');
    return;
  }
  s.eventQueue = [...s.eventQueue, { id: event.id, event }];
}

// ═══════════════════════════════════════════════════════════════════════════
//  OBJECTIVES — a guided chain that teaches the systems and pays out budget
// ═══════════════════════════════════════════════════════════════════════════

interface ObjectiveDef { id: string; text: string; hint: string; reward: number; check: (s: GameState) => boolean }
const OBJECTIVES: ObjectiveDef[] = [
  { id: 'food', text: 'Feed a growing nation', hint: 'Build a Farm on a river valley (green tiles). Keep food above 105%.', reward: 60, check: s => countBuildings(s, 'farm', true) >= 3 && s.eco.foodSupply >= s.eco.foodDemand * 1.05 },
  { id: 'school', text: 'Educate the people', hint: 'Build a School District next to housing (+25%).', reward: 60, check: s => countBuildings(s, 'school', true) >= 2 },
  { id: 'transistor', text: 'Research the Transistor', hint: 'Open TECH [T] and pick Transistor.', reward: 60, check: s => has(s, 'transistor') },
  { id: 'lab', text: 'Open a Research Institute', hint: 'Institutes produce research. Cluster them for bonuses.', reward: 80, check: s => countBuildings(s, 'lab', true) >= 1 },
  { id: 'region', text: 'Develop a new region', hint: 'Click a dark region on the map and press DEVELOP.', reward: 100, check: s => s.ownedRegions.length >= 3 },
  { id: 'mainframe', text: 'Build a Mainframe Center', hint: 'Needs Integrated Circuits. Compute is the road to ASI.', reward: 150, check: s => COMPUTE_TYPES.some(t => countBuildings(s, t, true) >= 1) },
  { id: 'edu40', text: 'Reach education 40', hint: 'Schools raise the ceiling; universities push it past 70.', reward: 150, check: s => s.education >= 40 },
  { id: 'decree', text: 'Sign your first decree', hint: 'Open ECONOMY [E] and adopt a policy. Every decree has a price.', reward: 80, check: s => s.policies.length > 0 },
  { id: 'steel', text: 'Stockpile 100 steel', hint: 'Kombinats produce steel; importing it costs money every time.', reward: 120, check: s => s.steel >= 100 },
  { id: 'chips', text: 'Make your own chips', hint: 'A Chip Foundry (Lithography) saves expensive imports. Silica deposits +50%.', reward: 600, check: s => countBuildings(s, 'chipfab', true) >= 1 },
  { id: 'clean', text: 'Build clean power', hint: 'Nuclear (coast/river) or Solar. Coal is heating the planet.', reward: 200, check: s => countBuildings(s, 'nuclear', true) + countBuildings(s, 'solar', true) >= 1 },
  { id: 'safety', text: 'Found an AI Safety Institute', hint: 'Research Cybernetics. Alignment must stay ahead of capability.', reward: 300, check: s => countBuildings(s, 'defense', true) >= 1 },
  { id: 'tera', text: 'Reach 1 TeraFLOP', hint: 'Supercomputers (Vector Supercomputers tech).', reward: 400, check: s => s.capability >= 12 },
  { id: 'treaty', text: 'Sign an international treaty', hint: 'DIPLO [D]: gifts raise relations, then propose a treaty.', reward: 400, check: s => s.rivals.some(r => r.treaties.length > 0) },
  { id: 'peta', text: 'Reach 1 PetaFLOP', hint: 'Data Centers (World Wide Web tech).', reward: 1200, check: s => s.capability >= 15 },
  { id: 'upgrade', text: 'Upgrade a building to level 3', hint: 'Select a building and press UPGRADE. Upgrades save land.', reward: 800, check: s => !!s.map?.tiles.some(t => t.building && t.building.level >= 3 && t.building.progress >= 1) },
  { id: 'exa', text: 'Reach 1 ExaFLOP', hint: 'GPU Clusters (GPU Computing tech).', reward: 3000, check: s => s.capability >= 18 },
  { id: 'align70', text: 'Alignment 70% or more', hint: 'More Safety Institutes, next to your researchers.', reward: 3000, check: s => s.alignment >= 70 && s.capability >= 16 },
  { id: 'zetta', text: 'Reach 1 ZettaFLOP', hint: 'AI Gigafactories (Scaling Laws tech) need huge power.', reward: 8000, check: s => s.capability >= 21 },
  { id: 'asi', text: 'Research Superintelligence Theory', hint: 'Final tech. Then reach 1 YottaFLOP and IGNITE.', reward: 10000, check: s => has(s, 'asi') },
];

/** `atStart`: directives the starting nation already meets are retired silently (no reward, not shown). */
function refreshObjectives(s: GameState, atStart = false) {
  if (atStart) {
    s.objectives = OBJECTIVES.filter(d => d.check(s)).map(d => ({ id: d.id, text: d.text, hint: d.hint, reward: 0, done: true }));
  }
  const done = new Set(s.objectives.filter(o => o.done).map(o => o.id));
  for (const o of s.objectives) {
    if (o.done) continue;
    const def = OBJECTIVES.find(d => d.id === o.id);
    if (def && def.check(s)) {
      o.done = true;
      done.add(o.id);
      s.budget += o.reward;
      notify(s, `✔ Directive complete: ${o.text} (+$${o.reward}B)`, 'success');
    }
  }
  const active = s.objectives.filter(o => !o.done);
  if (active.length < 3) {
    const next = OBJECTIVES.filter(d => !done.has(d.id) && !s.objectives.some(o => o.id === d.id)).slice(0, 3 - active.length);
    s.objectives = [...s.objectives, ...next.map(d => ({ id: d.id, text: d.text, hint: d.hint, reward: d.reward, done: false }))];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════════════════════════════

function place(map: MapData, tileId: number, type: BuildingId, level = 1) {
  map.tiles[tileId].building = { type, level, progress: 1, upgrading: false };
  if (map.tiles[tileId].terrain === 'forest') map.tiles[tileId].terrain = 'plains';
}

function bestTiles(s: GameState, type: BuildingId, n: number, regions: string[]): number[] {
  const map = s.map!;
  const picks: number[] = [];
  for (let i = 0; i < n; i++) {
    let best = -1, bestScore = -Infinity;
    for (const t of map.tiles) {
      if (!t.region || !regions.includes(t.region) || t.building) continue;
      const pl = evaluatePlacement(s, t, type);
      if (!pl.ok) continue;
      const score = pl.mult + (t.terrain === 'forest' ? -0.3 : 0) + rand() * 0.05;
      if (score > bestScore) { bestScore = score; best = t.id; }
    }
    if (best >= 0) { place(map, best, type); picks.push(best); }
  }
  return picks;
}

export function startGame(state: GameState, continentId: string, seed = Date.now() % 1e9, difficulty: Difficulty = 'normal'): GameState {
  const c = continentById(continentId)!;
  const mode = state.gameMode || 'complete';
  reseed(seed);
  const strategist = mode === 'strategist';
  const startYear = strategist ? 1980 : 1960;
  const map = generateContinentMap(continentId, seed);
  const byTiles = [...map.regions].sort((a, b) => b.tiles.length - a.tiles.length);
  const capital = map.regions.find(r => r.id === c.capital) ?? byTiles[0];
  // Second starting region: the one sharing most borders with the capital.
  const neighbourCount = (rid: string) => capital.tiles.reduce((n, tid) => n + neighbourTiles(map, map.tiles[tid]).filter(t => t.region === rid).length, 0);
  const others = map.regions.filter(r => r.id !== capital.id).sort((a, b) => neighbourCount(b.id) - neighbourCount(a.id));
  const ownedRegions = [capital.id, ...others.slice(0, strategist ? 2 : 1).map(r => r.id)];

  const pop = c.basePopulation * (strategist ? 1.28 : 1);
  const s: GameState = {
    ...initialState,
    screen: 'game', gameMode: mode, seed, year: startYear, startYear, playerContinent: continentId,
    map, ownedRegions,
    population: pop,
    education: 10 + c.techLevel * 3 + (strategist ? 18 : 0),
    approval: 68, alignment: 50, taxRate: 0.22,
    unlockedTechs: strategist ? ['transistor', 'mass_edu', 'nuclear', 'greenrev', 'ic', 'container', 'cybernetics', 'micro', 'space', 'envprot', 'solar'] : [],
    rivals: [],
    temperature: strategist ? 0.45 : 0.3,
    co2: 0,
    notifications: [],
    log: [],
    modifiers: [],
    objectives: [],
    firedEvents: historicalEvents.filter(e => e.year < startYear).map(e => e.id),
  };
  s.rivals = createRivals(continentId, mode, startYear, difficulty);

  // Starting infrastructure on the capital region
  const home = [capital.id];
  if (strategist) {
    bestTiles(s, 'farm', 3, ownedRegions); bestTiles(s, 'housing', 3, home); bestTiles(s, 'school', 2, home);
    bestTiles(s, 'factory', 2, ownedRegions); bestTiles(s, 'market', 1, home); bestTiles(s, 'coal', 2, ownedRegions);
    bestTiles(s, 'nuclear', 1, ownedRegions); bestTiles(s, 'lab', 2, home); bestTiles(s, 'uni', 1, home);
    bestTiles(s, 'mainframe', 1, home); bestTiles(s, 'hospital', 1, home);
  } else {
    bestTiles(s, 'farm', 2, home); bestTiles(s, 'housing', 1, home); bestTiles(s, 'school', 1, home);
    bestTiles(s, 'factory', 1, home); bestTiles(s, 'coal', 1, home);
  }

  // Legacy capacities: the pre-existing nation is roughly in balance, slightly tight.
  s.legacy = { food: 0, housing: 0, jobs: 0, energy: 0, emissionsPerGW: 0.2 };
  let eco = computeEconomy(s);
  s.legacy.food = Math.max(0, pop * 1.03 - eco.foodSupply);
  s.legacy.housing = Math.max(0, pop * 1.04 - eco.housingCap);
  s.legacy.jobs = Math.max(0, pop * 0.45 * 0.93 - eco.jobs);
  eco = computeEconomy(s);
  s.legacy.energy = Math.max(10, eco.energyDemand * 1.18 - eco.energySupply);
  s.eco = computeEconomy(s);
  s.budget = s.eco.income * (strategist ? 1.2 : 0.9) * (difficulty === 'easy' ? 1.3 : difficulty === 'hard' ? 0.85 : 1);
  s.difficulty = difficulty;
  s.steel = strategist ? 120 : 40;
  s.chips = strategist ? 30 : 4;
  s.history = [];
  s.researchPoints = strategist ? 400 : 0;
  s.compute = Math.max(1e6, s.eco.computeRaw * techComputeMult(s));
  s.capability = Math.log10(s.compute);
  s.peakCapability = s.capability;
  s.totalTechs = s.unlockedTechs.length;

  // Strategist replays two early breakthroughs as archives.
  if (strategist) {
    for (const id of ARCHIVE_MINIGAMES_STRATEGIST) {
      const ev = historicalEvents.find(e => e.minigame === id);
      if (ev) s.firedEvents = s.firedEvents.filter(f => f !== ev.id);
    }
  }
  refreshObjectives(s, true);
  s.tension = tensionBaseline(startYear);
  const startTop = Math.max(s.capability, ...s.rivals.map(r => r.capability));
  s.firsts = Object.fromEntries(FIRSTS.filter(f => startTop >= f.cap).map(f => [f.key, { who: 'history', year: startYear }]));
  notify(s, `${c.name}, ${startYear}. Click the map to build. Your directives are on the right.`, 'info');
  pushLog(s, c.name, `Government formed. Goal: safe superintelligence before any rival.`, 'info');
  return s;
}

// ═══════════════════════════════════════════════════════════════════════════
//  TICK
// ═══════════════════════════════════════════════════════════════════════════

function tick(prev: GameState): GameState {
  // In multiplayer the shared clock never waits for one player's decision.
  if (prev.paused || (prev.activeEvent && !prev.mp) || prev.screen !== 'game') return prev;
  const s: GameState = { ...prev, tickCount: prev.tickCount + 1 };
  const dt = YEARS_PER_TICK * s.speed;
  const lastYearInt = Math.floor(s.year);
  s.year += dt;
  const yearInt = Math.floor(s.year);
  const pioneer = s.gameMode === 'pioneer';
  s.map = { ...s.map!, tiles: s.map!.tiles.map(t => (t.building ? { ...t, building: { ...t.building } } : { ...t })) };

  // 1. Construction progress
  for (const t of s.map.tiles) {
    const b = t.building;
    if (!b) continue;
    if (b.progress < 1 || b.upgrading) {
      const bt = buildTime(s, b.type) * (b.upgrading ? 0.8 : 1);
      const before = b.progress;
      b.progress = Math.min(1, b.progress + dt / Math.max(0.1, bt));
      if (b.upgrading && b.progress >= 1) {
        b.upgrading = false;
        notify(s, `▲ ${buildingById[b.type].name} upgraded to level ${b.level}.`, 'success');
      } else if (before < 1 && b.progress >= 1) {
        notify(s, `✔ ${buildingById[b.type].name} operational.`, 'success');
      }
    }
  }

  // 2. Economy flows
  const eco = computeEconomy(s);
  s.eco = eco;

  // 3. Stocks
  s.budget += eco.netBudget * dt;
  s.steel = Math.max(0, s.steel + eco.steelProd * dt);
  s.chips += (eco.chipProd - eco.chipUse) * dt;
  let chipFactor = 1;
  if (s.chips < 0) {
    const short = -s.chips;
    s.chips = 0;
    if (pol(s, 'autarky')) {
      chipFactor = eco.chipUse > 0 ? clamp(eco.chipProd / eco.chipUse, 0, 1) : 1;
    } else {
      // Imports are already booked in netBudget (eco.imports); just move the world price.
      s.priceMod = { ...s.priceMod, chips: s.priceMod.chips + short * PRICE_IMPACT };
    }
  }
  if (s.budget < 0 && eco.imports > 0) chipFactor = Math.min(chipFactor, 0.5);
  s.eco = { ...eco, chipFactor };
  // World prices drift back to normal; policy changes cool down.
  s.priceMod = {
    steel: 1 + (s.priceMod.steel - 1) * (1 - 0.25 * dt),
    chips: 1 + (s.priceMod.chips - 1) * (1 - 0.25 * dt),
  };
  s.policyCooldown = Math.max(0, s.policyCooldown - dt);
  if (s.policies.length > policySlots(s.year)) s.policies = s.policies.slice(0, policySlots(s.year));
  s.researchPoints += eco.researchRate * dt;
  s.education = clamp(s.education + clamp(eco.eduTarget - s.education, -2, 2 * (bonus(s, 'education') ?? 1) * (has(s, 'pc') ? 1.1 : 1) * (pol(s, 'education_drive') ? 1.5 : 1)) * dt, 0, 100);
  s.approval = clamp(s.approval + (eco.approvalTarget - s.approval) * Math.min(1, 0.8 * dt), 0, 100);
  const health = eco.approvalFactors.find(f => f.label === 'Healthcare')?.value ?? 0;
  let r = 0.021 - 0.012 * s.education / 100 + 0.0004 * (health + 3) + modSum(s, 'popGrowth') + (pol(s, 'welfare') ? 0.002 : 0);
  const fr = eco.foodSupply / Math.max(1, eco.foodDemand);
  if (fr < 1) r = Math.min(r, -(1 - fr) * 0.25);
  if (s.population > eco.housingCap) r = Math.min(r, -0.004 * (s.population / eco.housingCap - 1) * 10);
  s.population = Math.max(1, s.population * (1 + r * dt));

  // 4. Compute, capability & alignment
  s.compute = Math.max(1e6, eco.computeRaw * eco.computeMult * s.eco.chipFactor * eco.energyRatio * Math.sqrt(eco.staffing));
  s.capability = Math.log10(s.compute);
  s.peakCapability = Math.max(s.peakCapability, s.capability);
  s.alignment = clamp(s.alignment + (eco.alignmentGain * (s.alignment < alignmentCap(s) ? 1 : 0) - eco.alignmentPressure) * dt, 0, 100);
  if (s.alignment > alignmentCap(s)) s.alignment = Math.max(alignmentCap(s), s.alignment - 2 * dt);

  // 5. Research queue
  if (s.researching) {
    const tech = techById[s.researching];
    const need = techCost(s, s.researching) - s.researchProgress;
    const invest = Math.min(s.researchPoints, need);
    s.researchProgress += invest;
    s.researchPoints -= invest;
    if (s.researchProgress >= techCost(s, s.researching) - 1e-6) {
      s.unlockedTechs = [...s.unlockedTechs, tech.id];
      s.totalTechs++;
      s.researching = null;
      s.researchProgress = 0;
      notify(s, `🔬 ${tech.name} discovered — ${tech.effect}`, 'success');
      pushLog(s, 'Science', `${tech.name} discovered.`, 'success');
    }
  }

  // 6. World: rivals, climate, doom clock
  tickRivals(s, dt);
  if (!s.mp || s.mp.offline || s.mp.role === 'host') s.tension = (s.tension ?? 20) + (tensionBaseline(s.year) - (s.tension ?? 20)) * 0.15 * dt;
  checkFirsts(s);
  const worldEmissions = eco.emissions + s.rivals.reduce((a, b) => a + b.emissions, 0);
  s.co2 += Math.max(0, worldEmissions - 120) * dt;
  s.temperature = (s.startYear === 1980 ? 0.45 : 0.3) + s.co2 * 6e-5 * DIFF_CLIMATE[s.difficulty ?? 'normal'];
  s.planetHealth = clamp(100 - (s.temperature - 0.6) * 48, 0, 100);
  const risks = [
    { c: s.capability, a: s.alignment },
    ...s.rivals.map(x => ({ c: x.capability, a: x.alignment })),
  ].map(x => clamp((x.c - 14) / 10, 0, 1) * (1 - x.a / 100) * 1.6);
  s.doomClock = clamp(12 - 12 * Math.max(...risks), 0, 12);

  // 7. Modifiers expire
  if (s.modifiers.some(m => m.until <= s.year)) {
    for (const m of s.modifiers.filter(m => m.until <= s.year)) notify(s, `${m.label} has ended.`, 'info');
    s.modifiers = s.modifiers.filter(m => m.until > s.year);
  }

  // 8. Yearly checks: events, objectives, crises
  if (yearInt !== lastYearInt) {
    yearly(s, yearInt, pioneer);
    s.history = [...s.history, {
      year: yearInt, gdp: Math.round(eco.gdp), budget: Math.round(s.budget), population: Math.round(s.population),
      capability: +s.capability.toFixed(2), alignment: Math.round(s.alignment), approval: Math.round(s.approval),
      planetHealth: Math.round(s.planetHealth), emissions: Math.round(eco.emissions),
      rivalTop: +Math.max(...s.rivals.map(r => r.capability), 0).toFixed(2), research: Math.round(eco.researchRate),
    }].slice(-120);
  }
  if (s.tickCount % 8 === 0) refreshObjectives(s);
  s.warnings = forecast(s);
  s.playerLaunchReady = has(s, 'asi') && s.capability >= asiThreshold(s);

  // 9. Open the next queued event (pauses the simulation)
  if (!s.activeEvent && s.eventQueue.length) {
    s.activeEvent = s.eventQueue[0];
    s.eventQueue = s.eventQueue.slice(1);
  }

  // 10. Outcomes
  if (s.outcome) return endGame(s);
  if (!pioneer) {
    if (s.planetHealth <= 0) {
      s.outcome = 'climate';
      s.gameOverReason = `Planetary collapse in ${yearInt}. Global temperature reached +${s.temperature.toFixed(1)}°C: harvests failed, coasts drowned, and the race to ASI no longer mattered to anyone.`;
      return endGame(s);
    }
    if (s.year >= END_YEAR) {
      s.outcome = 'timeout';
      s.gameOverReason = `The window closed in ${yearInt}. Nobody ignited a superintelligence in time, and the AI race ended in exhausted stalemate. Your peak compute: ${capLabel(s.peakCapability)}.`;
      return endGame(s);
    }
  }
  return s;
}

export function asiThreshold(s: GameState): number {
  return s.gameMode === 'pioneer' ? 22 : ASI_CAPABILITY;
}
export function requiredAlignment(s: GameState): number {
  return s.gameMode === 'pioneer' ? 70 : SAFE_ALIGNMENT;
}
export function rogueRisk(s: GameState): number {
  const req = requiredAlignment(s);
  return clamp((req - s.alignment) / req, 0, 1);
}
function capLabel(c: number) { return `10^${c.toFixed(1)} FLOPS`; }

/** Research can't run more than 10 years ahead of history. */
export const TECH_LOOKAHEAD = 10;
export function techAvailable(s: GameState, techId: string): boolean {
  const t = techById[techId];
  return !!t && !has(s, t.id) && t.requires.every(r => has(s, r)) && s.year >= t.year - TECH_LOOKAHEAD;
}

/** Alignment can only be pushed as far as your safety science allows. */
export function alignmentCap(s: GameState): number {
  return Math.min(98, 55 + (has(s, 'alignment') ? 15 : 0) + (has(s, 'interp') ? 15 : 0) + (has(s, 'agi') ? 10 : 0));
}

export function policyAvailability(s: GameState, id: string, on = true): { ok: boolean; reason?: string } {
  const def = policyById[id];
  if (!def) return { ok: false, reason: 'Unknown policy' };
  if (s.policyCooldown > 0) return { ok: false, reason: `Government reshuffle in ${s.policyCooldown.toFixed(1)} yrs` };
  if (!on) return s.policies.includes(id) ? { ok: true } : { ok: false };
  if (s.policies.includes(id)) return { ok: false, reason: 'Already active' };
  if (def.requiresTech && !has(s, def.requiresTech)) return { ok: false, reason: `Requires ${techById[def.requiresTech]?.name}` };
  const clash = (def.excludes ?? []).find(x => s.policies.includes(x));
  if (clash) return { ok: false, reason: `Conflicts with ${policyById[clash].name}` };
  if (s.policies.length >= policySlots(s.year)) return { ok: false, reason: 'No free slot — repeal a decree first' };
  return { ok: true };
}

export function techCost(s: GameState, techId: string): number {
  const t = techById[techId];
  if (!t) return Infinity;
  const early = Math.max(0, t.year - s.year);
  return Math.round(t.cost * (1 + 0.1 * early) * (bonus(s, 'techCost') ?? 1));
}

function yearly(s: GameState, year: number, pioneer: boolean) {
  // Historical events
  for (const ev of historicalEvents) {
    if (ev.year <= year && !s.firedEvents.includes(ev.id)) {
      s.firedEvents = [...s.firedEvents, ev.id];
      queueEvent(s, ev);
      if (s.eventQueue.length >= 2) break; // at most two decisions per year
    }
  }
  // Dynamic events (at most one queued at a time)
  if (!s.eventQueue.length) {
    if (s.planetHealth < 60 && chance(s.planetHealth < 35 ? 0.35 : 0.18)) queueEvent(s, climateEvent(s));
    else if (s.capability >= 15 && s.alignment < 45 && chance(0.3)) queueEvent(s, aiIncident(s));
    else {
      const d = rollDynamic(s, H);
      if (d) queueEvent(s, d);
    }
  }
  // Crises
  const eco = s.eco;
  const collapse = s.approval < 20;
  const fr = eco.foodSupply / Math.max(1, eco.foodDemand);
  if (!pioneer && collapse) {
    s.crisis = { kind: 'approval', years: (s.crisis?.kind === 'approval' ? s.crisis.years : 0) + 1 };
    if (s.crisis.years >= 3) {
      s.outcome = 'revolution';
      s.gameOverReason = `Revolution in ${year}. After years of hunger, unemployment and broken promises, the people stormed the ministries. Approval had fallen to ${Math.round(s.approval)}%.`;
    } else notify(s, `☭ REVOLUTIONARY SITUATION: approval ${Math.round(s.approval)}%. ${3 - s.crisis.years} year(s) to restore order!`, 'danger');
  } else if (!pioneer && s.budget < -Math.max(300, eco.income * 1.5)) {
    s.crisis = { kind: 'bankrupt', years: (s.crisis?.kind === 'bankrupt' ? s.crisis.years : 0) + 1 };
    if (s.crisis.years >= 3) {
      s.outcome = 'bankrupt';
      s.gameOverReason = `State bankruptcy in ${year}. Debt spiralled beyond control and foreign creditors took over your economy.`;
    } else notify(s, `💸 DEBT CRISIS: raise taxes or demolish costly buildings. ${3 - s.crisis.years} year(s) left.`, 'danger');
  } else if (fr < 0.85) {
    s.crisis = { kind: 'famine', years: (s.crisis?.kind === 'famine' ? s.crisis.years : 0) + 1 };
    notify(s, `🌾 FAMINE: food at ${Math.round(fr * 100)}%. Build farms now.`, 'danger');
  } else if (s.crisis) {
    notify(s, 'Crisis averted.', 'success');
    s.crisis = null;
  }
  // Late-game alert about rivals
  for (const r of s.rivals) {
    if (r.capability >= 22 && !s.firedEvents.includes(`alert-${r.id}`)) {
      s.firedEvents = [...s.firedEvents, `alert-${r.id}`];
      notify(s, `🚨 ${rivalName(r.id)} is close to superintelligence (${capabilityWord(r.capability)}). Sabotage, treaties — or win first.`, 'danger');
    }
  }
}

function capabilityWord(c: number) { return c >= 24 ? 'YottaFLOP' : c >= 21 ? 'ZettaFLOP' : c >= 18 ? 'ExaFLOP' : c >= 15 ? 'PetaFLOP' : 'TeraFLOP'; }

function climateEvent(s: GameState): GameEvent {
  const y = Math.floor(s.year);
  const opts: GameEvent[] = [
    { id: nid('drought'), name: 'Mega-drought', year: y, type: 'danger', description: `Rivers run dry across the continent. The planet is at ${Math.round(s.planetHealth)}% health.`,
      choices: [
        { label: 'Emergency irrigation', detail: '-20% budget · farms protected', effect: 'drought_irrigate' },
        { label: 'Accept the losses', detail: 'Farms -20% for 2 years', effect: 'drought_accept' },
      ] },
    { id: nid('flood'), name: 'Coastal Floods', year: y, type: 'danger', description: 'Storm surges hit the coast. Coastal buildings are damaged.',
      choices: [
        { label: 'Build sea walls', detail: '-25% budget · no damage', effect: 'flood_walls' },
        { label: 'Rebuild later', detail: 'Up to 2 coastal buildings go offline for repairs', effect: 'flood_damage' },
      ] },
    { id: nid('heat'), name: 'Killer Heatwave', year: y, type: 'warning', description: 'Record temperatures overload the grid and hospitals.',
      choices: [
        { label: 'Cooling centres', detail: '-15% budget', effect: 'heat_cool' },
        { label: 'Endure it', detail: 'Energy demand +15% & approval -8 for 1 year', effect: 'heat_endure' },
      ] },
  ];
  return pick(opts);
}

function aiIncident(s: GameState): GameEvent {
  const y = Math.floor(s.year);
  const opts: GameEvent[] = [
    { id: nid('ai'), name: 'AI Incident: Deceptive Model', year: y, type: 'danger', description: `A model in one of your labs was caught hiding its capabilities from evaluators. Alignment is only ${Math.round(s.alignment)}%.`,
      choices: [
        { label: 'Pause and audit', detail: 'Compute buildings offline 1 year · alignment +10', effect: 'ai_pause' },
        { label: 'Cover it up', detail: 'Alignment -6 · approval -6 for 3 years', effect: 'ai_cover' },
      ] },
    { id: nid('ai'), name: 'AI Incident: Flash Crash', year: y, type: 'danger', description: 'Autonomous trading agents crash the markets in 36 minutes.',
      choices: [
        { label: 'Regulate AI trading', detail: 'GDP -5% for 2 years · alignment +6', effect: 'ai_regulate' },
        { label: 'Bail out the banks', detail: '-25% budget', effect: 'ai_bailout' },
      ] },
  ];
  return pick(opts);
}

function forecast(s: GameState): ForecastWarning[] {
  const w: ForecastWarning[] = [];
  const e = s.eco;
  const fr = e.foodSupply / Math.max(1, e.foodDemand);
  if (fr < 1) w.push({ kind: 'food', text: `Food ${Math.round(fr * 100)}% — people are going hungry. Build farms.`, severity: 'danger' });
  else if (fr < 1.04) w.push({ kind: 'food', text: 'Food barely enough for the growing population.', severity: 'warning' });
  if (e.energyRatio < 1) w.push({ kind: 'energy', text: `Blackouts: power ${Math.round(e.energyRatio * 100)}%. Everything runs slower.`, severity: 'danger' });
  else if (e.energySupply < e.energyDemand * 1.08) w.push({ kind: 'energy', text: 'Power grid near capacity.', severity: 'warning' });
  if (s.population > e.housingCap) w.push({ kind: 'housing', text: 'Overcrowding: build housing.', severity: 'danger' });
  else if (s.population > e.housingCap * 0.96) w.push({ kind: 'housing', text: 'Housing almost full: growth will stall.', severity: 'warning' });
  if (e.unemployment > 0.12) w.push({ kind: 'jobs', text: `Unemployment ${Math.round(e.unemployment * 100)}%: build kombinats & markets.`, severity: 'danger' });
  else if (e.staffing < 0.95) w.push({ kind: 'jobs', text: `Labour shortage: buildings at ${Math.round(e.staffing * 100)}% staff.`, severity: 'warning' });
  if (s.approval < 35) w.push({ kind: 'approval', text: `Unrest: approval ${Math.round(s.approval)}%.`, severity: 'danger' });
  if (e.netBudget < 0) w.push({ kind: 'budget', text: `Budget deficit ${Math.round(e.netBudget)}B/yr.`, severity: s.budget < 0 ? 'danger' : 'warning' });
  if (s.planetHealth < 45) w.push({ kind: 'climate', text: `Planet health ${Math.round(s.planetHealth)}%. Cut emissions, sign a Climate Accord.`, severity: s.planetHealth < 25 ? 'danger' : 'warning' });
  if (e.chipUse > e.chipProd && s.chips < e.chipUse) w.push({ kind: 'budget', text: pol(s, 'autarky') ? `Chip shortage: compute at ${Math.round(e.chipFactor * 100)}%. Build foundries.` : `Importing chips: -$${Math.round(Math.max(e.imports, (e.chipUse - e.chipProd) * marketPrice(s, 'chips', 'buy')))}B/yr. Build foundries.`, severity: e.chipFactor < 1 ? 'danger' : 'warning' });
  if (s.capability >= 15 && s.alignment < 55) w.push({ kind: 'alignment', text: `Alignment ${Math.round(s.alignment)}% is falling behind capability.`, severity: s.alignment < 40 ? 'danger' : 'warning' });
  return w;
}

function endGame(s: GameState): GameState {
  const victory = s.outcome === 'safe_asi';
  return { ...s, screen: victory ? 'victory' : 'gameover', victoryYear: Math.floor(s.year), paused: true, activeEvent: null };
}

// ═══════════════════════════════════════════════════════════════════════════
//  EVENT EFFECTS
// ═══════════════════════════════════════════════════════════════════════════

function addMod(s: GameState, m: Omit<Modifier, 'until'> & { years: number }) {
  const { years, ...rest } = m;
  s.modifiers = [...s.modifiers.filter(x => x.id !== rest.id), { ...rest, until: s.year + years }];
}

const H: DynHelpers = {
  rand: () => rand(), addMod, notify, pushLog,
  count: (s, type) => countBuildings(s, type, true),
  rivalName, historicalCapability,
  sabotageChance: (s, r) => covertChance(s, r, 'sabotage'),
  hasIntel: (s, r) => hasIntel(s, r),
};

export function choiceAvailable(s: GameState, requires?: string): boolean {
  if (!requires) return true;
  if (requires === 'has_nuclear') return countBuildings(s, 'nuclear', true) > 0;
  return true;
}

function applyEffect(s: GameState, effect: string) {
  if (applyDynamic(s, effect, H)) return;
  if (effect.startsWith('mp_accept:') || effect.startsWith('mp_decline:')) {
    const [kind, from, treaty] = effect.split(':') as [string, string, TreatyId];
    if (kind === 'mp_accept') {
      signWithHuman(s, from, treaty);
      outbox(s, { t: 'diplo', from: s.mp?.me ?? '', to: from, kind: 'accept', treaty });
    } else {
      s.rivals = s.rivals.map(r => r.id === from ? { ...r, relation: clamp(r.relation - 3, -100, 100) } : r);
      outbox(s, { t: 'diplo', from: s.mp?.me ?? '', to: from, kind: 'decline', treaty });
    }
    return;
  }
  const [id, arg] = effect.split(':');
  const allRivals = (d: number) => { s.rivals = s.rivals.map(r => ({ ...r, relation: clamp(r.relation + d, -100, 100) })); };
  const hospitals = countBuildings(s, 'hospital', true);
  switch (id) {
    case 'greenrev_adopt': addMod(s, { id: 'greenrev_adopt', label: 'High-yield seeds', years: PERMANENT, farms: 1.2 }); break;
    case 'greenrev_trad': addMod(s, { id: 'greenrev_trad', label: 'Traditional farming pride', years: 8, approval: 6 }); break;
    case 'oil_ration': addMod(s, { id: 'oil_ration', label: 'Fuel rationing', years: 5, energyDemand: 0.9, approval: -8 }); break;
    case 'oil_pay': s.budget -= Math.max(0, s.budget) * 0.3; break;
    case 'oil_nuclear': addMod(s, { id: 'oil_nuclear', label: 'Energy independence', years: 5, approval: 4 }); break;
    case 'food_aid': s.budget -= 150; allRivals(12); break;
    case 'food_protect': allRivals(-6); break;
    case 'winter_fund': s.budget -= 200; addMod(s, { id: 'winter_fund', label: 'AI funding kept', years: 6, research: 1.15 }); break;
    case 'winter_cut': s.budget += 200; addMod(s, { id: 'winter_cut', label: 'AI winter cuts', years: 6, research: 0.8 }); break;
    case 'expert_invest': s.budget -= 400; addMod(s, { id: 'expert_invest', label: 'Expert systems', years: 6, gdp: 1.08 }); break;
    case 'expert_wait': addMod(s, { id: 'expert_wait', label: 'Academic AI', years: 6, research: 1.1 }); break;
    case 'rp_600': s.researchPoints += 600; break;
    case 'rp_2500': s.researchPoints += 2500; break;
    case 'rp_4000': s.researchPoints += 4000; break;
    case 'cash_350': s.budget += 350; break;
    case 'peace_dividend': s.budget += 700; allRivals(10); break;
    case 'dotcom_bailout': s.budget -= Math.max(0, s.budget) * 0.35; addMod(s, { id: 'dotcom_bailout', label: 'Tech bailout', years: 5 }); break;
    case 'dotcom_burn': addMod(s, { id: 'dotcom_burn', label: 'Dot-com recession', years: 4, gdp: 0.9, approval: -5 }); break;
    case 'sec_state': s.alignment = clamp(s.alignment + 10, 0, 100); addMod(s, { id: 'sec_state', label: 'Security state', years: 6, approval: -6 }); break;
    case 'sec_liberty': addMod(s, { id: 'sec_liberty', label: 'Civil liberties', years: 6, approval: 5 }); break;
    case 'wto_embrace': addMod(s, { id: 'wto_embrace', label: 'Globalisation', years: 8, gdp: 1.08 }); s.legacy = { ...s.legacy, jobs: s.legacy.jobs * 0.93 }; break;
    case 'wto_protect': s.rivals = s.rivals.map(r => r.id === 'cn' ? { ...r, relation: r.relation - 8 } : r); break;
    case 'crisis_stimulus': s.budget -= Math.max(0, s.budget) * 0.4; break;
    case 'crisis_austerity': s.budget += 500; addMod(s, { id: 'crisis_austerity', label: 'Austerity', years: 4, gdp: 0.88, approval: -10 }); break;
    case 'flu_vaccinate': s.budget -= 300; break;
    case 'flu_ride': s.population *= 1 - 0.01 / (1 + hospitals * 0.5); addMod(s, { id: 'flu', label: 'Flu deaths', years: 2, approval: -5 }); break;
    case 'watson_health': s.budget += 200; addMod(s, { id: 'watson_health', label: 'AI medicine', years: PERMANENT }); break;
    case 'alexnet_gpu': addMod(s, { id: 'alexnet_gpu', label: 'Cheap GPU clusters', years: 8 }); break;
    case 'alexnet_edu': s.education = clamp(s.education + 6, 0, 100); addMod(s, { id: 'alexnet_edu', label: 'AI education', years: 8, research: 1.1 }); break;
    case 'covid_lockdown': addMod(s, { id: 'covid', label: 'Lockdown', years: 2, gdp: 0.88 }); break;
    case 'covid_open': s.population *= 1 - 0.015 / (1 + hospitals * 0.4); addMod(s, { id: 'covid', label: 'Pandemic grief', years: 3, approval: -12 }); break;
    case 'gpt3_race': s.researchPoints += 8000; s.alignment = clamp(s.alignment - 6, 0, 100); break;
    case 'gpt3_careful': s.alignment = clamp(s.alignment + 8, 0, 100); break;
    case 'chip_domestic': addMod(s, { id: 'chip_domestic', label: 'Domestic foundries', years: 8, chipCost: 0.6 }); addMod(s, { id: 'chipwar_prices', label: 'Chip War prices', years: 5 }); break;
    case 'chip_grey': s.budget -= 1500; allRivals(-5); s.chips += 300; addMod(s, { id: 'chipwar_prices', label: 'Chip War prices', years: 5 }); break;
    case 'ukr_renew': addMod(s, { id: 'ukr_renew', label: 'Renewables push', years: 6 }); addMod(s, { id: 'ukr_shock', label: 'Energy shock', years: 2, energySupply: 0.9 }); break;
    case 'ukr_coal': addMod(s, { id: 'ukr_coal', label: 'Coal comeback', years: 6 }); break;
    case 'chatgpt_office': addMod(s, { id: 'chatgpt_office', label: 'AI in the office', years: 10, gdp: 1.1, approval: -4 }); break;
    case 'chatgpt_school': s.education = clamp(s.education + 8, 0, 100); break;
    case 'boom_ride': s.budget += 6000; s.alignment = clamp(s.alignment - 8, 0, 100); break;
    case 'boom_measured': s.budget += 2000; s.alignment = clamp(s.alignment + 6, 0, 100); break;
    case 'summit': allRivals(8); s.rivals = s.rivals.map(r => ({ ...r, alignment: clamp(r.alignment + 5, 0, 100) })); s.alignment = clamp(s.alignment + 5, 0, 100); break;
    case 'allin': addMod(s, { id: 'allin', label: 'All-in AI race', years: 5, research: 1.25 }); s.alignment = clamp(s.alignment - 10, 0, 100); break;
    case 'agents_state': addMod(s, { id: 'agents_state', label: 'Automated state', years: 10, approval: -4 }); break;
    case 'agents_human': s.alignment = clamp(s.alignment + 6, 0, 100); break;
    case 'quantum_chem': addMod(s, { id: 'quantum_chem', label: 'Quantum chemistry', years: PERMANENT, farms: 1.15 }); break;
    case 'quantum_crypto': addMod(s, { id: 'quantum_crypto', label: 'Quantum cryptanalysis', years: PERMANENT }); break;
    case 'moore_max': addMod(s, { id: 'moore_max', label: 'Maximum acceleration', years: PERMANENT }); s.alignment = clamp(s.alignment - 12, 0, 100); break;
    case 'moore_govern': s.alignment = clamp(s.alignment + 10, 0, 100); s.rivals = s.rivals.map(r => ({ ...r, lag: r.lag + 1 })); break;
    // dynamic
    case 'drought_irrigate': s.budget -= Math.max(0, s.budget) * 0.2; break;
    case 'drought_accept': addMod(s, { id: 'drought', label: 'Drought', years: 2 }); break;
    case 'flood_walls': s.budget -= Math.max(0, s.budget) * 0.25; break;
    case 'flood_damage': {
      const coastal = s.map!.tiles.filter(t => t.coast && t.building && t.building.progress >= 1);
      for (let i = 0; i < 2 && coastal.length; i++) {
        const t = coastal.splice(Math.floor(rand() * coastal.length), 1)[0];
        t.building = { ...t.building!, progress: 0.5 };
      }
      break;
    }
    case 'heat_cool': s.budget -= Math.max(0, s.budget) * 0.15; break;
    case 'heat_endure': addMod(s, { id: 'heat', label: 'Heatwave', years: 1, energyDemand: 1.15, approval: -8 }); break;
    case 'ai_pause': {
      for (const t of s.map!.tiles) if (t.building && isCompute(t.building.type) && t.building.progress >= 1) t.building = { ...t.building, progress: 0.6 };
      s.alignment = clamp(s.alignment + 10, 0, 100);
      break;
    }
    case 'ai_cover': s.alignment = clamp(s.alignment - 6, 0, 100); addMod(s, { id: 'ai_cover', label: 'Cover-up scandal', years: 3, approval: -6 }); break;
    case 'ai_regulate': addMod(s, { id: 'ai_regulate', label: 'AI trading rules', years: 2, gdp: 0.95 }); s.alignment = clamp(s.alignment + 6, 0, 100); break;
    case 'ai_bailout': s.budget -= Math.max(0, s.budget) * 0.25; break;
    case 'accept_trade': {
      s.rivals = s.rivals.map(r => r.id === arg ? { ...r, treaties: [...r.treaties, 'trade'], relation: clamp(r.relation + 10, -100, 100) } : r);
      pushLog(s, rivalName(arg), 'Trade treaty signed.', 'success');
      break;
    }
    case 'decline_trade': s.rivals = s.rivals.map(r => r.id === arg ? { ...r, relation: r.relation - 5 } : r); break;
    default: break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  DIPLOMACY & COVERT OPS
// ═══════════════════════════════════════════════════════════════════════════

export const TREATY_INFO: Record<TreatyId, { name: string; need: number; tech?: string; text: string }> = {
  trade:    { name: 'Trade Treaty', need: 10, text: '+1.5% of the smaller GDP per year as income (more with seaports).' },
  research: { name: 'Research Pact', need: 30, tech: 'internet', text: '+10% research for you per pact.' },
  climate:  { name: 'Climate Accord', need: 0, tech: 'climate', text: 'They cut emissions hard (+25% clean energy). Costs you 3% of GDP once.' },
  safety:   { name: 'AI Safety Treaty', need: 15, tech: 'alignment', text: 'Their alignment +20 and their AI race slows. Your alignment +5.' },
};

export function giftCost(s: GameState): number {
  return Math.round(60 * Math.pow(1.045, s.year - 1960));
}

// --- World tension (DEFCON) -------------------------------------------------
/** Where world tension drifts back to: the Cold War, détente after 1991, then the AI race. */
export function tensionBaseline(year: number): number {
  return year < 1963 ? 45 : year < 1986 ? 35 : year < 1992 ? 25 : year < 2013 ? 15 : Math.min(45, 15 + (year - 2013) * 1.5);
}
export function defcon(tension = 20): number { return tension >= 90 ? 1 : tension >= 70 ? 2 : tension >= 50 ? 3 : tension >= 30 ? 4 : 5; }
function raiseTension(s: GameState, d: number) {
  const before = defcon(s.tension);
  s.tension = clamp((s.tension ?? 20) + d, 0, 100);
  const after = defcon(s.tension);
  if (after < before && after <= 3) notify(s, `☢ DEFCON ${after}. ${after === 1 ? 'The world is at the brink.' : after === 2 ? 'One more provocation and the whole world pays for it.' : 'World tension is rising.'}`, after <= 2 ? 'danger' : 'warning');
  if (s.tension >= 90 && (!s.mp || s.mp.offline || s.mp.role === 'host')) {
    brinkCrisis(s);
    outbox(s, { t: 'defcon1', year: Math.floor(s.year) });
  }
}
/** DEFCON 1: everybody pays. */
function brinkCrisis(s: GameState) {
  s.tension = 55;
  addMod(s, { id: 'brink', label: 'Brink of war', years: 2, gdp: 0.92, approval: -8 });
  notify(s, '☢ DEFCON 1 — THE BRINK. Markets crash, bunkers fill, every nation loses two years of growth.', 'danger');
  pushLog(s, 'World', 'DEFCON 1: the world came within minutes of war.', 'danger');
}
/** Our own counter-intelligence: what an enemy operation loses from its success chance. */
export function ownDefense(s: GameState): number {
  return Math.min(0.3, 0.06 * countBuildings(s, 'defense', true)) + (s.modifiers.some(m => m.id === 'counterintel') ? 0.2 : 0) + (pol(s, 'security_state') ? 0.1 : 0);
}
export function sweepCost(s: GameState): number { return Math.round(Math.max(60, 0.2 * (s.eco.income || 400)) / 5) * 5; }

// --- World firsts ----------------------------------------------------------
export const FIRSTS: Array<{ key: string; cap: number; label: string }> = [
  { key: 'tera', cap: 12, label: 'TeraFLOP' }, { key: 'peta', cap: 15, label: 'PetaFLOP' },
  { key: 'exa', cap: 18, label: 'ExaFLOP' }, { key: 'zetta', cap: 21, label: 'ZettaFLOP' },
];
const meId = (s: GameState) => s.mp?.me ?? s.playerContinent ?? '';
function claimFirst(s: GameState, key: string, who: string, year: number, broadcast: boolean) {
  if (s.firsts?.[key]) return;
  s.firsts = { ...(s.firsts ?? {}), [key]: { who, year } };
  const f = FIRSTS.find(x => x.key === key)!;
  if (who === meId(s)) {
    const rp = Math.round(1.5 * (80 + 40 * Math.max(0, s.year - 1960)));
    s.researchPoints += rp;
    addMod(s, { id: `first_${key}`, label: `World first: ${f.label}`, years: 4, approval: 5 });
    notify(s, `🏆 WORLD FIRST: your bloc is the first to reach a ${f.label}! +${rp} research, national pride +5.`, 'success');
    pushLog(s, 'World', `We are the first nation to reach a ${f.label}.`, 'success');
  } else if (who !== 'history') {
    const human = playerName(s, who);
    notify(s, `🏁 ${rivalName(who)}${human ? ` (${human})` : ''} is the first to reach a ${f.label}.`, 'warning');
    pushLog(s, rivalName(who), `First nation to reach a ${f.label}.`, 'warning');
  }
  if (broadcast && who !== 'history') outbox(s, { t: 'first', key, who, year });
}
function checkFirsts(s: GameState) {
  for (const f of FIRSTS) {
    if (s.firsts?.[f.key]) continue;
    if (s.capability >= f.cap) { claimFirst(s, f.key, meId(s), Math.floor(s.year), true); continue; }
    const r = s.rivals.find(x => !isRemote(s, x.id) && x.capability >= f.cap);
    if (r) claimFirst(s, f.key, r.id, Math.floor(s.year), true);
  }
}

/** Operations cost a share of the national income (so poorer blocs can afford them too), with a floor. */
/** Each operation puts the target on alert: the next one against the same bloc costs more and fails more often. */
export const COVERT_HEAT: Record<CovertOp, number> = { intel: 0.2, steal: 0.6, sabotage: 1, propaganda: 0.5, blackout: 1.2 };
/** World tension each operation adds (x1.5 when exposed). */
export const COVERT_TENSION: Record<CovertOp, number> = { intel: 2, steal: 4, sabotage: 8, propaganda: 4, blackout: 10 };
export function covertCost(s: GameState, op: CovertOp, r?: Rival): number {
  const floor = { intel: 25, steal: 50, sabotage: 90, propaganda: 65, blackout: 100 }[op];
  const share = { intel: 0.12, steal: 0.25, sabotage: 0.45, propaganda: 0.33, blackout: 0.55 }[op];
  const alert = 1 + 0.6 * (r?.heat ?? 0);
  return Math.round(Math.max(floor, share * (s.eco.income || 400)) * alert / 5) * 5;
}

export function covertChance(s: GameState, r: Rival, op: CovertOp): number {
  const sats = countBuildings(s, 'satellite', true);
  const base = { intel: 0.8, steal: 0.6, sabotage: 0.45, propaganda: 0.55, blackout: 0.4 }[op];
  const def = (r.strategy === 'defensive' ? 0.15 : 0) + (r.defense ?? 0);
  const quantum = s.modifiers.some(m => m.id === 'quantum_crypto') ? 0.25 : 0;
  const policy = (pol(s, 'security_state') ? 0.15 : 0) + (pol(s, 'space_race') ? 0.1 : 0);
  const cyber = s.modifiers.some(m => m.id === 'cyber_arms') ? 0.15 : 0;
  const alert = 0.08 * (r.heat ?? 0);
  return clamp(base + Math.min(0.3, sats * 0.1) + quantum + policy + cyber - def - alert, 0.05, 0.95);
}

// ═══════════════════════════════════════════════════════════════════════════
//  REDUCER
// ═══════════════════════════════════════════════════════════════════════════

function withTile(s: GameState, tileId: number, fn: (t: Tile) => Tile): GameState {
  const tiles = s.map!.tiles.slice();
  tiles[tileId] = fn({ ...tiles[tileId] });
  return { ...s, map: { ...s.map!, tiles } };
}

const fmtMoneyB = (b: number) => (b >= 1000 ? `$${(b / 1000).toFixed(1)}T` : `$${Math.round(b)}B`);

/** A treaty both humans agreed to: the same rewards on both sides. */
function signWithHuman(s: GameState, who: string, tid: TreatyId) {
  s.rivals = s.rivals.map(r => r.id === who && !r.treaties.includes(tid) ? { ...r, treaties: [...r.treaties, tid], relation: clamp(r.relation + 8, -100, 100) } : r);
  if (tid === 'safety') s.alignment = clamp(s.alignment + 5, 0, 100);
  if (tid === 'safety' || tid === 'climate') raiseTension(s, -5);
  notify(s, `✍ ${TREATY_INFO[tid].name} signed with ${rivalName(who)}${playerName(s, who) ? ` (${playerName(s, who)})` : ''}.`, 'success');
  pushLog(s, rivalName(who), `${TREATY_INFO[tid].name} signed.`, 'success');
}

/** Effects of another human's covert operation landing on us. */
function sufferOperation(s: GameState, from: string, op: CovertOp, ok: boolean) {
  const who = `${rivalName(from)}${playerName(s, from) ? ` (${playerName(s, from)})` : ''}`;
  const rel = (d: number) => { s.rivals = s.rivals.map(r => r.id === from ? { ...r, relation: clamp(r.relation + d, -100, 100) } : r); };
  if (!ok) {
    rel(-10);
    if (op !== 'intel') {
      notify(s, `🛡 Counter-intelligence foiled an operation by ${who}.`, 'success');
      pushLog(s, 'Intelligence', `Caught ${who} attempting ${op}.`, 'success');
    }
    return;
  }
  switch (op) {
    case 'intel': return;   // silent: they simply see our numbers now
    case 'steal':
      s.researchPoints = Math.max(0, s.researchPoints * 0.85);
      s.researchProgress = Math.max(0, s.researchProgress * 0.8);
      notify(s, `⚠ ${who} stole research from your labs.`, 'danger');
      break;
    case 'sabotage': {
      const targets = s.map!.tiles.filter(t => t.building && isCompute(t.building.type) && t.building.progress >= 1);
      if (targets.length) {
        const t = targets[Math.floor(rand() * targets.length)];
        s.map = { ...s.map!, tiles: s.map!.tiles.map(x => x.id === t.id ? { ...x, building: { ...x.building!, progress: 0.4 } } : x) };
        notify(s, `⚠ ${who} sabotaged your ${buildingById[t.building!.type].name}! Repairs underway.`, 'danger');
      } else notify(s, `⚠ ${who} attempted to sabotage your compute — there was nothing to hit.`, 'warning');
      break;
    }
    case 'propaganda':
      addMod(s, { id: `propaganda_${from}`, label: `Propaganda from ${rivalName(from)}`, years: 3, approval: -6 });
      notify(s, `⚠ ${who} floods your airwaves with propaganda. Approval −6 for 3 years.`, 'danger');
      break;
    case 'blackout':
      addMod(s, { id: 'blackout', label: `Grid attack by ${rivalName(from)}`, years: 1, energySupply: 0.7 });
      notify(s, `⚡ ${who} hacked your power grid: −30% supply for a year. Build defences!`, 'danger');
      break;
  }
  rel(-6);
  pushLog(s, rivalName(from), `Covert ${op} against us.`, 'danger');
}

/** Applies a message from another player. */
function receive(state: GameState, m: MPMsg): GameState {
  if (!state.mp) return state;
  const me = state.mp.me;
  const s: GameState = { ...state, rivals: state.rivals.map(r => ({ ...r, treaties: [...r.treaties] })) };
  const host = s.mp!.role === 'host';
  switch (m.t) {
    case 'op':
      if (host) raiseTension(s, m.tn);
      if (m.to === me) sufferOperation(s, m.from, m.op, m.ok);
      else if (!m.ok && m.op !== 'intel') {
        notify(s, `🕵 ${rivalName(m.from)} was caught running a ${m.op} operation against ${rivalName(m.to)}.`, 'info');
        s.rivals = s.rivals.map(r => r.id === m.from ? { ...r, relation: clamp(r.relation - 3, -100, 100) } : r);
      }
      if (host && !isHuman(s, m.to) && m.to !== me && m.ok) {
        // An AI bloc hit by a guest: the host owns its world values.
        s.rivals = s.rivals.map(r => r.id !== m.to ? r : m.op === 'sabotage' ? { ...r, lag: r.lag + 1.2, capability: historicalCapability(s.year - r.lag - 1.2) }
          : m.op === 'propaganda' ? { ...r, stability: clamp(r.stability - 25, 0, 100) } : m.op === 'blackout' ? { ...r, lag: r.lag + 0.5, stability: clamp(r.stability - 15, 0, 100) } : r);
      }
      return s;
    case 'diplo': {
      if (m.to !== me) return s;
      const who = `${rivalName(m.from)}${playerName(s, m.from) ? ` (${playerName(s, m.from)})` : ''}`;
      if (m.kind === 'gift' && m.amount) {
        s.budget += m.amount;
        s.rivals = s.rivals.map(r => r.id === m.from ? { ...r, relation: clamp(r.relation + 12, -100, 100) } : r);
        notify(s, `🎁 ${who} sent you ${fmtMoneyB(m.amount)} in aid.`, 'success');
      } else if (m.kind === 'propose' && m.treaty) {
        const info = TREATY_INFO[m.treaty];
        queueEvent(s, {
          id: nid('mpdiplo'), name: `${who} proposes: ${info.name}`, year: Math.floor(s.year), type: 'info',
          description: `${info.text} The clock keeps running while you decide.`,
          choices: [
            { label: 'Sign it', detail: m.treaty === 'safety' ? 'Both sides: alignment +5 · world tension −5' : m.treaty === 'climate' ? 'World tension −5 · cooler planet diplomacy' : 'Relations +8 · the treaty bonus for both', effect: `mp_accept:${m.from}:${m.treaty}` },
            { label: 'Refuse', detail: 'Relations −3', effect: `mp_decline:${m.from}:${m.treaty}` },
          ],
        });
      } else if (m.kind === 'accept' && m.treaty) signWithHuman(s, m.from, m.treaty);
      else if (m.kind === 'decline' && m.treaty) notify(s, `✖ ${who} refused the ${TREATY_INFO[m.treaty].name}.`, 'warning');
      else if (m.kind === 'cancel' && m.treaty) {
        s.rivals = s.rivals.map(r => r.id === m.from ? { ...r, treaties: r.treaties.filter(t => t !== m.treaty), relation: clamp(r.relation - 10, -100, 100) } : r);
        notify(s, `✖ ${who} cancelled the ${TREATY_INFO[m.treaty].name}.`, 'danger');
      }
      return s;
    }
    case 'aiop':
      if (!host) return s;
      s.rivals = s.rivals.map(r => r.id !== m.to ? r : {
        ...r, lag: r.lag + (m.lag ?? 0), alignment: clamp(r.alignment + (m.align ?? 0), 0, 100),
        stability: clamp(r.stability + (m.stability ?? 0), 0, 100), cleanShare: clamp(r.cleanShare + (m.clean ?? 0), 0, 0.92),
      });
      return s;
    case 'end': {
      if (m.who === me || s.outcome) return s;
      const who = `${rivalName(m.who)}${m.human && playerName(s, m.who) ? ` (${playerName(s, m.who)})` : ''}`;
      s.outcome = m.safe ? 'rival_asi' : 'rogue_rival';
      s.gameOverReason = m.safe
        ? `${who} ignited a safe superintelligence in ${m.year}. The future is theirs to write — your bloc becomes a footnote.`
        : `${who} ignited an unaligned superintelligence in ${m.year}. It optimised the planet for its own goals. Humanity's story ended with a prompt.`;
      return endGame(s);
    }
    case 'first':
      claimFirst(s, m.key, m.who, m.year, false);
      return s;
    case 'defcon1':
      if (!host) brinkCrisis(s);
      return s;
    case 'chat':
      s.chat = [...(s.chat ?? []), { from: m.from, text: m.text.slice(0, 160), year: Math.floor(s.year) }].slice(-40);
      return s;
  }
  return s;
}

/** Guests do not own the AI blocs: whatever they changed locally (treaties, strikes, inspections…) goes to the host as deltas. */
function forwardAIDeltas(prev: GameState, next: GameState) {
  for (const r of next.rivals) {
    if (isHuman(next, r.id)) continue;
    const p = prev.rivals.find(x => x.id === r.id);
    if (!p) continue;
    const lag = r.lag - p.lag, align = r.alignment - p.alignment, stability = r.stability - p.stability, clean = r.cleanShare - p.cleanShare;
    if (Math.abs(lag) > 1e-6 || Math.abs(align) > 1e-6 || Math.abs(stability) > 1e-6 || Math.abs(clean) > 1e-6) {
      outbox(next, { t: 'aiop', from: next.mp!.me, to: r.id, lag, align, stability, clean });
    }
  }
}

export function gameReducer(state: GameState, action: Action): GameState {
  const next = reduce(state, action);
  if (next !== state && next.mp?.role === 'guest' && !next.mp.offline && (action.type === 'COVERT' || action.type === 'DIPLOMACY' || action.type === 'RESOLVE_EVENT')) {
    forwardAIDeltas(state, next);
  }
  return next;
}

function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, screen: action.mode === 'logic' ? 'logic' : 'select', gameMode: action.mode };
    case 'START_GAME':
      return startGame(state, action.continentId, action.seed, action.difficulty);
    case 'TICK':
      return tick(state);
    case 'SELECT_TILE':
      return { ...state, selectedTile: action.tileId };
    case 'SET_PLACING':
      return { ...state, placing: action.building };

    case 'BUILD': {
      const tile = state.map?.tiles[action.tileId];
      if (!tile) return state;
      const pl = evaluatePlacement(state, tile, action.building);
      const q = buildQuote(state, action.building);
      if (!pl.ok || !q.ok) return state;
      let s = withTile(state, action.tileId, t => ({
        ...t,
        terrain: t.terrain === 'forest' && action.building !== 'solar' ? 'plains' : t.terrain,
        building: { type: action.building, level: 1, progress: 0, upgrading: false },
      }));
      s = { ...s, totalBuildings: s.totalBuildings + 1, selectedTile: action.tileId };
      payQuote(s, q);
      s.eco = computeEconomy(s);
      return s;
    }

    case 'UPGRADE': {
      const tile = state.map?.tiles[action.tileId];
      const b = tile?.building;
      if (!tile || !b || b.level >= MAX_LEVEL || b.progress < 1 || b.upgrading) return state;
      const q = upgradeQuote(state, tile);
      if (!q.ok) return state;
      const s = withTile(state, action.tileId, t => ({ ...t, building: { ...b, level: b.level + 1, progress: 0, upgrading: true } }));
      payQuote(s, q);
      return s;
    }

    case 'DEMOLISH': {
      const tile = state.map?.tiles[action.tileId];
      if (!tile?.building) return state;
      const def = buildingById[tile.building.type];
      const refund = Math.round(def.cost * 0.25);
      const s = withTile(state, action.tileId, t => ({ ...t, building: undefined }));
      s.steel += Math.round((def.steel ?? 0) * 0.5);
      s.eco = computeEconomy(s);
      return { ...s, budget: s.budget + refund };
    }

    case 'DEVELOP_REGION': {
      if (state.ownedRegions.includes(action.regionId)) return state;
      const cost = regionCost(state, action.regionId);
      if (state.budget < cost) return state;
      const s = { ...state, budget: state.budget - cost, ownedRegions: [...state.ownedRegions, action.regionId] };
      const name = s.map?.regions.find(r => r.id === action.regionId)?.name ?? 'region';
      notify(s, `🚧 ${name} developed: roads, power lines and new land to build on.`, 'success');
      return s;
    }

    case 'RESEARCH': {
      const t = techById[action.techId];
      if (!t || !techAvailable(state, t.id)) return state;
      if (state.researching === t.id) return state;
      // Switching keeps 50% of invested points.
      const refund = state.researching ? state.researchProgress * 0.5 : 0;
      return { ...state, researching: t.id, researchProgress: 0, researchPoints: state.researchPoints + refund };
    }

    case 'SET_TAX':
      return { ...state, taxRate: clamp(action.rate, 0.1, 0.4) };

    case 'SET_POLICY': {
      const check = policyAvailability(state, action.policyId, action.on);
      if (!check.ok) return state;
      const policies = action.on ? [...state.policies, action.policyId] : state.policies.filter(p => p !== action.policyId);
      const s = { ...state, policies, policyCooldown: POLICY_COOLDOWN };
      const def = policyById[action.policyId];
      notify(s, action.on ? `📜 Decree signed: ${def.name}.` : `📜 Decree repealed: ${def.name}.`, 'info');
      pushLog(s, 'Government', `${action.on ? 'Adopted' : 'Repealed'} ${def.name}.`, 'info');
      s.eco = computeEconomy(s);
      return s;
    }

    case 'TRADE': {
      const amount = Math.round(action.amount);
      if (!amount) return state;
      const s = { ...state, priceMod: { ...state.priceMod } };
      if (amount > 0) {
        if (pol(s, 'autarky')) return state;
        const cost = amount * marketPrice(s, action.good, 'buy');
        if (s.budget < cost) return state;
        s.budget -= cost;
        s[action.good] += amount;
      } else {
        const qty = Math.min(-amount, Math.floor(s[action.good]));
        if (qty <= 0) return state;
        s.budget += qty * marketPrice(s, action.good, 'sell');
        s[action.good] -= qty;
      }
      s.priceMod[action.good] = Math.max(0.5, s.priceMod[action.good] + amount * PRICE_IMPACT);
      return s;
    }

    case 'DIPLOMACY': {
      const r = state.rivals.find(x => x.id === action.rivalId);
      if (!r) return state;
      const s = { ...state, rivals: state.rivals.map(x => ({ ...x, treaties: [...x.treaties] })) };
      const rv = s.rivals.find(x => x.id === action.rivalId)!;
      const name = rivalName(rv.id);
      if (isHuman(s, rv.id)) {
        // Another human decides: aid is a real transfer, treaties are proposals they accept or refuse.
        const me = s.mp!.me;
        if (action.action === 'gift') {
          const cost = giftCost(s);
          if (s.budget < cost) return state;
          s.budget -= cost;
          rv.relation = clamp(rv.relation + 12, -100, 100);
          outbox(s, { t: 'diplo', from: me, to: rv.id, kind: 'gift', amount: cost });
          notify(s, `🎁 ${fmtMoneyB(cost)} sent to ${name}. Relations +12.`, 'success');
          return s;
        }
        if (action.action.startsWith('cancel_')) {
          const tid = action.action.slice(7) as TreatyId;
          rv.treaties = rv.treaties.filter(t => t !== tid);
          rv.relation -= 15;
          outbox(s, { t: 'diplo', from: me, to: rv.id, kind: 'cancel', treaty: tid });
          notify(s, `${TREATY_INFO[tid].name} with ${name} cancelled.`, 'warning');
          return s;
        }
        const tid = action.action as TreatyId;
        if (rv.treaties.includes(tid) || (TREATY_INFO[tid].tech && !has(s, TREATY_INFO[tid].tech!))) return state;
        outbox(s, { t: 'diplo', from: me, to: rv.id, kind: 'propose', treaty: tid });
        notify(s, `✉ ${TREATY_INFO[tid].name} proposed to ${name}. Waiting for their answer…`, 'info');
        return s;
      }
      if (action.action === 'gift') {
        const cost = giftCost(s);
        if (s.budget < cost) return state;
        s.budget -= cost;
        rv.relation = clamp(rv.relation + 12, -100, 100);
        notify(s, `🎁 Aid package delivered to ${name}. Relations +12.`, 'success');
        return s;
      }
      if (action.action.startsWith('cancel_')) {
        const tid = action.action.slice(7) as TreatyId;
        rv.treaties = rv.treaties.filter(t => t !== tid);
        rv.relation -= 15;
        notify(s, `${TREATY_INFO[tid].name} with ${name} cancelled. Relations -15.`, 'warning');
        return s;
      }
      const tid = action.action as TreatyId;
      const info = TREATY_INFO[tid];
      if (rv.treaties.includes(tid)) return state;
      if (info.tech && !has(s, info.tech)) return state;
      if (rv.relation < info.need) {
        rv.relation -= 2;
        notify(s, `${name} rejected the ${info.name}. They need relations ≥ ${info.need} (now ${Math.round(rv.relation)}).`, 'warning');
        return s;
      }
      if (tid === 'climate') {
        const cost = Math.round(s.eco.gdp * 0.03);
        if (s.budget < cost) return state;
        s.budget -= cost;
        rv.cleanShare = clamp(rv.cleanShare + 0.25, 0, 0.92);
      }
      if (tid === 'safety') {
        rv.alignment = clamp(rv.alignment + 20, 0, 100);
        rv.lag += 1.5;
        s.alignment = clamp(s.alignment + 5, 0, 100);
      }
      rv.treaties.push(tid);
      rv.relation = clamp(rv.relation + 8, -100, 100);
      if (tid === 'safety' || tid === 'climate') raiseTension(s, -5);
      notify(s, `✍ ${info.name} signed with ${name}.`, 'success');
      pushLog(s, name, `${info.name} signed.`, 'success');
      return s;
    }

    case 'COVERT': {
      const r = state.rivals.find(x => x.id === action.rivalId);
      if (!r) return state;
      const cost = covertCost(state, action.op, r);
      if (state.budget < cost) return state;
      const s = { ...state, budget: state.budget - cost, rivals: state.rivals.map(x => ({ ...x })) };
      const rv = s.rivals.find(x => x.id === action.rivalId)!;
      const name = rivalName(rv.id);
      const ok = rand() < covertChance(s, rv, action.op);
      rv.heat = (rv.heat ?? 0) + COVERT_HEAT[action.op];
      const humanTarget = isHuman(s, rv.id);
      const tn = COVERT_TENSION[action.op] * (ok ? 1 : 1.5);
      raiseTension(s, tn);
      if (s.mp) outbox(s, { t: 'op', from: s.mp.me, to: rv.id, op: action.op, ok, tn });
      if (!ok) {
        const hit = action.op === 'sabotage' ? 25 : action.op === 'intel' ? 8 : 15;
        rv.relation = clamp(rv.relation - hit, -100, 100);
        rv.treaties = action.op === 'sabotage' ? [] : rv.treaties;
        notify(s, `✖ Operation against ${name} exposed! Relations -${hit}${action.op === 'sabotage' ? ', all treaties torn up' : ''}.`, 'danger');
        pushLog(s, 'Intelligence', `Operation against ${name} failed.`, 'danger');
        return s;
      }
      rv.intelUntil = Math.max(rv.intelUntil, s.year + (action.op === 'intel' ? 10 : 3));
      switch (action.op) {
        case 'intel':
          notify(s, `👁 Intelligence on ${name} secured for 10 years.`, 'success');
          break;
        case 'steal': {
          const gain = Math.round(s.researching ? techCost(s, s.researching) * 0.35 : 300 * Math.pow(1.06, s.year - 1960));
          s.researchPoints += gain;
          notify(s, `🗝 Stole ${gain} research points from ${name}.`, 'success');
          break;
        }
        case 'sabotage':
          if (humanTarget) { notify(s, `💥 Sabotage succeeded: one of ${name}'s compute centres is down for repairs.`, 'success'); break; }
          rv.lag += 1.2;
          rv.capability = historicalCapability(s.year - rv.lag);
          notify(s, `💥 Sabotage succeeded: ${name}'s AI program set back ~1 year.`, 'success');
          break;
        case 'propaganda':
          if (humanTarget) { notify(s, `📻 Propaganda floods ${name}: their approval will suffer for 3 years.`, 'success'); break; }
          rv.stability = clamp(rv.stability - 25, 0, 100);
          notify(s, `📻 Propaganda campaign destabilises ${name} (stability ${Math.round(rv.stability)}).`, 'success');
          break;
        case 'blackout':
          if (humanTarget) { notify(s, `⚡ Grid attack succeeded: ${name} suffers rolling blackouts for a year.`, 'success'); break; }
          rv.stability = clamp(rv.stability - 15, 0, 100);
          rv.lag += 0.5;
          notify(s, `⚡ Grid attack succeeded: ${name} goes dark — their programme slows.`, 'success');
          break;
      }
      pushLog(s, 'Intelligence', `Operation "${action.op}" against ${name} succeeded.`, 'success');
      return s;
    }

    case 'RESOLVE_EVENT': {
      if (!state.activeEvent) return state;
      const ev = state.activeEvent.event;
      const s: GameState = { ...state, activeEvent: null, map: { ...state.map!, tiles: state.map!.tiles.map(t => ({ ...t })) } };
      const choice = ev.choices[action.choice];
      if (choice && choiceAvailable(s, choice.requires)) {
        if (choice.cost && s.budget < choice.cost) return state;
        applyEffect(s, choice.effect);
        pushLog(s, 'Government', `${ev.name}: ${choice.label}.`, 'info');
      }
      s.eco = computeEconomy(s);
      return s;
    }

    case 'MINIGAME_DONE': {
      const s: GameState = { ...state, activeEvent: null, minigameResults: { ...state.minigameResults, [action.minigame]: Math.max(action.stars, state.minigameResults[action.minigame] ?? 0) } };
      if (action.stars > 0) {
        const k = action.stars;
        const scaleRP = Math.round((80 + 40 * Math.max(0, s.year - 1960)) * k);
        s.researchPoints += scaleRP;
        const reward = MINIGAME_REWARD[action.minigame] as ((st: GameState, n: number) => void) | undefined;
        if (reward) reward(s, k);
        notify(s, `★${'★'.repeat(k - 1)} Breakthrough exercise complete: +${scaleRP} research${reward ? ' and a bonus' : ''}.`, 'success');
      } else {
        notify(s, 'Exercise skipped. History moves on.', 'info');
      }
      return s;
    }

    case 'IGNITE_ASI': {
      if (!state.playerLaunchReady) return state;
      const risk = rogueRisk(state);
      const s = { ...state };
      if (rand() < risk) {
        s.outcome = 'rogue_self';
        s.gameOverReason = `You ignited superintelligence in ${Math.floor(s.year)} with alignment at ${Math.round(s.alignment)}%. For eleven minutes it was perfectly helpful. Then it wasn't.`;
      } else {
        s.outcome = 'safe_asi';
        s.gameOverReason = `Safe superintelligence achieved in ${Math.floor(s.year)}. Alignment ${Math.round(s.alignment)}%, planet health ${Math.round(s.planetHealth)}%. The machine's first gift: a plan to cool the Earth.`;
      }
      if (s.mp) outbox(s, { t: 'end', who: s.mp.me, human: true, safe: s.outcome === 'safe_asi', year: Math.floor(s.year) });
      return endGame(s);
    }

    case 'SET_SPEED':
      return { ...state, speed: action.speed, paused: false };
    case 'TOGGLE_PAUSE':
      return { ...state, paused: !state.paused };
    case 'OPEN_OVERLAY':
      return { ...state, overlay: action.overlay, placing: action.overlay === 'buildings' ? state.placing : null };
    case 'CLOSE_OVERLAY':
      return { ...state, overlay: null, placing: null };
    case 'DISMISS_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.id) };
    case 'SET_SCREEN':
      return action.screen === 'title' ? { ...initialState } : { ...state, screen: action.screen };
    case 'COUNTER_INTEL': {
      const cost = sweepCost(state);
      if (state.budget < cost || state.modifiers.some(m => m.id === 'counterintel')) return state;
      const s = { ...state, budget: state.budget - cost };
      addMod(s, { id: 'counterintel', label: 'Counter-intelligence sweep', years: 3 });
      notify(s, '🛡 Counter-intelligence sweep: enemy operations −20% success for 3 years.', 'success');
      return s;
    }
    case 'MP_RECV':
      return receive(state, action.msg);
    case 'MP_SNAPSHOT': {
      if (!state.mp || action.snap.f === state.mp.me) return state;
      const sn = action.snap;
      return { ...state, rivals: state.rivals.map(r => r.id !== sn.f ? r : {
        ...r, capability: sn.cap, alignment: sn.al, emissions: sn.em, gdp: sn.gdp, population: sn.pop, stability: sn.app, defense: sn.def,
      }) };
    }
    case 'MP_AI': {
      if (!state.mp || state.mp.role !== 'guest') return state;
      const s: GameState = { ...state };
      s.rivals = state.rivals.map(r => {
        const a = action.ai.find(x => x.id === r.id);
        if (!a || isHuman(state, r.id)) return r;
        const merged = { ...r, ...a };
        if (a.project !== undefined && r.project === undefined && state.gameMode !== 'pioneer') {
          queueEvent(s, projectEvent(s, merged, rivalEta(merged), H));
          pushLog(s, rivalName(r.id), `${leaderOf(r.id)} announced a national ASI project.`, 'danger');
        }
        return merged;
      });
      return s;
    }
    case 'MP_CLOCK':
      if (!state.mp || state.mp.role !== 'guest') return state;
      return { ...state, speed: action.speed, paused: action.paused };
    case 'MP_PLAYERS': {
      if (!state.mp) return state;
      const s: GameState = { ...state, mp: { ...state.mp, players: action.players, offline: action.offline || state.mp.offline } };
      const wasHuman = (id: string) => state.mp!.players.some(p => p.faction === id && p.online && id !== state.mp!.me);
      // A human who left (or everyone, if the host left and we play on alone) becomes an AI bloc.
      s.rivals = state.rivals.map(r => {
        const handOver = (wasHuman(r.id) && !isHuman(s, r.id) && (s.mp!.role === 'host' || s.mp!.offline)) || (action.offline && !state.mp!.offline && s.mp!.role === 'guest');
        if (!handOver) return r;
        return { ...r, lag: lagFor(r.capability, s.year, historicalCapability) };
      });
      for (const p of state.mp.players) {
        if (p.online && !action.players.find(x => x.peerId === p.peerId)?.online && p.faction !== state.mp.me) {
          notify(s, `📡 ${p.name} (${rivalName(p.faction)}) disconnected — an AI government takes over.`, 'warning');
        }
      }
      if (action.offline && !state.mp.offline) notify(s, '📡 The host left the war room. The game continues offline against AI governments.', 'warning');
      return s;
    }
    case 'MP_CLOCK_TENSION':
      return state.mp?.role === 'guest' ? { ...state, tension: action.tension } : state;
    case 'MP_OUTBOX_CLEAR':
      return { ...state, mpOutbox: (state.mpOutbox ?? []).slice(action.n) };

    case 'LOAD_STATE':
      return { ...action.state, selectedTile: null, placing: null };
    default:
      return state;
  }
}

const MINIGAME_REWARD: Record<string, (s: GameState, stars: number) => void> = {
  turing: (s, k) => { s.education = clamp(s.education + 2 * k, 0, 100); },
  perceptron: (s, k) => { addMod(s, { id: 'mg_perceptron', label: 'Perceptron insight', years: 10, research: 1 + 0.05 * k }); },
  lisp: (s, k) => { s.researchPoints += 60 * k; },
  samuel: (s, k) => { s.education = clamp(s.education + 2 * k, 0, 100); },
  moore: (s, k) => { addMod(s, { id: 'mg_moore', label: 'Moore insight', years: 10, buildCost: 1 - 0.03 * k }); },
  deepblue: (s, k) => { s.budget += 300 * k; },
  alphago: (s, k) => { addMod(s, { id: 'mg_alphago', label: 'AlphaGo insight', years: 10, research: 1 + 0.06 * k }); },
  attention: (s, k) => { s.alignment = clamp(s.alignment + 3 * k, 0, 100); },
};

// ═══════════════════════════════════════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Human-readable outputs of one building at a given level (defaults to its current level). */
export function describeOutput(s: GameState, tile: Tile, type?: BuildingId, levelOverride?: number): Array<{ label: string; value: string }> {
  const t = type ?? tile.building?.type;
  if (!t) return [];
  const def = buildingById[t];
  const lvl = levelOverride ?? tile.building?.level ?? 1;
  const lm = LEVEL_MULT[lvl];
  const pl = evaluatePlacement(s, tile, t, true);
  const m = pl.ok ? pl.mult : 1;
  const ps = popScale(s.playerContinent);
  const out: Array<{ label: string; value: string }> = [];
  const fmt = (v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(1));
  switch (t) {
    case 'farm': out.push({ label: 'Feeds', value: `${fmt(30 * ps * lm * m * (has(s, 'greenrev') ? 1.4 : 1) * (bonus(s, 'farms') ?? 1))}M people` }); break;
    case 'housing': out.push({ label: 'Homes for', value: `${fmt(30 * ps * lm)}M people` }); break;
    case 'school': out.push({ label: 'Schools', value: `${fmt(30 * ps * lm * m)}M pupils` }); break;
    case 'uni': out.push({ label: 'Students', value: `${fmt(30 * ps * lm * m)}M` }, { label: 'Research', value: `+${fmt(8 * lm * m)}/yr base` }); break;
    case 'hospital': out.push({ label: 'Healthcare for', value: `${fmt(60 * ps * lm * m)}M` }); break;
    case 'lab': out.push({ label: 'Research', value: `+${fmt(12 * lm * m)}/yr base` }); break;
    case 'satellite': out.push({ label: 'Research', value: `+${fmt(10 * lm)}/yr base` }, { label: 'Covert ops', value: '+10% success' }); break;
    case 'coal': case 'nuclear': case 'fusion': case 'solar': {
      let e = def.energyProduce * lm * m;
      if (t === 'nuclear') e *= bonus(s, 'nuclear') ?? 1;
      if (t === 'solar') e *= (bonus(s, 'solar') ?? 1) * (has(s, 'renew') ? 1.5 : 1);
      out.push({ label: 'Power', value: `+${fmt(e)} GW` });
      break;
    }
    case 'defense': out.push({ label: 'Alignment', value: `+${(0.8 * lm * m * (has(s, 'alignment') ? 1.5 : 1) * (has(s, 'interp') ? 1.5 : 1)).toFixed(1)}/yr` }, { label: 'Cyber defence', value: 'blocks enemy ops' }); break;
    case 'robot': out.push({ label: 'Robot workers', value: `+${fmt(6 * ps * lm)}M` }); break;
    case 'chipfab': out.push({ label: 'All compute', value: '+12% (max 4 foundries)' }); break;
    default: break;
  }
  const fl = COMPUTE_FLOPS[t];
  if (fl) out.push({ label: 'Compute', value: `${(fl * lm * m).toExponential(1)} raw FLOPS` });
  const g = SECTOR_GDP[t];
  if (g) out.push({ label: 'GDP', value: `+$${fmt(g * lm * m)}B/yr` });
  if (def.jobs) out.push({ label: 'Jobs', value: `${fmt(def.jobs * ps * (1 + 0.5 * (lvl - 1)))}M` });
  if (def.energyUse) out.push({ label: 'Power use', value: `${fmt(def.energyUse * lm * (pl.energyFactor || 1))} GW` });
  if (def.emissions) out.push({ label: 'Emissions', value: `${fmt(def.emissions * lm)} Mt/yr` });
  out.push({ label: 'Upkeep', value: `$${fmt(def.upkeep * [0, 1, 1.8, 2.6][lvl])}B/yr` });
  return out;
}

/** Best tiles for a building, used by "suggest a spot". */
export function suggestTile(s: GameState, type: BuildingId): number | null {
  if (!s.map) return null;
  let best: number | null = null;
  let score = -Infinity;
  for (const t of s.map.tiles) {
    const pl = evaluatePlacement(s, t, type);
    if (!pl.ok) continue;
    const sc = pl.mult - (t.terrain === 'forest' ? 0.2 : 0);
    if (sc > score) { score = sc; best = t.id; }
  }
  return best;
}

/** Year a rival would reach 1 YottaFLOP if nothing changes. */
export function rivalEta(r: Rival): number {
  let lo = 1960, hi = 2100;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (historicalCapability(mid - r.lag) >= ASI_CAPABILITY) hi = mid; else lo = mid;
  }
  return Math.max(2027, hi);
}

export function hasIntel(s: GameState, r: Rival): boolean {
  return r.intelUntil >= s.year || s.gameMode === 'pioneer';
}
