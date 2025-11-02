// Types for the new multiplayer session system

export interface GameSession {
  id: string;
  host_user_id: string;
  session_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Nuevo sistema dinámico de tricks
export interface PlayerTrick {
  id: string;
  player_id: string;
  quiz_id: string;
  session_id: string;
  activated_at: string;
  deserted_at: string | null;
  is_active: boolean;
  points_generated: number;
  last_point_turn: number;
  created_at: string;
  updated_at: string;
  // Relación con quiz
  quiz?: {
    id: string;
    title: string;
    trick_title: string;
    trick_content: string;
  };
}

// Nuevo sistema dinámico de treats
export interface PlayerTreat {
  id: string;
  player_id: string;
  quiz_id: string;
  session_id: string;
  selected_at: string;
  completed_at: string | null;
  deserted_at: string | null;
  status: 'pending' | 'completed' | 'deserted';
  points_awarded: number; // +1, -1, o 0
  created_at: string;
  updated_at: string;
  // Relación con quiz
  quiz?: {
    id: string;
    title: string;
    treat_title: string;
    treat_content: string;
  };
}

// Historial de turnos
export interface TurnHistory {
  id: string;
  session_id: string;
  player_id: string;
  turn_number: number;
  started_at: string;
  ended_at: string | null;
  tricks_points_awarded: number;
  action_taken: 'turn_start' | 'new_trick' | 'new_treat' | 'complete_treat' | 'desert_trick' | 'desert_treat';
  quiz_selected: string | null;
  is_current: boolean;
  created_at: string;
}

export interface Player {
  id: string;
  session_id: string;
  name: string;
  order_position: number;
  // Puntaje dinámico calculado
  current_score: number;
  // Estadísticas de tracking
  total_tricks_selected: number;
  total_treats_selected: number;
  total_tricks_deserted: number;
  total_treats_completed: number;
  total_treats_deserted: number;
  // Legacy fields (mantener por compatibilidad durante migración)
  score?: number;
  active_tricks?: string[];
  pending_treats?: string[];
  completed_quizzes?: string[];
  created_at: string;
  updated_at: string;
}

export interface Turn {
  id: string;
  session_id: string;
  current_player_id: string;
  turn_index: number;
  turn_number: number;
  last_action: string | null;
  last_action_at: string | null;
  updated_at: string;
}

export interface ActiveGameSession extends GameSession {
  player_count: number;
  current_player_id: string | null;
  turn_index: number;
  current_player_name: string | null;
}

export interface SessionLeaderboard {
  player_id: string;
  player_name: string;
  current_score: number;
  active_tricks_count: number;
  total_tricks_points: number;
  completed_treats_count: number;
  pending_treats_count: number;
  deserted_treats_count: number;
  total_treats_points: number;
  total_tricks_selected: number;
  total_treats_selected: number;
  total_tricks_deserted: number;
  total_treats_completed: number;
  total_treats_deserted: number;
  rank: number;
}

export interface GameSessionState {
  session: ActiveGameSession | null;
  players: Player[];
  currentPlayer: Player | null;
  turn: Turn | null;
  leaderboard: SessionLeaderboard[];
}

// Actions for managing quiz results in sessions (UPDATED for dynamic system)
export interface QuizAction {
  type: 'select_trick' | 'select_treat' | 'complete_treat' | 'desert_trick' | 'desert_treat';
  quiz_id: string;
  player_id: string;
  session_id: string;
  trick_id?: string; // Para desertar trick específico
  treat_id?: string; // Para completar/desertar treat específico
}

// Turn actions for dynamic scoring
export interface TurnAction {
  type: 'start_turn' | 'end_turn';
  player_id: string;
  session_id: string;
  turn_number: number;
  quiz_action?: QuizAction; // Acción principal del turno
}

// Respuestas de las funciones de la DB
export interface TurnStartResult {
  success: boolean;
  points_awarded: number; // Puntos ganados por tricks activos
  active_tricks_count: number;
  new_total_score: number;
}

export interface QuizActionResult {
  success: boolean;
  message: string;
  points_change: number; // +1, -1, o 0
  new_total_score: number;
  item_id?: string; // ID del trick/treat creado
  alreadyDoneQuiz?: boolean; // Indica si el jugador ya hizo un quiz este turno
}

// Session management actions (UPDATED)
export type SessionAction = 
  | { type: 'CREATE_SESSION'; session_name: string; player_names: string[] }
  | { type: 'JOIN_SESSION'; session_id: string }
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'REMOVE_PLAYER'; player_id: string }
  | { type: 'RANDOMIZE_ORDER' }
  | { type: 'NEXT_TURN' }
  | { type: 'PREVIOUS_TURN' }
  | { type: 'SET_TURN'; player_id: string }
  | { type: 'START_TURN'; turn_action: TurnAction }
  | { type: 'END_TURN'; turn_action: TurnAction }
  | { type: 'PROCESS_QUIZ'; action: QuizAction }
  | { type: 'PAUSE_SESSION' }
  | { type: 'RESUME_SESSION' }
  | { type: 'END_SESSION' };

export interface SessionConfig {
  // Configuración del nuevo sistema dinámico
  points_per_trick_per_turn: number; // 1 punto por trick por vuelta
  points_per_completed_treat: number; // +1 por treat completado
  points_per_deserted_treat: number; // -1 por treat desertado
  max_active_tricks: number;
  max_pending_treats: number;
  allow_skip_turn: boolean;
  auto_advance_turn: boolean;
  show_turn_start_points: boolean; // Mostrar puntos ganados al inicio de turno
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  points_per_trick_per_turn: 1,
  points_per_completed_treat: 1,
  points_per_deserted_treat: -1,
  max_active_tricks: 5, // Sin límite práctico
  max_pending_treats: 3,
  allow_skip_turn: true,
  auto_advance_turn: true,
  show_turn_start_points: true,
};