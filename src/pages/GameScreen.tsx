import { useEffect, useState } from 'react';
import { useGame } from '../App';
import { play, startAmbient, stopAmbient } from '../hooks/useSound';
import { TICK_MS } from '../game/engine';
import ResourceBar from '../components/game/ResourceBar';
import RTSMap from '../components/game/map/RTSMap';
import EvolvingMap from '../components/game/EvolvingMap';
import CommandCard from '../components/game/CommandCard';
import EventModal from '../components/game/EventModal';
import NotificationFeed from '../components/game/NotificationFeed';
import TechTreeOverlay from '../components/game/TechTreeOverlay';
import Translator from '../components/game/Translator';
import Tutorial from '../components/game/Tutorial';
import MPHud from '../components/game/MPHud';
import { preloadMinigames } from '../components/minigames';
import PauseMenu from '../components/meta/PauseMenu';
import AutosaveToast from '../components/meta/AutosaveToast';
import { useAutosave } from '../hooks/useAutosave';
import { useSettings } from '../lib/settings';
import OverviewPanel from '../components/game/panels/OverviewPanel';
import TilePanel from '../components/game/panels/TilePanel';
import BuildPanel from '../components/game/panels/BuildPanel';
import DiplomacyPanel from '../components/game/panels/DiplomacyPanel';
import IntelPanel from '../components/game/panels/IntelPanel';
import EconomyPanel from '../components/game/panels/EconomyPanel';

const OVERLAY_KEYS: Record<string, string> = { b: 'buildings', t: 'tech', d: 'diplomacy', a: 'attack', s: 'spy', e: 'economy' };

export default function GameScreen() {
  const { state, dispatch } = useGame();
  const [mapView, setMapView] = useState<'continent' | 'world'>('continent');
  const [menuOpen, setMenuOpen] = useState(false);
  const { justSaved, lastSavedYear } = useAutosave();
  const [settings] = useSettings();

  // Simulation clock (multiplayer guests follow the host's clock instead)
  const followsHost = state.mp?.role === 'guest' && !state.mp.offline;
  useEffect(() => {
    if (followsHost) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), TICK_MS);
    return () => clearInterval(id);
  }, [dispatch, followsHost]);

  // Preload the screens a game ends on, and the exercises, while the player is busy.
  useEffect(() => {
    const id = setTimeout(() => {
      void Promise.allSettled([import('./VictoryScreen'), import('./GameOverScreen')]);
      preloadMinigames();
    }, 4000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    startAmbient();
    return () => stopAmbient();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.activeEvent || menuOpen) return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        if (state.placing) dispatch({ type: 'SET_PLACING', building: null });
        else if (state.overlay) dispatch({ type: 'CLOSE_OVERLAY' });
        else if (state.selectedTile !== null) dispatch({ type: 'SELECT_TILE', tileId: null });
        else setMenuOpen(true);
        return;
      }
      if (OVERLAY_KEYS[k]) {
        play('click');
        dispatch(state.overlay === OVERLAY_KEYS[k] ? { type: 'CLOSE_OVERLAY' } : { type: 'OPEN_OVERLAY', overlay: OVERLAY_KEYS[k] });
        return;
      }
      if (k === ' ') {
        e.preventDefault();
        if (followsHost) void import('../net/session').then(({ session }) => session.broadcast({ k: 'preq' }));
        else dispatch({ type: 'TOGGLE_PAUSE' });
        return;
      }
      if (followsHost && ['1', '2', '3'].includes(k)) return;
      if (k === 'm') { setMapView(v => (v === 'continent' ? 'world' : 'continent')); return; }
      if (['1', '2', '3'].includes(k)) dispatch({ type: 'SET_SPEED', speed: Number(k) });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, state.activeEvent, state.overlay, state.placing, state.selectedTile, menuOpen, followsHost]);

  const side = state.overlay === 'buildings' ? <BuildPanel />
    : state.overlay === 'diplomacy' ? <DiplomacyPanel />
    : state.overlay === 'attack' ? <IntelPanel mode="attack" />
    : state.overlay === 'spy' ? <IntelPanel mode="spy" />
    : state.overlay === 'economy' ? <EconomyPanel />
    : state.selectedTile !== null ? <TilePanel />
    : <OverviewPanel />;

  const blackout = state.eco.energyRatio < 0.85;

  return (
    <div className="game-screen-shell relative w-full flex flex-col h-screen" style={{ background: 'var(--void)' }}>
      <ResourceBar />

      <div className="game-main-layout flex flex-col flex-1 md:flex-row overflow-hidden" style={{ minHeight: 0 }}>
        <div className="game-map-stage relative flex-1 h-[48vh] md:h-auto" style={{ minWidth: 0, minHeight: 220 }}>
          {mapView === 'continent' ? <RTSMap options={{ edgeScroll: settings.edgeScroll, scrollSpeed: settings.scrollSpeed, dayNight: settings.dayNight, reduceMotion: settings.reduceMotion }} /> : <EvolvingMap onEnterContinent={() => setMapView('continent')} />}

          {/* view switch */}
          <div className="absolute top-2 left-2 z-30 flex rounded overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
            {(['continent', 'world'] as const).map(v => (
              <button key={v} onClick={() => { play('click'); setMapView(v); }}
                className="font-mono-data text-[10px] tracking-wider px-2.5 py-1"
                style={{ background: mapView === v ? 'var(--cyan)' : 'rgba(11,12,16,0.85)', color: mapView === v ? '#001014' : 'var(--text-secondary)' }}
                title="[M] toggle">
                {v === 'continent' ? '◈ CONTINENT' : '◎ WORLD'}
              </button>
            ))}
          </div>

          <NotificationFeed />
          {state.overlay === 'tech' && <TechTreeOverlay />}

          {state.paused && !state.activeEvent && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded font-mono-data text-[11px] tracking-[0.3em] animate-pulse-glow pointer-events-none"
              style={{ background: 'rgba(11,12,16,0.9)', color: 'var(--amber)', border: '1px solid var(--amber)' }}>
              PAUSED — SPACE TO RESUME
            </div>
          )}
          {blackout && (
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(180,0,0,0.18) 100%)', zIndex: 25, animation: 'pulse 2s infinite' }} />
          )}
        </div>

        <aside data-tutorial="side" className="game-side-panel shrink-0 flex flex-col md:w-[300px]" style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)', minHeight: 250 }}>
          <div className="flex-1 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>{side}</div>
          {state.overlay === null && state.selectedTile === null && (
            <div className="shrink-0 px-3 py-1.5 font-mono-data text-[8.5px] leading-relaxed" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
              [B] build [T] tech [D] diplo [S] spy [A] covert [E] economy [M] world [␣] pause [1-3] speed
            </div>
          )}
        </aside>
      </div>

      <CommandCard />

      {!state.mp && <Tutorial />}
      {state.mp && <MPHud />}
      <AutosaveToast visible={justSaved} year={lastSavedYear} />
      {menuOpen && <PauseMenu onClose={() => setMenuOpen(false)} />}

      {state.activeEvent && <EventModal />}

      <div className="absolute bottom-2 left-2 z-[60] hidden md:block">
        <Translator dropUp />
      </div>
    </div>
  );
}
