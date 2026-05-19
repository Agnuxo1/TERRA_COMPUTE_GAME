import { useGame, continents } from '../../App';
import { useMemo } from 'react';
import { play } from '../../hooks/useSound';

export interface Territory {
  id: string;
  name: string;
  continent: string;
  path: string;
}

export const territories: Territory[] = [
  /* North America (9) */
  {id:'na_alaska', name:'Alaska', continent:'na', path:'M 40 55 L 95 48 L 115 75 L 85 95 L 35 85 Z'},
  {id:'na_nwt', name:'N.W. Territory', continent:'na', path:'M 95 48 L 160 42 L 180 70 L 165 95 L 115 75 Z'},
  {id:'na_greenland', name:'Greenland', continent:'na', path:'M 200 20 L 260 15 L 280 55 L 250 80 L 210 65 L 195 40 Z'},
  {id:'na_alberta', name:'Alberta', continent:'na', path:'M 85 95 L 115 75 L 165 95 L 160 130 L 95 125 Z'},
  {id:'na_ontario', name:'Ontario', continent:'na', path:'M 165 95 L 180 70 L 210 65 L 230 95 L 215 130 L 160 130 Z'},
  {id:'na_quebec', name:'Quebec', continent:'na', path:'M 230 95 L 250 80 L 280 90 L 270 130 L 240 140 L 215 130 Z'},
  {id:'na_western_us', name:'Western US', continent:'na', path:'M 95 125 L 160 130 L 155 175 L 100 170 L 85 150 Z'},
  {id:'na_eastern_us', name:'Eastern US', continent:'na', path:'M 160 130 L 215 130 L 240 140 L 225 180 L 180 175 L 155 175 Z'},
  {id:'na_central_america', name:'Central America', continent:'na', path:'M 100 170 L 155 175 L 145 210 L 110 220 L 95 195 Z'},
  /* South America (4) */
  {id:'sa_venezuela', name:'Venezuela', continent:'sa', path:'M 195 225 L 230 220 L 245 235 L 225 255 L 195 248 L 185 238 Z'},
  {id:'sa_brazil', name:'Brazil', continent:'sa', path:'M 225 255 L 245 235 L 275 245 L 285 280 L 265 315 L 235 310 L 220 280 Z'},
  {id:'sa_peru', name:'Peru', continent:'sa', path:'M 195 248 L 225 255 L 220 280 L 210 310 L 190 300 L 185 270 Z'},
  {id:'sa_argentina', name:'Argentina', continent:'sa', path:'M 210 310 L 235 310 L 245 340 L 235 390 L 220 410 L 210 380 L 200 340 Z'},
  /* Europe (8) */
  {id:'eu_iceland', name:'Iceland', continent:'eu', path:'M 330 75 L 355 70 L 365 90 L 350 100 L 335 95 Z'},
  {id:'eu_great_britain', name:'Great Britain', continent:'eu', path:'M 340 110 L 360 105 L 365 125 L 358 145 L 345 140 L 335 125 Z'},
  {id:'eu_scandinavia', name:'Scandinavia', continent:'eu', path:'M 380 55 L 410 45 L 425 65 L 420 90 L 400 95 L 385 80 Z'},
  {id:'eu_northern_eu', name:'Northern Europe', continent:'eu', path:'M 375 105 L 400 95 L 420 100 L 415 125 L 390 130 L 372 120 Z'},
  {id:'eu_southern_eu', name:'Southern Europe', continent:'eu', path:'M 390 130 L 415 125 L 425 140 L 420 160 L 400 165 L 385 150 Z'},
  {id:'eu_western_eu', name:'Western Europe', continent:'eu', path:'M 355 125 L 372 120 L 390 130 L 385 150 L 365 155 L 350 145 Z'},
  {id:'eu_ukraine', name:'Ukraine', continent:'eu', path:'M 420 90 L 450 80 L 480 95 L 485 120 L 460 135 L 440 130 L 425 140 L 415 125 L 420 100 Z'},
  /* Africa (6) */
  {id:'af_north', name:'North Africa', continent:'af', path:'M 365 155 L 385 150 L 400 165 L 420 160 L 435 180 L 425 215 L 390 220 L 360 205 L 350 180 Z'},
  {id:'af_egypt', name:'Egypt', continent:'af', path:'M 435 180 L 460 175 L 470 195 L 455 210 L 435 205 L 425 215 Z'},
  {id:'af_east', name:'East Africa', continent:'af', path:'M 435 205 L 455 210 L 470 195 L 480 220 L 475 255 L 450 265 L 435 245 L 425 215 Z'},
  {id:'af_congo', name:'Congo', continent:'af', path:'M 390 220 L 425 215 L 435 245 L 420 265 L 395 270 L 385 250 Z'},
  {id:'af_south', name:'South Africa', continent:'af', path:'M 395 270 L 420 265 L 440 275 L 445 305 L 425 330 L 400 320 L 390 295 Z'},
  {id:'af_madagascar', name:'Madagascar', continent:'af', path:'M 480 285 L 495 280 L 500 310 L 490 330 L 478 320 L 475 300 Z'},
  /* Asia (12) */
  {id:'as_ural', name:'Ural', continent:'su', path:'M 480 95 L 520 85 L 530 110 L 525 140 L 500 145 L 485 120 Z'},
  {id:'as_siberia', name:'Siberia', continent:'su', path:'M 520 85 L 580 60 L 600 80 L 590 110 L 565 120 L 540 115 L 530 110 Z'},
  {id:'as_yakutsk', name:'Yakutsk', continent:'su', path:'M 580 60 L 640 45 L 660 60 L 650 85 L 620 90 L 600 80 Z'},
  {id:'as_kamchatka', name:'Kamchatka', continent:'su', path:'M 640 45 L 700 35 L 720 50 L 710 75 L 680 80 L 660 60 L 650 85 L 620 90 Z'},
  {id:'as_irkutsk', name:'Irkutsk', continent:'su', path:'M 540 115 L 565 120 L 590 110 L 600 130 L 580 150 L 550 145 L 535 135 Z'},
  {id:'as_mongolia', name:'Mongolia', continent:'cn', path:'M 550 145 L 580 150 L 590 140 L 620 145 L 615 165 L 585 170 L 555 160 Z'},
  {id:'as_japan', name:'Japan', continent:'cn', path:'M 660 145 L 680 140 L 685 160 L 678 175 L 665 170 L 658 158 Z'},
  {id:'as_afghanistan', name:'Afghanistan', continent:'su', path:'M 485 120 L 500 145 L 525 140 L 535 160 L 515 175 L 490 165 L 478 150 Z'},
  {id:'as_china', name:'China', continent:'cn', path:'M 525 140 L 535 135 L 550 145 L 555 160 L 585 170 L 590 190 L 565 200 L 540 195 L 525 180 L 515 175 L 535 160 Z'},
  {id:'as_middle_east', name:'Middle East', continent:'su', path:'M 460 135 L 485 120 L 478 150 L 490 165 L 480 185 L 460 180 L 450 160 Z'},
  {id:'as_india', name:'India', continent:'in', path:'M 515 175 L 525 180 L 540 195 L 555 200 L 550 240 L 535 255 L 520 240 L 510 210 L 505 190 Z'},
  {id:'as_siam', name:'Siam', continent:'cn', path:'M 555 200 L 590 190 L 600 210 L 590 240 L 570 250 L 555 240 Z'},
  /* Australia (4) */
  {id:'au_indonesia', name:'Indonesia', continent:'oc', path:'M 560 285 L 590 280 L 610 290 L 600 300 L 570 300 L 555 295 Z'},
  {id:'au_new_guinea', name:'New Guinea', continent:'oc', path:'M 640 270 L 680 265 L 685 285 L 670 295 L 645 290 Z'},
  {id:'au_western', name:'W. Australia', continent:'oc', path:'M 600 310 L 640 305 L 650 335 L 640 370 L 615 375 L 605 350 L 598 325 Z'},
  {id:'au_eastern', name:'E. Australia', continent:'oc', path:'M 640 305 L 680 300 L 690 330 L 685 360 L 660 375 L 650 370 L 640 370 L 650 335 Z'},
];

