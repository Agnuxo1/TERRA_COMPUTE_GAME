import { useState, type ReactNode } from 'react';
import { useGame } from '../../../App';
import { continentById } from '../../../game/data';
import { DOCTRINES } from '../../../game/doctrines';
import {
  ASSEMBLY_BLOCS, asiThreshold, canProposeAIControl, chipWorldShare, custodianReady, defcon, doctrine, FIRSTS, GOVERNANCE_QUORUM,
  governanceVotes, has, hasIntel, requiredAlignment, rivalEta, rogueRisk, safetyTreaties,
} from '../../../game/engine';
import { isHuman, playerName } from '../../../game/mp';
import { capabilityLabel } from '../../../game/format';
import { play } from '../../../hooks/useSound';
import { t } from '../../../i18n';
import { ActionButton, Bar, KV, Section } from './common';

export default function OverviewPanel() {
  const { state, dispatch } = useGame();
  const [armed, setArmed] = useState(false);
  const me = continentById(state.playerContinent)!;
  const target = asiThreshold(state);
  const req = requiredAlignment(state);
  const rows = [
    { id: me.id, name: me.name, color: me.color, c: state.capability, a: state.alignment, intel: true, me: true, eta: 0, project: false, human: undefined as string | undefined },
    ...state.rivals.map(r => {
      const c = continentById(r.id)!;
      const intel = hasIntel(state, r);
      return { id: r.id, name: c.name, color: c.color, c: r.capability, a: r.alignment, intel, me: false, eta: rivalEta(r), project: r.project !== undefined, human: isHuman(state, r.id) ? playerName(state, r.id) : undefined };
    }),
  ].sort((a, b) => b.c - a.c);
  const risk = rogueRisk(state);
  const worldEm = state.eco.emissions + state.rivals.reduce((s, r) => s + r.emissions, 0);
  const share = worldEm > 0 ? state.eco.emissions / worldEm : 0;
  const planetColor = state.planetHealth > 60 ? '#00E5A0' : state.planetHealth > 30 ? '#FFB84D' : '#FF477E';
  const doomColor = state.doomClock > 6 ? '#00E5A0' : state.doomClock > 3 ? '#FFB84D' : '#FF477E';

  return (
    <div className="flex flex-col">
      {/* ─── Race to ASI ─── */}
      <Section title={t('RACE TO SUPERINTELLIGENCE')} accent="var(--cyan)" right={<span className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{t('GOAL 10^{target}', { target })}</span>}>
        <div className="flex flex-col gap-1.5">
          {rows.map(r => (
            <div key={r.id} title={r.me ? t('Your bloc') : r.intel ? t('Estimated ASI year: {year}', { year: Math.round(r.eta) }) : t('No intelligence: numbers are rough estimates. Run a SPY operation.')}>
              <div className="flex items-center justify-between font-mono-data text-[9.5px]">
                <span style={{ color: r.me ? '#FFF4C2' : r.color, fontWeight: r.me ? 700 : 400 }}>
                  {r.me ? '► ' : ''}{t(r.name)}{r.human && <span style={{ color: '#F2E9DC' }}> 👤{r.human}</span>}
                  {r.project && <span className="ml-1 px-1 rounded animate-pulse" style={{ color: '#050508', background: 'var(--rose)', fontSize: '8px', fontWeight: 700 }} title={t('This bloc has launched a crash programme to ignite superintelligence.')}>{t('ASI PROJECT')}</span>}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {r.intel ? t('{label} {capability}', { label: capabilityLabel(r.c), capability: r.c.toFixed(1) }) : t('≈{label}', { label: capabilityLabel(Math.round(r.c)) })}
                  <span style={{ color: r.intel ? (r.a >= 70 ? 'var(--green)' : r.a >= 45 ? 'var(--amber)' : 'var(--rose)') : 'var(--text-tertiary)' }}>
                    {' · '}{r.intel ? `${Math.round(r.a)}%` : '?%'}
                  </span>
                </span>
              </div>
              <div style={{ opacity: r.intel ? 1 : 0.55 }}>
                <Bar value={r.c - 6} max={target - 6} color={r.me ? '#FFF4C2' : r.color} height={r.me ? 6 : 4} />
              </div>
              {!r.me && !r.intel && r.project && state.gameMode !== 'pioneer' && (
                <div className="font-mono-data text-[8.5px]" style={{ color: 'var(--rose)' }}>{t('Ignition date unknown — run INTEL [S] to see it')}</div>
              )}
              {!r.me && r.intel && (r.c > 19 || r.project) && state.gameMode !== 'pioneer' && (
                <div className="font-mono-data text-[8.5px]" style={{ color: r.eta - state.year < 4 ? 'var(--rose)' : 'var(--text-tertiary)' }}>
                  {t('ASI ETA ~{eta} · {status}', { eta: Math.round(r.eta), status: r.a < 60 ? t('RECKLESS: rogue AI risk') : t('likely aligned') })}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2">
          {state.playerLaunchReady ? (
            <div className="flex flex-col gap-1">
              <div className="font-mono-data text-[10px] text-center" style={{ color: risk > 0 ? 'var(--rose)' : 'var(--green)' }}>
                {risk > 0 ? t('ROGUE-AI RISK {risk}% — raise alignment to {req}% for zero risk', { risk: Math.round(risk * 100), req }) : t('ALIGNMENT SECURE — ZERO ROGUE RISK')}
              </div>
              {armed ? (
                <div className="grid grid-cols-2 gap-1">
                  <ActionButton color={risk > 0 ? '#FF477E' : '#00E5A0'} onClick={() => { play('alert'); dispatch({ type: 'IGNITE_ASI' }); }}>
                    {t('☢ CONFIRM')}
                  </ActionButton>
                  <ActionButton color="var(--text-secondary)" onClick={() => setArmed(false)}>{t('ABORT')}</ActionButton>
                </div>
              ) : (
                <ActionButton color={risk > 0 ? '#FF477E' : '#00E5A0'} onClick={() => { play('click'); setArmed(true); }}>
                  {t('☢ IGNITE SUPERINTELLIGENCE')}
                </ActionButton>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <Check ok={has(state, 'asi')} text={t('Research Superintelligence Theory')} />
              <Check ok={state.capability >= target} text={t('Compute 10^{target} FLOPS (now 10^{now})', { target, now: state.capability.toFixed(1) })} />
              <Check ok={state.alignment >= req} text={t('Alignment ≥ {req}% (now {now}%)', { req, now: Math.round(state.alignment) })} soft />
            </div>
          )}
        </div>
      </Section>

      {/* ─── Paths to victory ─── */}
      <Section title={t('PATHS TO VICTORY')} accent="#FFD700">
        <div className="flex flex-col gap-2">
          <PathRow label={t('Superintelligence')} value={t('10^{now} of 10^{target}', { now: state.capability.toFixed(1), target })}
            progress={(state.capability - 6) / (target - 6)} color="var(--cyan)" />
          <PathRow label={t('World Assembly: AI Control Treaty')} value={t('{yes}/{blocs} votes', { yes: governanceVotes(state), blocs: ASSEMBLY_BLOCS })}
            progress={governanceVotes(state) / ASSEMBLY_BLOCS} color="#FFD700"
            hint={state.aiControlProposed
              ? t('Tabled for the World Assembly of {year}. Needs {quorum} of {blocs} votes.', { year: state.assemblyNext ?? 1995, quorum: GOVERNANCE_QUORUM, blocs: ASSEMBLY_BLOCS })
              : t('Votes every 4 years from 1995. Needs {quorum} of {blocs} votes.', { quorum: GOVERNANCE_QUORUM, blocs: ASSEMBLY_BLOCS })}>
            <ActionButton small color="#FFD700" disabled={!canProposeAIControl(state)}
              title={t('Costs 10% of the budget. Needs 4 safety treaties and a free assembly.')}
              onClick={() => { play('click'); dispatch({ type: 'PROPOSE_AI_CONTROL' }); }}>
              {state.aiControlProposed ? t('TABLED') : t('Propose AI Control Treaty')}
            </ActionButton>
            {!state.aiControlProposed && <div className="font-mono-data text-[8.5px]" style={{ color: 'var(--text-tertiary)' }}>{t('Costs 10% of the budget. Needs {n}/4 safety treaties.', { n: safetyTreaties(state) })}</div>}
          </PathRow>
          <PathRow label={t('Silicon hegemony')}
            value={t('{years}/5 years · {share}% of chips', { years: state.siliconYears ?? 0, share: Math.round(chipWorldShare(state) * 100) })}
            progress={(state.siliconYears ?? 0) / 5} color="var(--green)"
            hint={state.year <= 1990 ? t('Needs 60% of world chip output for 5 years. Counts from 1990.') : t('Needs 60% of world chip output for 5 years.')} />
          <PathRow label={t('Custodian (shared victory)')}
            value={t('alignment {al}%/95 · safety treaties {n}/5 · stay within 10× of the leader', { al: Math.round(state.alignment), n: safetyTreaties(state) })}
            progress={Math.min(state.alignment / 95, safetyTreaties(state) / 5)} color={custodianReady(state) ? 'var(--green)' : 'var(--amber)'}
            hint={t('Pays out only if a rival ignites a safe superintelligence first.')} />
        </div>
      </Section>

      {/* ─── Doctrines ─── */}
      <Section title={t('DOCTRINES')} accent="var(--purple)">
        <div className="flex flex-col gap-0.5">
          {DOCTRINES.map(d => {
            const c = doctrine(state, d.id);
            return (
              <KV key={d.id} k={t(d.short)}
                v={c ? t(d[c].label) : state.year >= d.year ? t('awaiting your decision') : t('decision in {year}', { year: d.year })}
                tone={c ? 'good' : 'dim'} />
            );
          })}
        </div>
      </Section>

      {/* ─── Planet ─── */}
      <Section title={t('WORLD FIRSTS')} accent="#FFD700">
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          {FIRSTS.map(f => {
            const w = state.firsts?.[f.key];
            const mine = w?.who === (state.mp?.me ?? state.playerContinent);
            const who = w ? (w.who === 'history' ? t('before your time') : `${mine ? t('YOU') : t(continentById(w.who)?.name ?? w.who)} ${w.year}`) : t('unclaimed');
            return (
              <div key={f.key} className="font-mono-data text-[9px] flex justify-between gap-1" title={w ? '' : t('First bloc to reach a {label} wins a research bonus and national pride.', { label: t(f.label) })}>
                <span style={{ color: w ? (mine ? '#FFD700' : 'var(--text-tertiary)') : 'var(--text-secondary)' }}>{w ? (mine ? '🏆' : '✔') : '○'} {t(f.label)}</span>
                <span style={{ color: mine ? '#FFD700' : 'var(--text-tertiary)' }}>{who}</span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title={t('PLANET')} accent={planetColor}>
        <KV k={t('Planet health')} v={`${Math.round(state.planetHealth)}%`} tone={state.planetHealth > 60 ? 'good' : state.planetHealth > 30 ? 'warn' : 'bad'} />
        <Bar value={state.planetHealth} color={planetColor} />
        <div className="mt-1" />
        <KV k={t('Warming')} v={`+${state.temperature.toFixed(2)} °C`} tone={state.temperature > 2 ? 'bad' : state.temperature > 1.4 ? 'warn' : 'dim'} />
        <KV k={t('World emissions')} v={t('{amount} Mt/yr', { amount: Math.round(worldEm) })} />
        <KV k={t('Your share')} v={`${Math.round(share * 100)}%`} tone={share > 0.2 ? 'warn' : 'dim'} />
        <KV k={t('AI doom clock')} v={<span style={{ color: doomColor }}>{t('{minutes} min to midnight', { minutes: state.doomClock.toFixed(1) })}</span>} />
        <KV k={t('World tension')} v={<span title={t('Covert operations raise it, treaties and time lower it. DEFCON 1: every nation loses two years of growth.')} style={{ color: ['', '#FF2D2D', '#FF7A2D', '#FFB84D', '#00F0FF', '#00E5A0'][defcon(state.tension)] }}>{t('DEFCON {level} · {tension}', { level: defcon(state.tension), tension: Math.round(state.tension ?? 0) })}</span>} />
        <div className="font-rajdhani text-[11.5px] leading-snug mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {t('At 0% the planet collapses and everyone loses. Clean energy, forests and Climate Accords slow warming.')}
        </div>
      </Section>

      {/* ─── Warnings ─── */}
      {state.warnings.length > 0 && (
        <Section title={t('ALERTS')} accent="var(--rose)">
          <div className="flex flex-col gap-1">
            {state.warnings.slice(0, 5).map((w, i) => (
              <div key={i} className="font-rajdhani text-[12.5px] leading-snug flex gap-1.5" style={{ color: w.severity === 'danger' ? 'var(--rose)' : 'var(--amber)' }}>
                <span>{w.severity === 'danger' ? '▲' : '●'}</span><span>{w.text}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ─── Directives ─── */}
      <Section title={t('DIRECTIVES')} accent="var(--amber)">
        <div className="flex flex-col gap-1.5">
          {[...state.objectives.filter(o => o.done && o.reward > 0).slice(-2), ...state.objectives.filter(o => !o.done)].map(o => (
            <div key={o.id} className="flex gap-2" style={{ opacity: o.done ? 0.45 : 1 }}>
              <span className="font-mono-data text-[11px]" style={{ color: o.done ? 'var(--green)' : 'var(--amber)' }}>{o.done ? '✔' : '☐'}</span>
              <div className="min-w-0">
                <div className="font-rajdhani text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {t(o.text)} <span className="font-mono-data text-[9px]" style={{ color: 'var(--green)' }}>+${o.reward}B</span>
                </div>
                {!o.done && <div className="font-rajdhani text-[11.5px] leading-snug" style={{ color: 'var(--text-tertiary)' }}>{t(o.hint)}</div>}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── Log ─── */}
      <Section title={t('WORLD LOG')}>
        <div className="flex flex-col gap-0.5">
          {state.log.slice(0, 12).map(l => (
            <div key={l.id} className="font-mono-data text-[9.5px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--amber)' }}>{l.year}</span>{' '}
              <span style={{ color: l.tone === 'danger' ? 'var(--rose)' : l.tone === 'success' ? 'var(--green)' : 'var(--cyan)' }}>{l.who}</span>: {l.text}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function PathRow({ label, value, progress, color, hint, children }: { label: string; value: string; progress: number; color: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between gap-2 font-mono-data text-[9.5px]">
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <Bar value={Math.max(0, Math.min(1, progress)) * 100} color={color} height={4} />
      {hint && <div className="font-mono-data text-[8.5px]" style={{ color: 'var(--text-tertiary)' }}>{hint}</div>}
      {children}
    </div>
  );
}

function Check({ ok, text, soft }: { ok: boolean; text: string; soft?: boolean }) {
  return (
    <div className="font-mono-data text-[9.5px] flex gap-1.5" style={{ color: ok ? 'var(--green)' : soft ? 'var(--amber)' : 'var(--text-tertiary)' }}>
      <span>{ok ? '✔' : soft ? '!' : '○'}</span><span>{text}</span>
    </div>
  );
}
