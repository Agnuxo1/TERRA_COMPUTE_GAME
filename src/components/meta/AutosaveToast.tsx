// Small corner badge shown briefly after an autosave. Pair with useAutosave().justSaved.
import { t } from '../../i18n';

export default function AutosaveToast({ visible, year }: { visible: boolean; year?: number | null }) {
  if (!visible) return null;
  return (
    <div
      className="absolute top-12 right-3 z-[70] px-3 py-1 rounded font-mono-data text-[10px] tracking-[0.25em] pointer-events-none animate-fade-up"
      style={{ background: 'rgba(11,12,16,0.92)', color: 'var(--green)', border: '1px solid var(--green)', boxShadow: '0 0 12px rgba(0,229,160,0.25)' }}
      role="status"
    >
      ◆ {year ? t('AUTOSAVED · {year}', { year }) : t('AUTOSAVED')}
    </div>
  );
}
