import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useGame } from '../../../App';
import { buildingById, CATEGORY_COLOR, depositInfo, terrainInfo } from '../../../game/data';
import { buildQuote, evaluatePlacement, type Placement } from '../../../game/engine';
import { tileCenter } from '../../../game/mapgen';
import type { GameState, Tile } from '../../../game/types';
import { fmtMoney } from '../../../game/format';
import { play } from '../../../hooks/useSound';
import { MapRenderer } from './renderer';

export interface MapOptions {
  edgeScroll?: boolean;
  scrollSpeed?: number;
  dayNight?: boolean;
  reduceMotion?: boolean;
}

const MINI_W = 196;
const MINI_H = 124;

export default function RTSMap({ options = {} }: { options?: MapOptions }) {
  const { state, dispatch } = useGame();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean; button: number } | null>(null);
  const keys = useRef(new Set<string>());
  const edge = useRef({ x: 0, y: 0 });
  const lastClick = useRef({ t: 0, id: -1 });
  const opts = useRef(options);
  opts.current = options;

  // Renderer lifecycle
  useEffect(() => {
    const canvas = canvasRef.current!;
    const r = new MapRenderer(canvas, miniRef.current);
    rendererRef.current = r;
    const wrap = wrapRef.current!;
    r.resize(wrap.clientWidth, wrap.clientHeight);
    r.start();
    let fitted = false;
    const ro = new ResizeObserver(() => {
      r.resize(wrap.clientWidth, wrap.clientHeight);
      if (!fitted) { r.fit(); fitted = true; } else r.clampCam();
    });
    ro.observe(wrap);
    // Keyboard / edge scrolling pump
    let raf = 0;
    let last = performance.now();
    const pump = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const sp = 620 * (opts.current.scrollSpeed ?? 1) * dt;
      let dx = 0, dy = 0;
      if (keys.current.has('ArrowLeft')) dx += sp;
      if (keys.current.has('ArrowRight')) dx -= sp;
      if (keys.current.has('ArrowUp')) dy += sp;
      if (keys.current.has('ArrowDown')) dy -= sp;
      if (opts.current.edgeScroll) { dx += edge.current.x * sp; dy += edge.current.y * sp; }
      if (dx || dy) r.pan(dx, dy);
      raf = requestAnimationFrame(pump);
    };
    raf = requestAnimationFrame(pump);
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key.startsWith('Arrow')) { keys.current.add(e.key); e.preventDefault(); }
      if (e.key === 'Home') r.fit();
      if (e.key === '+' || e.key === '=') r.zoomAt(r.viewW / 2, r.viewH / 2, 1.2);
      if (e.key === '-') r.zoomAt(r.viewW / 2, r.viewH / 2, 1 / 1.2);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      r.stop();
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Feed state & UI into the renderer
  const placements = useMemo(() => {
    if (!state.placing || !state.map) return null;
    const res = new Map<number, Placement>();
    for (const t of state.map.tiles) {
      if (t.terrain === 'water' || t.building) continue;
      res.set(t.id, evaluatePlacement(state, t, state.placing));
    }
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.placing, state.map?.tiles, state.ownedRegions, state.unlockedTechs]);

  useEffect(() => { rendererRef.current?.setState(state); }, [state]);
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.ui = {
      hover, selected: state.selectedTile, placing: state.placing, placements,
      dayNight: options.dayNight ?? true, reduceMotion: options.reduceMotion ?? false,
    };
  }, [hover, state.selectedTile, state.placing, placements, options.dayNight, options.reduceMotion]);

  // Esc cancels placement
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.placing) dispatch({ type: 'SET_PLACING', building: null });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.placing, dispatch]);

  const local = (e: { clientX: number; clientY: number }) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false, button: e.button };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const p = local(e);
    setMouse({ x: p.x, y: p.y });
    const m = 18;
    edge.current = { x: p.x < m ? 1 : p.x > p.w - m ? -1 : 0, y: p.y < m ? 1 : p.y > p.h - m ? -1 : 0 };
    const d = drag.current;
    const r = rendererRef.current!;
    if (d) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
      if (d.moved) { r.pan(dx, dy); d.x = e.clientX; d.y = e.clientY; }
    }
    const t = r.tileAtScreen(p.x, p.y);
    setHover(t && t.terrain !== 'water' ? t.id : null);
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    if (d.button === 2) {
      if (state.placing) dispatch({ type: 'SET_PLACING', building: null });
      else dispatch({ type: 'SELECT_TILE', tileId: null });
      return;
    }
    const r = rendererRef.current!;
    const p = local(e);
    const t = r.tileAtScreen(p.x, p.y);
    if (!t || t.terrain === 'water') {
      dispatch({ type: 'SELECT_TILE', tileId: null });
      return;
    }
    if (state.placing) {
      const pl = evaluatePlacement(state, t, state.placing);
      const q = buildQuote(state, state.placing);
      if (pl.ok && q.ok) {
        play('build');
        dispatch({ type: 'BUILD', tileId: t.id, building: state.placing });
        if (!e.shiftKey) dispatch({ type: 'SET_PLACING', building: null });
      } else play('alert');
      return;
    }
    // double click: focus the camera on the tile
    const now = performance.now();
    if (lastClick.current.id === t.id && now - lastClick.current.t < 350) {
      const [cx, cy] = tileCenter(t.col, t.row);
      r.zoomAt(p.x, p.y, 1.5);
      r.centerOn(cx, cy - 20);
    }
    lastClick.current = { t: now, id: t.id };
    play('click');
    dispatch({ type: 'SELECT_TILE', tileId: t.id });
  };

  const miniDrag = useRef(false);
  const miniMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = rendererRef.current;
    if (!r || !miniDrag.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (MINI_W / rect.width);
    const sy = (e.clientY - rect.top) * (MINI_H / rect.height);
    const w = r.miniToWorld(sx, sy);
    r.centerOn(w.x, w.y);
  };

  const hoverTile = hover !== null && state.map ? state.map.tiles[hover] : null;
  const hoverPl = hoverTile && state.placing ? placements?.get(hoverTile.id) ?? evaluatePlacement(state, hoverTile, state.placing) : null;
  const placingQuote = state.placing ? buildQuote(state, state.placing) : null;

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #0F2A36 0%, #081820 55%, #05080C 100%)', cursor: state.placing ? 'crosshair' : 'default', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => { setHover(null); setMouse(null); edge.current = { x: 0, y: 0 }; }}
      onWheel={e => { const p = local(e); rendererRef.current?.zoomAt(p.x, p.y, e.deltaY < 0 ? 1.12 : 1 / 1.12); }}
      onContextMenu={e => e.preventDefault()}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,240,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.035) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.65)' }} />

      {hoverTile && mouse && !drag.current?.moved && <TileTooltip state={state} tile={hoverTile} placement={hoverPl} x={mouse.x} y={mouse.y} />}

      {/* Minimap */}
      <div data-tutorial="minimap" className="absolute bottom-2 left-2 z-20 rounded overflow-hidden"
        style={{ border: '1px solid var(--border-light)', background: 'rgba(5,8,12,0.9)', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}
        onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onPointerMove={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
        <div className="flex justify-between px-1.5 py-0.5 font-mono-data text-[8.5px] tracking-widest" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
          <span>SECTOR MAP</span><span style={{ color: 'var(--cyan)' }}>HOME · fit</span>
        </div>
        <canvas ref={miniRef} width={MINI_W} height={MINI_H} className="block cursor-pointer" style={{ width: MINI_W, height: MINI_H }}
          onPointerDown={e => { miniDrag.current = true; e.currentTarget.setPointerCapture(e.pointerId); miniMove(e); }}
          onPointerMove={miniMove}
          onPointerUp={() => { miniDrag.current = false; }} />
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-20" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>
        {[
          { l: '+', f: () => { const r = rendererRef.current!; r.zoomAt(r.viewW / 2, r.viewH / 2, 1.25); }, t: 'Zoom in (+)' },
          { l: '−', f: () => { const r = rendererRef.current!; r.zoomAt(r.viewW / 2, r.viewH / 2, 0.8); }, t: 'Zoom out (−)' },
          { l: '⤢', f: () => rendererRef.current?.fit(), t: 'Fit continent (Home)' },
        ].map(b => (
          <button key={b.l} title={b.t} onClick={b.f}
            className="w-7 h-7 rounded font-mono-data text-sm hover:brightness-150"
            style={{ background: 'rgba(11,12,16,0.85)', border: '1px solid var(--border-light)', color: 'var(--cyan)' }}>
            {b.l}
          </button>
        ))}
      </div>

      {/* Placement banner */}
      {state.placing && placingQuote && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded font-mono-data text-[11px] animate-fade-up whitespace-nowrap"
          style={{ background: 'rgba(11,12,16,0.92)', border: `1px solid ${CATEGORY_COLOR[buildingById[state.placing].category]}`, color: 'var(--text-primary)' }}
          onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>
          PLACING <b style={{ color: CATEGORY_COLOR[buildingById[state.placing].category] }}>{buildingById[state.placing].name.toUpperCase()}</b>
          {' · '}{fmtMoney(placingQuote.money)}
          {placingQuote.steel > 0 && <span style={{ color: '#C9CED8' }}> + ⛓{placingQuote.steel}</span>}
          {placingQuote.chips > 0 && <span style={{ color: '#67E8F9' }}> + ◆{placingQuote.chips}</span>}
          {placingQuote.importCost > 0 && <span style={{ color: 'var(--amber)' }}> (+{fmtMoney(placingQuote.importCost)} import)</span>}
          {!placingQuote.ok && <span style={{ color: 'var(--rose)' }}> · {placingQuote.reason}</span>}
          <span style={{ color: 'var(--text-tertiary)' }}> · shift+click: place more · right-click/Esc: cancel</span>
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
      {b && <div style={{ color: 'var(--text-tertiary)' }}>{info.name} · level {b.level}{b.progress < 1 ? ` · ${b.upgrading ? 'upgrading' : 'building'} ${Math.floor(b.progress * 100)}%` : ''}</div>}
      {!b && <div style={{ color: 'var(--text-tertiary)' }}>{info.note}</div>}
      {tile.coast && <div style={{ color: 'var(--cyan)' }}>≈ Coast</div>}
      {tile.river && <div style={{ color: 'var(--cyan)' }}>≈ River</div>}
      {tile.deposit && <div style={{ color: depositInfo[tile.deposit].color }}>{depositInfo[tile.deposit].icon} {depositInfo[tile.deposit].name}: {depositInfo[tile.deposit].note}</div>}
      {!owned && <div style={{ color: 'var(--amber)' }}>Undeveloped — click to develop the region.</div>}
      {placement && (
        <div className="mt-1 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          {placement.ok ? (
            <>
              <div style={{ color: placement.mult >= 1.05 ? 'var(--green)' : placement.mult < 0.9 ? 'var(--rose)' : 'var(--amber)' }}>OUTPUT ×{placement.mult.toFixed(2)}</div>
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
