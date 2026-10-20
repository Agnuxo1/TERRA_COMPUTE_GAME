// A newspaper front page for the end screens: off-white paper, dark ink, serif type.
import { t } from '../../i18n';

interface NewspaperProps {
  /** Final year, shown in the dateline. */
  year: number;
  /** Already translated headline and body. */
  headline: string;
  text: string;
}

const PAPER = '#f4efe2';
const INK = '#16140f';
const SERIF = 'Georgia, "Times New Roman", Times, serif';

export default function Newspaper({ year, headline, text }: NewspaperProps) {
  return (
    <article
      className="w-full"
      style={{
        background: PAPER,
        color: INK,
        fontFamily: SERIF,
        border: '1px solid #b9ae92',
        boxShadow: '0 10px 40px rgba(0,0,0,0.45), inset 0 0 60px rgba(120,95,40,0.08)',
        padding: '14px 22px 18px',
        maxWidth: '640px',
      }}>
      <header className="text-center" style={{ borderTop: `3px double ${INK}`, borderBottom: `1px solid ${INK}`, paddingTop: '6px', paddingBottom: '4px' }}>
        <div style={{ fontWeight: 900, letterSpacing: '0.06em', fontSize: 'clamp(1.7rem, 5.5vw, 2.6rem)', lineHeight: 1.1 }}>
          {t('THE WORLD TRIBUNE')}
        </div>
        <div className="flex justify-between items-center" style={{ fontSize: '0.72rem', letterSpacing: '0.08em', marginTop: '4px', fontStyle: 'italic' }}>
          <span>{t('Late edition')}</span>
          <span>{t('Final edition, {year}', { year })}</span>
          <span>{t('Price: one century')}</span>
        </div>
      </header>
      <h2 className="text-center" style={{ fontWeight: 800, fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', lineHeight: 1.15, margin: '14px 0 8px' }}>
        {headline}
      </h2>
      <div style={{ height: '1px', background: INK, opacity: 0.55, marginBottom: '10px' }} />
      <p style={{ fontSize: '0.95rem', lineHeight: 1.55, textAlign: 'justify', textIndent: '1.4em', margin: 0 }}>
        {text}
      </p>
    </article>
  );
}
