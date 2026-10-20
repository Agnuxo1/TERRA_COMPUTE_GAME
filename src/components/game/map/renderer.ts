// Canvas renderer for the continent map: an animated, RTS-style view.
// React owns the game state; this class owns pixels. It runs its own rAF loop and only
// receives new snapshots of the state, so animation stays smooth between simulation ticks.

import { buildingById, CATEGORY_COLOR, depositInfo, SPRITE_FOR, terrainInfo } from '../../../game/data';
import { housingComfort, operational, regionCost, type Placement } from '../../../game/engine';
import { TILE_H, TILE_W, edgeNeighbours, allNeighbours, tileCenter } from '../../../game/mapgen';
import type { BuildingId, GameState, MapData, Tile } from '../../../game/types';
import { t } from '../../../i18n';
import type { HeatColours } from './layers';

const HW = TILE_W / 2;
const HH = TILE_H / 2;
const SIDE = 7;
const CACHE_SCALE = 3;

export interface Camera { x: number; y: number; scale: number }

export interface MapUi {
  hover: number | null;
  selected: number | null;
  placing: BuildingId | null;
  placements: Map<number, Placement> | null;
  dayNight: boolean;
  reduceMotion: boolean;
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; color: string; kind: 'smoke' | 'steam' | 'spark' | 'ember' | 'weld' | 'vapor' | 'trail' }
interface Boat { port: number; water: number[]; t: number; dir: number; speed: number }
interface Rocket { x: number; y: number; vy: number; age: number }
interface Floater { x: number; y: number; text: string; color: string; age: number }
interface Ping { x: number; y: number; color: string; age: number; label?: string }
interface Vehicle { path: number[]; seg: number; t: number; speed: number; kind: 'truck' | 'van' }

const BADGE: Partial<Record<BuildingId, string>> = {
  hospital: '✚', school: '✎', chipfab: '◆', satellite: '◉', mainframe: 'G', super: 'T', datacenter: 'P', gpucluster: 'E',
  robot: '⚙', nuclear: '☢', fusion: '✺',
};
const POWER: BuildingId[] = ['coal', 'nuclear', 'solar', 'fusion'];
const COMPUTE: BuildingId[] = ['mainframe', 'super', 'datacenter', 'gpucluster', 'aifactory'];
const SMOKE: BuildingId[] = ['coal', 'factory', 'chipfab'];

// Canvas texts. They live at module scope (not inline) because the callers have locals named `t` (a tile),
// which would shadow the translation function, and so the literal keys stay visible to the i18n extractor.
const levelText = (level: number) => t('▲ LEVEL {level}', { level });
const onlineText = () => t('✔ ONLINE');
const damagedText = () => t('DAMAGED');
const rpText = () => t('+RP');
const foodText = () => t('+FOOD');
const alignText = () => t('+ALIGN');
const undevelopedText = (cost: number) => t('UNDEVELOPED · {price}B', { price: `$${cost}` });

/** Which neighbours help (+) or hurt (−) a building type — drives the adjacency lines of the placement ghost. */
export function adjacencyRelation(type: BuildingId, neighbour: BuildingId): 1 | -1 | 0 {
  const has = (list: BuildingId[]) => list.includes(neighbour);
  switch (type) {
    case 'farm': return neighbour === 'farm' ? 1 : has(SMOKE) ? -1 : 0;
    case 'housing': return has(['school', 'hospital', 'market', 'uni']) ? 1 : has(SMOKE) ? -1 : 0;
    case 'market': return neighbour === 'housing' ? 1 : 0;
    case 'seaport': return neighbour === 'factory' ? 1 : 0;
    case 'school': case 'hospital': return neighbour === 'housing' ? 1 : 0;
    case 'uni': return has(['uni', 'lab']) ? 1 : 0;
    case 'lab': return has(['uni', 'lab', 'datacenter']) ? 1 : 0;
    case 'defense': return has(['lab', 'uni', ...COMPUTE]) ? 1 : 0;
    case 'factory': return has(['seaport', 'market', 'robot']) ? 1 : 0;
    default:
      if (COMPUTE.includes(type)) return has([...POWER, 'chipfab']) ? 1 : 0;
      return 0;
  }
}

function spriteUrl(type: BuildingId, faction: string | null): string {
  return faction ? `./assets/sprites/factions/${faction}/${SPRITE_FOR[type]}?v=sheet-v1` : `./assets/sprites/${SPRITE_FOR[type]}?v=sheet-v1`;
}

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

function diamondPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, inset = 0) {
  const w = HW - inset;
  const h = HH - inset / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx + w, cy);
  ctx.lineTo(cx, cy + h);
  ctx.lineTo(cx - w, cy);
  ctx.closePath();
}

export function spriteSize(type: BuildingId): number {
  return type === 'aifactory' ? 86 : ['gpucluster', 'datacenter', 'nuclear', 'fusion'].includes(type) ? 80 : type === 'mainframe' ? 64 : 72;
}

export class MapRenderer {
  private ctx: CanvasRenderingContext2D;
  private mini: CanvasRenderingContext2D | null;
  private state: GameState | null = null;
  private map: MapData | null = null;
  ui: MapUi = { hover: null, selected: null, placing: null, placements: null, dayNight: true, reduceMotion: false };
  private heat: HeatColours | null = null;
  cam: Camera = { x: 0, y: 0, scale: 1 };
  private raf = 0;
  private last = 0;
  private time = 0;
  private dpr = 1;
  private images = new Map<string, HTMLImageElement>();
  private terrainCache: HTMLCanvasElement | null = null;
  private terrainKey = '';
  private miniCache: HTMLCanvasElement | null = null;
  private roads: Array<[number, number]> = [];
  private roadAdj = new Map<number, number[]>();
  private roadKey = '';
  private vehicles: Vehicle[] = [];
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private pings: Ping[] = [];
  private glow = new Map<string, HTMLCanvasElement>();
  private puffs = new Map<string, HTMLCanvasElement>();
  private glowQueue: Array<() => void> = [];
  private boats: Boat[] = [];
  private rockets: Rocket[] = [];
  private nextLaunch = new Map<number, number>();
  private wind = 0;
  private prevBuildings = new Map<number, { type: BuildingId; progress: number; level: number }>();
  private lastYear = -1;
  private emitAcc = 0;
  bounds = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  onCameraChange?: () => void;
  /** Audio hook for visual events: 'complete' | 'damage' | 'launch'. */
  onFx?: (kind: 'complete' | 'damage' | 'launch') => void;

  private canvas: HTMLCanvasElement;
  private miniCanvas: HTMLCanvasElement | null;

  constructor(canvas: HTMLCanvasElement, miniCanvas: HTMLCanvasElement | null) {
    this.canvas = canvas;
    this.miniCanvas = miniCanvas;
    this.ctx = canvas.getContext('2d')!;
    this.mini = miniCanvas?.getContext('2d') ?? null;
  }

