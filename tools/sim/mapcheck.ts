import { generateContinentMap } from '../../src/game/mapgen.ts';
const ch: Record<string,string> = { water:'.', plains:'p', fertile:'f', forest:'F', hills:'h', desert:'d', tundra:'t' };
for (const id of ['na','eu','su','cn','af','sa','in','oc']) {
  const m = generateContinentMap(id, 1234);
  const land = m.tiles.filter(t=>t.terrain!=='water');
  const counts: Record<string,number> = {};
  land.forEach(t=>counts[t.terrain]=(counts[t.terrain]||0)+1);
  console.log(id, m.cols+'x'+m.rows, 'land', land.length, JSON.stringify(counts), 'deposits', land.filter(t=>t.deposit).length, 'regions', m.regions.map(r=>r.id.split('_').slice(1).join('_')+':'+r.tiles.length).join(' '));
  if (id==='eu'||id==='in') for (let r=0;r<m.rows;r++){ let s=r%2?' ':''; for(let c=0;c<m.cols;c++){const t=m.tiles[r*m.cols+c]; s+= (t.deposit? t.deposit[0].toUpperCase(): ch[t.terrain])+' ';} console.log(s);}
}
