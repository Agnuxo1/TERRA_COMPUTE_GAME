import type { BuildingData, BuildingId, ContinentData, GameEvent, TechData, Terrain } from './types';

// ═══════════════════════════════════════════════════════════════════════════
//  CONTINENTS — every listed bonus is implemented in engine.ts (see BONUS)
// ═══════════════════════════════════════════════════════════════════════════

export const continents: ContinentData[] = [
  { id: 'na', name: 'North America', color: '#3B82F6', gdp1960: 2700, energy1960: 2800, techLevel: 8, solarPotential: 0.6, basePopulation: 180, capital: 'na_eastern_us',
    description: 'Economic powerhouse with elite universities and deep capital markets.', specialBonus: '+25% Research' },
  { id: 'eu', name: 'Europe', color: '#6366F1', gdp1960: 1750, energy1960: 1600, techLevel: 8, solarPotential: 0.5, basePopulation: 420, capital: 'eu_western_eu',
    description: 'Dense, educated and cooperative. Strong institutions and tech transfer.', specialBonus: 'Techs -15% cost, +20% approval stability' },
  { id: 'su', name: 'Soviet Union', color: '#EF4444', gdp1960: 1250, energy1960: 1200, techLevel: 5, solarPotential: 0.2, basePopulation: 210, capital: 'as_ural',
    description: 'Vast territory, heavy industry and the richest mineral deposits.', specialBonus: '+30% Industry, extra coal & uranium' },
  { id: 'cn', name: 'China', color: '#F97316', gdp1960: 450, energy1960: 800, techLevel: 3, solarPotential: 0.4, basePopulation: 660, capital: 'as_china',
    description: 'Enormous workforce and a state able to build at breathtaking speed.', specialBonus: '-25% construction time, +20% factories' },
  { id: 'af', name: 'Africa', color: '#22C55E', gdp1960: 400, energy1960: 200, techLevel: 1, solarPotential: 0.8, basePopulation: 280, capital: 'af_east',
    description: 'Young population, vast deserts full of sun and untouched land.', specialBonus: '+60% Solar, cheap land development' },
  { id: 'sa', name: 'South America', color: '#14B8A6', gdp1960: 500, energy1960: 450, techLevel: 3, solarPotential: 0.6, basePopulation: 150, capital: 'sa_brazil',
    description: 'Fertile plains, rainforest carbon sinks and abundant renewables.', specialBonus: '+25% Farms & Solar, forests absorb 2x CO₂' },
  { id: 'in', name: 'India', color: '#EAB308', gdp1960: 275, energy1960: 150, techLevel: 2, solarPotential: 0.7, basePopulation: 450, capital: 'in_c',
    description: 'A huge, ambitious generation of engineers in the making.', specialBonus: 'Education grows 40% faster, +15% research' },
  { id: 'oc', name: 'Oceania', color: '#06B6D4', gdp1960: 250, energy1960: 60, techLevel: 5, solarPotential: 0.9, basePopulation: 15, capital: 'au_eastern',
    description: 'Isolated, safe and sitting on uranium and endless sunshine.', specialBonus: 'Enemy ops -40%, +20% Nuclear, rich uranium' },
];

export function continentById(id: string | null | undefined): ContinentData | undefined {
  return continents.find(c => c.id === id);
}

// ═══════════════════════════════════════════════════════════════════════════
//  TERRAIN
// ═══════════════════════════════════════════════════════════════════════════

export const terrainInfo: Record<Terrain, { name: string; color: string; top: string; note: string }> = {
  water:   { name: 'Sea',        color: '#0B2530', top: '#0F3342', note: 'Cannot be built on. Tiles next to it are coast.' },
  plains:  { name: 'Plains',     color: '#34422A', top: '#4A5C33', note: 'Good all-round land.' },
  fertile: { name: 'River Valley', color: '#2C4D2F', top: '#3E7040', note: 'Farms +50%. Nuclear plants can cool here.' },
  forest:  { name: 'Forest',     color: '#1E3826', top: '#284D31', note: 'Absorbs CO₂. Building here clears the forest.' },
  hills:   { name: 'Hills',      color: '#433B33', top: '#5A4F43', note: 'Farms -40%. Often holds mineral deposits.' },
  desert:  { name: 'Desert',     color: '#6A5632', top: '#86703F', note: 'Solar +60%. Farms -70%.' },
  tundra:  { name: 'Tundra',     color: '#46525E', top: '#5E6D7C', note: 'Free cooling: compute uses 25% less energy. Farms -70%.' },
};

