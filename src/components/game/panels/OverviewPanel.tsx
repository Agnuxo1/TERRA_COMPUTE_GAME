import { useState } from 'react';
import { useGame } from '../../../App';
import { continentById } from '../../../game/data';
import { asiThreshold, has, hasIntel, requiredAlignment, rivalEta, rogueRisk } from '../../../game/engine';
import { capabilityLabel } from '../../../game/format';
import { play } from '../../../hooks/useSound';
import { ActionButton, Bar, KV, Section } from './common';

export default function OverviewPanel() {
  const { state, dispatch } = useGame();
  const [armed, setArmed] = useState(false);
  const me = continentById(state.playerContinent)!;
  const target = asiThreshold(state);
  const req = requiredAlignment(state);
  const rows = [
    { id: me.id, name: me.name, color: me.color, c: state.capability, a: state.alignment, intel: true, me: true, eta: 0, project: false },
    ...state.rivals.map(r => {
      const c = continentById(r.id)!;
      const intel = hasIntel(state, r);
      return { id: r.id, name: c.name, color: c.color, c: r.capability, a: r.alignment, intel, me: false, eta: rivalEta(r), project: r.project !== undefined };
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
      <Section title="RACE TO SUPERINTELLIGENCE" accent="var(--cyan)" right={<span className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>GOAL 10^{target}</span>}>
        <div className="flex flex-col gap-1.5">
          {rows.map(r => (
            <div key={r.id} title={r.me ? 'Your bloc' : r.intel ? `Estimated ASI year: ${Math.round(r.eta)}` : 'No intelligence: numbers are rough estimates. Run a SPY operation.'}>
              <div className="flex items-center justify-between font-mono-data text-[9.5px]">
                <span style={{ color: r.me ? '#FFF4C2' : r.color, fontWeight: r.me ? 700 : 400 }}>
                  {r.me ? '► ' : ''}{r.name}
                  {r.project && <span className="ml-1 px-1 rounded animate-pulse" style={{ color: '#050508', background: 'var(--rose)', fontSize: '8px', fontWeight: 700 }} title="This bloc has launched a crash programme to ignite superintelligence.">ASI PROJECT</span>}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {r.intel ? `${capabilityLabel(r.c)} ${r.c.toFixed(1)}` : `≈${capabilityLabel(Math.round(r.c))}`}
                  <span style={{ color: r.intel ? (r.a >= 70 ? 'var(--green)' : r.a >= 45 ? 'var(--amber)' : 'var(--rose)') : 'var(--text-tertiary)' }}>
                    {' · '}{r.intel ? `${Math.round(r.a)}%` : '?%'}
                  </span>
                </span>
              </div>
              <div style={{ opacity: r.intel ? 1 : 0.55 }}>
                <Bar value={r.c - 6} max={target - 6} color={r.me ? '#FFF4C2' : r.color} height={r.me ? 6 : 4} />
              </div>
              {!r.me && !r.intel && r.project && state.gameMode !== 'pioneer' && (
                <div className="font-mono-data text-[8.5px]" style={{ color: 'var(--rose)' }}>Ignition date unknown — run INTEL [S] to see it</div>
              )}
              {!r.me && r.intel && (r.c > 19 || r.project) && state.gameMode !== 'pioneer' && (
                <div className="font-mono-data text-[8.5px]" style={{ color: r.eta - state.year < 4 ? 'var(--rose)' : 'var(--text-tertiary)' }}>
                  ASI ETA ~{Math.round(r.eta)} · {r.a < 60 ? 'RECKLESS: rogue AI risk' : 'likely aligned'}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2">
          {state.playerLaunchReady ? (
            <div className="flex flex-col gap-1">
              <div className="font-mono-data text-[10px] text-center" style={{ color: risk > 0 ? 'var(--rose)' : 'var(--green)' }}>
                {risk > 0 ? `ROGUE-AI RISK ${Math.round(risk * 100)}% — raise alignment to ${req}% for zero risk` : 'ALIGNMENT SECURE — ZERO ROGUE RISK'}
              </div>
              {armed ? (
                <div className="grid grid-cols-2 gap-1">
                  <ActionButton color={risk > 0 ? '#FF477E' : '#00E5A0'} onClick={() => { play('alert'); dispatch({ type: 'IGNITE_ASI' }); }}>
                    ☢ CONFIRM
                  </ActionButton>
                  <ActionButton color="var(--text-secondary)" onClick={() => setArmed(false)}>ABORT</ActionButton>
                </div>
              ) : (
                <ActionButton color={risk > 0 ? '#FF477E' : '#00E5A0'} onClick={() => { play('click'); setArmed(true); }}>
                  ☢ IGNITE SUPERINTELLIGENCE
                </ActionButton>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <Check ok={has(state, 'asi')} text="Research Superintelligence Theory" />
              <Check ok={state.capability >= target} text={`Compute 10^${target} FLOPS (now 10^${state.capability.toFixed(1)})`} />
              <Check ok={state.alignment >= req} text={`Alignment ≥ ${req}% (now ${Math.round(state.alignment)}%)`} soft />
            </div>
          )}
        </div>
      </Section>

      {/* ─── Planet ─── */}
      <Section title="PLANET" accent={planetColor}>
        <KV k="Planet health" v={`${Math.round(state.planetHealth)}%`} tone={state.planetHealth > 60 ? 'good' : state.planetHealth > 30 ? 'warn' : 'bad'} />
        <Bar value={state.planetHealth} color={planetColor} />
        <div className="mt-1" />
        <KV k="Warming" v={`+${state.temperature.toFixed(2)} °C`} tone={state.temperature > 2 ? 'bad' : state.temperature > 1.4 ? 'warn' : 'dim'} />
        <KV k="World emissions" v={`${Math.round(worldEm)} Mt/yr`} />
        <KV k="Your share" v={`${Math.round(share * 100)}%`} tone={share > 0.2 ? 'warn' : 'dim'} />
        <KV k="AI doom clock" v={<span style={{ color: doomColor }}>{state.doomClock.toFixed(1)} min to midnight</span>} />
        <div className="font-rajdhani text-[11.5px] leading-snug mt-1" style={{ color: 'var(--text-tertiary)' }}>
          At 0% the planet collapses and everyone loses. Clean energy, forests and Climate Accords slow warming.
        </div>
      </Section>

      {/* ─── Warnings ─── */}
      {state.warnings.length > 0 && (
        <Section title="ALERTS" accent="var(--rose)">
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
      <Section title="DIRECTIVES" accent="var(--amber)">
        <div className="flex flex-col gap-1.5">
          {[...state.objectives.filter(o => o.done && o.reward > 0).slice(-2), ...state.objectives.filter(o => !o.done)].map(o => (
            <div key={o.id} className="flex gap-2" style={{ opacity: o.done ? 0.45 : 1 }}>
              <span className="font-mono-data text-[11px]" style={{ color: o.done ? 'var(--green)' : 'var(--amber)' }}>{o.done ? '✔' : '☐'}</span>
              <div className="min-w-0">
                <div className="font-rajdhani text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {o.text} <span className="font-mono-data text-[9px]" style={{ color: 'var(--green)' }}>+${o.reward}B</span>
                </div>
                {!o.done && <div className="font-rajdhani text-[11.5px] leading-snug" style={{ color: 'var(--text-tertiary)' }}>{o.hint}</div>}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── Log ─── */}
      <Section title="WORLD LOG">
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

function Check({ ok, text, soft }: { ok: boolean; text: string; soft?: boolean }) {
  return (
    <div className="font-mono-data text-[9.5px] flex gap-1.5" style={{ color: ok ? 'var(--green)' : soft ? 'var(--amber)' : 'var(--text-tertiary)' }}>
      <span>{ok ? '✔' : soft ? '!' : '○'}</span><span>{text}</span>
    </div>
  );
}
