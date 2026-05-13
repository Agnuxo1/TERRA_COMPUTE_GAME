import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Mobile scroll fix: load mobile CSS on touch devices or narrow screens
const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isMobile) {
  import('./mobile.css');
}

createRoot(document.getElementById('root')!).render(<App />);
