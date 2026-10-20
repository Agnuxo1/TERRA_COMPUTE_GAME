// Splits untranslated keys into chunk files for translators and merges them back with validation.
//   node tools/i18n/chunk.mjs split <lang> [size=250]   → D:/tmp/terra-i18n/<lang>/todo_NN.json  ({ "English": "" })
//   node tools/i18n/chunk.mjs merge <lang>              → merges D:/tmp/terra-i18n/<lang>/done_NN.json into src/i18n/locales/<lang>.json
// Merge rejects entries whose {placeholders} differ from the English key and reports them.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const LOC = join(ROOT, 'src', 'i18n', 'locales');
const WORK = 'D:/tmp/terra-i18n';
const [cmd, lang, sizeArg] = process.argv.slice(2);
if (!cmd || !lang) { console.log('usage: split|merge <lang> [size]'); process.exit(2); }

const en = JSON.parse(readFileSync(join(LOC, 'en.json'), 'utf8'));
const file = join(LOC, `${lang}.json`);
const cur = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
const dir = join(WORK, lang);
const ph = s => (s.match(/\{\w+\}/g) || []).sort().join(',');

if (cmd === 'split') {
  mkdirSync(dir, { recursive: true });
  const todo = Object.keys(en).filter(k => !cur[k]);
  const size = Number(sizeArg) || 250;
  let n = 0;
  for (let i = 0; i < todo.length; i += size, n++) {
    const part = Object.fromEntries(todo.slice(i, i + size).map(k => [k, '']));
    writeFileSync(join(dir, `todo_${String(n).padStart(2, '0')}.json`), JSON.stringify(part, null, 1));
  }
  console.log(`${lang}: ${todo.length} keys to translate in ${n} chunks → ${dir}`);
} else if (cmd === 'merge') {
  const out = { ...cur };
  let ok = 0; const bad = [];
  for (const f of readdirSync(dir).filter(f => /^done_\d+\.json$/.test(f)).sort()) {
    let d;
    try { d = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch (e) { bad.push(`${f}: invalid JSON (${e.message})`); continue; }
    for (const [k, v] of Object.entries(d)) {
      if (!(k in en)) continue;
      if (typeof v !== 'string' || !v.trim()) continue;
      if (ph(v) !== ph(k)) { bad.push(`${f}: placeholder mismatch ${JSON.stringify(k).slice(0, 80)}`); continue; }
      out[k] = v; ok++;
    }
  }
  const sorted = Object.fromEntries(Object.keys(en).filter(k => out[k]).map(k => [k, out[k]]));
  writeFileSync(file, JSON.stringify(sorted, null, 1) + '\n');
  console.log(`${lang}: merged ${ok}, now ${Object.keys(sorted).length}/${Object.keys(en).length}; problems ${bad.length}`);
  for (const b of bad.slice(0, 15)) console.log('  ' + b);
}
