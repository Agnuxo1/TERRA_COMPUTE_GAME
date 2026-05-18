import { useGame, continents, strategies } from '../../App';
import { play } from '../../hooks/useSound';

function fmtNumber(n: number): string {
  if (n >= 1e18) return (n / 1e18).toFixed(1) + 'E';
  if (n >= 1e15) return (n / 1e15).toFixed(1) + 'P';
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'G';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toFixed(0);
}

function fmtPop(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'B';
  if (n >= 10) return n.toFixed(0) + 'M';
  if (n >= 1) return n.toFixed(1) + 'M';
  return Math.round(n * 1000) + 'K';
}

const strategyLabels: Record<string, { label: string; color: string }> = {
  aggressive: { label: 'AGGRESSIVE', color: '#FF477E' },
  economic: { label: 'ECONOMIC', color: '#00E5A0' },
  tech: { label: 'TECH', color: '#00F0FF' },
  balanced: { label: 'BALANCED', color: '#FFB84D' },
  defensive: { label: 'DEFENSIVE', color: '#7B61FF' },
};

export default function DiplomacyOverlay() {
  const { state, dispatch } = useGame();

  const handleClose = () => {
    play('click');
    dispatch({ type: 'CLOSE_OVERLAY' });
  };

  const playerCont = continents.find(c => c.id === state.playerContinent);
  const recentAttacks = state.cyberAttacks.slice(0, 10);

  return (
    <div className="h-full flex flex-col" style={{
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 shrink-0" style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-elevated)',
      }}>
        <div>
          <h2 className="font-orbitron text-xs font-bold" style={{ color: 'var(--purple)' }}>DIPLOMACY</h2>
          <p className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
            Year {Math.floor(state.year)} | {state.opponents.length} rivals
          </p>
        </div>
        <button onClick={handleClose}
          className="px-2 py-0.5 rounded font-mono-data text-[9px]"
          style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid var(--rose)' }}>
          ✕
        </button>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-auto p-1.5" style={{ minHeight: 0 }}>
        <div className="flex flex-col gap-1.5">
          {/* Player */}
          {playerCont && (
            <div className="p-2 rounded" style={{
              background: playerCont.color + '15',
              border: `1.5px solid ${playerCont.color}`,
            }}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: playerCont.color }} />
                <span className="font-orbitron text-[10px] font-bold" style={{ color: playerCont.color }}>{playerCont.name}</span>
                <span className="font-mono-data text-[7px] px-1 rounded" style={{ background: 'var(--cyan)', color: '#000' }}>YOU</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>POP</span> <span className="font-mono-data text-[9px]" style={{ color: 'var(--text-primary)' }}>{fmtPop(state.population)}</span></div>
                <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>WRK</span> <span className="font-mono-data text-[9px]" style={{ color: 'var(--text-primary)' }}>{fmtPop(state.employed)}</span></div>
                <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>GDP</span> <span className="font-mono-data text-[9px]" style={{ color: 'var(--text-primary)' }}>${Math.floor(state.gdp)}B</span></div>
                <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>COMPUTE</span> <span className="font-mono-data text-[9px]" style={{ color: 'var(--cyan)' }}>{fmtNumber(state.compute)}F</span></div>
                <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>BLDGS</span> <span className="font-mono-data text-[9px]" style={{ color: 'var(--amber)' }}>{state.totalBuildings}</span></div>
                <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>SAFE</span> <span className="font-mono-data text-[9px]" style={{ color: 'var(--green)' }}>{Math.floor(state.safety)}%</span></div>
              </div>
            </div>
          )}

          {/* Opponents */}
          {state.opponents.map(opp => {
            const cont = continents.find(c => c.id === opp.continentId);
            if (!cont) return null;
            const totalBuildings = opp.buildings.reduce((s, b) => s + b.count, 0);
            const strat = strategyLabels[opp.strategy] || { label: opp.strategy.toUpperCase(), color: 'var(--text-secondary)' };
            return (
              <div key={opp.continentId} className="p-2 rounded" style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
              }}>
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cont.color }} />
                  <span className="font-orbitron text-[10px] font-bold" style={{ color: cont.color }}>{cont.name}</span>
                  <span className="font-mono-data text-[7px] px-1 rounded" style={{ background: strat.color + '22', color: strat.color }}>
                    {strat.label}
                  </span>
                  {opp.lastAction && (
                    <span className="font-mono-data text-[7px] ai-activity px-1 rounded" style={{ background: cont.color + '22', color: cont.color }}>
                      {opp.lastAction}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>POP</span> <span className="font-mono-data text-[9px]" style={{ color: 'var(--text-primary)' }}>{fmtPop(opp.population)}</span></div>
                  <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>WRK</span> <span className="font-mono-data text-[9px]" style={{ color: 'var(--text-primary)' }}>{fmtPop(opp.employed)}</span></div>
                  <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>GDP</span> <span className="font-mono-data text-[9px]" style={{ color: 'var(--text-primary)' }}>${Math.floor(opp.gdp)}B</span></div>
                  <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>COMPUTE</span> <span className="font-mono-data text-[9px]" style={{ color: 'var(--cyan)' }}>{fmtNumber(opp.compute)}F</span></div>
                  <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>BLDGS</span> <span className="font-mono-data text-[9px]" style={{ color: 'var(--amber)' }}>{totalBuildings}</span></div>
                  <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>DEF</span> <span className="font-mono-data text-[9px]" style={{ color: opp.defenseLevel > 30 ? 'var(--green)' : 'var(--rose)' }}>{Math.floor(opp.defenseLevel)}</span></div>
                  <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>SAFE</span> <span className="font-mono-data text-[9px]" style={{ color: opp.safety > 60 ? 'var(--green)' : opp.safety > 30 ? 'var(--amber)' : 'var(--rose)' }}>{Math.floor(opp.safety)}%</span></div>
                  <div><span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>STAB</span> <span className="font-mono-data text-[9px]" style={{ color: opp.stability > 60 ? 'var(--green)' : opp.stability > 30 ? 'var(--amber)' : 'var(--rose)' }}>{Math.floor(opp.stability)}%</span></div>
                </div>
              </div>
            );
          })}

          {/* Attack Log */}
          {recentAttacks.length > 0 && (
            <div className="mt-1 p-2 rounded" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <h3 className="font-orbitron text-[8px] mb-1.5 tracking-wider" style={{ color: 'var(--rose)' }}>CYBER WARFARE LOG</h3>
              <div className="flex flex-col gap-1">
                {recentAttacks.map(a => (
                  <div key={a.id} className="flex items-center gap-1.5 text-[8px] font-mono-data">
                    <span style={{ color: 'var(--amber)' }}>{a.year}</span>
                    <span style={{
                      color: a.type === 'cyber' ? '#FF477E' : a.type === 'sabotage' ? '#FFB84D' : '#7B61FF',
                      textTransform: 'uppercase',
                    }}>
                      {a.type}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {continents.find(c => c.id === a.from)?.name || a.from} → {continents.find(c => c.id === a.target)?.name || a.target}
                    </span>
                    {a.detected && (
                      <span className="px-0.5 rounded" style={{ background: 'var(--rose-dim)', color: 'var(--rose)', fontSize: '6px' }}>
                        DETECTED
                      </span>
                    )}
                    {!a.detected && (
                      <span className="px-0.5 rounded" style={{ background: 'var(--green-dim)', color: 'var(--green)', fontSize: '6px' }}>
                        STEALTH
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
