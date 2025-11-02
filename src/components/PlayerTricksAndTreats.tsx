import React, { useState, useEffect } from 'react';
import type { Player } from '../types/session';

interface PlayerTricksAndTreatsProps {
  player: Player;
  sessionId: string;
}

interface QuizData {
  id: string;
  pregunta: string;
  respuestas: string[];
  respuesta_correcta: number;
  tipo: 'trick' | 'treat';
  puntos: number;
}

export const PlayerTricksAndTreats: React.FC<PlayerTricksAndTreatsProps> = ({
  player,
  sessionId
}) => {
  const [tricksData, setTricksData] = useState<QuizData[]>([]);
  const [treatsData, setTreatsData] = useState<QuizData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuizData();
  }, [player.id]);

  const loadQuizData = async () => {
    try {
      setLoading(true);
      
      // En un escenario real, aquí cargaríamos los datos de los quizzes desde la API
      // Por ahora simulamos algunos datos para mostrar el componente
      const mockTricks: QuizData[] = player.active_tricks?.map((trickId, index) => ({
        id: trickId,
        pregunta: `Pregunta trick #${index + 1}: ¿Cuál es el origen de Halloween?`,
        respuestas: ['Irlanda', 'Estados Unidos', 'Francia', 'Inglaterra'],
        respuesta_correcta: 0,
        tipo: 'trick' as const,
        puntos: 10
      })) || [];

      const mockTreats: QuizData[] = player.pending_treats?.map((treatId, index) => ({
        id: treatId,
        pregunta: `Pregunta treat #${index + 1}: ¿Qué significa "Trick or Treat"?`,
        respuestas: ['Truco o trato', 'Miedo o diversión', 'Dulce o salado', 'Noche o día'],
        respuesta_correcta: 0,
        tipo: 'treat' as const,
        puntos: 15
      })) || [];

      setTricksData(mockTricks);
      setTreatsData(mockTreats);
    } catch (error) {
      console.error('Error loading quiz data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin text-4xl">🎃</div>
      </div>
    );
  }

  const hasTricks = tricksData.length > 0;
  const hasTreats = treatsData.length > 0;

  if (!hasTricks && !hasTreats) {
    return (
      <div className="max-w-4xl mx-auto mb-12">
        <div className="text-center p-8 bg-black/30 rounded-xl border border-gray-600">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-2xl font-bold text-gray-300 mb-2">
            ¡{player.name} está listo para nuevas aventuras!
          </h3>
          <p className="text-gray-400">
            No tienes tricks activos ni treats pendientes. ¡Perfecto para empezar algo nuevo! 🎲
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mb-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tricks Activos */}
        {hasTricks && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-3xl font-bold text-red-400">🎭 Tricks Activos</h3>
              <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm font-medium border border-red-500/30">
                {tricksData.length}
              </span>
            </div>
            
            <div className="space-y-4">
              {tricksData.map((trick, index) => (
                <div 
                  key={trick.id}
                  className="bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/30 rounded-xl p-6 hover:border-red-400/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-red-300 font-bold text-lg">
                      Trick #{index + 1}
                    </h4>
                    <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-sm">
                      {trick.puntos} pts
                    </span>
                  </div>
                  
                  <p className="text-red-100 mb-4 text-lg">
                    {trick.pregunta}
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {trick.respuestas.map((respuesta, respIndex) => (
                      <div 
                        key={respIndex}
                        className={`p-3 rounded-lg border transition-all ${
                          respIndex === trick.respuesta_correcta
                            ? 'bg-green-900/30 border-green-500/50 text-green-300'
                            : 'bg-black/30 border-gray-600 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <span className="font-medium">
                          {String.fromCharCode(65 + respIndex)}. {respuesta}
                        </span>
                        {respIndex === trick.respuesta_correcta && (
                          <span className="ml-2 text-green-400">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-500/20 rounded-lg">
                    <p className="text-red-200 text-sm">
                      💡 <strong>Regla activa:</strong> Debes cumplir esta challenge hasta que te toque de nuevo
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Treats Pendientes */}
        {hasTreats && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-3xl font-bold text-green-400">🍬 Treats Pendientes</h3>
              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium border border-green-500/30">
                {treatsData.length}
              </span>
            </div>
            
            <div className="space-y-4">
              {treatsData.map((treat, index) => (
                <div 
                  key={treat.id}
                  className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-xl p-6 hover:border-green-400/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-green-300 font-bold text-lg">
                      Treat #{index + 1}
                    </h4>
                    <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-sm">
                      {treat.puntos} pts
                    </span>
                  </div>
                  
                  <p className="text-green-100 mb-4 text-lg">
                    {treat.pregunta}
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {treat.respuestas.map((respuesta, respIndex) => (
                      <div 
                        key={respIndex}
                        className={`p-3 rounded-lg border transition-all ${
                          respIndex === treat.respuesta_correcta
                            ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300'
                            : 'bg-black/30 border-gray-600 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <span className="font-medium">
                          {String.fromCharCode(65 + respIndex)}. {respuesta}
                        </span>
                        {respIndex === treat.respuesta_correcta && (
                          <span className="ml-2 text-emerald-400">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-500/20 rounded-lg">
                    <p className="text-green-200 text-sm">
                      🍯 <strong>Treat disponible:</strong> Responde correctamente para ganar puntos extra
                    </p>
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