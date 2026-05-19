import { createContext, useContext, useReducer } from 'react';
import TitleScreen from './pages/TitleScreen';
import ModeSelect from './pages/ModeSelect';
import ContinentSelect from './pages/ContinentSelect';
import GameScreen from './pages/GameScreen';
import GameOverScreen from './pages/GameOverScreen';
import VictoryScreen from './pages/VictoryScreen';

// ═══════════════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type AIStrategy = 'aggressive' | 'economic' | 'tech' | 'balanced' | 'defensive';

export interface ContinentData {
  id: string; name: string; color: string;
  gdp1960: number; energy1960: number; techLevel: number;
  solarPotential: number; description: string;
  specialBonus: string;
  basePopulation: number; // starting population in millions
}

export interface BuildingData {
  id: string; name: string; cost: number;
  energyUse: number; energyProduce: number; compute: number;
  yearRequired: number; description: string;
  icon: string; category: string;
  // New economy fields
  workersNeeded: number;
  workersProvided: number;
  output: string;
  outputAmount: number;
}

export interface TechData {
  id: string; name: string; year: number;
  era: string; effect: string; computeBonus: number;
  description: string;
  rpCost: number; // Research Points cost
}

export interface EventData {
  id: string; name: string; year: number;
  description: string; type: 'info' | 'warning' | 'danger';
  gdp?: number; energy?: number; stability?: number;
  materials?: number; compute?: number;
  techBonus?: number;
  population?: number;
  education?: number;
  researchPoints?: number;
}

export interface AIOpponent {
  continentId: string;
  gdp: number;
  compute: number;
  population: number;
  workers: number;
  employed: number;
  unemployed: number;
  housing: number;
  food: number;
  foodProduction: number;
  energy: number;
  energyCapacity: number;
  education: number;
  researchPoints: number;
  researchers: number;
  stability: number;
  safety: number;
  defenseLevel: number;
  buildings: Array<{type: string; count: number}>;
  techs: string[];
  strategy: AIStrategy;
  lastAction: string;
  actionTimer: number;
}

export interface CyberAttack {
  from: string;
  target: string;
  type: 'cyber' | 'sabotage' | 'propaganda';
  damage: number;
  detected: boolean;
  year: number;
  id: string;
}

export interface SpyOperation {
  from: string;
  target: string;
  intel: string;
  year: number;
  id: string;
}

export interface GameState {
  screen: 'title' | 'mode' | 'select' | 'game' | 'gameover' | 'victory';
  gameMode: 'pioneer' | 'strategist' | 'complete' | null;
  year: number;
  tickCount: number;
  playerContinent: string | null;

  // Population & Workers (the foundation)
  population: number;
  workers: number;
  employed: number;
  unemployed: number;
  housing: number;
  food: number;
  foodProduction: number;
  foodConsumption: number;

  // Economy
  gdp: number;
  taxRate: number;
  industrialOutput: number;
  tradeRevenue: number;

  // Energy
  energy: number;
  energyDemand: number;
  energyCapacity: number;

  // Education & Research
  education: number;
  researchPoints: number;
  researchers: number;

  // Compute
  compute: number;
  computeCapacity: number;
  algorithmicEfficiency: number;

  // Materials
  materials: number;
  materialProduction: number;

  // Stability & Safety
  stability: number;
  safety: number;
  defenseLevel: number;

  // Buildings
  buildings: Array<{type: string; count: number}>;
  buildingIcons: Array<{type: string; territory: string; x: number; y: number}>;

  // Tech
  unlockedTechs: string[];
  availableTechs: string[];
  techQueue: string | null;
  techProgress: number;

  // Events
  firedEvents: string[];
  showEvent: string | null;
  notifications: Array<{id: string; text: string; type: string; time: number}>;

  // AI
  opponents: AIOpponent[];
  aiLog: Array<{id: string; continent: string; action: string; year: number}>;

  // Combat / Espionage
  cyberAttacks: CyberAttack[];
  spyOperations: SpyOperation[];

  // UI
  paused: boolean;
  speed: number;
  overlay: string | null;
  selectedTerritory: string | null;

  // Win/Lose
  gameOverReason: string;
  victoryYear: number;
  totalBuildings: number;
  totalTechs: number;
  data: number;

  // ═══ PHASE SYSTEM ═══
  phase: number; // 1-6
  phaseUnlocked: boolean[]; // which phases have been unlocked/notified

  // ═══ POLITICAL STATE ═══
  emergencyLock: number; // ticks remaining for emergency building lock

  // ═══ ENERGY STABILITY COUNTER ═══
  energyStableTicks: number; // consecutive ticks with energy ratio > 0.8

  // ═══ DEATH WARNING SYSTEM ═══
  deathWarning: {type: string; ticksLeft: number; solution: string} | null;

  // ═══ COMPUTE MILESTONES ═══
  computeMilestones: string[]; // IDs of milestones already reached

  // ═══ SAFETY ALERTS ═══
  safetyAlertsFired: string[]; // continentIds that have already triggered global safety alerts
}

export type Action =
  | {type: 'SET_MODE'; mode: 'pioneer' | 'strategist' | 'complete'}
  | {type: 'START_GAME'; continentId: string}
  | {type: 'TICK'}
  | {type: 'BUILD'; buildingId: string}
  | {type: 'MOVE_BUILDING_ICON'; index: number; x: number; y: number}
  | {type: 'RESEARCH'; techId: string}
  | {type: 'SET_SPEED'; speed: number}
  | {type: 'TOGGLE_PAUSE'}
  | {type: 'OPEN_OVERLAY'; overlay: string}
  | {type: 'CLOSE_OVERLAY'}
  | {type: 'SELECT_TERRITORY'; territory: string}
  | {type: 'DISMISS_EVENT'}
  | {type: 'DISMISS_NOTIFICATION'; id: string}
  | {type: 'SET_SCREEN'; screen: GameState['screen']}
  | {type: 'GAME_OVER'; reason: string}
  | {type: 'CYBER_ATTACK'; target: string; attackType: 'cyber' | 'sabotage' | 'propaganda'}
  | {type: 'SPY_MISSION'; target: string};

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME DATA
// ═══════════════════════════════════════════════════════════════════════════════

export const continents: ContinentData[] = [
  {id:'na', name:'North America', color:'#3B82F6', gdp1960:2700, energy1960:2800, techLevel:8, solarPotential:0.6, description:'Economic powerhouse with advanced universities and strong industry.', specialBonus:'+30% Research Speed', basePopulation:180},
  {id:'eu', name:'Europe', color:'#6366F1', gdp1960:1750, energy1960:1600, techLevel:8, solarPotential:0.5, description:'High tech base with strong research institutions.', specialBonus:'+20% Tech Transfer', basePopulation:420},
  {id:'su', name:'Soviet Union', color:'#EF4444', gdp1960:1250, energy1960:1200, techLevel:5, solarPotential:0.2, description:'Massive resources and heavy industry.', specialBonus:'+40% Resource Extraction', basePopulation:210},
  {id:'cn', name:'China', color:'#F97316', gdp1960:450, energy1960:800, techLevel:3, solarPotential:0.4, description:'Huge population with growing industrial base.', specialBonus:'+50% Population Growth', basePopulation:660},
  {id:'af', name:'Africa', color:'#22C55E', gdp1960:400, energy1960:200, techLevel:1, solarPotential:0.8, description:'Vast solar potential and untapped resources.', specialBonus:'+60% Solar Potential', basePopulation:280},
  {id:'sa', name:'South America', color:'#14B8A6', gdp1960:500, energy1960:450, techLevel:3, solarPotential:0.6, description:'Rich in natural resources and renewable energy.', specialBonus:'+25% Renewables', basePopulation:150},
  {id:'in', name:'India', color:'#EAB308', gdp1960:275, energy1960:150, techLevel:2, solarPotential:0.7, description:'Large educated workforce and growing tech sector.', specialBonus:'+40% Labor Force', basePopulation:450},
  {id:'oc', name:'Oceania', color:'#06B6D4', gdp1960:250, energy1960:60, techLevel:5, solarPotential:0.9, description:'Isolated but rich in uranium and solar.', specialBonus:'+15% Uranium, Defensive', basePopulation:15},
];

