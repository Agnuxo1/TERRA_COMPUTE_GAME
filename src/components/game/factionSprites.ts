const baseSpriteMap: Record<string, string> = {
  factory: 'terra-factory.png',
  chipfab: 'terra-factory.png',
  coal: 'terra-power-plant.png',
  nuclear: 'terra-power-plant.png',
  solar: 'terra-power-plant.png',
  housing: 'terra-city.png',
  hospital: 'terra-city.png',
  farm: 'terra-farm.png',
  datacenter: 'terra-datacenter.png',
  gpucluster: 'terra-datacenter.png',
  mainframe: 'terra-datacenter.png',
  super: 'terra-datacenter.png',
  aifactory: 'terra-ai-factory.png',
  robot: 'terra-ai-factory.png',
  lab: 'terra-lab.png',
  uni: 'terra-university.png',
  school: 'terra-university.png',
  market: 'terra-market.png',
  seaport: 'terra-seaport.png',
  satellite: 'terra-seaport.png',
  defense: 'terra-defense-bunker.png',
  truck: 'terra-truck.png',
};

const factionSpriteIds = new Set(['na', 'eu', 'su', 'cn', 'af', 'sa', 'in', 'oc']);

export function getFactionSprite(type: string, factionId?: string | null): string | undefined {
  const file = baseSpriteMap[type];
  if (!file) return undefined;
  if (!factionId || !factionSpriteIds.has(factionId)) return `/assets/sprites/${file}`;
  return `/assets/sprites/factions/${factionId}/${file}`;
}
