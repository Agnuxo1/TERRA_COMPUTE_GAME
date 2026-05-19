import { buildings, continents, territoryContinents, useGame } from '../../App';
import { contColor, getCentroid, territories } from './RiskMap';
import { play } from '../../hooks/useSound';

interface ContinentCommandMapProps {
  onExit: () => void;
}

const buildingCardMap: Record<string, string> = {
  housing: '/assets/cards/build-housing.png',
  farm: '/assets/cards/build-farm.png',
  factory: '/assets/cards/build-factory.png',
  hospital: '/assets/cards/build-hospital.png',
  school: '/assets/cards/build-school.png',
  market: '/assets/cards/build-market.png',
  seaport: '/assets/cards/build-seaport.png',
  lab: '/assets/cards/build-lab.png',
  uni: '/assets/cards/build-uni.png',
  mainframe: '/assets/cards/build-mainframe.png',
  super: '/assets/cards/build-super.png',
  datacenter: '/assets/cards/build-datacenter.png',
  gpucluster: '/assets/cards/build-gpucluster.png',
  aifactory: '/assets/cards/build-aifactory.png',
  chipfab: '/assets/cards/build-chipfab.png',
  coal: '/assets/cards/build-coal.png',
  nuclear: '/assets/cards/build-nuclear.png',
  solar: '/assets/cards/build-solar.png',
  defense: '/assets/cards/build-defense.png',
  satellite: '/assets/cards/build-satellite.png',
  robot: '/assets/cards/build-robot.png',
};

const buildingTone: Record<string, string> = {
  population: '#86EFAC',
  economy: '#FFB84D',
  education: '#A78BFA',
  compute: '#00F0FF',
  energy: '#00E5A0',
  production: '#B8BBC8',
  defense: '#FF477E',
  telecom: '#3B82F6',
  automation: '#FFD700',
};

