import { useGame } from '../../App';
import { ERA_NAMES, techById, techs } from '../../game/data';
import { TECH_LOOKAHEAD, has, techAvailable, techCost } from '../../game/engine';
import { play } from '../../hooks/useSound';
import { t } from '../../i18n';

export default function TechTreeOverlay() {
  const { state, dispatch } = useGame();
  const current = state.researching ? techById[state.researching] : null;
  const rate = state.eco.researchRate;

  return (
    <div className="absolute left-0 right-0 bottom-0 z-40 flex flex-col animate-fade-up"
      style={{ height: 'min(52vh, 420px)', background: 'rgba(10,11,16,0.97)', borderTop: '2px solid var(--cyan)', boxShadow: '0 -20px 50px rgba(0,0,0,0.6)' }}>
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="font-orbitron text-[12px] font-bold tracking-[0.2em]" style={{ color: 'var(--cyan)' }}>{t('RESEARCH')}</h3>
          <span className="font-mono-data text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
            {current
              ? <>{t('Researching')} <b style={{ color: '#FFF4C2' }}>{t(current.name)}</b> {t('· {progress}/{cost} · ~{years} yrs', {
                progress: Math.round(state.researchProgress),
                cost: techCost(state, current.id),
                years: Math.max(0, (techCost(state, current.id) - state.researchProgress - state.researchPoints) / Math.max(1, rate)).toFixed(1),
              })}</>
              : <span style={{ color: 'var(--rose)' }}>{t('No research selected — points are piling up unused ({points})', { points: Math.round(state.researchPoints) })}</span>}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono-data text-[10px]" style={{ color: '#A78BFA' }}>{t('+{rate} RP/yr', { rate: Math.round(rate) })}</span>
          <button onClick={() => dispatch({ type: 'CLOSE_OVERLAY' })} className="font-mono-data text-[10px] px-1.5 rounded hover:brightness-150" style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-light)' }}>✕</button>
        </div>
      </div>
      <div className="px-3 py-1 font-rajdhani text-[11.5px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>
        {t('Pick one technology at a time. Researching ahead of history costs +10% per year early (max {years} years). Switching keeps half of the invested points.', { years: TECH_LOOKAHEAD })}
      </div>
      <div className="flex-1 overflow-auto px-2 pb-2">
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(5, minmax(190px, 1fr))', minWidth: 980 }}>
          {[1, 2, 3, 4, 5].map(era => (
            <div key={era} className="flex flex-col gap-1.5">
              <div className="font-mono-data text-[9.5px] tracking-[0.2em] py-1 sticky top-0 z-10" style={{ color: 'var(--amber)', background: 'rgba(10,11,16,0.97)' }}>
                {['I', 'II', 'III', 'IV', 'V'][era - 1]} · {t(ERA_NAMES[era]).toUpperCase()}
              </div>
              {techs.filter(tech => tech.era === era).map(tech => {
                const done = has(state, tech.id);
                const active = state.researching === tech.id;
                const avail = techAvailable(state, tech.id);
                const missing = tech.requires.filter(r => !has(state, r)).map(r => techById[r].name);
                const tooEarly = !done && missing.length === 0 && !avail;
                const cost = techCost(state, tech.id);
                const early = Math.max(0, Math.ceil(tech.year - state.year));
                const color = done ? '#00E5A0' : active ? '#00F0FF' : avail ? '#FFF4C2' : '#5A5D6A';
                return (
                  <button key={tech.id} disabled={!avail || active}
                    onClick={() => { play('tech'); dispatch({ type: 'RESEARCH', techId: tech.id }); }}
                    className={`text-left rounded px-2 py-1.5 transition-all ${avail && !active ? 'hover:brightness-125 cursor-pointer' : 'cursor-default'}`}
                    style={{
                      border: `1px solid ${done ? '#00E5A044' : active ? '#00F0FF' : avail ? '#FFF4C244' : 'var(--border)'}`,
                      background: active ? 'rgba(0,240,255,0.08)' : done ? 'rgba(0,229,160,0.05)' : 'rgba(255,255,255,0.02)',
                      boxShadow: active ? '0 0 14px rgba(0,240,255,0.25)' : 'none',
                    }}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-rajdhani text-[13px] font-bold leading-tight" style={{ color }}>{done ? '✔ ' : active ? '◉ ' : ''}{t(tech.name)}</span>
                      <span className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{tech.year}</span>
                    </div>
                    <div className="font-mono-data text-[9px] leading-snug" style={{ color: done ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>{t(tech.effect)}</div>
                    {!done && (
                      <div className="font-mono-data text-[9px] mt-0.5" style={{ color: missing.length ? 'var(--rose)' : tooEarly ? 'var(--amber)' : 'var(--green)' }}>
                        {missing.length
                          ? t('needs {techs}', { techs: missing.map(n => t(n)).join(', ') })
                          : tooEarly
                            ? t('available from {year}', { year: tech.year - TECH_LOOKAHEAD })
                            : t('{cost} RP{early}', { cost, early: early ? t(' (+{pct}% early)', { pct: early * 10 }) : '' })}
                      </div>
                    )}
                    {active && (
                      <div className="h-1 mt-1 rounded-sm overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full" style={{ width: `${(state.researchProgress / cost) * 100}%`, background: 'var(--cyan)' }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
