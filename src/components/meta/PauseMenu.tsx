// In-game pause menu: resume, save, load, settings, controls, quit.
// Pauses the simulation while open and restores the previous run state on RESUME.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '../../App';
import { loadGame, saveGame, type SaveSlot } from '../../game/save';
import { play } from '../../hooks/useSound';
import SaveSlots, { continentName } from './SaveSlots';
import SettingsForm from './SettingsForm';

type Tab = 'save' | 'load' | 'settings' | 'controls' | 'quit';

const CONTROLS: Array<[string, string]> = [
  ['B', 'Build menu'],
  ['T', 'Tech tree'],
  ['D', 'Diplomacy'],
  ['S', 'Spy / intelligence'],
  ['A', 'Covert operations'],
  ['E', 'Economy & policies'],
  ['M', 'Continent / world view'],
  ['SPACE', 'Pause / resume'],
  ['1 · 2 · 3', 'Game speed'],
  ['ESC', 'Cancel · close panel · this menu'],
  ['ARROWS · SCREEN EDGE', 'Pan the map'],
  ['HOME · + / −', 'Fit map · zoom'],
  ['DOUBLE-CLICK', 'Focus a tile'],
  ['MOUSE WHEEL', 'Zoom'],
  ['DRAG', 'Pan the map'],
  ['MINIMAP CLICK', 'Jump to location'],
  ['CLICK TILE', 'Inspect / build'],
];

const ACCENT = 'var(--cyan)';