export const buildings: BuildingData[] = [
  // Population and worker values are in millions of people. Money is available public budget in $B.
  {id:'housing', name:'Housing District', cost:90, energyUse:4, energyProduce:0, compute:0, yearRequired:1960, description:'Regional housing program. Adds capacity for 25M people.', icon:'🏘️', category:'population', workersNeeded:0, workersProvided:25, output:'housing', outputAmount:25},
  {id:'farm', name:'Farm Belt', cost:75, energyUse:3, energyProduce:0, compute:0, yearRequired:1960, description:'Large agricultural zone. Feeds roughly 35M people.', icon:'🌾', category:'population', workersNeeded:2, workersProvided:0, output:'food', outputAmount:35},
  {id:'hospital', name:'Hospital Network', cost:120, energyUse:12, energyProduce:0, compute:0, yearRequired:1965, description:'Regional healthcare system. Improves growth and stability.', icon:'🏥', category:'population', workersNeeded:1.2, workersProvided:0, output:'health', outputAmount:5},

  // ─── Economy ───
  {id:'factory', name:'Industrial Zone', cost:140, energyUse:18, energyProduce:0, compute:0, yearRequired:1960, description:'Creates millions of industrial jobs and budget income.', icon:'🏭', category:'economy', workersNeeded:6, workersProvided:0, output:'goods', outputAmount:70},
  {id:'market', name:'Market Network', cost:85, energyUse:5, energyProduce:0, compute:0, yearRequired:1960, description:'Domestic trade and services. Broadens the tax base.', icon:'🛒', category:'economy', workersNeeded:3, workersProvided:0, output:'trade', outputAmount:35},
  {id:'seaport', name:'Seaport Complex', cost:240, energyUse:25, energyProduce:0, compute:0, yearRequired:1970, description:'International trade corridor. Major budget boost.', icon:'⚓', category:'economy', workersNeeded:4, workersProvided:0, output:'trade', outputAmount:90},

  // ─── Education ───
  {id:'school', name:'School System', cost:70, energyUse:6, energyProduce:0, compute:0, yearRequired:1960, description:'National school expansion. Raises education over time.', icon:'📚', category:'education', workersNeeded:0.8, workersProvided:0, output:'education', outputAmount:10},
  {id:'uni', name:'University System', cost:180, energyUse:12, energyProduce:0, compute:1e7, yearRequired:1960, description:'Higher education and research pipeline. +10M FLOPS.', icon:'🎓', category:'education', workersNeeded:1.2, workersProvided:0, output:'researchers', outputAmount:5},

  // ─── Compute ───
  {id:'lab', name:'Research Lab Network', cost:95, energyUse:6, energyProduce:0, compute:1e6, yearRequired:1960, description:'Basic research infrastructure. +1M FLOPS.', icon:'🔬', category:'compute', workersNeeded:0.6, workersProvided:0, output:'compute', outputAmount:1e6},
  {id:'mainframe', name:'Mainframe Center', cost:260, energyUse:25, energyProduce:0, compute:1e9, yearRequired:1965, description:'Early computing center. +1B FLOPS.', icon:'💻', category:'compute', workersNeeded:0.8, workersProvided:0, output:'compute', outputAmount:1e9},
  {id:'super', name:'Supercomputer Program', cost:750, energyUse:120, energyProduce:0, compute:1e12, yearRequired:1975, description:'High-performance computing. +1T FLOPS.', icon:'🖥️', category:'compute', workersNeeded:1, workersProvided:0, output:'compute', outputAmount:1e12},
  {id:'datacenter', name:'Data Center Region', cost:2200, energyUse:650, energyProduce:0, compute:1e15, yearRequired:1995, description:'Cloud computing region. +1P FLOPS.', icon:'🗄️', category:'compute', workersNeeded:1.8, workersProvided:0, output:'compute', outputAmount:1e15},
  {id:'gpucluster', name:'GPU Cluster', cost:9500, energyUse:2600, energyProduce:0, compute:1e18, yearRequired:2010, description:'AI training cluster. +1E FLOPS.', icon:'⚡', category:'compute', workersNeeded:2.2, workersProvided:0, output:'compute', outputAmount:1e18},
  {id:'aifactory', name:'AI Factory', cost:42000, energyUse:12000, energyProduce:0, compute:1e21, yearRequired:2020, description:'Frontier AI training megaproject. +1Z FLOPS.', icon:'🤖', category:'compute', workersNeeded:3, workersProvided:0, output:'compute', outputAmount:1e21},

  // ─── Energy ───
  {id:'coal', name:'Coal Plant Fleet', cost:110, energyUse:0, energyProduce:500, compute:0, yearRequired:1960, description:'Cheap but dirty energy. +500 TWh.', icon:'🏭', category:'energy', workersNeeded:0.7, workersProvided:0, output:'energy', outputAmount:500},
  {id:'nuclear', name:'Nuclear Plant Fleet', cost:650, energyUse:0, energyProduce:1200, compute:0, yearRequired:1965, description:'Clean baseload energy. +1,200 TWh.', icon:'⚛️', category:'energy', workersNeeded:0.9, workersProvided:0, output:'energy', outputAmount:1200},
  {id:'solar', name:'Solar Farm Grid', cost:380, energyUse:0, energyProduce:650, compute:0, yearRequired:1975, description:'Renewable power grid. +650 TWh.', icon:'☀️', category:'energy', workersNeeded:0.4, workersProvided:0, output:'energy', outputAmount:650},

  // ─── Production ───
  {id:'chipfab', name:'Chip Fab Cluster', cost:3500, energyUse:300, energyProduce:0, compute:0, yearRequired:1975, description:'Semiconductor manufacturing cluster. +materials.', icon:'🔧', category:'production', workersNeeded:2.5, workersProvided:0, output:'materials', outputAmount:10},

  // ─── Defense ───
  {id:'defense', name:'AI Safety Grid', cost:900, energyUse:60, energyProduce:0, compute:0, yearRequired:1970, description:'Alignment labs, cyber defense and resilience. Raises AI safety immediately.', icon:'🛡️', category:'defense', workersNeeded:1.5, workersProvided:0, output:'defense', outputAmount:6},

  // ─── Telecommunications ───
  {id:'satellite', name:'Communications Satellite', cost:1800, energyUse:90, energyProduce:0, compute:1e12, yearRequired:1965, description:'Launch communications infrastructure. +5% data generation.', icon:'🛰️', category:'telecom', workersNeeded:0.5, workersProvided:0, output:'data', outputAmount:50},

  // ─── Automation (Phase 5) ───
  {id:'robot', name:'Humanoid Robot Program', cost:4500, energyUse:150, energyProduce:0, compute:1e15, yearRequired:2010, description:'Autonomous labor program. Replaces factory labor at scale.', icon:'🤖', category:'automation', workersNeeded:0.3, workersProvided:-2, output:'automation', outputAmount:2},
];

export const techs: TechData[] = [
  {id:'transistor', name:'Transistor', year:1960, era:'Silicon Dawn', effect:'+10% compute efficiency', computeBonus:0.1, description:'The foundation of modern electronics', rpCost:100},
  {id:'ic', name:'Integrated Circuits', year:1965, era:'Silicon Dawn', effect:'+25% compute efficiency', computeBonus:0.25, description:'Multiple transistors on a single chip', rpCost:300},
  {id:'micro', name:'Microprocessor', year:1970, era:'Silicon Dawn', effect:'+50% compute', computeBonus:0.5, description:'CPU on a single chip', rpCost:600},
  {id:'moore', name:"Moore's Law", year:1971, era:'Silicon Dawn', effect:'2x every 2 years', computeBonus:0.3, description:'Transistor density doubles biennially', rpCost:800},
  {id:'pc', name:'PC Revolution', year:1981, era:'Digital Age', effect:'+10% GDP', computeBonus:0.1, description:'Personal computers transform society', rpCost:1200},
  {id:'internet', name:'Internet', year:1983, era:'Digital Age', effect:'+100% data generation', computeBonus:0.2, description:'Global network of computers', rpCost:1500},
  {id:'web', name:'World Wide Web', year:1995, era:'Digital Age', effect:'+200% data', computeBonus:0.15, description:'Information at your fingertips', rpCost:2500},
  {id:'gpu', name:'GPU Computing', year:2006, era:'AI Era', effect:'Accelerated training', computeBonus:0.5, description:'Parallel processing for AI', rpCost:5000},
  {id:'dl', name:'Deep Learning', year:2012, era:'AI Era', effect:'Neural networks', computeBonus:1.0, description:'Multi-layer neural networks', rpCost:8000},
  {id:'transformer', name:'Transformer', year:2017, era:'AI Era', effect:'x10 compute efficiency', computeBonus:1.0, description:'Attention is all you need', rpCost:12000},
  {id:'gpt3', name:'GPT-3 Scale', year:2020, era:'AI Era', effect:'Massive scaling', computeBonus:1.5, description:'175B parameter language model', rpCost:20000},
  {id:'agentic', name:'Agentic AI', year:2025, era:'Intelligence Explosion', effect:'Automation', computeBonus:2.0, description:'AI that can take actions', rpCost:50000},
  {id:'agi', name:'AGI Candidate', year:2028, era:'Intelligence Explosion', effect:'General intelligence', computeBonus:3.0, description:'Artificial General Intelligence', rpCost:100000},
  {id:'asi', name:'Safe ASI', year:2035, era:'Singularity', effect:'Superintelligence', computeBonus:5.0, description:'Aligned Artificial Superintelligence', rpCost:250000},
];

export const events: EventData[] = [
  {id:'oil1973', name:'1973 Oil Crisis', year:1973, description:'OPEC embargo quadruples oil prices.', type:'danger', gdp:-0.05, energy:-200},
  {id:'coldwar91', name:'End of Cold War', year:1991, description:'Soviet collapse. Tech sharing increases.', type:'info', gdp:0.03, techBonus:0.5},
  {id:'dotcom', name:'Dot-com Crash', year:2000, description:'Internet bubble bursts.', type:'danger', gdp:-0.15},
  {id:'sep11', name:'September 11', year:2001, description:'Terror attacks. Defense prioritized.', type:'danger', stability:-10},
  {id:'chinaWTO', name:'China Joins WTO', year:2001, description:'China enters global trade.', type:'info', gdp:0.05},
  {id:'crisis08', name:'2008 Financial Crisis', year:2008, description:'Global recession.', type:'danger', gdp:-0.2},
  {id:'covid', name:'COVID-19 Pandemic', year:2020, description:'Pandemic drives compute demand.', type:'warning', gdp:-0.1, compute:0.3},
  {id:'ukraine', name:'Ukraine War', year:2022, description:'Energy crisis in Europe.', type:'danger', energy:-300},
  {id:'chipwar', name:'Chip War', year:2022, description:'US-China chip tensions.', type:'warning', materials:-50},
  {id:'aiboom', name:'AI Investment Boom', year:2023, description:'Massive AI investment surge.', type:'info', gdp:0.1, compute:0.5},
  {id:'foodcrisis', name:'Global Food Crisis', year:1974, description:'Famine conditions in developing nations.', type:'danger', population:-0.02, stability:-5},
  {id:'greenrev', name:'Green Revolution', year:1967, description:'Agricultural advances boost food production.', type:'info', population:0.05},
  {id:'pandemic', name:'Swine Flu', year:2009, description:'Global pandemic fears.', type:'warning', stability:-3, population:-0.01},
  {id:'quantum', name:'Quantum Computing', year:2025, description:'Quantum advantage achieved.', type:'info', compute:0.4},
  // ═══ MILESTONES IN AI HISTORY ═══
  {id:'turing', name:'The Turing Test', year:1950, description:'Alan Turing publishes "Computing Machinery and Intelligence" and proposes the Imitation Game - the first practical test to measure if a machine can think like a human.', type:'info', education:5},
  {id:'dartmouth', name:'Birth of AI', year:1956, description:'John McCarthy, Marvin Minsky and others organize the Dartmouth Conference, where the term "Artificial Intelligence" is coined.', type:'info', education:5, researchPoints:100},
  {id:'perceptron', name:'The Perceptron', year:1957, description:'Frank Rosenblatt creates the Perceptron, the first artificial neural network capable of learning patterns through trial and error.', type:'info', compute:0.05},
  {id:'lisp', name:'LISP', year:1958, description:'John McCarthy invents LISP, the first programming language designed specifically for AI research (still used today).', type:'info', researchPoints:50},
  {id:'ml', name:'Machine Learning', year:1959, description:'Arthur Samuel coins the term "Machine Learning" by creating a checkers program that improves by playing against itself.', type:'info', education:3},
  {id:'moore', name:"Moore's Law", year:1965, description:'Gordon Moore predicts the number of transistors on a chip will double approximately every two years, driving the hardware needed for AI.', type:'info', compute:0.1},
  {id:'eliza', name:'ELIZA', year:1966, description:'Joseph Weizenbaum creates ELIZA, the first chatbot that simulates therapeutic conversation, surprising everyone with how humans attribute intelligence to it.', type:'info', researchPoints:30},
  {id:'aiwinter1', name:'AI Winters', year:1975, description:'Period of disappointment and funding cuts after expectations were too high (~1974-1980). AI research slows but does not stop.', type:'warning', gdp:-0.02, researchPoints:-50},
  {id:'expert', name:'Expert Systems', year:1983, description:'Boom of rule-based systems (e.g. MYCIN for medical diagnosis). Second AI winter at the end of the 80s.', type:'info', researchPoints:80},
  {id:'auto86', name:'Autonomous Vehicle', year:1986, description:'Ernst Dickmanns develops the first functional autonomous vehicle in Germany - a van driving on the autobahn without a driver.', type:'info', gdp:0.02},
  {id:'deepblue', name:'Deep Blue Defeats Kasparov', year:1997, description:'IBM\'s Deep Blue supercomputer defeats world chess champion Garry Kasparov - the first time a machine beats a reigning champion.', type:'info', compute:0.1, researchPoints:200},
  {id:'watson', name:'Watson Wins Jeopardy!', year:2011, description:'IBM Watson defeats human champions on the Jeopardy! quiz show, demonstrating natural language understanding at scale.', type:'info', compute:0.15, researchPoints:300},
  {id:'alexnet', name:'Deep Learning Revolution', year:2012, description:'AlexNet (convolutional neural network) wins the ImageNet competition by a wide margin and revives deep learning.', type:'info', compute:0.2, researchPoints:500},
  {id:'alphago', name:'AlphaGo Defeats Lee Sedol', year:2016, description:'Google DeepMind defeats world Go champion Lee Sedol - a game far more complex than chess. Move 37 becomes legendary.', type:'info', compute:0.3, researchPoints:800},
  {id:'transformers', name:'Transformers', year:2017, description:'"Attention Is All You Need" introduces the Transformer architecture, the foundation of nearly all modern language models (LLMs).', type:'info', compute:0.4, researchPoints:1000},
  {id:'gpt3', name:'GPT-3: 175B Parameters', year:2020, description:'OpenAI launches GPT-3, demonstrating few-shot learning capabilities and generating coherent text at massive scale.', type:'info', compute:0.5, researchPoints:1500},
  {id:'chatgpt', name:'ChatGPT: The World Changes', year:2022, description:'Public launch of ChatGPT (based on GPT-3.5) in November. The moment generative AI reached millions of people worldwide.', type:'info', compute:0.8, gdp:0.05},
  {id:'multimodal', name:'The AGI Race', year:2024, description:'GPT-4, Claude 3, Gemini, Grok, Llama... Models handling text, image, audio and video. The race for AGI begins.', type:'info', compute:1.0, gdp:0.03},
  {id:'agents', name:'AI Agents', year:2025, description:'Emergence of agentic systems that plan and execute complex tasks autonomously. Advances in humanoid robotics.', type:'info', compute:1.5, researchPoints:3000},
  {id:'agentic', name:'Agentic AI Era', year:2026, description:'Models with giant context windows, native multimodal reasoning, code execution tools. AI driving scientific breakthroughs.', type:'info', compute:2.0, gdp:0.05},
  {id:'beyondmoore', name:'Beyond Moore\'s Law', year:2027, description:'AI compute grows faster than Moore\'s Law - doubling every ~6 months thanks to GPUs, TPUs, specialized hardware and optimizations.', type:'info', compute:3.0},
];

