// Builds the playable tile map of a continent from its real territory polygons.
// Layout: staggered isometric diamonds, which keeps the continent's real orientation.

import { parsePolygon, pointInPolygon, territoriesOf } from './geo.ts';
import { hashString, mulberry32 } from './rng.ts';
import type { Deposit, MapData, Terrain, Tile } from './types.ts';

export const TILE_W = 64;
export const TILE_H = 32;
const TARGET_LAND_TILES = 124;

const DESERT_REGIONS = new Set(['af_north', 'af_egypt', 'as_middle_east', 'au_western', 'as_mongolia', 'as_afghanistan']);
const DRY_REGIONS = new Set(['na_western_us', 'na_central_america', 'sa_peru', 'sa_argentina', 'as_india', 'af_south', 'af_east', 'au_eastern']);
const TUNDRA_REGIONS = new Set(['na_alaska', 'na_nwt', 'na_greenland', 'eu_iceland', 'as_siberia', 'as_yakutsk', 'as_kamchatka']);
const FOREST_REGIONS = new Set(['af_congo', 'sa_brazil', 'au_indonesia', 'au_new_guinea', 'as_siam', 'na_quebec', 'na_ontario', 'eu_scandinavia', 'as_irkutsk', 'sa_venezuela']);

const DEPOSITS: Record<string, Record<Deposit, number>> = {
  na: { coal: 4, uranium: 2, silicon: 2 },
  eu: { coal: 3, uranium: 1, silicon: 1 },
  su: { coal: 6, uranium: 3, silicon: 1 },
  cn: { coal: 5, uranium: 1, silicon: 2 },
  af: { coal: 2, uranium: 3, silicon: 1 },
  sa: { coal: 2, uranium: 1, silicon: 2 },
  in: { coal: 3, uranium: 1, silicon: 1 },
  oc: { coal: 2, uranium: 5, silicon: 1 },
};

const INDIA_REGIONS: Array<{ id: string; name: string }> = [
  { id: 'in_n', name: 'Punjab & Delhi' },
  { id: 'in_e', name: 'Bengal' },
  { id: 'in_w', name: 'Gujarat & Bombay' },
  { id: 'in_c', name: 'Deccan Plateau' },
  { id: 'in_s', name: 'Tamil Nadu' },
];

function polygonArea(poly: Array<[number, number]>): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  return Math.abs(a / 2);
}

/** Screen-space centre of a tile's diamond. */
export function tileCenter(col: number, row: number): [number, number] {
  return [col * TILE_W + (row % 2 ? TILE_W / 2 : 0) + TILE_W / 2, row * (TILE_H / 2) + TILE_H / 2];
}

/** The 4 edge neighbours of a staggered diamond tile (odd rows shifted right). */
export function edgeNeighbours(col: number, row: number): Array<[number, number]> {
  const odd = row % 2 === 1;
  const left = odd ? col : col - 1;
  return [[left, row - 1], [left + 1, row - 1], [left, row + 1], [left + 1, row + 1]];
}

/** 8-neighbourhood: edge neighbours plus the diagonal ones touching at a corner. */
export function allNeighbours(col: number, row: number): Array<[number, number]> {
  return [...edgeNeighbours(col, row), [col - 1, row], [col + 1, row], [col, row - 2], [col, row + 2]];
}

function valueNoise(rng: () => number, cols: number, rows: number, scale: number): number[][] {
  const gw = Math.ceil(cols / scale) + 2;
  const gh = Math.ceil(rows / scale) + 2;
  const grid: number[][] = Array.from({ length: gh }, () => Array.from({ length: gw }, () => rng()));
  const out: number[][] = [];
  for (let r = 0; r < rows; r++) {
    out.push([]);
    for (let c = 0; c < cols; c++) {
      const x = c / scale;
      const y = r / scale;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = x - x0;
      const fy = y - y0;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const a = grid[y0][x0] * (1 - sx) + grid[y0][x0 + 1] * sx;
      const b = grid[y0 + 1][x0] * (1 - sx) + grid[y0 + 1][x0 + 1] * sx;
      out[r].push(a * (1 - sy) + b * sy);
    }
  }
  return out;
}

