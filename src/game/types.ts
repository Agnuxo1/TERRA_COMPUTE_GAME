// Core types of the Terra Compute strategy engine.
// Everything here is plain data so the engine can run headless (tests, balance sims).

export type GameMode = 'pioneer' | 'strategist' | 'complete' | 'logic';
export type Screen = 'title' | 'mode' | 'select' | 'game' | 'logic' | 'gameover' | 'victory' | 'lobby' | 'scenarios' | 'challenge';

export type Terrain = 'water' | 'plains' | 'fertile' | 'forest' | 'hills' | 'desert' | 'tundra';
export type Deposit = 'coal' | 'uranium' | 'silicon';

export type BuildingId =
  | 'housing' | 'farm' | 'hospital' | 'school' | 'uni'
  | 'factory' | 'market' | 'seaport'
  | 'coal' | 'nuclear' | 'solar' | 'fusion'
  | 'lab' | 'mainframe' | 'super' | 'datacenter' | 'gpucluster' | 'aifactory'
  | 'chipfab' | 'defense' | 'robot' | 'satellite';

export type BuildingCategory = 'people' | 'economy' | 'energy' | 'science' | 'compute' | 'safety';

/** 'doomsday' = hard, plus every AI bloc gangs up on whoever leads the race (guide 8.4). */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'doomsday';

export interface HistoryPoint {
  year: number;
  gdp: number;
  budget: number;
  population: number;
  capability: number;
  alignment: number;
  approval: number;
  planetHealth: number;
  emissions: number;
  rivalTop: number;
  research: number;
  /** Rival capability (log10 FLOPS) by rival id, at this year's snapshot (Phase C4). */
  rivals?: Record<string, number>;
}

/** One line of the yearly report. `text` is an English source string rendered with t(text, params). */
export interface YearReportLine {
  text: string;
  params?: Record<string, string | number>;
  tone: 'good' | 'bad' | 'info';
}

export interface YearReport {
  year: number;
  lines: YearReportLine[];
}

export type AIStrategy = 'aggressive' | 'economic' | 'tech' | 'balanced' | 'defensive';

export interface ContinentData {
  id: string;
  name: string;
  color: string;
  gdp1960: number;
  energy1960: number;
  techLevel: number;
  solarPotential: number;
  description: string;
  specialBonus: string;
  basePopulation: number;
  capital: string; // territory id of the starting developed region
}

export interface BuildingData {
  id: BuildingId;
  name: string;
  short: string;
  category: BuildingCategory;
  icon: string;
  cost: number;          // $B, first copy
  upkeep: number;        // $B per year
  buildTime: number;     // years
  jobs: number;          // millions of workers (scaled by continent size)
  energyUse: number;     // GW
  energyProduce: number; // GW
  emissions: number;     // Mt CO2e per year
  description: string;
  /** Plain-language placement rules shown in the build menu. */
  placement: string;
  requiresTech?: string;
  unique?: boolean;
  steel?: number;       // construction cost in steel
  chips?: number;       // construction cost in chips
  chipUpkeep?: number;  // chips per year to keep the hardware running
}

export interface Tile {
  id: number;
  col: number;
  row: number;
  terrain: Terrain;
  coast: boolean;
  river: boolean;
  deposit?: Deposit;
  region: string | null; // territory id; null for water
  building?: PlacedBuilding;
}

export interface PlacedBuilding {
  type: BuildingId;
  level: number;         // 1..3
  progress: number;      // 0..1 construction/upgrade progress; 1 = operational
  upgrading: boolean;    // true while a level-up is under construction
}

export interface MapData {
  cols: number;
  rows: number;
  tiles: Tile[];
  regions: Array<{ id: string; name: string; tiles: number[]; center: [number, number] }>;
}

export interface TechData {
  id: string;
  name: string;
  year: number;
  era: 1 | 2 | 3 | 4 | 5;
  cost: number;
  requires: string[];
  effect: string;
  description: string;
  computeMult?: number;
  unlocks?: BuildingId[];
}

export interface EventChoice {
  label: string;
  detail: string;
  /** Effect id interpreted by the engine. */
  effect: string;
  cost?: number;
  requires?: string; // condition id
}

export interface GameEvent {
  id: string;
  name: string;
  year: number;
  type: 'info' | 'warning' | 'danger';
  description: string;
  card?: string;
  choices: EventChoice[];
  minigame?: string;
}

export interface Modifier {
  id: string;
  label: string;
  until: number; // game year when it expires
  // multiplicative (1 = neutral) or additive values interpreted by engine
  research?: number;
  gdp?: number;
  farms?: number;
  energyDemand?: number;
  energySupply?: number;
  approval?: number;   // additive
  alignment?: number;  // additive per year
  buildCost?: number;
  chipCost?: number;
  popGrowth?: number;  // additive per year
}

export type TreatyId = 'trade' | 'research' | 'climate' | 'safety';

/** A rival's memory of what someone did to it (fades over time). */
export interface AIMemory { who: string; delta: number; year: number; why: string }   // who = 'player' or a rival id

