import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../App';
import type { GameState } from '../../game/types';
import { play } from '../../hooks/useSound';
import { continentById } from '../../game/data';
import { t } from '../../i18n';

const DONE_KEY = 'terra_compute_tutorial_done';

interface Step {
  title: string;
  text: string;
  /** data-tutorial anchor to highlight. */
  target?: string;
  /** Advances automatically when true; otherwise a NEXT button is shown. */
  done?: (s: GameState, start: GameState) => boolean;
}

const countType = (s: GameState, type: string) => s.map?.tiles.filter(t => t.building?.type === type).length ?? 0;

/** Advisor title for the faction. Called at render time so the dictionary is ready. */
function greeting(code: string): string {
  switch (code) {
    case 'su': case 'cn': return t('Comrade Director');
    case 'na': return t('President');
    case 'eu': return t('Director-General');
    default: return t('Director');
  }
}

function intro(s: GameState): Step {
  const continent = continentById(s.playerContinent ?? '')?.name;
  const name = continent ? t(continent) : t('Your bloc');
  return {
    title: greeting(s.playerContinent ?? ''),
    text: t('{name} enters the race to superintelligence in {year}. Grow a healthy nation, out-research seven rivals and ignite a SAFE superintelligence — without cooking the planet. The clock is paused while you read.', { name, year: s.startYear }),
  };
}

/** The lesson steps. Built at render time (not module load) so t() sees the loaded language. */
function buildSteps(): Step[] {
  return [
    { title: '', text: '' },   // step 0 is filled in by intro() with the faction and start year
    { title: t('The command map'), text: t('Drag or use the arrow keys to move, scroll to zoom, double-click to focus. The sector map in the corner jumps the camera anywhere.'), target: 'minimap' },
    { title: t('Construction'), text: t('Open BUILD [B]. Every building is placed on a tile of your continent.'), target: 'cmd-buildings', done: s => s.overlay === 'buildings' },
    { title: t('Feed the people'), text: t('Choose Collective Farm → PLACE ON MAP. Green tiles give a bonus: river valleys +50%, next to other farms +10%. Click a green tile.'), target: 'side', done: (s, start) => countType(s, 'farm') > countType(start, 'farm') },
    { title: t('Science'), text: t('Open TECH [T] and start researching the Transistor. Research unlocks every new building.'), target: 'cmd-tech', done: s => !!s.researching || s.unlockedTechs.length > 0 },
    { title: t('Decrees'), text: t('Open ECONOMY [E] and adopt your first decree. Each one has a real price — and slots are scarce.'), target: 'cmd-economy', done: s => s.policies.length > 0 },
    { title: t('Read the gauges'), text: t('Every gauge explains itself: hover it to see what raises or lowers it. Food, housing, jobs and power keep approval up.'), target: 'hud' },
    { title: t('Directives & the race'), text: t('The right panel tracks the race, the planet and your directives — each pays a cash bonus. Steel and chips feed your industry: produce them or pay import prices.'), target: 'side' },
    { title: t('Good luck'), text: t('Press SPACE to pause any time, Esc for the menu. History will interrupt you with decisions and breakthrough exercises. Press START and the clock begins to run.') },
  ];
}

export default function Tutorial() {
  const { state, dispatch } = useGame();
  const [step, setStep] = useState(0);
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(DONE_KEY) === '1'; } catch { return false; }
  });
  const start = useRef<GameState>(state);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const first = useMemo(() => intro(state), [state.playerContinent, state.startYear]); // eslint-disable-line react-hooks/exhaustive-deps
  const steps = useMemo(() => buildSteps(), []);
  const cur = step === 0 ? first : steps[step];

  // Start paused so the first lessons can be read calmly; START resumes the clock.
  useEffect(() => {
    if (!hidden && !state.paused) dispatch({ type: 'TOGGLE_PAUSE' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    setHidden(true);
    if (state.paused) dispatch({ type: 'TOGGLE_PAUSE' });
    try { localStorage.setItem(DONE_KEY, '1'); } catch { /* storage unavailable */ }
  };

  // Auto-advance on completion
  useEffect(() => {
    if (hidden || !cur?.done) return;
    if (cur.done(state, start.current)) {
      play('coin');
      start.current = state;
      setStep(i => i + 1);
    }
  }, [state, cur, hidden]);

  // Track the highlighted element
  useEffect(() => {
    if (hidden || !cur?.target) { setRect(null); return; }
    const update = () => {
      const el = document.querySelector(`[data-tutorial="${cur.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    const id = setInterval(update, 400);
    return () => clearInterval(id);
  }, [cur, hidden]);

  const progress = useMemo(() => `${Math.min(step + 1, steps.length)}/${steps.length}`, [step, steps]);
  if (hidden || !cur || state.activeEvent) return null;

  return (
    <>
      {rect && (
        <div className="fixed pointer-events-none z-[70] rounded-lg animate-pulse-glow"
          style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12, border: '2px solid #FFD166', boxShadow: '0 0 0 4000px rgba(0,0,0,0.25), 0 0 24px #FFD16688' }} />
      )}
      <div className="absolute z-[71] left-[calc(50%-150px)] max-[900px]:left-1/2 -translate-x-1/2 bottom-[86px] w-[min(520px,92%)] rounded-lg p-3 animate-fade-up"
        style={{ background: 'rgba(10,11,16,0.96)', border: '1px solid #FFD166', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono-data text-[10px] tracking-[0.25em]" style={{ color: '#FFD166' }}>{t('ADVISOR · {progress}', { progress })}</span>
          <button onClick={finish} className="font-mono-data text-[9.5px] hover:brightness-150" style={{ color: 'var(--text-tertiary)' }}>{t('SKIP TUTORIAL')} ✕</button>
        </div>
        <div className="font-orbitron text-[15px] font-bold mb-1" style={{ color: '#FFF4C2' }}>{cur.title}</div>
        <p className="font-rajdhani text-[14px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{cur.text}</p>
        {!cur.done && (
          <div className="flex justify-end mt-2">
            <button onClick={() => { play('click'); if (step + 1 >= steps.length) finish(); else setStep(step + 1); }}
              className="font-mono-data text-[11px] px-4 py-1 rounded hover:brightness-125"
              style={{ color: '#050508', background: '#FFD166' }}>
              {(step + 1 >= steps.length ? t('START') : t('NEXT')) + ' ▶'}
            </button>
          </div>
        )}
        {cur.done && <div className="font-mono-data text-[9.5px] mt-1.5" style={{ color: 'var(--amber)' }}>▸ {t('Do it to continue')}</div>}
      </div>
    </>
  );
}

export function resetTutorial() {
  try { localStorage.removeItem(DONE_KEY); } catch { /* storage unavailable */ }
}
