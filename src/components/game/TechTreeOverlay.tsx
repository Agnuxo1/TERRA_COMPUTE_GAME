import { useGame, techs } from '../../App';
import { play } from '../../hooks/useSound';

const eras = ['Silicon Dawn', 'Digital Age', 'AI Era', 'Intelligence Explosion', 'Singularity'];

export default function TechTreeOverlay() {
  const { state, dispatch } = useGame();

  const handleClose = () => {
    play('click');
    dispatch({ type: 'CLOSE_OVERLAY' });
  };

  const handleResearch = (techId: string) => {
    if (state.unlockedTechs.includes(techId)) return;
    play('tech');
    dispatch({ type: 'RESEARCH', techId });
  };

  return (
    <div className="shrink-0" style={{
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      maxHeight: '200px',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0" style={{
        background: 'var(--surface-elevated)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="flex items-center gap-3">
          <h2 className="font-orbitron text-xs font-bold" style={{ color: 'var(--cyan)' }}>TECHNOLOGY TREE</h2>
          <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
            {state.totalTechs}/{techs.length} | Efficiency: {state.algorithmicEfficiency.toFixed(2)}x | RP: {state.researchPoints >= 1e6 ? (state.researchPoints/1e6).toFixed(1)+'M' : state.researchPoints >= 1e3 ? (state.researchPoints/1e3).toFixed(1)+'K' : Math.floor(state.researchPoints)}
          </span>
        </div>
        <button onClick={handleClose}
          className="px-2 py-0.5 rounded font-mono-data text-[9px]"
          style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid var(--rose)' }}>
          ✕
        </button>
      </div>

      {/* Current research progress */}
      {state.techQueue && (
        <div className="px-3 py-1" style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="font-mono-data text-[8px]" style={{ color: 'var(--amber)' }}>RESEARCHING:</span>
            <span className="font-rajdhani text-xs font-semibold" style={{ color: 'var(--cyan)' }}>
              {techs.find(t => t.id === state.techQueue)?.name}
            </span>
            <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
              ({Math.floor(state.techProgress)}%)
            </span>
          </div>
          <div className="w-full h-1 rounded-full mt-1" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all" style={{
              width: `${state.techProgress}%`,
              background: 'var(--cyan)',
            }} />
          </div>
        </div>
      )}

      {/* Tech rows - horizontal scroll */}
      <div className="overflow-x-auto p-2" style={{ whiteSpace: 'nowrap' }}>
        {eras.map(era => {
          const eraTechs = techs.filter(t => t.era === era);
          if (eraTechs.length === 0) return null;
          const eraColors: Record<string, string> = {
            'Silicon Dawn': '#8A8D9A',
            'Digital Age': '#3B82F6',
            'AI Era': '#00E5A0',
            'Intelligence Explosion': '#FFB84D',
            'Singularity': '#FFD700',
          };
          const ec = eraColors[era] || 'var(--cyan)';

          return (
            <div key={era} className="inline-block align-top mr-4" style={{ minWidth: '200px' }}>
              <div className="flex items-center gap-1 mb-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: ec }} />
                <span className="font-orbitron text-[8px] tracking-wider" style={{ color: ec }}>{era.toUpperCase()}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {eraTechs.map(t => {
                  const unlocked = state.unlockedTechs.includes(t.id);
                  const available = state.year >= t.year;
                  const canAfford = state.researchPoints >= t.rpCost * 0.2 || unlocked;
                  const isQueued = state.techQueue === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => available && !unlocked ? handleResearch(t.id) : undefined}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-left transition-all"
                      style={{
                        background: unlocked ? 'rgba(0,229,160,0.1)' : isQueued ? 'rgba(255,184,77,0.1)' : available && canAfford ? 'rgba(0,240,255,0.06)' : 'var(--surface-elevated)',
                        border: `1px solid ${unlocked ? 'var(--green)' : isQueued ? 'var(--amber)' : available && canAfford ? 'var(--cyan)' : 'var(--border)'}`,
                        opacity: available ? 1 : 0.4,
                        cursor: available && !unlocked ? 'pointer' : 'default',
                        minWidth: 0,
                      }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                        background: unlocked ? 'var(--green)' : isQueued ? 'var(--amber)' : available ? 'var(--cyan)' : 'var(--text-tertiary)'
                      }} />
                      <div className="min-w-0">
                        <span className="font-rajdhani text-[11px] font-semibold truncate block" style={{
                          color: unlocked ? 'var(--green)' : isQueued ? 'var(--amber)' : available ? 'var(--cyan)' : 'var(--text-secondary)',
                        }}>
                          {t.name}
                        </span>
                        <span className="font-mono-data text-[7px]" style={{ color: 'var(--text-tertiary)' }}>
                          {t.year} — {t.effect}
                        </span>
                        <span className="font-mono-data text-[7px] ml-1" style={{
                          color: state.researchPoints >= t.rpCost ? 'var(--green)' : 'var(--amber)'
                        }}>
                          {t.rpCost >= 1e6 ? (t.rpCost/1e6).toFixed(0)+'M' : t.rpCost >= 1e3 ? (t.rpCost/1e3).toFixed(0)+'K' : t.rpCost} RP
                        </span>
                      </div>
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
