import { useGame, continents } from '../../App';

interface MiniTerr {
  id: string;
  name: string;
  continent: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const miniTerritories: MiniTerr[] = [
  {id:'na_alaska',name:'AK',continent:'na',x:10,y:8,w:18,h:10},
  {id:'na_nwt',name:'NW',continent:'na',x:28,y:6,w:20,h:8},
  {id:'na_greenland',name:'GL',continent:'na',x:50,y:2,w:22,h:10},
  {id:'na_alberta',name:'AB',continent:'na',x:15,y:18,w:16,h:10},
  {id:'na_ontario',name:'ON',continent:'na',x:33,y:16,w:18,h:10},
  {id:'na_quebec',name:'QB',continent:'na',x:52,y:14,w:16,h:10},
  {id:'na_western_us',name:'WUS',continent:'na',x:12,y:30,w:20,h:12},
  {id:'na_eastern_us',name:'EUS',continent:'na',x:35,y:28,w:22,h:12},
  {id:'na_central_america',name:'CAM',continent:'na',x:15,y:44,w:18,h:8},
  {id:'sa_venezuela',name:'VN',continent:'sa',x:38,y:52,w:14,h:8},
  {id:'sa_brazil',name:'BR',continent:'sa',x:42,y:62,w:22,h:16},
  {id:'sa_peru',name:'PE',continent:'sa',x:28,y:64,w:14,h:12},
  {id:'sa_argentina',name:'AR',continent:'sa',x:36,y:80,w:16,h:16},
  {id:'eu_iceland',name:'IS',continent:'eu',x:80,y:6,w:10,h:6},
  {id:'eu_great_britain',name:'GB',continent:'eu',x:82,y:18,w:12,h:10},
  {id:'eu_scandinavia',name:'SC',continent:'eu',x:94,y:8,w:16,h:8},
  {id:'eu_northern_eu',name:'NE',continent:'eu',x:92,y:22,w:14,h:10},
  {id:'eu_ukraine',name:'UA',continent:'eu',x:108,y:16,w:18,h:10},
  {id:'eu_southern_eu',name:'SE',continent:'eu',x:96,y:34,w:16,h:10},
  {id:'eu_western_eu',name:'WE',continent:'eu',x:82,y:32,w:14,h:10},
  {id:'af_north',name:'NAF',continent:'af',x:82,y:48,w:22,h:12},
  {id:'af_egypt',name:'EG',continent:'af',x:106,y:46,w:14,h:10},
  {id:'af_east',name:'EAF',continent:'af',x:114,y:60,w:16,h:14},
  {id:'af_congo',name:'CG',continent:'af',x:92,y:62,w:18,h:14},
  {id:'af_south',name:'SAF',continent:'af',x:96,y:80,w:16,h:14},
  {id:'af_madagascar',name:'MG',continent:'af',x:116,y:82,w:10,h:10},
  {id:'as_ural',name:'UR',continent:'su',x:130,y:10,w:14,h:10},
  {id:'as_siberia',name:'SB',continent:'su',x:144,y:6,w:20,h:10},
  {id:'as_yakutsk',name:'YK',continent:'su',x:164,y:2,w:20,h:8},
  {id:'as_kamchatka',name:'KM',continent:'su',x:186,y:2,w:18,h:10},
  {id:'as_irkutsk',name:'IR',continent:'su',x:148,y:18,w:16,h:10},
  {id:'as_mongolia',name:'MN',continent:'cn',x:160,y:26,w:14,h:10},
  {id:'as_japan',name:'JP',continent:'cn',x:188,y:24,w:12,h:10},
  {id:'as_afghanistan',name:'AF',continent:'su',x:130,y:30,w:16,h:10},
  {id:'as_china',name:'CN',continent:'cn',x:150,y:36,w:24,h:14},
  {id:'as_middle_east',name:'ME',continent:'su',x:116,y:42,w:18,h:10},
  {id:'as_india',name:'IN',continent:'in',x:138,y:50,w:16,h:16},
  {id:'as_siam',name:'SI',continent:'cn',x:158,y:54,w:14,h:10},
  {id:'au_indonesia',name:'ID',continent:'oc',x:156,y:74,w:20,h:6},
  {id:'au_new_guinea',name:'NG',continent:'oc',x:184,y:68,w:14,h:8},
  {id:'au_western',name:'WAU',continent:'oc',x:170,y:82,w:18,h:14},
  {id:'au_eastern',name:'EAU',continent:'oc',x:190,y:78,w:14,h:14},
];

export default function Minimap() {
  const { state } = useGame();

  const getMiniColor = (mt: MiniTerr) => {
    const cont = continents.find(c => c.id === mt.continent);
    if (!cont) return '#555';
    if (mt.continent === state.playerContinent) return cont.color;
    return cont.color + '88';
  };

  const getMiniStroke = (mt: MiniTerr) => {
    if (mt.continent === state.playerContinent) return contColor(mt.continent);
    return '#1E2028';
  };

  return (
    <div className="panel p-2" style={{width:'240px',height:'140px',flexShrink:0}}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-orbitron text-[8px]" style={{color:'var(--text-tertiary)'}}>MINIMAP</span>
        <span className="font-mono-data text-[7px]" style={{color:'var(--text-tertiary)'}}>
          {state.totalBuildings} buildings
        </span>
      </div>
      <svg viewBox="0 0 210 100" className="w-full h-full" style={{maxHeight:'110px'}}>
        {miniTerritories.map(mt => (
          <g key={mt.id}>
            <rect
              x={mt.x} y={mt.y} width={mt.w} height={mt.h}
              rx="1"
              fill={getMiniColor(mt)}
              stroke={getMiniStroke(mt)}
              strokeWidth={mt.continent === state.playerContinent ? 1.5 : 0.5}
              opacity={mt.continent === state.playerContinent ? 1 : 0.7}
            />
            <text
              x={mt.x + mt.w / 2}
              y={mt.y + mt.h / 2}
              fill="rgba(0,0,0,0.6)"
              fontSize="3.5"
              fontFamily="Rajdhani"
              fontWeight="600"
              textAnchor="middle"
              dominantBaseline="middle"
              pointerEvents="none"
            >
              {mt.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function contColor(continentId: string): string {
  const c = continents.find(x => x.id === continentId);
  return c ? c.color : '#555';
}