export function generateContinentMap(continentId: string, seed: number): MapData {
  const rng = mulberry32(seed ^ hashString(continentId));
  const terrs = territoriesOf(continentId).map(t => ({ ...t, poly: parsePolygon(t.path) }));
  const allPts = terrs.flatMap(t => t.poly);
  const minX = Math.min(...allPts.map(p => p[0]));
  const maxX = Math.max(...allPts.map(p => p[0]));
  const minY = Math.min(...allPts.map(p => p[1]));
  const maxY = Math.max(...allPts.map(p => p[1]));
  const area = terrs.reduce((s, t) => s + polygonArea(t.poly), 0);

  // Scale so the continent holds ~TARGET_LAND_TILES tiles (each tile = TILE_W*TILE_H/2 px²).
  const k = Math.sqrt((TARGET_LAND_TILES * TILE_W * TILE_H) / 2 / area);
  const margin = 1;
  const cols = Math.ceil(((maxX - minX) * k) / TILE_W) + margin * 2 + 1;
  const rows = Math.ceil(((maxY - minY) * k) / (TILE_H / 2)) + margin * 4 + 1;
  const toGeo = (col: number, row: number): [number, number] => {
    const [sx, sy] = tileCenter(col, row);
    return [minX + (sx - margin * TILE_W) / k, minY + (sy - margin * TILE_H * 2) / k];
  };

  const elevation = valueNoise(rng, cols, rows, 3.2);
  const moisture = valueNoise(rng, cols, rows, 2.6);

  const tiles: Tile[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const [gx, gy] = toGeo(col, row);
      const terr = terrs.find(t => pointInPolygon(gx, gy, t.poly));
      tiles.push({
        id: row * cols + col,
        col,
        row,
        terrain: terr ? 'plains' : 'water',
        coast: false,
        river: false,
        region: terr ? terr.id : null,
      });
    }
  }
  const at = (c: number, r: number): Tile | undefined =>
    c >= 0 && r >= 0 && c < cols && r < rows ? tiles[r * cols + c] : undefined;

  // Coast flags and distance to sea (for rivers and elevation shaping).
  const land = tiles.filter(t => t.terrain !== 'water');
  for (const t of land) {
    t.coast = allNeighbours(t.col, t.row).some(([c, r]) => {
      const n = at(c, r);
      return !n || n.terrain === 'water';
    });
  }
  const dist = new Map<number, number>();
  let frontier = land.filter(t => t.coast);
  frontier.forEach(t => dist.set(t.id, 0));
  let d = 0;
  while (frontier.length) {
    d++;
    const next: Tile[] = [];
    for (const t of frontier) {
      for (const [c, r] of edgeNeighbours(t.col, t.row)) {
        const n = at(c, r);
        if (n && n.terrain !== 'water' && !dist.has(n.id)) {
          dist.set(n.id, d);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  const elev = (t: Tile) => elevation[t.row][t.col] * 0.7 + Math.min(1, (dist.get(t.id) || 0) / 4) * 0.3;

  // Rivers: walk downhill from high inland tiles to the sea.
  const sources = [...land].filter(t => (dist.get(t.id) || 0) >= 2).sort((a, b) => elev(b) - elev(a));
  const riverCount = Math.max(1, Math.min(4, Math.round(land.length / 30)));
  for (let i = 0; i < riverCount && sources.length; i++) {
    const start = sources.splice(Math.floor(rng() * Math.min(8, sources.length)), 1)[0];
    let cur: Tile | undefined = start;
    const seen = new Set<number>();
    for (let steps = 0; cur && steps < 30 && !seen.has(cur.id); steps++) {
      seen.add(cur.id);
      cur.river = true;
      if (cur.coast) break;
      const options: Tile[] = edgeNeighbours(cur.col, cur.row)
        .map(([c, r]) => at(c, r))
        .filter((n): n is Tile => !!n && n.terrain !== 'water' && !seen.has(n.id));
      if (!options.length) break;
      options.sort((a, b) => (dist.get(a.id) || 0) - (dist.get(b.id) || 0) || elev(a) - elev(b));
      cur = options[rng() < 0.75 ? 0 : Math.min(1, options.length - 1)];
    }
  }

  // Terrain by climate zone + noise.
  for (const t of land) {
    const [, gy] = toGeo(t.col, t.row);
    const e = elev(t);
    const m = moisture[t.row][t.col];
    const region = t.region || '';
    let terrain: Terrain = 'plains';
    if (TUNDRA_REGIONS.has(region) || gy < 62) terrain = m > 0.72 ? 'forest' : 'tundra';
    else if (DESERT_REGIONS.has(region)) terrain = m > 0.8 ? 'plains' : 'desert';
    else if (FOREST_REGIONS.has(region)) terrain = m > 0.35 ? 'forest' : 'plains';
    else if (DRY_REGIONS.has(region)) terrain = m < 0.3 ? 'desert' : m > 0.78 ? 'forest' : 'plains';
    else terrain = m > 0.66 ? 'forest' : 'plains';
    if (e > 0.6 && terrain !== 'tundra' && terrain !== 'desert') terrain = 'hills';
    if (t.river && terrain !== 'tundra') terrain = 'fertile';
    else if (terrain === 'plains' && m > 0.55 && m < 0.62) terrain = 'fertile';
    t.terrain = terrain;
  }

  // Mineral deposits.
  const want = DEPOSITS[continentId] || { coal: 2, uranium: 1, silicon: 1 };
  const pickTile = (pref: Terrain[]): Tile | undefined => {
    const free = land.filter(t => !t.deposit);
    const preferred = free.filter(t => pref.includes(t.terrain));
    const pool = preferred.length ? preferred : free;
    return pool[Math.floor(rng() * pool.length)];
  };
  (Object.keys(want) as Deposit[]).forEach(dep => {
    for (let i = 0; i < want[dep]; i++) {
      const pref: Terrain[] = dep === 'coal' ? ['hills', 'plains', 'forest'] : dep === 'uranium' ? ['hills', 'desert', 'tundra'] : ['desert', 'hills', 'plains'];
      const t = pickTile(pref);
      if (t) t.deposit = dep;
    }
  });

  // India is a single polygon: split it into 5 historical regions by latitude bands.
  if (continentId === 'in') {
    const minRow = Math.min(...land.map(t => t.row));
    const maxRow = Math.max(...land.map(t => t.row));
    for (const t of land) {
      const lat = (t.row - minRow) / Math.max(1, maxRow - minRow);
      const rowTiles = land.filter(o => o.row === t.row).map(o => o.col);
      const mid = (Math.min(...rowTiles) + Math.max(...rowTiles)) / 2;
      t.region = lat < 0.22 ? 'in_n' : lat < 0.5 ? (t.col + (t.row % 2) * 0.5 <= mid ? 'in_w' : 'in_e') : lat < 0.76 ? 'in_c' : 'in_s';
    }
  }

  const regionNames: Record<string, string> = continentId === 'in'
    ? Object.fromEntries(INDIA_REGIONS.map(r => [r.id, r.name]))
    : Object.fromEntries(terrs.map(t => [t.id, t.name]));
  const regions = Object.keys(regionNames)
    .map(id => {
      const ts = land.filter(t => t.region === id);
      const center = ts.length
        ? ts.reduce<[number, number]>((acc, t) => {
          const [x, y] = tileCenter(t.col, t.row);
          return [acc[0] + x / ts.length, acc[1] + y / ts.length];
        }, [0, 0])
        : [0, 0] as [number, number];
      return { id, name: regionNames[id], tiles: ts.map(t => t.id), center };
    })
    .filter(r => r.tiles.length > 0);

  return { cols, rows, tiles, regions };
}

export function neighbourTiles(map: MapData, tile: Tile): Tile[] {
  return allNeighbours(tile.col, tile.row)
    .map(([c, r]) => (c >= 0 && r >= 0 && c < map.cols && r < map.rows ? map.tiles[r * map.cols + c] : undefined))
    .filter((t): t is Tile => !!t);
}
