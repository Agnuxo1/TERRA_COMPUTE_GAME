// Adds hand-made translations to locale files: node tools/i18n/add-extra.mjs <extra.json> <lang...>
// extra.json = { "English key": { "es": "...", "zh": "...", "*": "same for every language" } }
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const LOC = join(ROOT, 'src', 'i18n', 'locales');
const [extraFile, ...langs] = process.argv.slice(2);
const extra = JSON.parse(readFileSync(extraFile, 'utf8'));
const en = JSON.parse(readFileSync(join(LOC, 'en.json'), 'utf8'));
for (const l of langs) {
  const f = join(LOC, `${l}.json`);
  const d = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
  let n = 0;
  for (const [k, tr] of Object.entries(extra)) { const v = tr[l] ?? tr['*']; if (v && k in en) { d[k] = v; n++; } }
  writeFileSync(f, JSON.stringify(Object.fromEntries(Object.keys(en).filter(k => d[k]).map(k => [k, d[k]])), null, 1) + '\n');
  console.log(`${l}: +${n} → ${Object.keys(en).filter(k => d[k]).length}/${Object.keys(en).length}`);
}
