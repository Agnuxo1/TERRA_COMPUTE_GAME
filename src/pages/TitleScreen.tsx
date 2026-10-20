import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../App';
import { play, enableAudio } from '../hooks/useSound';
import Translator from '../components/game/Translator';
import SettingsForm from '../components/meta/SettingsForm';
import SaveSlots, { latestSave, slotLabel } from '../components/meta/SaveSlots';
import { loadGame, type SaveSlot } from '../game/save';
import { ACHIEVEMENTS, getUnlocked } from '../game/achievements';
import { t } from '../i18n';

type Panel = 'howto' | 'settings' | 'credits' | 'load' | 'achievements';

export default function TitleScreen() {
  const { dispatch } = useGame();
  const [audioOn, setAudioOn] = useState(false);
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [latest, setLatest] = useState(() => latestSave());
  const [unlocked] = useState(() => getUnlocked());
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
  const openPanel=(panel:Panel)=>{play('click');setActivePanel(activePanel===panel?null:panel);};
  const loadSlot=(slot:SaveSlot)=>{
    const s=loadGame(slot);
    if(!s){setLatest(latestSave());return false;}
    play('coin');
    dispatch({type:'LOAD_STATE',state:s});
    return true;
  };
  // Invite links (?room=CODE) go straight to the war room.
  useEffect(()=>{ if(new URLSearchParams(window.location.search).get('room')) dispatch({type:'SET_SCREEN',screen:'lobby'}); },[dispatch]);


  const buttons:Array<{label:string;action:()=>void;icon:string;sub?:string}>=[
    ...(latest?[{label:t('CONTINUE'),action:()=>{play('click');loadSlot(latest.slot);},icon:'↻',
      sub:t('{slot} · {year}', {slot: slotLabel(latest.slot), year: latest.year})}]:[]),
    {label:t('NEW GAME'),action:handleNewGame,icon:'▶'},
    {label:t('WAR ROOM · MULTIPLAYER'),action:()=>{play('click');dispatch({type:'SET_SCREEN',screen:'lobby'});},icon:'☢',sub:t('Up to 8 players · peer-to-peer')},
    {label:t('LOAD GAME'),action:()=>openPanel('load'),icon:'⇩'},
    {label:t('HOW TO PLAY'),action:()=>openPanel('howto'),icon:'?'},
    {label:t('ACHIEVEMENTS'),action:()=>openPanel('achievements'),icon:'♛'},
    {label:t('SETTINGS'),action:()=>openPanel('settings'),icon:'⚙'},
    {label:t('CREDITS'),action:()=>openPanel('credits'),icon:'★'},
  ];

  const panelBgMap:Record<string,string>={
    howto:'./assets/cards/action-tech.png',
    settings:'./assets/cards/action-pause.png',
    credits:'./assets/cards/event-coldwar91.png',
    load:'./assets/cards/action-pause.png',
    achievements:'./assets/cards/action-tech.png',
  };
  const unlockedCount=ACHIEVEMENTS.filter(a=>unlocked[a.id]).length;

  return (
    <div className="relative w-full h-full flex" style={{background:'var(--void)'}}>
      {/* Translator */}
      <div className="absolute top-3 right-3 z-50"><Translator/></div>

      {/* Canvas background */}
      <canvas ref={canvasRef} className="absolute inset-0" style={{zIndex:0}}/>

      {/* Title & Buttons */}
      <div className="title-col relative z-10 flex-1 flex flex-col items-center gap-8 px-4 py-4 overflow-y-auto" style={{minHeight:0}}>
        <style>{`.title-col>:first-of-type{margin-top:auto}.title-col>:last-child{margin-bottom:auto}@media (max-height:620px){.title-col{gap:0.9rem}.title-btn{padding-top:0.35rem!important;padding-bottom:0.35rem!important}}`}</style>

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
            {t('TERRA COMPUTE')}
          </h1>

          <div style={{width:'100%',maxWidth:'400px',height:'1px',
            background:'linear-gradient(to right,transparent,#33FF33,transparent)',opacity:0.6}}/>

          <p className="font-orbitron tracking-widest uppercase"
            style={{fontSize:'clamp(0.6rem,1.2vw,0.85rem)',color:'#33FF33',
              textShadow:'0 0 8px rgba(51,255,51,0.3),0 1px 2px rgba(0,0,0,0.6)',
              letterSpacing:'0.4em'}}>
            {t('Race to Artificial Superintelligence')}
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
              className="title-btn w-full text-left flex items-center gap-3 px-4 py-2.5 rounded transition-all
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
              {btn.sub&&(
                <span className="ml-auto font-mono-data text-[8.5px]" style={{color:'#33FF33',opacity:0.6}}>{btn.sub}</span>
              )}
            </button>
          ))}

          <div className="flex items-center gap-1 mt-1 px-1">
            <div style={{width:'100%',height:'1px',background:'var(--border)'}}/>
            <span className="font-mono-data text-[8px]" style={{color:'#33FF33',whiteSpace:'nowrap',opacity:0.5}}>
              {t('v{version} — Built with AI', { version: __APP_VERSION__ })}
            </span>
            <div style={{width:'100%',height:'1px',background:'var(--border)'}}/>
          </div>

          <button onClick={()=>{enableAudio();setAudioOn(true);play('click');}}
            className="font-mono-data text-[8px] px-2 py-0.5 rounded self-center transition-all
              hover:shadow-[0_0_8px_rgba(51,255,51,0.2)]"
            style={{background:'var(--surface-elevated)',color:'#33FF33',
              border:'1px solid rgba(51,255,51,0.3)',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>
            {audioOn?t('AUDIO ON'):t('ENABLE AUDIO')}
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
            style={{borderBottom:'1px solid var(--border)',background:'rgba(22,25,36,0.7)',backdropFilter:'blur(4px)',paddingRight:'92px'}}>
            <h2 className="font-orbitron text-xs font-bold"
              style={{color:'#33FF33',textShadow:'0 1px 3px rgba(0,0,0,0.9)'}}>
              {activePanel==='howto'&&t('HOW TO PLAY')}
              {activePanel==='settings'&&t('SETTINGS')}
              {activePanel==='credits'&&t('CREDITS')}
              {activePanel==='load'&&t('LOAD GAME')}
              {activePanel==='achievements'&&t('ACHIEVEMENTS {done}/{total}', {done: unlockedCount, total: ACHIEVEMENTS.length})}
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
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>{t('OBJECTIVE')}</h3>
                  <p className="font-rajdhani text-xs leading-relaxed">
                    {t('Lead your continental bloc from 1960. Build your continent tile by tile — homes, farms, schools, hospitals, kombinats, universities, labs and power — and be the first to ignite a SAFE superintelligence without collapsing the planet.')}
                  </p>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>{t('VICTORY CONDITIONS')}</h3>
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 w-5 h-5 rounded flex items-center justify-center font-bold text-[10px]"
                      style={{background:'rgba(51,255,51,0.1)',color:'#33FF33',border:'1px solid rgba(51,255,51,0.3)'}}>V</div>
                    <div>
                      <span className="font-rajdhani text-xs font-bold" style={{color:'#33FF33'}}>{t('Safe ASI')}</span>
                      <p className="font-mono-data text-[9px]" style={{color:'var(--text-tertiary)'}}>
                        {t('Superintelligence Theory + 1 YottaFLOP of compute, then IGNITE with alignment ≥ 80%')}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#FF477E'}}>{t('DEFEAT CONDITIONS')}</h3>
                  <div className="flex flex-col gap-1.5">
                    {[
                      {icon:'P',text:t('Planet health reaches 0% (climate collapse)'),clr:'#00E5A0'},
                      {icon:'R',text:t('Any bloc ignites an unaligned ASI'),clr:'#7B61FF'},
                      {icon:'A',text:t('A rival ignites a safe ASI before you'),clr:'#00F0FF'},
                      {icon:'V',text:t('Revolution: approval under 20% for 3 years'),clr:'#FF8C42'},
                      {icon:'B',text:t('Bankruptcy: debt spirals for 3 years'),clr:'#FF477E'},
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
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>{t('CONTROLS')}</h3>
                  <div className="flex flex-col gap-0.5 font-mono-data text-[9px]" style={{color:'var(--text-secondary)'}}>
                    <div className="flex justify-between"><span>[B]</span><span style={{color:'var(--text-primary)'}}>{t('Open Build Menu')}</span></div>
                    <div className="flex justify-between"><span>[T]</span><span style={{color:'var(--text-primary)'}}>{t('Open Tech Tree')}</span></div>
                    <div className="flex justify-between"><span>[D] [S] [A]</span><span style={{color:'var(--text-primary)'}}>{t('Diplomacy · Spy · Covert ops')}</span></div>
                    <div className="flex justify-between"><span>{t('[Click map]')}</span><span style={{color:'var(--text-primary)'}}>{t('Inspect / build on a tile')}</span></div>
                    <div className="flex justify-between"><span>{t('[Wheel · drag]')}</span><span style={{color:'var(--text-primary)'}}>{t('Zoom · pan the continent')}</span></div>
                    <div className="flex justify-between"><span>[M]</span><span style={{color:'var(--text-primary)'}}>{t('Continent / world view')}</span></div>
                    <div className="flex justify-between"><span>[Space]</span><span style={{color:'var(--text-primary)'}}>{t('Pause / Resume')}</span></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>{t('TIPS')}</h3>
                  <ul className="font-mono-data text-[8px] flex flex-col gap-0.5 list-none" style={{paddingLeft:0}}>
                    {[t('Green tiles = location bonus: farms on rivers, solar on deserts, labs next to universities'),
                      t('Food, housing and jobs keep approval up — hover any gauge for the full breakdown'),
                      t('Every building costs upkeep each year: upgrade to level 3 instead of spreading out'),
                      t('Alignment must keep pace with compute: Safety Institutes + safety research'),
                      t('Coal is cheap but heats the planet; nuclear, solar and Climate Accords save it'),
                      t('Spy on the front-runner — a reckless rival can end the world for everyone')].map(tip=>(
                      <li key={tip} style={{display:'flex',gap:'4px'}}>
                        <span style={{color:'#33FF33'}}>◆</span><span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* SETTINGS */}
            {activePanel==='settings'&&(
              <div className="flex flex-col gap-3">
                <SettingsForm accent="#33FF33"/>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-1 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>{t('DIFFICULTY')}</h3>
                  <p className="font-mono-data text-[9px]" style={{color:'var(--text-tertiary)'}}>{t('Chosen per game on the faction screen, next to BEGIN.')}</p>
                </div>
              </div>
            )}

            {/* LOAD GAME */}
            {activePanel==='load'&&(
              <div className="flex flex-col gap-2">
                <SaveSlots mode="load" accent="#33FF33" allowDelete onPick={loadSlot} onChanged={()=>setLatest(latestSave())}/>
                <p className="font-mono-data text-[8.5px]" style={{color:'var(--text-tertiary)'}}>{t('Saves live in this browser. The AUTO slot is written every few in-game years (see Settings).')}</p>
              </div>
            )}

            {/* ACHIEVEMENTS */}
            {activePanel==='achievements'&&(
              <div className="flex flex-col gap-1.5">
                <div className="w-full h-1.5 rounded-sm overflow-hidden mb-1" style={{background:'rgba(255,255,255,0.06)'}}>
                  <div style={{width:`${(unlockedCount/ACHIEVEMENTS.length)*100}%`,height:'100%',background:'#33FF33',boxShadow:'0 0 8px #33FF33'}}/>
                </div>
                {ACHIEVEMENTS.map(a=>{
                  const at=unlocked[a.id];
                  return (
                    <div key={a.id} className="flex items-start gap-2 p-2 rounded"
                      style={{background:at?'rgba(51,255,51,0.06)':'rgba(255,255,255,0.02)',
                        border:`1px solid ${at?'rgba(51,255,51,0.35)':'var(--border)'}`,opacity:at?1:0.6}}>
                      <div className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-[12px]"
                        style={{background:at?'rgba(51,255,51,0.12)':'transparent',color:at?'#33FF33':'var(--text-tertiary)',
                          border:`1px solid ${at?'rgba(51,255,51,0.4)':'var(--border-light)'}`}}>
                        {at?a.icon:'✕'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-orbitron text-[9.5px] font-bold tracking-wider" style={{color:at?'#33FF33':'var(--text-secondary)'}}>{at?t(a.name):t('{name} · LOCKED', {name: t(a.name)})}</div>
                        <div className="font-rajdhani text-[11.5px] leading-tight" style={{color:'var(--text-secondary)'}}>{t(a.description)}</div>
                        {at&&<div className="font-mono-data text-[8.5px]" style={{color:'var(--text-tertiary)'}}>{t('Unlocked {date}', {date: new Date(at).toLocaleDateString()})}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CREDITS */}
            {activePanel==='credits'&&(
              <div className="flex flex-col gap-4" style={{color:'var(--text-secondary)'}}>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 6px rgba(51,255,51,0.3)'}}>{t('DEVELOPER')}</h3>
                  <p className="font-rajdhani text-sm font-bold" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>{t('Francisco Angulo de Lafuente')}</p>
                  <a href="https://github.com/Agnuxo1" target="_blank" rel="noopener noreferrer"
                    className="font-mono-data text-[9px] hover:underline"
                    style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.2)'}}>
                    github.com/Agnuxo1
                  </a>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>{t('INSPIRATION')}</h3>
                  <p className="font-rajdhani text-xs"><strong style={{color:'#FFB84D'}}>{t('Risk')}</strong> {t('— Territory control')}</p>
                  <p className="font-rajdhani text-xs"><strong style={{color:'#33FF33'}}>{t('StarCraft')}</strong> {t('— RTS interface')}</p>
                  <p className="font-rajdhani text-xs"><strong style={{color:'#00E5A0'}}>{t('Civilization')}</strong> {t('— Historical progression')}</p>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>{t('DATA SOURCES')}</h3>
                  <div className="font-mono-data text-[9px] flex flex-col gap-0.5">
                    <span>◆ {t('World Bank — GDP & Population')}</span>
                    <span>◆ {t('IMF — Economic indicators')}</span>
                    <span>◆ {t('EIA — Energy statistics')}</span>
                    <span>◆ {t('Epoch AI — Training compute')}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-orbitron text-[10px] mb-2 tracking-wider" style={{color:'#33FF33',textShadow:'0 0 4px rgba(51,255,51,0.3)'}}>{t('TECHNOLOGY')}</h3>
                  <div className="font-mono-data text-[9px] flex flex-col gap-0.5">
                    <span>◆ {t('React 19 + TypeScript')}</span>
                    <span>◆ {t('Tailwind CSS v3')}</span>
                    <span>◆ {t('Vite v7')}</span>
                    <span>◆ {t('Web Audio API')}</span>
                  </div>
                </div>
                <div className="p-2.5 rounded text-center" style={{background:'var(--surface-elevated)',border:'1px solid var(--border)'}}>
                  <p className="font-mono-data text-[8px]" style={{color:'var(--text-tertiary)'}}>{t('Version 1.0 — 2025')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