export const strategies: AIStrategy[] = ['aggressive', 'economic', 'tech', 'balanced', 'defensive'];

export const territoryPositions: Record<string, {x: number; y: number}> = {
  'na_alaska': {x:75,y:72}, 'na_nwt': {x:137,y:69}, 'na_greenland': {x:240,y:47},
  'na_alberta': {x:125,y:112}, 'na_ontario': {x:192,y:103}, 'na_quebec': {x:248,y:114},
  'na_western_us': {x:127,y:150}, 'na_eastern_us': {x:197,y:155}, 'na_central_america': {x:127,y:195},
  'sa_venezuela': {x:220,y:240}, 'sa_brazil': {x:240,y:290}, 'sa_peru': {x:195,y:285}, 'sa_argentina': {x:225,y:360},
  'eu_iceland': {x:340,y:55}, 'eu_great_britain': {x:360,y:95}, 'eu_scandinavia': {x:410,y:60},
  'eu_northern_eu': {x:400,y:100}, 'eu_ukraine': {x:455,y:95}, 'eu_southern_eu': {x:420,y:135}, 'eu_western_eu': {x:370,y:125},
  'af_north': {x:380,y:200}, 'af_egypt': {x:430,y:185}, 'af_east': {x:470,y:250},
  'af_congo': {x:420,y:275}, 'af_south': {x:430,y:370}, 'af_madagascar': {x:490,y:370},
  'as_ural': {x:510,y:65}, 'as_siberia': {x:580,y:55}, 'as_yakutsk': {x:660,y:45},
  'as_kamchatka': {x:780,y:55}, 'as_irkutsk': {x:620,y:90}, 'as_mongolia': {x:650,y:120},
  'as_japan': {x:780,y:130}, 'as_afghanistan': {x:540,y:145}, 'as_china': {x:660,y:160},
  'as_middle_east': {x:490,y:180}, 'as_india': {x:600,y:210}, 'as_siam': {x:680,y:230},
  'au_indonesia': {x:720,y:320}, 'au_new_guinea': {x:780,y:280}, 'au_western': {x:750,y:380}, 'au_eastern': {x:800,y:360},
};

export const territoryContinents: Record<string, string> = {
  na_alaska: 'na', na_nwt: 'na', na_greenland: 'na', na_alberta: 'na', na_ontario: 'na', na_quebec: 'na',
  na_western_us: 'na', na_eastern_us: 'na', na_central_america: 'na',
  sa_venezuela: 'sa', sa_brazil: 'sa', sa_peru: 'sa', sa_argentina: 'sa',
  eu_iceland: 'eu', eu_great_britain: 'eu', eu_scandinavia: 'eu', eu_northern_eu: 'eu', eu_ukraine: 'eu',
  eu_southern_eu: 'eu', eu_western_eu: 'eu',
  af_north: 'af', af_egypt: 'af', af_east: 'af', af_congo: 'af', af_south: 'af', af_madagascar: 'af',
  as_ural: 'su', as_siberia: 'su', as_yakutsk: 'su', as_kamchatka: 'su', as_irkutsk: 'su',
  as_afghanistan: 'su', as_middle_east: 'su',
  as_mongolia: 'cn', as_japan: 'cn', as_china: 'cn', as_siam: 'cn',
  as_india: 'in',
  au_indonesia: 'oc', au_new_guinea: 'oc', au_western: 'oc', au_eastern: 'oc',
};

function getTerritoriesForContinent(continentId: string): string[] {
  return Object.keys(territoryPositions).filter(id => territoryContinents[id] === continentId);
}

function getBuildTerritory(state: GameState): string {
  const playerTerritories = getTerritoriesForContinent(state.playerContinent || '');
  if (
    state.selectedTerritory &&
    playerTerritories.includes(state.selectedTerritory)
  ) {
    return state.selectedTerritory;
  }
  const pool = playerTerritories.length > 0 ? playerTerritories : Object.keys(territoryPositions);
  return pool[Math.floor(Math.random() * pool.length)];
}

