import { useEffect, useState } from 'react';
import type { GameSessionState } from '../types/session';
import { gameSessionStore } from '../stores/gameSessionStore';

// React hook for using the game session store
export function useGameSession() {
  const [state, setState] = useState<GameSessionState>(gameSessionStore.getState());

  useEffect(() => {
    const unsubscribe = gameSessionStore.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    // State
    session: state.session,
    players: state.players,
    currentPlayer: state.currentPlayer,
    turn: state.turn,
    leaderboard: state.leaderboard,
    isSessionActive: gameSessionStore.isSessionActive,

    // Actions
    loadSession: gameSessionStore.loadSession.bind(gameSessionStore),
    createSession: gameSessionStore.createSession.bind(gameSessionStore),
    nextTurn: gameSessionStore.nextTurn.bind(gameSessionStore),
    setCurrentPlayer: gameSessionStore.setCurrentPlayer.bind(gameSessionStore),
    addPlayer: gameSessionStore.addPlayer.bind(gameSessionStore),
    processQuizAction: gameSessionStore.processQuizAction.bind(gameSessionStore),
    pauseSession: gameSessionStore.pauseSession.bind(gameSessionStore),
    resumeSession: gameSessionStore.resumeSession.bind(gameSessionStore),
    endSession: gameSessionStore.endSession.bind(gameSessionStore),
    refreshSessionData: gameSessionStore.refreshSessionData.bind(gameSessionStore),
    clearSession: gameSessionStore.clearSession.bind(gameSessionStore),
    loadPersistedSession: gameSessionStore.loadPersistedSession.bind(gameSessionStore),
  };
}

// Simplified hooks for specific data
export function useCurrentSession() {
  const { session } = useGameSession();
  return session;
}

export function useSessionPlayers() {
  const { players } = useGameSession();
  return players;
}

export function useCurrentPlayer() {
  const { currentPlayer } = useGameSession();
  return currentPlayer;
}

export function useSessionLeaderboard() {
  const { leaderboard } = useGameSession();
  return leaderboard;
}