  // ─── lifecycle ───────────────────────────────────────────────────────
  start() {
    const loop = (t: number) => {
      const dt = this.last ? Math.min(0.1, (t - this.last) / 1000) : 0;
      this.last = t;
      this.time += dt;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { cancelAnimationFrame(this.raf); }

  /** Per-tile heat-map tint from layers.ts (null = layer off). Drawn each frame, computed by the caller. */
  setHeat(h: HeatColours | null) { this.heat = h; }

  resize(w: number, h: number) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  setState(s: GameState) {
    const firstMap = this.map !== s.map && (!this.map || this.map.cols !== s.map?.cols || this.map.rows !== s.map?.rows);
    this.state = s;
    this.map = s.map;
    if (!s.map) return;
    if (firstMap) this.computeBounds();
    const tKey = s.map.tiles.map(t => t.terrain[0]).join('') + '|' + s.ownedRegions.join(',');
    if (tKey !== this.terrainKey) {
      this.terrainKey = tKey;
      this.buildTerrainCache();
    }
    const bKey = s.map.tiles.filter(t => t.building).map(t => t.id).join(',');
    if (bKey !== this.roadKey) {
      this.roadKey = bKey;
      this.buildRoads();
    }
    this.diffBuildings(s);
    // Yearly economic feedback: floating numbers over productive buildings.
    const y = Math.floor(s.year);
    if (this.lastYear >= 0 && y !== this.lastYear) this.yearlyFloaters(s);
    this.lastYear = y;
  }

  private computeBounds() {
    const land = this.map!.tiles.filter(t => t.terrain !== 'water');
    const xs = land.map(t => tileCenter(t.col, t.row)[0]);
    const ys = land.map(t => tileCenter(t.col, t.row)[1]);
    this.bounds = { minX: Math.min(...xs) - HW - 30, maxX: Math.max(...xs) + HW + 30, minY: Math.min(...ys) - 80, maxY: Math.max(...ys) + HH + 30 };
  }

  // ─── camera ──────────────────────────────────────────────────────────
  get viewW() { return this.canvas.width / this.dpr; }
  get viewH() { return this.canvas.height / this.dpr; }

  fit() {
    const b = this.bounds;
    const bw = b.maxX - b.minX;
    const bh = b.maxY - b.minY;
    const scale = Math.min(this.viewW / bw, this.viewH / bh) * 0.95;
    this.cam = { scale, x: (this.viewW - bw * scale) / 2 - b.minX * scale, y: (this.viewH - bh * scale) / 2 - b.minY * scale };
    this.onCameraChange?.();
  }

  clampCam() {
    const b = this.bounds;
    const s = this.cam.scale;
    const pad = 120;
    const minX = this.viewW - b.maxX * s - pad;
    const maxX = -b.minX * s + pad;
    const minY = this.viewH - b.maxY * s - pad;
    const maxY = -b.minY * s + pad;
    this.cam.x = minX > maxX ? (minX + maxX) / 2 : Math.min(maxX, Math.max(minX, this.cam.x));
    this.cam.y = minY > maxY ? (minY + maxY) / 2 : Math.min(maxY, Math.max(minY, this.cam.y));
  }

  zoomAt(sx: number, sy: number, factor: number) {
    const scale = Math.max(0.4, Math.min(3.5, this.cam.scale * factor));
    const k = scale / this.cam.scale;
    this.cam = { scale, x: sx - (sx - this.cam.x) * k, y: sy - (sy - this.cam.y) * k };
    this.clampCam();
    this.onCameraChange?.();
  }

  pan(dx: number, dy: number) {
    this.cam.x += dx;
    this.cam.y += dy;
    this.clampCam();
    this.onCameraChange?.();
  }

  centerOn(wx: number, wy: number) {
    this.cam.x = this.viewW / 2 - wx * this.cam.scale;
    this.cam.y = this.viewH / 2 - wy * this.cam.scale;
    this.clampCam();
    this.onCameraChange?.();
  }

  screenToWorld(sx: number, sy: number) {
    return { x: (sx - this.cam.x) / this.cam.scale, y: (sy - this.cam.y) / this.cam.scale };
  }

  worldToScreen(wx: number, wy: number) {
    return { x: wx * this.cam.scale + this.cam.x, y: wy * this.cam.scale + this.cam.y };
  }

  tileAtScreen(sx: number, sy: number): Tile | null {
    const map = this.map;
    if (!map) return null;
    const { x: wx, y: wy } = this.screenToWorld(sx, sy);
    const r0 = Math.round((wy - HH) / HH);
    let best: Tile | null = null;
    for (let r = r0 - 2; r <= r0 + 2; r++) {
      if (r < 0 || r >= map.rows) continue;
      const c0 = Math.round((wx - HW - (r % 2 ? HW : 0)) / TILE_W);
      for (let c = c0 - 1; c <= c0 + 1; c++) {
        if (c < 0 || c >= map.cols) continue;
        const [cx, cy] = tileCenter(c, r);
        if (Math.abs(wx - cx) / HW + Math.abs(wy - cy) / HH <= 1) best = map.tiles[r * map.cols + c];
      }
    }
    return best;
  }

  // ─── minimap ─────────────────────────────────────────────────────────
  miniToWorld(mx: number, my: number) {
    const mc = this.miniCanvas!;
    const b = this.bounds;
    const sc = Math.min(mc.width / (b.maxX - b.minX), mc.height / (b.maxY - b.minY));
    const ox = (mc.width - (b.maxX - b.minX) * sc) / 2;
    const oy = (mc.height - (b.maxY - b.minY) * sc) / 2;
    return { x: (mx - ox) / sc + b.minX, y: (my - oy) / sc + b.minY };
  }

  // ─── assets ──────────────────────────────────────────────────────────
  private img(url: string): HTMLImageElement | null {
    let im = this.images.get(url);
    if (!im) {
      im = new Image();
      im.src = url;
      this.images.set(url, im);
    }
    return im.complete && im.naturalWidth > 0 ? im : null;
  }

  private glowSprite(color: string): HTMLCanvasElement {
    let g = this.glow.get(color);
    if (!g) {
      g = document.createElement('canvas');
      g.width = g.height = 64;
      const c = g.getContext('2d')!;
      const grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = grad;
      c.fillRect(0, 0, 64, 64);
      this.glow.set(color, g);
    }
    return g;
  }

  /** Soft cloud puff (several overlapping blobs) used for smoke and steam. */
  private puffSprite(color: string): HTMLCanvasElement {
    let g = this.puffs.get(color);
    if (!g) {
      g = document.createElement('canvas');
      g.width = g.height = 64;
      const c = g.getContext('2d')!;
      const blobs: Array<[number, number, number]> = [[32, 34, 22], [22, 30, 14], [42, 28, 15], [30, 22, 13], [38, 40, 12]];
      for (const [x, y, r] of blobs) {
        const grad = c.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color);
        grad.addColorStop(0.55, color.replace(/[\d.]+\)$/, '0.45)'));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = grad;
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
      this.puffs.set(color, g);
    }
    return g;
  }

  // ─── caches ──────────────────────────────────────────────────────────
  private buildTerrainCache() {
    const map = this.map!;
    const s = this.state!;
    const w = map.cols * TILE_W + TILE_W + 20;
    const h = map.rows * HH + TILE_H + 20;
    const cv = document.createElement('canvas');
    cv.width = w * CACHE_SCALE;
    cv.height = h * CACHE_SCALE;
    const c = cv.getContext('2d')!;
    c.scale(CACHE_SCALE, CACHE_SCALE);
    const owned = new Set(s.ownedRegions);

    for (const t of map.tiles) {
      if (t.terrain !== 'water') continue;
      const [cx, cy] = tileCenter(t.col, t.row);
      diamondPath(c, cx, cy);
      c.fillStyle = (t.col + t.row) % 2 ? '#0A1E28' : '#0B2230';
      c.fill();
    }
    const land = map.tiles.filter(t => t.terrain !== 'water');
    // coast foam
    for (const t of land) {
      if (!t.coast) continue;
      const [cx, cy] = tileCenter(t.col, t.row);
      diamondPath(c, cx, cy + 3, -6);
      c.fillStyle = 'rgba(120,200,220,0.08)';
      c.fill();
    }
    for (const t of land) {
      const [cx, cy] = tileCenter(t.col, t.row);
      const info = terrainInfo[t.terrain];
      // slab sides
      c.beginPath(); c.moveTo(cx - HW, cy); c.lineTo(cx, cy + HH); c.lineTo(cx, cy + HH + SIDE); c.lineTo(cx - HW, cy + SIDE); c.closePath();
      c.fillStyle = shade(info.color, 0.62); c.fill();
      c.beginPath(); c.moveTo(cx + HW, cy); c.lineTo(cx, cy + HH); c.lineTo(cx, cy + HH + SIDE); c.lineTo(cx + HW, cy + SIDE); c.closePath();
      c.fillStyle = shade(info.color, 0.45); c.fill();
    }
    for (const t of land) {
      const [cx, cy] = tileCenter(t.col, t.row);
      const info = terrainInfo[t.terrain];
      diamondPath(c, cx, cy);
      const grad = c.createLinearGradient(cx, cy - HH, cx, cy + HH);
      grad.addColorStop(0, shade(info.top, 1.12));
      grad.addColorStop(1, shade(info.top, 0.9));
      c.fillStyle = grad;
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)';
      c.lineWidth = 0.7;
      c.stroke();
      // texture speckles
      for (let i = 0; i < 5; i++) {
        const ox = (hash(t.id * 11 + i) - 0.5) * 36;
        const oy = (hash(t.id * 17 + i) - 0.5) * 14;
        if (Math.abs(ox) / HW + Math.abs(oy) / HH > 0.85) continue;
        c.fillStyle = 'rgba(255,255,255,0.05)';
        c.fillRect(cx + ox, cy + oy, 1.2, 1.2);
      }
      const r = hash(t.id);
      if (t.terrain === 'forest') {
        for (let i = 0; i < 4; i++) {
          const ox = (hash(t.id * 3 + i) - 0.5) * 30;
          const oy = (hash(t.id * 7 + i) - 0.5) * 10;
          c.beginPath(); c.moveTo(cx + ox, cy + oy - 12); c.lineTo(cx + ox + 5.5, cy + oy); c.lineTo(cx + ox - 5.5, cy + oy); c.closePath();
          c.fillStyle = i % 2 ? '#14402A' : '#1A4D31'; c.fill();
          c.strokeStyle = '#2F6B3A'; c.lineWidth = 0.5; c.stroke();
        }
      } else if (t.terrain === 'hills') {
        c.beginPath(); c.moveTo(cx - 17, cy + 5); c.lineTo(cx - 7, cy - 9); c.lineTo(cx - 1, cy - 2); c.lineTo(cx + 5, cy - 8); c.lineTo(cx + 16, cy + 5); c.closePath();
        c.fillStyle = '#625444'; c.fill();
        c.beginPath(); c.moveTo(cx - 7, cy - 9); c.lineTo(cx - 4, cy - 5); c.lineTo(cx - 9, cy - 5); c.closePath();
        c.fillStyle = '#D9D2C5'; c.fill();
      } else if (t.terrain === 'desert') {
        c.beginPath(); c.moveTo(cx - 16, cy + 2 + r * 3); c.quadraticCurveTo(cx - 8, cy - 3, cx, cy + 2); c.quadraticCurveTo(cx + 8, cy + 7, cx + 16, cy + 2);
        c.strokeStyle = '#A88B52'; c.lineWidth = 1; c.stroke();
      } else if (t.terrain === 'tundra') {
        for (let i = 0; i < 5; i++) {
          c.fillStyle = 'rgba(220,232,240,0.7)';
          c.fillRect(cx + (hash(t.id + i * 5) - 0.5) * 34, cy + (hash(t.id * 2 + i) - 0.5) * 12, 1.6, 1.2);
        }
      } else if (t.terrain === 'fertile' && !t.river) {
        c.strokeStyle = '#5E8F4A'; c.lineWidth = 1.1;
        for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(cx - 14 + i * 6, cy - 2 - i * 3); c.lineTo(cx + i * 6, cy + 5 - i * 3); c.stroke(); }
      }
      if (t.river) {
        c.beginPath(); c.moveTo(cx - 18, cy + 3); c.quadraticCurveTo(cx - 9, cy - 4, cx, cy + 1); c.quadraticCurveTo(cx + 9, cy + 6, cx + 18, cy - 2);
        c.strokeStyle = '#3FA7C9'; c.lineWidth = 2.4; c.stroke();
        c.strokeStyle = 'rgba(200,240,255,0.35)'; c.lineWidth = 0.8; c.stroke();
      }
      if (!owned.has(t.region || '')) {
        diamondPath(c, cx, cy);
        c.fillStyle = 'rgba(5,5,8,0.58)'; c.fill();
        c.save(); diamondPath(c, cx, cy); c.clip();
        c.strokeStyle = 'rgba(255,184,77,0.16)'; c.lineWidth = 1.4;
        for (let k = -40; k < 40; k += 6) { c.beginPath(); c.moveTo(cx + k, cy - HH); c.lineTo(cx + k + 20, cy + HH); c.stroke(); }
        c.restore();
      }
    }
    // region borders
    c.setLineDash([4, 3]);
    c.strokeStyle = 'rgba(255,184,77,0.5)';
    c.lineWidth = 1.3;
    c.beginPath();
    for (const t of land) {
      const [cx, cy] = tileCenter(t.col, t.row);
      const edges: Array<[number, number, number, number]> = [
        [cx - HW, cy, cx, cy - HH], [cx, cy - HH, cx + HW, cy], [cx - HW, cy, cx, cy + HH], [cx, cy + HH, cx + HW, cy],
      ];
      edgeNeighbours(t.col, t.row).forEach(([nc, nr], i) => {
        if (nc < 0 || nr < 0 || nc >= map.cols || nr >= map.rows) return;
        const n = map.tiles[nr * map.cols + nc];
        if (n.terrain !== 'water' && n.region !== t.region && t.id < n.id) {
          const e = edges[i];
          c.moveTo(e[0], e[1]); c.lineTo(e[2], e[3]);
        }
      });
    }
    c.stroke();
    c.setLineDash([]);
    this.terrainCache = cv;

