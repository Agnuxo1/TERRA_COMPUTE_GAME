import { createContext, useContext, useEffect, useReducer } from 'react';
import TitleScreen from './pages/TitleScreen';
import ModeSelect from './pages/ModeSelect';
import ContinentSelect from './pages/ContinentSelect';
import GameScreen from './pages/GameScreen';
import GameOverScreen from './pages/GameOverScreen';
import VictoryScreen from './pages/VictoryScreen';
import LogicModeScreen from './pages/LogicModeScreen';
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
  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

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
        <Router />
      </div>
    </GameProvider>
  );
}
