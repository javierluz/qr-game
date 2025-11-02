import { supabase } from './supabase';
import type { SessionLeaderboard, QuizActionResult, PlayerTrick, PlayerTreat } from '../types/session';

export interface TrickOption {
  id: string;
  trick_text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface TreatOption {
  id: string;
  treat_text: string;
  sweetness: 'mild' | 'sweet' | 'very_sweet';
  points: number;
}

export interface PlayerTurnData {
  player_id: string;
  session_id: string;
  turn_type: 'trick' | 'treat';
  current_options: TrickOption[] | TreatOption[];
  available_tricks: string[];
  available_treats: string[];
}

export interface TurnStartResult {
  success: boolean;
  points_awarded: number;
  active_tricks_count: number;
  new_total_score: number;
}

/**
 * Service for handling dynamic scoring operations using the new relational database system
 * All operations use database functions instead of direct table manipulation
 */
class DynamicScoringService {

  /**
   * Start a new turn for a player, using database function for proper state management
   */
  async startPlayerTurn(playerId: string, sessionId: string, turnNumber: number): Promise<TurnStartResult> {
    try {
      // Primero verificar si el jugador ya inició este turno ESPECÍFICO
      const { gameSessionService } = await import('./gameSessionService');
      const alreadyStarted = await gameSessionService.hasPlayerStartedSpecificTurn(playerId, sessionId, turnNumber);
      
      if (alreadyStarted) {
        console.log(`Player has already started turn ${turnNumber}, skipping point award`);
        // Obtener el conteo de tricks activos actual para el resultado
        const { data: activeTricksData, error: tricksError } = await supabase
          .from('player_tricks')
          .select('id')
          .eq('player_id', playerId)
          .eq('session_id', sessionId)
          .eq('is_active', true);

        const activeTricksCount = activeTricksData?.length || 0;
        const currentScore = await this.calculatePlayerScore(playerId);

        return {
          success: true,
          points_awarded: 0, // No points awarded since turn already started
          active_tricks_count: activeTricksCount,
          new_total_score: currentScore
        };
      }

      // Obtener el conteo de tricks activos actual
      const { data: activeTricksData, error: tricksError } = await supabase
        .from('player_tricks')
        .select('id')
        .eq('player_id', playerId)
        .eq('session_id', sessionId)
        .eq('is_active', true);

      if (tricksError) {
        console.error('Error counting active tricks:', tricksError);
        return {
          success: false,
          points_awarded: 0,
          active_tricks_count: 0,
          new_total_score: 0
        };
      }

      const activeTricksCount = activeTricksData?.length || 0;

      // Llamar a la función de base de datos solo si no se ha iniciado el turno
      const { data: pointsAwarded, error } = await supabase.rpc('start_player_turn', {
        p_player_id: playerId,
        p_session_id: sessionId,
        p_turn_number: turnNumber
      });

      if (error) {
        console.error('Error starting player turn:', error);
        return {
          success: false,
          points_awarded: 0,
          active_tricks_count: activeTricksCount,
          new_total_score: 0
        };
      }

      // Obtener el nuevo puntaje total
      const newTotalScore = await this.calculatePlayerScore(playerId);

      return {
        success: true,
        points_awarded: pointsAwarded || 0,
        active_tricks_count: activeTricksCount,
        new_total_score: newTotalScore
      };
    } catch (error) {
      console.error('Exception in startPlayerTurn:', error);
      return {
        success: false,
        points_awarded: 0,
        active_tricks_count: 0,
        new_total_score: 0
      };
    }
  }

