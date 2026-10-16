import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '../../App';
import { choiceAvailable } from '../../game/engine';
import { fmtMoney } from '../../game/format';
import { play } from '../../hooks/useSound';
import { getVideoUrl, isVideoPlayed, markVideoPlayed } from '../../hooks/useVideo';
import { minigameById } from '../minigames';
import type { MinigameDifficulty } from '../minigames/types';
import VideoPlayer from './VideoPlayer';
import ChunkBoundary from '../ChunkBoundary';

const TYPE_COLOR = { info: '#00F0FF', warning: '#FFB84D', danger: '#FF477E' } as const;

const MP_DECISION_SECONDS = 25;

/** Docked, non-blocking decision card for multiplayer, with a countdown that picks the cautious (last) option. */
function LiveDecision({ state, color, choices, left, onChoose }: {
  state: ReturnType<typeof useGame>['state']; color: string; choices: NonNullable<ReturnType<typeof useGame>['state']['activeEvent']>['event']['choices']; left: number; onChoose: (i: number) => void;
}) {
  const ev = state.activeEvent!.event;
  const okAt = (i: number) => choiceAvailable(state, choices[i].requires) && (!choices[i].cost || state.budget >= choices[i].cost!);
  const fallback = (() => { for (let i = choices.length - 1; i >= 0; i--) if (okAt(i)) return i; return 0; })();
  const fired = useRef<string | null>(null);
  useEffect(() => {
    if (left > 0 || fired.current === state.activeEvent!.id) return;
    fired.current = state.activeEvent!.id;
    onChoose(fallback);
  }, [left, fallback, onChoose, state.activeEvent]);
  return (
    <div className="absolute z-[60] left-3 bottom-[236px] w-[min(430px,calc(100vw-24px))] rounded-lg p-3 flex flex-col gap-2 animate-fade-up"
      style={{ background: 'rgba(10,11,16,0.97)', border: `2px solid ${color}`, boxShadow: `0 0 30px ${color}33, 0 14px 40px rgba(0,0,0,0.7)` }}>
      <div className="flex items-center justify-between">
        <span className="font-mono-data text-[10px] tracking-[0.25em]" style={{ color }}>{ev.type === 'danger' ? 'CRISIS' : ev.type === 'warning' ? 'WARNING' : 'DECISION'} · {ev.year}</span>
        <span className={`font-orbitron text-[12px] font-bold ${left <= 8 ? 'animate-pulse' : ''}`} style={{ color: left <= 8 ? 'var(--rose)' : '#FFF4C2' }}>{left}s</span>
      </div>
      <div className="h-1 rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full transition-all duration-300" style={{ width: `${(left / MP_DECISION_SECONDS) * 100}%`, background: left <= 8 ? 'var(--rose)' : color }} />
      </div>
      <h2 className="font-orbitron text-[15px] font-bold leading-tight" style={{ color: '#FFF4C2' }}>{ev.name}</h2>
      <p className="font-rajdhani text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{ev.description}</p>
      <div className="flex flex-col gap-1.5">
        {choices.map((c, i) => {
          const ok = okAt(i);
          return (
            <button key={i} disabled={!ok} {...NO_SPACE} onClick={() => onChoose(i)}
              className={`text-left rounded px-2.5 py-1.5 ${ok ? 'hover:brightness-125' : 'opacity-40 cursor-not-allowed'}`}
              style={{ border: `1px solid ${color}88`, background: i === fallback ? `${color}1A` : `${color}0A` }}>
              <div className="font-rajdhani text-[13.5px] font-bold" style={{ color: '#FFF4C2' }}>{String.fromCharCode(65 + i)}. {c.label}{i === fallback ? <span className="font-mono-data text-[8.5px] font-normal" style={{ color: 'var(--text-tertiary)' }}> · default</span> : null}</div>
              <div className="font-mono-data text-[9.5px]" style={{ color: 'var(--text-secondary)' }}>{c.detail}</div>
            </button>
          );
        })}
        {choices.length === 0 && <button {...NO_SPACE} onClick={() => onChoose(0)} className="w-full py-1.5 rounded font-mono-data text-[11px]" style={{ color, border: `1px solid ${color}` }}>ACKNOWLEDGE</button>}
      </div>
      <div className="font-mono-data text-[8.5px]" style={{ color: 'var(--text-tertiary)' }}>The world does not wait: when the timer runs out the default is chosen.</div>
    </div>
  );
}

