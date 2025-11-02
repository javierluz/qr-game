import { supabase } from './supabase';
import type { ActiveGameSession, Player, Turn, SessionLeaderboard } from '../types/session';
import { dynamicScoringService } from './dynamicScoringService';

/**
 * Versión mínima temporal del GameSessionService 
 * Solo para crear sesiones básicas hasta ejecutar la migración completa
 */
class GameSessionService {
  private static instance: GameSessionService;

  private constructor() {}

  static getInstance(): GameSessionService {
    if (!GameSessionService.instance) {
      GameSessionService.instance = new GameSessionService();
    }
    return GameSessionService.instance;
  }

  // Session Management - Solo crear sesiones básicas
  async createSession(sessionName: string, playerNames: string[]): Promise<ActiveGameSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Must be authenticated to create a session');

    // Create the session
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        host_user_id: user.id,
        session_name: sessionName,
        is_active: true
      })
      .select()
      .single();

    if (sessionError) throw sessionError;
    if (!session || !session.id) throw new Error('Failed to create session: no session ID returned');

    // Create players with the correct column structure
    const players = playerNames.map((name, index) => ({
      session_id: session.id,
      name,
      order_position: index,
      score: 0
      // Las columnas current_score, total_tricks_selected, etc. tienen valores por defecto
    }));

    const { data: createdPlayers, error: playersError } = await supabase
      .from('players')
      .insert(players)
      .select();

    if (playersError) throw playersError;
    if (!createdPlayers || createdPlayers.length === 0) throw new Error('Failed to create players');

    // Create initial turn record with first player
    const firstPlayer = createdPlayers[0];
    if (!firstPlayer || !firstPlayer.id) throw new Error('Failed to create first player: no player ID returned');
    
    const { error: turnError } = await supabase
      .from('turns')
      .insert({
        session_id: session.id,
        current_player_id: firstPlayer.id,
        turn_index: 0
      });

    if (turnError) throw turnError;

    return {
      ...session,
      players: createdPlayers,
      player_count: createdPlayers.length,
      current_player_id: firstPlayer.id,
      turn_index: 0,
      current_player_name: firstPlayer.name
    };
  }

  // Funciones mínimas requeridas por otros componentes
  async endSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('game_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (error) throw error;
  }

  async loadSession(sessionId: string): Promise<ActiveGameSession | null> {
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select(`
        *,
        players (*)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) return null;

    // Get current turn info
    const { data: turnData, error: turnError } = await supabase
      .from('turns')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    // Find current player
    const currentPlayer = session.players?.find((p: Player) => p.id === turnData?.current_player_id);

    return {
      ...session,
      player_count: session.players?.length || 0,
      current_player_id: turnData?.current_player_id || null,
      turn_index: turnData?.turn_index || 0,
      current_player_name: currentPlayer?.name || null
    };
  }

  async addPlayer(sessionId: string, name: string): Promise<Player> {
    // Get current player count for order position
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('order_position')
      .eq('session_id', sessionId)
      .order('order_position', { ascending: false })
      .limit(1);

    const newOrderPosition = existingPlayers && existingPlayers.length > 0 
      ? existingPlayers[0].order_position + 1 
      : 0;

    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert({
        session_id: sessionId,
        name,
        order_position: newOrderPosition,
        score: 0
        // Las demás columnas tienen valores por defecto
      })
      .select()
      .single();

    if (error) throw error;
    return newPlayer;
  }

  // Funciones temporalmente deshabilitadas hasta la migración
  async processQuizAction(action: any): Promise<void> {
    console.warn('processQuizAction temporalmente deshabilitado hasta ejecutar MIGRATION_DYNAMIC_SCORING.sql');
  }

  async pauseSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('game_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (error) throw error;
  }

  async resumeSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('game_sessions')
      .update({ is_active: true })
      .eq('id', sessionId);

    if (error) throw error;
  }

  async updatePlayerScore(playerId: string, points: number): Promise<void> {
    console.warn('updatePlayerScore temporalmente deshabilitado hasta ejecutar migración');
  }

  async getSessionById(sessionId: string): Promise<ActiveGameSession | null> {
    return this.loadSession(sessionId);
  }

  async getUserSessions(): Promise<ActiveGameSession[]> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No authenticated user found');
      return [];
    }

    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select(`
        *,
        players (*)
      `)
      .eq('host_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }

    return sessions || [];
  }

  // Funciones adicionales requeridas por los componentes
  async getActiveSession(sessionId: string): Promise<ActiveGameSession> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }
    return session;
  }

  async getSessionPlayers(sessionId: string): Promise<Player[]> {
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_position', { ascending: true });

    if (error) throw error;
    return players || [];
  }

  async nextTurn(sessionId: string): Promise<Player> {
    // Get current session and players
    const session = await this.getActiveSession(sessionId);
    const players = await this.getSessionPlayers(sessionId);
    
    if (players.length === 0) {
      throw new Error('No players found in session');
    }

    // Get current turn info
    const { data: currentTurn, error: turnError } = await supabase
      .from('turns')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (turnError) {
      throw new Error(`Error getting current turn: ${turnError.message}`);
    }

    // Find current player index
    const currentPlayerIndex = players.findIndex(p => p.id === currentTurn.current_player_id);
    
    // Calculate next player (circular)
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayer = players[nextPlayerIndex];

    // Update turn with next player
    const { error } = await supabase
      .from('turns')
      .update({ 
        current_player_id: nextPlayer.id,
        turn_index: (currentTurn.turn_index || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);

    if (error) throw error;

    return nextPlayer;
  }

  async getCurrentTurn(sessionId: string): Promise<Turn | null> {
    const { data, error } = await supabase
      .from('turns')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) return null;
    return data;
  }

  async getSessionLeaderboard(sessionId: string): Promise<SessionLeaderboard[]> {
    // Delegate to the dynamic scoring service
    return await dynamicScoringService.getSessionLeaderboard(sessionId);
  }

  // Local storage utilities
  loadSessionFromLocalStorage(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentSessionId');
    }
    return null;
  }

  saveSessionToLocalStorage(sessionId: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentSessionId', sessionId);
    }
  }

  clearSessionFromLocalStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentSessionId');
    }
  }

  // Turn action management for 1-quiz-per-turn limit
  async hasPlayerDoneQuizInCurrentTurn(playerId: string, sessionId: string): Promise<boolean> {
    try {
      // Get the current turn number from the latest turn_history entry for this player
      const { data: latestTurn, error: turnError } = await supabase
        .from('turn_history')
        .select('turn_number')
        .eq('player_id', playerId)
        .eq('session_id', sessionId)
        .order('turn_number', { ascending: false })
        .limit(1)
        .single();

      if (turnError || !latestTurn) {
        console.warn('No turn history found for player:', playerId);
        return false;
      }

      const currentTurnNumber = latestTurn.turn_number;

      // Check if player has already done a quiz action in this turn
      const { data: quizActions, error: historyError } = await supabase
        .from('turn_history')
        .select('id')
        .eq('player_id', playerId)
        .eq('session_id', sessionId)
        .eq('turn_number', currentTurnNumber)
        .in('action_taken', ['select_trick', 'select_treat']);

      if (historyError) {
        console.error('Error checking turn history:', historyError);
        return false;
      }

      return (quizActions?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking quiz action in current turn:', error);
      return false;
    }
  }

  async hasPlayerStartedCurrentTurn(playerId: string, sessionId: string): Promise<boolean> {
    try {
      // Get current session to find the actual current turn number
      const session = await this.getActiveSession(sessionId);
      if (!session) {
        console.warn('Session not found:', sessionId);
        return false;
      }

      // Use the turn number passed to the component, or derive from session state
      // For now, we'll look for the current turn based on the session's current player
      // Get current turn from the session's perspective
      const { data: sessionData } = await supabase
        .from('game_sessions')
        .select('current_turn_number')
        .eq('id', sessionId)
        .single();

      // If no turn number in session, estimate from player activity
      let currentTurnNumber = sessionData?.current_turn_number;
      
      if (!currentTurnNumber) {
        // Fallback: get latest turn from any player in this session
        const { data: latestSessionTurn } = await supabase
          .from('turn_history')
          .select('turn_number')
          .eq('session_id', sessionId)
          .order('turn_number', { ascending: false })
          .limit(1)
          .single();
          
        currentTurnNumber = latestSessionTurn?.turn_number || 1;
      }

      // Check if player has already started THIS specific turn number (not their latest turn)
      const { data: turnStartActions, error: historyError } = await supabase
        .from('turn_history')
        .select('id')
        .eq('player_id', playerId)
        .eq('session_id', sessionId)
        .eq('turn_number', currentTurnNumber)
        .eq('action_taken', 'turn_start');

      if (historyError) {
        console.error('Error checking turn start history:', historyError);
        return false;
      }

      const hasStarted = (turnStartActions?.length || 0) > 0;
      console.log(`hasPlayerStartedCurrentTurn: player ${playerId}, turn ${currentTurnNumber}, hasStarted: ${hasStarted}`);
      return hasStarted;
    } catch (error) {
      console.error('Error checking if player started current turn:', error);
      return false;
    }
  }

  async hasPlayerStartedSpecificTurn(playerId: string, sessionId: string, turnNumber: number): Promise<boolean> {
    try {
      // Check if player has already started THIS specific turn number
      const { data: turnStartActions, error: historyError } = await supabase
        .from('turn_history')
        .select('id')
        .eq('player_id', playerId)
        .eq('session_id', sessionId)
        .eq('turn_number', turnNumber)
        .eq('action_taken', 'turn_start');

      if (historyError) {
        console.error('Error checking turn start history:', historyError);
        return false;
      }

      const hasStarted = (turnStartActions?.length || 0) > 0;
      console.log(`hasPlayerStartedSpecificTurn: player ${playerId}, turn ${turnNumber}, hasStarted: ${hasStarted}`);
      return hasStarted;
    } catch (error) {
      console.error('Error checking if player started specific turn:', error);
      return false;
    }
  }
}

// Export singleton instance
export const gameSessionService = GameSessionService.getInstance();