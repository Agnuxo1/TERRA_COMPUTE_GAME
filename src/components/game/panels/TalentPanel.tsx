import type { ReactNode } from 'react';
import { useGame } from '../../../App';
import { continentById } from '../../../game/data';
import { fmtMoney } from '../../../game/format';
import { FIELD_LABEL, MAX_HIRED, SCIENTISTS, available, bonusLabel, canHire, currentEra, hireCost, initials, type ScientistDef } from '../../../game/people';
import { play } from '../../../hooks/useSound';
import { t } from '../../../i18n';
import { ActionButton, PanelHeader, Section } from './common';

function Card({ sc, color, dim, children }: { sc: ScientistDef; color: string; dim?: boolean; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded p-2" style={{ border: `1px solid ${dim ? 'var(--border)' : `${color}55`}`, background: 'rgba(255,255,255,0.02)', opacity: dim ? 0.55 : 1 }}>
      <div
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-orbitron text-[11px] font-bold"
        style={{ color, border: `1px solid ${color}`, background: `color-mix(in srgb, ${color}, transparent 82%)` }}
        aria-hidden="true"
      >
        {initials(sc.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-rajdhani text-[13px] font-bold leading-tight truncate" style={{ color: dim ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{sc.name}</div>
        <div className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
          {t(FIELD_LABEL[sc.field])} · <span style={{ color: dim ? 'var(--text-tertiary)' : color }}>{bonusLabel(sc)}</span>
        </div>
      </div>
      {children && <div className="shrink-0 w-[92px]">{children}</div>}
    </div>
  );
}

export default function TalentPanel() {
  const { state, dispatch } = useGame();
  const tal = state.talent ?? { hired: [], lost: [] };
  const color = continentById(state.mp?.me ?? state.playerContinent)?.color ?? 'var(--cyan)';
  const cost = hireCost(state);
  const byId = (id: string) => SCIENTISTS.find(x => x.id === id);
  const hired = tal.hired.map(byId).filter((x): x is ScientistDef => !!x);
  const lost = tal.lost.map(byId).filter((x): x is ScientistDef => !!x);
  const pool = available(state);
  const era = currentEra(state.year);

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title={t('TALENT')} accent="#FFB84D" onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      <div className="px-3 py-2 font-rajdhani text-[12px] leading-snug shrink-0" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
        {t('Fictional scientists. Rival spies can poach your best one when they steal research.')}
      </div>
      <div className="flex-1 overflow-auto">
        <Section title={t('Your team ({n}/{max})', { n: hired.length, max: MAX_HIRED })} accent={color}>
          {hired.length === 0 && (
            <div className="font-mono-data text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('No scientists hired yet.')}</div>
          )}
          <div className="flex flex-col gap-1.5">
            {hired.map(sc => (
              <Card key={sc.id} sc={sc} color={color}>
                <ActionButton small color="var(--rose)" title={t('Release {name}. No refund.', { name: sc.name })} onClick={() => { play('click'); dispatch({ type: 'DISMISS', scientist: sc.id }); }}>
                  {t('DISMISS')}
                </ActionButton>
              </Card>
            ))}
          </div>
        </Section>

        <Section title={t('Available this era')} accent="#FFB84D" right={<span className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{t('Era {year}s', { year: era })}</span>}>
          {pool.length === 0 && (
            <div className="font-mono-data text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('No one left in this era.')}</div>
          )}
          <div className="flex flex-col gap-1.5">
            {pool.map(sc => {
              const ok = canHire(state, sc.id);
              return (
                <Card key={sc.id} sc={sc} color={color}>
                  <ActionButton small color="#00E5A0" disabled={!ok.ok} title={ok.ok ? t('Hire {name} for {cost}', { name: sc.name, cost: fmtMoney(cost) }) : ok.reason}
                    onClick={() => { play('coin'); dispatch({ type: 'HIRE', scientist: sc.id }); }}>
                    {t('HIRE ({cost})', { cost: fmtMoney(cost) })}
                  </ActionButton>
                  {!ok.ok && <div className="font-mono-data text-[8px] mt-0.5 leading-tight" style={{ color: 'var(--text-tertiary)' }}>{ok.reason}</div>}
                </Card>
              );
            })}
          </div>
        </Section>

        {lost.length > 0 && (
          <Section title={t('Lost to rivals')}>
            <div className="flex flex-col gap-1.5">
              {lost.map(sc => <Card key={sc.id} sc={sc} color={color} dim />)}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
