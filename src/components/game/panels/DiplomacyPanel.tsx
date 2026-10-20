import { useGame } from '../../../App';
import { continentById, techById } from '../../../game/data';
import { TREATY_INFO, giftCost, has, hasIntel } from '../../../game/engine';
import { fmtMoney } from '../../../game/format';
import { RIVAL_LEADERS } from '../../../game/dynamic-events';
import { isHuman, playerName } from '../../../game/mp';
import type { TreatyId } from '../../../game/types';
import { play } from '../../../hooks/useSound';
import { t } from '../../../i18n';
import { Bar, PanelHeader } from './common';

const TREATIES: TreatyId[] = ['trade', 'research', 'climate', 'safety'];
const STRATEGY_TEXT: Record<string, string> = {
  aggressive: 'Aggressive racer — cuts safety corners',
  tech: 'Tech-first superpower',
  balanced: 'Balanced developer',
  economic: 'Trade-focused economy',
  defensive: 'Cautious and defensive',
};

export default function DiplomacyPanel() {
  const { state, dispatch } = useGame();
  const gift = giftCost(state);
  return (
    <div className="flex flex-col h-full">
      <PanelHeader title={t('DIPLOMACY')} accent="#7B61FF" onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      <div className="px-3 py-2 font-rajdhani text-[12px] leading-snug shrink-0" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
        {t('Aid raises relations. Treaties need a minimum relation and sometimes a technology. Climate Accords cool the planet; AI Safety Treaties make rivals safer and slower.')}
        {state.mp && <span style={{ color: '#F2E9DC' }}> {t('👤 Human heads of state receive your aid as real money and must accept your treaties.')}</span>}
      </div>
      <div className="flex-1 overflow-auto p-2 flex flex-col gap-2 [&>*]:shrink-0">
        {[...state.rivals].sort((a, b) => b.relation - a.relation).map(r => {
          const c = continentById(r.id)!;
          const relColor = r.relation >= 30 ? '#00E5A0' : r.relation >= 0 ? '#FFB84D' : '#FF477E';
          const intel = hasIntel(state, r);
          return (
            <div key={r.id} className="rounded p-2" style={{ border: `1px solid ${c.color}55`, background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center justify-between">
                <span className="font-rajdhani text-[14px] font-bold" style={{ color: c.color }}>
                  {t(c.name)}
                  {isHuman(state, r.id)
                    ? <span className="font-mono-data text-[9px] font-normal ml-1.5 px-1 rounded" style={{ color: '#050508', background: '#F2E9DC' }}>👤 {playerName(state, r.id)}</span>
                    : RIVAL_LEADERS[r.id] && <span className="font-mono-data text-[9px] font-normal ml-1.5" style={{ color: 'var(--text-secondary)' }}>{t(RIVAL_LEADERS[r.id].title)} {RIVAL_LEADERS[r.id].name}</span>}
                  {r.project !== undefined && <span className="font-mono-data text-[8px] ml-1.5 px-1 rounded whitespace-nowrap" style={{ color: '#050508', background: 'var(--rose)' }}>{t('ASI PROJECT')}</span>}
                </span>
                <span className="font-mono-data text-[10px]" style={{ color: relColor }}>{r.relation >= 30 ? t('FRIENDLY') : r.relation >= 0 ? t('NEUTRAL') : r.relation > -50 ? t('HOSTILE') : t('ENEMY')} {Math.round(r.relation)}</span>
              </div>
              <div className="my-1"><Bar value={r.relation + 100} max={200} color={relColor} height={4} marker={100} /></div>
              <div className="font-mono-data text-[9px] mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                <span title={RIVAL_LEADERS[r.id]?.doctrine ? t(RIVAL_LEADERS[r.id].doctrine) : undefined}>{t(STRATEGY_TEXT[r.strategy])}</span>{RIVAL_LEADERS[r.id] && <span style={{ color: 'var(--text-secondary)' }}> · {t(RIVAL_LEADERS[r.id].doctrine)}</span>}{intel ? ` · ${t('emissions {emissions} Mt · clean {clean}%', { emissions: Math.round(r.emissions), clean: Math.round(r.cleanShare * 100) })}` : ''}
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => { play('coin'); dispatch({ type: 'DIPLOMACY', rivalId: r.id, action: 'gift' }); }} disabled={state.budget < gift}
                  className={`font-mono-data text-[9px] py-1 rounded ${state.budget < gift ? 'opacity-40' : 'hover:brightness-125'}`}
                  style={{ color: 'var(--green)', border: '1px solid var(--green)' }} title={t('+12 relations')}>
                  🎁 {t('AID {cost}', { cost: fmtMoney(gift) })}
                </button>
                {TREATIES.map(tid => {
                  const info = TREATY_INFO[tid];
                  const signed = r.treaties.includes(tid);
                  const techOk = !info.tech || has(state, info.tech);
                  const relOk = r.relation >= info.need;
                  return (
                    <button key={tid}
                      onClick={() => { play('click'); dispatch({ type: 'DIPLOMACY', rivalId: r.id, action: signed ? `cancel_${tid}` : tid }); }}
                      disabled={!signed && !techOk}
                      className={`font-mono-data text-[9px] py-1 rounded ${!signed && !techOk ? 'opacity-35 cursor-not-allowed' : 'hover:brightness-125'}`}
                      style={{
                        color: signed ? '#050508' : relOk ? '#7B61FF' : 'var(--text-tertiary)',
                        background: signed ? '#7B61FF' : 'transparent',
                        border: `1px solid ${signed ? '#7B61FF' : relOk ? '#7B61FF' : 'var(--border-light)'}`,
                      }}
                      title={t('{name}: {text}\nNeeds relations ≥ {need}{tech}.{cancel}', {
                        name: t(info.name),
                        text: t(info.text),
                        need: info.need,
                        tech: info.tech ? t(' and {tech}', { tech: t(techById[info.tech].name) }) : '',
                        cancel: signed ? t('\nClick to cancel (relations −15).') : '',
                      })}>
                      {signed ? '✔ ' : ''}{t(info.name).replace(' Treaty', '').replace('AI ', '').toUpperCase()}{!signed && !techOk ? ' 🔒' : !signed && !relOk ? ` ≥${info.need}` : ''}
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
