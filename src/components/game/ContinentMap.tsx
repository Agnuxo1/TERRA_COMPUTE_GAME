import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { useGame } from '../../App';
import { buildingById, CATEGORY_COLOR, depositInfo, SPRITE_FOR, terrainInfo } from '../../game/data';
import { evaluatePlacement, housingComfort, regionCost, scaledCost, type Placement } from '../../game/engine';
import { TILE_H, TILE_W, edgeNeighbours, tileCenter } from '../../game/mapgen';
import type { BuildingId, GameState, MapData, Tile } from '../../game/types';
import { fmtMoney } from '../../game/format';
import { play } from '../../hooks/useSound';

const HW = TILE_W / 2;
const HH = TILE_H / 2;
const SIDE = 7; // extruded block height

// Only buildings that share a sprite with another type get a small badge.
const BADGE: Partial<Record<BuildingId, string>> = {
  hospital: '✚', school: '✎', chipfab: '◆', satellite: '◉', mainframe: 'G', super: 'T', datacenter: 'P', gpucluster: 'E',
  robot: '⚙', nuclear: '☢', fusion: '✺',
};

function diamond(cx: number, cy: number, inset = 0): string {
  const w = HW - inset;
  const h = HH - inset / 2;
  return `${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`;
}

function spriteUrl(type: BuildingId, faction: string | null): string {
  const file = SPRITE_FOR[type];
  return faction ? `/assets/sprites/factions/${faction}/${file}?v=sheet-v1` : `/assets/sprites/${file}?v=sheet-v1`;
}

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Static terrain layer (memoised: only changes when terrain or ownership changes) ───
const TerrainLayer = memo(function TerrainLayer({ map, owned, terrainKey }: { map: MapData; owned: string[]; terrainKey: string }) {
  void terrainKey;
  const ownedSet = new Set(owned);
  const land = map.tiles.filter(t => t.terrain !== 'water');
  const borders: string[] = [];
  for (const t of land) {
    const [cx, cy] = tileCenter(t.col, t.row);
    const nb = edgeNeighbours(t.col, t.row);
    const edges: Array<[number, number, number, number]> = [
      [cx - HW, cy, cx, cy - HH], [cx, cy - HH, cx + HW, cy], [cx - HW, cy, cx, cy + HH], [cx, cy + HH, cx + HW, cy],
    ];
    nb.forEach(([c, r], i) => {
      if (c < 0 || r < 0 || c >= map.cols || r >= map.rows) return;
      const n = map.tiles[r * map.cols + c];
      if (n.terrain !== 'water' && n.region !== t.region && t.id < n.id) {
        const e = edges[i];
        borders.push(`M${e[0]},${e[1]}L${e[2]},${e[3]}`);
      }
    });
  }
  return (
    <g>
      {/* sea */}
      {map.tiles.filter(t => t.terrain === 'water').map(t => {
        const [cx, cy] = tileCenter(t.col, t.row);
        return <polygon key={t.id} points={diamond(cx, cy)} fill={(t.col + t.row) % 2 ? '#0A1E28' : '#0B2230'} />;
      })}
      {/* block sides for a slab look */}
      {land.map(t => {
        const [cx, cy] = tileCenter(t.col, t.row);
        const info = terrainInfo[t.terrain];
        return (
          <g key={`s${t.id}`}>
            <polygon points={`${cx - HW},${cy} ${cx},${cy + HH} ${cx},${cy + HH + SIDE} ${cx - HW},${cy + SIDE}`} fill={info.color} filter="brightness(0.6)" style={{ filter: 'brightness(0.55)' }} />
            <polygon points={`${cx + HW},${cy} ${cx},${cy + HH} ${cx},${cy + HH + SIDE} ${cx + HW},${cy + SIDE}`} fill={info.color} style={{ filter: 'brightness(0.4)' }} />
          </g>
        );
      })}
      {land.map(t => {
        const [cx, cy] = tileCenter(t.col, t.row);
        const info = terrainInfo[t.terrain];
        const r = hash(t.id);
        return (
          <g key={t.id}>
            <polygon points={diamond(cx, cy)} fill={info.top} stroke="#00000055" strokeWidth={0.8} />
            {t.terrain === 'forest' && [0, 1, 2].map(i => {
              const ox = (hash(t.id * 3 + i) - 0.5) * 30;
              const oy = (hash(t.id * 7 + i) - 0.5) * 10;
              return <path key={i} d={`M${cx + ox},${cy + oy - 11} l5,10 h-10 z`} fill="#133A1F" stroke="#2F6B3A" strokeWidth={0.6} />;
            })}
            {t.terrain === 'hills' && (
              <path d={`M${cx - 16},${cy + 5} l9,-12 l6,7 l5,-5 l10,10 z`} fill="#5A4E40" stroke="#7A6A55" strokeWidth={0.6} />
            )}
            {t.terrain === 'desert' && (
              <path d={`M${cx - 16},${cy + 2 + r * 3} q8,-5 16,0 t16,0`} fill="none" stroke="#8A7446" strokeWidth={1} />
            )}
            {t.terrain === 'tundra' && [0, 1, 2, 3].map(i => (
              <circle key={i} cx={cx + (hash(t.id + i * 5) - 0.5) * 34} cy={cy + (hash(t.id * 2 + i) - 0.5) * 12} r={1.1} fill="#C9D6E2" opacity={0.7} />
            ))}
            {t.terrain === 'fertile' && !t.river && (
              <path d={`M${cx - 14},${cy - 2} l14,7 M${cx - 8},${cy - 5} l14,7 M${cx - 2},${cy - 8} l14,7`} stroke="#4E7A3E" strokeWidth={1.2} />
            )}
            {t.river && (
              <path d={`M${cx - 18},${cy + 3} q9,-7 18,-2 t18,-3`} fill="none" stroke="#3FA7C9" strokeWidth={2.2} opacity={0.85} />
            )}
            {!ownedSet.has(t.region || '') && <polygon points={diamond(cx, cy)} fill="url(#locked)" />}
          </g>
        );
      })}
      <path d={borders.join('')} stroke="#FFB84D" strokeOpacity={0.45} strokeWidth={1.4} strokeDasharray="4 3" fill="none" />
    </g>
  );
});

