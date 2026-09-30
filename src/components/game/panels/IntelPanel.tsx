import { useGame } from '../../../App';
import { continentById } from '../../../game/data';
import { covertChance, covertCost, hasIntel, rivalEta, type CovertOp } from '../../../game/engine';
import { capabilityLabel, fmtMoney } from '../../../game/format';
import { play } from '../../../hooks/useSound';
import { PanelHeader } from './common';

const OPS: Record<'spy' | 'attack', Array<{ op: CovertOp; label: string; text: string }>> = {
  spy: [
    { op: 'intel', label: 'INTELLIGENCE SWEEP', text: 'Reveal their exact compute, alignment and ASI timeline for 10 years.' },
    { op: 'steal', label: 'STEAL RESEARCH', text: 'Grab ~35% of your current tech from their labs.' },
  ],
  attack: [
    { op: 'sabotage', label: 'CYBER SABOTAGE', text: 'Set their AI program back ~1 year. If exposed: all treaties torn up.' },
    { op: 'propaganda', label: 'PROPAGANDA', text: 'Destabilise them: unrest slows their progress.' },
  ],
};

export default function IntelPanel({ mode }: { mode: 'spy' | 'attack' }) {
  const { state, dispatch } = useGame();
  const accent = mode === 'spy' ? '#FFB84D' : '#FF477E';
  const ops = OPS[mode];
  const rivals = [...state.rivals].sort((a, b) => b.capability - a.capability);
  return (
    <div className="flex flex-col h-full">
      <PanelHeader title={mode === 'spy' ? 'INTELLIGENCE' : 'COVERT ACTION'} accent={accent} onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })}
        right={<span className="font-mono-data text-[10px]" style={{ color: 'var(--green)' }}>{fmtMoney(state.budget)}</span>} />
      <div className="px-3 py-2 font-rajdhani text-[12px] leading-snug shrink-0" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
        {mode === 'spy'
          ? 'Without intelligence, rival numbers are rough guesses. Space Centers raise every success chance.'
          : 'Slow down the reckless front-runner — a rogue superintelligence anywhere ends the game for everyone. Getting caught ruins relations.'}
      </div>
      <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">
        {rivals.map(r => {
          const c = continentById(r.id)!;
          const intel = hasIntel(state, r);
          return (
            <div key={r.id} className="rounded p-2" style={{ border: `1px solid ${c.color}55`, background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center justify-between">
                <span className="font-rajdhani text-[14px] font-bold" style={{ color: c.color }}>{c.name}</span>
                <span className="font-mono-data text-[9.5px]" style={{ color: 'var(--text-secondary)' }}>
                  {intel ? `${capabilityLabel(r.capability)} ${r.capability.toFixed(1)} · align ${Math.round(r.alignment)}%` : `≈${capabilityLabel(Math.round(r.capability))} · align ?`}
                </span>
              </div>
              {intel && (
                <div className="font-mono-data text-[9px]" style={{ color: r.alignment < 60 ? 'var(--rose)' : 'var(--text-tertiary)' }}>
                  ASI ETA ~{Math.round(rivalEta(r))} · stability {Math.round(r.stability)} · intel until {Math.floor(r.intelUntil)}
                </div>
              )}
              <div className="grid grid-cols-2 gap-1 mt-1.5">
                {ops.map(o => {
                  const cost = covertCost(state, o.op);
                  const ch = covertChance(state, r, o.op);
                  const ok = state.budget >= cost;
                  return (
                    <button key={o.op} disabled={!ok}
                      onClick={() => { play('alert'); dispatch({ type: 'COVERT', rivalId: r.id, op: o.op }); }}
                      className={`rounded px-1.5 py-1 text-left ${ok ? 'hover:brightness-125' : 'opacity-40 cursor-not-allowed'}`}
                      style={{ border: `1px solid ${accent}88`, background: `${accent}10` }}
                      title={o.text}>
                      <div className="font-mono-data text-[9px]" style={{ color: accent }}>{o.label}</div>
                      <div className="font-mono-data text-[8.5px]" style={{ color: 'var(--text-secondary)' }}>{fmtMoney(cost)} · {Math.round(ch * 100)}% success</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
