import { useGame } from '../../App';
import { play } from '../../hooks/useSound';

function fmtNumber(n: number): string {
  if (n >= 1e24) return (n / 1e24).toFixed(1) + 'Y';
  if (n >= 1e21) return (n / 1e21).toFixed(1) + 'Z';
  if (n >= 1e18) return (n / 1e18).toFixed(1) + 'E';
  if (n >= 1e15) return (n / 1e15).toFixed(1) + 'P';
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'G';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtMoney(n: number): string {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'Q';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'T';
  return '$' + n.toFixed(0) + 'B';
}

function fmtPop(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'B';
  if (n >= 10) return n.toFixed(0) + 'M';
  if (n >= 1) return n.toFixed(1) + 'M';
  return Math.round(n * 1000) + 'K';
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function gaugeColor(percent: number, goodHigh = true): string {
  if (goodHigh) {
    if (percent >= 75) return '#00E5A0';
    if (percent >= 45) return '#FFB84D';
    return '#FF477E';
  }
  if (percent <= 35) return '#00E5A0';
  if (percent <= 65) return '#FFB84D';
  return '#FF477E';
}

function getPoliticalLabel(stability: number): string {
  if (stability >= 80) return 'DEMOCRACY';
  if (stability >= 60) return 'TENSIONS';
  if (stability >= 40) return 'PROTESTS';
  if (stability >= 20) return 'EMERGENCY';
  return 'COLLAPSE';
}

function Gauge({
  label,
  value,
  sub,
  percent,
  color,
  unit,
  pulse = false,
}: {
  label: string;
  value: string;
  sub?: string;
  percent: number;
  color: string;
  unit?: string;
  pulse?: boolean;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (1 - clampPercent(percent) / 100);

  return (
    <div
      className={`hud-gauge ${pulse ? 'hud-gauge-alert' : ''}`}
      style={{ ['--gauge-color' as string]: color }}
      title={`${label}: ${value}${unit ? ` ${unit}` : ''}${sub ? ` | ${sub}` : ''}`}
    >
      <svg className="hud-gauge-svg" viewBox="0 0 88 88" aria-hidden="true">
        <circle className="hud-gauge-track" cx="44" cy="44" r={radius} />
        <circle
          className="hud-gauge-progress"
          cx="44"
          cy="44"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
        />
        <circle className="hud-gauge-inner" cx="44" cy="44" r="25" />
      </svg>
      <div className="hud-gauge-readout">
        <span className="hud-gauge-label">{label}</span>
        <strong className="hud-gauge-value">{value}</strong>
        {unit && <span className="hud-gauge-unit">{unit}</span>}
        {sub && <span className="hud-gauge-sub">{sub}</span>}
      </div>
    </div>
  );
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
  const yearsTo2035 = Math.max(0, 2035 - state.year);
  const progressTo2035 = clampPercent(((state.year - 1960) / (2035 - 1960)) * 100);
  const yearColor = progressTo2035 < 65 ? '#00F0FF' : progressTo2035 < 88 ? '#FFB84D' : '#FF477E';

  const foodRatio = state.foodConsumption > 0 ? state.foodProduction / state.foodConsumption : 1;
  const foodPct = clampPercent(foodRatio * 100);
  const isGracePeriod = state.tickCount < 600;

  const energyRatio = state.energyDemand > 0 ? state.energy / Math.max(state.energyDemand, 1) : 1;
  const energyPct = clampPercent(energyRatio * 100);
  const energyColor = gaugeColor(energyPct);

  const employedPct = state.workers > 0 ? clampPercent((state.employed / state.workers) * 100) : 100;
  const unemploymentPct = state.workers > 0 ? clampPercent((state.unemployed / state.workers) * 100) : 0;
  const computePct = clampPercent((Math.log10(Math.max(state.compute, 1)) / 24) * 100);
  const researchPct = clampPercent((Math.log10(Math.max(state.researchPoints + 1, 1)) / 6) * 100);
  const educationPct = clampPercent(state.education);
  const stabilityPct = clampPercent(state.stability);
  const safetyPct = clampPercent(state.safety);
  const budgetPct = clampPercent((Math.log10(Math.max(state.gdp, 1)) / 5) * 100);

  const gauges = [
    {
      label: 'YEAR',
      value: String(yearInt),
      sub: yearsTo2035 > 0 ? `${yearsTo2035.toFixed(1)}y to 2035` : 'POST-2035',
      percent: progressTo2035,
      color: yearColor,
      pulse: yearInt >= 2030,
    },
    {
      label: 'POP',
      value: fmtPop(state.population),
      sub: `${fmtPop(state.employed)} working`,
      percent: clampPercent((state.population / 700) * 100),
      color: '#8BE9FD',
    },
    {
      label: 'BUDGET',
      value: fmtMoney(state.gdp),
      sub: 'public funds',
      percent: budgetPct,
      color: '#00E5A0',
    },
    {
      label: 'FOOD',
      value: `${Math.floor(foodPct)}%`,
      sub: `+${fmtNumber(state.foodProduction)}/-${fmtNumber(state.foodConsumption)}`,
      percent: foodPct,
      color: isGracePeriod ? '#00F0FF' : gaugeColor(foodPct),
      pulse: !isGracePeriod && foodPct < 80,
    },
    {
      label: 'POWER',
      value: `${Math.floor(energyPct)}%`,
      sub: `${fmtNumber(state.energyDemand)}/${fmtNumber(state.energyCapacity)} TWh`,
      percent: energyPct,
      color: energyColor,
      pulse: energyPct < 30,
    },
    {
      label: 'WORK',
      value: `${Math.floor(employedPct)}%`,
      sub: `${Math.floor(unemploymentPct)}% unemployed`,
      percent: employedPct,
      color: gaugeColor(employedPct),
      pulse: unemploymentPct > 35,
    },
    {
      label: 'COMPUTE',
      value: `${fmtNumber(state.compute)}F`,
      sub: `${fmtNumber(state.computeCapacity)}F capacity`,
      percent: computePct,
      color: '#00F0FF',
    },
    {
      label: 'RESEARCH',
      value: fmtNumber(state.researchPoints),
      sub: `${state.researchers.toFixed(0)} teams`,
      percent: researchPct,
      color: '#7B61FF',
    },
    {
      label: 'EDU',
      value: `${Math.floor(educationPct)}%`,
      sub: `x${(1 + (state.education / 100) * 1.4).toFixed(2)} output`,
      percent: educationPct,
      color: '#FFB84D',
    },
    {
      label: 'STATE',
      value: `${Math.floor(stabilityPct)}%`,
      sub: getPoliticalLabel(stabilityPct),
      percent: stabilityPct,
      color: gaugeColor(stabilityPct),
      pulse: stabilityPct < 35,
    },
    {
      label: 'SAFETY',
      value: `${Math.floor(safetyPct)}%`,
      sub: 'alignment',
      percent: safetyPct,
      color: gaugeColor(safetyPct),
      pulse: safetyPct < 50 && state.compute >= 1e21,
    },
  ];

  return (
    <>
      <style>{`
        @keyframes hudPulse {
          0%, 100% { filter: drop-shadow(0 0 4px color-mix(in srgb, var(--gauge-color), transparent 45%)); }
          50% { filter: drop-shadow(0 0 12px var(--gauge-color)); }
        }
        .hud-gauge-panel {
          position: absolute;
          left: 10px;
          top: 10px;
          bottom: 96px;
          z-index: 45;
          width: 132px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-right: 3px;
          overflow-y: auto;
          scrollbar-width: none;
          pointer-events: none;
        }
        .hud-gauge-panel::-webkit-scrollbar { display: none; }
        .hud-gauge {
          position: relative;
          width: 122px;
          height: 122px;
          flex: 0 0 122px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          pointer-events: auto;
        }
        .hud-gauge::before {
          content: "";
          position: absolute;
          inset: 10px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 50%, rgba(4, 12, 18, 0.70) 0 48%, rgba(4, 12, 18, 0.28) 49% 100%),
            conic-gradient(from 220deg, color-mix(in srgb, var(--gauge-color), transparent 64%), rgba(255,255,255,0.04), color-mix(in srgb, var(--gauge-color), transparent 78%));
          box-shadow:
            inset 0 0 22px rgba(0,0,0,0.72),
            0 0 18px rgba(0,0,0,0.35);
          backdrop-filter: blur(2px);
        }
        .hud-gauge-svg {
          position: absolute;
          inset: 8px;
          width: 106px;
          height: 106px;
          transform: rotate(-90deg);
        }
        .hud-gauge-track {
          fill: none;
          stroke: rgba(255,255,255,0.10);
          stroke-width: 7;
        }
        .hud-gauge-progress {
          fill: none;
          stroke: var(--gauge-color);
          stroke-width: 7;
          stroke-linecap: round;
          transition: stroke-dashoffset 260ms ease, stroke 260ms ease;
          filter: drop-shadow(0 0 5px var(--gauge-color));
        }
        .hud-gauge-inner {
          fill: rgba(8, 13, 18, 0.45);
          stroke: rgba(255,255,255,0.08);
          stroke-width: 1;
        }
        .hud-gauge-readout {
          position: relative;
          z-index: 1;
          width: 78px;
          min-height: 58px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          line-height: 1.05;
        }
        .hud-gauge-label {
          font-family: var(--font-mono), monospace;
          font-size: 8px;
          color: rgba(226, 240, 246, 0.62);
        }
        .hud-gauge-value {
          max-width: 78px;
          margin-top: 2px;
          font-family: var(--font-orbitron), sans-serif;
          font-size: 15px;
          color: #fff;
          text-shadow: 0 0 8px var(--gauge-color), 0 1px 2px rgba(0,0,0,0.85);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hud-gauge-unit,
        .hud-gauge-sub {
          max-width: 82px;
          margin-top: 2px;
          font-family: var(--font-mono), monospace;
          font-size: 7px;
          color: color-mix(in srgb, var(--gauge-color), white 28%);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hud-gauge-alert .hud-gauge-progress {
          animation: hudPulse 1.25s infinite;
        }
        .hud-speed-dock {
          pointer-events: auto;
          width: 122px;
          flex: 0 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 5px;
          padding: 8px 7px;
          border-radius: 18px;
          background: rgba(5, 10, 14, 0.34);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(2px);
        }
        .hud-speed-button {
          height: 26px;
          border-radius: 50%;
          font-family: var(--font-orbitron), sans-serif;
          font-size: 8px;
          transition: transform 140ms ease, filter 140ms ease;
        }
        .hud-speed-button:hover {
          transform: translateY(-1px);
          filter: brightness(1.2);
        }
        @media (max-width: 768px) {
          .hud-gauge-panel {
            left: 6px;
            top: 6px;
            bottom: 74px;
            width: 104px;
            gap: 5px;
          }
          .hud-gauge {
            width: 94px;
            height: 94px;
            flex-basis: 94px;
          }
          .hud-gauge-svg {
            inset: 5px;
            width: 84px;
            height: 84px;
          }
          .hud-gauge-readout {
            width: 62px;
            min-height: 48px;
          }
          .hud-gauge-value {
            max-width: 62px;
            font-size: 12px;
          }
          .hud-gauge-label { font-size: 7px; }
          .hud-gauge-sub,
          .hud-gauge-unit {
            max-width: 62px;
            font-size: 6px;
          }
          .hud-speed-dock {
            width: 94px;
            grid-template-columns: repeat(2, 1fr);
            border-radius: 14px;
          }
        }
      `}</style>

      <aside className="hud-gauge-panel" aria-label="Strategic indicators">
        {gauges.map((g) => (
          <Gauge key={g.label} {...g} />
        ))}

        <div className="hud-speed-dock" aria-label="Time controls">
          <button
            onClick={togglePause}
            className="hud-speed-button"
            style={{
              background: state.paused ? 'var(--amber-dim)' : 'var(--green-dim)',
              color: state.paused ? 'var(--amber)' : 'var(--green)',
              border: `1px solid ${state.paused ? 'var(--amber)' : 'var(--green)'}`,
            }}
          >
            {state.paused ? 'PLAY' : 'II'}
          </button>
          {[1, 2, 3].map((spd) => (
            <button
              key={spd}
              onClick={() => setSpeed(spd)}
              className="hud-speed-button"
              style={{
                background: state.speed === spd ? 'var(--cyan)' : 'rgba(255,255,255,0.03)',
                color: state.speed === spd ? '#001014' : 'var(--text-secondary)',
                border: `1px solid ${state.speed === spd ? 'var(--cyan)' : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              {spd}x
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