    // minimap terrain
    if (this.miniCanvas) {
      const mc = document.createElement('canvas');
      mc.width = this.miniCanvas.width;
      mc.height = this.miniCanvas.height;
      const m = mc.getContext('2d')!;
      m.fillStyle = '#071820';
      m.fillRect(0, 0, mc.width, mc.height);
      const b = this.bounds;
      const sc = Math.min(mc.width / (b.maxX - b.minX), mc.height / (b.maxY - b.minY));
      const ox = (mc.width - (b.maxX - b.minX) * sc) / 2;
      const oy = (mc.height - (b.maxY - b.minY) * sc) / 2;
      for (const t of land) {
        const [cx, cy] = tileCenter(t.col, t.row);
        const x = ox + (cx - b.minX) * sc;
        const y = oy + (cy - b.minY) * sc;
        m.fillStyle = owned.has(t.region || '') ? terrainInfo[t.terrain].top : shade(terrainInfo[t.terrain].top, 0.45);
        m.beginPath(); m.moveTo(x, y - HH * sc); m.lineTo(x + HW * sc, y); m.lineTo(x, y + HH * sc); m.lineTo(x - HW * sc, y); m.closePath(); m.fill();
      }
      this.miniCache = mc;
    }
  }

  /** Road network: a spanning tree of shortest land paths that links every building to the capital cluster. */
  private buildRoads() {
    const map = this.map!;
    const land = (id: number) => map.tiles[id].terrain !== 'water';
    const bTiles = map.tiles.filter(t => t.building).map(t => t.id);
    this.roads = [];
    this.roadAdj = new Map();
    if (bTiles.length < 2) { this.vehicles = []; return; }
    const tree = new Set<number>([bTiles[0]]);
    const remaining = new Set(bTiles.slice(1));
    const addEdge = (a: number, b: number) => {
      if (!this.roadAdj.has(a)) this.roadAdj.set(a, []);
      if (!this.roadAdj.has(b)) this.roadAdj.set(b, []);
      if (this.roadAdj.get(a)!.includes(b)) return;
      this.roadAdj.get(a)!.push(b);
      this.roadAdj.get(b)!.push(a);
      this.roads.push([a, b]);
    };
    let guard = 0;
    while (remaining.size && guard++ < 400) {
      // multi-source BFS from the whole tree (roads can branch from any road tile)
      const prev = new Map<number, number>();
      const queue = [...tree];
      queue.forEach(id => prev.set(id, -1));
      let found = -1;
      for (let qi = 0; qi < queue.length && found < 0; qi++) {
        const id = queue[qi];
        const t = map.tiles[id];
        for (const [c, r] of edgeNeighbours(t.col, t.row)) {
          if (c < 0 || r < 0 || c >= map.cols || r >= map.rows) continue;
          const nid = r * map.cols + c;
          if (prev.has(nid) || !land(nid)) continue;
          prev.set(nid, id);
          if (remaining.has(nid)) { found = nid; break; }
          queue.push(nid);
        }
      }
      if (found < 0) {
        // unreachable (island): start a new tree there
        const next = remaining.values().next().value as number;
        remaining.delete(next);
        tree.add(next);
        continue;
      }
      let cur = found;
      while (prev.get(cur)! >= 0) {
        const p = prev.get(cur)!;
        addEdge(p, cur);
        tree.add(cur);
        cur = p;
      }
      tree.add(found);
      remaining.delete(found);
    }
    // ships shuttle along the water next to every seaport
    this.boats = [];
    for (const t of map.tiles) {
      if (t.building?.type !== 'seaport') continue;
      const water: number[] = [];
      for (const [c, r] of allNeighbours(t.col, t.row)) {
        if (c < 0 || r < 0 || c >= map.cols || r >= map.rows) continue;
        const n = map.tiles[r * map.cols + c];
        if (n.terrain === 'water') water.push(n.id);
      }
      if (water.length) this.boats.push({ port: t.id, water, t: Math.random(), dir: 1, speed: 0.08 + Math.random() * 0.05 });
    }
    // vehicles proportional to the network
    const want = Math.min(36, Math.floor(this.roads.length / 3));
    const nodes = [...this.roadAdj.keys()];
    this.vehicles = this.vehicles.filter(v => v.path.every(id => this.roadAdj.has(id))).slice(0, want);
    while (this.vehicles.length < want && nodes.length) {
      const start = nodes[Math.floor(Math.random() * nodes.length)];
      const nb = this.roadAdj.get(start)!;
      this.vehicles.push({ path: [start, nb[Math.floor(Math.random() * nb.length)]], seg: 0, t: Math.random(), speed: 0.6 + Math.random() * 0.5, kind: Math.random() < 0.7 ? 'truck' : 'van' });
    }
  }

  private diffBuildings(s: GameState) {
    const map = s.map!;
    const now = new Map<number, { type: BuildingId; progress: number; level: number }>();
    for (const t of map.tiles) {
      if (!t.building) continue;
      const b = t.building;
      now.set(t.id, { type: b.type, progress: b.progress, level: b.level });
      const before = this.prevBuildings.get(t.id);
      if (!before || this.prevBuildings.size === 0) continue;
      const [cx, cy] = tileCenter(t.col, t.row);
      if (before.progress < 1 && b.progress >= 1) {
        this.pings.push({ x: cx, y: cy, color: '#00E5A0', age: 0 });
        this.onFx?.('complete');
        this.floaters.push({ x: cx, y: cy - 40, text: b.upgrading || b.level > 1 ? levelText(b.level) : onlineText(), color: '#00E5A0', age: 0 });
      } else if (before.progress >= 1 && b.progress < 1 && !b.upgrading && before.level === b.level) {
        this.pings.push({ x: cx, y: cy, color: '#FF477E', age: 0, label: damagedText() });
        this.onFx?.('damage');
        this.burst(cx, cy - 20, '#FF7A3D', 26);
      }
    }
    if (this.prevBuildings.size) {
      for (const [id] of this.prevBuildings) {
        if (!now.has(id)) {
          const t = map.tiles[id];
          const [cx, cy] = tileCenter(t.col, t.row);
          this.burst(cx, cy - 10, '#B8C0CC', 18);
        }
      }
    }
    this.prevBuildings = now;
  }

  private yearlyFloaters(s: GameState) {
    if (this.ui.reduceMotion) return;
    const map = s.map!;
    const candidates = map.tiles.filter(t => t.building && operational(t.building));
    const picks = candidates.sort(() => Math.random() - 0.5).slice(0, 7);
    for (const t of picks) {
      const b = t.building!;
      const [cx, cy] = tileCenter(t.col, t.row);
      let text = '';
      let color = '#00E5A0';
      if (b.type === 'factory') { text = `+${(6 * b.level).toFixed(0)} ⛓`; color = '#C9CED8'; }
      else if (b.type === 'chipfab') { text = `+${30 * b.level} ◆`; color = '#67E8F9'; }
      else if (b.type === 'market' || b.type === 'seaport') { text = `+$${b.type === 'market' ? 30 * b.level : 90 * b.level}`; color = '#FFD166'; }
      else if (b.type === 'lab' || b.type === 'uni' || b.type === 'satellite') { text = rpText(); color = '#A78BFA'; }
      else if (b.type === 'farm') { text = foodText(); color = '#86EFAC'; }
      else if (COMPUTE.includes(b.type)) { text = 'FLOPS ▲'; color = '#00F0FF'; }
      else if (b.type === 'defense') { text = alignText(); color = '#FF8FB1'; }
      else continue;
      this.floaters.push({ x: cx + (Math.random() - 0.5) * 10, y: cy - spriteSize(b.type) * 0.55, text, color, age: -Math.random() * 0.8 });
    }
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 10 + Math.random() * 30;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 10, life: 0, max: 0.6 + Math.random() * 0.6, r: 1.5 + Math.random() * 2, color, kind: 'spark' });
    }
  }

  // ─── simulation of visuals ───────────────────────────────────────────
  private update(dt: number) {
    const s = this.state;
    if (!s?.map) return;
    const running = !s.paused && !s.activeEvent;
    const speed = running ? Math.max(1, s.speed) : 0;
    // emitters
    this.emitAcc += dt;
    if (this.emitAcc > 0.12 && !this.ui.reduceMotion) {
      this.emitAcc = 0;
      for (const t of s.map.tiles) {
        const b = t.building;
        if (!b || !operational(b)) continue;
        const [cx, cy] = tileCenter(t.col, t.row);
        const size = spriteSize(b.type);
        this.emit(t.id, b.type, b.level, cx, cy, size);
      }
    }
    this.wind = Math.sin(this.time * 0.07) * 9 + Math.sin(this.time * 0.23) * 3;
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'spark' || p.kind === 'weld') p.vy += 60 * dt;
      else if (p.kind === 'ember') { p.vx += (Math.random() - 0.5) * 20 * dt; }
      else if (p.kind === 'trail') { p.r += dt * 6; p.vx *= 0.96; p.vy *= 0.96; }
      else {
        // smoke & steam: rise, slow down, widen and bend with the wind
        p.r += dt * (p.kind === 'steam' ? 6.5 : 4.2);
        p.vy *= 0.985;
        p.vx += (this.wind - p.vx) * 0.6 * dt;
      }
    }
    this.particles = this.particles.filter(p => p.life < p.max).slice(-1100);
    for (const bt of this.boats) {
      if (!speed) continue;
      bt.t += bt.dir * bt.speed * dt * (0.8 + 0.2 * speed);
      if (bt.t > 1 || bt.t < 0) { bt.dir *= -1; bt.t = Math.max(0, Math.min(1, bt.t)); }
    }
    for (const r of this.rockets) {
      r.age += dt;
      r.vy -= 34 * dt;
      r.y += r.vy * dt;
      if (Math.random() < 0.9) this.particles.push({ x: r.x + (Math.random() - 0.5) * 2, y: r.y + 6, vx: (Math.random() - 0.5) * 6, vy: 6, life: 0, max: 1.6, r: 2.5, color: 'rgba(225,225,230,0.8)', kind: 'trail' });
    }
    this.rockets = this.rockets.filter(r => r.age < 4.5);
    for (const f of this.floaters) { f.age += dt; f.y -= 14 * dt; }
    this.floaters = this.floaters.filter(f => f.age < 2.2);
    for (const p of this.pings) p.age += dt;
    this.pings = this.pings.filter(p => p.age < 2.5);
    // vehicles random-walk the road network
    for (const v of this.vehicles) {
      if (!speed) continue;
      v.t += dt * v.speed * (0.8 + 0.2 * speed);
      while (v.t >= 1) {
        v.t -= 1;
        const at = v.path[1];
        const options = (this.roadAdj.get(at) ?? []).filter(n => n !== v.path[0]);
        const next = options.length ? options[Math.floor(Math.random() * options.length)] : v.path[0];
        v.path = [at, next];
      }
    }
  }

  /** Particle emitters per building type (called ~8 times a second). */
  private emit(id: number, type: BuildingId, level: number, cx: number, cy: number, size: number) {
    const x0 = cx - size / 2;
    const y0 = cy - size * 0.7;
    const P = (x: number, y: number, kind: Particle['kind'], color: string, r: number, max: number, vx = 0, vy = -12) =>
      this.particles.push({ x, y, vx, vy, life: 0, max, r, color, kind });
    const rnd = Math.random;
    switch (type) {
      case 'coal': {
        // thick black columns from both stacks, glowing embers from the furnace
        for (const fx of [0.32, 0.52]) if (rnd() < 0.75) P(x0 + size * fx + rnd() * 4, y0 + size * 0.2, 'smoke', 'rgba(52,54,60,0.85)', 4 + level, 4.5 + rnd() * 1.5, 2 + rnd() * 3, -16 - rnd() * 6);
        if (rnd() < 0.35) P(cx - 6 + rnd() * 12, cy - size * 0.18, 'ember', '#FF8A2A', 1.3, 1.6, (rnd() - 0.5) * 6, -14 - rnd() * 10);
        break;
      }
      case 'factory': {
        for (const fx of [0.24, 0.33, 0.42]) if (rnd() < 0.5) P(x0 + size * fx + rnd() * 3, y0 + size * 0.12, 'smoke', 'rgba(120,124,132,0.8)', 3 + level * 0.6, 3.6 + rnd(), 3, -14 - rnd() * 5);
        if (rnd() < 0.06) {
          // welding flash with a spray of sparks
          const wx = cx - 8 + rnd() * 18;
          const wy = cy - size * 0.2 + rnd() * 8;
          for (let i = 0; i < 9; i++) P(wx, wy, 'weld', i % 3 ? '#FFE9A8' : '#9FD8FF', 1.1, 0.35 + rnd() * 0.3, (rnd() - 0.5) * 70, -20 - rnd() * 30);
        }
        break;
      }
      case 'chipfab':
        if (rnd() < 0.4) P(x0 + size * (0.3 + rnd() * 0.3), y0 + size * 0.22, 'vapor', 'rgba(235,245,255,0.7)', 2.2, 2.2, 2, -9);
        break;
      case 'nuclear': {
        // great white plumes from the cooling towers
        for (const fx of [0.3, 0.52]) if (rnd() < 0.8) P(x0 + size * fx + (rnd() - 0.5) * 8, y0 + size * 0.16, 'steam', 'rgba(238,243,248,0.9)', 5 + level, 3.8 + rnd() * 1.4, 1 + rnd() * 2, -18 - rnd() * 6);
        break;
      }
      case 'housing':
        if (rnd() < 0.08) P(cx - 10 + rnd() * 20, y0 + size * 0.2, 'smoke', 'rgba(170,176,186,0.45)', 1.8, 2.4, 2, -8);
        break;
      case 'satellite': {
        const due = this.nextLaunch.get(id) ?? this.time + 8 + rnd() * 30;
        if (!this.nextLaunch.has(id)) this.nextLaunch.set(id, due);
        if (this.time > due && !this.ui.reduceMotion) {
          this.rockets.push({ x: cx + 10, y: cy - size * 0.35, vy: -6, age: 0 });
          this.onFx?.('launch');
          for (let i = 0; i < 26; i++) P(cx + 10 + (rnd() - 0.5) * 16, cy - size * 0.2, 'trail', 'rgba(220,220,225,0.85)', 3, 2.5, (rnd() - 0.5) * 40, -rnd() * 8);
          this.nextLaunch.set(id, this.time + 35 + rnd() * 40);
        }
        break;
      }
      default:
        break;
    }
  }

  /** Per-building animated overlays. Additive glows are queued and drawn after the night pass. */
  private fx(ctx: CanvasRenderingContext2D, t: Tile, type: BuildingId, cx: number, cy: number, size: number) {
    const T = this.time;
    const ph = t.id * 1.618;
    const y0 = cy - size * 0.7;
    const glow = (color: string, x: number, y: number, w: number, h: number, a: number) =>
      this.glowQueue.push(() => {
        this.ctx.globalAlpha = Math.max(0, Math.min(1, a));
        this.ctx.drawImage(this.glowSprite(color), x - w / 2, y - h / 2, w, h);
      });
    switch (type) {
      case 'nuclear': {
        // Cherenkov-blue reactor glow, a periodic radiation flash and a slowly turning trefoil hologram
        const pulse = 0.55 + Math.sin(T * 2.2 + ph) * 0.25;
        glow('rgba(80,255,190,0.95)', cx + 8, cy - size * 0.22, 46, 30, pulse);
        glow('rgba(60,170,255,0.9)', cx + 8, cy - size * 0.22, 22, 14, pulse + 0.2);
        const cycle = (T + ph) % 6;
        if (cycle < 0.9) {
          const k = cycle / 0.9;
          this.glowQueue.push(() => {
            const c = this.ctx;
            c.globalAlpha = (1 - k) * 0.9;
            c.save();
            c.translate(cx + 8, cy - size * 0.22);
            c.scale(1, 0.5);
            c.strokeStyle = '#7CFFC4';
            c.lineWidth = 2.5 * (1 - k) + 0.5;
            c.beginPath(); c.arc(0, 0, 6 + k * 46, 0, Math.PI * 2); c.stroke();
            c.restore();
            c.drawImage(this.glowSprite('rgba(170,255,220,1)'), cx + 8 - 30 * (1 - k), cy - size * 0.22 - 20 * (1 - k), 60 * (1 - k), 40 * (1 - k));
          });
        }
        this.glowQueue.push(() => {
          const c = this.ctx;
          c.globalAlpha = 0.28 + Math.sin(T * 1.3 + ph) * 0.1;
          c.save();
          c.translate(cx + 8, y0 - 4);
          c.scale(1, 0.55);
          c.rotate(T * 0.5);
          c.fillStyle = '#9DFF6A';
          for (let i = 0; i < 3; i++) {
            c.rotate((Math.PI * 2) / 3);
            c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 9, -0.5, 0.5); c.closePath(); c.fill();
          }
          c.beginPath(); c.arc(0, 0, 2.2, 0, Math.PI * 2); c.fill();
          c.restore();
        });
        break;
      }
      case 'coal': {
        const flick = 0.45 + Math.random() * 0.25 + Math.sin(T * 9 + ph) * 0.1;
        glow('rgba(255,120,30,0.9)', cx - 2, cy - size * 0.18, 38, 22, flick);
        break;
      }
      case 'factory': {
        const flick = 0.35 + Math.sin(T * 7 + ph) * 0.12 + Math.random() * 0.12;
        glow('rgba(255,150,60,0.9)', cx + 4, cy - size * 0.16, 30, 18, flick);
        break;
      }
      case 'chipfab': {
        const k = 0.45 + Math.sin(T * 2.5 + ph) * 0.25;
        glow('rgba(0,240,255,0.9)', cx, cy - size * 0.25, 44, 22, k);
        break;
      }
      case 'fusion': {
        // plasma torus with crawling arcs
        this.glowQueue.push(() => {
          const c = this.ctx;
          const ry = cy - size * 0.5;
          c.save();
          c.translate(cx, ry);
          c.scale(1, 0.38);
          for (let i = 0; i < 2; i++) {
            c.globalAlpha = 0.55 + Math.sin(T * 4 + i * 2) * 0.25;
            c.strokeStyle = i ? '#B48CFF' : '#6FB6FF';
            c.lineWidth = 3 - i;
            c.beginPath(); c.arc(0, 0, 20 + i * 5, T * (1.5 + i), T * (1.5 + i) + Math.PI * 1.6); c.stroke();
          }
          c.restore();
          c.globalAlpha = 0.6 + Math.random() * 0.4;
          c.drawImage(this.glowSprite('rgba(170,140,255,1)'), cx - 16, ry - 12, 32, 24);
          if (Math.random() < 0.25) {
            c.strokeStyle = '#E2D6FF';
            c.lineWidth = 1;
            c.globalAlpha = 0.9;
            c.beginPath();
            let ax = cx, ay = ry;
            c.moveTo(ax, ay);
            for (let i = 0; i < 5; i++) { ax += (Math.random() - 0.5) * 14; ay += -4 + Math.random() * 8; c.lineTo(ax, ay); }
            c.stroke();
          }
        });
        break;
      }
      case 'gpucluster':
      case 'aifactory':
      case 'datacenter': {
        // data beam pulses climbing into the sky
        const beamH = type === 'aifactory' ? 90 : type === 'gpucluster' ? 60 : 36;
        this.glowQueue.push(() => {
          const c = this.ctx;
          const top = y0 - beamH;
          const grad = c.createLinearGradient(0, y0 + size * 0.2, 0, top);
          grad.addColorStop(0, 'rgba(0,240,255,0.5)');
          grad.addColorStop(1, 'rgba(0,240,255,0)');
          c.globalAlpha = 0.5 + Math.sin(T * 3 + ph) * 0.2;
          c.fillStyle = grad;
          c.fillRect(cx - 1.2, top, 2.4, y0 + size * 0.2 - top);
          const k = ((T * 0.8 + ph) % 1);
          c.globalAlpha = 1 - k;
          c.drawImage(this.glowSprite('rgba(150,250,255,1)'), cx - 5, y0 + size * 0.2 - (y0 + size * 0.2 - top) * k - 5, 10, 10);
        });
        if (type === 'aifactory') {
          this.glowQueue.push(() => {
            const c = this.ctx;
            c.save();
            c.translate(cx, y0 - 6);
            c.scale(1, 0.32);
            c.strokeStyle = '#00F0FF';
            for (let i = 0; i < 3; i++) {
              c.globalAlpha = 0.45 - i * 0.1;
              c.lineWidth = 1.5;
              c.setLineDash([6, 4]);
              c.lineDashOffset = (i % 2 ? 1 : -1) * T * 30;
              c.beginPath(); c.arc(0, -i * 18, 26 - i * 5, 0, Math.PI * 2); c.stroke();
            }
            c.setLineDash([]);
            c.restore();
          });
        }
        break;
      }
      case 'lab':
      case 'uni':
      case 'satellite':
      case 'super':
      case 'mainframe': {
        // red aircraft-warning beacon
        const on = Math.sin(T * 3 + ph) > 0.6;
        if (on) glow('rgba(255,50,50,1)', cx + 4, y0 + size * 0.08, 10, 10, 1);
        break;
      }
      case 'defense': {
        // rotating radar sweep
        this.glowQueue.push(() => {
          const c = this.ctx;
          c.save();
          c.translate(cx, y0 + size * 0.1);
          c.scale(1, 0.45);
          const a = T * 1.6 + ph;
          const grad = c.createRadialGradient(0, 0, 0, 0, 0, 26);
          grad.addColorStop(0, 'rgba(0,229,160,0.5)');
          grad.addColorStop(1, 'rgba(0,229,160,0)');
          c.fillStyle = grad;
          c.globalAlpha = 0.9;
          c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 26, a, a + 0.7); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(0,229,160,0.35)';
          c.lineWidth = 1;
          c.beginPath(); c.arc(0, 0, 26, 0, Math.PI * 2); c.stroke();
          c.restore();
        });
        break;
      }
      case 'market': {
        const flick = Math.random() < 0.04 ? 0.1 : 0.55 + Math.sin(T * 2 + ph) * 0.15;
        glow('rgba(255,90,200,0.9)', cx - 6, cy - size * 0.12, 26, 12, flick);
        break;
      }
      case 'solar': {
        // a bright sun glint sweeping over the panels
        const k = ((T * 0.25 + ph * 0.1) % 1);
        glow('rgba(255,255,230,1)', cx - 22 + k * 44, cy - 6 + Math.sin(k * Math.PI) * -4, 16, 10, Math.sin(k * Math.PI) * 0.8);
        break;
      }
      default:
        break;
    }
  }

  // ─── drawing ─────────────────────────────────────────────────────────
  private draw() {
    const ctx = this.ctx;
    const s = this.state;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!s?.map || !this.terrainCache) return;
    const map = s.map;
    ctx.setTransform(this.dpr * this.cam.scale, 0, 0, this.dpr * this.cam.scale, this.dpr * this.cam.x, this.dpr * this.cam.y);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.terrainCache, 0, 0, this.terrainCache.width / CACHE_SCALE, this.terrainCache.height / CACHE_SCALE);

    // water glints
    if (!this.ui.reduceMotion) {
      for (let i = 0; i < 46; i++) {
        const t = map.tiles[Math.floor(hash(i * 31.7 + Math.floor(this.time / 3 + i * 0.37)) * map.tiles.length)];
        if (!t || t.terrain !== 'water') continue;
        const [cx, cy] = tileCenter(t.col, t.row);
        const ph = ((this.time / 3 + i * 0.37) % 1);
        ctx.strokeStyle = `rgba(150,220,240,${Math.sin(ph * Math.PI) * 0.35})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 8 + ph * 6, cy); ctx.lineTo(cx + 2 + ph * 6, cy - 2); ctx.stroke();
      }
    }

    // deposits
    for (const t of map.tiles) {
      if (!t.deposit || t.building) continue;
      const [cx, cy] = tileCenter(t.col, t.row);
      const d = depositInfo[t.deposit];
      ctx.fillStyle = '#0B0C10';
      ctx.beginPath(); ctx.arc(cx + 14, cy - 2, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = d.color; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = d.color; ctx.font = '8px "Share Tech Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillText(d.icon, cx + 14, cy + 1);
    }

    // roads
    this.drawRoads(ctx);

    // heat-map layer (precomputed per state change); replaces the placement tint while active
    if (this.heat) {
      for (let i = 0; i < this.heat.length; i++) {
        const fill = this.heat[i];
        if (!fill) continue;
        const tl = map.tiles[i];
        const [cx, cy] = tileCenter(tl.col, tl.row);
        diamondPath(ctx, cx, cy, 2);
        ctx.fillStyle = fill;
        ctx.fill();
      }
    } else if (this.ui.placing && this.ui.placements) {
      // placement heatmap
      for (const [id, p] of this.ui.placements) {
        const t = map.tiles[id];
        const [cx, cy] = tileCenter(t.col, t.row);
        if (!p.ok) continue;
        diamondPath(ctx, cx, cy, 2);
        ctx.fillStyle = p.mult >= 1.3 ? 'rgba(0,229,160,0.5)' : p.mult >= 1.05 ? 'rgba(0,229,160,0.28)' : p.mult >= 0.9 ? 'rgba(255,184,77,0.26)' : 'rgba(255,71,126,0.34)';
        ctx.fill();
      }
    }

    // energy & data links (under buildings)
    this.drawLinks(ctx);

    // selection ring under the building
    const sel = this.ui.selected !== null ? map.tiles[this.ui.selected] : null;
    if (sel) {
      const [cx, cy] = tileCenter(sel.col, sel.row);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.5);
      ctx.rotate(this.time * 0.8);
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#FFD166';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, 0, HW + 2, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.setLineDash([]);
    }

    this.glowQueue = [];
    // ships next to seaports
    for (const bt of this.boats) {
      const port = map.tiles[bt.port];
      const pos = Math.min(bt.water.length - 1, Math.floor(bt.t * bt.water.length));
      const w = map.tiles[bt.water[pos]];
      if (!port || !w) continue;
      const [px, py] = tileCenter(port.col, port.row);
      const [wx, wy] = tileCenter(w.col, w.row);
      const x = wx + (px - wx) * 0.15 + Math.sin(this.time + bt.port) * 3;
      const y = wy + (py - wy) * 0.15 + Math.cos(this.time * 1.3 + bt.port) * 1.2;
      ctx.fillStyle = 'rgba(200,235,250,0.25)';
      ctx.beginPath(); ctx.ellipse(x - bt.dir * 7, y + 2, 9, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2A2F38';
      ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); ctx.lineTo(x + 6, y + 4); ctx.lineTo(x - 7, y + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = ['#C0392B', '#2E86C1', '#D4AC0D'][bt.port % 3];
      ctx.fillRect(x - 6, y - 4, 4, 4); ctx.fillRect(x - 1, y - 4, 4, 4);
      ctx.fillStyle = '#E8E6E3';
      ctx.fillRect(x + 4, y - 6, 3, 6);
    }

    // buildings, vehicles and ghost in painter's order (by row)
    const hover = this.ui.hover !== null ? map.tiles[this.ui.hover] : null;
    const drawables: Array<{ row: number; fn: () => void }> = [];
    for (const t of map.tiles) if (t.building) drawables.push({ row: t.row + 0.5, fn: () => this.drawBuilding(ctx, t, s) });
    for (const v of this.vehicles) {
      const a = map.tiles[v.path[0]];
      const b = map.tiles[v.path[1]];
      if (!a || !b) continue;
      drawables.push({ row: a.row + (b.row - a.row) * v.t + 0.2, fn: () => this.drawVehicle(ctx, v, a, b, s.playerContinent) });
    }
    if (hover && this.ui.placing && !hover.building) drawables.push({ row: hover.row + 0.6, fn: () => this.drawGhost(ctx, hover, this.ui.placing!, s) });
    drawables.sort((p, q) => p.row - q.row);
    for (const d of drawables) d.fn();

    // rockets
    for (const r of this.rockets) {
      ctx.fillStyle = '#E8E6E3';
      ctx.fillRect(r.x - 1.5, r.y - 9, 3, 10);
      ctx.fillStyle = '#C0392B';
      ctx.beginPath(); ctx.moveTo(r.x - 1.5, r.y - 9); ctx.lineTo(r.x, r.y - 13); ctx.lineTo(r.x + 1.5, r.y - 9); ctx.fill();
      this.glowQueue.push(() => {
        this.ctx.globalAlpha = 0.9;
        this.ctx.drawImage(this.glowSprite('rgba(255,170,60,1)'), r.x - 6, r.y, 12, 16);
      });
    }

    // soft particles (smoke, steam, vapor, rocket trails)
    for (const p of this.particles) {
      if (p.kind === 'spark' || p.kind === 'ember' || p.kind === 'weld') continue;
      const k = p.life / p.max;
      const fadeIn = Math.min(1, p.life / 0.35);
      const base = p.kind === 'steam' ? 0.7 : p.kind === 'trail' ? 0.6 : p.kind === 'vapor' ? 0.35 : 0.62;
      ctx.globalAlpha = (1 - k) * fadeIn * base;
      const d = p.r * 2.4;
      ctx.drawImage(this.puffSprite(p.color), p.x - d / 2, p.y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;

    // night & lights
    const night = this.ui.dayNight ? Math.max(0, Math.sin((this.time / 120) * Math.PI * 2 - Math.PI / 2)) ** 1.5 * 0.5 : 0;
    const haze = Math.max(0, (60 - s.planetHealth) / 60) * 0.22;
    if (night > 0.02 || haze > 0.01) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (haze > 0.01) { ctx.fillStyle = `rgba(120,70,20,${haze})`; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }
      if (night > 0.02) { ctx.fillStyle = `rgba(5,10,35,${night})`; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }
      ctx.restore();
      if (night > 0.05) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, night * 1.8);
        for (const t of map.tiles) {
          const b = t.building;
          if (!b || !operational(b)) continue;
          const [cx, cy] = tileCenter(t.col, t.row);
          const col = COMPUTE.includes(b.type) || b.type === 'lab' ? 'rgba(0,240,255,0.55)' : b.type === 'farm' || b.type === 'solar' ? 'rgba(0,0,0,0)' : 'rgba(255,190,90,0.6)';
          const g = this.glowSprite(col);
          const r = spriteSize(b.type) * 0.55;
          ctx.drawImage(g, cx - r, cy - r * 1.2, r * 2, r * 1.6);
        }
        for (const v of this.vehicles) {
          const a = map.tiles[v.path[0]]; const b = map.tiles[v.path[1]];
          if (!a || !b) continue;
          const [ax, ay] = tileCenter(a.col, a.row); const [bx, by] = tileCenter(b.col, b.row);
          const x = ax + (bx - ax) * v.t; const y = ay + (by - ay) * v.t;
          ctx.drawImage(this.glowSprite('rgba(255,240,180,0.9)'), x - 5, y - 6, 10, 8);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    }

    // additive light pass: furnace glows, reactors, beams, sparks, embers
    ctx.globalCompositeOperation = 'lighter';
    for (const g of this.glowQueue) g();
    for (const p of this.particles) {
      if (p.kind !== 'spark' && p.kind !== 'ember' && p.kind !== 'weld') continue;
      const k = p.life / p.max;
      ctx.globalAlpha = 1 - k;
      const d = p.kind === 'weld' ? 5 : p.kind === 'ember' ? 6 : p.r * 3;
      ctx.drawImage(this.glowSprite(p.color === '#FF8A2A' ? 'rgba(255,138,42,1)' : p.kind === 'weld' ? 'rgba(255,240,200,1)' : 'rgba(255,170,90,1)'), p.x - d / 2, p.y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // hover outline (+ adjacency lines while placing)
    if (hover) {
      const [cx, cy] = tileCenter(hover.col, hover.row);
      const p = this.ui.placing ? this.ui.placements?.get(hover.id) : null;
      diamondPath(ctx, cx, cy);
      ctx.strokeStyle = this.ui.placing ? (p?.ok ? '#00E5A0' : '#FF477E') : '#00F0FF';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (this.ui.placing && p?.ok) {
        for (const [c, r] of allNeighbours(hover.col, hover.row)) {
          if (c < 0 || r < 0 || c >= map.cols || r >= map.rows) continue;
          const n = map.tiles[r * map.cols + c];
          if (!n.building) continue;
          const rel = adjacencyRelation(this.ui.placing, n.building.type);
          if (!rel) continue;
          const [nx, ny] = tileCenter(n.col, n.row);
          ctx.strokeStyle = rel > 0 ? '#00E5A0' : '#FF477E';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.lineDashOffset = -this.time * 20;
          ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(nx, ny - 6); ctx.stroke();
          ctx.setLineDash([]);
          this.label(ctx, rel > 0 ? '+' : '−', nx, ny - 26, 'bold 14px', rel > 0 ? '#00E5A0' : '#FF477E');
        }
      }
    }

    // pings
    for (const p of this.pings) {
      const k = p.age / 2.5;
      for (let i = 0; i < 2; i++) {
        const kk = (k * 2 + i * 0.5) % 1;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, 0.5);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = (1 - kk) * (1 - k);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 8 + kk * 40, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      if (p.label) this.label(ctx, p.label, p.x, p.y - 46, 'bold 11px', p.color, 1 - k);
      ctx.globalAlpha = 1;
    }

    // floating texts (constant size on screen)
    for (const f of this.floaters) {
      if (f.age < 0) continue;
      this.label(ctx, f.text, f.x, f.y, 'bold 11px', f.color, Math.min(1, (2.2 - f.age) / 0.8));
    }

    // housing mood
    for (const t of map.tiles) {
      if (t.building?.type !== 'housing' || t.building.progress < 1) continue;
      if (housingComfort(s, t) >= 0) continue;
      const [cx, cy] = tileCenter(t.col, t.row);
      ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('😠', cx - 22, cy - 26 + Math.sin(this.time * 3 + t.id) * 1.5);
    }

    // region labels (constant size on screen)
    for (const r of map.regions) {
      const owned = s.ownedRegions.includes(r.id);
      this.label(ctx, t(r.name).toUpperCase(), r.center[0], r.center[1], owned ? '11px' : 'bold 12px', owned ? '#FFF4C2' : '#FFB84D', owned ? 0.55 : 0.95, owned ? 0 : -8, 2.5);
      if (!owned) {
        const cost = regionCost(s, r.id);
        this.label(ctx, undevelopedText(cost), r.center[0], r.center[1], '10px', s.budget >= cost ? '#00E5A0' : '#8A8D9A', 0.95, 7, 2.5);
      }
    }

    this.drawMinimap();
  }

  /** Text drawn in screen space at a world position, so it stays readable at any zoom. */
  private label(ctx: CanvasRenderingContext2D, text: string, wx: number, wy: number, font: string, color: string, alpha = 1, dy = 0, spacing = 0) {
    const p = this.worldToScreen(wx, wy);
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.font = `${font} "Share Tech Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (spacing && 'letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.88)';
    ctx.strokeText(text, p.x, p.y + dy);
    ctx.fillStyle = color;
    ctx.fillText(text, p.x, p.y + dy);
    ctx.restore();
  }

  private drawRoads(ctx: CanvasRenderingContext2D) {
    const map = this.map!;
    if (!this.roads.length) return;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(20,22,26,0.9)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (const [a, b] of this.roads) {
      const ta = map.tiles[a]; const tb = map.tiles[b];
      const [ax, ay] = tileCenter(ta.col, ta.row); const [bx, by] = tileCenter(tb.col, tb.row);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(90,92,100,0.9)';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,120,0.55)';
    ctx.lineWidth = 0.6;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
  }

  private drawLinks(ctx: CanvasRenderingContext2D) {
    const s = this.state!;
    const map = s.map!;
    const op = map.tiles.filter(t => t.building && operational(t.building));
    const power = op.filter(t => POWER.includes(t.building!.type));
    const consumers = op.filter(t => COMPUTE.includes(t.building!.type) || ['factory', 'chipfab', 'aifactory', 'robot'].includes(t.building!.type));
    const center = (t: Tile) => tileCenter(t.col, t.row);
    ctx.lineWidth = 1.1;
    ctx.setLineDash([2, 6]);
    ctx.lineDashOffset = -this.time * 18;
    ctx.strokeStyle = 'rgba(255,209,102,0.55)';
    ctx.beginPath();
    for (const p of power) {
      const [px, py] = center(p);
      const near = consumers.map(c => ({ c, d: (c.col - p.col) ** 2 + ((c.row - p.row) / 2) ** 2 })).sort((a, b) => a.d - b.d).slice(0, 2);
      for (const { c } of near) {
        const [cx, cy] = center(c);
        ctx.moveTo(px, py - 30); ctx.quadraticCurveTo((px + cx) / 2, Math.min(py, cy) - 46, cx, cy - 26);
      }
    }
    ctx.stroke();
    // data links between compute buildings
    const comp = op.filter(t => COMPUTE.includes(t.building!.type) || t.building!.type === 'lab');
    ctx.strokeStyle = 'rgba(0,240,255,0.5)';
    ctx.lineDashOffset = this.time * 30;
    ctx.beginPath();
    for (let i = 1; i < comp.length; i++) {
      const a = comp[i];
      let best = comp[0];
      let bd = Infinity;
      for (let j = 0; j < i; j++) {
        const d = (comp[j].col - a.col) ** 2 + ((comp[j].row - a.row) / 2) ** 2;
        if (d < bd) { bd = d; best = comp[j]; }
      }
      if (bd > 30) continue;
      const [ax, ay] = center(a); const [bx, by] = center(best);
      ctx.moveTo(ax, ay - 24); ctx.lineTo(bx, by - 24);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawBuilding(ctx: CanvasRenderingContext2D, t: Tile, s: GameState) {
    const b = t.building!;
    const def = buildingById[b.type];
    const [cx, cy] = tileCenter(t.col, t.row);
    const size = spriteSize(b.type);
    const constructing = b.progress < 1 && !b.upgrading;
    const tone = CATEGORY_COLOR[def.category];
    const x = cx - size / 2;
    const y = cy - size * 0.7;
    // contact shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    diamondPath(ctx, cx + 3, cy + 2, 4);
    ctx.fill();
    if (b.type === 'solar') {
      ctx.globalAlpha = constructing ? 0.45 : 1;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const px = cx + (i - j) * 10; const py = cy + (i + j) * 5 - 2;
        ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px + 8, py); ctx.lineTo(px, py + 4); ctx.lineTo(px - 8, py); ctx.closePath();
        ctx.fillStyle = '#123B5A'; ctx.fill();
        ctx.strokeStyle = '#4FC3F7'; ctx.lineWidth = 0.7; ctx.stroke();
        if (!constructing) {
          const glint = (Math.sin(this.time * 1.5 + i + j * 2) + 1) / 2;
          ctx.fillStyle = `rgba(180,230,255,${glint * 0.25})`; ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    } else {
      const im = this.img(spriteUrl(b.type, s.playerContinent));
      if (im) {
        const filter = b.type === 'chipfab' ? 'hue-rotate(160deg) saturate(1.3)' : b.type === 'fusion' ? 'hue-rotate(200deg) saturate(1.6) brightness(1.15)' : b.type === 'robot' ? 'hue-rotate(40deg)' : 'none';
        if (filter !== 'none') ctx.filter = filter;
        if (constructing) {
          // building rises from the ground as construction advances
          const h = Math.max(0.12, b.progress);
          const sh = im.naturalHeight * h;
          ctx.globalAlpha = 0.85;
          ctx.drawImage(im, 0, im.naturalHeight - sh, im.naturalWidth, sh, x, y + size * (1 - h), size, size * h);
          ctx.globalAlpha = 1;
        } else {
          ctx.drawImage(im, x, y, size, size);
        }
        ctx.filter = 'none';
      }
    }
    if (!constructing) this.fx(ctx, t, b.type, cx, cy, size);
    if (b.type === 'fusion' && !constructing) {
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.5 + Math.sin(this.time * 3) * 0.3;
      ctx.globalAlpha = pulse;
      ctx.drawImage(this.glowSprite('rgba(120,160,255,0.9)'), cx - 22, cy - size * 0.75, 44, 44);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    if (COMPUTE.includes(b.type) && !constructing) {
      // blinking server lights
      for (let i = 0; i < 3; i++) {
        const on = Math.sin(this.time * (4 + i) + t.id * 1.7 + i) > 0.2;
        if (!on) continue;
        ctx.fillStyle = i % 2 ? '#00F0FF' : '#00E5A0';
        ctx.fillRect(cx - 10 + i * 8, cy - size * 0.32 + (i % 2) * 3, 2, 2);
      }
    }
    if (constructing || b.upgrading) {
      // scaffold + crane
      const top = y + size * 0.15;
      ctx.strokeStyle = 'rgba(255,184,77,0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + 16, cy - 2); ctx.lineTo(cx + 16, top);
      ctx.lineTo(cx - 10 + Math.sin(this.time) * 6, top);
      ctx.moveTo(cx + 16, top); ctx.lineTo(cx + 24, top + 4);
      ctx.moveTo(cx - 10 + Math.sin(this.time) * 6, top); ctx.lineTo(cx - 10 + Math.sin(this.time) * 6, top + 12 + Math.sin(this.time * 1.3) * 4);
      ctx.stroke();
      // progress ring
      const ry = cy - size * 0.45;
      ctx.fillStyle = 'rgba(11,12,16,0.85)';
      ctx.beginPath(); ctx.arc(cx, ry, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = b.upgrading ? '#FFD166' : tone;
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(cx, ry, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * b.progress); ctx.stroke();
      ctx.fillStyle = '#FFF4C2'; ctx.font = '8px "Share Tech Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillText(b.upgrading ? '▲' : `${Math.floor(b.progress * 100)}`, cx, ry + 3);
    }
    const badge = BADGE[b.type];
    if (badge && !constructing) {
      ctx.fillStyle = 'rgba(11,12,16,0.9)';
      ctx.beginPath(); ctx.arc(cx + 18, cy - 4, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = tone; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = tone; ctx.font = '7px "Share Tech Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillText(badge, cx + 18, cy - 1.6);
    }
    if (!constructing && b.level > 1) {
      for (let i = 0; i < b.level; i++) {
        const px = cx - 8 + i * 8; const py = cy + HH - 1;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 3, py - 3); ctx.lineTo(px + 6, py); ctx.lineTo(px + 3, py + 3); ctx.closePath();
        ctx.fillStyle = '#FFD166'; ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
  }

  private drawVehicle(ctx: CanvasRenderingContext2D, v: Vehicle, a: Tile, b: Tile, faction: string | null) {
    const [ax, ay] = tileCenter(a.col, a.row);
    const [bx, by] = tileCenter(b.col, b.row);
    const x = ax + (bx - ax) * v.t;
    const y = ay + (by - ay) * v.t;
    const im = this.img(faction ? `./assets/sprites/factions/${faction}/terra-truck.png?v=sheet-v1` : './assets/sprites/terra-truck.png?v=sheet-v1');
    const w = v.kind === 'truck' ? 15 : 11;
    ctx.save();
    ctx.translate(x, y - 2);
    if (bx < ax) ctx.scale(-1, 1);
    if (im) ctx.drawImage(im, -w / 2, -w * 0.7, w, w);
    else { ctx.fillStyle = '#C9CED8'; ctx.fillRect(-3, -3, 6, 4); }
    ctx.restore();
  }

  private drawGhost(ctx: CanvasRenderingContext2D, t: Tile, type: BuildingId, s: GameState) {
    const p = this.ui.placements?.get(t.id);
    const [cx, cy] = tileCenter(t.col, t.row);
    const size = spriteSize(type);
    if (type === 'solar') return;
    const im = this.img(spriteUrl(type, s.playerContinent));
    if (!im) return;
    ctx.globalAlpha = 0.55 + Math.sin(this.time * 5) * 0.1;
    if (!p?.ok) ctx.filter = 'grayscale(1) sepia(1) hue-rotate(-50deg) saturate(4)';
    ctx.drawImage(im, cx - size / 2, cy - size * 0.7, size, size);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    if (p?.ok) {
      this.label(ctx, `×${p.mult.toFixed(2)}`, cx, cy - size * 0.78, 'bold 13px', p.mult >= 1.05 ? '#00E5A0' : p.mult < 0.9 ? '#FF477E' : '#FFB84D');
    }
  }

  private drawMinimap() {
    const m = this.mini;
    const mc = this.miniCanvas;
    const s = this.state;
    if (!m || !mc || !this.miniCache || !s?.map) return;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.drawImage(this.miniCache, 0, 0);
    const b = this.bounds;
    const sc = Math.min(mc.width / (b.maxX - b.minX), mc.height / (b.maxY - b.minY));
    const ox = (mc.width - (b.maxX - b.minX) * sc) / 2;
    const oy = (mc.height - (b.maxY - b.minY) * sc) / 2;
    const tx = (wx: number) => ox + (wx - b.minX) * sc;
    const ty = (wy: number) => oy + (wy - b.minY) * sc;
    for (const t of s.map.tiles) {
      if (!t.building) continue;
      const [cx, cy] = tileCenter(t.col, t.row);
      m.fillStyle = t.building.progress < 1 ? '#FFB84D' : CATEGORY_COLOR[buildingById[t.building.type].category];
      m.fillRect(tx(cx) - 1.5, ty(cy) - 1.5, 3, 3);
    }
    for (const p of this.pings) {
      m.strokeStyle = p.color;
      m.globalAlpha = 1 - p.age / 2.5;
      m.lineWidth = 1.5;
      m.beginPath(); m.arc(tx(p.x), ty(p.y), 3 + (p.age % 1) * 8, 0, Math.PI * 2); m.stroke();
      m.globalAlpha = 1;
    }
    // camera rectangle
    const tl = this.screenToWorld(0, 0);
    const br = this.screenToWorld(this.viewW, this.viewH);
    m.strokeStyle = '#FFF4C2';
    m.lineWidth = 1.2;
    m.strokeRect(tx(tl.x), ty(tl.y), (br.x - tl.x) * sc, (br.y - tl.y) * sc);
  }
}