  /**
   * Select a new trick using database function
   */
  async selectNewTrick(playerId: string, sessionId: string, quizId: string): Promise<QuizActionResult> {
    try {
      const { data, error } = await supabase.rpc('select_new_trick', {
        p_player_id: playerId,
        p_quiz_id: quizId,
        p_session_id: sessionId
      });

      if (error) {
        console.error('Error selecting trick:', error);
        
        // Check if it's the "already did quiz" error
        if (error.message.includes('ya realizó un quiz en este turno')) {
          return {
            success: false,
            message: 'Ya realizaste un quiz en este turno. Debes finalizar el turno antes de continuar.',
            points_change: 0,
            new_total_score: 0,
            alreadyDoneQuiz: true
          };
        }
        
        return {
          success: false,
          message: `Error selecting trick: ${error.message}`,
          points_change: 0,
          new_total_score: 0
        };
      }

      return {
        success: true,
        message: 'Trick selected successfully',
        points_change: 0, // Se generarán puntos en turnos futuros
        new_total_score: await this.calculatePlayerScore(playerId),
        item_id: data
      };
    } catch (error) {
      console.error('Exception in selectNewTrick:', error);
      return {
        success: false,
        message: `Exception selecting trick: ${error}`,
        points_change: 0,
        new_total_score: 0
      };
    }
  }

  /**
   * Select a new treat using database function
   */
  async selectNewTreat(playerId: string, sessionId: string, quizId: string): Promise<QuizActionResult> {
    try {
      const { data, error } = await supabase.rpc('select_new_treat', {
        p_player_id: playerId,
        p_quiz_id: quizId,
        p_session_id: sessionId
      });

      if (error) {
        console.error('Error selecting treat:', error);
        
        // Check if it's the "already did quiz" error
        if (error.message.includes('ya realizó un quiz en este turno')) {
          return {
            success: false,
            message: 'Ya realizaste un quiz en este turno. Debes finalizar el turno antes de continuar.',
            points_change: 0,
            new_total_score: 0,
            alreadyDoneQuiz: true
          };
        }
        
        return {
          success: false,
          message: `Error selecting treat: ${error.message}`,
          points_change: 0,
          new_total_score: 0
        };
      }

      return {
        success: true,
        message: 'Treat selected successfully',
        points_change: 0, // Los puntos se otorgan al completar
        new_total_score: await this.calculatePlayerScore(playerId),
        item_id: data
      };
    } catch (error) {
      console.error('Exception in selectNewTreat:', error);
      return {
        success: false,
        message: `Exception selecting treat: ${error}`,
        points_change: 0,
        new_total_score: 0
      };
    }
  }

  /**
   * Complete a treat using database function
   */
  async completeTreat(treatId: string, playerId: string): Promise<QuizActionResult> {
    try {
      const { data, error } = await supabase.rpc('complete_treat', {
        p_player_id: playerId,
        p_treat_id: treatId
      });

      if (error) {
        console.error('Error completing treat:', error);
        return {
          success: false,
          message: `Error completing treat: ${error.message}`,
          points_change: 0,
          new_total_score: 0
        };
      }

      // Calculate new total score after completing treat
      const newTotalScore = await this.calculatePlayerScore(playerId);

      return { 
        success: true, 
        message: 'Treat completed - +1 point earned!',
        points_change: 1,
        new_total_score: newTotalScore
      };
    } catch (error) {
      console.error('Exception in completeTreat:', error);
      return {
        success: false,
        message: `Exception completing treat: ${error}`,
        points_change: 0,
        new_total_score: 0
      };
    }
  }

  /**
   * Desert (abandon) a trick or treat using database function
   */
  async desertTrickOrTreat(sessionId: string, playerId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('desert_trick_or_treat', {
        p_session_id: sessionId,
        p_player_id: playerId
      });

      // Si hay un error de función no encontrada, devolver falso
      if (error && error.code === 'PGRST202') {
        console.warn('Function desert_trick_or_treat not yet migrated. Returning false.');
        return false;
      }

      if (error) {
        console.error('Error deserting trick/treat:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Exception in desertTrickOrTreat:', error);
      return false;
    }
  }

