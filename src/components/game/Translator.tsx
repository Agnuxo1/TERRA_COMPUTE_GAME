import { useState, useEffect, useRef } from 'react';

const languages: Record<string, string> = {
  en: 'English',
  es: 'Espanol',
  fr: 'Francais',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Portugues',
  ru: 'Russkiy',
  zh: 'Zhongwen',
  ja: 'Nihongo',
  ko: 'Hangugeo',
  ar: 'Arabiya',
  hi: 'Hindi',
  tr: 'Turkce',
  pl: 'Polski',
  nl: 'Nederlands',
  sv: 'Svenska',
  el: 'Ellinika',
  he: 'Ivrit',
  th: 'Thai',
  vi: 'Viet',
  id: 'Bahasa',
  uk: 'Ukrayinska',
  ro: 'Romana',
  hu: 'Magyar',
  bg: 'Bulgarski',
  cs: 'Cestina',
  da: 'Dansk',
  fi: 'Suomi',
  no: 'Norsk',
  sk: 'Slovencina',
};

export default function Translator() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectLanguage = (code: string) => {
    setCurrentLang(code);
    setIsOpen(false);

    if (code === 'en') {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select) { select.value = 'en'; select.dispatchEvent(new Event('change')); }
      const iframe = document.querySelector('.goog-te-banner-frame') as HTMLIFrameElement;
      if (iframe) {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        const restore = doc?.querySelector('.goog-te-button button');
        if (restore) (restore as HTMLButtonElement).click();
      }
      return;
    }

    if (!(window as any).google?.translate?.TranslateElement) {
      const existing = document.getElementById('google-translate-script');
      if (existing) {
        setTimeout(() => applyLanguage(code), 1000);
        return;
      }

      (window as any).googleTranslateElementInit = () => {
        try {
          new (window as any).google.translate.TranslateElement(
            { pageLanguage: 'en', includedLanguages: Object.keys(languages).join(','), layout: 0 },
            'google-translate-container'
          );
          setTimeout(() => applyLanguage(code), 800);
        } catch (e) { /* ignore */ }
      };

      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    } else {
      applyLanguage(code);
    }
  };

  const applyLanguage = (code: string) => {
    setTimeout(() => {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select) { select.value = code; select.dispatchEvent(new Event('change')); }
    }, 300);
  };

  return (
    <div ref={dropdownRef} className="relative z-50">
      <div id="google-translate-container" style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, width: 1, height: 1 }} />

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded"
        style={{
          background: isOpen ? '#1A1D28' : '#11131A',
          color: '#00F0FF',
          border: '1px solid #1E2130',
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        {currentLang === 'en' ? 'EN' : currentLang.toUpperCase()}
        <span style={{ fontSize: '7px', marginLeft: '2px' }}>▼</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 rounded"
          style={{
            background: '#1A1D28',
            border: '1px solid #1E2130',
            maxHeight: '280px',
            overflowY: 'auto',
            width: '140px',
          }}
        >
          {Object.entries(languages).map(([code, name]) => (
            <button
              key={code}
              onClick={() => selectLanguage(code)}
              className="w-full text-left px-3 py-1"
              style={{
                background: currentLang === code ? 'rgba(0,240,255,0.1)' : 'transparent',
                color: currentLang === code ? '#00F0FF' : '#8A8D9A',
                borderBottom: '1px solid #2A2E42',
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '8px',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .goog-te-banner-frame { display: none !important; }
        .goog-te-menu-value:hover { text-decoration: none !important; }
        body { top: 0 !important; }
        .skiptranslate { display: none; }
        #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
        .goog-text-highlight { background: none !important; box-shadow: none !important; }
        .goog-logo-link, .goog-te-gadget span { display: none !important; }
        .goog-te-gadget { color: transparent !important; }
      `}</style>
    </div>
  );
}
