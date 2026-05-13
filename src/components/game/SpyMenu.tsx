import { useGame, continents } from '../../App';
import { play } from '../../hooks/useSound';

function fmtNumber(n: number): string {
  if (n >= 1e18) return (n / 1e18).toFixed(1) + 'E';
  if (n >= 1e15) return (n / 1e15).toFixed(1) + 'P';
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'G';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toFixed(0);
}

const SPY_COST = 50;

export default function SpyMenu() {
  const { state, dispatch } = useGame();

  const handleClose = () => {
    play('click');
    dispatch({ type: 'CLOSE_OVERLAY' });
  };

  const handleSpy = (targetId: string) => {
    if (state.gdp < SPY_COST) {
      play('alert');
      return;
    }
    play('click');
    dispatch({ type: 'SPY_MISSION', target: targetId });
  };

  // Filter spy operations that have intel for display
  const recentIntel = state.spyOperations
    .filter(s => s.from === state.playerContinent)
    .slice(0, 10);

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
          <h2 className="font-orbitron text-xs font-bold" style={{ color: 'var(--amber)' }}>ESPIONAGE</h2>
          <p className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
            GDP: ${Math.floor(state.gdp)}B | Spy cost: ${SPY_COST}B each
          </p>
        </div>
        <button onClick={handleClose}
          className="px-2 py-0.5 rounded font-mono-data text-[9px]"
          style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid var(--rose)' }}>
          ✕
        </button>
      </div>

      {/* Target List */}
      <div className="flex-1 overflow-auto p-1.5" style={{ minHeight: 0 }}>
        <div className="flex flex-col gap-1.5">
          {state.opponents.map(opp => {
            const cont = continents.find(c => c.id === opp.continentId);
            if (!cont) return null;

            const defenseFactor = opp.defenseLevel / 100;
            const counterSpyChance = defenseFactor * 0.4;
            const successChance = Math.max(20, Math.min(90, 80 - counterSpyChance * 100));
            const canAfford = state.gdp >= SPY_COST;
            const totalBuildings = opp.buildings.reduce((s, b) => s + b.count, 0);

            return (
              <div key={opp.continentId} className="p-2 rounded" style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
              }}>
                {/* Target info */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cont.color }} />
                    <span className="font-orbitron text-[10px] font-bold" style={{ color: cont.color }}>
                      {cont.name}
                    </span>
                  </div>
                  <button
                    onClick={() => canAfford ? handleSpy(opp.continentId) : play('alert')}
                    className="px-2 py-0.5 rounded font-mono-data text-[8px] transition-all"
                    style={{
                      background: canAfford ? 'var(--amber-dim)' : 'var(--surface)',
                      color: canAfford ? 'var(--amber)' : 'var(--text-tertiary)',
                      border: `1px solid ${canAfford ? 'var(--amber)' : 'var(--border)'}`,
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                    }}
                  >
                    🕵️ SPY (${SPY_COST}B)
                  </button>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 mb-1.5">
                  <div>
                    <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>GDP</span>
                    <span className="font-mono-data text-[9px] ml-1" style={{ color: 'var(--text-primary)' }}>${Math.floor(opp.gdp)}B</span>
                  </div>
                  <div>
                    <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>COMPUTE</span>
                    <span className="font-mono-data text-[9px] ml-1" style={{ color: 'var(--cyan)' }}>{fmtNumber(opp.compute)}F</span>
                  </div>
                  <div>
                    <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>BUILDINGS</span>
                    <span className="font-mono-data text-[9px] ml-1" style={{ color: 'var(--amber)' }}>{totalBuildings}</span>
                  </div>
                </div>

                {/* Success chance */}
                <div className="flex items-center gap-1">
                  <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>
                    Success chance:
                  </span>
                  <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${successChance}%`,
                      background: successChance > 60 ? 'var(--green)' : successChance > 40 ? 'var(--amber)' : 'var(--rose)',
                    }} />
                  </div>
                  <span className="font-mono-data text-[8px]" style={{
                    color: successChance > 60 ? 'var(--green)' : successChance > 40 ? 'var(--amber)' : 'var(--rose)',
                  }}>
                    {Math.floor(successChance)}%
                  </span>
                  <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>
                    (counter: {Math.floor(counterSpyChance * 100)}%)
                  </span>
                </div>
              </div>
            );
          })}

          {state.opponents.length === 0 && (
            <div className="text-center p-4 font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
              No opponents available.
            </div>
          )}
        </div>

        {/* Intel Log */}
        {recentIntel.length > 0 && (
          <div className="mt-3 p-2 rounded" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
            <h3 className="font-orbitron text-[8px] mb-1.5 tracking-wider" style={{ color: 'var(--amber)' }}>INTEL LOG</h3>
            <div className="flex flex-col gap-1.5">
              {recentIntel.map(s => (
                <div key={s.id} className="p-1.5 rounded" style={{ background: 'var(--surface)' }}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="font-mono-data text-[7px]" style={{ color: 'var(--amber)' }}>{s.year}</span>
                    <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>
                      → {continents.find(c => c.id === s.target)?.name || s.target}
                    </span>
                  </div>
                  <p className="font-mono-data text-[8px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {s.intel}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