function BuildingSprite({ tile, faction }: { tile: Tile; faction: string | null }) {
  const b = tile.building!;
  const def = buildingById[b.type];
  const [cx, cy] = tileCenter(tile.col, tile.row);
  const building = b.progress < 1 && !b.upgrading;
  const tone = CATEGORY_COLOR[def.category];
  const size = b.type === 'aifactory' ? 84 : ['gpucluster', 'datacenter', 'nuclear', 'fusion'].includes(b.type) ? 78 : b.type === 'mainframe' ? 64 : 72;
  const smoke = (b.type === 'coal' || b.type === 'factory' || b.type === 'chipfab') && !building;
  const badge = BADGE[b.type];
  return (
    <g style={{ pointerEvents: 'none' }}>
      {b.type === 'solar' ? (
        <g opacity={building ? 0.45 : 1}>
          {[-1, 0, 1].map(i => [-1, 0, 1].map(j => {
            const x = cx + (i - j) * 10;
            const y = cy + (i + j) * 5 - 2;
            return <polygon key={`${i}${j}`} points={`${x},${y - 4} ${x + 8},${y} ${x},${y + 4} ${x - 8},${y}`} fill="#123B5A" stroke="#4FC3F7" strokeWidth={0.7} />;
          }))}
        </g>
      ) : (
        <image
          href={spriteUrl(b.type, faction)}
          x={cx - size / 2}
          y={cy + HH + 2 - size}
          width={size}
          height={size}
          opacity={building ? 0.42 : 1}
          style={b.type === 'chipfab' ? { filter: 'hue-rotate(160deg) saturate(1.3)' } : b.type === 'fusion' ? { filter: 'hue-rotate(200deg) saturate(1.6) brightness(1.15)' } : b.type === 'robot' ? { filter: 'hue-rotate(40deg)' } : undefined}
        />
      )}
      {smoke && (
        <>
          <circle className="smoke-puff" cx={cx - 6} cy={cy - size * 0.55} r={3.5} fill="#B8C0CC" />
          <circle className="smoke-puff smoke-late" cx={cx + 4} cy={cy - size * 0.5} r={4.5} fill="#9AA3AF" />
        </>
      )}
      {badge && !building && (
        <g>
          <circle cx={cx + 18} cy={cy - 4} r={5.5} fill="#0B0C10E6" stroke={tone} strokeWidth={0.9} />
          <text x={cx + 18} y={cy - 1.6} textAnchor="middle" fontSize={7} fill={tone} fontFamily="Share Tech Mono, monospace">{badge}</text>
        </g>
      )}
      {/* level pips */}
      {!building && b.level > 1 && (
        <g>
          {Array.from({ length: b.level }).map((_, i) => (
            <polygon key={i} points={`${cx - 8 + i * 8},${cy + HH - 1} ${cx - 5 + i * 8},${cy + HH - 4} ${cx - 2 + i * 8},${cy + HH - 1} ${cx - 5 + i * 8},${cy + HH + 2}`} fill="#FFD166" stroke="#000" strokeWidth={0.5} />
          ))}
        </g>
      )}
      {(building || b.upgrading) && (
        <g>
          <circle cx={cx} cy={cy - size * 0.45} r={10} fill="#0B0C10CC" stroke="#333" strokeWidth={2} />
          <circle
            cx={cx} cy={cy - size * 0.45} r={10} fill="none" stroke={b.upgrading ? '#FFD166' : tone} strokeWidth={2.4}
            strokeDasharray={`${2 * Math.PI * 10 * b.progress} ${2 * Math.PI * 10}`}
            transform={`rotate(-90 ${cx} ${cy - size * 0.45})`}
          />
          <text x={cx} y={cy - size * 0.45 + 3} textAnchor="middle" fontSize={8} fill="#FFF4C2" fontFamily="Share Tech Mono, monospace">
            {b.upgrading ? '▲' : `${Math.floor(b.progress * 100)}`}
          </text>
        </g>
      )}
    </g>
  );
}