  /**
   * Get session leaderboard using direct database queries
   */
  async getSessionLeaderboard(sessionId: string): Promise<SessionLeaderboard[]> {
    try {
      // Get players with their basic stats
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select(`
          id,
          name,
          current_score,
          total_tricks_selected,
          total_treats_selected,
          total_treats_completed,
          total_tricks_deserted,
          total_treats_deserted
        `)
        .eq('session_id', sessionId)
        .order('current_score', { ascending: false });

      if (playersError) {
        console.error('Error fetching players for leaderboard:', playersError);
        return [];
      }

      if (!players || players.length === 0) {
        return [];
      }

      // Get detailed stats for each player
      const leaderboard: SessionLeaderboard[] = [];
      
      for (const player of players) {
        // Get active tricks count and total points
        const { data: activeTricks } = await supabase
          .from('player_tricks')
          .select('points_generated')
          .eq('player_id', player.id)
          .eq('session_id', sessionId)
          .is('deserted_at', null);

        // Get treats stats
        const { data: completedTreats } = await supabase
          .from('player_treats')
          .select('id')
          .eq('player_id', player.id)
          .eq('session_id', sessionId)
          .not('completed_at', 'is', null);

        const { data: pendingTreats } = await supabase
          .from('player_treats')
          .select('id')
          .eq('player_id', player.id)
          .eq('session_id', sessionId)
          .is('completed_at', null)
          .is('deserted_at', null);

        const { data: desertedTreats } = await supabase
          .from('player_treats')
          .select('points_awarded')
          .eq('player_id', player.id)
          .eq('session_id', sessionId)
          .not('deserted_at', 'is', null);

        const activeTricksCount = activeTricks?.length || 0;
        const totalTricksPoints = activeTricks?.reduce((sum, trick) => sum + (trick.points_generated || 0), 0) || 0;
        const completedTreatsCount = completedTreats?.length || 0;
        const pendingTreatsCount = pendingTreats?.length || 0;
        const desertedTreatsCount = desertedTreats?.length || 0;
        const totalTreatsPoints = desertedTreats?.reduce((sum, treat) => sum + (treat.points_awarded || 0), 0) || 0;

        leaderboard.push({
          player_id: player.id,
          player_name: player.name,
          current_score: player.current_score || 0,
          active_tricks_count: activeTricksCount,
          total_tricks_points: totalTricksPoints,
          completed_treats_count: completedTreatsCount,
          pending_treats_count: pendingTreatsCount,
          deserted_treats_count: desertedTreatsCount,
          total_treats_points: totalTreatsPoints,
          total_tricks_selected: player.total_tricks_selected || 0,
          total_treats_selected: player.total_treats_selected || 0,
          total_tricks_deserted: player.total_tricks_deserted || 0,
          total_treats_completed: player.total_treats_completed || 0,
          total_treats_deserted: player.total_treats_deserted || 0,
          rank: 0 // Will be calculated after sorting
        });
      }

      // Sort by current_score and assign ranks
      leaderboard.sort((a, b) => b.current_score - a.current_score);
      leaderboard.forEach((player, index) => {
        player.rank = index + 1;
      });

      return leaderboard;
    } catch (error) {
      console.error('Exception in getSessionLeaderboard:', error);
      return [];
    }
  }

  /**
   * Calculate player score using database function
   */
  async calculatePlayerScore(playerId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('calculate_player_score', {
        p_player_id: playerId
      });

      // Si hay un error de función no encontrada, devolver 0
      if (error && error.code === 'PGRST202') {
        console.warn('Function calculate_player_score not yet migrated. Returning 0.');
        return 0;
      }

      if (error) {
        console.error('Error calculating player score:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Exception in calculatePlayerScore:', error);
      return 0;
    }
  }

