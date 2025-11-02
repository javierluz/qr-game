import React from 'react';
import type { Player, ActiveGameSession } from '../types/session';

interface SessionTurnDisplayProps {
  currentPlayer: Player;
  session: ActiveGameSession;
  onNextTurn: () => void;
  onNewQuiz: () => void;
}

export const SessionTurnDisplay: React.FC<SessionTurnDisplayProps> = ({
  currentPlayer,
  session,
  onNextTurn,
  onNewQuiz
}) => {
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

  return (
    <div className="max-w-4xl mx-auto mb-12">
      {/* Card principal del turno */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/20 via-purple-600/20 to-pink-500/20 border-2 border-orange-400/50 shadow-2xl shadow-orange-500/25">
        {/* Efecto de resplandor */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 via-transparent to-purple-400/10 animate-pulse"></div>
        
        <div className="relative z-10 p-8 text-center">
          {/* Nombre del jugador con efecto especial */}
          <div className="mb-6">
            <h2 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-yellow-300 to-orange-400 mb-3 animate-pulse">
              ¡Ahora es el turno de {currentPlayer.name}! 🎭
            </h2>
            <p className="text-xl md:text-2xl text-purple-200 font-medium italic">
              {randomPhrase}
            </p>
          </div>

          {/* Estadísticas del jugador */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-black/40 rounded-xl p-4 border border-orange-400/30">
              <div className="text-3xl mb-2">🏆</div>
              <div className="text-orange-300 font-bold text-2xl">{currentPlayer.score}</div>
              <div className="text-orange-200 text-sm">Puntos</div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-purple-400/30">
              <div className="text-3xl mb-2">🎭</div>
              <div className="text-purple-300 font-bold text-2xl">{currentPlayer.active_tricks?.length || 0}</div>
              <div className="text-purple-200 text-sm">Tricks Activos</div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-pink-400/30">
              <div className="text-3xl mb-2">🍬</div>
              <div className="text-pink-300 font-bold text-2xl">{currentPlayer.pending_treats?.length || 0}</div>
              <div className="text-pink-200 text-sm">Treats Pendientes</div>
            </div>
          </div>

          {/* Botones de acción principales */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onNewQuiz}
              className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/50"
            >
              <span className="relative z-10 flex items-center gap-3">
                <span className="text-2xl">🎲</span>
                Nuevo Quiz
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>

            <button
              onClick={onNextTurn}
              className="group relative overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/50"
            >
              <span className="relative z-10 flex items-center gap-3">
                <span className="text-2xl">⏭️</span>
                Saltar Turno
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </div>

          {/* Texto de ayuda */}
          <div className="mt-6 text-orange-200/80 text-sm">
            💡 <span className="italic">Elige "Nuevo Quiz" para una aventura o "Saltar Turno" si necesitas un respiro</span>
          </div>
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