function getBounds(continentId: string) {
  const own = territories.filter(t => t.continent === continentId);
  const numbers = own.flatMap(t => {
    const matches = t.path.match(/[-+]?[0-9]*\.?[0-9]+/g) || [];
    return matches.map(Number);
  });

  const xs = numbers.filter((_, i) => i % 2 === 0);
  const ys = numbers.filter((_, i) => i % 2 === 1);
  const minX = Math.min(...xs) - 36;
  const minY = Math.min(...ys) - 34;
  const maxX = Math.max(...xs) + 36;
  const maxY = Math.max(...ys) + 44;

  return {
    viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getCategory(type: string): string {
  return buildings.find(b => b.id === type)?.category || 'compute';
}

export default function ContinentCommandMap({ onExit }: ContinentCommandMapProps) {
  const { state, dispatch } = useGame();
  const continentId = state.playerContinent || 'na';
  const continent = continents.find(c => c.id === continentId);
  const ownTerritories = territories.filter(t => t.continent === continentId);
  const bounds = getBounds(continentId);
  const placed = state.buildingIcons.filter(icon => territoryContinents[icon.territory] === continentId);

  const handleTerritoryClick = (territoryId: string) => {
    play('click', 0.65);
    dispatch({ type: 'SELECT_TERRITORY', territory: territoryId });
  };

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#07070A' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,71,126,0.08), transparent 34%), radial-gradient(circle at 60% 40%, rgba(0,240,255,0.12), transparent 32%), #07070A',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(0,240,255,0.05) 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, rgba(255,184,77,0.035) 32px)',
          mixBlendMode: 'screen',
        }}
      />

      <svg className="absolute inset-0 w-full h-full" viewBox={bounds.viewBox} preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="continent-paper-grain">
            <feTurbulence baseFrequency="0.75" numOctaves="2" seed="7" type="fractalNoise" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.18" />
            </feComponentTransfer>
          </filter>
          <linearGradient id="territory-command-fill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={continent?.color || '#00F0FF'} stopOpacity="0.72" />
            <stop offset="100%" stopColor="#161821" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          fill="rgba(5,5,8,0.78)"
        />
        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          filter="url(#continent-paper-grain)"
          opacity="0.55"
        />

        {ownTerritories.map(t => {
          const selected = state.selectedTerritory === t.id;
          const [cx, cy] = getCentroid(t.path);
          return (
            <g key={t.id}>
              <path
                d={t.path}
                fill={selected ? '#FFB84D' : 'url(#territory-command-fill)'}
                stroke={selected ? '#FFF4C2' : contColor(continentId)}
                strokeWidth={selected ? 3.2 : 1.7}
                onClick={() => handleTerritoryClick(t.id)}
                style={{
                  cursor: 'pointer',
                  filter: selected
                    ? 'drop-shadow(0 0 8px rgba(255,184,77,0.75))'
                    : `drop-shadow(0 0 4px ${contColor(continentId)}66)`,
                }}
              />
              <text
                x={cx}
                y={cy}
                fill={selected ? '#1E2028' : 'rgba(255,255,255,0.74)'}
                fontSize="7"
                fontFamily="Rajdhani"
                fontWeight="800"
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
                style={{ letterSpacing: 0 }}
              >
                {t.name.toUpperCase()}
              </text>
            </g>
          );
        })}

        {placed.map((icon, i) => {
          const category = getCategory(icon.type);
          const tone = buildingTone[category] || '#00F0FF';
          const size = category === 'compute' || icon.type === 'aifactory' ? 24 : 20;
          return (
            <g key={`${icon.type}-${icon.territory}-${i}`} transform={`translate(${icon.x} ${icon.y})`}>
              <line x1="-10" y1="12" x2="11" y2="12" stroke="#050508" strokeWidth="5" opacity="0.55" />
              <rect
                x={-size / 2}
                y={-size / 2}
                width={size}
                height={size * 0.72}
                rx="2"
                fill="#0A0A0F"
                stroke={tone}
                strokeWidth="1.3"
                filter={`drop-shadow(0 0 5px ${tone}99)`}
              />
              {buildingCardMap[icon.type] ? (
                <image
                  href={buildingCardMap[icon.type]}
                  x={-size / 2 + 1}
                  y={-size / 2 + 1}
                  width={size - 2}
                  height={size * 0.72 - 2}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <path d="M -7 5 L 0 -8 L 8 5 Z" fill={tone} />
              )}
              <path d={`M ${-size / 2} ${size * 0.22} L ${size / 2} ${size * 0.22} L ${size / 2 - 4} ${size * 0.42} L ${-size / 2 + 4} ${size * 0.42} Z`} fill={tone} opacity="0.85" />
            </g>
          );
        })}
      </svg>

      <div className="absolute left-[152px] top-3 max-md:left-[112px] flex items-center gap-2" style={{ zIndex: 40 }}>
        <button
          type="button"
          onClick={() => {
            play('click', 0.8);
            onExit();
          }}
          className="font-orbitron text-[9px] font-bold tracking-wider px-3 py-2 transition-transform hover:scale-[1.03]"
          style={{
            color: '#0A0A0F',
            background: 'var(--amber)',
            border: '1px solid rgba(255,244,194,0.7)',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.45)',
          }}
        >
          GLOBE
        </button>
        <div
          className="font-orbitron text-[11px] font-black tracking-wider px-3 py-2"
          style={{
            color: continent?.color || 'var(--cyan)',
            background: 'rgba(5,5,8,0.72)',
            border: `1px solid ${continent?.color || '#00F0FF'}66`,
          }}
        >
          {continent?.name.toUpperCase()} COMMAND MAP
        </div>
      </div>

      <div
        className="absolute bottom-3 left-[152px] max-md:left-[112px] font-mono-data text-[8px] px-3 py-2"
        style={{
          zIndex: 40,
          color: 'var(--text-secondary)',
          background: 'rgba(5,5,8,0.74)',
          border: '1px solid var(--border)',
        }}
      >
        TERRITORY: {state.selectedTerritory ? state.selectedTerritory.replace(/_/g, ' ').toUpperCase() : 'AUTO'} · STRUCTURES: {placed.length}
      </div>
    </div>
  );
}