const connections: [string, string, number, number, number, number][] = [
  ['na_alaska', 'as_kamchatka', 95, 55, 660, 55],
];

const buildingColors: Record<string, string> = {
  lab: '#00F0FF', uni: '#7B61FF', mainframe: '#00E5A0',
  super: '#FFB84D', datacenter: '#3B82F6', gpucluster: '#FF477E',
  aifactory: '#FFD700', chipfab: '#8A8D9A', coal: '#5A5D6A',
  nuclear: '#00E5A0', solar: '#FFB84D', defense: '#EF4444',
  housing: '#22C55E', farm: '#86EFAC', hospital: '#F472B6',
  factory: '#94A3B8', market: '#FBBF24', seaport: '#0EA5E9',
  school: '#A78BFA',
};

export default function RiskMap() {
  const { state, dispatch } = useGame();

  const playerContinentData = useMemo(
    () => continents.find(c => c.id === state.playerContinent),
    [state.playerContinent]
  );

  const handleTerritoryClick = (territory: Territory) => {
    play('click', 0.8);
    dispatch({ type: 'SELECT_TERRITORY', territory: territory.id });
  };

  const getTerritoryColor = (t: Territory) => {
    const cont = continents.find(c => c.id === t.continent);
    if (!cont) return '#555';
    if (t.continent === state.playerContinent) return cont.color;
    return cont.color + '88';
  };

  const getTerritoryStroke = (t: Territory) => {
    if (state.selectedTerritory && state.selectedTerritory === t.id) return '#FFB84D';
    if (t.continent === state.playerContinent) return contColor(t.continent);
    return '#1E2028';
  };

  const getTerritoryStrokeWidth = (t: Territory) => {
    if (state.selectedTerritory === t.id) return 3;
    if (t.continent === state.playerContinent) return 2.5;
    return 1;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{background:'var(--void)'}}>
      {/* Background grid */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" style={{opacity:0.05}}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00F0FF" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>

      {/* Main Map */}
      <svg viewBox="0 0 760 450" className="w-full h-full" style={{maxWidth:'100%',maxHeight:'100%'}} preserveAspectRatio="xMidYMid meet">
        <rect width="760" height="450" fill="#0A0A0F" rx="4"/>

        {/* Continent labels */}
        <text x="155" y="165" fill="#1E2028" fontSize="22" fontFamily="Orbitron" fontWeight="900" textAnchor="middle" opacity="0.5">N. AMERICA</text>
        <text x="240" y="300" fill="#1E2028" fontSize="18" fontFamily="Orbitron" fontWeight="900" textAnchor="middle" opacity="0.5">S. AMERICA</text>
        <text x="410" y="115" fill="#1E2028" fontSize="16" fontFamily="Orbitron" fontWeight="900" textAnchor="middle" opacity="0.5">EUROPE</text>
        <text x="420" y="260" fill="#1E2028" fontSize="18" fontFamily="Orbitron" fontWeight="900" textAnchor="middle" opacity="0.5">AFRICA</text>
        <text x="580" y="165" fill="#1E2028" fontSize="18" fontFamily="Orbitron" fontWeight="900" textAnchor="middle" opacity="0.5">ASIA</text>
        <text x="640" y="345" fill="#1E2028" fontSize="14" fontFamily="Orbitron" fontWeight="900" textAnchor="middle" opacity="0.5">AUSTRALIA</text>

        {/* Connection lines */}
        {connections.map(([from, to, x1, y1, x2, y2]) => (
          <line key={`conn-${from}-${to}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#2A2D38" strokeWidth="1" strokeDasharray="4 4" opacity="0.5"/>
        ))}

        {/* Territories */}
        {territories.map(t => (
          <g key={t.id}>
            <path
              d={t.path}
              fill={getTerritoryColor(t)}
              stroke={getTerritoryStroke(t)}
              strokeWidth={getTerritoryStrokeWidth(t)}
              className="territory"
              onClick={() => handleTerritoryClick(t)}
              style={{
                filter: state.selectedTerritory === t.id
                  ? 'drop-shadow(0 0 6px #FFB84D)'
                  : t.continent === state.playerContinent
                    ? 'drop-shadow(0 0 4px ' + contColor(t.continent) + ')'
                    : 'none',
              }}
            />
            <text
              x={getCentroid(t.path)[0]}
              y={getCentroid(t.path)[1]}
              fill="rgba(0,0,0,0.7)"
              fontSize="6"
              fontFamily="Rajdhani"
              fontWeight="600"
              textAnchor="middle"
              dominantBaseline="middle"
              pointerEvents="none"
              style={{userSelect:'none'}}
            >
              {t.name}
            </text>
          </g>
        ))}

        {/* Building icons on territories */}
        {state.buildingIcons.map((icon, i) => {
          const color = buildingColors[icon.type] || '#00F0FF';
          return (
            <g key={`bi-${i}`} className="building-icon-map">
              <circle cx={icon.x} cy={icon.y} r="5" fill={color} opacity="0.9"
                stroke="#0A0A0F" strokeWidth="1"/>
              <text x={icon.x} y={icon.y + 1} fill="#0A0A0F" fontSize="5"
                textAnchor="middle" dominantBaseline="middle"
                pointerEvents="none" style={{userSelect:'none'}}>
                {icon.type === 'lab' ? 'R' : icon.type === 'uni' ? 'U' : icon.type === 'mainframe' ? 'M' :
                 icon.type === 'super' ? 'S' : icon.type === 'datacenter' ? 'D' : icon.type === 'gpucluster' ? 'G' :
                 icon.type === 'aifactory' ? 'A' : icon.type === 'chipfab' ? 'C' : icon.type === 'coal' ? 'E' :
                 icon.type === 'nuclear' ? 'N' : icon.type === 'solar' ? 'L' : icon.type === 'housing' ? 'H' :
                 icon.type === 'farm' ? 'F' : icon.type === 'hospital' ? '+' : icon.type === 'factory' ? 'I' :
                 icon.type === 'market' ? '$' : icon.type === 'seaport' ? 'P' : icon.type === 'school' ? 'E' :
                 icon.type === 'defense' ? 'X' : '?'}
              </text>
            </g>
          );
        })}

        {/* AI activity dots on opponent territories */}
        {state.opponents.map(opp => {
          const oppTerrs = territories.filter(t => t.continent === opp.continentId);
          return oppTerrs.slice(0, 3).map((t, i) => {
            const [cx, cy] = getCentroid(t.path);
            return (
              <circle key={`ai-${opp.continentId}-${i}`}
                cx={cx + 8} cy={cy - 8} r="3" fill={contColor(opp.continentId)}
                className="ai-activity" opacity="0.6"/>
            );
          });
        })}

        <circle cx="95" cy="55" r="3" fill="#2A2D38" opacity="0.5"/>
        <circle cx="660" cy="55" r="3" fill="#2A2D38" opacity="0.5"/>
      </svg>

      {/* Legend */}
      <div className="absolute top-2 right-2 panel px-3 py-2 flex flex-col gap-1" style={{zIndex:10}}>
        <div className="font-mono-data text-[9px] uppercase tracking-wider mb-1" style={{color:'var(--text-tertiary)'}}>
          Continents
        </div>
        {continents.map(c => (
          <div key={c.id} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => { play('click', 0.5); }}>
            <div className="w-2.5 h-2.5 rounded-sm" style={{background:c.color}}/>
            <span className="text-[10px] font-rajdhani font-medium"
              style={{color: c.id === state.playerContinent ? c.color : 'var(--text-secondary)'}}>
              {c.name}
            </span>
          </div>
        ))}
        <div className="mt-1 pt-1" style={{borderTop:'1px solid var(--border)'}}>
          <div className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>
            Buildings: {state.totalBuildings}
          </div>
        </div>
      </div>
    </div>
  );
}

export function contColor(continentId: string): string {
  const c = continents.find(x => x.id === continentId);
  return c ? c.color : '#555';
}

export function getCentroid(pathData: string): [number, number] {
  const numbers: number[] = [];
  const regex = /[-+]?[0-9]*\.?[0-9]+/g;
  let match;
  while ((match = regex.exec(pathData)) !== null) {
    numbers.push(parseFloat(match[0]));
  }
  let xSum = 0, ySum = 0, count = 0;
  for (let i = 0; i < numbers.length; i += 2) {
    xSum += numbers[i];
    ySum += numbers[i + 1] || 0;
    count++;
  }
  return count > 0 ? [xSum / count, ySum / count] : [0, 0];
}
