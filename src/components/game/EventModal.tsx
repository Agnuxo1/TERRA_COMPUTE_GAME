import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '../../App';
import { choiceAvailable } from '../../game/engine';
import { fmtMoney } from '../../game/format';
import { play } from '../../hooks/useSound';
import { getVideoUrl, isVideoPlayed, markVideoPlayed } from '../../hooks/useVideo';
import { minigameById } from '../minigames';
import type { MinigameDifficulty } from '../minigames/types';
import VideoPlayer from './VideoPlayer';

const TYPE_COLOR = { info: '#00F0FF', warning: '#FFB84D', danger: '#FF477E' } as const;

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
    if (videoId && !isVideoPlayed(videoId)) {
      markVideoPlayed(videoId);
      setVideo(getVideoUrl(videoId));
      setPhase('video');
    } else {
      setVideo(null);
      setPhase('card');
    }
  }, [pending]);

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
      <Game
        difficulty={difficulty}
        onComplete={result => dispatch({ type: 'MINIGAME_DONE', minigame: mg.meta.id, stars: result.stars })}
      />
    );
  }

  const color = TYPE_COLOR[ev.type];
  const choices = ev.choices.length ? ev.choices : [];
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
              <button autoFocus onClick={() => { play('click'); setPhase('minigame'); }}
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
                  <button key={i} disabled={!ok} autoFocus={i === 0} onClick={() => choose(i)}
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
                <button autoFocus onClick={() => choose(0)} className="w-full py-2.5 rounded font-orbitron text-sm font-bold tracking-wider hover:brightness-125"
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
