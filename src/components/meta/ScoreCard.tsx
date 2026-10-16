// Final score, rank and faction record, shown on the victory and game-over screens.
import { useEffect, useMemo, useState } from 'react';
import type { GameState } from '../../game/types';
import { finalScore, loadBest, recordBest } from '../../game/score';

const RANK_COLOR: Record<string, string> = { S: '#FFD700', A: '#00E5A0', B: '#00F0FF', C: '#FFB84D', D: '#FF477E' };

export default function ScoreCard({ state }: { state: GameState }) {
  const sc = useMemo(() => finalScore(state), [state]);
  const [prevBest] = useState(() => loadBest()[state.playerContinent ?? '']);
  const [isRecord, setIsRecord] = useState(false);
  useEffect(() => {
    if (state.playerContinent) setIsRecord(recordBest(state.playerContinent, sc, state));
    // record once per finished game
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const color = RANK_COLOR[sc.rank];
  return (
    <div className="panel-elevated px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2" style={{ maxWidth: 720, width: '100%' }}>
      <div className="flex items-center gap-3">
        <span className="font-orbitron font-black" style={{ fontSize: 44, lineHeight: 1, color, textShadow: `0 0 18px ${color}88` }}>{sc.rank}</span>
        <div className="flex flex-col">
          <span className="font-orbitron text-[13px] font-bold" style={{ color }}>{sc.title}</span>
          <span className="font-mono-data text-[18px]" style={{ color: '#FFF4C2' }}>{sc.total.toLocaleString('en-US')} pts</span>
          <span className="font-mono-data text-[9px]" style={{ color: isRecord ? 'var(--green)' : 'var(--text-tertiary)' }}>
            {isRecord ? '★ NEW FACTION RECORD' : prevBest ? `Faction record: ${prevBest.score.toLocaleString('en-US')} (${prevBest.rank})` : ''}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono-data text-[9.5px]" style={{ color: 'var(--text-secondary)' }}>
        {sc.lines.map(l => (
          <div key={l.label} className="flex justify-between gap-3"><span>{l.label}</span><span style={{ color: l.points > 0 ? '#FFF4C2' : 'var(--text-tertiary)' }}>+{l.points}</span></div>
        ))}
        {sc.mult !== 1 && <div className="flex justify-between gap-3"><span>Mode × difficulty</span><span style={{ color: '#FFF4C2' }}>×{sc.mult.toFixed(2)}</span></div>}
      </div>
    </div>
  );
}
