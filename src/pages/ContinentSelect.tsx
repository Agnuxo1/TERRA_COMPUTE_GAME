import { useState, useEffect } from 'react';
import { useGame, continents } from '../App';
import { play } from '../hooks/useSound';
import { isVideoPlayed, markVideoPlayed, getVideoUrl } from '../hooks/useVideo';
import VideoPlayer from '../components/game/VideoPlayer';

// ═══════════════════════════════════════════════════════════════════════════════
//  CONTINENT → PROPAGANDA CARD IMAGE MAP
// ═══════════════════════════════════════════════════════════════════════════════

const continentCardMap: Record<string, string> = {
  na: '/assets/cards/continent-usa.png',
  eu: '/assets/cards/continent-europe.png',
  su: '/assets/cards/continent-ussr.png',
  cn: '/assets/cards/continent-china.png',
  af: '/assets/cards/continent-africa.png',
  sa: '/assets/cards/continent-southamerica.png',
  in: '/assets/cards/continent-india.png',
  oc: '/assets/cards/continent-oceania.png',
};

// ═══════════════════════════════════════════════════════════════════════════════
//  STAGGER ANIMATION KEYFRAMES (injected via style tag)
// ═══════════════════════════════════════════════════════════════════════════════

const staggerKeyframes = `
  @keyframes card-enter {
    from {
      opacity: 0;
      transform: translateY(40px) scale(0.92);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  @keyframes card-glow-pulse {
    0%, 100% { box-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
    50% { box-shadow: 0 0 30px currentColor, 0 0 60px currentColor; }
  }
  @keyframes title-flicker {
    0%, 100% { opacity: 1; text-shadow: 0 0 20px var(--cyan), 0 0 40px var(--cyan); }
    92% { opacity: 1; }
    93% { opacity: 0.6; }
    94% { opacity: 1; }
    96% { opacity: 0.3; }
    97% { opacity: 1; }
  }
  @keyframes float-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  @keyframes radial-pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.05); }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const continentVideoMap: Record<string, string> = {
  na: 'continent-usa',
  eu: 'continent-europe',
  su: 'continent-ussr',
  cn: 'continent-china',
  af: 'continent-africa',
  sa: 'continent-southamerica',
  in: 'continent-india',
  oc: 'continent-oceania',
};

export default function ContinentSelect() {
  const { dispatch } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [pendingContinent, setPendingContinent] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSelect = (id: string) => {
    play('click');
    setSelected(id);
  };

  const handleBegin = () => {
    if (!selected) return;
    play('coin');

    const videoId = continentVideoMap[selected];
    if (videoId && !isVideoPlayed(videoId)) {
      markVideoPlayed(videoId);
      setVideoSrc(getVideoUrl(videoId));
      setPendingContinent(selected);
    } else {
      dispatch({ type: 'START_GAME', continentId: selected });
    }
  };

  const handleVideoComplete = () => {
    setVideoSrc(null);
    if (pendingContinent) {
      dispatch({ type: 'START_GAME', continentId: pendingContinent });
      setPendingContinent(null);
    }
  };

  const handleBack = () => {
    play('click');
    dispatch({ type: 'SET_SCREEN', screen: 'title' });
  };

  const selectedContinent = continents.find(c => c.id === selected);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--void)' }}
    >
      {/* ─── Injected keyframes ─── */}
      <style>{staggerKeyframes}</style>

      {/* ═══════════════════════════════════════════════
          BACKGROUND LAYERS
          ═══════════════════════════════════════════════ */}

      {/* Subtle radial gradient pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(0, 240, 255, 0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 50%, rgba(123, 97, 255, 0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 100%, rgba(0, 229, 160, 0.02) 0%, transparent 50%)
          `,
        }}
      />

      {/* Animated vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Thin grid lines for retro feel */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,240,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,240,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ═══════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════ */}

      <div className="w-full max-w-5xl flex flex-col items-center gap-6 relative z-10">

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between w-full">
          <button
            onClick={handleBack}
            className="px-4 py-2 rounded font-orbitron text-[11px] tracking-wider transition-all duration-200 hover:scale-105"
            style={{
              background: 'var(--surface)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--cyan)';
              e.currentTarget.style.color = 'var(--cyan)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(0,240,255,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            &#8592; BACK
          </button>

          <div className="text-center flex-1">
            <h1
              className="font-orbitron text-2xl md:text-3xl font-black tracking-widest"
              style={{
                color: 'var(--cyan)',
                textShadow: '0 0 20px rgba(0,240,255,0.5), 0 0 40px rgba(0,240,255,0.2)',
                animation: mounted ? 'title-flicker 3s ease-out' : 'none',
              }}
            >
              SELECT YOUR FACTION
            </h1>
            <p
              className="font-rajdhani text-xs md:text-sm mt-1 tracking-wide"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Each continent commands unique strengths. Choose wisely.
            </p>
          </div>

          {/* Spacer to balance the back button */}
          <div className="w-[70px]" />
        </div>

        {/* ─── Card Grid: 4 cols x 2 rows ─── */}
        <div
          className="grid gap-4 w-full"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            maxWidth: '960px',
          }}
        >
          {continents.map((c, index) => {
            const isSelected = selected === c.id;
            const isHovered = hovered === c.id;
            const cardImage = continentCardMap[c.id];
            const delay = mounted ? index * 0.1 : 0;

            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
                className="relative flex flex-col items-stretch justify-end text-left overflow-hidden transition-all duration-300"
                style={{
                  aspectRatio: '2/3',
                  borderRadius: '10px',
                  border: isSelected
                    ? `3px solid ${c.color}`
                    : isHovered
                      ? `2px solid ${c.color}`
                      : '2px solid rgba(42, 45, 56, 0.8)',
                  boxShadow: isSelected
                    ? `0 0 30px ${c.color}66, 0 0 60px ${c.color}33, inset 0 0 30px ${c.color}22`
                    : isHovered
                      ? `0 8px 32px ${c.color}44, 0 0 20px ${c.color}33`
                      : '0 4px 16px rgba(0,0,0,0.4)',
                  transform: isSelected
                    ? 'translateY(-12px) scale(1.03)'
                    : isHovered
                      ? 'translateY(-8px)'
                      : 'translateY(0)',
                  cursor: 'pointer',
                  animation: mounted ? `card-enter 0.5s ease-out ${delay}s both` : 'none',
                  background: 'var(--surface)',
                }}
              >
                {/* ── Propaganda Card Background ── */}
                <div
                  className="absolute inset-0 transition-all duration-300"
                  style={{
                    backgroundImage: `url(${cardImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: isSelected ? 'brightness(0.7)' : isHovered ? 'brightness(0.55)' : 'brightness(0.4)',
                  }}
                />

                {/* ── Dark Overlay ── */}
                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{
                    background: isSelected
                      ? `linear-gradient(180deg, transparent 0%, ${c.color}33 30%, ${c.color}66 100%)`
                      : isHovered
                        ? `linear-gradient(180deg, transparent 0%, rgba(10,10,15,0.7) 40%, rgba(10,10,15,0.85) 100%)`
                        : 'linear-gradient(180deg, transparent 0%, rgba(10,10,15,0.8) 50%, rgba(10,10,15,0.95) 100%)',
                  }}
                />

                {/* ── Top accent line (glows on hover/select) ── */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-300"
                  style={{
                    background: isSelected
                      ? `linear-gradient(90deg, transparent, ${c.color}, transparent)`
                      : isHovered
                        ? `linear-gradient(90deg, transparent, ${c.color}88, transparent)`
                        : 'transparent',
                    boxShadow: isSelected ? `0 0 12px ${c.color}` : isHovered ? `0 0 6px ${c.color}66` : 'none',
                  }}
                />

                {/* ── Faction color strip at top ── */}
                <div
                  className="absolute top-[2px] left-3 right-3 h-[1px] transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${c.color}, transparent)`,
                    opacity: isSelected ? 1 : isHovered ? 0.6 : 0.2,
                  }}
                />

                {/* ── Card Content (bottom-aligned) ── */}
                <div className="relative z-10 p-3 flex flex-col gap-1.5">
                  {/* Continent Name */}
                  <h3
                    className="font-orbitron text-sm font-bold tracking-wide leading-tight"
                    style={{
                      color: isSelected ? '#fff' : c.color,
                      textShadow: `0 0 10px ${c.color}88`,
                    }}
                  >
                    {c.name}
                  </h3>

                  {/* Description */}
                  <p
                    className="font-rajdhani text-[11px] leading-snug"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {c.description}
                  </p>

                  {/* ── Stats Row ── */}
                  <div className="flex gap-2 mt-0.5">
                    <div className="flex flex-col items-center" style={{ flex: 1 }}>
                      <span className="font-mono-data text-[7px] tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        GDP
                      </span>
                      <span className="font-mono-data text-[9px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        ${c.gdp1960}B
                      </span>
                    </div>
                    <div className="flex flex-col items-center" style={{ flex: 1 }}>
                      <span className="font-mono-data text-[7px] tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        ENERGY
                      </span>
                      <span className="font-mono-data text-[9px] font-bold" style={{ color: 'var(--amber)' }}>
                        {c.energy1960}
                      </span>
                    </div>
                    <div className="flex flex-col items-center" style={{ flex: 1 }}>
                      <span className="font-mono-data text-[7px] tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        TECH
                      </span>
                      <span className="font-mono-data text-[9px] font-bold" style={{ color: 'var(--cyan)' }}>
                        Lv.{c.techLevel}
                      </span>
                    </div>
                  </div>

                  {/* ── Divider ── */}
                  <div
                    className="w-full h-px my-0.5"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${c.color}44, transparent)`,
                    }}
                  />

                  {/* ── Special Bonus ── */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: c.color,
                        boxShadow: `0 0 6px ${c.color}`,
                      }}
                    />
                    <span
                      className="font-mono-data text-[8px] tracking-wide"
                      style={{ color: c.color }}
                    >
                      {c.specialBonus}
                    </span>
                  </div>
                </div>

                {/* ── Selection indicator (corner check) ── */}
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                      background: c.color,
                      boxShadow: `0 0 10px ${c.color}`,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Selected Faction Info ─── */}
        {selectedContinent && (
          <div
            className="flex items-center gap-3 px-5 py-2.5 rounded-lg"
            style={{
              background: `${selectedContinent.color}15`,
              border: `1px solid ${selectedContinent.color}44`,
              boxShadow: `0 0 20px ${selectedContinent.color}22`,
              animation: 'card-enter 0.3s ease-out forwards',
            }}
          >
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{
                background: selectedContinent.color,
                boxShadow: `0 0 8px ${selectedContinent.color}`,
              }}
            />
            <span className="font-orbitron text-xs tracking-wide" style={{ color: selectedContinent.color }}>
              {selectedContinent.name}
            </span>
            <span className="font-rajdhani text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              |
            </span>
            <span className="font-rajdhani text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {selectedContinent.specialBonus}
            </span>
          </div>
        )}

        {/* ─── Begin Button ─── */}
        <div className="flex justify-center">
          <button
            onClick={handleBegin}
            disabled={!selected}
            className="px-10 py-3.5 rounded font-orbitron text-sm font-black tracking-[0.2em] transition-all duration-300"
            style={{
              background: selected
                ? 'linear-gradient(135deg, var(--cyan), #00c8d5)'
                : 'var(--surface)',
              color: selected ? '#0A0A0F' : 'var(--text-tertiary)',
              border: selected ? '2px solid var(--cyan)' : '2px solid var(--border)',
              cursor: selected ? 'pointer' : 'not-allowed',
              opacity: selected ? 1 : 0.5,
              boxShadow: selected
                ? '0 0 30px rgba(0,240,255,0.4), 0 0 60px rgba(0,240,255,0.15)'
                : 'none',
              transform: selected ? 'scale(1)' : 'scale(0.98)',
            }}
            onMouseEnter={e => {
              if (selected) {
                e.currentTarget.style.transform = 'scale(1.06)';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(0,240,255,0.6), 0 0 80px rgba(0,240,255,0.2)';
              }
            }}
            onMouseLeave={e => {
              if (selected) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0,240,255,0.4), 0 0 60px rgba(0,240,255,0.15)';
              }
            }}
          >
            {selected ? 'BEGIN →' : 'SELECT A FACTION'}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          RESPONSIVE OVERRIDES (inline media query)
          ═══════════════════════════════════════════════ */}
      <style>{`
        @media (max-width: 900px) {
          .grid { grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; }
        }
        @media (max-width: 768px) {
          .grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; max-width: 480px !important; margin: 0 auto; }
        }
        @media (max-width: 480px) {
          .grid { grid-tem        @media (max-width: 480px) {
          .grid { grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
        }
      `}</style>

      {videoSrc && (
        <VideoPlayer src={videoSrc} onComplete={handleVideoComplete} />
      )}
    </div>
  );
}
