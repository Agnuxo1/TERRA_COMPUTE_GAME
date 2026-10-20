// Heat-map layers for the continent map. Pure functions: the result is memoised by RTSMap and
// drawn as a translucent tint by MapRenderer, so nothing here runs per animation frame.

import { housingComfort, operational, type Placement } from '../../../game/engine';
import { neighbourTiles } from '../../../game/mapgen';
import { buildingById } from '../../../game/data';
import type { BuildingId, GameState, Tile } from '../../../game/types';
import { t } from '../../../i18n';

export type HeatLayer = 'none' | 'power' | 'pollution' | 'happiness' | 'placement';
export const HEAT_LAYERS: HeatLayer[] = ['none', 'power', 'pollution', 'happiness', 'placement'];

/** CSS colour per tile id; null means no tint. */
export type HeatColours = Array<string | null>;

// Same smoke rule as evaluatePlacement / housingComfort in engine.ts.
const SMOKE: BuildingId[] = ['coal', 'factory', 'chipfab'];

const GREEN = '0,229,160';
const AMBER = '255,184,77';
const ROSE = '255,71,126';
const GREY = '200,206,216';
const rgba = (rgb: string, a: number) => `rgba(${rgb},${a.toFixed(3)})`;

/** Tint for every tile of the selected layer; null when no layer is active. */
export function computeHeat(s: GameState, layer: HeatLayer, placements: Map<number, Placement> | null): HeatColours | null {
  if (layer === 'none' || !s.map) return null;
  const map = s.map;
  const out: HeatColours = new Array<string | null>(map.tiles.length).fill(null);
  const owned = new Set(s.ownedRegions);
  const isOwned = (tile: Tile) => !!tile.region && owned.has(tile.region);

  if (layer === 'placement') {
    if (!s.placing || !placements) return out;
    for (const [id, p] of placements) {
      if (!p.ok) continue;
      out[id] = p.mult >= 1.3 ? rgba(GREEN, 0.5)
        : p.mult >= 1.05 ? rgba(GREEN, 0.28)
        : p.mult >= 0.9 ? rgba(AMBER, 0.26)
        : rgba(ROSE, 0.34);
    }
    return out;
  }

  if (layer === 'power') {
    let max = 0;
    for (const tile of map.tiles) {
      const b = tile.building;
      if (!b || !operational(b)) continue;
      const d = buildingById[b.type];
      max = Math.max(max, d.energyProduce, d.energyUse);
    }
    if (max <= 0) return out;
    for (const tile of map.tiles) {
      const b = tile.building;
      if (!b || !operational(b) || !isOwned(tile)) continue;
      const d = buildingById[b.type];
      if (d.energyProduce > 0) out[tile.id] = rgba(GREEN, 0.2 + 0.55 * Math.sqrt(d.energyProduce / max));
      else if (d.energyUse > 0) out[tile.id] = rgba(AMBER, 0.2 + 0.45 * Math.sqrt(d.energyUse / max));
    }
    return out;
  }

  if (layer === 'pollution') {
    const isSource = (tile: Tile) => !!tile.building && tile.building.progress > 0 && SMOKE.includes(tile.building.type);
    const near = new Uint8Array(map.tiles.length);
    for (const src of map.tiles) {
      if (!isSource(src)) continue;
      for (const n of neighbourTiles(map, src)) if (isOwned(n) && !isSource(n)) near[n.id] = Math.min(3, near[n.id] + 1);
    }
    for (const tile of map.tiles) {
      if (!isOwned(tile)) continue;
      if (isSource(tile)) out[tile.id] = rgba(ROSE, 0.6);
      else if (near[tile.id]) out[tile.id] = rgba(ROSE, 0.12 + 0.08 * near[tile.id]);
    }
    return out;
  }

  // happiness: housing comfort of the tile's neighbourhood, range -4..3
  for (const tile of map.tiles) {
    if (!isOwned(tile)) continue;
    const c = housingComfort(s, tile);
    out[tile.id] = c > 0 ? rgba(GREEN, 0.1 + 0.08 * c)
      : c < 0 ? rgba(ROSE, 0.1 - 0.08 * c)
      : rgba(GREY, 0.08);
  }
  return out;
}

export function heatLabel(layer: HeatLayer): string {
  switch (layer) {
    case 'none': return t('None');
    case 'power': return t('Power');
    case 'pollution': return t('Pollution');
    case 'happiness': return t('Happiness');
    case 'placement': return t('Placement');
  }
}

export function heatLegend(layer: HeatLayer, placing: boolean): string {
  switch (layer) {
    case 'power': return t('Green: power produced · Amber: power used');
    case 'pollution': return t('Red: smoke sources · pale red: next to smoke');
    case 'happiness': return t('Green: comfortable housing · Red: unhappy · Grey: neutral');
    case 'placement': return placing ? t('Green: good site · Amber: weak · Red: poor') : t('Pick a building to place to see site quality');
    default: return '';
  }
}
