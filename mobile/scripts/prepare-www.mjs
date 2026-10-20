// Copies the web build (../dist, made by `npm run build` at the repo root) into mobile/www for Capacitor.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(dirname(fileURLToPath(import.meta.url))), SRC = join(dirname(HERE), 'dist'), DST = join(HERE, 'www');
if (!existsSync(join(SRC, 'index.html'))) { console.error('Missing ../dist: run `npm run build` at the repo root first.'); process.exit(1); }
rmSync(DST, { recursive: true, force: true });
cpSync(SRC, DST, { recursive: true });
console.log('mobile/www ready from', SRC);
