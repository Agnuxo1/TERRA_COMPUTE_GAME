import { useGame } from '../../App';
import { play } from '../../hooks/useSound';

function fmtNumber(n: number): string {
  if (n >= 1e18) return (n / 1e18).toFixed(1) + 'E';
  if (n >= 1e15) return (n / 1e15).toFixed(1) + 'P';
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'G';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtMoney(n: number): string {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

function fmtPop(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

// Political state mapping
function getPoliticalState(stability: number): { label: string; color: string; blink: boolean } {
  if (stability >= 80) return { label: 'Democracy', color: 'var(--green)', blink: false };
  if (stability >= 60) return { label: 'Tensions', color: 'var(--amber)', blink: false };
  if (stability >= 40) return { label: 'Protests', color: '#FF6B00', blink: false };
  if (stability >= 20) return { label: 'Emergency', color: 'var(--rose)', blink: false };
  return { label: 'Collapsing', color: 'var(--rose)', blink: true };
}

export default function ResourceBar() {
  const { state, dispatch } = useGame();

  const setSpeed = (spd: number) => {
    play('click');
    dispatch({ type: 'SET_SPEED', speed: spd });
  };

  const togglePause = () => {
    play('click');
    dispatch({ type: 'TOGGLE_PAUSE' });
  };

  const yearInt = Math.floor(state.year);
  const energyRatio = state.energyDemand > 0 ? state.energy / Math.max(state.energyDemand, 1) : 1;
  const energyPct = state.energyCapacity > 0 ? Math.min(100, Math.max(0, energyRatio * 100)) : 100;
  const stabPct = Math.max(0, Math.min(100, state.stability));
  const safePct = Math.max(0, Math.min(100, state.safety));

  // Food status with 3-phase thermometer
  const foodRatio = state.foodConsumption > 0 ? state.foodProduction / state.foodConsumption : 1;
  const isGracePeriod = state.tickCount < 600;
  const foodStatusColor = isGracePeriod ? '#00F0FF' : foodRatio > 1.2 ? 'var(--green)' : foodRatio >= 1.0 ? 'var(--amber)' : 'var(--rose)';
  const foodStatusText = isGracePeriod ? 'BUILD FARMS!' : foodRatio > 1.2 ? 'Surplus' : foodRatio >= 1.0 ? 'Adequate' : 'CRISIS: Population declining!';
  const foodInCrisis = !isGracePeriod && foodRatio < 1.0;

  // Energy status with 4-phase display
  const energyStatusColor = energyPct > 80 ? 'var(--green)' : energyPct > 50 ? 'var(--amber)' : energyPct > 20 ? '#FF6B00' : 'var(--rose)';
  const energyStatusText = energyPct > 80 ? 'Stable' : energyPct > 50 ? 'Strained' : energyPct > 20 ? 'WARNING: Brownouts' : 'CRISIS: Blackout imminent!';
  const energyInCrisis = energyPct <= 20;

  // Political state
  const polState = getPoliticalState(stabPct);

  // Education multiplier
  const educationMult = 1 + (state.education / 100) * 2;

  // Employment status
  const unempRate = state.workers > 0 ? state.unemployed / state.workers : 0;
  const empColor = unempRate > 0.2 ? 'var(--rose)' : unempRate > 0.1 ? 'var(--amber)' : 'var(--green)';

  // Progress toward 2035 - THE CLIFF
  const progressTo2035 = Math.max(0, Math.min(100, ((state.year - 1960) / (2035 - 1960)) * 100));
  const yearsTo2035 = Math.max(0, 2035 - state.year);
  const progressColor = progressTo2035 < 50 ? 'var(--green)' : progressTo2035 < 75 ? 'var(--amber)' : progressTo2035 < 90 ? '#FF6B00' : 'var(--rose)';

  return (
    <>
      <style>{`
        @keyframes blink-critical {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .blink-critical {
          animation: blink-critical 1s infinite;
        }
        @keyframes pulse-border {
          0%, 100% { border-bottom-color: var(--border); }
          50% { border-bottom-color: rgba(255, 71, 126, 0.5); }
        }
        .pulse-border-crisis {
          animation: pulse-border 2s infinite;
        }
        @keyframes pulse-overlay {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .pulse-overlay {
          animation: pulse-overlay 2s infinite;
        }
      `}</style>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 ${energyInCrisis ? 'pulse-border-crisis' : ''}`}
        style={{
          background: 'var(--surface)',
          borderBottom: `1px solid ${energyInCrisis ? 'rgba(255, 71, 126, 0.5)' : 'var(--border)'}`,
          minHeight: '44px',
          overflowX: 'auto',
        }}
      >
        {/* Year - large with 2035 countdown */}
        <div className="flex flex-col items-center px-2" style={{ minWidth: '75px' }}>
          <span className="font-orbitron text-lg font-bold leading-tight" style={{
            color: yearInt >= 2035 ? 'var(--rose)' : 'var(--cyan)',
            textShadow: yearInt >= 2030 ? '0 0 8px rgba(255,71,126,0.4)' : 'none',
          }}>
            {yearInt}
          </span>
          <div className="w-full h-1 rounded-full mt-0.5" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all" style={{
              width: `${progressTo2035}%`,
              background: progressColor,
            }} />
          </div>
          <span className="font-mono-data text-[6px] mt-0.5" style={{ color: progressTo2035 > 75 ? 'var(--rose)' : 'var(--text-tertiary)' }}>
            {yearsTo2035 > 0 ? `${yearsTo2035.toFixed(1)}y to 2035` : 'POST-2035'}
          </span>
        </div>

        <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />

        {/* Population */}
        <div className="flex flex-col px-1.5" style={{ minWidth: '55px' }}>
          <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>POP</span>
          <span className="font-mono-data text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {fmtPop(state.population)}
          </span>
        </div>

        {/* Workers / Unemployed */}
        <div className="flex flex-col px-1.5" style={{ minWidth: '50px' }}>
          <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>WRK/UN</span>
          <span className="font-mono-data text-[10px] font-semibold" style={{ color: empColor }}>
            {fmtPop(state.employed)}<span style={{ color: 'var(--text-tertiary)', fontSize: '8px' }}>/{fmtPop(state.unemployed)}</span>
          </span>
        </div>

        {/* GDP */}
        <div className="flex flex-col px-1.5" style={{ minWidth: '70px' }}>
          <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>GDP</span>
          <span className="font-mono-data text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {fmtMoney(state.gdp)}
          </span>
        </div>

        {/* Food with thermometer */}
        <div className="flex flex-col px-1.5" style={{ minWidth: '85px' }}>
          <div className="flex justify-between">
            <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>FOOD</span>
            <span className="font-mono-data text-[7px]" style={{ color: foodStatusColor }}>
              +{fmtNumber(state.foodProduction)}/-{fmtNumber(state.foodConsumption)}
            </span>
          </div>
          <span className="font-mono-data text-[10px] font-semibold" style={{ color: state.food > state.foodConsumption ? 'var(--green)' : 'var(--rose)' }}>
            {fmtNumber(state.food)}
          </span>
          {/* Food thermometer bar */}
          <div className="w-full h-1.5 rounded-full mt-0.5" style={{ background: 'var(--border)' }}>
            <div
              className={`h-full rounded-full transition-all ${foodInCrisis ? 'blink-critical' : ''}`}
              style={{
                width: `${Math.min(100, foodRatio * 100)}%`,
                background: foodStatusColor,
              }}
            />
          </div>
          <span
            className={`font-mono-data text-[6px] mt-0.5 ${foodInCrisis ? 'blink-critical' : ''}`}
            style={{ color: foodStatusColor, fontWeight: foodInCrisis ? 700 : 400 }}
          >
            {foodStatusText}
          </span>
        </div>

        {/* Energy with improved 4-phase display */}
        <div className="flex flex-col px-1.5 flex-1" style={{ maxWidth: '120px' }}>
          <div className="flex justify-between items-center">
            <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>PWR</span>
            {/* Prominent energy percentage */}
            <span
              className={`font-mono-data font-bold leading-none ${energyInCrisis ? 'blink-critical' : ''}`}
              style={{
                fontSize: '14px',
                color: energyStatusColor,
              }}
              title={`${energyPct.toFixed(1)}% — ${energyStatusText}`}
            >
              ⚡{Math.floor(energyPct)}%
            </span>
          </div>
          <span className="font-mono-data text-[7px]" style={{
            color: energyPct < 30 ? 'var(--rose)' : energyPct < 70 ? 'var(--amber)' : 'var(--green)'
          }}>
            {fmtNumber(state.energyDemand)}/{fmtNumber(state.energyCapacity)}
          </span>
          <div className="w-full h-1.5 rounded-full mt-0.5" style={{ background: 'var(--border)' }}>
            <div className={`h-full rounded-full transition-all ${energyInCrisis ? 'blink-critical' : ''}`} style={{
              width: `${energyPct}%`,
              background: energyStatusColor,
            }} />
          </div>
          <span
            className={`font-mono-data text-[6px] mt-0.5 ${energyInCrisis ? 'blink-critical' : ''}`}
            style={{ color: energyStatusColor, fontWeight: energyInCrisis ? 700 : 400 }}
          >
            {energyStatusText}
          </span>
        </div>

        {/* Compute */}
        <div className="flex flex-col px-1.5" style={{ minWidth: '70px' }}>
          <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>COMPUTE</span>
          <span className="font-mono-data text-[10px] font-semibold" style={{ color: 'var(--cyan)' }}>
            {fmtNumber(state.compute)}F
          </span>
        </div>

        {/* Research Points + Education Multiplier */}
        <div className="flex flex-col px-1.5" style={{ minWidth: '75px' }}>
          <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>RP</span>
          <span className="font-mono-data text-[10px] font-semibold" style={{ color: 'var(--purple)' }}>
            {fmtNumber(state.researchPoints)}
          </span>
          <span className="font-mono-data text-[7px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            EDU:{Math.floor(state.education)}/100
          </span>
          <span className="font-mono-data text-[7px]" style={{ color: 'var(--green)' }}>
            GDP: ×{educationMult.toFixed(2)}
          </span>
        </div>

        {/* Political State (replaces Stability STAB) */}
        <div className="flex flex-col px-1.5" style={{ minWidth: '65px' }} title={`Stability: ${Math.floor(stabPct)}%`}>
          <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>STATUS</span>
          <span
            className={`font-mono-data text-[10px] font-semibold ${polState.blink ? 'blink-critical' : ''}`}
            style={{ color: polState.color }}
          >
            {polState.label}
          </span>
          {/* Stability bar still shown, just smaller */}
          <div className="w-full h-1 rounded-full mt-0.5" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all" style={{
              width: `${stabPct}%`,
              background: stabPct < 30 ? 'var(--rose)' : stabPct < 60 ? 'var(--amber)' : 'var(--green)',
            }} />
          </div>
          <span className="font-mono-data text-[6px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {Math.floor(stabPct)}%
          </span>
        </div>

        {/* Safety bar */}
        <div className="flex flex-col px-1.5" style={{ minWidth: '50px' }}>
          <div className="flex justify-between">
            <span className="font-mono-data text-[8px]" style={{ color: 'var(--text-tertiary)' }}>SAFE</span>
            <span className="font-mono-data text-[7px]" style={{
              color: safePct < 50 ? 'var(--rose)' : safePct < 80 ? 'var(--amber)' : 'var(--green)'
            }}>{Math.floor(safePct)}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full mt-0.5" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all" style={{
              width: `${safePct}%`,
              background: safePct < 50 ? 'var(--rose)' : safePct < 80 ? 'var(--amber)' : 'var(--green)',
            }} />
          </div>
        </div>

        <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />

        {/* Pause */}
        <button onClick={togglePause}
          className="px-2 py-1 rounded font-orbitron text-[9px] transition-all hover:brightness-130 shrink-0"
          style={{
            background: state.paused ? 'var(--amber-dim)' : 'var(--green-dim)',
            color: state.paused ? 'var(--amber)' : 'var(--green)',
            border: `1px solid ${state.paused ? 'var(--amber)' : 'var(--green)'}`,
          }}>
          {state.paused ? '▶' : '⏸'}
        </button>

        {/* Speed buttons */}
        {[1, 2, 3].map(spd => (
          <button key={spd} onClick={() => setSpeed(spd)}
            className="px-1.5 py-1 rounded font-orbitron text-[9px] transition-all hover:brightness-130 shrink-0"
            style={{
              background: state.speed === spd ? 'var(--cyan)' : 'transparent',
              color: state.speed === spd ? '#000' : 'var(--text-secondary)',
              border: `1px solid ${state.speed === spd ? 'var(--cyan)' : 'var(--border)'}`,
            }}>
            {spd}x
          </button>
        ))}
      </div>
    </>
  );
}