export function placementColor(p: Placement | null): string {
  if (!p || !p.ok) return 'rgba(255,71,126,0.0)';
  if (p.mult >= 1.3) return 'rgba(0,229,160,0.55)';
  if (p.mult >= 1.05) return 'rgba(0,229,160,0.32)';
  if (p.mult >= 0.9) return 'rgba(255,184,77,0.30)';
  return 'rgba(255,71,126,0.38)';
}

export default function ContinentMap() {
  const { state, dispatch } = useGame();
  const map = state.map!;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<number | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);

  // Bounds of the land for "fit to screen"
  const bounds = useMemo(() => {
    const land = map.tiles.filter(t => t.terrain !== 'water');
    const xs = land.map(t => tileCenter(t.col, t.row)[0]);
    const ys = land.map(t => tileCenter(t.col, t.row)[1]);
    return { minX: Math.min(...xs) - HW - 20, maxX: Math.max(...xs) + HW + 20, minY: Math.min(...ys) - 70, maxY: Math.max(...ys) + HH + 24 };
  }, [map]);

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    const scale = Math.min(w / bw, h / bh) * 0.96;
    setView({ scale, x: (w - bw * scale) / 2 - bounds.minX * scale, y: (h - bh * scale) / 2 - bounds.minY * scale });
  }, [bounds]);

  useEffect(() => {
    fit();
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  // Esc cancels placement
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.placing) dispatch({ type: 'SET_PLACING', building: null });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.placing, dispatch]);

  const toWorld = (clientX: number, clientY: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left - view.x) / view.scale, y: (clientY - rect.top - view.y) / view.scale };
  };

  const tileAt = (wx: number, wy: number): Tile | null => {
    // approximate row/col then test the diamonds around it
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
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button === 2) return;
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    const d = drag.current;
    if (d) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
      if (d.moved) setView(v => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
    }
    const w = toWorld(e.clientX, e.clientY);
    const t = tileAt(w.x, w.y);
    setHover(t && t.terrain !== 'water' ? t.id : null);
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) return;
    const w = toWorld(e.clientX, e.clientY);
    const t = tileAt(w.x, w.y);
    if (!t || t.terrain === 'water') {
      dispatch({ type: 'SELECT_TILE', tileId: null });
      return;
    }
    if (state.placing) {
      const pl = evaluatePlacement(state, t, state.placing);
      if (pl.ok && state.budget >= scaledCost(state, state.placing)) {
        play('build');
        dispatch({ type: 'BUILD', tileId: t.id, building: state.placing });
        if (!e.shiftKey) dispatch({ type: 'SET_PLACING', building: null });
      } else {
        play('alert');
      }
      return;
    }
    play('click');
    dispatch({ type: 'SELECT_TILE', tileId: t.id });
  };
  const onWheel = (e: ReactWheelEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setView(v => {
      const scale = Math.max(0.35, Math.min(3.2, v.scale * factor));
      const k = scale / v.scale;
      return { scale, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k };
    });
  };
  const zoomBy = (factor: number) => {
    const el = wrapRef.current!;
    const mx = el.clientWidth / 2;
    const my = el.clientHeight / 2;
    setView(v => {
      const scale = Math.max(0.35, Math.min(3.2, v.scale * factor));
      const k = scale / v.scale;
      return { scale, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k };
    });
  };

  const terrainKey = useMemo(() => map.tiles.map(t => t.terrain[0]).join(''), [map.tiles]);
  const placements = useMemo(() => {
    if (!state.placing) return null;
    const res = new Map<number, Placement>();
    for (const t of map.tiles) {
      if (t.terrain === 'water' || t.building) continue;
      res.set(t.id, evaluatePlacement(state, t, state.placing));
    }
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.placing, map.tiles, state.ownedRegions, state.unlockedTechs]);

  const hoverTile = hover !== null ? map.tiles[hover] : null;
  const hoverPl = hoverTile && state.placing ? placements?.get(hoverTile.id) ?? evaluatePlacement(state, hoverTile, state.placing) : null;
  const selected = state.selectedTile !== null ? map.tiles[state.selectedTile] : null;
  const buildingsSorted = useMemo(() => map.tiles.filter(t => t.building).sort((a, b) => a.row - b.row || a.col - b.col), [map.tiles]);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #0F2A36 0%, #081820 55%, #05080C 100%)',
        cursor: state.placing ? 'crosshair' : drag.current?.moved ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => { setHover(null); setMouse(null); }}
      onWheel={onWheel}
      onContextMenu={e => { e.preventDefault(); if (state.placing) dispatch({ type: 'SET_PLACING', building: null }); }}
    >
      {/* faint blueprint grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,240,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.04) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="locked" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="rgba(5,5,8,0.62)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,184,77,0.18)" strokeWidth="1.5" />
          </pattern>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          <TerrainLayer map={map} owned={state.ownedRegions} terrainKey={terrainKey + state.ownedRegions.join()} />

          {/* deposits */}
          {map.tiles.filter(t => t.deposit && !t.building).map(t => {
            const [cx, cy] = tileCenter(t.col, t.row);
            const d = depositInfo[t.deposit!];
            return (
              <g key={`d${t.id}`} style={{ pointerEvents: 'none' }}>
                <circle cx={cx + 14} cy={cy - 2} r={6} fill="#0B0C10" stroke={d.color} strokeWidth={1} />
                <text x={cx + 14} y={cy + 1.5} textAnchor="middle" fontSize={8} fill={d.color}>{d.icon}</text>
              </g>
            );
          })}

          {/* placement heatmap */}
          {placements && [...placements.entries()].map(([id, p]) => {
            const t = map.tiles[id];
            const [cx, cy] = tileCenter(t.col, t.row);
            return <polygon key={`p${id}`} points={diamond(cx, cy, 2)} fill={placementColor(p)} style={{ pointerEvents: 'none' }} />;
          })}

          {/* hover & selection */}
          {hoverTile && (
            <polygon points={diamond(...tileCenter(hoverTile.col, hoverTile.row))} fill={state.placing ? 'none' : 'rgba(0,240,255,0.10)'} stroke={state.placing ? (hoverPl?.ok ? '#00E5A0' : '#FF477E') : '#00F0FF'} strokeWidth={2} style={{ pointerEvents: 'none' }} />
          )}
          {selected && (
            <polygon className="tile-selected" points={diamond(...tileCenter(selected.col, selected.row))} fill="none" stroke="#FFD166" strokeWidth={2.4} style={{ pointerEvents: 'none' }} />
          )}

          {/* buildings (painter's order) */}
          {buildingsSorted.map(t => <BuildingSprite key={`b${t.id}`} tile={t} faction={state.playerContinent} />)}

          {/* housing mood */}
          {buildingsSorted.filter(t => t.building!.type === 'housing' && t.building!.progress >= 1).map(t => {
            const c = housingComfort(state, t);
            if (c >= 0) return null;
            const [cx, cy] = tileCenter(t.col, t.row);
            return <text key={`m${t.id}`} x={cx - 22} y={cy - 26} fontSize={10} style={{ pointerEvents: 'none' }}>😠</text>;
          })}

          {/* region labels */}
          {map.regions.map(r => {
            const owned = state.ownedRegions.includes(r.id);
            const cost = regionCost(state, r.id);
            return (
              <g key={r.id} style={{ pointerEvents: 'none' }} opacity={owned ? 0.55 : 0.95}>
                <text x={r.center[0]} y={r.center[1] - (owned ? 0 : 8)} textAnchor="middle" fontSize={owned ? 9 : 10} fontFamily="Share Tech Mono, monospace" fill={owned ? '#FFF4C2' : '#FFB84D'} stroke="#000" strokeWidth={2.5} paintOrder="stroke" letterSpacing={1.5}>
                  {r.name.toUpperCase()}
                </text>
                {!owned && (
                  <text x={r.center[0]} y={r.center[1] + 6} textAnchor="middle" fontSize={8.5} fontFamily="Share Tech Mono, monospace" fill={state.budget >= cost ? '#00E5A0' : '#8A8D9A'} stroke="#000" strokeWidth={2.5} paintOrder="stroke">
                    UNDEVELOPED · {fmtMoney(cost)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* hover tooltip */}
      {hoverTile && mouse && <TileTooltip state={state} tile={hoverTile} placement={hoverPl} x={mouse.x} y={mouse.y} />}

      {/* zoom controls */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-20">
        {[
          { l: '+', f: () => zoomBy(1.25), t: 'Zoom in' },
          { l: '−', f: () => zoomBy(0.8), t: 'Zoom out' },
          { l: '⤢', f: fit, t: 'Fit continent' },
        ].map(b => (
          <button key={b.l} title={b.t} onClick={b.f} onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}
            className="w-7 h-7 rounded font-mono-data text-sm hover:brightness-150"
            style={{ background: 'rgba(11,12,16,0.85)', border: '1px solid var(--border-light)', color: 'var(--cyan)' }}>
            {b.l}
          </button>
        ))}
      </div>

      {/* placement banner */}
      {state.placing && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded font-mono-data text-[11px] animate-fade-up"
          style={{ background: 'rgba(11,12,16,0.92)', border: `1px solid ${CATEGORY_COLOR[buildingById[state.placing].category]}`, color: 'var(--text-primary)' }}
          onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>
          PLACING <b style={{ color: CATEGORY_COLOR[buildingById[state.placing].category] }}>{buildingById[state.placing].name.toUpperCase()}</b> · {fmtMoney(scaledCost(state, state.placing))}
          <span style={{ color: 'var(--text-tertiary)' }}> · green = bonus · shift+click = place more · Esc/right-click = cancel</span>
        </div>
      )}
    </div>
  );
}

function TileTooltip({ state, tile, placement, x, y }: { state: GameState; tile: Tile; placement: Placement | null; x: number; y: number }) {
  const info = terrainInfo[tile.terrain];
  const region = state.map!.regions.find(r => r.id === tile.region);
  const owned = tile.region ? state.ownedRegions.includes(tile.region) : false;
  const b = tile.building;
  const left = x > 520 ? x - 236 : x + 18;
  return (
    <div className="absolute z-30 pointer-events-none rounded px-2.5 py-2 font-mono-data text-[10px] leading-snug"
      style={{ left, top: Math.max(4, y - 10), width: 220, background: 'rgba(8,9,13,0.94)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
      <div className="flex justify-between">
        <span style={{ color: '#FFF4C2' }}>{b ? buildingById[b.type].name : info.name}</span>
        <span style={{ color: owned ? 'var(--green)' : 'var(--amber)' }}>{region?.name}</span>
      </div>
      {b && <div style={{ color: 'var(--text-tertiary)' }}>{info.name} · level {b.level}{b.progress < 1 ? ` · building ${Math.floor(b.progress * 100)}%` : ''}</div>}
      {!b && <div style={{ color: 'var(--text-tertiary)' }}>{info.note}</div>}
      {tile.coast && <div style={{ color: 'var(--cyan)' }}>≈ Coast</div>}
      {tile.river && <div style={{ color: 'var(--cyan)' }}>≈ River</div>}
      {tile.deposit && <div style={{ color: depositInfo[tile.deposit].color }}>{depositInfo[tile.deposit].icon} {depositInfo[tile.deposit].name}: {depositInfo[tile.deposit].note}</div>}
      {!owned && <div style={{ color: 'var(--amber)' }}>Undeveloped — select it to develop the region.</div>}
      {placement && (
        <div className="mt-1 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          {placement.ok ? (
            <>
              <div style={{ color: placement.mult >= 1.05 ? 'var(--green)' : placement.mult < 0.9 ? 'var(--rose)' : 'var(--amber)' }}>
                OUTPUT ×{placement.mult.toFixed(2)}
              </div>
              {placement.notes.map((n, i) => (
                <div key={i} className="flex justify-between"><span>{n.label}</span><span style={{ color: n.good ? 'var(--green)' : 'var(--rose)' }}>{n.value}</span></div>
              ))}
            </>
          ) : <div style={{ color: 'var(--rose)' }}>✖ {placement.reason}</div>}
        </div>
      )}
    </div>
  );
}
