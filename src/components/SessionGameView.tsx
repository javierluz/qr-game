import React, { useState, useEffect, useCallback } from 'react';
import { gameSessionService } from '../lib/gameSessionService';
import { dynamicScoringService } from '../lib/dynamicScoringService';
import type { ActiveGameSession, Player } from '../types/session';
import { SessionTurnDisplayDynamic } from './SessionTurnDisplayDynamic';
import { PlayerTricksAndTreatsDynamic } from './PlayerTricksAndTreatsDynamic';
import { SessionLeaderboardDynamic } from './SessionLeaderboardDynamic';

interface SessionGameViewProps {
  // sessionId will be extracted from URL client-side
}

export const SessionGameView: React.FC<SessionGameViewProps> = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<ActiveGameSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el sistema dinámico
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [scoreRefreshTrigger, setScoreRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    // Extract session ID from URL client-side
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (!id) {
      setError('No se encontró ID de sesión en la URL. Usa: /sessions/play?id={session-uuid}');
      setLoading(false);
      return;
    }
    
    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      setError(`ID de sesión inválido: "${id}". Debe ser un UUID válido. Ejemplo: 123e4567-e89b-12d3-a456-426614174000`);
      setLoading(false);
      return;
    }
    
    setSessionId(id);
  }, []);

  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  const loadSessionData = useCallback(async () => {
    if (!sessionId) {
      setError('No session ID available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Cargar datos de la sesión
      const sessionData = await gameSessionService.getActiveSession(sessionId);
      setSession(sessionData);

      // Cargar jugadores de la sesión
      const playersData = await gameSessionService.getSessionPlayers(sessionId);
      setPlayers(playersData);

      // Encontrar el jugador actual según el turno
      const activePlayer = playersData.find(player => player.id === sessionData.current_player_id);
      setCurrentPlayer(activePlayer || null);
    } catch (err) {
      console.error('Error loading session data:', err);
      setError('No se pudo cargar la sesión. ¿Existe esta sesión?');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleNextTurn = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const nextPlayer = await gameSessionService.nextTurn(sessionId);
      setCurrentPlayer(nextPlayer);
      
      // Incrementar número de turno para el sistema dinámico
      setTurnNumber(prev => prev + 1);
      
      // Recargar datos de sesión para actualizar el estado
      await loadSessionData();
    } catch (err) {
      console.error('Error advancing turn:', err);
      setError('No se pudo avanzar el turno');
    }
  }, [sessionId, loadSessionData]);

  // Manejador para actualización de puntaje del sistema dinámico
  const handleScoreUpdate = useCallback(async (newScore: number) => {
    // Trigger refresh del leaderboard
    setScoreRefreshTrigger(prev => prev + 1);
    
    // Actualizar el jugador actual con el nuevo puntaje usando callback del setState
    setCurrentPlayer(prev => prev ? {
      ...prev,
      current_score: newScore
    } : null);
    
    // Recargar datos de sesión para sincronizar
    await loadSessionData();
  }, [loadSessionData]);

  const handleNewQuiz = useCallback(() => {
    // Redirigir a la página de quiz con el contexto del jugador actual
    if (currentPlayer) {
      window.location.href = `/get-random-quiz?sessionId=${sessionId}&playerId=${currentPlayer.id}`;
    }
  }, [currentPlayer, sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-orange-800 to-black">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🎃</div>
          <p className="text-orange-200 text-xl font-medium">Cargando tu aventura de Halloween...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-black">
        <div className="text-center max-w-md mx-auto p-8 bg-black/50 rounded-xl border border-red-500/30">
          <div className="text-6xl mb-4">👻</div>
          <h2 className="text-red-400 text-2xl font-bold mb-4">¡Ups! Algo salió mal</h2>
          <p className="text-red-200 mb-6">{error}</p>
          <button 
            onClick={() => window.location.href = '/sessions'}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            🔙 Volver a sesiones
          </button>
        </div>
      </div>
    );
  }

  if (!session || !currentPlayer) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black">
        <div className="text-center max-w-md mx-auto p-8 bg-black/50 rounded-xl border border-gray-500/30">
          <div className="text-6xl mb-4">🕸️</div>
          <h2 className="text-gray-400 text-2xl font-bold mb-4">Sesión no encontrada</h2>
          <p className="text-gray-200 mb-6">Esta sesión no existe o no tienes acceso a ella.</p>
          <button 
            onClick={() => window.location.href = '/sessions'}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            🔙 Volver a sesiones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-orange-800 to-black relative overflow-hidden">
      {/* Partículas decorativas de fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 animate-bounce delay-100">🕷️</div>
        <div className="absolute top-20 right-20 animate-bounce delay-300">🦇</div>
        <div className="absolute bottom-20 left-20 animate-bounce delay-500">👻</div>
        <div className="absolute bottom-10 right-10 animate-bounce delay-700">🎃</div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header de la sesión */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-purple-400 mb-2">
            🎭 {session.session_name}
          </h1>
          <p className="text-orange-200 text-lg">
            Jugadores: {players.length} • Turno #{session.turn_index + 1}
          </p>
        </div>

        {/* Componente del turno actual - Sistema Dinámico */}
        <SessionTurnDisplayDynamic 
          currentPlayer={currentPlayer}
          session={session}
          turnNumber={turnNumber}
          onNextTurn={handleNextTurn}
          onNewQuiz={handleNewQuiz}
          onScoreUpdate={handleScoreUpdate}
        />

        {/* Tricks y Treats del jugador actual - Sistema Dinámico */}
        {sessionId && currentPlayer && (
          <PlayerTricksAndTreatsDynamic 
            player={currentPlayer}
            sessionId={sessionId}
            onScoreUpdate={handleScoreUpdate}
          />
        )}

        {/* Leaderboard Dinámico */}
        {sessionId && (
          <SessionLeaderboardDynamic 
            sessionId={sessionId}
            refreshTrigger={scoreRefreshTrigger}
          />
        )}

        {/* Lista de jugadores en la sesión */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-orange-300 mb-6 text-center">
            👥 Jugadores en la partida
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player, index) => (
              <div 
                key={player.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  currentPlayer && player.id === currentPlayer.id 
                    ? 'bg-gradient-to-r from-orange-500/20 to-purple-500/20 border-orange-400 shadow-lg shadow-orange-500/25' 
                    : 'bg-black/30 border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">
                    {currentPlayer && player.id === currentPlayer.id ? '👑 ' : ''}
                    {player.name}
                  </span>
                  <span className="text-orange-300 font-bold">
                    {player.current_score ?? player.score ?? 0} pts
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-300">
                  Posición: #{player.order_position + 1}
                </div>
                <div className="mt-1 flex gap-2 text-xs">
                  <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded border border-red-500/30">
                    🎭 {player.total_tricks_selected ?? 0}
                  </span>
                  <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded border border-green-500/30">
                    🍬 {player.total_treats_completed ?? 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};