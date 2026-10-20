import { useGame } from '../../../App';
import { continentById } from '../../../game/data';
import { covertChance, covertCost, defcon, hasIntel, rivalEta, sweepCost, COVERT_TENSION, type CovertOp } from '../../../game/engine';
import { isHuman, playerName } from '../../../game/mp';
import { capabilityLabel, fmtMoney } from '../../../game/format';
import type { AINation } from '../../../game/types';
import { play } from '../../../hooks/useSound';
import { t } from '../../../i18n';
import { PanelHeader } from './common';

/** Five-segment bar of a rival's smoothed investment split ($B/yr), with a legend. */
function InvestSplit({ invest }: { invest: AINation['invest'] }) {
  const parts: Array<{ key: keyof AINation['invest']; label: string; color: string }> = [
    { key: 'compute', label: t('Compute'), color: 'var(--green)' },
    { key: 'research', label: t('Research'), color: '#7B61FF' },
    { key: 'safety', label: t('Safety'), color: 'var(--cyan)' },
    { key: 'defense', label: t('Defence'), color: 'var(--amber)' },
    { key: 'covert', label: t('Covert'), color: 'var(--rose)' },
  ];
  const vals = parts.map(p => Math.max(0, invest[p.key]));
  const total = vals.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  return (
    <div className="mt-1">
      <div className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>{t('Investment mix')}</div>
      <div className="flex h-[5px] rounded-sm overflow-hidden my-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {parts.map((p, i) => <div key={p.key} style={{ width: `${(vals[i] / total) * 100}%`, background: p.color }} />)}
      </div>
      <div className="flex flex-wrap gap-x-2 font-mono-data text-[8px]">
        {parts.map((p, i) => <span key={p.key} style={{ color: p.color }}>{p.label} {Math.round((vals[i] / total) * 100)}%</span>)}
      </div>
    </div>
  );
}

const OPS: Record<'spy' | 'attack', Array<{ op: CovertOp; label: string; text: string }>> = {
  spy: [
    { op: 'intel', label: 'INTELLIGENCE SWEEP', text: 'Reveal their exact compute, alignment and ASI timeline for 10 years.' },
    { op: 'steal', label: 'STEAL RESEARCH', text: 'Grab ~35% of your current tech from their labs.' },
  ],
  attack: [
    { op: 'sabotage', label: 'CYBER SABOTAGE', text: 'Set their AI program back ~1 year. If exposed: all treaties torn up.' },
    { op: 'propaganda', label: 'PROPAGANDA', text: 'Destabilise them: unrest slows their progress (against a human: their approval −6 for 3 years).' },
    { op: 'blackout', label: 'GRID ATTACK', text: 'Black out their power grid: −30% supply for a year against a human, a slower programme for an AI bloc. The loudest operation of all.' },
  ],
};