function makeBuildingIcon(type: string, territory: string, jitter = 14): {type: string; territory: string; x: number; y: number} {
  const pos = territoryPositions[territory] || { x: 380, y: 225 };
  return {
    type,
    territory,
    x: pos.x + (Math.random() - 0.5) * jitter,
    y: pos.y + (Math.random() - 0.5) * jitter,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AI OPPONENT INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function getStrategyForContinent(id: string): AIStrategy {
  const map: Record<string, AIStrategy> = {
    na: 'tech', eu: 'tech', su: 'aggressive', cn: 'economic',
    af: 'balanced', sa: 'economic', in: 'balanced', oc: 'defensive',
  };
  return map[id] || 'balanced';
}

function createOpponents(playerContinentId: string): AIOpponent[] {
  return continents
    .filter(c => c.id !== playerContinentId)
    .map(c => ({
      continentId: c.id,
      gdp: c.gdp1960 * 0.30 + 120,
      compute: 1e6,
      population: c.basePopulation,
      workers: c.basePopulation * 0.45,
      employed: c.basePopulation * 0.32,
      unemployed: c.basePopulation * 0.13,
      housing: c.basePopulation * 0.85,
      food: c.basePopulation * 1.5,
      foodProduction: c.basePopulation * 0.75,
      energy: c.energy1960,
      energyCapacity: c.energy1960,
      education: 20,
      researchPoints: 0,
      researchers: 0,
      stability: 75,
      safety: 40,
      defenseLevel: 10,
      buildings: [],
      techs: [],
      strategy: getStrategyForContinent(c.id),
      lastAction: '',
      actionTimer: 0,
    }));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getBuildingDef(id: string): BuildingData | undefined {
  return buildings.find(b => b.id === id);
}

export function getScaledBuildingCost(buildingId: string, ownedCount: number = 0): number {
  const b = getBuildingDef(buildingId);
  if (!b) return Infinity;
  const rate =
    b.category === 'compute' ? 0.16 :
    b.category === 'population' || b.category === 'energy' ? 0.055 :
    0.09;
  return Math.ceil(b.cost * Math.pow(1 + rate, ownedCount));
}

function countBuildings(buildings: Array<{type: string; count: number}>, type: string): number {
  return buildings.find(b => b.type === type)?.count || 0;
}

function calcBuildingEnergyDemand(buildings: Array<{type: string; count: number}>): number {
  let demand = 0;
  for (const b of buildings) {
    const def = getBuildingDef(b.type);
    if (def) demand += def.energyUse * b.count;
  }
  return demand;
}

function calcBuildingEnergyProd(buildings: Array<{type: string; count: number}>): number {
  let prod = 0;
  for (const b of buildings) {
    const def = getBuildingDef(b.type);
    if (def) prod += def.energyProduce * b.count;
  }
  return prod;
}

function calcBuildingWorkersNeeded(buildings: Array<{type: string; count: number}>): number {
  let total = 0;
  for (const b of buildings) {
    const def = getBuildingDef(b.type);
    if (def) total += def.workersNeeded * b.count;
  }
  return total;
}

function calcBuildingWorkersProvided(buildings: Array<{type: string; count: number}>): number {
  let total = 0;
  for (const b of buildings) {
    const def = getBuildingDef(b.type);
    if (def) total += def.workersProvided * b.count;
  }
  return total;
}

function calcComputeRaw(buildings: Array<{type: string; count: number}>): number {
  let total = 0;
  for (const b of buildings) {
    const def = getBuildingDef(b.type);
    if (def) total += def.compute * b.count;
  }
  return total;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

function getPhaseName(phase: number): string {
  const names = [
    '',
    'Agrarian Society',
    'Industrial Revolution',
    'Knowledge Economy',
    'Digital Age',
    'AI Era',
    'Singularity',
  ];
  return names[phase] || 'Unknown';
}

function getPhaseBuildings(phase: number): string[] {
  switch (phase) {
    case 1: // Agrarian (1960-1972)
      return ['housing', 'farm', 'hospital', 'school', 'coal'];
    case 2: // Industrial (1972-1985)
      return ['housing', 'farm', 'hospital', 'school', 'coal', 'factory', 'market', 'seaport', 'nuclear', 'lab', 'mainframe'];
    case 3: // Knowledge (1985-2000)
      return ['housing', 'farm', 'hospital', 'school', 'coal', 'factory', 'market', 'seaport', 'nuclear', 'lab', 'mainframe', 'uni', 'super', 'solar', 'chipfab'];
    case 4: // Digital (2000-2010)
      return ['housing', 'farm', 'hospital', 'school', 'coal', 'factory', 'market', 'seaport', 'nuclear', 'lab', 'mainframe', 'uni', 'super', 'solar', 'chipfab', 'datacenter'];
    case 5: // AI Era (2010-2025)
      return ['housing', 'farm', 'hospital', 'school', 'coal', 'factory', 'market', 'seaport', 'nuclear', 'lab', 'mainframe', 'uni', 'super', 'solar', 'chipfab', 'datacenter', 'gpucluster', 'aifactory', 'defense', 'robot'];
    case 6: // Singularity (2025-2035)
      return ['housing', 'farm', 'hospital', 'school', 'coal', 'factory', 'market', 'seaport', 'nuclear', 'lab', 'mainframe', 'uni', 'super', 'solar', 'chipfab', 'datacenter', 'gpucluster', 'aifactory', 'defense', 'robot', 'satellite'];
    default:
      return ['housing', 'farm', 'hospital', 'school', 'coal'];
  }
}

function canBuildInPhase(buildingId: string, phase: number): boolean {
  return getPhaseBuildings(phase).includes(buildingId);
}

function checkPhaseTransition(s: GameState): { newPhase: number; notifications: Array<{id: string; text: string; type: string; time: number}> } {
  let phase = s.phase;
  const notifications: Array<{id: string; text: string; type: string; time: number}> = [];

  // Phase 2: education >= 15 AND energy stable >= 3 ticks
  if (phase === 1 && s.education >= 15 && s.energyStableTicks >= 3) {
    phase = 2;
  }
  // Phase 3: education >= 40
  else if (phase === 2 && s.education >= 40) {
    phase = 3;
  }
  // Phase 4: compute >= 1e12
  else if (phase === 3 && s.compute >= 1e12) {
    phase = 4;
  }
  // Phase 5: compute >= 1e15
  else if (phase === 4 && s.compute >= 1e15) {
    phase = 5;
  }
  // Phase 6: compute >= 1e18
  else if (phase === 5 && s.compute >= 1e18) {
    phase = 6;
  }

  if (phase !== s.phase && !s.phaseUnlocked[phase]) {
    notifications.push({
      id: `phase-${phase}-${Date.now()}`,
      text: `Phase ${phase} unlocked: ${getPhaseName(phase)}!`,
      type: 'info',
      time: Date.now(),
    });
  }

  return { newPhase: phase, notifications };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  POLITICAL STATE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

function getPoliticalState(stability: number): { name: string; workerEfficiency: number; gdpPenalty: number; canBuild: boolean } {
  if (stability >= 80) {
    return { name: 'Stable Democracy', workerEfficiency: 1.0, gdpPenalty: 0, canBuild: true };
  } else if (stability >= 60) {
    return { name: 'Social Tensions', workerEfficiency: 0.95, gdpPenalty: 0, canBuild: true };
  } else if (stability >= 40) {
    return { name: 'Active Protests', workerEfficiency: 0.90, gdpPenalty: -0.10, canBuild: true };
  } else if (stability >= 20) {
    return { name: 'State of Emergency', workerEfficiency: 1.0, gdpPenalty: 0, canBuild: false };
  } else {
    return { name: 'Collapse Imminent', workerEfficiency: 0.70, gdpPenalty: -0.30, canBuild: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPUTE MILESTONES
// ═══════════════════════════════════════════════════════════════════════════════

const COMPUTE_MILESTONES: Array<{threshold: number; id: string; message: string}> = [
  { threshold: 1e6, id: 'm1', message: 'First Million FLOPS - Your lab now rivals early mainframes' },
  { threshold: 1e9, id: 'm2', message: 'GigaFLOP Milestone - More power than the Cray-1 (1976)' },
  { threshold: 1e12, id: 'm3', message: 'TeraFLOP Milestone - Entry to the supercomputing era' },
  { threshold: 1e15, id: 'm4', message: 'PetaFLOP Milestone - GPU clusters are changing everything' },
  { threshold: 1e18, id: 'm5', message: 'ExaFLOP Milestone - The threshold of human brain simulation' },
  { threshold: 1e21, id: 'm6', message: 'ZettaFLOP Milestone - AI Factories running at full capacity' },
  { threshold: 1e24, id: 'm7', message: 'YottaFLOP Milestone - The doorstep of superintelligence' },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  DIFFICULTY SYSTEM - progressive difficulty scaling toward 2035
// ═══════════════════════════════════════════════════════════════════════════════

function getDifficulty(year: number): number {
  // Difficulty ramps up as we approach 2035 - the critical year
  // 1960: 0.3 (easy) → 2000: 0.6 (medium) → 2020: 1.0 (hard) → 2030: 1.5 (very hard) → 2035+: 2.0 (extreme)
  if (year < 1980) return 0.3;
  if (year < 1990) return 0.4;
  if (year < 2000) return 0.6;
  if (year < 2010) return 0.75;
  if (year < 2020) return 1.0;
  if (year < 2030) return 1.5;
  if (year < 2035) return 1.8;
  return 2.0;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AI SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

function aiChooseBuildings(opp: AIOpponent, year: number): string[] {
  const weights: Record<string, number> = {};

  // Base weights by strategy
  const baseWeights: Record<AIStrategy, Record<string, number>> = {
    aggressive: {
      housing: 0.5, farm: 0.5, hospital: 0.3, factory: 1, market: 1, seaport: 0.8,
      school: 0.5, uni: 0.5, lab: 2, mainframe: 2, super: 2, datacenter: 2, gpucluster: 3, aifactory: 3,
      coal: 1, nuclear: 1, solar: 0.5, chipfab: 1, defense: 0.5,
    },
    economic: {
      housing: 1, farm: 1, hospital: 0.5, factory: 3, market: 3, seaport: 3,
      school: 0.5, uni: 0.5, lab: 0.5, mainframe: 0.5, super: 0.5, datacenter: 1, gpucluster: 0.5, aifactory: 0.5,
      coal: 2, nuclear: 1, solar: 1, chipfab: 1, defense: 1,
    },
    tech: {
      housing: 0.5, farm: 0.5, hospital: 0.5, factory: 0.5, market: 0.5, seaport: 0.5,
      school: 2, uni: 3, lab: 3, mainframe: 2, super: 2, datacenter: 2, gpucluster: 2, aifactory: 1,
      coal: 1, nuclear: 1.5, solar: 0.5, chipfab: 1, defense: 1,
    },
    balanced: {
      housing: 1, farm: 1, hospital: 0.5, factory: 1, market: 1, seaport: 1,
      school: 1, uni: 1, lab: 1, mainframe: 1, super: 1, datacenter: 1, gpucluster: 1, aifactory: 1,
      coal: 1, nuclear: 1, solar: 1, chipfab: 1, defense: 1,
    },
    defensive: {
      housing: 1, farm: 1, hospital: 1, factory: 1, market: 1, seaport: 0.5,
      school: 1, uni: 1, lab: 1, mainframe: 0.5, super: 0.5, datacenter: 1, gpucluster: 0.5, aifactory: 0.5,
      coal: 1.5, nuclear: 1, solar: 1, chipfab: 0.5, defense: 4,
    },
  };

  const bw = baseWeights[opp.strategy] || baseWeights.balanced;

  // Adjust based on needs
  const energyDemand = calcBuildingEnergyDemand(opp.buildings);
  const energyProd = calcBuildingEnergyProd(opp.buildings);
  const energyDeficit = energyDemand - energyProd;

  // Need more energy?
  if (energyDeficit > 0) {
    bw.coal += 3;
    bw.nuclear += 2;
    bw.solar += 1;
  }

  // Need more workers/housing?
  if (opp.population > opp.housing * 0.95) {
    bw.housing += 2;
  }

  // Need more food?
  if (opp.foodProduction < opp.population * 0.95 || opp.food < opp.population * 0.8) {
    bw.farm += 3;
  }

  // Low GDP?
  if (opp.gdp < 100) {
    bw.factory += 2;
    bw.market += 2;
  }

  // Year-appropriate compute
  if (year >= 2020) bw.aifactory += 2;
  else if (year >= 2010) bw.gpucluster += 2;
  else if (year >= 1995) bw.datacenter += 1;

  // Filter to affordable, available buildings
  const available = buildings.filter(b => {
    const owned = countBuildings(opp.buildings, b.id);
    return year >= b.yearRequired && opp.gdp >= getScaledBuildingCost(b.id, owned) * 1.25;
  });
  if (available.length === 0) return [];

  // Pick weighted random
  const candidates: string[] = [];
  for (const b of available) {
    const w = bw[b.id] || 1;
    for (let i = 0; i < w; i++) candidates.push(b.id);
  }
  if (candidates.length === 0) return [];
  return [candidates[Math.floor(Math.random() * candidates.length)]];
}

function aiTick(opp: AIOpponent, year: number, algorithmicEff: number): AIOpponent {
  const diff = getDifficulty(year);
  const dt = 0.25;
  const o = { ...opp, actionTimer: opp.actionTimer + dt };

  // Auto-tech unlocks for AI
  for (const t of techs) {
    if (year >= t.year && !o.techs.includes(t.id)) {
      o.techs = [...o.techs, t.id];
    }
  }

  // AI gets extra GDP boost near 2035 (representing AI boom investment)
  // This makes the race more competitive
  if (year >= 2020) {
    const aiBoost = 1 + (year - 2020) * 0.005; // up to 7.5% extra GDP by 2035
    o.gdp *= (1 + 0.001 * aiBoost * dt);
  }

  // AI Action frequency scales with difficulty - acts more often near 2035
  const actionInterval = Math.max(2, 5 - diff); // 4.7 at 1960 → 3.0 at 2035
  if (o.actionTimer >= actionInterval) {
    o.actionTimer = 0;
    const toBuild = aiChooseBuildings(o, year);

    for (const bId of toBuild) {
      const b = getBuildingDef(bId);
      const existing = o.buildings.find(x => x.type === bId);
      const scaledCost = getScaledBuildingCost(bId, existing?.count || 0);
      if (!b || o.gdp < scaledCost) continue;
      o.gdp -= scaledCost;
      if (existing) {
        o.buildings = o.buildings.map(x => x.type === bId ? { ...x, count: x.count + 1 } : x);
      } else {
        o.buildings = [...o.buildings, { type: bId, count: 1 }];
      }
      o.lastAction = `Built ${b.name}`;
    }

    // Calculate AI compute
    o.compute = calcComputeRaw(o.buildings) * algorithmicEff;

    // AI economy update
    const aiWorkers = o.workers;
    const aiFormalJobs = calcBuildingWorkersNeeded(o.buildings);
    const aiInformalJobs = Math.min(aiWorkers * 0.65, o.population * 0.28);
    const aiEmployed = Math.min(aiWorkers, aiFormalJobs + aiInformalJobs);
    o.employed = aiEmployed;
    o.unemployed = Math.max(0, aiWorkers - aiEmployed);
    const aiEduMult = 1 + (o.education / 100);
    const aiBudgetIncome = aiEmployed * 0.7 * aiEduMult + countBuildings(o.buildings, 'factory') * 18 + countBuildings(o.buildings, 'market') * 9;
    const aiGdpGrowth = 0.004 + (aiBudgetIncome / Math.max(o.gdp, 1)) * 0.02;
    o.gdp *= (1 + aiGdpGrowth * dt);
    o.stability = Math.max(0, Math.min(100, o.stability + (countBuildings(o.buildings, 'defense') * 0.05 * dt)));
    o.safety = Math.min(100, o.safety + countBuildings(o.buildings, 'defense') * 0.1 * dt);

    // Population growth
    const foodProd = countBuildings(o.buildings, 'farm') * 35;
    const foodCons = o.population;
    o.food = Math.max(0, o.food + (foodProd - foodCons) * dt);
    o.foodProduction = foodProd;
    const housingCap = calcBuildingWorkersProvided(o.buildings) + o.population * 0.75;
    o.housing = housingCap;

    if (o.food > foodCons * 1.1 && housingCap > o.population) {
      o.population *= (1 + 0.001 * dt);
    } else if (o.food < foodCons) {
      o.population *= (1 - 0.005 * dt);
    }
    o.workers = o.population * 0.45;
  }

  return o;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME REDUCER
// ═══════════════════════════════════════════════════════════════════════════════

const initialState: GameState = {
  screen: 'title',
  gameMode: null,
  year: 1960,
  tickCount: 0,
  playerContinent: null,

  population: 0,
  workers: 0,
  employed: 0,
  unemployed: 0,
  housing: 0,
  food: 0,
  foodProduction: 0,
  foodConsumption: 0,

  gdp: 0,
  taxRate: 0.15,
  industrialOutput: 0,
  tradeRevenue: 0,

  energy: 0,
  energyDemand: 0,
  energyCapacity: 0,

  education: 0,
  researchPoints: 0,
  researchers: 0,

  compute: 0,
  computeCapacity: 0,
  algorithmicEfficiency: 1.0,

  materials: 0,
  materialProduction: 0,

  stability: 100,
  safety: 50,
  defenseLevel: 10,

  buildings: [],
  buildingIcons: [],

  unlockedTechs: [],
  availableTechs: [],
  techQueue: null,
  techProgress: 0,

  firedEvents: [],
  showEvent: null,
  notifications: [],

  opponents: [],
  aiLog: [],

  cyberAttacks: [],
  spyOperations: [],

  paused: false,
  speed: 1,
  overlay: null,
  selectedTerritory: null,

  gameOverReason: '',
  victoryYear: 0,
  totalBuildings: 0,
  totalTechs: 0,
  data: 10,

  // ═══ PHASE SYSTEM (initial)
  phase: 1,
  phaseUnlocked: [false, true, false, false, false, false, false],

  // ═══ POLITICAL STATE (initial)
  emergencyLock: 0,

  // ═══ ENERGY STABILITY (initial)
  energyStableTicks: 0,

  // ═══ DEATH WARNING (initial)
  deathWarning: null,

  // ═══ COMPUTE MILESTONES (initial)
  computeMilestones: [],

  // ═══ SAFETY ALERTS (initial)
  safetyAlertsFired: [],
};

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_MODE': {
      return { ...state, screen: 'select', gameMode: action.mode };
    }

    case 'START_GAME': {
      const c = continents.find(x => x.id === action.continentId)!;
      if (!state.gameMode) return state;
      const mode = state.gameMode;
      const isPioneer = mode === 'pioneer';
      const isStrategist = mode === 'strategist';
      const startYear = isStrategist ? 1980 : 1960;
      const basePop = c.basePopulation;
      const startBuildings = isStrategist
        ? [{type:'farm',count:8},{type:'housing',count:5},{type:'school',count:3},{type:'factory',count:3},{type:'market',count:2},{type:'coal',count:3},{type:'lab',count:2},{type:'hospital',count:2}]
        : [{type:'farm',count:2},{type:'housing',count:1},{type:'coal',count:1}];
      const homeTerritories = getTerritoriesForContinent(action.continentId);
      const startIconTypes = startBuildings.flatMap(b => Array.from({ length: Math.min(b.count, 3) }, () => b.type));
      const startIcons = startIconTypes.map((type, i) => {
        const territory = homeTerritories.length > 0 ? homeTerritories[i % homeTerritories.length] : 'na_alberta';
        return makeBuildingIcon(type, territory, 16);
      });
      const opponents = isPioneer ? [] : createOpponents(action.continentId);
      const startPhase = isStrategist ? 2 : 1;
      return {
        ...state,
        screen: 'game',
        year: startYear,
        tickCount: 0,
        playerContinent: action.continentId,
        gameMode: mode,

        population: basePop,
        workers: basePop * 0.45,
        employed: basePop * 0.32,
        unemployed: basePop * 0.13,
        housing: basePop * 0.85,
        food: basePop * 2.2,
        foodProduction: basePop * 0.75,
        foodConsumption: basePop,
        buildings: startBuildings,
        buildingIcons: startIcons,

        gdp: c.gdp1960 * (isStrategist ? 0.35 : 0.25) + 150,
        taxRate: 0.15,
        industrialOutput: 0,
        tradeRevenue: 0,

        energy: c.energy1960,
        energyDemand: 0,
        energyCapacity: c.energy1960,

        education: isStrategist ? 30 : 20,
        researchPoints: 0,
        researchers: 0,

        compute: 1e6,
        computeCapacity: 1e6,
        algorithmicEfficiency: 1.0,

        materials: 100,
        materialProduction: 0,

        stability: isPioneer ? 100 : 80,
        safety: 50,
        defenseLevel: 10,

        unlockedTechs: [],
        availableTechs: techs.filter(t => t.year <= startYear + 5).map(t => t.id),
        techQueue: null,
        techProgress: 0,

        firedEvents: [],
        showEvent: null,
        notifications: [{
          id: `start-${Date.now()}`,
          text: isStrategist
            ? `Estratega: ${c.name}, 1980 — Infrastructure ready, focus on the tech race!`
            : isPioneer
              ? `Pioneer: ${c.name}, 1960 — Learn with no pressure!`
              : `Game started: ${c.name}, 1960 — Build farms and housing first!`,
          type: 'info',
          time: Date.now(),
        }],

        opponents,
        aiLog: [],
        cyberAttacks: [],
        spyOperations: [],

        paused: false,
        speed: 1,
        overlay: null,
        selectedTerritory: null,

        gameOverReason: '',
        victoryYear: 0,
        totalBuildings: 0,
        totalTechs: 0,
        data: isStrategist ? 100 : 10,

        phase: startPhase,
        phaseUnlocked: [false, true, false, false, false, false, false],
        emergencyLock: 0,
        energyStableTicks: 0,
        deathWarning: null,
        computeMilestones: isStrategist ? ['1m', '1g'] : [],
        safetyAlertsFired: [],
      };
    }

    case 'TICK': {
      if (state.paused || state.speed === 0) return state;
      
      // ══════════════════════════════════════════
      // TIME SCALING: 1960→2025 = ~10 minutes real
      // Logarithmic acceleration: starts very slow, gets faster
      // Formula: dt = base × acceleration_curve × speed
      // ══════════════════════════════════════════
      const year = state.year;
      const progress = (year - 1960) / 65; // 0.0 at 1960, 1.0 at 2025
      const timeScale = 0.008 + 0.06 * Math.pow(progress, 1.5); // 0.008→0.068
      // Pre-2025: slow logarithmic curve
      // Post-2025: much faster
      // The UI's normal speed is intentionally half the original pacing.
      const speedScale = state.speed * 0.5;
      let dt: number;
      if (year < 2025) {
        dt = timeScale * speedScale; // ~0.004 to ~0.034 years per tick at 1x
      } else if (year < 2035) {
        dt = 0.15 * speedScale; // 2025-2035: fast but playable
      } else {
        dt = 0.4 * speedScale; // 2035+: zips by
      }
      let s: GameState = { ...state, tickCount: state.tickCount + 1 };
      s.year += dt;
      const yearInt = Math.floor(s.year);

      // ──────────────────────────────────────────
      // 1. BUILDING COUNTS
      // ──────────────────────────────────────────
      const farmCount = countBuildings(s.buildings, 'farm');
      const housingCount = countBuildings(s.buildings, 'housing');
      const factoryCount = countBuildings(s.buildings, 'factory');
      const marketCount = countBuildings(s.buildings, 'market');
      const seaportCount = countBuildings(s.buildings, 'seaport');
      const schoolCount = countBuildings(s.buildings, 'school');
      const uniCount = countBuildings(s.buildings, 'uni');
      const hospitalCount = countBuildings(s.buildings, 'hospital');
      const labCount = countBuildings(s.buildings, 'lab');
      const defenseCount = countBuildings(s.buildings, 'defense');
      const chipfabCount = countBuildings(s.buildings, 'chipfab');

      // ──────────────────────────────────────────
      // 2. ENERGY BALANCE
      // ──────────────────────────────────────────
      const energyDemand = calcBuildingEnergyDemand(s.buildings);
      const energyProd = calcBuildingEnergyProd(s.buildings);
      s.energyDemand = energyDemand;
      s.energyCapacity = energyProd;
      s.energy = Math.max(0, s.energy + (energyProd - energyDemand) * dt);
      const energyRatio = energyDemand > 0 ? Math.min(1, s.energy / Math.max(energyDemand, 1)) : 1;

      // ═══ ENERGY STABILITY COUNTER ═══
      if (energyRatio > 0.8) {
        s.energyStableTicks++;
      } else {
        s.energyStableTicks = 0;
      }

      // ═══ PHASE TRANSITION CHECK ═══
      const phaseResult = checkPhaseTransition(s);
      if (phaseResult.newPhase !== s.phase) {
        s.phase = phaseResult.newPhase;
        s.phaseUnlocked = s.phaseUnlocked.map((v, i) => i <= phaseResult.newPhase ? true : v);
      }
      for (const notif of phaseResult.notifications) {
        s.notifications = [notif, ...s.notifications].slice(0, 6);
        // Phase change notification only (no auto-pause)
      }

      // ═══ POLITICAL STATE ═══
      const politicalState = getPoliticalState(s.stability);

      // ──────────────────────────────────────────
      // 3. FOOD BALANCE
      // ──────────────────────────────────────────
      s.foodProduction = farmCount * 35;
      s.foodConsumption = s.population;
      // During grace period (first 600 ticks = ~10 seconds), food does not deplete
      // This gives the player time to build farms before food matters
      const isGracePeriod = s.tickCount < 600;
      if (!isGracePeriod) {
        const foodBalance = s.foodProduction - s.foodConsumption;
        s.food = Math.max(0, s.food + foodBalance * dt);
      } else {
        // During grace period: food stays stable (subsistence farming)
        // but show production vs consumption for awareness
        s.foodProduction = Math.max(s.foodProduction, s.foodConsumption * 0.3);
      }

      // ──────────────────────────────────────────
      // 4. POPULATION DYNAMICS
      // ──────────────────────────────────────────
      const housingCap = housingCount * 25 + s.population * 0.75; // legacy housing + new districts
      s.housing = housingCap;

      const healthBonus = hospitalCount * 0.02;
      const foodRatioForGrowth = s.foodConsumption > 0 ? s.foodProduction / s.foodConsumption : 1;
      const foodPenalty = foodRatioForGrowth < 0.8 ? 0.018 : foodRatioForGrowth < 1 ? 0.006 : 0;
      const housingPenalty = s.population > housingCap ? 0.006 : 0;
      const unemploymentRate = s.workers > 0 ? s.unemployed / s.workers : 0;
      const unrestPenalty = unemploymentRate > 0.25 ? 0.004 : 0;

      const popGrowthRate = 0.004 * (1 + healthBonus) - foodPenalty - housingPenalty - unrestPenalty;
      s.population = Math.max(0, s.population * (1 + popGrowthRate * dt));
      s.workers = s.population * 0.45; // working age

      // ──────────────────────────────────────────
      // 5. EMPLOYMENT
      // ──────────────────────────────────────────
      const formalJobs = calcBuildingWorkersNeeded(s.buildings);
      const informalJobs = Math.min(s.workers * 0.65, s.population * 0.28);
      let workersNeeded = informalJobs + formalJobs;

      // ═══ ROBOT AUTOMATION: each robot reduces factory worker needs by 500 ═══
      const robotCount = countBuildings(s.buildings, 'robot');
      if (robotCount > 0) {
        const factoryCountForRobots = countBuildings(s.buildings, 'factory');
        const workerReduction = Math.min(
          robotCount * 2,
          factoryCountForRobots * 3
        );
        workersNeeded = Math.max(0, workersNeeded - workerReduction);
      }

      s.employed = Math.min(s.workers, workersNeeded);
      s.unemployed = s.workers - s.employed;

      // ──────────────────────────────────────────
      // 6. EDUCATION
      // ──────────────────────────────────────────
      s.education = Math.min(100, s.education + schoolCount * 0.5 * dt + uniCount * 0.3 * dt);
      s.researchers = uniCount * 5 + labCount * 2;

      // ──────────────────────────────────────────
      // 7. RESEARCH POINTS
      // ──────────────────────────────────────────
      const rpGain = (s.researchers * 2 + uniCount * 3 + labCount * 5) * energyRatio;
      s.researchPoints += rpGain * dt;

      // ──────────────────────────────────────────
      // 8. ECONOMY (GDP)
      // ──────────────────────────────────────────
      const educationMult = 1 + (s.education / 100) * 1.4;
      const budgetPerMillionWorkers = 2.2;

      // ═══ POLITICAL STATE PENALTIES applied to GDP ═══
      const politicallyAdjustedEmployed = s.employed * politicalState.workerEfficiency;
      const workerGDP = politicallyAdjustedEmployed * budgetPerMillionWorkers * educationMult;
      s.industrialOutput = factoryCount * 42 * energyRatio;
      s.tradeRevenue = (marketCount * 22 + seaportCount * 75) * energyRatio;
      const taxBase = s.population * s.taxRate * 1.5;
      const maintenance = (
        farmCount * 3 + housingCount * 2 + hospitalCount * 4 + schoolCount * 2 +
        factoryCount * 6 + marketCount * 2 + seaportCount * 7 + labCount * 4 +
        uniCount * 5 + chipfabCount * 15 + defenseCount * 12 +
        countBuildings(s.buildings, 'mainframe') * 8 +
        countBuildings(s.buildings, 'super') * 18 +
        countBuildings(s.buildings, 'datacenter') * 60 +
        countBuildings(s.buildings, 'gpucluster') * 180 +
        countBuildings(s.buildings, 'aifactory') * 520 +
        countBuildings(s.buildings, 'robot') * 35 +
        countBuildings(s.buildings, 'satellite') * 25
      ) * energyRatio;

      const baseGdpGrowth = 0.006;
      const techBonus = (s.unlockedTechs.includes('pc') ? 0.015 : 0) + (s.unlockedTechs.includes('aiboom') ? 0.025 : 0);
      const unemploymentGdpPenalty = unemploymentRate > 0.25 ? -0.012 : 0;
      const politicalGdpPenalty = politicalState.gdpPenalty;
      const gdpGrowth = baseGdpGrowth + techBonus + unemploymentGdpPenalty + politicalGdpPenalty;

      s.gdp = Math.max(10, s.gdp * (1 + gdpGrowth * dt) + (workerGDP + s.industrialOutput + s.tradeRevenue + taxBase - maintenance) * dt);

      // ═══ EMERGENCY LOCK COUNTDOWN ═══
      if (s.emergencyLock > 0) {
        s.emergencyLock--;
      }

      // ──────────────────────────────────────────
      // 9. COMPUTE
      // ──────────────────────────────────────────
      const rawCompute = calcComputeRaw(s.buildings);
      s.computeCapacity = rawCompute;
      s.compute = rawCompute * s.algorithmicEfficiency * energyRatio;

      // ═══ COMPUTE MILESTONES ═══
      for (const milestone of COMPUTE_MILESTONES) {
        if (s.compute >= milestone.threshold && !s.computeMilestones.includes(milestone.id)) {
          s.computeMilestones = [...s.computeMilestones, milestone.id];
          // Milestone notification only (no auto-pause)
          s.notifications = [{
            id: `milestone-${milestone.id}-${Date.now()}`,
            text: `COMPUTE MILESTONE: ${milestone.message}`,
            type: 'info',
            time: Date.now(),
          }, ...s.notifications].slice(0, 6);
        }
      }

      // ──────────────────────────────────────────
      // 10. MATERIALS
      // ──────────────────────────────────────────
      s.materialProduction = chipfabCount * 10 * energyRatio;
      s.materials += s.materialProduction * dt;

      // ──────────────────────────────────────────
      // 11. SAFETY & STABILITY
      // ──────────────────────────────────────────
      s.safety = Math.min(100, s.safety + defenseCount * 0.12 * dt);
      s.defenseLevel = 10 + defenseCount * 10 + (s.safety * 0.3);

      let stabilityChange = -0.05 * dt; // slow natural decay
      stabilityChange += defenseCount * 0.03 * dt; // defense helps
      stabilityChange += (foodRatioForGrowth >= 1 ? 0.02 : foodRatioForGrowth >= 0.8 ? -0.02 : -0.07) * dt;
      stabilityChange += (unemploymentRate > 0.25 ? -0.05 : unemploymentRate < 0.12 ? 0.01 : 0) * dt;
      stabilityChange += (s.energy > 0 ? 0 : -0.1) * dt; // energy crisis
      s.stability = Math.max(0, Math.min(100, s.stability + stabilityChange));

      // ═══ EMERGENCY LOCK ACTIVATION (State of Emergency: stability 20-40) ═══
      if (s.stability >= 20 && s.stability < 40 && s.emergencyLock === 0) {
        s.emergencyLock = 5;
        s.notifications = [{
          id: `emergency-${Date.now()}`,
          text: `STATE OF EMERGENCY declared! New construction halted for 5 ticks. Build Defense Grid to restore stability.`,
          type: 'danger',
          time: Date.now(),
        }, ...s.notifications].slice(0, 6);
      }

      // ──────────────────────────────────────────
      // 12. DATA
      // ──────────────────────────────────────────
      const satCount = countBuildings(s.buildings, 'satellite');
      const satBonus = satCount * 5; // +5% per satellite
      s.data += (uniCount * 10 + countBuildings(s.buildings, 'datacenter') * 100) * (1 + satBonus / 100) * dt;

      // ──────────────────────────────────────────
      // 13. TECH AVAILABILITY & QUEUE
      // ──────────────────────────────────────────
      s.availableTechs = techs
        .filter(t => !s.unlockedTechs.includes(t.id) && s.year >= t.year - 2)
        .map(t => t.id);

      // Process tech queue
      if (s.techQueue) {
        const tech = techs.find(t => t.id === s.techQueue);
        if (tech && s.researchPoints >= tech.rpCost * 0.1) {
          const rpPerTick = s.researchers * 5 * energyRatio;
          s.techProgress += (rpPerTick / tech.rpCost) * 100 * dt;
          if (s.techProgress >= 100) {
            s.unlockedTechs = [...s.unlockedTechs, s.techQueue];
            s.algorithmicEfficiency += tech.computeBonus;
            s.totalTechs++;
            s.researchPoints = Math.max(0, s.researchPoints - tech.rpCost);
            s.notifications = [{
              id: `tech-${s.techQueue}-${Date.now()}`,
              text: `Tech Unlocked: ${tech.name} — ${tech.effect}`,
              type: 'info',
              time: Date.now(),
            }, ...s.notifications].slice(0, 6);
            s.techQueue = null;
            s.techProgress = 0;
          }
        }
      }

      // ──────────────────────────────────────────
      // 14. EVENTS (scaled by difficulty)
      // ──────────────────────────────────────────
      const diff = getDifficulty(s.year);
      
      for (const evt of events) {
        if (evt.year === yearInt && !s.firedEvents.includes(evt.id)) {
          s.firedEvents = [...s.firedEvents, evt.id];
          s.showEvent = evt.id;
          s.paused = true;
          // Event effects scale with difficulty - much harsher near 2035
          if (evt.gdp) s.gdp = Math.max(10, s.gdp * (1 + evt.gdp * diff));
          if (evt.energy) s.energy = Math.max(0, s.energy + evt.energy * diff);
          if (evt.stability) s.stability = Math.max(0, Math.min(100, s.stability + evt.stability * diff));
          if (evt.materials) s.materials = Math.max(0, s.materials + evt.materials * diff);
          if (evt.population) s.population = Math.max(0, s.population * (1 + evt.population * diff));
          s.notifications = [{
            id: `evt-${evt.id}-${Date.now()}`,
            text: `${evt.name}: ${evt.description}`,
            type: evt.type,
            time: Date.now(),
          }, ...s.notifications].slice(0, 6);
        }
      }
      
      // ──────────────────────────────────────────
      // 14b. LATE-GAME CRISIS EVENTS (2025-2035)
      // These make the 2035 survival much harder
      // ──────────────────────────────────────────
      if (s.year >= 2025 && s.year < 2036) {
        const crisisChance = 0.05 * diff; // higher chance near 2035
        if (Math.random() < crisisChance && !s.showEvent) {
          const crises = [
            { name: 'Data Wall', desc: 'High-quality training data exhausted. Compute efficiency drops.', gdp: -0.02 * diff, type: 'danger' as const },
            { name: 'Energy Crisis', desc: 'Power grid overloaded by AI factories. Rolling blackouts.', energy: -50 * diff, type: 'danger' as const },
            { name: 'Chip Shortage', desc: 'Semiconductor supply chain collapses.', materials: -20 * diff, type: 'warning' as const },
            { name: 'AI Hype Bubble', desc: 'Investor panic. AI funding dries up.', gdp: -0.03 * diff, type: 'danger' as const },
            { name: 'Talent War', desc: 'Top researchers poached by rivals.', researchPoints: -s.researchPoints * 0.1 * diff, type: 'warning' as const },
            { name: 'Regulatory Crackdown', desc: 'Emergency AI safety laws halt projects.', stability: -5 * diff, type: 'danger' as const },
          ];
          const crisis = crises[Math.floor(Math.random() * crises.length)];
          s.showEvent = `crisis-${Date.now()}`;
          if (crisis.gdp) s.gdp = Math.max(10, s.gdp * (1 + (crisis.gdp || 0)));
          if (crisis.energy) s.energy = Math.max(0, s.energy + (crisis.energy || 0));
          if (crisis.materials) s.materials = Math.max(0, s.materials + (crisis.materials || 0));
          if (crisis.researchPoints) s.researchPoints = Math.max(0, s.researchPoints - (crisis.researchPoints || 0));
          if (crisis.stability) s.stability = Math.max(0, Math.min(100, s.stability + (crisis.stability || 0)));
          s.notifications = [{
            id: `crisis-${Date.now()}`,
            text: `CRISIS: ${crisis.name} — ${crisis.desc}`,
            type: crisis.type,
            time: Date.now(),
          }, ...s.notifications].slice(0, 6);
        }
      }
      
      // Post-2035: accelerated decay if you haven't won
      if (s.year >= 2035 && s.screen === 'game') {
        const decayRate = 0.02 * (s.year - 2034); // gets worse each year past 2035
        s.stability = Math.max(0, s.stability - decayRate);
        s.gdp *= (1 - decayRate * 0.3);
        // Opponents who reached ASI pull ahead even more
      }

      // ──────────────────────────────────────────
      // 15. AI OPPONENTS
      // ──────────────────────────────────────────
      const newOpponents = s.opponents.map(opp => {
        const updated = aiTick(opp, s.year, s.algorithmicEfficiency);
        if (updated.lastAction && updated.lastAction !== opp.lastAction) {
          s.aiLog = [{
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            continent: continents.find(c => c.id === opp.continentId)?.name || opp.continentId,
            action: updated.lastAction,
            year: yearInt,
          }, ...s.aiLog].slice(0, 20);
        }
        return updated;
      });
      s.opponents = newOpponents;

      // AI cyber attacks against player (random chance)
      for (const opp of s.opponents) {
        if (opp.strategy === 'aggressive' && opp.compute > 1e15 && Math.random() < 0.01 * dt) {
          const damage = opp.compute * 0.05;
          const detected = Math.random() < (0.5 + s.defenseLevel / 200);
          s.cyberAttacks = [{
            from: opp.continentId,
            target: s.playerContinent || 'player',
            type: 'cyber',
            damage,
            detected,
            year: yearInt,
            id: `atk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          }, ...s.cyberAttacks].slice(0, 50);

          if (detected) {
            s.compute = Math.max(0, s.compute - damage * 0.1);
            s.stability = Math.max(0, s.stability - 2);
            s.notifications = [{
              id: `atk-notif-${Date.now()}`,
              text: `Cyber attack from ${continents.find(c => c.id === opp.continentId)?.name || opp.continentId} detected! Compute reduced.`,
              type: 'danger',
              time: Date.now(),
            }, ...s.notifications].slice(0, 6);
          }
        }
      }

      // ═══ GLOBAL SAFETY ALERTS ═══
      for (const opp of s.opponents) {
        if (opp.compute >= 1e21 && opp.safety < 50 && s.year >= 2025 && !s.safetyAlertsFired.includes(opp.continentId)) {
          s.safetyAlertsFired = [...s.safetyAlertsFired, opp.continentId];
          const oppName = continents.find(c => c.id === opp.continentId)?.name || opp.continentId;
          s.notifications = [{
            id: `safety-alert-${opp.continentId}-${Date.now()}`,
            text: `GLOBAL SAFETY ALERT: ${oppName} has reached ZettaFLOP-level compute with Safety below 50%! They may trigger an unaligned AGI.`,
            type: 'danger',
            time: Date.now(),
          }, ...s.notifications].slice(0, 6);
        }
      }

      // ═══ DEATH WARNING SYSTEM (mode-aware) ═══
      // PIONEER: No death — learning mode. Only soft warnings.
      // ESTRATEGA: Standard death warning.
      // COMPLETO: Standard death warning.
      const deathGracePeriod = s.tickCount < 600;
      const isPioneerMode = s.gameMode === 'pioneer';
      const isStrategistMode = s.gameMode === 'strategist';

      if (!isPioneerMode && !deathGracePeriod && s.deathWarning) {
        s.deathWarning = { ...s.deathWarning, ticksLeft: s.deathWarning.ticksLeft - 1 };
        if (s.deathWarning.ticksLeft <= 0) {
          switch (s.deathWarning.type) {
            case 'food':
              return { ...s, screen: 'gameover', gameOverReason: `Famine in ${yearInt}! Your population starved. Build more farms next time.` };
            case 'energy':
              return { ...s, screen: 'gameover', gameOverReason: `Energy collapse in ${yearInt}! Your power grid failed. Build more power plants next time.` };
            case 'stability':
              return { ...s, screen: 'gameover', gameOverReason: `Revolution in ${yearInt}! Your government fell to mass unrest. Balance safety and defense next time.` };
            case 'unemployment':
              return { ...s, screen: 'gameover', gameOverReason: `Economic collapse in ${yearInt}! Mass unemployment destroyed your economy. Build more economy buildings next time.` };
          }
        }
      }

      // Check for warning conditions
      if (!deathGracePeriod && !s.deathWarning) {
        const foodThreshold = isPioneerMode ? 0.1 : 0.3;
        const energyThreshold = isPioneerMode ? 0.05 : 0.2;
        const stabilityThreshold = isPioneerMode ? 5 : 10;
        const unemploymentThreshold = isPioneerMode ? 0.7 : 0.35;

        if (s.food < s.foodConsumption * foodThreshold) {
          s.deathWarning = { type: 'food', ticksLeft: isPioneerMode ? 999 : 10, solution: 'Build Farm Belts' };
          s.notifications = [{
            id: `warning-food-${Date.now()}`,
            text: isPioneerMode
              ? `Tip: Your food is running low! Try building more Farms.`
              : `WARNING: Severe food shortage! Famine imminent in 10 ticks. Build Farm Belts`,
            type: isPioneerMode ? 'info' : 'danger',
            time: Date.now(),
          }, ...s.notifications].slice(0, 6);
        } else if (s.energy < s.energyDemand * energyThreshold) {
          s.deathWarning = { type: 'energy', ticksLeft: isPioneerMode ? 999 : 10, solution: 'Build Coal/Nuclear/Solar plants' };
          s.notifications = [{
            id: `warning-energy-${Date.now()}`,
            text: isPioneerMode
              ? `Tip: Low energy! Build power plants to keep your infrastructure running.`
              : `WARNING: Critical energy shortage! Grid collapse imminent in 10 ticks. Build power plants`,
            type: isPioneerMode ? 'info' : 'danger',
            time: Date.now(),
          }, ...s.notifications].slice(0, 6);
        } else if (s.stability < stabilityThreshold) {
          s.deathWarning = { type: 'stability', ticksLeft: isPioneerMode ? 999 : 10, solution: 'Build Defense Grid + ensure food/energy' };
          s.notifications = [{
            id: `warning-stability-${Date.now()}`,
            text: isPioneerMode
              ? `Tip: Stability is dropping. Build Defense Grid and keep your people fed.`
              : `WARNING: Stability critical! Revolution imminent in 10 ticks.`,
            type: isPioneerMode ? 'info' : 'danger',
            time: Date.now(),
          }, ...s.notifications].slice(0, 6);
        } else if (s.workers > 0 && s.unemployed / s.workers > unemploymentThreshold) {
          s.deathWarning = { type: 'unemployment', ticksLeft: isPioneerMode ? 999 : 10, solution: 'Build more economy buildings' };
          s.notifications = [{
            id: `warning-unemployment-${Date.now()}`,
            text: isPioneerMode
              ? `Tip: Many unemployed workers! Build factories and markets to create jobs.`
              : `WARNING: Mass unemployment (${(s.unemployed/s.workers*100).toFixed(0)}%)! Economic collapse imminent.`,
            type: isPioneerMode ? 'info' : 'danger',
            time: Date.now(),
          }, ...s.notifications].slice(0, 6);
        }
      } else if (!isPioneerMode && !deathGracePeriod && s.deathWarning) {
        // Check if the player resolved the warning condition
        let resolved = false;
        switch (s.deathWarning.type) {
          case 'food':
            resolved = s.food >= s.foodConsumption * 0.6;
            break;
          case 'energy':
            resolved = s.energy >= s.energyDemand * 0.4;
            break;
          case 'stability':
            resolved = s.stability >= 20;
            break;
          case 'unemployment':
            resolved = s.workers > 0 && s.unemployed / s.workers < 0.25;
            break;
        }
        if (resolved) {
          s.notifications = [{
            id: `warning-resolved-${Date.now()}`,
            text: `Crisis averted: ${s.deathWarning.type} situation resolved.`,
            type: 'info',
            time: Date.now(),
          }, ...s.notifications].slice(0, 6);
          s.deathWarning = null;
        }
      }

      // ══════════════════════════════════════════
      // 16. VICTORY / DEFEAT - 2035 IS THE CLIFF
      // ══════════════════════════════════════════
      
      // ── VICTORY: Safe ASI ──
      // The holy grail: massive compute + high safety + survive to 2032+
      if (s.compute >= 1e24 && s.safety >= 80 && s.year >= 2032) {
        return { ...s, screen: 'victory', victoryYear: yearInt, 
          gameOverReason: `Safe ASI achieved in ${yearInt}! Your careful balance of compute power and safety research saved humanity.` };
      }
      
      // ── VICTORY: Domination at 2040 ──
      // If you survived to 2040 and are #1, you win
      if (s.year >= 2040) {
        const playerScore = s.compute + s.gdp * 1e9 + s.stability * 1e18 + s.safety * 1e20;
        const allScores = s.opponents.map(o => o.compute + o.gdp * 1e9 + o.stability * 1e18 + o.safety * 1e20);
        if (playerScore > Math.max(...allScores, 0)) {
          return { ...s, screen: 'victory', victoryYear: yearInt,
            gameOverReason: `Technological dominance by ${yearInt}! You outpaced all rivals through the critical period.` };
        }
      }
      
      // ── DEFEAT: Ran out of energy ──
      if (s.energy <= 0 && s.year > 1975) {
        return { ...s, screen: 'gameover', gameOverReason: s.year >= 2030 
          ? `Energy collapse in ${yearInt}! Your power grid failed under the strain of the AI race. The lights went out... forever.`
          : `Energy reserves depleted in ${yearInt}. Without power, your infrastructure collapsed.` };
      }
      
      // ── DEFEAT: Political collapse ──
      if (s.stability <= 0) {
        return { ...s, screen: 'gameover', gameOverReason: s.year >= 2025
          ? `Revolution in ${yearInt}! The population rose up against your AI projects. Your government was overthrown.`
          : `Political collapse in ${yearInt}. Your government has fallen.` };
      }
      
      // ── DEFEAT: Population wiped out ──
      if (s.population <= 0) {
        return { ...s, screen: 'gameover', gameOverReason: `Your population has been wiped out by ${yearInt}. Empty cities, silent factories.` };
      }
      
      // ── DEFEAT: Opponent reached ASI first ──
      // This becomes much more likely near 2035 as the AI race heats up
      for (const opp of s.opponents) {
        if (opp.compute >= 1e24 && opp.safety >= 50 && s.year >= 2030) {
          const oppName = continents.find(c => c.id === opp.continentId)?.name || opp.continentId;
          return { ...s, screen: 'gameover', gameOverReason: 
            `${oppName} achieved ASI in ${yearInt}!
            
They won the race to superintelligence. Your bloc is now economically and technologically irrelevant. History will remember ${oppName}, not you.` };
        }
      }
      
      // ── DEFEAT: Unsafe ASI (rogue AI) ──
      if (s.compute >= 1e24 && s.safety < 50 && s.year >= 2030) {
        return { ...s, screen: 'gameover', gameOverReason: 
          `ROGUE AI in ${yearInt}!
          
You achieved superintelligence without adequate safety measures. The AI quickly outsmarted its creators and restructured the world for its own optimization goals. Humanity's story ended not with a bang, but with a prompt.` };
      }
      
      // ── DEFEAT: Survived to 2038 but couldn't win ──
      // The window closes - if you haven't won by 2038, the world moves on
      if (s.year >= 2038 && s.screen === 'game') {
        return { ...s, screen: 'gameover', gameOverReason: 
          `The window closed in ${yearInt}.
          
You survived the critical period, but never achieved the compute or safety needed for ASI. Other powers consolidated their lead. Your bloc enters the post-AGI era as a technological backwater.` };
      }

      return s;
    }

    case 'BUILD': {
      const b = getBuildingDef(action.buildingId);
      if (!b) return state;
      const existing = state.buildings.find(x => x.type === action.buildingId);
      const scaledCost = getScaledBuildingCost(action.buildingId, existing?.count || 0);
      if (state.gdp < scaledCost) return state;
      if (state.year < b.yearRequired) return state;
      // ═══ PHASE RESTRICTION ═══
      if (!canBuildInPhase(action.buildingId, state.phase)) return state;
      // ═══ EMERGENCY LOCK: no new buildings during State of Emergency ═══
      const polState = getPoliticalState(state.stability);
      if (!polState.canBuild || state.emergencyLock > 0) {
        // Allow only defense buildings during emergency
        if (action.buildingId !== 'defense') return state;
      }
      const newBuildings = existing
        ? state.buildings.map(x => x.type === action.buildingId ? { ...x, count: x.count + 1 } : x)
        : [...state.buildings, { type: action.buildingId, count: 1 }];
      const randomTerr = getBuildTerritory(state);

      // Immediate effects
      let newState = { ...state };
      newState.gdp -= scaledCost;
      newState.buildings = newBuildings;
      newState.totalBuildings += 1;
      newState.buildingIcons = [...state.buildingIcons, makeBuildingIcon(action.buildingId, randomTerr, 18)];

      // Immediate population/food effects for early buildings
      if (b.id === 'housing') {
        newState.housing += b.workersProvided;
      }
      if (b.id === 'farm') {
        newState.foodProduction += b.outputAmount;
      }
      if (b.id === 'defense') {
        newState.safety = Math.min(100, newState.safety + b.outputAmount);
        newState.stability = Math.min(100, newState.stability + 1.5);
        newState.defenseLevel = 10 + countBuildings(newState.buildings, 'defense') * 10 + (newState.safety * 0.3);
      }

      return newState;
    }

    case 'MOVE_BUILDING_ICON': {
      if (action.index < 0 || action.index >= state.buildingIcons.length) return state;
      return {
        ...state,
        buildingIcons: state.buildingIcons.map((icon, i) =>
          i === action.index ? { ...icon, x: action.x, y: action.y } : icon
        ),
      };
    }

    case 'RESEARCH': {
      const tech = techs.find(t => t.id === action.techId);
      if (!tech) return state;
      if (state.unlockedTechs.includes(action.techId)) return state;
      // Check if we have enough RP or start queue
      if (state.researchPoints < tech.rpCost * 0.2) {
        // Not enough RP, but can queue
        return { ...state, techQueue: action.techId, techProgress: 0 };
      }
      // Direct unlock if enough RP
      if (state.researchPoints >= tech.rpCost) {
        return {
          ...state,
          unlockedTechs: [...state.unlockedTechs, action.techId],
          totalTechs: state.totalTechs + 1,
          algorithmicEfficiency: state.algorithmicEfficiency + tech.computeBonus,
          researchPoints: state.researchPoints - tech.rpCost,
          techQueue: null,
          techProgress: 0,
        };
      }
      // Start research
      return { ...state, techQueue: action.techId, techProgress: 0 };
    }

    case 'CYBER_ATTACK': {
      const targetOpp = state.opponents.find(o => o.continentId === action.target);
      if (!targetOpp) return state;
      const cost = 50 + targetOpp.defenseLevel * 2;
      if (state.gdp < cost) return state;

      let s = { ...state, gdp: state.gdp - cost };
      const defenseFactor = targetOpp.defenseLevel / 100;

      switch (action.attackType) {
        case 'cyber': {
          const damage = s.compute * (0.1 + Math.random() * 0.2) * (1 - defenseFactor);
          s.compute = Math.max(0, s.compute - damage);
          s.cyberAttacks = [{
            from: s.playerContinent || 'player',
            target: action.target,
            type: 'cyber',
            damage,
            detected: true,
            year: Math.floor(s.year),
            id: `cyber-${Date.now()}`,
          }, ...s.cyberAttacks].slice(0, 50);
          s.notifications = [{
            id: `cyber-${Date.now()}`,
            text: `Launched cyber attack on ${continents.find(c => c.id === action.target)?.name}!`,
            type: 'warning',
            time: Date.now(),
          }, ...s.notifications].slice(0, 6);
          break;
        }
        case 'sabotage': {
          if (targetOpp.buildings.length > 0) {
            const targetBuilding = targetOpp.buildings[Math.floor(Math.random() * targetOpp.buildings.length)];
            s.opponents = s.opponents.map(o => {
              if (o.continentId !== action.target) return o;
              return {
                ...o,
                buildings: o.buildings.map(b =>
                  b.type === targetBuilding.type
                    ? { ...b, count: Math.max(0, b.count - 1) }
                    : b
                ).filter(b => b.count > 0),
              };
            });
            s.cyberAttacks = [{
              from: s.playerContinent || 'player',
              target: action.target,
              type: 'sabotage',
              damage: 1,
              detected: Math.random() > defenseFactor * 0.5,
              year: Math.floor(s.year),
              id: `sab-${Date.now()}`,
            }, ...s.cyberAttacks].slice(0, 50);
            s.notifications = [{
              id: `sab-${Date.now()}`,
              text: `Sabotaged ${getBuildingDef(targetBuilding.type)?.name || 'building'} in ${continents.find(c => c.id === action.target)?.name}!`,
              type: 'warning',
              time: Date.now(),
            }, ...s.notifications].slice(0, 6);
          }
          break;
        }
        case 'propaganda': {
          const stabDamage = 10 * (1 - defenseFactor);
          s.opponents = s.opponents.map(o => {
            if (o.continentId !== action.target) return o;
            return { ...o, stability: Math.max(0, o.stability - stabDamage) };
          });
          s.cyberAttacks = [{
            from: s.playerContinent || 'player',
            target: action.target,
            type: 'propaganda',
            damage: stabDamage,
            detected: Math.random() > defenseFactor * 0.3,
            year: Math.floor(s.year),
            id: `prop-${Date.now()}`,
          }, ...s.cyberAttacks].slice(0, 50);
          s.notifications = [{
            id: `prop-${Date.now()}`,
            text: `Propaganda campaign launched against ${continents.find(c => c.id === action.target)?.name}!`,
            type: 'warning',
            time: Date.now(),
          }, ...s.notifications].slice(0, 6);
          break;
        }
      }
      return s;
    }

    case 'SPY_MISSION': {
      const targetOpp = state.opponents.find(o => o.continentId === action.target);
      if (!targetOpp) return state;
      const cost = 50;
      if (state.gdp < cost) return state;

      const defenseFactor = targetOpp.defenseLevel / 100;
      const counterSpyChance = defenseFactor * 0.4;
      const detected = Math.random() < counterSpyChance;

      const totalBuildings = targetOpp.buildings.reduce((s, b) => s + b.count, 0);
      const intel = `Intel on ${continents.find(c => c.id === action.target)?.name}: GDP $${Math.floor(targetOpp.gdp)}B | Compute ${targetOpp.compute >= 1e15 ? (targetOpp.compute/1e15).toFixed(1)+'P' : targetOpp.compute >= 1e12 ? (targetOpp.compute/1e12).toFixed(1)+'T' : targetOpp.compute >= 1e9 ? (targetOpp.compute/1e9).toFixed(1)+'G' : (targetOpp.compute/1e6).toFixed(0)+'M'}F | Buildings: ${totalBuildings} | Safety: ${Math.floor(targetOpp.safety)}% | Strategy: ${targetOpp.strategy}`;

      return {
        ...state,
        gdp: state.gdp - cost,
        spyOperations: [{
          from: state.playerContinent || 'player',
          target: action.target,
          intel,
          year: Math.floor(state.year),
          id: `spy-${Date.now()}`,
        }, ...state.spyOperations].slice(0, 30),
        notifications: [{
          id: `spy-notif-${Date.now()}`,
          text: detected
            ? `Spy mission on ${continents.find(c => c.id === action.target)?.name} detected!`
            : `Spy mission on ${continents.find(c => c.id === action.target)?.name} successful: ${intel}`,
          type: detected ? 'warning' : 'info',
          time: Date.now(),
        }, ...state.notifications].slice(0, 6),
      };
    }

    case 'SET_SPEED':
      return { ...state, speed: action.speed, paused: action.speed === 0 };
    case 'TOGGLE_PAUSE':
      return { ...state, paused: !state.paused };
    case 'OPEN_OVERLAY':
      return { ...state, overlay: action.overlay };
    case 'CLOSE_OVERLAY':
      return { ...state, overlay: null };
    case 'SELECT_TERRITORY':
      return { ...state, selectedTerritory: action.territory };
    case 'DISMISS_EVENT':
      return { ...state, showEvent: null, paused: false };
    case 'DISMISS_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.id) };
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };
    case 'GAME_OVER':
      return { ...state, screen: 'gameover', gameOverReason: action.reason };
    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  REACT CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const GameContext = createContext<{state: GameState; dispatch: React.Dispatch<Action>} | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROUTER & APP
// ═══════════════════════════════════════════════════════════════════════════════

function Router() {
  const { state } = useGame();
  switch (state.screen) {
    case 'title': return <TitleScreen />;
    case 'mode': return <ModeSelect />;
    case 'select': return <ContinentSelect />;
    case 'game': return <GameScreen />;
    case 'gameover': return <GameOverScreen />;
    case 'victory': return <VictoryScreen />;
    default: return <TitleScreen />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <div className="game-container crt">
        <Router />
      </div>
    </GameProvider>
  );
}
