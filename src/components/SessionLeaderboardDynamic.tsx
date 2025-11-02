import React, { useState, useEffect } from 'react';
import type { SessionLeaderboard } from '../types/session';
import { dynamicScoringService } from '../lib/dynamicScoringService';

interface SessionLeaderboardDynamicProps {
  sessionId: string;
  refreshTrigger?: number; // Para forzar actualizaciones
}

export const SessionLeaderboardDynamic: React.FC<SessionLeaderboardDynamicProps> = ({
  sessionId,
  refreshTrigger
}) => {
  const [leaderboard, setLeaderboard] = useState<SessionLeaderboard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      loadLeaderboard();
    }
  }, [sessionId, refreshTrigger]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await dynamicScoringService.getSessionLeaderboard(sessionId);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mb-12">
        <div className="text-center p-8">
          <div className="animate-spin text-4xl mb-4">🏆</div>
          <p className="text-gray-300">Actualizando ranking...</p>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="max-w-4xl mx-auto mb-12">
        <div className="text-center p-8 bg-black/30 rounded-xl border border-gray-600">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-2xl font-bold text-gray-300 mb-2">
            ¡El ranking está esperando!
          </h3>
          <p className="text-gray-400">
            Los puntajes aparecerán aquí cuando los jugadores empiecen a ganar puntos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mb-12">
      <div className="bg-black/40 border border-orange-400/50 rounded-2xl overflow-hidden">
        {/* Header del ranking */}
        <div className="bg-gradient-to-r from-orange-600/20 to-purple-600/20 p-6 border-b border-orange-400/30">
          <div className="flex items-center justify-center gap-4">
            <span className="text-4xl">🏆</span>
            <h2 className="text-3xl font-bold text-orange-300">
              Ranking Dinámico de la Sesión
            </h2>
            <span className="text-4xl">🎭</span>
          </div>
          <p className="text-center text-orange-200/70 mt-2 text-sm">
            Sistema de puntaje dinámico: Tricks generan puntos por vuelta, Treats dan/quitan puntos al completar/desertar
          </p>
        </div>

        {/* Lista del ranking */}
        <div className="p-6">
          <div className="space-y-4">
            {leaderboard.map((player, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;
              
              let rankColor = 'text-gray-400';
              let bgColor = 'from-gray-900/40 to-gray-800/40';
              let borderColor = 'border-gray-600/30';
              
              if (isFirst) {
                rankColor = 'text-yellow-400';
                bgColor = 'from-yellow-600/20 to-orange-600/20';
                borderColor = 'border-yellow-400/50';
              } else if (isSecond) {
                rankColor = 'text-gray-300';
                bgColor = 'from-gray-500/20 to-gray-600/20';
                borderColor = 'border-gray-400/50';
              } else if (isThird) {
                rankColor = 'text-orange-400';
                bgColor = 'from-orange-600/20 to-red-600/20';
                borderColor = 'border-orange-400/50';
              }

              return (
                <div 
                  key={player.player_id}
                  className={`bg-gradient-to-r ${bgColor} border ${borderColor} rounded-xl p-6 hover:scale-102 transition-all duration-300`}
                >
                  <div className="flex items-center justify-between">
                    {/* Rank y nombre */}
                    <div className="flex items-center gap-4">
                      <div className={`text-3xl font-bold ${rankColor} min-w-[3rem] text-center`}>
                        {isFirst && '🥇'}
                        {isSecond && '🥈'}
                        {isThird && '🥉'}
                        {!isFirst && !isSecond && !isThird && `#${player.rank}`}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {player.player_name}
                        </h3>
                        <p className="text-gray-300 text-sm">
                          Posición #{player.rank}
                        </p>
                      </div>
                    </div>

                    {/* Puntaje total */}
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${rankColor}`}>
                        {player.current_score}
                      </div>
                      <div className="text-gray-400 text-sm">puntos totales</div>
                    </div>
                  </div>

                  {/* Desglose de puntos */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Tricks */}
                    <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-center">
                      <div className="text-red-300 font-bold text-lg">
                        {player.active_tricks_count}
                      </div>
                      <div className="text-red-200 text-xs">Tricks Activos</div>
                      <div className="text-red-300/70 text-xs mt-1">
                        +{player.total_tricks_points} pts
                      </div>
                    </div>

                    {/* Treats Completados */}
                    <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 text-center">
                      <div className="text-green-300 font-bold text-lg">
                        {player.completed_treats_count}
                      </div>
                      <div className="text-green-200 text-xs">Treats Completados</div>
                      <div className="text-green-300/70 text-xs mt-1">
                        +{player.completed_treats_count} pts
                      </div>
                    </div>

                    {/* Treats Pendientes */}
                    <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 text-center">
                      <div className="text-yellow-300 font-bold text-lg">
                        {player.pending_treats_count}
                      </div>
                      <div className="text-yellow-200 text-xs">Treats Pendientes</div>
                      <div className="text-yellow-300/70 text-xs mt-1">
                        0 pts
                      </div>
                    </div>

                    {/* Treats Desertados */}
                    <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-3 text-center">
                      <div className="text-purple-300 font-bold text-lg">
                        {player.deserted_treats_count}
                      </div>
                      <div className="text-purple-200 text-xs">Treats Desertados</div>
                      <div className="text-purple-300/70 text-xs mt-1">
                        -{player.deserted_treats_count} pts
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas adicionales */}
                  <div className="mt-4 pt-3 border-t border-gray-600/30">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Total Tricks: {player.total_tricks_selected}</span>
                      <span>Total Treats: {player.total_treats_selected}</span>
                      <span>Tricks Desertados: {player.total_tricks_deserted}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer explicativo */}
        <div className="bg-gradient-to-r from-purple-600/20 to-orange-600/20 p-4 border-t border-orange-400/30">
          <div className="text-center text-sm text-orange-200/80">
            <p className="mb-2">
              <strong>🎯 Sistema de Puntaje Dinámico:</strong>
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <span className="bg-red-500/20 px-2 py-1 rounded border border-red-500/30">
                🎭 Tricks: +1 punto por vuelta activa
              </span>
              <span className="bg-green-500/20 px-2 py-1 rounded border border-green-500/30">
                ✅ Treats completados: +1 punto
              </span>
              <span className="bg-purple-500/20 px-2 py-1 rounded border border-purple-500/30">
                🏃‍♂️ Treats desertados: -1 punto
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};