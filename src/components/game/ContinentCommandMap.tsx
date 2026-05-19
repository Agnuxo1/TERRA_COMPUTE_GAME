import { buildings, continents, territoryContinents, useGame } from '../../App';
import { contColor, getCentroid, territories } from './RiskMap';
import { play } from '../../hooks/useSound';

interface ContinentCommandMapProps {
  onExit: () => void;
}

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

const factionCardMap: Record<string, string> = {
  na: '/assets/cards/continent-usa.png',
  eu: '/assets/cards/continent-europe.png',
  su: '/assets/cards/continent-ussr.png',
  cn: '/assets/cards/continent-china.png',
  af: '/assets/cards/continent-africa.png',
  sa: '/assets/cards/continent-southamerica.png',
  in: '/assets/cards/continent-india.png',
  oc: '/assets/cards/continent-oceania.png',
};

function getBounds(continentId: string) {
  const own = territories.filter(t => t.continent === continentId);
  const numbers = own.flatMap(t => {
    const matches = t.path.match(/[-+]?[0-9]*\.?[0-9]+/g) || [];
    return matches.map(Number);
  });

  const xs = numbers.filter((_, i) => i % 2 === 0);
  const ys = numbers.filter((_, i) => i % 2 === 1);
  const minX = Math.min(...xs) - 18;
  const minY = Math.min(...ys) - 18;
  const maxX = Math.max(...xs) + 18;
  const maxY = Math.max(...ys) + 24;

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

function getRoadHub(territoryId: string): [number, number] {
  const territory = territories.find(t => t.id === territoryId);
  return territory ? getCentroid(territory.path) : [380, 225];
}

function makeRoadPath(from: [number, number], to: [number, number], i: number): string {
  const mx = (from[0] + to[0]) / 2;
  const my = (from[1] + to[1]) / 2;
  const bend = i % 2 === 0 ? -7 : 7;
  return `M ${from[0]} ${from[1]} Q ${mx} ${my + bend} ${to[0]} ${to[1] + 8}`;
}

function StructureIcon({ type, tone, category }: { type: string; tone: string; category: string }) {
  if (type === 'farm') {
    return (
      <g>
        <path d="M -13 6 L 12 6 L 8 -8 L -10 -7 Z" fill="#24351E" stroke={tone} strokeWidth="1.2" />
        <path d="M -10 3 L 7 -6 M -5 6 L 10 -2 M 0 6 L 11 3" stroke="#B8FF9A" strokeWidth="0.8" opacity="0.75" />
        <rect x="-4" y="-2" width="8" height="7" fill="#6B1E1E" stroke="#FFF4C2" strokeWidth="0.7" />
      </g>
    );
  }

  if (type === 'housing' || type === 'hospital' || type === 'school' || category === 'population' || category === 'education') {
    return (
      <g>
        <rect x="-12" y="-8" width="7" height="15" fill="#171B24" stroke={tone} strokeWidth="1" />
        <rect x="-3" y="-13" width="8" height="20" fill="#1E2430" stroke={tone} strokeWidth="1" />
        <rect x="7" y="-6" width="7" height="13" fill="#171B24" stroke={tone} strokeWidth="1" />
        <path d="M -10 -4 L -7 -4 M -10 0 L -7 0 M -1 -8 L 3 -8 M -1 -3 L 3 -3 M 9 -1 L 12 -1" stroke="#FFF4C2" strokeWidth="0.7" />
      </g>
    );
  }

  if (type === 'coal' || type === 'nuclear' || type === 'solar' || category === 'energy') {
    return (
      <g>
        <path d="M -13 6 L 13 6 L 9 -7 L -9 -7 Z" fill="#151A1F" stroke={tone} strokeWidth="1.1" />
        {type === 'solar' ? (
          <>
            <rect x="-9" y="-5" width="7" height="6" fill="#123B4A" stroke="#00F0FF" strokeWidth="0.7" />
            <rect x="1" y="-5" width="7" height="6" fill="#123B4A" stroke="#00F0FF" strokeWidth="0.7" />
          </>
        ) : (
          <>
            <path d="M -7 -7 L -5 -16 L -1 -16 L 0 -7" fill="#2C3038" stroke="#B8BBC8" strokeWidth="0.7" />
            <path d="M 5 -7 L 6 -18 L 10 -18 L 11 -7" fill="#2C3038" stroke="#B8BBC8" strokeWidth="0.7" />
            <circle cx="-3" cy="-20" r="2.5" fill="#C7CEDA" opacity="0.55">
              <animate attributeName="cy" values="-17;-27;-17" dur="2.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0;0.55" dur="2.8s" repeatCount="indefinite" />
            </circle>
          </>
        )}
        <path d="M 12 -9 L 19 -9 M 16 -13 L 16 3 M 12 2 L 20 -14" stroke={tone} strokeWidth="0.9" opacity="0.8" />
        <path d="M 19 -9 C 25 -7 28 -2 33 1" stroke={tone} strokeWidth="0.7" strokeDasharray="2 2" opacity="0.8" />
      </g>
    );
  }

  if (type === 'datacenter' || type === 'gpucluster' || type === 'aifactory' || category === 'compute') {
    return (
      <g>
        <rect x="-14" y="-11" width="28" height="18" rx="1.5" fill="#101A24" stroke={tone} strokeWidth="1.2" />
        <path d="M -10 -6 L 10 -6 M -10 -1 L 10 -1 M -10 4 L 10 4" stroke={tone} strokeWidth="0.8" opacity="0.7" />
        <circle cx="-9" cy="-6" r="1" fill="#33FF33">
          <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <circle cx="-9" cy="-1" r="1" fill="#00F0FF">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" />
        </circle>
        {type === 'aifactory' && <path d="M 0 -17 L 8 -10 L 0 -13 L -8 -10 Z" fill="#FFD700" stroke="#FFF4C2" strokeWidth="0.6" />}
      </g>
    );
  }

  if (type === 'factory' || type === 'chipfab' || category === 'production' || category === 'economy') {
    return (
      <g>
        <path d="M -14 7 L 14 7 L 14 -5 L 6 -1 L 6 -6 L -2 -1 L -2 -6 L -14 0 Z" fill="#20242D" stroke={tone} strokeWidth="1.2" />
        <path d="M -10 -1 L -9 -14 L -5 -14 L -4 1" fill="#343944" stroke="#C7CEDA" strokeWidth="0.7" />
        <circle cx="-7" cy="-18" r="2.4" fill="#C7CEDA" opacity="0.5">
          <animate attributeName="cy" values="-15;-28;-15" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.55;0;0.55" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <path d="M -9 2 L -5 2 M 1 2 L 5 2 M 8 2 L 12 2" stroke="#FFF4C2" strokeWidth="0.8" />
      </g>
    );
  }

  if (type === 'defense') {
    return (
      <g>
        <path d="M 0 -15 L 13 -8 L 9 8 L 0 14 L -9 8 L -13 -8 Z" fill="#21141C" stroke={tone} strokeWidth="1.3" />
        <path d="M -5 -2 L 0 4 L 7 -6" stroke="#FFF4C2" strokeWidth="1.3" fill="none" />
      </g>
    );
  }

  return (
    <g>
      <rect x="-12" y="-10" width="24" height="17" fill="#161B24" stroke={tone} strokeWidth="1.2" />
      <path d="M -7 2 L 0 -7 L 8 2 Z" fill={tone} opacity="0.8" />
    </g>
  );
}

export default function ContinentCommandMap({ onExit }: ContinentCommandMapProps) {
  const { state, dispatch } = useGame();
  const continentId = state.playerContinent || 'na';
  const continent = continents.find(c => c.id === continentId);
  const ownTerritories = territories.filter(t => t.continent === continentId);
  const bounds = getBounds(continentId);
  const placed = state.buildingIcons.filter(icon => territoryContinents[icon.territory] === continentId);
  const factionCard = factionCardMap[continentId];
  const factionColor = continent?.color || '#00F0FF';

  const handleTerritoryClick = (territoryId: string) => {
    play('click', 0.65);
    dispatch({ type: 'SELECT_TERRITORY', territory: territoryId });
  };

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#07070A' }}>
      {factionCard && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${factionCard})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'grayscale(1) contrast(1.25) brightness(0.42)',
            opacity: 0.36,
            transform: 'scale(1.08)',
          }}
        />
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            `linear-gradient(135deg, ${factionColor}22, transparent 34%), radial-gradient(circle at 62% 42%, ${factionColor}26, transparent 34%), linear-gradient(180deg, rgba(5,5,8,0.26), rgba(5,5,8,0.88))`,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            `repeating-linear-gradient(0deg, transparent, transparent 31px, ${factionColor}14 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, rgba(255,244,194,0.055) 32px)`,
          mixBlendMode: 'screen',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          width: 'min(72vw, 72vh)',
          height: 'min(72vw, 72vh)',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: `1px solid ${factionColor}55`,
          boxShadow: `0 0 34px ${factionColor}22, inset 0 0 46px rgba(0,0,0,0.45)`,
          background: `repeating-radial-gradient(circle, transparent 0 11%, ${factionColor}12 11.4%, transparent 12.2%), conic-gradient(from 220deg, transparent 0deg, ${factionColor}4D 18deg, transparent 42deg, transparent 360deg)`,
          opacity: 0.78,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          width: 'min(84vw, 84vh)',
          height: 'min(84vw, 84vh)',
          transform: 'translate(-50%, -50%) rotate(-18deg)',
          borderRadius: '50%',
          background: `conic-gradient(from 0deg, transparent 0deg, transparent 312deg, ${factionColor}66 334deg, transparent 354deg)`,
          mixBlendMode: 'screen',
          opacity: 0.55,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.42), transparent 18%, transparent 82%, rgba(0,0,0,0.48)), repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 4px)',
          mixBlendMode: 'overlay',
        }}
      />

      <svg className="absolute inset-0 w-full h-full" viewBox={bounds.viewBox} preserveAspectRatio="xMidYMid slice">
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
            <stop offset="100%" stopColor="#161821" stopOpacity="0.74" />
          </linearGradient>
          <filter id="living-map-glow">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          fill="rgba(5,5,8,0.32)"
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
          const hub = getRoadHub(icon.territory);
          const roadPath = makeRoadPath(hub, [icon.x, icon.y], i);
          const roadId = `road-${icon.territory}-${i}`;
          const category = getCategory(icon.type);
          const isPower = category === 'energy' || icon.type === 'datacenter' || icon.type === 'gpucluster' || icon.type === 'aifactory';
          return (
            <g key={`${roadId}-group`}>
              <path
                id={roadId}
                d={roadPath}
                fill="none"
                stroke="#090A0D"
                strokeWidth="5.4"
                strokeLinecap="round"
                opacity="0.62"
              />
              <path
                d={roadPath}
                fill="none"
                stroke={isPower ? '#00F0FF' : '#C4A265'}
                strokeWidth={isPower ? 1.25 : 1}
                strokeDasharray={isPower ? '3 3' : '2 5'}
                strokeLinecap="round"
                opacity={isPower ? 0.72 : 0.42}
                filter={isPower ? 'url(#living-map-glow)' : undefined}
              />
              <rect width="5.5" height="3.2" rx="0.6" fill={isPower ? '#00F0FF' : '#FFB84D'} stroke="#050508" strokeWidth="0.6" opacity="0.95">
                <animateMotion dur={`${5.5 + (i % 5)}s`} repeatCount="indefinite" begin={`${(i % 4) * 0.65}s`}>
                  <mpath href={`#${roadId}`} />
                </animateMotion>
              </rect>
            </g>
          );
        })}

        {placed.map((icon, i) => {
          const category = getCategory(icon.type);
          const tone = buildingTone[category] || '#00F0FF';
          const scale = category === 'compute' || icon.type === 'aifactory' ? 1.15 : 1;
          return (
            <g
              key={`${icon.type}-${icon.territory}-${i}`}
              transform={`translate(${icon.x} ${icon.y}) scale(${scale})`}
              filter={`drop-shadow(0 0 4px ${tone}AA)`}
            >
              <ellipse cx="0" cy="10" rx="15" ry="4" fill="#050508" opacity="0.55" />
              <StructureIcon type={icon.type} tone={tone} category={category} />
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
