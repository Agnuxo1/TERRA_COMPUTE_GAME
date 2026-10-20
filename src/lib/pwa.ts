// Service-worker registration for the installable web build (manifest + public/sw.js).
// Skipped where it cannot or should not run: plain http, localhost, the Capacitor mobile shell and Electron.

export function registerPwa(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const { protocol, hostname } = window.location;
  if (protocol !== 'https:' || hostname === 'localhost') return;
  if ((window as unknown as { Capacitor?: unknown }).Capacitor) return;
  if (navigator.userAgent.includes('Electron')) return;

  // Relative to the page, so it works under /TERRA_COMPUTE_GAME/ on GitHub Pages and under ./ elsewhere.
  const script = new URL('sw.js', document.baseURI).href;
  const scope = new URL('./', document.baseURI).pathname;
  const register = () => {
    navigator.serviceWorker.register(script, { scope }).catch(() => { /* blocked or offline: the game runs without it */ });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
