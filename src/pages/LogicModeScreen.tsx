import { useState } from 'react';
import { useGame } from '../App';
import { MINIGAMES, type MinigameEntry } from '../components/minigames';
import { StarRow } from '../components/minigames/MinigameShell';
import type { MinigameDifficulty, Stars } from '../components/minigames/types';
import { play } from '../hooks/useSound';

const LOGIC_CARD = '/assets/cards/LOGIC.png';
const STORE = 'terra_compute_logic_stars';

function loadStars(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORE) || '{}');
  } catch {
    return {};
  }
}
function saveStars(v: Record<string, number>) {
  try {
    localStorage.setItem(STORE, JSON.stringify(v));
  } catch {
    // storage unavailable: progress simply isn't remembered
  }
}

export default function LogicModeScreen() {
  const { dispatch } = useGame();
  const [active, setActive] = useState<{ entry: MinigameEntry; difficulty: MinigameDifficulty } | null>(null);
  const [stars, setStars] = useState<Record<string, number>>(loadStars);
  const [difficulty, setDifficulty] = useState<MinigameDifficulty>(2);

  if (active) {
    const Game = active.entry.Component;
    return (
      <Game
        key={`${active.entry.meta.id}-${active.difficulty}`}
        difficulty={active.difficulty}
        onComplete={result => {
          const key = `${active.entry.meta.id}:${active.difficulty}`;
          const next = { ...stars, [key]: Math.max(stars[key] ?? 0, result.stars) };
          setStars(next);
          saveStars(next);
          setActive(null);
        }}
      />
    );
  }

  const total = MINIGAMES.reduce((s, m) => s + ([1, 2, 3] as const).reduce((a, d) => a + (stars[`${m.meta.id}:${d}`] ?? 0), 0), 0);

  return (
    <div className="relative w-full h-full overflow-auto" style={{ background: 'var(--void)' }}>
      <div className="absolute inset-x-0 top-0 h-72 pointer-events-none" style={{ backgroundImage: `url(${LOGIC_CARD})`, backgroundSize: 'cover', backgroundPosition: 'center 30%', filter: 'brightness(0.3)', maskImage: 'linear-gradient(180deg, black, transparent)' }} />
      <div className="relative max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <button onClick={() => { play('click'); dispatch({ type: 'SET_SCREEN', screen: 'mode' }); }}
              className="font-mono-data text-[11px] mb-3 hover:brightness-150" style={{ color: 'var(--text-secondary)' }}>← BACK</button>
            <h1 className="font-orbitron text-3xl font-black tracking-wider" style={{ color: '#FFF4C2' }}>LOGIC ARCHIVE</h1>
            <p className="font-rajdhani text-base" style={{ color: 'var(--text-secondary)' }}>Replay every breakthrough exercise of the campaign. {total} / {MINIGAMES.length * 9} ★ collected.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono-data text-[10px] mr-1" style={{ color: 'var(--text-tertiary)' }}>DIFFICULTY</span>
            {([1, 2, 3] as const).map(d => (
              <button key={d} onClick={() => { play('click'); setDifficulty(d); }}
                className="font-mono-data text-[11px] px-3 py-1 rounded"
                style={{ color: difficulty === d ? '#050508' : 'var(--amber)', background: difficulty === d ? 'var(--amber)' : 'transparent', border: '1px solid var(--amber)' }}>
                {['I · GENTLE', 'II · STANDARD', 'III · EXPERT'][d - 1]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
          {MINIGAMES.map(m => {
            const best = (stars[`${m.meta.id}:${difficulty}`] ?? 0) as Stars;
            return (
              <button key={m.meta.id} onClick={() => { play('click'); setActive({ entry: m, difficulty }); }}
                className="group relative text-left rounded-lg overflow-hidden transition-all hover:-translate-y-0.5"
                style={{ border: `1px solid ${m.meta.accent}66`, boxShadow: `0 10px 30px rgba(0,0,0,0.5)` }}>
                <div className="relative h-36">
                  <img src={m.meta.background} alt="" className="absolute inset-0 w-full h-full object-cover transition-all group-hover:scale-105" style={{ filter: 'brightness(0.55)' }} draggable={false} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(10,11,16,0.98), transparent 65%)' }} />
                  <div className="absolute top-2 left-2 font-mono-data text-[10px] px-1.5 rounded" style={{ background: '#000A', color: m.meta.accent }}>{m.meta.year}</div>
                  <div className="absolute bottom-2 left-3 right-3">
                    <div className="font-orbitron text-sm font-bold tracking-wide" style={{ color: '#FFF4C2' }}>{m.meta.title}</div>
                  </div>
                </div>
                <div className="px-3 pb-3 pt-1" style={{ background: 'rgba(10,11,16,0.98)' }}>
                  <div className="font-rajdhani text-[13px] leading-snug min-h-[36px]" style={{ color: 'var(--text-secondary)' }}>{m.meta.subtitle}</div>
                  <div className="flex items-center justify-between mt-1">
                    <StarRow stars={best} accent={m.meta.accent} size={16} />
                    <span className="font-mono-data text-[10px]" style={{ color: m.meta.accent }}>PLAY ▶</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