  /**
   * Get player's current active trick or treat
   */
  async getPlayerCurrentActivity(sessionId: string, playerId: string): Promise<{ type: 'trick' | 'treat' | null; activity: any }> {
    try {
      // Check for active trick
      const { data: trickData, error: trickError } = await supabase
        .from('player_tricks')
        .select(`
          *,
          tricks (*)
        `)
        .eq('session_id', sessionId)
        .eq('player_id', playerId)
        .eq('is_active', true)
        .single();

      // Si hay un error de tabla no encontrada, devolver null
      if (trickError && trickError.code === '42P01') {
        console.warn('Tables not yet migrated. Returning null activity.');
        return { type: null, activity: null };
      }

      if (!trickError && trickData) {
        return { type: 'trick', activity: trickData };
      }

      // Check for active treat (pending treat)
      const { data: treatData, error: treatError } = await supabase
        .from('player_treats')
        .select(`
          *,
          treats (*)
        `)
        .eq('session_id', sessionId)
        .eq('player_id', playerId)
        .is('completed_at', null)
        .is('deserted_at', null)
        .single();

      if (!treatError && treatData) {
        return { type: 'treat', activity: treatData };
      }

      return { type: null, activity: null };
    } catch (error) {
      console.error('Exception in getPlayerCurrentActivity:', error);
      return { type: null, activity: null };
    }
  }

  /**
   * Get player's active tricks
   */
  async getPlayerActiveTricks(playerId: string): Promise<PlayerTrick[]> {
    try {
      const { data, error } = await supabase
        .from('player_tricks')
        .select(`
          *,
          quiz:quizzes (
            id,
            title,
            trick_title,
            trick_content
          )
        `)
        .eq('player_id', playerId)
        .eq('is_active', true)
        .order('activated_at', { ascending: false });

      if (error) {
        console.error('Error getting player active tricks:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getPlayerActiveTricks:', error);
      return [];
    }
  }

  /**
   * Get player's pending treats
   */
  async getPlayerPendingTreats(playerId: string): Promise<PlayerTreat[]> {
    try {
      const { data, error } = await supabase
        .from('player_treats')
        .select(`
          *,
          quiz:quizzes (
            id,
            title,
            treat_title,
            treat_content
          )
        `)
        .eq('player_id', playerId)
        .is('completed_at', null)
        .is('deserted_at', null)
        .order('selected_at', { ascending: false });

      if (error) {
        console.error('Error getting player pending treats:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getPlayerPendingTreats:', error);
      return [];
    }
  }

  /**
   * Desert a specific trick
   */
  async desertTrick(trickId: string, playerId: string): Promise<QuizActionResult> {
    try {
      const { data, error } = await supabase.rpc('desert_trick', {
        p_trick_id: trickId,
        p_player_id: playerId
      });

      if (error) {
        return {
          success: false,
          message: `Error deserting trick: ${error.message}`,
          points_change: 0,
          new_total_score: 0
        };
      }

      // Calculate new total score after deserting trick
      const newTotalScore = await this.calculatePlayerScore(playerId);

      return {
        success: true,
        message: 'Trick deserted successfully',
        points_change: 0, // No hay penalización
        new_total_score: newTotalScore
      };
    } catch (error) {
      console.error('Exception in desertTrick:', error);
      return {
        success: false,
        message: `Exception deserting trick: ${error}`,
        points_change: 0,
        new_total_score: 0
      };
    }
  }

  /**
   * Desert a specific treat
   */
  async desertTreat(treatId: string, playerId: string): Promise<QuizActionResult> {
    try {
      const { data, error } = await supabase.rpc('desert_treat', {
        p_treat_id: treatId,
        p_player_id: playerId
      });

      if (error) {
        return {
          success: false,
          message: `Error deserting treat: ${error.message}`,
          points_change: -1,
          new_total_score: 0
        };
      }

      // Calculate new total score after deserting treat
      const newTotalScore = await this.calculatePlayerScore(playerId);

      return {
        success: true,
        message: 'Treat deserted - 1 point lost',
        points_change: -1,
        new_total_score: newTotalScore
      };
    } catch (error) {
      console.error('Exception in desertTreat:', error);
      return {
        success: false,
        message: `Exception deserting treat: ${error}`,
        points_change: 0,
        new_total_score: 0
      };
    }
  }
}

export const dynamicScoringService = new DynamicScoringService();