// Settings form shared by the title screen side panel and the in-game pause menu.
import { useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, useSettings, type AutosaveYears } from '../../lib/settings';
import { enableAudio, isAudioEnabled, play } from '../../hooks/useSound';

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5" style={{ borderBottom: '1px dashed rgba(255,255,255,0.06)' }}>
      <div className="min-w-0">
        <div className="font-mono-data text-[10px] tracking-[0.15em]" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {hint && <div className="font-rajdhani text-[11px] leading-tight" style={{ color: 'var(--text-tertiary)' }}>{hint}</div>}
      </div>
      <div className="shrink-0 flex items-center gap-2">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, accent, label }: { on: boolean; onChange: (v: boolean) => void; accent: string; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => { onChange(!on); play('click'); }}
      className="font-mono-data text-[9.5px] tracking-widest px-2 py-0.5 rounded min-w-[52px] transition-all hover:brightness-125"
      style={{
        background: on ? `color-mix(in srgb, ${accent}, transparent 82%)` : 'transparent',
        color: on ? accent : 'var(--text-tertiary)',
        border: `1px solid ${on ? accent : 'var(--border-light)'}`,
      }}
    >
      {on ? '■ ON' : '□ OFF'}
    </button>
  );
}

function Heading({ children, accent }: { children: ReactNode; accent: string }) {
  return <h3 className="font-orbitron text-[10px] mt-3 mb-1 tracking-[0.2em]" style={{ color: accent }}>{children}</h3>;
}

export default function SettingsForm({ accent = 'var(--cyan)' }: { accent?: string }) {
  const [s, set] = useSettings();
  const [audioOn, setAudioOn] = useState(isAudioEnabled());

  return (
    <div className="flex flex-col" style={{ color: 'var(--text-secondary)' }}>
      <Heading accent={accent}>AUDIO</Heading>
      {!audioOn && (
        <button
          type="button"
          onClick={() => { enableAudio(); setAudioOn(true); play('click'); }}
          className="w-full py-1.5 mb-1 rounded font-orbitron text-[9px] font-bold tracking-wider hover:brightness-125"
          style={{ background: `color-mix(in srgb, ${accent}, transparent 88%)`, color: accent, border: `1px solid ${accent}` }}
        >
          ENABLE AUDIO
        </button>
      )}
      <Row label="MASTER VOLUME">
        <input
          type="range" min={0} max={1} step={0.05} value={s.masterVolume}
          onChange={e => set({ masterVolume: Number(e.target.value) })}
          onPointerUp={() => play('click')}
          aria-label="Master volume"
          style={{ width: 110, accentColor: accent }}
        />
        <span className="font-mono-data text-[10px] w-9 text-right" style={{ color: accent }}>{Math.round(s.masterVolume * 100)}%</span>
      </Row>
      <Row label="SOUND EFFECTS"><Toggle label="Sound effects" accent={accent} on={s.sfx} onChange={v => set({ sfx: v })} /></Row>
      <Row label="AMBIENT DRONE"><Toggle label="Ambient" accent={accent} on={s.ambient} onChange={v => set({ ambient: v })} /></Row>

      <Heading accent={accent}>MAP</Heading>
      <Row label="EDGE SCROLL" hint="Pan when the cursor touches the screen edge">
        <Toggle label="Edge scroll" accent={accent} on={s.edgeScroll} onChange={v => set({ edgeScroll: v })} />
      </Row>
      <Row label="SCROLL SPEED">
        <input
          type="range" min={0.5} max={2} step={0.1} value={s.scrollSpeed}
          onChange={e => set({ scrollSpeed: Number(e.target.value) })}
          aria-label="Scroll speed"
          style={{ width: 110, accentColor: accent }}
        />
        <span className="font-mono-data text-[10px] w-9 text-right" style={{ color: accent }}>{s.scrollSpeed.toFixed(1)}×</span>
      </Row>
      <Row label="DAY / NIGHT CYCLE"><Toggle label="Day and night cycle" accent={accent} on={s.dayNight} onChange={v => set({ dayNight: v })} /></Row>

      <Heading accent={accent}>GAME</Heading>
      <Row label="AUTOSAVE" hint="Saves to the AUTO slot">
        <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
          {([0, 1, 2, 5] as AutosaveYears[]).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => { set({ autosaveYears: n }); play('click'); }}
              className="font-mono-data text-[9.5px] px-1.5 py-0.5"
              style={{ background: s.autosaveYears === n ? accent : 'transparent', color: s.autosaveYears === n ? '#05070A' : 'var(--text-secondary)' }}
            >
              {n === 0 ? 'OFF' : `${n}Y`}
            </button>
          ))}
        </div>
      </Row>
      <Row label="REDUCE MOTION" hint="Fewer particles and animations">
        <Toggle label="Reduce motion" accent={accent} on={s.reduceMotion} onChange={v => set({ reduceMotion: v })} />
      </Row>

      <button
        type="button"
        onClick={() => { set({ ...DEFAULT_SETTINGS }); play('click'); }}
        className="self-end mt-3 font-mono-data text-[9px] tracking-widest px-2 py-0.5 rounded hover:brightness-150"
        style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-light)' }}
      >
        RESET DEFAULTS
      </button>
    </div>
  );
}
