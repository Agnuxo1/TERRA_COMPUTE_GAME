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

interface AttackOption {
  type: 'cyber' | 'sabotage' | 'propaganda';
  label: string;
  description: string;
  color: string;
  baseCost: number;
}

const attackOptions: AttackOption[] = [
  {
    type: 'cyber',
    label: 'CYBER ATTACK',
    description: 'Damage target compute capacity',
    color: '#FF477E',
    baseCost: 50,
  },
  {
    type: 'sabotage',
    label: 'SABOTAGE',
    description: 'Destroy a random building',
    color: '#FFB84D',
    baseCost: 80,
  },
  {
    type: 'propaganda',
    label: 'PROPAGANDA',
    description: 'Reduce target stability',
    color: '#7B61FF',
    baseCost: 40,
  },
];

export default function CyberAttackMenu() {
  const { state, dispatch } = useGame();

  const handleClose = () => {
    play('click');
    dispatch({ type: 'CLOSE_OVERLAY' });
  };

  const handleAttack = (targetId: string, attackType: 'cyber' | 'sabotage' | 'propaganda') => {
    const targetOpp = state.opponents.find(o => o.continentId === targetId);
    if (!targetOpp) return;
    const cost = 50 + targetOpp.defenseLevel * 2;
    if (state.gdp < cost) {
      play('alert');
      return;
    }
    play('click');
    dispatch({ type: 'CYBER_ATTACK', target: targetId, attackType });
  };

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
          <h2 className="font-orbitron text-xs font-bold" style={{ color: 'var(--rose)' }}>CYBER ATTACKS</h2>
          <p className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
            GDP: ${Math.floor(state.gdp)}B | Select target and attack type
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
            const totalBuildings = opp.buildings.reduce((s, b) => s + b.count, 0);

            return (
              <div key={opp.continentId} className="p-2 rounded" style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
              }}>
                {/* Target info */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cont.color }} />
                  <span className="font-orbitron text-[10px] font-bold" style={{ color: cont.color }}>
                    {cont.name}
                  </span>
                  <span className="font-mono-data text-[7px] px-1 rounded" style={{
                    background: opp.stability > 60 ? 'var(--green-dim)' : opp.stability > 30 ? 'var(--amber-dim)' : 'var(--rose-dim)',
                    color: opp.stability > 60 ? 'var(--green)' : opp.stability > 30 ? 'var(--amber)' : 'var(--rose)',
                  }}>
                    STAB {Math.floor(opp.stability)}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 mb-2">
                  <div>
                    <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>GDP</span>
                    <span className="font-mono-data text-[9px] ml-1" style={{ color: 'var(--text-primary)' }}>${Math.floor(opp.gdp)}B</span>
                  </div>
                  <div>
                    <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>COMPUTE</span>
                    <span className="font-mono-data text-[9px] ml-1" style={{ color: 'var(--cyan)' }}>{fmtNumber(opp.compute)}F</span>
                  </div>
                  <div>
                    <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>DEFENSE</span>
                    <span className="font-mono-data text-[9px] ml-1" style={{ color: opp.defenseLevel > 50 ? 'var(--rose)' : 'var(--green)' }}>
                      {Math.floor(opp.defenseLevel)}
                    </span>
                  </div>
                  <div>
                    <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>BUILDINGS</span>
                    <span className="font-mono-data text-[9px] ml-1" style={{ color: 'var(--amber)' }}>{totalBuildings}</span>
                  </div>
                  <div>
                    <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>POP</span>
                    <span className="font-mono-data text-[9px] ml-1" style={{ color: 'var(--text-primary)' }}>
                      {opp.population >= 1e6 ? (opp.population/1e6).toFixed(0)+'M' : Math.floor(opp.population)}
                    </span>
                  </div>
                  <div>
                    <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>STRATEGY</span>
                    <span className="font-mono-data text-[9px] ml-1" style={{ color: 'var(--purple)' }}>{opp.strategy}</span>
                  </div>
                </div>

                {/* Attack buttons */}
                <div className="flex flex-col gap-1">
                  {attackOptions.map(opt => {
                    const cost = opt.baseCost + opp.defenseLevel * 2;
                    const canAfford = state.gdp >= cost;
                    const successChance = Math.max(5, Math.min(95, 70 - defenseFactor * 40));

                    return (
                      <button
                        key={opt.type}
                        onClick={() => canAfford ? handleAttack(opp.continentId, opt.type) : play('alert')}
                        className="flex items-center justify-between px-2 py-1 rounded text-left transition-all"
                        style={{
                          background: canAfford ? opt.color + '11' : 'var(--surface)',
                          border: `1px solid ${canAfford ? opt.color + '55' : 'var(--border)'}`,
                          opacity: canAfford ? 1 : 0.5,
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-orbitron text-[8px] font-bold" style={{ color: opt.color }}>
                            {opt.label}
                          </span>
                          <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>
                            {opt.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>
                            {successChance}% hit
                          </span>
                          <span className="font-mono-data text-[8px] px-1 rounded" style={{
                            background: canAfford ? 'var(--green-dim)' : 'var(--rose-dim)',
                            color: canAfford ? 'var(--green)' : 'var(--rose)',
                          }}>
                            ${cost}B
                          </span>
                        </div>
                      </button>
                    );
                  })}
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
      </div>
    </div>
  );
}
