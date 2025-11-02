import React, { useState, useEffect } from 'react';
import type { Player, PlayerTrick, PlayerTreat } from '../types/session';
import { dynamicScoringService } from '../lib/dynamicScoringService';

interface PlayerTricksAndTreatsProps {
  player: Player;
  sessionId: string;
  onScoreUpdate?: (newScore: number) => void;
}

export const PlayerTricksAndTreatsDynamic: React.FC<PlayerTricksAndTreatsProps> = ({
  player,
  sessionId,
  onScoreUpdate
}) => {
  const [activeTricks, setActiveTricks] = useState<PlayerTrick[]>([]);
  const [pendingTreats, setPendingTreats] = useState<PlayerTreat[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (player?.id) {
      loadPlayerData();
    }
  }, [player?.id]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      const [tricks, treats] = await Promise.all([
        dynamicScoringService.getPlayerActiveTricks(player.id),
        dynamicScoringService.getPlayerPendingTreats(player.id)
      ]);
      
      setActiveTricks(tricks);
      setPendingTreats(treats);
    } catch (error) {
      console.error('Error loading player data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDesertTrick = async (trickId: string) => {
    if (actionLoading) return;
    
    try {
      setActionLoading(trickId);
      const result = await dynamicScoringService.desertTrick(trickId, player.id);
      
      if (result.success) {
        // Actualizar la lista local removiendo el trick desertado
        setActiveTricks(prev => prev.filter(t => t.id !== trickId));
        onScoreUpdate?.(result.new_total_score);
        
        // Mostrar mensaje de éxito
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Error deserting trick:', error);
      alert('❌ Error al desertar trick');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteTreat = async (treatId: string) => {
    if (actionLoading) return;
    
    try {
      setActionLoading(treatId);
      const result = await dynamicScoringService.completeTreat(treatId, player.id);
      
      if (result.success) {
        // Actualizar la lista local removiendo el treat completado
        setPendingTreats(prev => prev.filter(t => t.id !== treatId));
        onScoreUpdate?.(result.new_total_score);
        
        // Mostrar mensaje de éxito con animación
        alert(`🎉 ${result.message}`);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Error completing treat:', error);
      alert('❌ Error al completar treat');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDesertTreat = async (treatId: string) => {
    if (actionLoading) return;
    
    // Confirmar acción destructiva
    const confirmed = confirm(
      '⚠️ ¿Estás seguro de que quieres desertar este treat?\n\n' +
      'Perderás 1 punto y el treat desaparecerá de tu lista.'
    );
    
    if (!confirmed) return;
    
    try {
      setActionLoading(treatId);
      const result = await dynamicScoringService.desertTreat(treatId, player.id);
      
      if (result.success) {
        // Actualizar la lista local removiendo el treat desertado
        setPendingTreats(prev => prev.filter(t => t.id !== treatId));
        onScoreUpdate?.(result.new_total_score);
        
        // Mostrar mensaje
        alert(`⚠️ ${result.message}`);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Error deserting treat:', error);
      alert('❌ Error al desertar treat');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin text-4xl">🎃</div>
        <p className="ml-4 text-gray-300">Cargando tricks y treats...</p>
      </div>
    );
  }

  const hasTricks = activeTricks.length > 0;
  const hasTreats = pendingTreats.length > 0;

  if (!hasTricks && !hasTreats) {
    return (
      <div className="max-w-4xl mx-auto mb-12">
        <div className="text-center p-8 bg-black/30 rounded-xl border border-gray-600">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-2xl font-bold text-gray-300 mb-2">
            ¡{player.name} está listo para nuevas aventuras!
          </h3>
          <p className="text-gray-400 mb-4">
            No tienes tricks activos ni treats pendientes. ¡Perfecto para empezar algo nuevo! 🎲
          </p>
          <div className="text-sm text-gray-500 bg-gray-800/50 rounded-lg p-3 mx-auto max-w-md">
            💡 <strong>Tip:</strong> Los tricks generan 1 punto por vuelta mientras estén activos. 
            Los treats dan +1 punto al completar o -1 al desertar.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mb-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tricks Activos - Sistema Dinámico */}
        {hasTricks && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-3xl font-bold text-red-400">🎭 Tricks Activos</h3>
              <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm font-medium border border-red-500/30">
                {activeTricks.length}
              </span>
            </div>
            
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-200">
                <span className="text-lg">⚡</span>
                <p className="text-sm">
                  <strong>Cada trick genera 1 punto por vuelta</strong> mientras esté activo. 
                  Al inicio de tu turno recibirás puntos automáticamente.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              {activeTricks.map((trick, index) => (
                <div 
                  key={trick.id}
                  className="bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/30 rounded-xl p-6 hover:border-red-400/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-red-300 font-bold text-lg">
                        {trick.quiz?.trick_title || `Trick #${index + 1}`}
                      </h4>
                      <p className="text-red-200/70 text-sm">
                        Activado: {new Date(trick.activated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-sm mb-2">
                        {trick.points_generated} pts generados
                      </div>
                      <div className="text-xs text-red-300/70">
                        Último turno: #{trick.last_point_turn || 0}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-red-100 mb-4 text-base">
                    {trick.quiz?.trick_content || 'Contenido del trick...'}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-red-500/20">
                    <div className="text-red-300/70 text-sm">
                      💡 Generando 1 punto por vuelta mientras esté activo
                    </div>
                    <button
                      onClick={() => handleDesertTrick(trick.id)}
                      disabled={actionLoading === trick.id}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === trick.id ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin">⏳</div>
                          Desertando...
                        </span>
                      ) : (
                        '🏃‍♂️ Desertar Trick'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Treats Pendientes - Sistema Dinámico */}
        {hasTreats && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-3xl font-bold text-green-400">🍬 Treats Pendientes</h3>
              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium border border-green-500/30">
                {pendingTreats.length}
              </span>
            </div>
            
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-green-200">
                <span className="text-lg">🎯</span>
                <p className="text-sm">
                  <strong>Completar = +1 punto, Desertar = -1 punto.</strong> 
                  ¡Elige sabiamente cuándo intentar o abandonar!
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              {pendingTreats.map((treat, index) => (
                <div 
                  key={treat.id}
                  className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-xl p-6 hover:border-green-400/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-green-300 font-bold text-lg">
                        {treat.quiz?.treat_title || `Treat #${index + 1}`}
                      </h4>
                      <p className="text-green-200/70 text-sm">
                        Seleccionado: {new Date(treat.selected_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-sm">
                      Pendiente
                    </div>
                  </div>
                  
                  <p className="text-green-100 mb-6 text-base">
                    {treat.quiz?.treat_content || 'Contenido del treat...'}
                  </p>
                  
                  <div className="flex gap-3 pt-4 border-t border-green-500/20">
                    <button
                      onClick={() => handleCompleteTreat(treat.id)}
                      disabled={actionLoading === treat.id}
                      className="flex-1 px-4 py-3 bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-500/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {actionLoading === treat.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin">⏳</div>
                          Completando...
                        </span>
                      ) : (
                        '✅ Completar (+1 punto)'
                      )}
                    </button>
                    <button
                      onClick={() => handleDesertTreat(treat.id)}
                      disabled={actionLoading === treat.id}
                      className="px-4 py-3 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === treat.id ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin">⏳</div>
                          Desertando...
                        </span>
                      ) : (
                        '🏃‍♂️ Desertar (-1 punto)'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};