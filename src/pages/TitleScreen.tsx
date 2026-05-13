import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../App';
import { play, enableAudio, isAudioEnabled } from '../hooks/useSound';
import Translator from '../components/game/Translator';

export default function TitleScreen() {
  const { dispatch } = useGame();
  const [audioOn, setAudioOn] = useState(false);
  const [activePanel, setActivePanel] = useState<'howto' | 'settings' | 'credits' | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Array<{x:number;y:number;vx:number;vy:number;size:number;alpha:number}>>([]);

  const initParticles = useCallback(() => {
    const w = window.innerWidth, h = window.innerHeight;
    particles.current = Array.from({length:120},()=>({
      x:Math.random()*w,y:Math.random()*h,
      vx:(Math.random()-0.5)*0.3,vy:(Math.random()-0.5)*0.3,
      size:Math.random()*2+0.5,alpha:Math.random()*0.6+0.2,
    }));
  },[]);

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    const resize=()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;initParticles();};
    resize();window.addEventListener('resize',resize);
    let frame:number;
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(const p of particles.current){
        p.x+=p.vx;p.y+=p.vy;
        if(p.x<0)p.x=canvas.width;if(p.x>canvas.width)p.x=0;
        if(p.y<0)p.y=canvas.height;if(p.y>canvas.height)p.y=0;
        ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        ctx.fillStyle=`rgba(51,255,51,${p.alpha})`;ctx.fill();
      }
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);};
  },[initParticles]);

  const handleNewGame=()=>{play('click');dispatch({type:'SET_SCREEN',screen:'mode'});};
  const openPanel=(panel:'howto'|'settings'|'credits')=>{play('click');setActivePanel(activePanel===panel?null:panel);};

  const buttons=[
    {label:'NEW GAME',action:handleNewGame,icon:'▶'},
    {label:'HOW TO PLAY',action:()=>openPanel('howto'),icon:'?'},
    {label:'SETTINGS',action:()=>openPanel('settings'),icon:'⚙'},
    {label:'CREDITS',action:()=>openPanel('credits'),icon:'★'},
  ];

  const panelBgMap:Record<string,string>={
    howto:'/assets/cards/action-tech.png',
    settings:'/assets/cards/action-pause.png',
    credits:'/assets/cards/event-coldwar91.png',
  };

  return (
    <div className="relative w-full h-full flex" style={{background:'var(--void)'}}>
      {/* Translator */}
      <div className="absolute top-3 right-3 z-50"><Translator/></div>

      {/* Canvas background */}
      <canvas ref={canvasRef} className="absolute inset-0" style={{zIndex:0}}/>

      {/* Title & Buttons */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center gap-8 px-4">

        {/* Title */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-1">
            <div style={{width:'12px',height:'12px',borderRadius:'2px',background:'#33FF33',boxShadow:'0 0 8px rgba(51,255,51,0.5)',transform:'rotate(45deg)'}}/>
            <div style={{width:'8px',height:'8px',borderRadius:'1px',background:'#33FF33',marginLeft:'6px',boxShadow:'0 0 6px rgba(51,255,51,0.4)',opacity:0.7}}/>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#33FF33',marginLeft:'8px',boxShadow:'0 0 5px rgba(51,255,51,0.4)',opacity:0.5}}/>
          </div>

          <h1 className="font-orbitron font-black tracking-widest uppercase"
            style={{fontSize:'clamp(2rem,5vw,4rem)',color:'#33FF33',
              textShadow:'0 0 20px rgba(51,255,51,0.4),0 2px 4px rgba(0,0,0,0.8),0 4px 12px rgba(0,0,0,0.5)',
              letterSpacing:'0.15em'}}>
            TERRA COMPUTE
          </h1>

          <div style={{width:'100%',maxWidth:'400px',height:'1px',
            background:'linear-gradient(to right,transparent,#33FF33,transparent)',opacity:0.6}}/>

          <p className="font-orbitron tracking-widest uppercase"
            style={{fontSize:'clamp(0.6rem,1.2vw,0.85rem)',color:'#33FF33',
              textShadow:'0 0 8px rgba(51,255,51,0.3),0 1px 2px rgba(0,0,0,0.6)',
              letterSpacing:'0.4em'}}>
            Race to Artificial Superintelligence
          </p>

          <p className="font-mono-data"
            style={{fontSize:'0.65rem',color:'#33FF33',letterSpacing:'0.1em',marginTop:'2px',
              textShadow:'0 0 6px rgba(51,255,51,0.3)'}}>
            1960 — 2035
          </p>
        </div>

        {/* Buttons - Phosphor Green Retro-PC Style */}
        <div className="flex flex-col gap-2 w-72">
          {buttons.map(btn=>(
            <button key={btn.label} onClick={btn.action}
              className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded transition-all
                hover:shadow-[0_0_12px_rgba(51,255,51,0.25)] hover:border-[#33FF33]"
              style={{
                background:'var(--surface-elevated)',
                color:'#33FF33',
                border:'1.5px solid rgba(51,255,51,0.3)',
                textShadow:'0 0 8px rgba(51,255,51,0.4)',
              }}>
              <span className="font-orbitron text-sm font-bold"
                style={{color:'#33FF33',opacity:0.7,textShadow:'0 0 6px rgba(51,255,51,0.5)'}}>
                {btn.icon}
              </span>
              <span className="font-orbitron text-[10px] font-bold tracking-widest">
                {btn.label}
              </span>
            </button>
          ))}

          <div className="flex items-center gap-1 mt-1 px-1">
            <div style={{width:'100%',height:'1px',background:'var(--border)'}}/>
            <span className="font-mono-data text-[8px]" style={{color:'#33FF33',whiteSpace:'nowrap',opacity:0.5}}>
              v1.0 — Built with AI
            </span>
            <div style={{width:'100%',height:'1px',background:'var(--border)'}}/>
          </div>

          <button onClick={()=>{enableAudio();setAudioOn(true);play('click');}}
            className="font-mono-data text-[8px] px-2 py-0.5 rounded self-center transition-all
              hover:shadow-[0_0_8px_rgba(51,255,51,0.2)]"
            style={{background:'var(--surface-elevated)',color:'#33FF33',
              border:'1px solid rgba(51,255,51,0.3)',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>
            {audioOn?'AUDIO ON':'ENABLE AUDIO'}
          </button>
        </div>
      </div>

      {/* Side Panel */}
      {activePanel&&(
        <div className="relative z-10 shrink-0 flex flex-col overflow-hidden"
          style={{width:'320px',background:'var(--surface)',borderLeft:'1px solid var(--border)'}}>

          {/* Card background */}
          <div className="absolute inset-0"
            style={{backgroundImage:`url(${panelBgMap[activePanel]||''})`,backgroundSize:'cover',
              backgroundPosition:'center',opacity:0.35,filter:'saturate(0.7)'}}/>
          <div className="absolute inset-0"
            style={{background:'linear-gradient(to bottom,rgba(10,10,15,0.92) 0%,rgba(10,10,15,0.85) 40%,rgba(10,10,15,0.90) 100%)'}}/>

          {/* Header */}
          <div className="relative flex items-center justify-between p-3 shrink-0"
            style={{borderBottom:'1px solid var(--border)',background:'rgba(22,25,36,0.7)',backdropFilter:'blur(4px)'}}>
            <h2 className="font-orbitron text-xs font-bold"
              style={{color:'#33FF33',textShadow:'0 1px 3px rgba(0,0,0,0.9)'}}>
              {activePanel==='howto'&&'HOW TO PLAY'}
              {activePanel==='settings'&&'SETTINGS'}
              {activePanel==='credits'&&'CREDITS'}
            </h2>
            <button onClick={()=>{play('click');setActivePanel(null);}}
              className="px-2 py-0.5 rounded font-mono-data text-[9px] hover:brightness-125"
              style={{background:'rgba(51,255,51,0.1)',color:'#33FF33',
                border:'1px solid rgba(51,255,51,0.3)'}}>✕</button>
          </div>

          {/* Content */}
          <div className="relative flex-1 overflow-auto p-4" style={{minHeight:0}}>

            {/* HOW TO PLAY */}
            {activePanel==='howto'&&(
              <div className="flex flex-col gap-4" style={{color:'var(--text-secondary)'}}>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>OBJECTIVE</h3>
                  <p className="font-rajdhani text-xs leading-relaxed">
                    Lead your continental bloc from 1960 to 2035. Build research infrastructure, manage energy, and research technologies to be the first to achieve Safe Artificial Superintelligence (ASI).
                  </p>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>VICTORY CONDITIONS</h3>
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 w-5 h-5 rounded flex items-center justify-center font-bold text-[10px]"
                      style={{background:'rgba(51,255,51,0.1)',color:'#33FF33',border:'1px solid rgba(51,255,51,0.3)'}}>V</div>
                    <div>
                      <span className="font-rajdhani text-xs font-bold" style={{color:'#33FF33'}}>Safe ASI</span>
                      <p className="font-mono-data text-[9px]" style={{color:'var(--text-tertiary)'}}>
                        Compute ≥ 1e24 FLOPS + Safety ≥ 80% + Year ≥ 2030
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#FF477E'}}>DEFEAT CONDITIONS</h3>
                  <div className="flex flex-col gap-1.5">
                    {[
                      {icon:'E',text:'Energy depleted',clr:'#FFB84D'},
                      {icon:'B',text:'Bankruptcy',clr:'#FF477E'},
                      {icon:'C',text:'Political collapse',clr:'#FF8C42'},
                      {icon:'R',text:'Rogue ASI',clr:'#7B61FF'},
                    ].map(d=>(
                      <div key={d.text} className="flex items-center gap-2">
                        <div className="shrink-0 w-5 h-5 rounded flex items-center justify-center font-bold text-[10px]"
                          style={{background:d.clr+'22',color:d.clr,border:`1px solid ${d.clr}44`}}>{d.icon}</div>
                        <span className="font-rajdhani text-xs font-bold" style={{color:'#FF477E'}}>{d.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>CONTROLS</h3>
                  <div className="flex flex-col gap-0.5 font-mono-data text-[9px]" style={{color:'var(--text-secondary)'}}>
                    <div className="flex justify-between"><span>[B]</span><span style={{color:'var(--text-primary)'}}>Open Build Menu</span></div>
                    <div className="flex justify-between"><span>[T]</span><span style={{color:'var(--text-primary)'}}>Open Tech Tree</span></div>
                    <div className="flex justify-between"><span>[D]</span><span style={{color:'var(--text-primary)'}}>Open Diplomacy</span></div>
                    <div className="flex justify-between"><span>[Space]</span><span style={{color:'var(--text-primary)'}}>Pause / Resume</span></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>TIPS</h3>
                  <ul className="font-mono-data text-[8px] flex flex-col gap-0.5 list-none" style={{paddingLeft:0}}>
                    {['Build power plants early — energy is critical',
                      "Don't neglect Safety — Defense Grid prevents rogue AI",
                      'Balance compute buildings with energy production',
                      'Watch for historical events — they can help or hurt',
                      'AI opponents are also building — check Diplomacy tab'].map(t=>(
                      <li key={t} style={{display:'flex',gap:'4px'}}>
                        <span style={{color:'#33FF33'}}>◆</span><span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* SETTINGS */}
            {activePanel==='settings'&&(
              <div className="flex flex-col gap-4" style={{color:'var(--text-secondary)'}}>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>AUDIO</h3>
                  <button onClick={()=>{enableAudio();setAudioOn(true);play('click');}}
                    className="w-full py-2 rounded font-orbitron text-[9px] font-bold tracking-wider
                      hover:shadow-[0_0_8px_rgba(51,255,51,0.2)]"
                    style={{background:'rgba(51,255,51,0.1)',color:'#33FF33',
                      border:'1px solid rgba(51,255,51,0.3)'}}>
                    {audioOn?'AUDIO ON':'ENABLE AUDIO'}
                  </button>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>GAME SPEED</h3>
                  <div className="flex flex-col gap-0.5 font-mono-data text-[9px]">
                    <div className="flex justify-between"><span>[1]</span><span style={{color:'var(--text-primary)'}}>1x — Normal</span></div>
                    <div className="flex justify-between"><span>[2]</span><span style={{color:'var(--text-primary)'}}>2x — Fast</span></div>
                    <div className="flex justify-between"><span>[3]</span><span style={{color:'var(--text-primary)'}}>3x — Ultra</span></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>DIFFICULTY</h3>
                  <div className="p-2 rounded" style={{background:'var(--surface-elevated)',border:'1px solid var(--border)'}}>
                    <span className="font-bold font-orbitron text-[9px]" style={{color:'#FFB84D'}}>Standard</span>
                    <p className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>Balanced AI opponents. Events occur normally.</p>
                  </div>
                </div>
              </div>
            )}

            {/* CREDITS */}
            {activePanel==='credits'&&(
              <div className="flex flex-col gap-4" style={{color:'var(--text-secondary)'}}>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 6px rgba(51,255,51,0.3)'}}>DEVELOPER</h3>
                  <p className="font-rajdhani text-sm font-bold" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>Francisco Angulo de Lafuente</p>
                  <a href="https://github.com/Agnuxo1" target="_blank" rel="noopener noreferrer"
                    className="font-mono-data text-[9px] hover:underline"
                    style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.2)'}}>
                    github.com/Agnuxo1
                  </a>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>INSPIRATION</h3>
                  <p className="font-rajdhani text-xs"><strong style={{color:'#FFB84D'}}>Risk</strong> — Territory control</p>
                  <p className="font-rajdhani text-xs"><strong style={{color:'#33FF33'}}>StarCraft</strong> — RTS interface</p>
                  <p className="font-rajdhani text-xs"><strong style={{color:'#00E5A0'}}>Civilization</strong> — Historical progression</p>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>DATA SOURCES</h3>
                  <div className="font-mono-data text-[9px] flex flex-col gap-0.5">
                    <span>◆ World Bank — GDP & Population</span>
                    <span>◆ IMF — Economic indicators</span>
                    <span>◆ EIA — Energy statistics</span>
                    <span>◆ Epoch AI — Training compute</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>TECHNOLOGY</h3>
                  <div className="font-mono-data text-[9px] flex flex-col gap-0.5">
                    <span>◆ React 19 + TypeScript</span>
                    <span>◆ Tailwind CSS v3</span>
                    <span>◆ Vite v7</span>
                    <span>◆ Web Audio API</span>
                  </div>
                </div>
                <div className="p-2.5 rounded text-center" style={{background:'var(--surface-elevated)',border:'1px solid var(--border)'}}>
                  <p className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>Version 1.0 — 2025</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
