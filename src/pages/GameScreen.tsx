import { useEffect, useCallback } from 'react';
import { useGame } from '../App';
import { play, startAmbient, stopAmbient } from '../hooks/useSound';
import ResourceBar from '../components/game/ResourceBar';
import EvolvingMap from '../components/game/EvolvingMap';
import Minimap from '../components/game/Minimap';
import CommandCard from '../components/game/CommandCard';
import EventPopup from '../components/game/EventPopup';
import NotificationFeed from '../components/game/NotificationFeed';
import BuildingMenu from '../components/game/BuildingMenu';
import TechTreeOverlay from '../components/game/TechTreeOverlay';
import DiplomacyOverlay from '../components/game/DiplomacyOverlay';
import CyberAttackMenu from '../components/game/CyberAttackMenu';
import SpyMenu from '../components/game/SpyMenu';
import Translator from '../components/game/Translator';

export default function GameScreen() {
  const { state, dispatch } = useGame();

  // Game loop tick every 250ms
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 250);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Start ambient audio
  useEffect(() => {
    startAmbient();
    return () => stopAmbient();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Event popup has priority
      if (state.showEvent) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          dispatch({ type: 'DISMISS_EVENT' });
        }
        return;
      }

      // Close any overlay with Escape
      if (state.overlay && e.key === 'Escape') {
        dispatch({ type: 'CLOSE_OVERLAY' });
        return;
      }

      // Don't process shortcuts while an overlay is open (except Escape)
      if (state.overlay && e.key !== 'Escape') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'b':
          if (state.overlay === 'buildings') {
            dispatch({ type: 'CLOSE_OVERLAY' });
          } else {
            dispatch({ type: 'OPEN_OVERLAY', overlay: 'buildings' });
          }
          play('click');
          break;
        case 't':
          if (state.overlay === 'tech') {
            dispatch({ type: 'CLOSE_OVERLAY' });
          } else {
            dispatch({ type: 'OPEN_OVERLAY', overlay: 'tech' });
          }
          play('click');
          break;
        case 'd':
          if (state.overlay === 'diplomacy') {
            dispatch({ type: 'CLOSE_OVERLAY' });
          } else {
            dispatch({ type: 'OPEN_OVERLAY', overlay: 'diplomacy' });
          }
          play('click');
          break;
        case 'a':
          if (state.overlay === 'attack') {
            dispatch({ type: 'CLOSE_OVERLAY' });
          } else {
            dispatch({ type: 'OPEN_OVERLAY', overlay: 'attack' });
          }
          play('click');
          break;
        case 's':
          if (state.overlay === 'spy') {
            dispatch({ type: 'CLOSE_OVERLAY' });
          } else {
            dispatch({ type: 'OPEN_OVERLAY', overlay: 'spy' });
          }
          play('click');
          break;
        case ' ':
          e.preventDefault();
          dispatch({ type: 'TOGGLE_PAUSE' });
          break;
        case '1':
          dispatch({ type: 'SET_SPEED', speed: 1 });
          break;
        case '2':
          dispatch({ type: 'SET_SPEED', speed: 2 });
          break;
        case '3':
          dispatch({ type: 'SET_SPEED', speed: 3 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, state.showEvent, state.overlay]);

  // Determine what the right panel shows
  const rightPanelOverlay = state.overlay === 'buildings' ? 'buildings'
    : state.overlay === 'diplomacy' ? 'diplomacy'
    : state.overlay === 'attack' ? 'attack'
    : state.overlay === 'spy' ? 'spy'
    : null;

  // Energy ratio for blackout mode overlay
  const energyRatio = state.energyDemand > 0 ? state.energy / Math.max(state.energyDemand, 1) : 1;
  const blackoutActive = energyRatio < 0.2;

  return (
    <div className="relative w-full flex flex-col h-screen md:h-screen" style={{ background: 'var(--void)' }}>
      {/* Keyframes for blackout overlay pulse */}
      <style>{`
        @keyframes blackout-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* 1. Top: Resource Bar */}
      <ResourceBar />

      {/* 2. Middle: Map Area + Right Panel */}
      <div className="flex flex-col flex-1 md:flex-row overflow-hidden" style={{ minHeight: 0 }}>
        {/* Map - ALWAYS VISIBLE */}
        <div className="relative flex-1 h-[35vh] md:h-auto" style={{ minWidth: 0, minHeight: '200px' }}>
          <EvolvingMap />
          <NotificationFeed />
        </div>

        {/* Right Panel: 240px wide */}
        <div className="shrink-0 flex flex-col" style={{
          width: '240px',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          minHeight: '250px',
        }}>
          {/* Show Building Menu */}
          {rightPanelOverlay === 'buildings' && (
            <div className="flex-1 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <BuildingMenu />
            </div>
          )}

          {/* Show Diplomacy */}
          {rightPanelOverlay === 'diplomacy' && (
            <div className="flex-1 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <DiplomacyOverlay />
            </div>
          )}

          {/* Show Attack Menu */}
          {rightPanelOverlay === 'attack' && (
            <div className="flex-1 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <CyberAttackMenu />
            </div>
          )}

          {/* Show Spy Menu */}
          {rightPanelOverlay === 'spy' && (
            <div className="flex-1 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <SpyMenu />
            </div>
          )}

          {/* Default: Minimap + AI Log + Keybinds */}
          {!rightPanelOverlay && (
            <>
              <Minimap />
              <div className="flex-1 overflow-auto p-2" style={{ minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
                <h3 className="font-orbitron text-[9px] mb-1.5 tracking-wider" style={{ color: 'var(--cyan)' }}>
                  RIVAL ACTIVITY
                </h3>
                {state.aiLog.length === 0 && (
                  <div className="text-[9px] font-mono-data" style={{ color: 'var(--text-tertiary)' }}>
                    No rival activity yet...
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  {state.aiLog.slice(0, 15).map(log => (
                    <div key={log.id} className="text-[9px] font-mono-data animate-fade-up" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--amber)' }}>{log.year}</span>{' '}
                      <span style={{ color: 'var(--cyan)' }}>{log.continent}</span>: {log.action}
                    </div>
                  ))}
                </div>

                {/* Recent attacks */}
                {state.cyberAttacks.filter(a => a.detected).length > 0 && (
                  <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <h3 className="font-orbitron text-[8px] mb-1 tracking-wider" style={{ color: 'var(--rose)' }}>
                      ATTACKS DETECTED
                    </h3>
                    {state.cyberAttacks.filter(a => a.detected).slice(0, 5).map(a => (
                      <div key={a.id} className="text-[8px] font-mono-data mb-0.5" style={{ color: 'var(--rose)' }}>
                        {a.year} — {a.type.toUpperCase()} from {a.from}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 p-2" style={{ borderTop: '1px solid var(--border)' }}>
                <h3 className="font-orbitron text-[7px] mb-1 tracking-wider" style={{ color: 'var(--text-tertiary)' }}>CONTROLS</h3>
                <div className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)', lineHeight: '1.5' }}>
                  [B] Build &nbsp; [T] Tech<br />
                  [D] Diplo &nbsp; [A] Attack<br />
                  [S] Spy &nbsp; [␣] Pause<br />
                  [1-3] Speed &nbsp; [Esc] Close
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Tech Panel - bottom, only when tech overlay is open */}
      {state.overlay === 'tech' && (
        <TechTreeOverlay />
      )}

      {/* 4. Bottom: Action Cards */}
      <CommandCard />

      {/* 5. Event Popup - centered modal (only for events) */}
      {state.showEvent && <EventPopup />}

      {/* BLACKOUT MODE OVERLAY: red tint when energy crisis */}
      {blackoutActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(180,0,0,0.15) 100%)',
            zIndex: 100,
            animation: 'pulse 2s infinite',
          }}
        />
      )}

      {/* Translator - top right corner */}
      <div className="absolute top-1 right-1 z-[60]">
        <Translator />
      </div>
    </div>
  );
}