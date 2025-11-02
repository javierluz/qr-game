import React, { useState, useEffect } from 'react';
import type { Player, ActiveGameSession, TurnStartResult } from '../types/session';
import { dynamicScoringService } from '../lib/dynamicScoringService';
import { gameSessionService } from '../lib/gameSessionService';

interface SessionTurnDisplayDynamicProps {
  currentPlayer: Player;
  session: ActiveGameSession;
  turnNumber: number;
  onNextTurn: () => void;
  onNewQuiz: () => void;
  onScoreUpdate?: (newScore: number) => void;
}

export const SessionTurnDisplayDynamic: React.FC<SessionTurnDisplayDynamicProps> = ({
  currentPlayer,
  session,
  turnNumber,
  onNextTurn,
  onNewQuiz,
  onScoreUpdate
}) => {
  const [turnStarted, setTurnStarted] = useState(false);
  const [turnStartResult, setTurnStartResult] = useState<TurnStartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasCompletedQuizThisTurn, setHasCompletedQuizThisTurn] = useState(false);
  const [checkingQuizStatus, setCheckingQuizStatus] = useState(false);

  // Frases divertidas aleatorias
  const halloweenPhrases = [
    "¡Prepárate... el destino te observa! 👀",
    "La noche es joven y llena de misterios... 🌙",
    "¿Trick o Treat? ¡Tú decides tu aventura! 🎲",
    "Los espíritus susurran tu nombre... 👻",
    "¡Que comience la diversión diabólica! 😈",
    "La magia de Halloween fluye a través de ti... ✨",
    "¿Estás listo para enfrentar lo desconocido? 🕷️",
    "El momento perfecto para una travesura... 🎭"
  ];

  const randomPhrase = halloweenPhrases[Math.floor(Math.random() * halloweenPhrases.length)];

  useEffect(() => {
    // Reset turn state when player or turn number changes
    if (currentPlayer?.id) {
      console.log('🔄 SessionTurnDisplayDynamic reset useEffect triggered:', {
        playerId: currentPlayer.id,
        turnNumber,
        turnStarted,
        hasCompletedQuizThisTurn
      });
      setTurnStarted(false);
      setTurnStartResult(null);
      setHasCompletedQuizThisTurn(false);
    }
  }, [currentPlayer?.id, turnNumber]);

  useEffect(() => {
    // Iniciar automáticamente el turno cuando el jugador cambie y el estado esté limpio
    if (currentPlayer?.id && !turnStarted && !loading) {
      console.log('🎯 SessionTurnDisplayDynamic auto-start useEffect triggered:', {
        playerId: currentPlayer.id,
        turnStarted,
        loading,
        hasCompletedQuizThisTurn
      });
      handleStartTurn();
    }
  }, [currentPlayer?.id, turnStarted, loading]);

  // Verificar si el jugador ya hizo un quiz este turno
  const checkQuizStatus = async () => {
    if (checkingQuizStatus) return;
    
    try {
      setCheckingQuizStatus(true);
      const hasQuiz = await gameSessionService.hasPlayerDoneQuizInCurrentTurn(
        currentPlayer.id, 
        session.id
      );
      setHasCompletedQuizThisTurn(hasQuiz);
    } catch (error) {
      console.error('Error checking quiz status:', error);
      setHasCompletedQuizThisTurn(false);
    } finally {
      setCheckingQuizStatus(false);
    }
  };

  useEffect(() => {
    // Verificar estado del quiz cuando cambie el turno y esté iniciado
    if (turnStarted && currentPlayer?.id) {
      checkQuizStatus();
    }
  }, [turnStarted, currentPlayer?.id]);

  const handleStartTurn = async () => {
    // Verificaciones más estrictas para evitar ejecuciones múltiples
    if (loading || turnStarted || !currentPlayer?.id) {
      console.log('handleStartTurn skipped:', { loading, turnStarted, hasPlayer: !!currentPlayer?.id });
      return;
    }
    
    try {
      console.log('Starting turn for player:', currentPlayer.id, 'turn:', turnNumber);
      setLoading(true);
      const result = await dynamicScoringService.startPlayerTurn(
        currentPlayer.id, 
        session.id, 
        turnNumber
      );
      
      setTurnStartResult(result);
      setTurnStarted(true);
      
      // NO llamar onScoreUpdate aquí para evitar loop infinito
      // El score se actualizará cuando el usuario termine el turno o haga una acción específica
      console.log('Turn started successfully, points awarded:', result.points_awarded, 'but NOT calling onScoreUpdate to avoid loop');
    } catch (error) {
      console.error('Error starting turn:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewQuizAction = async () => {
    // Verificar si ya se hizo un quiz este turno
    if (hasCompletedQuizThisTurn) {
      alert('Ya realizaste un quiz en este turno. Debes finalizar el turno antes de continuar.');
      return;
    }
    
    // Ejecutar la acción de nuevo quiz
    onNewQuiz();
    
    // Después de ejecutar el quiz, marcar como completado
    // Nota: esto se actualizará cuando regrese de la página del quiz
    setHasCompletedQuizThisTurn(true);
  };

  const handleSkipTurn = async () => {
    // Ejecutar siguiente turno (sin penalización)
    onNextTurn();
  };

  return (
    <div className="max-w-4xl mx-auto mb-12">
      {/* Card principal del turno */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/20 via-purple-600/20 to-pink-500/20 border-2 border-orange-400/50 shadow-2xl shadow-orange-500/25">
        {/* Efecto de resplandor */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 via-transparent to-purple-400/10 animate-pulse"></div>
        
        {/* Notificación de puntos al inicio del turno */}
        {turnStartResult && turnStartResult.success && turnStartResult.points_awarded > 0 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-green-500/90 text-white px-6 py-3 rounded-full border-2 border-green-300 shadow-lg animate-bounce">
              <div className="flex items-center gap-2 font-bold">
                <span className="text-lg">⚡</span>
                <span>+{turnStartResult.points_awarded} puntos por {turnStartResult.active_tricks_count} tricks activos!</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="relative z-10 p-8 text-center">
          {/* Nombre del jugador con efecto especial */}
          <div className="mb-6">
            <h2 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-yellow-300 to-orange-400 mb-3 animate-pulse">
              ¡Turno #{turnNumber}: {currentPlayer.name}! 🎭
            </h2>
            <p className="text-xl md:text-2xl text-purple-200 font-medium italic">
              {randomPhrase}
            </p>
          </div>

          {/* Estadísticas del jugador - Sistema Dinámico */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-black/40 rounded-xl p-4 border border-orange-400/30">
              <div className="text-3xl mb-2">🏆</div>
              <div className="text-orange-300 font-bold text-2xl">
                {turnStartResult?.new_total_score ?? currentPlayer.current_score ?? currentPlayer.score ?? 0}
              </div>
              <div className="text-orange-200 text-sm">Puntos Totales</div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-purple-400/30">
              <div className="text-3xl mb-2">🎭</div>
              <div className="text-purple-300 font-bold text-2xl">
                {turnStartResult?.active_tricks_count ?? currentPlayer.total_tricks_selected ?? 0}
              </div>
              <div className="text-purple-200 text-sm">Tricks Activos</div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-pink-400/30">
              <div className="text-3xl mb-2">🍬</div>
              <div className="text-pink-300 font-bold text-2xl">
                {currentPlayer.total_treats_selected ?? 0}
              </div>
              <div className="text-pink-200 text-sm">Treats Pendientes</div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-emerald-400/30">
              <div className="text-3xl mb-2">⚡</div>
              <div className="text-emerald-300 font-bold text-2xl">
                {turnStartResult?.points_awarded ?? 0}
              </div>
              <div className="text-emerald-200 text-sm">Puntos Este Turno</div>
            </div>
          </div>

          {/* Explicación del sistema dinámico */}
          {turnStartResult && turnStartResult.active_tricks_count > 0 && (
            <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">🎯</span>
                <p className="text-green-200 font-medium">
                  ¡Tus {turnStartResult.active_tricks_count} tricks activos te dieron {turnStartResult.points_awarded} puntos automáticamente al iniciar tu turno!
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="animate-spin text-4xl">🎃</div>
              <p className="text-orange-200 text-lg">Iniciando turno...</p>
            </div>
          ) : (
            <>
              {/* Botones de acción principales */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={handleNewQuizAction}
                  disabled={hasCompletedQuizThisTurn}
                  className={`group relative overflow-hidden ${
                    hasCompletedQuizThisTurn 
                      ? 'bg-gray-500 cursor-not-allowed opacity-50' 
                      : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                  } text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform ${
                    hasCompletedQuizThisTurn ? '' : 'hover:scale-105'
                  } shadow-lg ${
                    hasCompletedQuizThisTurn ? '' : 'hover:shadow-orange-500/50'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <span className="text-2xl">{hasCompletedQuizThisTurn ? '✓' : '🎲'}</span>
                    {hasCompletedQuizThisTurn ? 'Quiz Completado' : 'Nuevo Quiz'}
                  </span>
                  {!hasCompletedQuizThisTurn && (
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  )}
                </button>

                <button
                  onClick={handleSkipTurn}
                  className="group relative overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/50"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <span className="text-2xl">{hasCompletedQuizThisTurn ? '✅' : '⏭️'}</span>
                    {hasCompletedQuizThisTurn ? 'Finalizar Turno' : 'Siguiente Turno'}
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
              </div>

              {/* Texto de ayuda del sistema dinámico */}
              <div className="mt-6 space-y-2">
                <div className="text-orange-200/80 text-sm">
                  💡 <span className="italic">
                    {hasCompletedQuizThisTurn 
                      ? 'Ya completaste tu quiz de este turno. ¡Puedes finalizar cuando estés listo!' 
                      : 'Nuevo Quiz: Elige un trick (genera puntos cada vuelta) o treat (completa para +1 punto)'
                    }
                  </span>
                </div>
                <div className="text-purple-200/80 text-xs">
                  {hasCompletedQuizThisTurn ? '✅' : '⏭️'} <span className="italic">
                    {hasCompletedQuizThisTurn 
                      ? 'Finalizar Turno: Completa tu turno y pasa al siguiente jugador' 
                      : 'Siguiente Turno: Pasa al siguiente jugador sin hacer quiz (permitido)'
                    }
                  </span>
                </div>
                {hasCompletedQuizThisTurn && (
                  <div className="text-green-200/80 text-xs">
                    🚫 <span className="italic">Solo puedes hacer 1 quiz por turno</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Decoraciones flotantes */}
        <div className="absolute top-4 left-4 text-2xl animate-bounce delay-100">🕸️</div>
        <div className="absolute top-4 right-4 text-2xl animate-bounce delay-300">🦇</div>
        <div className="absolute bottom-4 left-4 text-2xl animate-bounce delay-500">⭐</div>
        <div className="absolute bottom-4 right-4 text-2xl animate-bounce delay-700">🌙</div>
      </div>
    </div>
  );
};