export default function IntelPanel({ mode }: { mode: 'spy' | 'attack' }) {
  const { state, dispatch } = useGame();
  const accent = mode === 'spy' ? '#FFB84D' : '#FF477E';
  const ops = OPS[mode];
  const rivals = [...state.rivals].sort((a, b) => b.capability - a.capability);
  return (
    <div className="flex flex-col h-full">
      <PanelHeader title={mode === 'spy' ? t('INTELLIGENCE') : t('COVERT ACTION')} accent={accent} onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })}
        right={<span className="font-mono-data text-[10px]" style={{ color: 'var(--green)' }}>{fmtMoney(state.budget)}</span>} />
      <div className="px-3 py-2 font-rajdhani text-[12px] leading-snug shrink-0" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
        {mode === 'spy'
          ? t('Without intelligence, rival numbers are rough guesses. Space Centers raise every success chance.')
          : t('Slow down the reckless front-runner — a rogue superintelligence anywhere ends the game for everyone. Getting caught ruins relations.')}
        <div className="mt-1 font-mono-data text-[9.5px]" style={{ color: defcon(state.tension) <= 2 ? 'var(--rose)' : 'var(--text-secondary)' }}>
          {t('☢ DEFCON {defcon} · tension {tension}/100 — every operation raises it; at DEFCON 1 every nation loses two years of growth.', { defcon: defcon(state.tension), tension: Math.round(state.tension ?? 0) })}
        </div>
        {mode === 'spy' && (() => {
          const cost = sweepCost(state);
          const active = state.modifiers.find(m => m.id === 'counterintel');
          return (
            <button disabled={!!active || state.budget < cost}
              onClick={() => { play('click'); dispatch({ type: 'COUNTER_INTEL' }); }}
              className={`mt-1.5 w-full rounded px-2 py-1.5 text-left ${active || state.budget < cost ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125'}`}
              style={{ border: '1px solid var(--green)', background: 'rgba(0,229,160,0.06)' }}
              title={t('Enemy operations against you fail more often (−20% success) for 3 years. Stacks with AI Safety Institutes.')}>
              <div className="font-mono-data text-[9.5px]" style={{ color: 'var(--green)' }}>🛡 {t('COUNTER-INTELLIGENCE SWEEP')}</div>
              <div className="font-mono-data text-[8.5px]" style={{ color: 'var(--text-secondary)' }}>
                {active ? t('Active until {until}', { until: Math.floor(active.until) }) : t('{cost} · enemy operations −20% success for 3 years', { cost: fmtMoney(cost) })}
              </div>
            </button>
          );
        })()}
      </div>
      <div className="flex-1 overflow-auto p-2 flex flex-col gap-2 [&>*]:shrink-0">
        {rivals.map(r => {
          const c = continentById(r.id)!;
          const intel = hasIntel(state, r);
          return (
            <div key={r.id} className="rounded p-2" style={{ border: `1px solid ${c.color}55`, background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center justify-between">
                <span className="font-rajdhani text-[14px] font-bold" style={{ color: c.color }}>
                  {t(c.name)}{isHuman(state, r.id) && <span className="font-mono-data text-[9px] font-normal ml-1" style={{ color: '#F2E9DC' }}>👤 {playerName(state, r.id)}</span>}
                </span>
                <span className="font-mono-data text-[9.5px]" style={{ color: 'var(--text-secondary)' }}>
                  {intel
                    ? t('{label} {capability} · align {align}%', { label: capabilityLabel(r.capability), capability: r.capability.toFixed(1), align: Math.round(r.alignment) })
                    : t('≈{label} · align ?', { label: capabilityLabel(Math.round(r.capability)) })}
                </span>
              </div>
              {intel && (
                <div className="font-mono-data text-[9px]" style={{ color: r.alignment < 60 ? 'var(--rose)' : 'var(--text-tertiary)' }}>
                  {t('ASI ETA ~{eta} · stability {stability} · intel until {until}', { eta: Math.round(rivalEta(r)), stability: Math.round(r.stability), until: Math.floor(r.intelUntil) })}
                </div>
              )}
              {intel && r.nation && !isHuman(state, r.id) && <InvestSplit invest={r.nation.invest} />}
              {(r.heat ?? 0) >= 0.5 && (
                <div className="font-mono-data text-[9px]" style={{ color: 'var(--amber)' }} title={t('Every operation puts them on alert: the next one costs more and succeeds less often. Alert fades over a few years.')}>
                  {t('⚠ ON ALERT ×{mult} cost · −{pct}% success', { mult: (1 + 0.6 * (r.heat ?? 0)).toFixed(1), pct: Math.round(8 * (r.heat ?? 0)) })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-1 mt-1.5">
                {ops.map(o => {
                  const cost = covertCost(state, o.op, r);
                  const ch = covertChance(state, r, o.op);
                  const ok = state.budget >= cost;
                  return (
                    <button key={o.op} disabled={!ok}
                      onClick={() => { play('alert'); dispatch({ type: 'COVERT', rivalId: r.id, op: o.op }); }}
                      className={`rounded px-1.5 py-1 text-left ${ok ? 'hover:brightness-125' : 'opacity-40 cursor-not-allowed'}`}
                      style={{ border: `1px solid ${accent}88`, background: `${accent}10` }}
                      title={t('{text} World tension +{tension} (+{exposed} if exposed).', { text: t(o.text), tension: COVERT_TENSION[o.op], exposed: COVERT_TENSION[o.op] * 1.5 })}>
                      <div className="font-mono-data text-[9px]" style={{ color: accent }}>{t(o.label)}</div>
                      <div className="font-mono-data text-[8.5px]" style={{ color: 'var(--text-secondary)' }}>{t('{cost} · {pct}% success', { cost: fmtMoney(cost), pct: Math.round(ch * 100) })}</div>
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
