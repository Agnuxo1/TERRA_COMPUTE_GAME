import { useEffect, useRef } from 'react';
import { useGame } from '../App';
import { play } from '../hooks/useSound';
import EndStats from '../components/meta/EndStats';

function fmtNumber(n: number): string {
  if (n >= 1e24) return (n / 1e24).toFixed(1) + 'Y';
  if (n >= 1e21) return (n / 1e21).toFixed(1) + 'Z';
  if (n >= 1e18) return (n / 1e18).toFixed(1) + 'E';
  if (n >= 1e15) return (n / 1e15).toFixed(1) + 'P';
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  return n.toExponential(1);
}

export default function VictoryScreen() {
  const { state, dispatch } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    play('victory');
    try {
      localStorage.setItem('terra_compute_complete_unlocked', '1');
    } catch {
      // storage unavailable
    }
  }, []);

  // Golden particles
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

    interface VParticle {
      x: number; y: number; vy: number;
      size: number; alpha: number; hue: number;
    }
    const particles: VParticle[] = [];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vy: -Math.random() * 1.5 - 0.3,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.8 + 0.2,
        hue: 40 + Math.random() * 20,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.y += p.vy;
        p.alpha += Math.sin(Date.now() * 0.002 + p.x) * 0.01;
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${Math.max(0, Math.min(1, p.alpha))})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handlePlayAgain = () => {
    play('click');
    dispatch({ type: 'SET_SCREEN', screen: 'select' });
  };

  const handleMenu = () => {
    play('click');
    dispatch({ type: 'SET_SCREEN', screen: 'title' });
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{zIndex:0}}/>
      <div className="absolute inset-0 z-10 overflow-auto">
      <div className="min-h-full w-full flex flex-col items-center justify-center gap-3 px-3 py-4 mx-auto animate-fade-up" style={{maxWidth:'1000px'}}>
        <h1 className="font-orbitron font-black tracking-wider text-center" style={{
          fontSize: 'clamp(1.6rem, min(5vw, 7vh), 3rem)', lineHeight: 1.05,
          color: '#FFD700',
          textShadow: '0 0 30px rgba(255,215,0,0.4)',
        }}>
          VICTORY
        </h1>

        <p className="font-rajdhani text-sm text-center leading-snug" style={{color:'var(--text-secondary)', maxWidth:'640px'}}>
          {state.gameOverReason || 'You have achieved Safe Artificial Superintelligence.'}
        </p>

        <div className="panel-elevated px-5 py-2.5 flex flex-wrap justify-center items-center gap-x-6 gap-y-1" style={{maxWidth:'720px'}}>
          <div className="contents">
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>YEAR ACHIEVED</span>
              <span className="font-orbitron text-base" style={{color:'var(--cyan)'}}>{state.victoryYear}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>COMPUTE</span>
              <span className="font-mono-data text-base" style={{color:'var(--green)'}}>{fmtNumber(state.compute)}F</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>ALIGNMENT</span>
              <span className="font-orbitron text-base" style={{color:'var(--green)'}}>{Math.floor(state.alignment)}%</span>
            </div>
          </div>
          <div className="contents">
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>BUILDINGS</span>
              <span className="font-orbitron text-base" style={{color:'var(--amber)'}}>{state.totalBuildings}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>TECHS</span>
              <span className="font-orbitron text-base" style={{color:'var(--purple)'}}>{state.totalTechs}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>PLANET</span>
              <span className="font-mono-data text-base" style={{color:'var(--cyan)'}}>{Math.round(state.planetHealth)}%</span>
            </div>
          </div>
        </div>

        <EndStats state={state} accent="#FFD700" />

        <div className="flex gap-3">
          <button onClick={handlePlayAgain}
            className="px-6 py-2.5 rounded font-orbitron text-sm font-bold"
            style={{background:'#FFD700', color:'#000'}}>
            PLAY AGAIN
          </button>
          <button onClick={handleMenu}
            className="px-6 py-2.5 rounded font-orbitron text-sm"
            style={{background:'var(--surface)', color:'var(--text-secondary)', border:'1px solid var(--border)'}}>
            MAIN MENU
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
