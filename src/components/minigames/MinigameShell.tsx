import { useEffect, useState, type ReactNode } from 'react';
import { play } from '../../hooks/useSound';
import type { MinigameMeta, MinigameResult, Stars } from './types';

/**
 * Full-screen frame shared by all minigames: retro console background, title strip,
 * a "how to play" briefing, the play area, and an always-available ABANDON button.
 * The game component renders inside `children` and reports its result via `finish`.
 */
export function MinigameShell({
  meta,
  children,
  status,
  onAbandon,
  wide = false,
}: {
  meta: MinigameMeta;
  children: ReactNode;
  /** Right-side status chip, e.g. "ATTEMPTS 3/8". */
  status?: ReactNode;
  onAbandon: () => void;
  wide?: boolean;
}) {
  const [briefing, setBriefing] = useState(true);

  useEffect(() => {
    if (!briefing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // The game's own key handlers are registered after this one: keep them from seeing this key.
        e.preventDefault();
        e.stopImmediatePropagation();
        play('click');
        setBriefing(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [briefing]);

  return (
    <div className="fixed inset-0 z-[90] flex" style={{ background: '#050508' }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${meta.background})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.38) saturate(0.9)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent 0 3px, rgba(0,0,0,0.22) 3px 4px)`,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 45%, ${meta.accent}14, transparent 55%)` }}
      />

      <div className="relative z-10 flex h-[100dvh] w-full flex-col p-3 md:p-5">
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono-data text-[10px] tracking-[0.3em]" style={{ color: meta.accent }}>
              HISTORICAL BREAKTHROUGH · {meta.year}
            </div>
            <h2 className="font-orbitron text-xl md:text-2xl font-black tracking-wider" style={{ color: '#FFF4C2' }}>
              {meta.title}
            </h2>
            <p className="font-rajdhani text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {meta.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {status && !briefing && (
              <div
                className="font-mono-data text-[11px] px-2 py-1 rounded"
                style={{ color: meta.accent, border: `1px solid ${meta.accent}66`, background: '#000A' }}
              >
                {status}
              </div>
            )}
            <button
              onClick={() => { play('click'); onAbandon(); }}
              className="font-mono-data text-[10px] px-3 py-1.5 rounded transition-all hover:brightness-125"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-light)', background: '#000A' }}
              title="Leave the exercise. No reward, no penalty."
            >
              ABANDON ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="relative mt-3 flex min-h-0 flex-1 items-center justify-center">
          {briefing ? (
            <div
              className="animate-fade-up w-full max-w-lg rounded-lg p-5"
              style={{ background: 'rgba(12,13,18,0.92)', border: `2px solid ${meta.accent}`, boxShadow: `0 0 40px ${meta.accent}33` }}
            >
              <div className="font-mono-data text-[10px] tracking-[0.25em] mb-2" style={{ color: meta.accent }}>
                BRIEFING
              </div>
              <ul className="flex flex-col gap-2 mb-4">
                {meta.howTo.map((line, i) => (
                  <li key={i} className="font-rajdhani text-[15px] leading-snug flex gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span style={{ color: meta.accent }}>▸</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="font-mono-data text-[10px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
                REWARD · {meta.rewardLabel} · ★ scales the bonus
              </div>
              <button
                autoFocus
                onClick={() => { play('click'); setBriefing(false); }}
                className="w-full py-2.5 rounded font-orbitron text-sm font-bold tracking-wider transition-all hover:brightness-125"
                style={{ background: meta.accent + '22', color: meta.accent, border: `2px solid ${meta.accent}` }}
              >
                BEGIN ▶
              </button>
            </div>
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${wide ? '' : 'max-w-5xl'}`}>{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Result card shown by a minigame once it is over. Calls onDone when dismissed. */
export function MinigameResultCard({
  meta,
  result,
  onDone,
}: {
  meta: MinigameMeta;
  result: MinigameResult;
  onDone: () => void;
}) {
  useEffect(() => {
    play(result.stars > 0 ? 'victory' : 'defeat');
  }, [result.stars]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); onDone(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4" style={{ background: 'rgba(5,5,8,0.78)' }}>
      <div
        className="animate-fade-up w-full max-w-sm rounded-lg p-5 text-center"
        style={{ background: 'rgba(12,13,18,0.96)', border: `2px solid ${meta.accent}`, boxShadow: `0 0 40px ${meta.accent}44` }}
      >
        <div className="font-mono-data text-[10px] tracking-[0.3em] mb-1" style={{ color: meta.accent }}>
          {result.stars > 0 ? 'EXERCISE COMPLETE' : 'EXERCISE FAILED'}
        </div>
        <StarRow stars={result.stars} accent={meta.accent} />
        <p className="font-rajdhani text-base mt-2 mb-4" style={{ color: 'var(--text-primary)' }}>{result.summary}</p>
        <button
          autoFocus
          onClick={onDone}
          className="w-full py-2.5 rounded font-orbitron text-sm font-bold tracking-wider transition-all hover:brightness-125"
          style={{ background: meta.accent + '22', color: meta.accent, border: `2px solid ${meta.accent}` }}
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}

export function StarRow({ stars, accent, size = 34 }: { stars: Stars; accent: string; size?: number }) {
  return (
    <div className="flex justify-center gap-2 my-2" aria-label={`${stars} of 3 stars`}>
      {[1, 2, 3].map(i => (
        <span
          key={i}
          style={{
            fontSize: size,
            lineHeight: 1,
            color: i <= stars ? accent : '#2A2E42',
            textShadow: i <= stars ? `0 0 14px ${accent}` : 'none',
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

/** Small retro button used inside minigames. */
export function RetroButton({
  children,
  onClick,
  accent,
  disabled,
  active,
  className = '',
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  accent: string;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`font-mono-data rounded transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-125 active:scale-95'} ${className}`}
      style={{
        background: active ? accent + '33' : 'rgba(10,10,14,0.85)',
        color: active ? accent : 'var(--text-primary)',
        border: `1px solid ${active ? accent : 'var(--border-light)'}`,
      }}
    >
      {children}
    </button>
  );
}
