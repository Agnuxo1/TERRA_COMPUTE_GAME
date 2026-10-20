// Language selector (replaces the old machine-translation widget): 11 hand-translated languages.
import { useEffect, useRef, useState } from 'react';
import { LOCALES } from '../../i18n';
import { setLocale, useLocale } from '../../i18n/loader';
import { play } from '../../hooks/useSound';

export default function Translator({ dropUp = false }: { dropUp?: boolean }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  const cur = LOCALES.find(l => l.id === locale) ?? LOCALES[0];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => { play('click'); setOpen(o => !o); }}
        className="font-mono-data text-[11px] px-2.5 py-1 rounded flex items-center gap-1.5 hover:brightness-125"
        style={{ color: 'var(--cyan)', border: '1px solid rgba(0,240,255,0.35)', background: 'rgba(8,9,12,0.85)' }}
        aria-haspopup="listbox" aria-expanded={open} title="Language / Idioma">
        <span>🌐</span><span>{cur.id.toUpperCase()}</span><span style={{ fontSize: 8 }}>{dropUp ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul role="listbox" className={`absolute right-0 ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'} z-[300] min-w-[190px] max-h-[70vh] overflow-auto rounded py-1`}
          style={{ background: 'rgba(8,9,12,0.97)', border: '1px solid rgba(0,240,255,0.35)', boxShadow: '0 10px 30px rgba(0,0,0,0.6)' }}>
          {LOCALES.map(l => (
            <li key={l.id} role="option" aria-selected={l.id === locale}>
              <button onClick={() => { play('click'); setOpen(false); void setLocale(l.id); }}
                className="w-full text-left px-3 py-1.5 flex items-center justify-between gap-3 hover:bg-white/5"
                style={{ color: l.id === locale ? 'var(--cyan)' : 'var(--text-secondary)' }}>
                <span className="text-[13px]">{l.name}</span>
                <span className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{l.id.toUpperCase()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