export default function PauseMenu({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGame();
  const [tab, setTab] = useState<Tab | null>(null);
  const pausedByMenu = useRef(false);
  const pausedNow = useRef(state.paused);
  pausedNow.current = state.paused;

  // Pause on open (only if the game was running).
  useEffect(() => {
    if (pausedByMenu.current) return;
    if (!pausedNow.current) {
      pausedByMenu.current = true;
      dispatch({ type: 'TOGGLE_PAUSE' });
    }
  }, [dispatch]);

  const resume = useCallback(() => {
    play('click');
    if (pausedByMenu.current && pausedNow.current) dispatch({ type: 'TOGGLE_PAUSE' });
    pausedByMenu.current = false;
    onClose();
  }, [dispatch, onClose]);

  // Esc closes (or backs out of a sub-panel); swallow other game hotkeys while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        if (tab) { play('click'); setTab(null); } else resume();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [tab, resume]);

  const open = (t: Tab) => { play('click'); setTab(cur => (cur === t ? null : t)); };

  const doSave = (slot: SaveSlot) => saveGame(state, slot);
  const doLoad = (slot: SaveSlot) => {
    const s = loadGame(slot);
    if (!s) return false;
    pausedByMenu.current = false; // loaded games start paused
    play('coin');
    dispatch({ type: 'LOAD_STATE', state: s });
    onClose();
    return true;
  };
  const quit = () => {
    play('click');
    pausedByMenu.current = false;
    dispatch({ type: 'SET_SCREEN', screen: 'title' });
    onClose();
  };

  const items: Array<{ id: Tab | 'resume'; label: string; key: string }> = [
    { id: 'resume', label: 'RESUME', key: 'ESC' },
    { id: 'save', label: 'SAVE GAME', key: '' },
    { id: 'load', label: 'LOAD GAME', key: '' },
    { id: 'settings', label: 'SETTINGS', key: '' },
    { id: 'controls', label: 'CONTROLS', key: '' },
    { id: 'quit', label: 'QUIT TO MENU', key: '' },
  ];

  const title = tab === 'save' ? 'SAVE GAME' : tab === 'load' ? 'LOAD GAME' : tab === 'settings' ? 'SETTINGS'
    : tab === 'controls' ? 'CONTROLS' : tab === 'quit' ? 'QUIT TO MENU' : 'STATUS';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3"
      style={{ background: 'rgba(3,4,8,0.78)', backdropFilter: 'blur(3px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) resume(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Pause menu"
    >
      <div
        className="relative flex flex-col sm:flex-row overflow-hidden rounded animate-fade-up"
        style={{
          width: 'min(780px, 100%)',
          height: 'min(540px, 100%)',
          background: 'linear-gradient(180deg, rgba(18,20,28,0.98), rgba(10,11,16,0.98))',
          border: '1px solid var(--border-light)',
          boxShadow: '0 0 0 1px rgba(0,240,255,0.08), 0 20px 60px rgba(0,0,0,0.7), inset 0 0 40px rgba(0,240,255,0.03)',
        }}
      >
        {/* scanlines */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 3px)' }} />

        {/* Left: console menu */}
        <nav className="relative shrink-0 flex flex-col sm:w-[220px] p-3 gap-1" style={{ borderRight: '1px solid var(--border)', background: 'rgba(0,0,0,0.25)' }}>
          <div className="mb-2 hidden sm:block">
            <div className="font-mono-data text-[9px] tracking-[0.35em]" style={{ color: 'var(--text-tertiary)' }}>SYSTEM HALT</div>
            <div className="font-orbitron text-lg font-black tracking-[0.2em]" style={{ color: '#FFF4C2', textShadow: '0 0 12px rgba(255,244,194,0.25)' }}>PAUSED</div>
            <div className="h-px mt-1" style={{ background: 'linear-gradient(to right, var(--cyan), transparent)' }} />
          </div>
          <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible">
            {items.map(it => {
              const active = it.id === tab;
              const danger = it.id === 'quit';
              const c = danger ? 'var(--rose)' : ACCENT;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => (it.id === 'resume' ? resume() : open(it.id))}
                  className="shrink-0 text-left flex items-center justify-between gap-2 px-2.5 py-1.5 sm:py-2 rounded font-orbitron text-[10px] font-bold tracking-[0.18em] transition-all hover:brightness-125"
                  style={{
                    background: active ? `color-mix(in srgb, ${c}, transparent 82%)` : 'transparent',
                    color: active ? c : it.id === 'resume' ? '#FFF4C2' : danger ? 'var(--rose)' : 'var(--text-secondary)',
                    border: `1px solid ${active ? c : 'transparent'}`,
                  }}
                >
                  <span>{active ? '▸ ' : ''}{it.label}</span>
                  {it.key && <span className="font-mono-data text-[8.5px] hidden sm:inline" style={{ color: 'var(--text-tertiary)' }}>{it.key}</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-auto hidden sm:block font-mono-data text-[8.5px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            {continentName(state.playerContinent)}<br />
            {(state.gameMode ?? '').toUpperCase()} · {state.difficulty.toUpperCase()}<br />
            YEAR {Math.floor(state.year)}
          </div>
        </nav>

        {/* Right: content */}
        <section className="relative flex-1 flex flex-col min-h-0 min-w-0">
          <header className="shrink-0 flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-orbitron text-[11px] font-bold tracking-[0.25em]" style={{ color: tab === 'quit' ? 'var(--rose)' : ACCENT }}>{title}</h2>
            <button type="button" onClick={resume} className="font-mono-data text-[10px] px-1.5 rounded hover:brightness-150" style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-light)' }} title="Resume [Esc]">✕</button>
          </header>
          <div className="flex-1 overflow-auto px-4 py-3 min-h-0">
            {tab === null && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ['YEAR', String(Math.floor(state.year)), 'var(--cyan)'],
                    ['COMPUTE', `10^${state.capability.toFixed(1)}`, 'var(--green)'],
                    ['ALIGNMENT', `${Math.round(state.alignment)}%`, state.alignment >= 80 ? 'var(--green)' : 'var(--amber)'],
                    ['PLANET', `${Math.round(state.planetHealth)}%`, state.planetHealth > 40 ? 'var(--green)' : 'var(--rose)'],
                  ].map(([k, v, c]) => (
                    <div key={k} className="rounded px-2 py-1.5" style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                      <div className="font-mono-data text-[8.5px] tracking-[0.2em]" style={{ color: 'var(--text-tertiary)' }}>{k}</div>
                      <div className="font-orbitron text-sm" style={{ color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
                <p className="font-rajdhani text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>
                  The simulation is halted. Save your progress, adjust settings or review the controls. Press <span className="font-mono-data" style={{ color: ACCENT }}>ESC</span> to return to command.
                </p>
              </div>
            )}

            {tab === 'save' && <SaveSlots key="save" mode="save" accent={ACCENT} onPick={doSave} />}
            {tab === 'load' && <SaveSlots key="load" mode="load" accent={ACCENT} onPick={doLoad} confirmLoad allowDelete />}
            {tab === 'settings' && <SettingsForm accent={ACCENT} />}

            {tab === 'controls' && (
              <div className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
                {CONTROLS.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2 py-1" style={{ borderBottom: '1px dashed rgba(255,255,255,0.06)' }}>
                    <span className="font-mono-data text-[9.5px] px-1.5 py-0.5 rounded whitespace-nowrap" style={{ color: ACCENT, border: '1px solid var(--border-light)', background: 'rgba(0,240,255,0.05)' }}>{k}</span>
                    <span className="font-rajdhani text-[12px] text-right" style={{ color: 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'quit' && (
              <div className="flex flex-col gap-3 max-w-md">
                <p className="font-rajdhani text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Abandon the current game and return to the main menu? Progress since your last save will be lost.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={quit} className="px-4 py-2 rounded font-orbitron text-[10px] font-bold tracking-[0.18em] hover:brightness-110" style={{ background: 'var(--rose)', color: '#0A0A0F' }}>
                    QUIT TO MENU
                  </button>
                  <button type="button" onClick={() => open('save')} className="px-4 py-2 rounded font-orbitron text-[10px] tracking-[0.18em] hover:brightness-125" style={{ color: ACCENT, border: `1px solid ${ACCENT}` }}>
                    SAVE FIRST
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
