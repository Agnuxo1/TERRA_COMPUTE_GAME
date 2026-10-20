// Copies the web build (../dist, made by `npm run build` at the repo root) into mobile/www for Capacitor.
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(dirname(fileURLToPath(import.meta.url))), SRC = join(dirname(HERE), 'dist'), DST = join(HERE, 'www');
if (!existsSync(join(SRC, 'index.html'))) { console.error('Missing ../dist: run `npm run build` at the repo root first.'); process.exit(1); }
rmSync(DST, { recursive: true, force: true });
cpSync(SRC, DST, { recursive: true });
// Android: a desktop-sized layout viewport (720 CSS px tall, width from the screen ratio, at least 1280),
// scaled to the screen by the WebView (MainActivity enables wide viewports). Phones then show the same layout as a laptop.
const VIEWPORT = '<meta name="viewport" content="width=1280" id="vp" />\n    <script>(function(){function f(){var a=Math.max(screen.width,screen.height),b=Math.min(screen.width,screen.height);'
  + 'var w=Math.max(1280,Math.ceil(720*a/b));document.getElementById("vp").setAttribute("content","width="+w+", user-scalable=no");}f();addEventListener("orientationchange",f);})();</script>';
const indexPath = join(DST, 'index.html');
const html = readFileSync(indexPath, 'utf8');
const meta = /<meta name="viewport"[^>]*>/;
if (!meta.test(html)) throw new Error('index.html has no viewport meta');
writeFileSync(indexPath, html.replace(meta, VIEWPORT));
console.log('mobile/www ready from', SRC);
