import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initLocale } from './i18n/loader';

// Mobile scroll fix: load mobile CSS on touch devices or narrow screens
const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isMobile) {
  import('./mobile.css');
}

// Load the saved (or browser) language first so the very first frame is already translated.
void initLocale().finally(() => createRoot(document.getElementById('root')!).render(<App />));