/** Living rival: a yearly budget split into investment lines that drive its pace, posture and memory. */
export interface AINation {
  budget: number;                                    // $B available
  invest: { compute: number; research: number; safety: number; defense: number; covert: number };  // smoothed $B/yr
  mood: 'build' | 'race' | 'secure' | 'diplomacy';   // current posture (shown in UI)
  plan: string;                                      // English source text of the last yearly plan (translated at render with t())
  memory: AIMemory[];
  lastYear: number;                                  // last year planned
}

export interface Rival {
  id: string;
  strategy: AIStrategy;
  gdp: number;
  population: number;
  capability: number;     // log10 FLOPS
  lag: number;            // years behind (+) or ahead (-) of the historical compute curve
  alignment: number;      // 0..100
  emissions: number;      // Mt per year
  cleanShare: number;     // 0..1 of their energy that is clean
  stability: number;      // 0..100
  relation: number;       // -100..100 attitude towards player
  treaties: TreatyId[];
  intelUntil: number;     // year until which exact numbers are visible
  asiLaunched: boolean;
  /** Year the rival announced its ASI crash project (final act), if any. */
  project?: number;
  /** Counter-intelligence alert from our recent operations (decays ~0.3/yr). */
  heat?: number;
  /** Multiplayer: the human's own counter-intelligence (reported in their snapshot), lowers our success odds. */
  defense?: number;
  /** Living rival state (investment, posture, memory). Optional so older saves still load. */
  nation?: AINation;
  lastAction: string;
  cooldown: number;       // years until next notable action
}

export interface Notification {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  time: number;
}

export interface LogEntry {
  id: string;
  year: number;
  who: string;
  text: string;
  tone: 'info' | 'warning' | 'danger' | 'success';
}

export interface Objective {
  id: string;
  text: string;
  hint: string;
  reward: number; // $B
  done: boolean;
}

export interface PendingEvent {
  id: string;           // GameEvent id or generated id
  event: GameEvent;
}

export interface ForecastWarning {
  kind: 'food' | 'energy' | 'approval' | 'budget' | 'climate' | 'alignment' | 'housing' | 'jobs';
  text: string;
  severity: 'warning' | 'danger';
}

export interface Economy {
  // Flows recomputed every tick (per year) — used by UI tooltips.
  gdp: number;
  income: number;
  upkeep: number;
  netBudget: number;
  foodSupply: number;
  foodDemand: number;
  housingCap: number;
  jobs: number;
  workers: number;
  unemployment: number;
  energySupply: number;
  energyDemand: number;
  energyRatio: number;
  researchRate: number;
  computeRaw: number;
  computeMult: number;
  emissions: number;
  alignmentGain: number;
  alignmentPressure: number;
  approvalTarget: number;
  approvalFactors: Array<{ label: string; value: number }>;
  eduTarget: number;
  comfort: number;
  staffing: number;
  steelProd: number;
  steelUse: number;   // construction draw this year (informative)
  chipProd: number;
  chipUse: number;    // hardware upkeep per year
  chipFactor: number; // 0..1 compute efficiency when chips run short
  policyCost: number;
  imports: number;    // $ per year spent auto-importing chips for upkeep
}

export interface GameState {
  screen: Screen;
  gameMode: GameMode | null;
  seed: number;
  year: number;
  startYear: number;
  tickCount: number;
  playerContinent: string | null;

  // Map
  map: MapData | null;
  ownedRegions: string[];
  selectedTile: number | null;
  placing: BuildingId | null;

  // Stocks
  budget: number;
  steel: number;
  chips: number;
  population: number;
  education: number;
  researchPoints: number;
  approval: number;
  alignment: number;
  capability: number; // log10 of effective FLOPS
  compute: number;    // effective FLOPS
  taxRate: number;    // 0.1 .. 0.4

  // Legacy (pre-1960) national infrastructure, scaled per continent
  legacy: { food: number; housing: number; jobs: number; energy: number; emissionsPerGW: number };

  eco: Economy;

  // Policies & market
  policies: string[];
  policyCooldown: number;
  priceMod: { steel: number; chips: number };
  history: HistoryPoint[];
  difficulty: Difficulty;

  // Tech
  unlockedTechs: string[];
  researching: string | null;
  researchProgress: number; // RP invested into current tech

  // World
  rivals: Rival[];
  co2: number;           // cumulative world emissions index
  temperature: number;   // °C anomaly
  planetHealth: number;  // 0..100
  doomClock: number;     // minutes to midnight 0..12

