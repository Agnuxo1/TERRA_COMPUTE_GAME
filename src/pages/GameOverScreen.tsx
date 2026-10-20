import { useEffect, useRef } from 'react';
import { useGame } from '../App';
import { play } from '../hooks/useSound';
import EndStats from '../components/meta/EndStats';
import ScoreCard from '../components/meta/ScoreCard';
import Newspaper from '../components/game/Newspaper';
import { pickEnding } from '../game/endings';
import { t } from '../i18n';

// Built at render time so the copy follows the active language.
function outcomeTitles(): Record<string, string> {
  return {
    rival_asi: t('RACE LOST'),
    rogue_rival: t('ROGUE SUPERINTELLIGENCE'),
    rogue_self: t('MISALIGNED'),
    climate: t('PLANETARY COLLAPSE'),
    revolution: t('REVOLUTION'),
    bankrupt: t('BANKRUPTCY'),
    timeout: t('WINDOW CLOSED'),
    // Alternative victories normally end on the victory screen; titled here too in case one is shown.
    governance: t('WORLD ASSEMBLY VICTORY'),
    silicon: t('SILICON HEGEMONY'),
    custodian: t('SHARED VICTORY'),
  };
}
function outcomeLessons(): Record<string, string> {
  return {
    rival_asi: t('RESEARCH FASTER · SABOTAGE THE LEADER · SIGN SAFETY TREATIES TO SLOW THEM'),
    rogue_rival: t('A RECKLESS RIVAL IGNITED FIRST — SPY, SABOTAGE AND BIND THEM WITH SAFETY TREATIES'),
    rogue_self: t('NEVER IGNITE BELOW THE REQUIRED ALIGNMENT'),
    climate: t('CLEAN ENERGY · FORESTS · CLIMATE ACCORDS'),
    revolution: t('FOOD, HOMES, JOBS AND FAIR TAXES KEEP THE PEOPLE ON YOUR SIDE'),
    bankrupt: t('WATCH UPKEEP — EVERY BUILDING COSTS MONEY EVERY YEAR'),
    timeout: t('THE FINAL TECHS AND A YOTTAFLOP MUST ARRIVE BEFORE 2040'),
  };
}

export default function GameOverScreen() {
  const { state, dispatch } = useGame();
  const ending = pickEnding(state);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    play('defeat');
  }, []);

  // Glitch particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    interface GParticle {
      x: number; y: number; vx: number; vy: number;
      size: number; color: string; life: number;
    }
    const particles: GParticle[] = [];
    const colors = ['#FF477E', '#FF0000', '#550000', '#330000'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        size: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: Math.random(),
      });
    }

    let animId: number;
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.005;
        if (p.life <= 0 || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.life = 1;
          p.vx = (Math.random() - 0.5) * 3;
          p.vy = (Math.random() - 0.5) * 3;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 0.6;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleRetry = () => {
    play('click');
    dispatch({ type: 'SET_SCREEN', screen: 'select' });
  };

  const handleMenu = () => {
    play('click');
    dispatch({ type: 'SET_SCREEN', screen: 'title' });
  };

  const outcomeTitle = outcomeTitles();
  const outcomeLesson = outcomeLessons();

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{zIndex:0}}/>
      <div className="absolute inset-0 z-10 overflow-auto">
      <div className="min-h-full w-full flex flex-col items-center justify-center gap-3 px-3 py-4 mx-auto animate-fade-up" style={{maxWidth:'1000px'}}>
        <h1 className="font-orbitron font-black tracking-wider text-center" style={{
          fontSize: 'clamp(1.6rem, min(5vw, 7vh), 3rem)', lineHeight: 1.05,
          color: 'var(--rose)',
          textShadow: '0 0 30px rgba(255,71,126,0.4)',
        }}>
          {outcomeTitle[state.outcome ?? ''] ?? t('DEFEAT')}
        </h1>
        <div className="font-mono-data text-[10px] tracking-[0.25em] -mt-1 text-center" style={{ color: 'var(--text-tertiary)' }}>
          {outcomeLesson[state.outcome ?? ''] ?? ''}
        </div>

        <div className="panel-elevated px-5 py-2.5 flex flex-col items-center gap-1" style={{maxWidth:'640px'}}>
          <p className="font-rajdhani text-sm text-center leading-snug" style={{color:'var(--text-secondary)'}}>
            {state.gameOverReason || t('Your civilization has fallen.')}
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-1">
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>{t('YEAR')}</span>
              <span className="font-orbitron text-base" style={{color:'var(--cyan)'}}>{Math.floor(state.year)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>{t('BUILDINGS')}</span>
              <span className="font-orbitron text-base" style={{color:'var(--amber)'}}>{state.totalBuildings}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>{t('TECHS')}</span>
              <span className="font-orbitron text-base" style={{color:'var(--green)'}}>{state.totalTechs}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>{t('PEAK COMPUTE')}</span>
              <span className="font-orbitron text-base" style={{color:'var(--cyan)'}}>10^{state.peakCapability.toFixed(1)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>{t('PLANET')}</span>
              <span className="font-orbitron text-base" style={{color: state.planetHealth > 40 ? 'var(--green)' : 'var(--rose)'}}>{Math.round(state.planetHealth)}%</span>
            </div>
          </div>
        </div>

        <Newspaper year={state.victoryYear || Math.floor(state.year)} headline={ending.headline} text={ending.text} />

        <ScoreCard state={state} />

        <EndStats state={state} accent="var(--rose)" />

        <div className="flex gap-3">
          <button onClick={handleRetry}
            className="px-6 py-2.5 rounded font-orbitron text-sm font-bold"
            style={{background:'var(--cyan)', color:'#000'}}>
            {t('TRY AGAIN')}
          </button>
          <button onClick={handleMenu}
            className="px-6 py-2.5 rounded font-orbitron text-sm"
            style={{background:'var(--surface)', color:'var(--text-secondary)', border:'1px solid var(--border)'}}>
            {t('MAIN MENU')}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