// Space is the pause key: it must never pick a decision by accident (Enter still does).
const NO_SPACE = {
  onKeyDown: (e: React.KeyboardEvent) => { if (e.key === ' ') e.preventDefault(); },
  onKeyUp: (e: React.KeyboardEvent) => { if (e.key === ' ') e.preventDefault(); },
};

export default function EventModal() {
  const { state, dispatch } = useGame();
  const pending = state.activeEvent;
  const ev = pending?.event;
  const [phase, setPhase] = useState<'video' | 'card' | 'minigame'>('card');
  const [video, setVideo] = useState<string | null>(null);
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    if (!pending || pending.id === lastId.current) return;
    lastId.current = pending.id;
    play('alert');
    const videoId = pending.event.card?.match(/cards\/(event-[a-z0-9]+)\.png/)?.[1];
    if (videoId && !isVideoPlayed(videoId) && !state.mp) {   // no cinematics on a shared clock
      markVideoPlayed(videoId);
      setVideo(getVideoUrl(videoId));
      setPhase('video');
    } else {
      setVideo(null);
      setPhase('card');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  // Multiplayer: the shared clock keeps running, so decisions are timed and never block the map.
  const live = !!state.mp && !state.mp.offline;
  const [left, setLeft] = useState(MP_DECISION_SECONDS);
  useEffect(() => {
    if (!live || !pending) return;
    const end = Date.now() + MP_DECISION_SECONDS * 1000;
    setLeft(MP_DECISION_SECONDS);
    const id = setInterval(() => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000))), 250);
    return () => clearInterval(id);
  }, [live, pending]);

  const mg = ev?.minigame ? minigameById(ev.minigame) : undefined;
  const difficulty: MinigameDifficulty = state.gameMode === 'pioneer' ? 1 : state.gameMode === 'complete' && (ev?.year ?? 0) >= 1995 ? 3 : 2;

  const choose = useCallback((i: number) => {
    play('click');
    dispatch({ type: 'RESOLVE_EVENT', choice: i });
  }, [dispatch]);

  const skipMinigame = useCallback(() => {
    if (!ev?.minigame) return;
    play('click');
    dispatch({ type: 'MINIGAME_DONE', minigame: ev.minigame, stars: 0 });
  }, [dispatch, ev]);

  // Keyboard: Enter = first option / begin exercise
  useEffect(() => {
    if (!ev || phase !== 'card') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (mg) { play('click'); setPhase('minigame'); }
      else if (ev.choices.length === 0) choose(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ev, phase, mg, choose]);

  if (!ev) return null;

  if (phase === 'video' && video) {
    return <VideoPlayer src={video} onComplete={() => { setVideo(null); setPhase('card'); }} />;
  }

  if (phase === 'minigame' && mg) {
    const Game = mg.Component;
    return (
      <ChunkBoundary skipLabel="SKIP EXERCISE" onSkip={() => dispatch({ type: 'MINIGAME_DONE', minigame: mg.meta.id, stars: 0 })}>
      <Suspense fallback={<div className="fixed inset-0 z-[90] flex items-center justify-center font-mono-data text-[11px] tracking-[0.3em]" style={{ background: '#07080C', color: 'var(--text-tertiary)' }}>LOADING EXERCISE…</div>}>
        <Game
          difficulty={difficulty}
          onComplete={result => dispatch({ type: 'MINIGAME_DONE', minigame: mg.meta.id, stars: result.stars })}
        />
      </Suspense>
      </ChunkBoundary>
    );
  }

  const color = TYPE_COLOR[ev.type];
  const choices = ev.choices.length ? ev.choices : [];
  if (live && !mg) return <LiveDecision state={state} color={color} choices={choices} left={left} onChoose={choose} />;
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-3" style={{ background: 'rgba(8,8,12,0.86)', backdropFilter: 'blur(4px)' }}>
      <div className="animate-fade-up flex w-full max-w-[860px] max-h-full overflow-hidden rounded-lg"
        style={{ border: `2px solid ${color}`, boxShadow: `0 0 42px ${color}33, 0 20px 60px rgba(0,0,0,0.7)`, background: '#0A0B10' }}>
        {ev.card && (
          <div className="hidden sm:block relative shrink-0" style={{ width: 'min(38%, 300px)' }}>
            <img src={ev.card} alt={ev.name} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 70%, #0A0B10)' }} />
          </div>
        )}
        <div className="flex-1 min-w-0 p-4 md:p-5 flex flex-col gap-3 overflow-auto">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: color }} />
            <span className="font-mono-data text-[10px] tracking-[0.25em]" style={{ color }}>
              {ev.minigame ? 'BREAKTHROUGH' : ev.type === 'danger' ? 'CRISIS' : ev.type === 'warning' ? 'WARNING' : 'DECISION'} · {ev.year}
            </span>
          </div>
          <h2 className="font-orbitron text-xl md:text-2xl font-bold" style={{ color: '#FFF4C2' }}>{ev.name}</h2>
          <p className="font-rajdhani text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{ev.description}</p>

          {mg ? (
            <div className="flex flex-col gap-2 mt-1">
              <div className="rounded p-2.5" style={{ border: `1px solid ${mg.meta.accent}66`, background: `${mg.meta.accent}0D` }}>
                <div className="font-mono-data text-[10px] tracking-widest" style={{ color: mg.meta.accent }}>{mg.meta.title}</div>
                <div className="font-rajdhani text-[13px]" style={{ color: 'var(--text-secondary)' }}>{mg.meta.subtitle}</div>
                <div className="font-mono-data text-[9.5px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Reward: research points + {mg.meta.rewardLabel} · difficulty {'I'.repeat(difficulty)}
                  {state.minigameResults[mg.meta.id] !== undefined ? ` · best ${'★'.repeat(state.minigameResults[mg.meta.id])}` : ''}
                </div>
              </div>
              <button autoFocus {...NO_SPACE} onClick={() => { play('click'); setPhase('minigame'); }}
                className="w-full py-2.5 rounded font-orbitron text-sm font-bold tracking-wider hover:brightness-125"
                style={{ background: `${mg.meta.accent}22`, color: mg.meta.accent, border: `2px solid ${mg.meta.accent}` }}>
                BEGIN EXERCISE ▶
              </button>
              <button onClick={skipMinigame} className="w-full py-1.5 rounded font-mono-data text-[10px] tracking-wider hover:brightness-150"
                style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-light)' }}>
                SKIP (no reward, no penalty)
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-1">
              {choices.map((c, i) => {
                const reqOk = choiceAvailable(state, c.requires);
                const costOk = !c.cost || state.budget >= c.cost;
                const ok = reqOk && costOk;
                return (
                  <button key={i} disabled={!ok} autoFocus={i === 0} {...NO_SPACE} onClick={() => choose(i)}
                    className={`text-left rounded px-3 py-2 transition-all ${ok ? 'hover:brightness-125 hover:translate-x-0.5' : 'opacity-40 cursor-not-allowed'}`}
                    style={{ border: `1px solid ${color}88`, background: `${color}0F` }}>
                    <div className="font-rajdhani text-[15px] font-bold" style={{ color: '#FFF4C2' }}>{String.fromCharCode(65 + i)}. {c.label}</div>
                    <div className="font-mono-data text-[10px]" style={{ color: 'var(--text-secondary)' }}>{c.detail}</div>
                    {!costOk && <div className="font-mono-data text-[9.5px]" style={{ color: 'var(--rose)' }}>Needs {fmtMoney(c.cost!)}</div>}
                    {!reqOk && <div className="font-mono-data text-[9.5px]" style={{ color: 'var(--rose)' }}>Requirement not met</div>}
                  </button>
                );
              })}
              {choices.length === 0 && (
                <button autoFocus {...NO_SPACE} onClick={() => choose(0)} className="w-full py-2.5 rounded font-orbitron text-sm font-bold tracking-wider hover:brightness-125"
                  style={{ background: `${color}22`, color, border: `2px solid ${color}` }}>ACKNOWLEDGE</button>
              )}
              <div className="font-mono-data text-[9px] text-center" style={{ color: 'var(--text-tertiary)' }}>The simulation is paused until you decide.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
