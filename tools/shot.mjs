// Capturas del juego SIN panel de navegador ni GPU: Edge sin ventana (WebGL por software) dirigido por el protocolo DevTools, solo con Node ≥ 22 (sin dependencias).
// Sirve para repasos visuales a tamaño real (1280×720, 1920×1080…) y para lanzar varios en paralelo sin tocar la gráfica compartida.
//   node tools/shot.mjs <guion.json> [--size 1600x900] [--port 9333] [--gpu]
// guion.json = { url, size?, init?, steps: [ { wait: ms } | { js: "código (await permitido)" } | { shot: "ruta.png" | "ruta.jpg" } | { key: "Escape" } | { goto: "url" } ] }
// Cada `js` devuelve su valor (JSON) por la salida estándar. Requiere el servidor de desarrollo en marcha (npm run dev → http://127.0.0.1:5175/).
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const plan = JSON.parse(readFileSync(args[0], 'utf8')), [W, H] = (opt('size', plan.size || '1600x900')).split('x').map(Number), port = +opt('port', 9333);
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
if (!EDGE) { console.error('No encuentro Edge ni Chrome'); process.exit(2); }
const gpu = args.includes('--gpu') ? [] : ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const br = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=D:/tmp/edge-shot-${port}`, `--window-size=${W},${H}`, '--hide-scrollbars', '--mute-audio', '--no-first-run', '--autoplay-policy=no-user-gesture-required', ...gpu, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let code = 0;
try {
  let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* aún arrancando */ } }
  if (!target) throw new Error('el navegador no arrancó');
  const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
  let id = 0; const wait = new Map(); const errs = [];
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && wait.has(m.id)) { const [ok, ko] = wait.get(m.id); wait.delete(m.id); m.error ? ko(new Error(m.error.message)) : ok(m.result); } else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] || m.params.exceptionDetails.text); };
  const cdp = (method, params = {}) => new Promise((ok, ko) => { wait.set(++id, [ok, ko]); ws.send(JSON.stringify({ id, method, params })); });
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  if (plan.init) await cdp('Page.addScriptToEvaluateOnNewDocument', { source: plan.init });   // `init`: código que corre antes que la página (p. ej. sustituir AudioContext por uno fuera de línea para medir sonidos)
  const go = async (url) => { await cdp('Page.navigate', { url }); await sleep(1200); };
  await go(plan.url);
  for (const st of plan.steps) {
    if (st.wait) await sleep(st.wait);
    if (st.goto) await go(st.goto);
    if (st.key) for (const type of ['keyDown', 'keyUp']) await cdp('Input.dispatchKeyEvent', { type, key: st.key, code: st.code || st.key, windowsVirtualKeyCode: { Escape: 27, Enter: 13, ' ': 32 }[st.key] || 0 });
    if (st.js) { let r; for (let n = 0; n < 3; n++) { try { r = await cdp('Runtime.evaluate', { expression: `(async () => { ${st.js} })()`, awaitPromise: true, returnByValue: true }); break; } catch (e) { if (n === 2) throw e; await sleep(2500); } }   // si la página se recarga a mitad (Vite al guardar un archivo), se repite el paso
      console.log(r.exceptionDetails ? 'JS ERROR: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) : JSON.stringify(r.result.value)); }
    if (st.shot) { const jpg = /\.jpe?g$/i.test(st.shot), r = await cdp('Page.captureScreenshot', jpg ? { format: 'jpeg', quality: 88 } : { format: 'png' }); mkdirSync(dirname(st.shot), { recursive: true }); writeFileSync(st.shot, Buffer.from(r.data, 'base64')); console.log('captura', st.shot); }
  }
  if (errs.length) console.log('EXCEPCIONES DE PÁGINA:', JSON.stringify([...new Set(errs)].slice(0, 8)));
  ws.close();
} catch (e) { console.error('shot:', e.message); code = 1; } finally { br.kill(); }
process.exit(code);