  // Events & modifiers
  firedEvents: string[];
  eventQueue: PendingEvent[];
  activeEvent: PendingEvent | null;
  modifiers: Modifier[];
  minigameResults: Record<string, number>;
  /** Dynamic-event bookkeeping (older saves lack it). */
  dyn?: { last: Record<string, number>; nextElection: number; lastAny: number; lastProject?: number };
  /** Peer-to-peer multiplayer session (absent in single player). */
  mp?: import('./mp').MPInfo | null;
  /** Messages for other players, flushed by the network bridge. */
  mpOutbox?: import('./mp').MPMsg[];
  /** World tension 0..100 (DEFCON 5 -> 1). Covert operations raise it; treaties and time lower it. */
  tension?: number;
  /** Phase C1: the report shown after each new year. */
  yearReport?: YearReport | null;
  /** Phase C5: the building type last placed, repeated with the R key. */
  lastBuilt?: BuildingId | null;
  /** World firsts ("first to reach a PetaFLOP"): who claimed each one, and when. */
  firsts?: Record<string, { who: string; year: number }>;
  /** Multiplayer room chat. */
  chat?: Array<{ from: string; text: string; year: number }>;
  playerLaunchReady: boolean;

  // Messaging
  notifications: Notification[];
  log: LogEntry[];
  objectives: Objective[];
  warnings: ForecastWarning[];
  crisis: { kind: 'approval' | 'famine' | 'bankrupt'; years: number } | null;

  // UI
  paused: boolean;
  speed: number;
  overlay: string | null;

  // Stats / outcome
  gameOverReason: string;
  outcome: 'safe_asi' | 'rival_asi' | 'rogue_rival' | 'rogue_self' | 'climate' | 'revolution' | 'bankrupt' | 'timeout' | 'governance' | 'silicon' | 'custodian' | null;
  victoryYear: number;
  totalBuildings: number;
  totalTechs: number;
  peakCapability: number;

  // Phase B: doctrines, alternative victories, total mobilisation (all optional so older saves load)
  /** One-time doctrine forks chosen so far: research_model | compute_arch | model_policy | safety_path -> option a | b. */
  doctrines?: Record<string, 'a' | 'b'>;
  /** Total mobilisation decree is in force (from 2010). */
  mobilised?: boolean;
  /** Mobilisation cannot be toggled again before this year. */
  mobiliseLockUntil?: number;
  /** The player has put an AI Control Treaty on the agenda of the next World Assembly. */
  aiControlProposed?: boolean;
  /** Year of the next World Assembly (every 4 years from 1995). */
  assemblyNext?: number;
  /** Consecutive years with a chip share of at least 60% of the world estimate. */
  siliconYears?: number;

  // Phases D & E (all optional so older saves load)
  /** D1: strategic zones (host-authoritative in multiplayer). */
  zones?: Record<ZoneId, ZoneState>;
  /** D2: one-per-world national projects ("wonders"). */
  projects?: Record<ProjectId, ProjectState>;
  /** E1: story flags set by event choices -> year they were set. */
  flags?: Record<string, number>;
  /** E2: hired and lost (poached) scientists. */
  talent?: TalentState;

  // Phase H (optional so older saves load)
  /** H3: game modifiers chosen before the game (absent = all neutral). */
  mods?: GameMods;
  /** H1: scenario this game started from. */
  scenario?: string;
  /** H2: daily/weekly challenge this game belongs to, e.g. 'daily-2026-10-20'. */
  challenge?: string;

  // Phase G (optional so older saves load)
  /** G4: deals proposed to or by this player. */
  deals?: import('./deals').Deal[];
  /** G4: non-aggression pacts in force (breaking one pays the penalty to the victim). */
  pacts?: import('./deals').PactRecord[];
}

/** H3: pre-game modifiers. Every field is optional; absent = neutral. */
export interface GameMods {
  /** Rival covert aggression multiplier (0.5 calm … 1.5 hostile). */
  aiAggression?: number;
  /** History speed multiplier on years per tick (0.75 slow … 1.5 fast). */
  pace?: number;
  /** Dynamic (non-historical) events switched off. */
  noDynamicEvents?: boolean;
  /** Planet damage from emissions ×1.5. */
  fragilePlanet?: boolean;
  /** Coal plants cannot be built. */
  noCoal?: boolean;
  /** Chip market price multiplier (e.g. 3 = "chips at triple price"). */
  chipPrice?: number;
}

// ─── Phases D & E ──────────────────────────────────────────────────────────
export type ZoneId = 'taiwan' | 'gulf' | 'arctic' | 'congo' | 'suez' | 'orbit';
/** Influence per bloc id (player = playerContinent / mp.me, rivals by id), 0..100. Holder: >= 40 and >= 10 above anyone else. */
export interface ZoneState { influence: Record<string, number>; holder: string | null }

export type ProjectId = 'apollo' | 'satnet' | 'fab1nm' | 'align_inst' | 'smart_city';
export interface ProjectState {
  /** Stages completed (0..3) per bloc id. */
  stages: Record<string, number>;
  /** Year the stage under construction completes, per bloc id (absent = idle). */
  busyUntil: Record<string, number>;
  /** First bloc to complete stage 3 (null until then) and the year it did. */
  owner: string | null;
  year: number | null;
}

export type ScientistField = 'compute' | 'research' | 'alignment' | 'chips' | 'economy' | 'covert';
export interface TalentState { hired: string[]; lost: string[] }

/** Outcomes that end the game as a win (shared or alone). */
export function isVictory(o: GameState['outcome']): boolean {
  return o === 'safe_asi' || o === 'governance' || o === 'silicon' || o === 'custodian';
}
