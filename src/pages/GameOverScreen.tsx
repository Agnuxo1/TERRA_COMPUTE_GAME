import { useEffect, useRef } from 'react';
import { useGame } from '../App';
import { play } from '../hooks/useSound';

export default function GameOverScreen() {
  const { state, dispatch } = useGame();
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

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{zIndex:0}}/>
      <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-up">
        <h1 className="font-orbitron text-5xl font-black tracking-wider" style={{
          color: 'var(--rose)',
          textShadow: '0 0 30px rgba(255,71,126,0.4)',
        }}>
          DEFEAT
        </h1>

        <div className="panel-elevated px-6 py-4 flex flex-col items-center gap-2" style={{maxWidth:'420px'}}>
          <p className="font-rajdhani text-base text-center" style={{color:'var(--text-secondary)'}}>
            {state.gameOverReason || 'Your civilization has fallen.'}
          </p>
          <div className="flex gap-6 mt-2">
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>YEAR</span>
              <span className="font-orbitron text-lg" style={{color:'var(--cyan)'}}>{Math.floor(state.year)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>BUILDINGS</span>
              <span className="font-orbitron text-lg" style={{color:'var(--amber)'}}>{state.totalBuildings}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>TECHS</span>
              <span className="font-orbitron text-lg" style={{color:'var(--green)'}}>{state.totalTechs}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button onClick={handleRetry}
            className="px-6 py-2.5 rounded font-orbitron text-sm font-bold"
            style={{background:'var(--cyan)', color:'#000'}}>
            TRY AGAIN
          </button>
          <button onClick={handleMenu}
            className="px-6 py-2.5 rounded font-orbitron text-sm"
            style={{background:'var(--surface)', color:'var(--text-secondary)', border:'1px solid var(--border)'}}>
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
