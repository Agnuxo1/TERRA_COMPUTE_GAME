// Core types of the Terra Compute strategy engine.
// Everything here is plain data so the engine can run headless (tests, balance sims).

export type GameMode = 'pioneer' | 'strategist' | 'complete' | 'logic';
export type Screen = 'title' | 'mode' | 'select' | 'game' | 'logic' | 'gameover' | 'victory';

export type Terrain = 'water' | 'plains' | 'fertile' | 'forest' | 'hills' | 'desert' | 'tundra';
export type Deposit = 'coal' | 'uranium' | 'silicon';

export type BuildingId =
  | 'housing' | 'farm' | 'hospital' | 'school' | 'uni'
  | 'factory' | 'market' | 'seaport'
  | 'coal' | 'nuclear' | 'solar' | 'fusion'
  | 'lab' | 'mainframe' | 'super' | 'datacenter' | 'gpucluster' | 'aifactory'
  | 'chipfab' | 'defense' | 'robot' | 'satellite';

export type BuildingCategory = 'people' | 'economy' | 'energy' | 'science' | 'compute' | 'safety';

export type Difficulty = 'easy' | 'normal' | 'hard';

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
  outcome: 'safe_asi' | 'rival_asi' | 'rogue_rival' | 'rogue_self' | 'climate' | 'revolution' | 'bankrupt' | 'timeout' | null;
  victoryYear: number;
  totalBuildings: number;
  totalTechs: number;
  peakCapability: number;
}
