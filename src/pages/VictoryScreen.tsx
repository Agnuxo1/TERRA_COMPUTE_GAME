import { useEffect, useRef } from 'react';
import { useGame } from '../App';
import { play } from '../hooks/useSound';

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
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{zIndex:0}}/>
      <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-up">
        <h1 className="font-orbitron text-5xl font-black tracking-wider" style={{
          color: '#FFD700',
          textShadow: '0 0 30px rgba(255,215,0,0.4)',
        }}>
          VICTORY
        </h1>

        <p className="font-rajdhani text-lg text-center" style={{color:'var(--text-secondary)'}}>
          You have achieved Safe Artificial Superintelligence.
        </p>

        <div className="panel-elevated px-8 py-4 flex flex-col items-center gap-3" style={{maxWidth:'500px'}}>
          <div className="grid grid-cols-3 gap-6">
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>YEAR ACHIEVED</span>
              <span className="font-orbitron text-xl" style={{color:'var(--cyan)'}}>{state.victoryYear}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>COMPUTE</span>
              <span className="font-mono-data text-lg" style={{color:'var(--green)'}}>{fmtNumber(state.compute)}F</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>SAFETY</span>
              <span className="font-orbitron text-xl" style={{color:'var(--green)'}}>{Math.floor(state.safety)}%</span>
            </div>
          </div>
          <div className="w-full h-px" style={{background:'var(--border)'}}/>
          <div className="grid grid-cols-3 gap-6">
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>BUILDINGS</span>
              <span className="font-orbitron text-lg" style={{color:'var(--amber)'}}>{state.totalBuildings}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>TECHS</span>
              <span className="font-orbitron text-lg" style={{color:'var(--purple)'}}>{state.totalTechs}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>EFFICIENCY</span>
              <span className="font-mono-data text-lg" style={{color:'var(--cyan)'}}>{state.algorithmicEfficiency.toFixed(2)}x</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
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
  );
}
