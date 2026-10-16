import { createContext, lazy, Suspense, useContext, useEffect, useReducer } from 'react';
import TitleScreen from './pages/TitleScreen';
import ModeSelect from './pages/ModeSelect';
import ContinentSelect from './pages/ContinentSelect';
import GameScreen from './pages/GameScreen';
import { gameReducer, initialState, type Action } from './game/engine';
import type { GameMode, GameState } from './game/types';
import { botDecide } from './game/bot';

// The game rules live in src/game (pure TypeScript, testable headless).
// This file only wires the reducer into React and routes between screens.
export { continents, buildings, techs } from './game/data';
export type { GameState } from './game/types';
export type { Action } from './game/engine';

const GameContext = createContext<{ state: GameState; dispatch: React.Dispatch<Action> } | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  // Dev shortcut: ?quick=eu&mode=complete jumps straight into a game.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const q = new URLSearchParams(window.location.search);
    const quick = q.get('quick');
    if (!quick) return;
    const mode = (q.get('mode') as GameMode) || 'complete';
    let s = gameReducer({ ...initialState, gameMode: mode }, { type: 'START_GAME', continentId: quick, seed: Number(q.get('seed')) || undefined });
    // &autoplay=2025 lets the scripted bot play until that year (for testing late-game screens).
    const until = Number(q.get('autoplay'));
    if (until) {
      while (s.screen === 'game' && s.year < until) {
        s = gameReducer(botDecide({ ...s, playerLaunchReady: false }), { type: 'TICK' });
      }
      s = { ...s, paused: true };
    }
    dispatch({ type: 'LOAD_STATE', state: s });
  }, []);
  // Dev-only test hook (headless QA scripts drive the game through it).
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __terra: unknown }).__terra = { state, dispatch };
  }, [state]);
  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

// Screens reached only at the end of a game (or from the menu) load on demand: they carry the chart library.
const GameOverScreen = lazy(() => import('./pages/GameOverScreen'));
const VictoryScreen = lazy(() => import('./pages/VictoryScreen'));
const LogicModeScreen = lazy(() => import('./pages/LogicModeScreen'));

function Router() {
  const { state } = useGame();
  switch (state.screen) {
    case 'title': return <TitleScreen />;
    case 'mode': return <ModeSelect />;
    case 'select': return <ContinentSelect />;
    case 'game': return <GameScreen />;
    case 'logic': return <LogicModeScreen />;
    case 'gameover': return <GameOverScreen />;
    case 'victory': return <VictoryScreen />;
    default: return <TitleScreen />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <div className="game-container crt">
        <Suspense fallback={<div className="w-full h-full" style={{ background: 'var(--bg, #0A0A0F)' }} />}>
          <Router />
        </Suspense>
      </div>
    </GameProvider>
  );
}
