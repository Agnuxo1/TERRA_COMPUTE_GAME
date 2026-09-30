// Territory polygons of the world map (SVG space 0..800 x 0..450).
// Shared by the world views and by the continent tile generator.

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

export function territoriesOf(continentId: string): Territory[] {
  return territories.filter(t => t.continent === continentId);
}

export function parsePolygon(path: string): Array<[number, number]> {
  const nums = (path.match(/[-+]?[0-9]*\.?[0-9]+/g) || []).map(Number);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
}

export function pointInPolygon(x: number, y: number, poly: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Anchor points of each territory on the world globe view (760x450 space).
export const territoryPositions: Record<string, {x: number; y: number}> = {
  'na_alaska': {x:75,y:72}, 'na_nwt': {x:137,y:69}, 'na_greenland': {x:240,y:47},
  'na_alberta': {x:125,y:112}, 'na_ontario': {x:192,y:103}, 'na_quebec': {x:248,y:114},
  'na_western_us': {x:127,y:150}, 'na_eastern_us': {x:197,y:155}, 'na_central_america': {x:127,y:195},
  'sa_venezuela': {x:220,y:240}, 'sa_brazil': {x:240,y:290}, 'sa_peru': {x:195,y:285}, 'sa_argentina': {x:225,y:360},
  'eu_iceland': {x:340,y:55}, 'eu_great_britain': {x:360,y:95}, 'eu_scandinavia': {x:410,y:60},
  'eu_northern_eu': {x:400,y:100}, 'eu_ukraine': {x:455,y:95}, 'eu_southern_eu': {x:420,y:135}, 'eu_western_eu': {x:370,y:125},
  'af_north': {x:380,y:200}, 'af_egypt': {x:430,y:185}, 'af_east': {x:470,y:250},
  'af_congo': {x:420,y:275}, 'af_south': {x:430,y:370}, 'af_madagascar': {x:490,y:370},
  'as_ural': {x:510,y:65}, 'as_siberia': {x:580,y:55}, 'as_yakutsk': {x:660,y:45},
  'as_kamchatka': {x:780,y:55}, 'as_irkutsk': {x:620,y:90}, 'as_mongolia': {x:650,y:120},
  'as_japan': {x:780,y:130}, 'as_afghanistan': {x:540,y:145}, 'as_china': {x:660,y:160},
  'as_middle_east': {x:490,y:180}, 'as_india': {x:600,y:210}, 'as_siam': {x:680,y:230},
  'au_indonesia': {x:720,y:320}, 'au_new_guinea': {x:780,y:280}, 'au_western': {x:750,y:380}, 'au_eastern': {x:800,y:360},
};

export function regionAnchor(regionId: string): { x: number; y: number } {
  if (territoryPositions[regionId]) return territoryPositions[regionId];
  const india: Record<string, [number, number]> = { in_n: [-8, -22], in_e: [10, -10], in_w: [-12, -6], in_c: [0, 6], in_s: [2, 24] };
  const off = india[regionId];
  if (off) return { x: territoryPositions.as_india.x + off[0], y: territoryPositions.as_india.y + off[1] };
  return { x: 380, y: 225 };
}