export const depositInfo = {
  coal:    { name: 'Coal seam',     icon: '⛏', color: '#9CA3AF', note: 'Coal plant +50%, Kombinat +20%' },
  uranium: { name: 'Uranium ore',   icon: '☢', color: '#A3E635', note: 'Nuclear plant +40%' },
  silicon: { name: 'Silica & rare earths', icon: '◆', color: '#67E8F9', note: 'Chip foundry +50%' },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
//  BUILDINGS
// ═══════════════════════════════════════════════════════════════════════════

export const buildings: BuildingData[] = [
  // People
  { id: 'housing', name: 'Housing Block', short: 'Housing', category: 'people', icon: '🏘', cost: 70, upkeep: 3, buildTime: 0.5, jobs: 0.5, energyUse: 4, energyProduce: 0, emissions: 0.5,
    description: 'Homes for a growing population. Without room, growth stops and people get angry.',
    placement: 'Happier next to schools, hospitals, markets and forest. Unhappy next to smoke.' },
  { id: 'farm', name: 'Collective Farm', short: 'Farm', category: 'people', icon: '🌾', cost: 60, upkeep: 2, buildTime: 0.5, jobs: 3, energyUse: 2, energyProduce: 0, emissions: 1.5,
    description: 'Feeds the nation. Hunger means shrinking population and riots.',
    placement: 'River valley +50%. +10% per neighbouring farm. Hills, desert and tundra are poor.' },
  { id: 'hospital', name: 'Hospital', short: 'Hospital', category: 'people', icon: '🏥', cost: 120, upkeep: 8, buildTime: 1, jobs: 1.5, energyUse: 6, energyProduce: 0, emissions: 0.3,
    description: 'Health coverage: healthier growth, higher approval and protection from pandemics.',
    placement: '+25% next to housing.' },
  { id: 'school', name: 'School District', short: 'School', category: 'people', icon: '📚', cost: 80, upkeep: 5, buildTime: 0.75, jobs: 1.5, energyUse: 3, energyProduce: 0, emissions: 0.2,
    description: 'Raises the education level, which multiplies productivity and research.',
    placement: '+25% next to housing.' },
  { id: 'uni', name: 'University', short: 'University', category: 'science', icon: '🎓', cost: 200, upkeep: 12, buildTime: 1.5, jobs: 1.5, energyUse: 8, energyProduce: 0, emissions: 0.3, requiresTech: 'mass_edu',
    description: 'Higher education and research. Needed to push education above 70.',
    placement: '+15% per neighbouring university or research institute (max +45%).' },

  // Economy
  { id: 'factory', name: 'Industrial Kombinat', short: 'Kombinat', category: 'economy', icon: '🏭', cost: 150, upkeep: 8, buildTime: 1, jobs: 8, energyUse: 20, energyProduce: 0, emissions: 6,
    description: 'Mass employment and production. The backbone of the economy — and of the smog.',
    placement: '+20% next to a seaport or market. +20% on a coal seam. Pollutes neighbours.' },
  { id: 'market', name: 'Market Hall', short: 'Market', category: 'economy', icon: '🛒', cost: 90, upkeep: 3, buildTime: 0.5, jobs: 4, energyUse: 4, energyProduce: 0, emissions: 0.5,
    description: 'Services and commerce: jobs, GDP and happier neighbourhoods.',
    placement: '+10% per neighbouring housing block (max +40%).' },
  { id: 'seaport', name: 'Seaport', short: 'Seaport', category: 'economy', icon: '⚓', cost: 260, upkeep: 10, buildTime: 1.5, jobs: 5, energyUse: 10, energyProduce: 0, emissions: 3, requiresTech: 'container',
    description: 'World trade. Big GDP, and every trade treaty pays more.',
    placement: 'Coast only. +15% per neighbouring kombinat (max +45%).' },
  { id: 'chipfab', name: 'Chip Foundry', short: 'Foundry', category: 'economy', icon: '🔧', cost: 1500, upkeep: 30, buildTime: 2, jobs: 2, energyUse: 60, energyProduce: 0, emissions: 4, requiresTech: 'litho',
    description: 'Semiconductors. Each foundry boosts ALL your compute by +12% (max 4) and adds GDP.',
    placement: '+50% on silica deposit. Compute buildings next to it get +15%.' },
  { id: 'robot', name: 'Robotics Plant', short: 'Robotics', category: 'economy', icon: '🤖', cost: 3500, upkeep: 60, buildTime: 1.5, jobs: 0.5, energyUse: 40, energyProduce: 0, emissions: 1, requiresTech: 'robotics',
    description: 'Automation: fills labour shortages with robots and adds GDP. Can cause unemployment.',
    placement: 'Kombinats next to it get +30%.' },

  // Energy
  { id: 'coal', name: 'Coal Power Station', short: 'Coal', category: 'energy', icon: '🏭', cost: 120, upkeep: 6, buildTime: 1, jobs: 1, energyUse: 0, energyProduce: 100, emissions: 22,
    description: 'Cheap, fast, filthy. The biggest driver of climate change.',
    placement: '+50% on a coal seam. Pollutes neighbours.' },
  { id: 'nuclear', name: 'Nuclear Plant', short: 'Nuclear', category: 'energy', icon: '⚛', cost: 650, upkeep: 20, buildTime: 3, jobs: 1, energyUse: 0, energyProduce: 280, emissions: 0, requiresTech: 'nuclear',
    description: 'Huge clean baseload. Slow and expensive to build.',
    placement: 'Needs cooling water: coast or river valley. +40% on uranium.' },
  { id: 'solar', name: 'Solar Array', short: 'Solar', category: 'energy', icon: '☀', cost: 280, upkeep: 4, buildTime: 1, jobs: 0.3, energyUse: 0, energyProduce: 70, emissions: 0, requiresTech: 'solar',
    description: 'Clean energy from the sun. Output depends on your climate.',
    placement: 'Desert +60%, tundra -50%. Scales with your continent\'s sunshine.' },
  { id: 'fusion', name: 'Fusion Reactor', short: 'Fusion', category: 'energy', icon: '✺', cost: 6000, upkeep: 80, buildTime: 3, jobs: 1, energyUse: 0, energyProduce: 1400, emissions: 0, requiresTech: 'fusion',
    description: 'A star in a bottle. Enormous clean power for the final race.',
    placement: 'Anywhere.' },

  // Science & compute
  { id: 'lab', name: 'Research Institute', short: 'Institute', category: 'science', icon: '🔬', cost: 120, upkeep: 10, buildTime: 1, jobs: 0.8, energyUse: 5, energyProduce: 0, emissions: 0.2, requiresTech: 'transistor',
    description: 'Produces research points and a first trickle of compute.',
    placement: '+20% per neighbouring university, institute or data center (max +60%).' },
  { id: 'satellite', name: 'Space Center', short: 'Space', category: 'science', icon: '🛰', cost: 800, upkeep: 30, buildTime: 2, jobs: 0.8, energyUse: 15, energyProduce: 0, emissions: 1, requiresTech: 'space',
    description: 'Satellites: research, and +20% success for every covert operation.',
    placement: 'Anywhere.' },
  { id: 'mainframe', name: 'Mainframe Center', short: 'Mainframe', category: 'compute', icon: '💻', cost: 300, upkeep: 12, buildTime: 1, jobs: 0.6, energyUse: 10, energyProduce: 0, emissions: 0.3, requiresTech: 'ic',
    description: 'Early computing: 1 GigaFLOP.', placement: 'Compute: +10% next to a power plant, +15% next to a foundry. Tundra halves nothing but saves energy.' },
  { id: 'super', name: 'Supercomputer', short: 'Super', category: 'compute', icon: '🖥', cost: 900, upkeep: 40, buildTime: 1.5, jobs: 0.6, energyUse: 30, energyProduce: 0, emissions: 0.5, requiresTech: 'vector',
    description: 'Vector supercomputing: 1 TeraFLOP.', placement: 'Compute: +10% next to a power plant, +15% next to a foundry.' },
  { id: 'datacenter', name: 'Data Center', short: 'Data Ctr', category: 'compute', icon: '🗄', cost: 2500, upkeep: 70, buildTime: 1.5, jobs: 1, energyUse: 80, energyProduce: 0, emissions: 1, requiresTech: 'web',
    description: 'The cloud: 1 PetaFLOP and digital GDP.', placement: 'Compute: +10% next to a power plant, +15% next to a foundry. Tundra/coast: -25% energy.' },
  { id: 'gpucluster', name: 'GPU Cluster', short: 'GPU', category: 'compute', icon: '⚡', cost: 4500, upkeep: 150, buildTime: 1.5, jobs: 1, energyUse: 250, energyProduce: 0, emissions: 1, requiresTech: 'gpu',
    description: 'Parallel training: 1 ExaFLOP.', placement: 'Compute: +10% next to a power plant, +15% next to a foundry. Tundra/coast: -25% energy.' },
  { id: 'aifactory', name: 'AI Gigafactory', short: 'AI Giga', category: 'compute', icon: '🤖', cost: 12000, upkeep: 450, buildTime: 2.5, jobs: 1.5, energyUse: 700, energyProduce: 0, emissions: 2, requiresTech: 'scaling',
    description: 'Frontier training megaproject: 1 ZettaFLOP. Enormous power hunger.', placement: 'Compute: +10% next to a power plant, +15% next to a foundry. Tundra/coast: -25% energy.' },

  // Safety
  { id: 'defense', name: 'AI Safety Institute', short: 'Safety', category: 'safety', icon: '🛡', cost: 450, upkeep: 25, buildTime: 1, jobs: 0.5, energyUse: 5, energyProduce: 0, emissions: 0.2, requiresTech: 'cybernetics',
    description: 'Alignment research and cyber-defence. Keeps your AI safe and blocks enemy operations.',
    placement: '+25% next to an institute, university or compute building.' },
];

export const buildingById: Record<BuildingId, BuildingData> = Object.fromEntries(buildings.map(b => [b.id, b])) as Record<BuildingId, BuildingData>;

/** Raw FLOPS per operational building at level 1. */
export const COMPUTE_FLOPS: Partial<Record<BuildingId, number>> = {
  lab: 1e6, mainframe: 1e9, super: 1e12, datacenter: 1e15, gpucluster: 1e18, aifactory: 1e21,
};

/** $B of GDP per year added by sector buildings at level 1. */
export const SECTOR_GDP: Partial<Record<BuildingId, number>> = {
  factory: 60, market: 30, seaport: 90, chipfab: 120, robot: 250, datacenter: 150, gpucluster: 400, aifactory: 1500, satellite: 20,
};

export const LEVEL_MULT = [0, 1, 2.2, 3.6];
export const MAX_LEVEL = 3;
export const CATEGORY_COLOR: Record<string, string> = {
  people: '#86EFAC', economy: '#FFB84D', energy: '#00E5A0', science: '#A78BFA', compute: '#00F0FF', safety: '#FF477E',
};
export const CATEGORY_LABEL: Record<string, string> = {
  people: 'PEOPLE', economy: 'ECONOMY', energy: 'ENERGY', science: 'SCIENCE', compute: 'COMPUTE', safety: 'SAFETY',
};

export const SPRITE_FOR: Record<BuildingId, string> = {
  housing: 'terra-city.png', hospital: 'terra-city.png',
  school: 'terra-university.png', uni: 'terra-university.png',
  farm: 'terra-farm.png',
  factory: 'terra-factory.png', chipfab: 'terra-factory.png',
  market: 'terra-market.png', seaport: 'terra-seaport.png',
  coal: 'terra-power-plant.png', nuclear: 'terra-power-plant.png', fusion: 'terra-power-plant.png', solar: '',
  lab: 'terra-lab.png', satellite: 'terra-lab.png',
  mainframe: 'terra-datacenter.png', super: 'terra-datacenter.png', datacenter: 'terra-datacenter.png', gpucluster: 'terra-datacenter.png',
  aifactory: 'terra-ai-factory.png', robot: 'terra-ai-factory.png',
  defense: 'terra-defense-bunker.png',
};

// ═══════════════════════════════════════════════════════════════════════════
//  TECHNOLOGY — researching before the historical year costs +6% per year early
// ═══════════════════════════════════════════════════════════════════════════

export const techs: TechData[] = [
  // Era 1 — Atomic Age
  { id: 'transistor', name: 'Transistor', year: 1960, era: 1, cost: 60, requires: [], computeMult: 1.5, unlocks: ['lab'],
    effect: 'Unlocks Research Institute · compute ×1.5', description: 'The switch that started everything.' },
  { id: 'mass_edu', name: 'Mass Higher Education', year: 1962, era: 1, cost: 90, requires: [], unlocks: ['uni'],
    effect: 'Unlocks University · schools +20%', description: 'Universities open their doors to millions.' },
  { id: 'nuclear', name: 'Atoms for Peace', year: 1960, era: 1, cost: 140, requires: [], unlocks: ['nuclear'],
    effect: 'Unlocks Nuclear Plant', description: 'Civil nuclear power: clean, massive, slow to build.' },
  { id: 'greenrev', name: 'Green Revolution', year: 1965, era: 1, cost: 120, requires: [],
    effect: 'All farms +40%', description: 'High-yield crops and fertilisers.' },
  { id: 'space', name: 'Space Program', year: 1962, era: 1, cost: 220, requires: ['transistor'], unlocks: ['satellite'],
    effect: 'Unlocks Space Center', description: 'Rockets, satellites and eyes in the sky.' },
  { id: 'ic', name: 'Integrated Circuits', year: 1965, era: 1, cost: 200, requires: ['transistor'], computeMult: 2, unlocks: ['mainframe'],
    effect: 'Unlocks Mainframe · compute ×2', description: 'Many transistors on one chip.' },
  { id: 'container', name: 'Containerization', year: 1966, era: 1, cost: 150, requires: [], unlocks: ['seaport'],
    effect: 'Unlocks Seaport', description: 'The humble box that globalised the world.' },

  // Era 2 — Silicon Age
  { id: 'cybernetics', name: 'Cybernetics & Control', year: 1970, era: 2, cost: 260, requires: ['ic'], unlocks: ['defense'],
    effect: 'Unlocks AI Safety Institute', description: 'Feedback, control — and the first worries about machines that decide.' },
  { id: 'envprot', name: 'Environmental Protection', year: 1970, era: 2, cost: 240, requires: [],
    effect: 'Coal & kombinat emissions -30% · smog halved', description: 'Scrubbers, filters and clean-air laws.' },
  { id: 'micro', name: 'Microprocessor', year: 1971, era: 2, cost: 420, requires: ['ic'], computeMult: 2,
    effect: 'Compute ×2', description: 'A whole CPU on a single chip.' },
  { id: 'solar', name: 'Photovoltaics', year: 1975, era: 2, cost: 320, requires: ['transistor'], unlocks: ['solar'],
    effect: 'Unlocks Solar Array', description: 'Electricity straight from sunlight.' },
  { id: 'vector', name: 'Vector Supercomputers', year: 1976, era: 2, cost: 600, requires: ['micro'], unlocks: ['super'],
    effect: 'Unlocks Supercomputer', description: 'Cray-class machines for science and state.' },
  { id: 'litho', name: 'Semiconductor Lithography', year: 1977, era: 2, cost: 650, requires: ['micro'], unlocks: ['chipfab'],
    effect: 'Unlocks Chip Foundry', description: 'Printing circuits with light.' },
  { id: 'pc', name: 'Personal Computer', year: 1981, era: 2, cost: 800, requires: ['micro'],
    effect: 'GDP +10% · education +10% faster', description: 'A computer on every desk.' },

  // Era 3 — Digital Age
  { id: 'internet', name: 'Internet', year: 1983, era: 3, cost: 1000, requires: ['pc'],
    effect: 'Research +15%', description: 'A network of networks.' },
  { id: 'backprop', name: 'Backpropagation', year: 1986, era: 3, cost: 1000, requires: ['micro'], computeMult: 1.5,
    effect: 'Compute ×1.5 · research +10%', description: 'Neural networks learn from their errors.' },
  { id: 'climate', name: 'Climate Science', year: 1988, era: 3, cost: 700, requires: [],
    effect: 'Unlocks CLIMATE ACCORD diplomacy', description: 'The IPCC measures what we are doing to the planet.' },
  { id: 'web', name: 'World Wide Web', year: 1991, era: 3, cost: 1500, requires: ['internet'], unlocks: ['datacenter'],
    effect: 'Unlocks Data Center · GDP +10%', description: 'Hyperlinked knowledge for everyone.' },
  { id: 'renew', name: 'Wind & Grid Storage', year: 2005, era: 3, cost: 2400, requires: ['solar'],
    effect: 'Solar +50% · clean grid', description: 'Turbines and batteries make renewables reliable.' },

  // Era 4 — AI Era
  { id: 'gpu', name: 'GPU Computing', year: 2006, era: 4, cost: 3000, requires: ['web', 'backprop'], computeMult: 2, unlocks: ['gpucluster'],
    effect: 'Unlocks GPU Cluster · compute ×2', description: 'Graphics chips turn into AI engines.' },
  { id: 'dl', name: 'Deep Learning', year: 2012, era: 4, cost: 4500, requires: ['gpu'], computeMult: 2,
    effect: 'Compute ×2 · compute now generates research', description: 'Deep nets crush every benchmark.' },
  { id: 'robotics', name: 'Industrial Robotics', year: 2013, era: 4, cost: 3500, requires: ['dl'], unlocks: ['robot'],
    effect: 'Unlocks Robotics Plant', description: 'Machines that build machines.' },
  { id: 'alignment', name: 'Alignment Research', year: 2014, era: 4, cost: 3000, requires: ['cybernetics', 'dl'],
    effect: 'Safety Institutes +50% · unlocks AI SAFETY TREATY', description: 'How do we make AI want what we want?' },
  { id: 'transformer', name: 'Transformers', year: 2017, era: 4, cost: 6000, requires: ['dl'], computeMult: 3,
    effect: 'Compute ×3', description: 'Attention is all you need.' },
  { id: 'scaling', name: 'Scaling Laws', year: 2020, era: 4, cost: 9000, requires: ['transformer'], computeMult: 1.5, unlocks: ['aifactory'],
    effect: 'Unlocks AI Gigafactory · compute ×1.5', description: 'Bigger is predictably better.' },

  // Era 5 — Intelligence Explosion
  { id: 'interp', name: 'Interpretability', year: 2023, era: 5, cost: 8000, requires: ['alignment', 'transformer'],
    effect: 'Safety Institutes +50% · alignment pressure -25%', description: 'Reading the mind of the machine.' },
  { id: 'agentic', name: 'Agentic AI', year: 2025, era: 5, cost: 17000, requires: ['scaling'], computeMult: 2,
    effect: 'Compute ×2 · GDP +15% · research +20%', description: 'AI that plans and acts.' },
  { id: 'fusion', name: 'Fusion Power', year: 2030, era: 5, cost: 15000, requires: ['nuclear', 'renew'], unlocks: ['fusion'],
    effect: 'Unlocks Fusion Reactor', description: 'Limitless clean energy, at last.' },
  { id: 'agi', name: 'Artificial General Intelligence', year: 2029, era: 5, cost: 27000, requires: ['agentic', 'interp'], computeMult: 2,
    effect: 'Compute ×2 · research ×1.5', description: 'A mind as general as ours.' },
  { id: 'asi', name: 'Superintelligence Theory', year: 2033, era: 5, cost: 40000, requires: ['agi'],
    effect: 'Enables the ASI IGNITION when compute reaches 1 YottaFLOP', description: 'The last invention humanity needs to make.' },
];

export const techById: Record<string, TechData> = Object.fromEntries(techs.map(t => [t.id, t]));
export const ERA_NAMES = ['', 'Atomic Age', 'Silicon Age', 'Digital Age', 'AI Era', 'Intelligence Explosion'];

// ═══════════════════════════════════════════════════════════════════════════
//  VICTORY THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════

export const ASI_CAPABILITY = 24; // log10 FLOPS = 1 YottaFLOP
export const SAFE_ALIGNMENT = 80;
export const END_YEAR = 2040;

// ═══════════════════════════════════════════════════════════════════════════
//  HISTORICAL EVENTS — every event is a decision or a breakthrough exercise
// ═══════════════════════════════════════════════════════════════════════════

const card = (name: string) => `./assets/cards/event-${name}.png`;

export const historicalEvents: GameEvent[] = [
  { id: 'turing', name: 'The Turing Legacy', year: 1961, type: 'info', card: card('turing'), minigame: 'turing',
    description: 'Turing asked "Can machines think?". Your cryptographers reopen his Bombe to train a new generation of computer scientists.',
    choices: [] },
  { id: 'perceptron', name: 'The Perceptron', year: 1963, type: 'info', card: card('perceptron'), minigame: 'perceptron',
    description: 'Rosenblatt\'s machine learns to separate patterns by adjusting weights. Can your engineers tune one by hand?',
    choices: [] },
  { id: 'lisp', name: 'LISP', year: 1966, type: 'info', card: card('lisp'), minigame: 'lisp',
    description: 'McCarthy\'s language of lists becomes the lingua franca of AI labs.',
    choices: [] },
  { id: 'greenrev', name: 'Green Revolution', year: 1967, type: 'info', card: card('greenrev'),
    description: 'High-yield seeds promise to end famine — at the cost of fertiliser-hungry monocultures.',
    choices: [
      { label: 'Adopt high-yield seeds', detail: 'Farms +20% permanently · emissions +3/yr', effect: 'greenrev_adopt' },
      { label: 'Protect traditional farming', detail: 'Approval +6 for 8 years', effect: 'greenrev_trad' },
    ] },
  { id: 'ml', name: 'Samuel\'s Learning Machine', year: 1969, type: 'info', card: card('ml'), minigame: 'samuel',
    description: 'A checkers program that improves by playing itself coins the term "machine learning".',
    choices: [] },
  { id: 'moore', name: 'Moore\'s Law', year: 1972, type: 'info', card: card('moore'), minigame: 'moore',
    description: 'Transistor counts double every two years. Route the circuits of the next generation chip.',
    choices: [] },
  { id: 'oil1973', name: '1973 Oil Crisis', year: 1973, type: 'danger', card: card('oil1973'),
    description: 'An embargo quadruples oil prices. Factories idle, queues form at every station.',
    choices: [
      { label: 'Ration fuel', detail: 'Energy demand -10% for 5 years · approval -8 for 5 years', effect: 'oil_ration' },
      { label: 'Pay the market price', detail: 'Lose 30% of current budget', effect: 'oil_pay' },
      { label: 'Nuclear independence', detail: 'Needs 1 nuclear plant: no penalty, approval +4', effect: 'oil_nuclear', requires: 'has_nuclear' },
    ] },
  { id: 'foodcrisis', name: 'World Food Crisis', year: 1974, type: 'warning', card: card('foodcrisis'),
    description: 'Droughts and price spikes bring famine to several regions of the world.',
    choices: [
      { label: 'Send food aid', detail: '-$150B · relations +12 with every bloc', effect: 'food_aid', cost: 150 },
      { label: 'Protect our reserves', detail: 'Relations -6 with every bloc', effect: 'food_protect' },
    ] },
  { id: 'aiwinter1', name: 'The First AI Winter', year: 1975, type: 'warning', card: card('aiwinter1'),
    description: 'Promises were too big. Governments everywhere slash AI funding.',
    choices: [
      { label: 'Keep funding AI', detail: '-$200B · research +15% for 6 years', effect: 'winter_fund', cost: 200 },
      { label: 'Cut the programs', detail: '+$200B now · research -20% for 6 years', effect: 'winter_cut' },
    ] },
  { id: 'expert', name: 'Expert Systems Boom', year: 1983, type: 'info', card: card('expert'),
    description: 'Rule-based systems like MYCIN promise to bottle human expertise.',
    choices: [
      { label: 'Invest in expert systems', detail: '-$400B · GDP +8% for 6 years', effect: 'expert_invest', cost: 400 },
      { label: 'Wait and see', detail: 'Research +10% for 6 years (cheaper academic route)', effect: 'expert_wait' },
    ] },
  { id: 'auto86', name: 'The Driverless Van', year: 1986, type: 'info', card: card('auto86'),
    description: 'A Mercedes van drives itself down the autobahn. Machines can see.',
    choices: [
      { label: 'Fund machine vision', detail: '+600 research points', effect: 'rp_600' },
      { label: 'License it to industry', detail: '+$350B', effect: 'cash_350' },
    ] },
  { id: 'coldwar91', name: 'End of the Cold War', year: 1991, type: 'info', card: card('coldwar91'),
    description: 'The Iron Curtain falls. Budgets and scientists are suddenly free.',
    choices: [
      { label: 'Peace dividend', detail: '+$700B · relations +10 with everyone', effect: 'peace_dividend' },
      { label: 'Hire the defence scientists', detail: '+2,500 research points', effect: 'rp_2500' },
    ] },
  { id: 'deepblue', name: 'Deep Blue vs Kasparov', year: 1997, type: 'info', card: card('deepblue'), minigame: 'deepblue',
    description: 'A machine challenges the world chess champion. Help Deep Blue find the winning lines.',
    choices: [] },
  { id: 'dotcom', name: 'Dot-com Crash', year: 2000, type: 'danger', card: card('dotcom'),
    description: 'The internet bubble bursts. Paper fortunes vanish overnight.',
    choices: [
      { label: 'Bail out the tech sector', detail: '-35% budget · data-center upkeep -30% for 5 yrs', effect: 'dotcom_bailout' },
      { label: 'Let it burn', detail: 'GDP -10% for 4 years · approval -5', effect: 'dotcom_burn' },
    ] },
  { id: 'sep11', name: 'September 11', year: 2001, type: 'danger', card: card('sep11'),
    description: 'Terror strikes. Security becomes the priority of every government.',
    choices: [
      { label: 'Build the security state', detail: '+10 alignment (cyber) · approval -6 for 6 years', effect: 'sec_state' },
      { label: 'Defend civil liberties', detail: 'Approval +5 for 6 years', effect: 'sec_liberty' },
    ] },
  { id: 'chinaWTO', name: 'China Joins the WTO', year: 2001, type: 'info', card: card('chinawto'),
    description: 'The factory of the world opens its doors to global trade.',
    choices: [
      { label: 'Embrace globalisation', detail: 'GDP +8% for 8 years · kombinat jobs leave: unemployment rises', effect: 'wto_embrace' },
      { label: 'Protect our industry', detail: 'Relations -8 with China · no change', effect: 'wto_protect' },
    ] },
  { id: 'crisis08', name: '2008 Financial Crisis', year: 2008, type: 'danger', card: card('crisis08'),
    description: 'Banks collapse, credit freezes, the world economy stalls.',
    choices: [
      { label: 'Massive stimulus', detail: '-40% budget · avoids recession', effect: 'crisis_stimulus' },
      { label: 'Austerity', detail: '+$500B · GDP -12% for 4 years · approval -10 for 4 years', effect: 'crisis_austerity' },
    ] },
  { id: 'pandemic', name: 'Swine Flu', year: 2009, type: 'warning', card: card('swineflu'),
    description: 'A new influenza strain spreads around the world.',
    choices: [
      { label: 'Mass vaccination', detail: '-$300B · safe if you have hospitals', effect: 'flu_vaccinate', cost: 300 },
      { label: 'Ride it out', detail: 'Population -1% (less with hospitals) · approval -5', effect: 'flu_ride' },
    ] },
  { id: 'watson', name: 'Watson Wins Jeopardy!', year: 2011, type: 'info', card: card('watson'),
    description: 'A question-answering machine beats the best human quiz champions.',
    choices: [
      { label: 'Adopt it in hospitals', detail: 'Hospitals +30% · +$200B', effect: 'watson_health' },
      { label: 'Study the architecture', detail: '+4,000 research points', effect: 'rp_4000' },
    ] },
  { id: 'alexnet', name: 'The Deep Learning Revolution', year: 2012, type: 'info', card: card('alexnet'),
    description: 'AlexNet wins ImageNet by a landslide. GPUs + data + deep nets = magic.',
    choices: [
      { label: 'Fund GPU research', detail: 'GPU clusters -30% cost for 8 years', effect: 'alexnet_gpu' },
      { label: 'Fund AI education', detail: 'Education +6 · research +10% for 8 years', effect: 'alexnet_edu' },
    ] },
  { id: 'alphago', name: 'AlphaGo vs Lee Sedol', year: 2016, type: 'info', card: card('alphago'), minigame: 'alphago',
    description: 'Move 37. A machine plays Go with something that looks like intuition.',
    choices: [] },
  { id: 'transformers', name: 'Attention Is All You Need', year: 2017, type: 'info', card: card('transformers'), minigame: 'attention',
    description: 'The Transformer architecture changes AI forever.',
    choices: [] },
  { id: 'covid', name: 'COVID-19 Pandemic', year: 2020, type: 'danger', card: card('covid'),
    description: 'A pandemic shuts the world down — and moves life online.',
    choices: [
      { label: 'Strict lockdown', detail: 'GDP -12% for 2 years · population protected', effect: 'covid_lockdown' },
      { label: 'Stay open', detail: 'Population -1.5% (hospitals reduce it) · approval -12 for 3 years', effect: 'covid_open' },
    ] },
  { id: 'gpt3', name: 'GPT-3: 175 Billion Parameters', year: 2020, type: 'info', card: card('gpt3'),
    description: 'Scale alone produces startling new abilities.',
    choices: [
      { label: 'Race to scale', detail: '+8,000 research points · alignment -6', effect: 'gpt3_race' },
      { label: 'Study it carefully', detail: 'Alignment +8', effect: 'gpt3_careful' },
    ] },
  { id: 'chipwar', name: 'The Chip War', year: 2022, type: 'warning', card: card('chipwar'),
    description: 'Export controls split the semiconductor world in two.',
    choices: [
      { label: 'Build domestic foundries', detail: 'Chip foundries -40% cost for 8 years', effect: 'chip_domestic' },
      { label: 'Buy on the grey market', detail: '-$1,500B · relations -5 with everyone', effect: 'chip_grey', cost: 1500 },
    ] },
  { id: 'ukraine', name: 'War in Ukraine', year: 2022, type: 'danger', card: card('ukraine'),
    description: 'War in Europe triggers an energy shock across the world.',
    choices: [
      { label: 'Emergency renewables', detail: 'Solar & nuclear -30% cost for 6 years · energy supply -10% for 2 yrs', effect: 'ukr_renew' },
      { label: 'Burn more coal', detail: 'No shortage · emissions +40/yr for 6 years', effect: 'ukr_coal' },
    ] },
  { id: 'chatgpt', name: 'ChatGPT', year: 2022, type: 'info', card: card('chatgpt'),
    description: 'A chatbot reaches 100 million people in two months.',
    choices: [
      { label: 'AI in every office', detail: 'GDP +10% for 10 years · approval -4 (job fears)', effect: 'chatgpt_office' },
      { label: 'AI in every classroom', detail: 'Education +8', effect: 'chatgpt_school' },
    ] },
  { id: 'aiboom', name: 'AI Investment Boom', year: 2023, type: 'info', card: card('aiboom'),
    description: 'Trillions of dollars pour into AI. Everyone wants a frontier lab.',
    choices: [
      { label: 'Ride the boom', detail: '+$6,000B · alignment -8', effect: 'boom_ride' },
      { label: 'Measured growth', detail: '+$2,000B · alignment +6', effect: 'boom_measured' },
    ] },
  { id: 'multimodal', name: 'The AGI Race', year: 2024, type: 'warning', card: card('multimodal'),
    description: 'Every bloc now openly races for AGI. The stakes could not be higher.',
    choices: [
      { label: 'Call for a safety summit', detail: 'Relations +8 with all · everyone\'s alignment +5', effect: 'summit' },
      { label: 'Go all-in', detail: 'Research +25% for 5 years · alignment -10', effect: 'allin' },
    ] },
  { id: 'agents', name: 'AI Agents', year: 2025, type: 'info', card: card('agents'),
    description: 'Autonomous agents begin to plan and execute long tasks.',
    choices: [
      { label: 'Automate the state', detail: 'Upkeep -15% for 10 years · approval -4', effect: 'agents_state' },
      { label: 'Keep a human in the loop', detail: 'Alignment +6', effect: 'agents_human' },
    ] },
  { id: 'quantum', name: 'Quantum Advantage', year: 2026, type: 'info', card: card('quantum'),
    description: 'Quantum processors beat classical ones at useful problems.',
    choices: [
      { label: 'Quantum chemistry', detail: 'Solar +20% & farms +15% permanently', effect: 'quantum_chem' },
      { label: 'Quantum cryptanalysis', detail: 'Covert ops +25% success permanently', effect: 'quantum_crypto' },
    ] },
  { id: 'beyondmoore', name: 'Beyond Moore\'s Law', year: 2027, type: 'warning', card: card('beyondmoore'),
    description: 'AI compute now doubles every six months. The final sprint begins.',
    choices: [
      { label: 'Maximum acceleration', detail: 'Compute ×1.5 permanently · alignment -12', effect: 'moore_max' },
      { label: 'Compute governance', detail: 'Alignment +10 · everyone\'s capability race slows', effect: 'moore_govern' },
    ] },
];

/** Minigames of the events that happen before a Strategist start (1980) are replayed as "archives". */
export const ARCHIVE_MINIGAMES_STRATEGIST = ['turing', 'moore'];

export const BONUS = {
  na: { research: 1.25 },
  eu: { techCost: 0.85, approval: 4 },
  su: { industry: 1.3 },
  cn: { buildTime: 0.75, factory: 1.2 },
  af: { solar: 1.6, regionCost: 0.6 },
  sa: { farms: 1.25, solar: 1.25, forestSink: 2 },
  in: { education: 1.4, research: 1.15 },
  oc: { enemyOps: 0.6, nuclear: 1.2 },
} as const;
