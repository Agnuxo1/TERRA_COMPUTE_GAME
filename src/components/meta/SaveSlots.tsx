// Save-slot list used by the pause menu (save / load) and the title screen (load / delete).
import { useState } from 'react';
import { continents } from '../../game/data';
import { SLOTS, deleteSave, listSaves, type SaveMeta, type SaveSlot } from '../../game/save';
import { play } from '../../hooks/useSound';
import { t } from '../../i18n';

export function continentName(id: string | null): string {
  if (!id) return '—';
  const c = continents.find(x => x.id === id);
  return c ? t(c.name) : id.toUpperCase();
}

export function fmtSavedAt(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function slotLabel(slot: SaveSlot): string {
  return slot === 'auto' ? t('AUTOSAVE') : t('SLOT {n}', { n: slot });
}

/** Most recent save across all slots, or null. */
export function latestSave(): SaveMeta | null {
  const all = listSaves();
  if (!all.length) return null;
  return all.reduce((a, b) => (b.savedAt > a.savedAt ? b : a));
}

interface Props {
  mode: 'save' | 'load';
  accent?: string;
  allowDelete?: boolean;
  /** Called with the chosen slot after any needed confirmation. Return false to signal failure. */
  onPick: (slot: SaveSlot) => boolean | void;
  /** Ask for a second click before loading (e.g. when a game is in progress). */
  confirmLoad?: boolean;
  /** Notified after a save or delete changes the slot list. */
  onChanged?: () => void;
}

export default function SaveSlots({ mode, accent = 'var(--cyan)', allowDelete, onPick, confirmLoad, onChanged }: Props) {
  const [saves, setSaves] = useState<SaveMeta[]>(() => listSaves());
  const [confirm, setConfirm] = useState<{ slot: SaveSlot; kind: 'overwrite' | 'load' | 'delete' } | null>(null);
  const [flash, setFlash] = useState<{ slot: SaveSlot; text: string; ok: boolean } | null>(null);

  const slots: SaveSlot[] = mode === 'save' ? SLOTS.filter(s => s !== 'auto') : [...SLOTS];
  const refresh = () => { setSaves(listSaves()); onChanged?.(); };

  const act = (slot: SaveSlot) => {
    const meta = saves.find(m => m.slot === slot);
    if (mode === 'save') {
      if (meta && !(confirm?.slot === slot && confirm.kind === 'overwrite')) {
        play('click');
        setFlash(null);
        setConfirm({ slot, kind: 'overwrite' });
        return;
      }
      const ok = onPick(slot) !== false;
      play(ok ? 'coin' : 'alert');
      setConfirm(null);
      setFlash({ slot, text: ok ? t('SAVED') : t('SAVE FAILED'), ok });
      refresh();
      return;
    }
    if (!meta) return;
    if (confirmLoad && !(confirm?.slot === slot && confirm.kind === 'load')) {
      play('click');
      setConfirm({ slot, kind: 'load' });
      return;
    }
    setConfirm(null);
    const ok = onPick(slot) !== false;
    if (!ok) {
      play('alert');
      setFlash({ slot, text: t('LOAD FAILED'), ok: false });
    }
  };

  const del = (slot: SaveSlot) => {
    if (!(confirm?.slot === slot && confirm.kind === 'delete')) {
      play('click');
      setConfirm({ slot, kind: 'delete' });
      return;
    }
    deleteSave(slot);
    play('click');
    setConfirm(null);
    refresh();
  };

  return (
    <div className="flex flex-col gap-1.5">
      {slots.map(slot => {
        const meta = saves.find(m => m.slot === slot);
        const pending = confirm?.slot === slot ? confirm.kind : null;
        const disabled = mode === 'load' && !meta;
        const label = mode === 'save'
          ? (pending === 'overwrite' ? t('CONFIRM OVERWRITE') : meta ? t('OVERWRITE') : t('SAVE HERE'))
          : (pending === 'load' ? t('CONFIRM LOAD') : t('LOAD'));
        return (
          <div
            key={slot}
            className="rounded px-2.5 py-2 flex items-center gap-2"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: `1px solid ${pending ? 'var(--amber)' : meta ? 'var(--border-light)' : 'var(--border)'}`,
              opacity: disabled ? 0.55 : 1,
            }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-orbitron text-[9.5px] font-bold tracking-[0.18em]" style={{ color: slot === 'auto' ? 'var(--amber)' : accent }}>{slotLabel(slot)}</span>
                {meta && <span className="font-orbitron text-[11px]" style={{ color: '#FFF4C2' }}>{meta.year}</span>}
              </div>
              {meta ? (
                <>
                  <div className="font-mono-data text-[9.5px] truncate" style={{ color: 'var(--text-secondary)' }}>
                    {t('{continent} · {mode} · {difficulty}', { continent: continentName(meta.continent), mode: (meta.mode ?? '—').toUpperCase(), difficulty: (meta.difficulty ?? 'normal').toUpperCase() })}
                  </div>
                  <div className="font-mono-data text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                    {t('{saved} · 10^{capability} FLOPS', { saved: fmtSavedAt(meta.savedAt), capability: meta.capability.toFixed(1) })}
                  </div>
                </>
              ) : (
                <div className="font-mono-data text-[9.5px]" style={{ color: 'var(--text-tertiary)' }}>{t('— EMPTY —')}</div>
              )}
              {pending === 'overwrite' && <div className="font-mono-data text-[9px]" style={{ color: 'var(--amber)' }}>{t('Replace this save? Click again to confirm.')}</div>}
              {pending === 'load' && <div className="font-mono-data text-[9px]" style={{ color: 'var(--amber)' }}>{t('Unsaved progress will be lost. Click again.')}</div>}
              {pending === 'delete' && <div className="font-mono-data text-[9px]" style={{ color: 'var(--rose)' }}>{t('Delete permanently? Click again.')}</div>}
              {flash?.slot === slot && (
                <div className="font-mono-data text-[9px] tracking-widest" style={{ color: flash.ok ? 'var(--green)' : 'var(--rose)' }}>{flash.text}</div>
              )}
            </div>
            <div className="shrink-0 flex flex-col gap-1 items-stretch">
              {!disabled && (
                <button
                  type="button"
                  onClick={() => act(slot)}
                  className="font-mono-data text-[9.5px] tracking-wider px-2 py-1 rounded hover:brightness-125 active:scale-[0.98]"
                  style={{
                    color: pending ? '#05070A' : accent,
                    background: pending ? 'var(--amber)' : `color-mix(in srgb, ${accent}, transparent 88%)`,
                    border: `1px solid ${pending ? 'var(--amber)' : accent}`,
                  }}
                >
                  {label}
                </button>
              )}
              {allowDelete && meta && (
                <button
                  type="button"
                  onClick={() => del(slot)}
                  className="font-mono-data text-[9px] tracking-wider px-2 py-0.5 rounded hover:brightness-125"
                  style={{
                    color: pending === 'delete' ? '#05070A' : 'var(--rose)',
                    background: pending === 'delete' ? 'var(--rose)' : 'transparent',
                    border: '1px solid var(--rose)',
                  }}
                >
                  {pending === 'delete' ? t('CONFIRM') : t('DELETE')}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
