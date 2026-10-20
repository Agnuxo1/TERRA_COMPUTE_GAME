// Final score, rank and faction record, shown on the victory and game-over screens.
import { useEffect, useMemo, useState } from 'react';
import type { GameState } from '../../game/types';
import { finalScore, loadBest, recordBest } from '../../game/score';
import { continentById } from '../../game/data';
import { capabilityLabel } from '../../game/format';
import { t } from '../../i18n';

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
  const standings = state.mp ? state.mp.players.map(p => {
    const mine = p.faction === state.mp!.me;
    const cap = mine ? state.capability : state.rivals.find(r => r.id === p.faction)?.capability ?? 0;
    return { ...p, mine, cap };
  }).sort((a, b) => b.cap - a.cap) : [];
  return (
    <>
    <div className="panel-elevated px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2" style={{ maxWidth: 720, width: '100%' }}>
      <div className="flex items-center gap-3">
        <span className="font-orbitron font-black" style={{ fontSize: 44, lineHeight: 1, color, textShadow: `0 0 18px ${color}88` }}>{sc.rank}</span>
        <div className="flex flex-col">
          <span className="font-orbitron text-[13px] font-bold" style={{ color }}>{sc.title}</span>
          <span className="font-mono-data text-[18px]" style={{ color: '#FFF4C2' }}>{sc.total.toLocaleString('en-US')} pts</span>
          <span className="font-mono-data text-[9px]" style={{ color: isRecord ? 'var(--green)' : 'var(--text-tertiary)' }}>
            {isRecord ? t('★ NEW FACTION RECORD') : prevBest ? t('Faction record: {score} ({rank})', { score: prevBest.score.toLocaleString('en-US'), rank: prevBest.rank }) : ''}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono-data text-[9.5px]" style={{ color: 'var(--text-secondary)' }}>
        {sc.lines.map(l => (
          <div key={l.label} className="flex justify-between gap-3"><span>{l.label}</span><span style={{ color: l.points > 0 ? '#FFF4C2' : 'var(--text-tertiary)' }}>+{l.points}</span></div>
        ))}
        {sc.mult !== 1 && <div className="flex justify-between gap-3"><span>{t('Mode × difficulty')}</span><span style={{ color: '#FFF4C2' }}>×{sc.mult.toFixed(2)}</span></div>}
      </div>
    </div>
    {standings.length > 1 && (
      <div className="panel-elevated px-4 py-2 flex flex-col gap-1" style={{ maxWidth: 720, width: '100%' }}>
        <span className="font-mono-data text-[9px] tracking-[0.3em]" style={{ color: '#FF3B3B' }}>{t('WAR ROOM {room} · FINAL STANDINGS', { room: state.mp!.room })}</span>
        {standings.map((p, i) => {
          const c = continentById(p.faction);
          return (
            <div key={p.peerId} className="flex items-center justify-between font-mono-data text-[11px]" style={{ color: p.mine ? '#FFF4C2' : 'var(--text-secondary)' }}>
              <span><span style={{ color: i === 0 ? '#FFD700' : 'var(--text-tertiary)' }}>{i + 1}.</span> <span style={{ color: c?.color }}>{c?.name}</span> · {p.name}{p.mine ? ` ${t('(you)')}` : ''}{p.online ? '' : ` · ${t('disconnected')}`}</span>
              <span>{capabilityLabel(p.cap)} 10^{p.cap.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    )}
    </>
  );
}
