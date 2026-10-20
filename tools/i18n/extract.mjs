// Builds src/i18n/locales/en.json — the master list of every translatable string — and reports coverage.
//   node tools/i18n/extract.mjs            → writes en.json, prints counts and missing keys per locale
//   node tools/i18n/extract.mjs --check    → exit 1 if any locale misses keys or breaks {placeholders}
// Sources: (1) every literal t('…') / t("…") / t(`…` without ${}) in src/, (2) the text fields of the data tables.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'src');
const OUT = join(SRC, 'i18n', 'locales');
const keys = new Map();   // key -> first source
const dynamic = [];       // t(`...${x}...`) misuse

function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (!['locales', 'ui'].includes(f)) walk(p); continue; }
    if (!/\.(tsx?|mjs)$/.test(f)) continue;
    const text = readFileSync(p, 'utf8');
    const re = /\bt\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
    let m;
    while ((m = re.exec(text))) {
      const [, q, body] = m;
      if (q === '`' && body.includes('${')) { dynamic.push(`${relative(ROOT, p)}: ${body.slice(0, 60)}`); continue; }
      const key = body.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
      if (key.trim() && !keys.has(key)) keys.set(key, relative(ROOT, p));
    }
  }
}
walk(SRC);

// Text values inside component/engine tables that are rendered through t(variable):
// `label: 'Counter-intelligence sweep'`, `aggressive: 'Aggressive racer — …'`. Only values that look like prose.
const TABLE_DIRS = ['components/game', 'components/meta', 'components/minigames', 'pages', 'game', 'net'];
const SKIP_FILES = /attention\.ts$|Methodology|Home\.tsx|mapgen\.ts|rng\.ts|types\.ts|bot\.ts/;
function walkTables(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { walkTables(p); continue; }
    if (!/\.(tsx?)$/.test(f) || SKIP_FILES.test(p)) continue;
    const text = readFileSync(p, 'utf8');
    const re = /\b(\w+)\s*:\s*'((?:\\.|[^'\\])*)'/g;
    let m;
    while ((m = re.exec(text))) {
      const [, prop, raw] = m;
      const v = raw.replace(/\\(['\\])/g, '$1');
      const capsLabel = (prop === 'label' || prop === 'title') && /^[A-Z][A-Z .&-]{2,}$/.test(v);
      if (!capsLabel && (!/^[A-Z¡¿«"'(\u2190-\u2BFF\u{1F300}-\u{1FAFF}]/u.test(v) || !/[a-z]{2}/.test(v) || v.length < 3)) continue;
      if (/^(https?:|\.\/|#|rgba?\(|var\()/.test(v) || /\$\{/.test(v)) continue;
      if (['id', 'effect', 'type', 'kind', 'icon', 'color', 'accent', 'background', 'card', 'eventId', 'requires', 'key', 'sprite', 'overlay', 'iconImg', 'url', 'path', 'font', 'fontFamily'].includes(prop)) continue;
      if (!keys.has(v)) keys.set(v, relative(ROOT, p));
    }
  }
}
for (const d of TABLE_DIRS) walkTables(join(SRC, d));

// Data tables: collect the human-readable fields.
const FIELDS = new Set(['name', 'short', 'description', 'text', 'hint', 'label', 'detail', 'title', 'subtitle', 'placement', 'note',
  'specialBonus', 'doctrine', 'motto', 'pro', 'con', 'howTo', 'rewardLabel', 'effect', 'doctrineText']);
function collect(obj, path, src) {
  if (Array.isArray(obj)) { obj.forEach((v, i) => collect(v, `${path}[${i}]`, src)); return; }
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    const inChoice = /choices\[\d+\]$/.test(path);
    if (k === 'effect' && (inChoice || !/techs/.test(path))) continue;   // event effects are ids; tech effects are text
    if (FIELDS.has(k) && typeof v === 'string' && v.trim() && !/^[a-z_]+(:[\w-]+)*$/.test(v)) { if (!keys.has(v)) keys.set(v, src); }
    else if (FIELDS.has(k) && Array.isArray(v) && v.every(x => typeof x === 'string')) { for (const x of v) if (!keys.has(x)) keys.set(x, src); }
    else if (typeof v === 'object') collect(v, `${path}.${k}`, src);
  }
}
const mod = async (rel) => import(pathToFileURL(join(SRC, rel)).href);
const data = await mod('game/data.ts');
collect({ continents: data.continents, terrain: data.terrainInfo, deposits: data.depositInfo, buildings: data.buildings, techs: data.techs, events: data.historicalEvents }, 'data', 'src/game/data.ts');
for (const s of [...data.ERA_NAMES, ...Object.values(data.CATEGORY_LABEL)]) if (s && !keys.has(s)) keys.set(s, 'src/game/data.ts');
collect({ policies: (await mod('game/policies.ts')).POLICIES }, 'policies', 'src/game/policies.ts');
collect({ achievements: (await mod('game/achievements.ts')).ACHIEVEMENTS }, 'achievements', 'src/game/achievements.ts');
collect({ leaders: (await mod('game/dynamic-events.ts')).RIVAL_LEADERS }, 'leaders', 'src/game/dynamic-events.ts');
const eng = await mod('game/engine.ts');
collect({ objectives: eng.OBJECTIVES, treaties: eng.TREATY_INFO }, 'engine', 'src/game/engine.ts');
collect({ minigames: Object.values(await mod('components/minigames/meta.ts')) }, 'minigames', 'src/components/minigames/meta.ts');

const sorted = [...keys.keys()].sort((a, b) => a.localeCompare(b));
const en = Object.fromEntries(sorted.map(k => [k, k]));
writeFileSync(join(OUT, 'en.json'), JSON.stringify(en, null, 1) + '\n');
console.log(`en.json: ${sorted.length} keys`);
if (dynamic.length) console.log(`WARNING ${dynamic.length} dynamic t() keys (use placeholders instead):\n  ` + dynamic.slice(0, 20).join('\n  '));

const ph = s => (s.match(/\{\w+\}/g) || []).sort().join(',');
let bad = 0;
for (const f of readdirSync(OUT).filter(f => f.endsWith('.json') && f !== 'en.json')) {
  const d = JSON.parse(readFileSync(join(OUT, f), 'utf8'));
  const missing = sorted.filter(k => !d[k]);
  const broken = sorted.filter(k => d[k] && ph(d[k]) !== ph(k));
  const stale = Object.keys(d).filter(k => !keys.has(k));
  console.log(`${f}: ${sorted.length - missing.length}/${sorted.length} translated, ${broken.length} broken placeholders, ${stale.length} stale`);
  if (broken.length) console.log('  broken: ' + broken.slice(0, 5).map(k => JSON.stringify(k)).join(' | '));
  bad += missing.length + broken.length;
}
if (process.argv.includes('--check') && bad) process.exit(1);
if (existsSync(join(OUT, 'es.json')) === false) console.log('(no locale files yet)');
