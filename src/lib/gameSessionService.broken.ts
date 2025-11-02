import { supabase } from './supabase';
import type { 
  GameSession, 
  Player, 
  Turn, 
  ActiveGameSession, 
  SessionLeaderboard, 
  QuizAction,
  SessionConfig
} from '../types/session';
import { DEFAULT_SESSION_CONFIG } from '../types/session';

/**
 * Service for managing multiplayer game sessions
 */
export class GameSessionService {
  private static instance: GameSessionService;
  private currentSession: ActiveGameSession | null = null;
  private sessionConfig: SessionConfig = DEFAULT_SESSION_CONFIG;

  static getInstance(): GameSessionService {
    if (!GameSessionService.instance) {
      GameSessionService.instance = new GameSessionService();
    }
    return GameSessionService.instance;
  }

  // Session Management
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

    // Create players with randomized order
    const shuffledNames = this.shuffleArray([...playerNames]);
    const players = playerNames.map((name, index) => ({
      session_id: session.id,
      name,
      order_position: index,
      score: 0,
      // active_tricks: [], // REMOVED: Estas columnas ya no existen en el nuevo sistema
      // pending_treats: [], // REMOVED: Ahora se usan las tablas player_tricks y player_treats
      completed_quizzes: []
    }));

    const { data: createdPlayers, error: playersError } = await supabase
      .from('players')
      .insert(players)
      .select();

    if (playersError) throw playersError;

    // Create initial turn state (first player)
    const firstPlayer = createdPlayers[0];
    const { error: turnError } = await supabase
      .from('turns')
      .insert({
        session_id: session.id,
        current_player_id: firstPlayer.id,
        turn_index: 0
      });

    if (turnError) throw turnError;

    // Return the full session data
    return this.getActiveSession(session.id);
  }

  async getActiveSession(sessionId: string): Promise<ActiveGameSession> {
    const { data, error } = await supabase
      .from('active_game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    
    this.currentSession = data;
    return data;
  }

  async getUserSessions(): Promise<ActiveGameSession[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Must be authenticated to get sessions');

    const { data, error } = await supabase
      .from('active_game_sessions')
      .select('*')
      .eq('host_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getSessionPlayers(sessionId: string): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_position');

    if (error) throw error;
    return data || [];
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
    const { data, error } = await supabase
      .rpc('get_session_leaderboard', { session_uuid: sessionId });

    if (error) throw error;
    return data || [];
  }

  // Turn Management
  async nextTurn(sessionId: string): Promise<Player> {
    const players = await this.getSessionPlayers(sessionId);
    const currentTurn = await this.getCurrentTurn(sessionId);
    
    if (!currentTurn) throw new Error('No turn state found');

    const nextIndex = (currentTurn.turn_index + 1) % players.length;
    const nextPlayer = players[nextIndex];

    const { error } = await supabase
      .from('turns')
      .update({
        current_player_id: nextPlayer.id,
        turn_index: nextIndex
      })
      .eq('session_id', sessionId);

    if (error) throw error;
    return nextPlayer;
  }

  async setCurrentPlayer(sessionId: string, playerId: string): Promise<void> {
    const players = await this.getSessionPlayers(sessionId);
    const playerIndex = players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) throw new Error('Player not found');

    const { error } = await supabase
      .from('turns')
      .update({
        current_player_id: playerId,
        turn_index: playerIndex
      })
      .eq('session_id', sessionId);

    if (error) throw error;
  }

  // Player Management
  async addPlayer(sessionId: string, name: string): Promise<Player> {
    const players = await this.getSessionPlayers(sessionId);
    const newOrderPosition = players.length;

    const { data, error } = await supabase
      .from('players')
      .insert({
        session_id: sessionId,
        name,
        order_position: newOrderPosition,
        score: 0,
        // active_tricks: [], // REMOVED: Columnas obsoletas
        // pending_treats: [], // REMOVED: Columnas obsoletas
        completed_quizzes: []
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updatePlayerScore(playerId: string, scoreChange: number): Promise<void> {
    const { error } = await supabase
      .rpc('increment_player_score', { 
        player_uuid: playerId, 
        score_increment: scoreChange 
      });

    if (error) {
      // Fallback to manual update if RPC doesn't exist
      const { data: player } = await supabase
        .from('players')
        .select('score')
        .eq('id', playerId)
        .single();

      if (player) {
        await supabase
          .from('players')
          .update({ score: player.score + scoreChange })
          .eq('id', playerId);
      }
    }
  }

  // Quiz Action Processing
  async processQuizAction(action: QuizAction): Promise<void> {
    const { type, quiz_id, player_id, completed, deserted, points_earned } = action;

    if (type === 'select_trick') {
      // Add trick to active_tricks or handle desertion
      if (deserted) {
        await this.removeTrickFromPlayer(player_id, quiz_id);
        // No points for deserted tricks
      } else {
        await this.addTrickToPlayer(player_id, quiz_id);
        // Award points for accepting trick
        const points = points_earned || this.sessionConfig.points_per_trick;
        await this.updatePlayerScore(player_id, points);
      }
    } else if (type === 'select_treat') {
      if (completed) {
        await this.completeTreatForPlayer(player_id, quiz_id);
        // Award points for completed treat
        const points = points_earned || this.sessionConfig.points_per_treat;
        await this.updatePlayerScore(player_id, points);
      } else {
        await this.addTreatToPlayer(player_id, quiz_id);
      }
    }
  }

  private async addTrickToPlayer(playerId: string, quizId: string): Promise<void> {
    // TODO: Implementar usando el nuevo sistema de player_tricks después de la migración
    console.warn('addTrickToPlayer temporalmente deshabilitado hasta ejecutar migración');
  }

  private async removeTrickFromPlayer(playerId: string, quizId: string): Promise<void> {
    // TODO: Implementar usando el nuevo sistema de player_tricks después de la migración
    console.warn('removeTrickFromPlayer temporalmente deshabilitado hasta ejecutar migración');
  }

  private async addTreatToPlayer(playerId: string, quizId: string): Promise<void> {
    // TODO: Implementar usando el nuevo sistema de player_treats después de la migración  
    console.warn('addTreatToPlayer temporalmente deshabilitado hasta ejecutar migración');
  }

  private async completeTreatForPlayer(playerId: string, quizId: string): Promise<void> {
    // TODO: Implementar usando el nuevo sistema de player_treats después de la migración
    console.warn('completeTreatForPlayer temporalmente deshabilitado hasta ejecutar migración');
  }

  // Agregar función shuffleArray que falta
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  }

  // Session State Management
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

  async endSession(sessionId: string): Promise<void> {
    await this.pauseSession(sessionId);
    this.currentSession = null;
  }

  // Utility methods
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Local Storage for session persistence
  saveSessionToLocalStorage(sessionId: string): void {
    localStorage.setItem('qr_game_current_session', sessionId);
  }

  loadSessionFromLocalStorage(): string | null {
    return localStorage.getItem('qr_game_current_session');
  }

  clearSessionFromLocalStorage(): void {
    localStorage.removeItem('qr_game_current_session');
  }
}

// Export singleton instance
export const gameSessionService = GameSessionService.getInstance();