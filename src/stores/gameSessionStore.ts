import type { GameSessionState, ActiveGameSession, Player, Turn, SessionLeaderboard } from '../types/session';
import { gameSessionService } from '../lib/gameSessionService';

// Simple store implementation for Astro/React
class GameSessionStore {
  private state: GameSessionState;
  private listeners: Set<(state: GameSessionState) => void> = new Set();

  constructor() {
    this.state = {
      session: null,
      players: [],
      currentPlayer: null,
      turn: null,
      leaderboard: []
    };
  }

  // Subscribe to state changes
  subscribe(listener: (state: GameSessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state); // Call immediately with current state
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get current state
  getState(): GameSessionState {
    return { ...this.state };
  }

  // Update state and notify listeners
  private setState(newState: Partial<GameSessionState>): void {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(listener => listener(this.state));
  }

  // Actions
  async loadSession(sessionId: string) {
    try {
      const [session, players, turn, leaderboard] = await Promise.all([
        gameSessionService.getActiveSession(sessionId),
        gameSessionService.getSessionPlayers(sessionId),
        gameSessionService.getCurrentTurn(sessionId),
        gameSessionService.getSessionLeaderboard(sessionId)
      ]);

      const currentPlayer = players.find(p => p.id === turn?.current_player_id) || null;

      this.setState({
        session,
        players,
        currentPlayer,
        turn,
        leaderboard
      });

      // Save to localStorage for persistence
      gameSessionService.saveSessionToLocalStorage(sessionId);
    } catch (error) {
      console.error('Failed to load session:', error);
      throw error;
    }
  }

  async createSession(sessionName: string, playerNames: string[]) {
    try {
      const session = await gameSessionService.createSession(sessionName, playerNames);
      await this.loadSession(session.id);
      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  async nextTurn() {
    if (!this.state.session) throw new Error('No active session');

    try {
      const nextPlayer = await gameSessionService.nextTurn(this.state.session.id);
      await this.refreshSessionData();
      return nextPlayer;
    } catch (error) {
      console.error('Failed to advance turn:', error);
      throw error;
    }
  }

  async setCurrentPlayer(playerId: string) {
    if (!this.state.session) throw new Error('No active session');

    try {
      await gameSessionService.setCurrentPlayer(this.state.session.id, playerId);
      await this.refreshSessionData();
    } catch (error) {
      console.error('Failed to set current player:', error);
      throw error;
    }
  }

  async addPlayer(name: string) {
    if (!this.state.session) throw new Error('No active session');

    try {
      const newPlayer = await gameSessionService.addPlayer(this.state.session.id, name);
      await this.refreshSessionData();
      return newPlayer;
    } catch (error) {
      console.error('Failed to add player:', error);
      throw error;
    }
  }

  async processQuizAction(action: any) {
    if (!this.state.session) throw new Error('No active session');

    try {
      await gameSessionService.processQuizAction(action);
      await this.refreshSessionData();
    } catch (error) {
      console.error('Failed to process quiz action:', error);
      throw error;
    }
  }

  async pauseSession() {
    if (!this.state.session) throw new Error('No active session');

    try {
      await gameSessionService.pauseSession(this.state.session.id);
      this.setState({
        session: this.state.session ? { ...this.state.session, is_active: false } : null
      });
    } catch (error) {
      console.error('Failed to pause session:', error);
      throw error;
    }
  }

  async resumeSession() {
    if (!this.state.session) throw new Error('No active session');

    try {
      await gameSessionService.resumeSession(this.state.session.id);
      this.setState({
        session: this.state.session ? { ...this.state.session, is_active: true } : null
      });
    } catch (error) {
      console.error('Failed to resume session:', error);
      throw error;
    }
  }

  async endSession() {
    if (!this.state.session) throw new Error('No active session');

    try {
      await gameSessionService.endSession(this.state.session.id);
      gameSessionService.clearSessionFromLocalStorage();
      this.setState({
        session: null,
        players: [],
        currentPlayer: null,
        turn: null,
        leaderboard: []
      });
    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  }

  async refreshSessionData() {
    if (!this.state.session) return;
    await this.loadSession(this.state.session.id);
  }

  clearSession() {
    gameSessionService.clearSessionFromLocalStorage();
    this.setState({
      session: null,
      players: [],
      currentPlayer: null,
      turn: null,
      leaderboard: []
    });
  }

  async loadPersistedSession() {
    const sessionId = gameSessionService.loadSessionFromLocalStorage();
    if (sessionId) {
      try {
        await this.loadSession(sessionId);
        return true;
      } catch (error) {
        console.warn('Failed to load persisted session:', error);
        gameSessionService.clearSessionFromLocalStorage();
        return false;
      }
    }
    return false;
  }

  // Getters for convenient access
  get currentSession(): ActiveGameSession | null {
    return this.state.session;
  }

  get players(): Player[] {
    return this.state.players;
  }

  get currentPlayer(): Player | null {
    return this.state.currentPlayer;
  }

  get leaderboard(): SessionLeaderboard[] {
    return this.state.leaderboard;
  }

  get isSessionActive(): boolean {
    return !!this.state.session?.is_active;
  }
}

// Export singleton instance
export const gameSessionStore = new GameSessionStore();