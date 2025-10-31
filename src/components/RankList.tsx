import { useEffect, useState } from 'react';
import { getLeaderboard } from '../lib/quiz-utils';
import type { LeaderboardEntry } from '../lib/quiz-utils';

export const RankList = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const data = await getLeaderboard();
        setLeaderboard(data);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Error al cargar la clasificación');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getDisplayName = (entry: LeaderboardEntry) => {
    if (entry.displayName) {
      return entry.displayName;
    }
    // Show first part of email before @
    return entry.email.split('@')[0];
  };

  if (loading) {
    return (
      <div className="rank-list-container">
        <h3>🏆 Clasificación de Halloween</h3>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando clasificación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rank-list-container">
        <h3>🏆 Clasificación de Halloween</h3>
        <div className="error-state">
          <p>❌ {error}</p>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="rank-list-container">
        <h3>🏆 Clasificación de Halloween</h3>
        <div className="empty-state">
          <p>👻 Aún no hay jugadores en la clasificación</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rank-list-container">
      <h3>🏆 Clasificación de Halloween</h3>
      <div className="rank-list-table">
        <div className="rank-header">
          <div className="rank-col">Pos.</div>
          <div className="name-col">Jugador</div>
          <div className="tricks-col">👻 Tricks</div>
          <div className="treats-col">🍭 Treats</div>
        </div>
        
        {leaderboard.map((entry) => (
          <div key={entry.userId} className="rank-row">
            <div className="rank-col">
              <span className="rank-badge">{getRankDisplay(entry.rank)}</span>
            </div>
            <div className="name-col">
              <div className="player-info">
                <div className="display-name">{getDisplayName(entry)}</div>
                <div className="email">{entry.email}</div>
              </div>
            </div>
            <div className="tricks-col">
              <span className="score-badge tricks">{entry.tricksCompleted}</span>
            </div>
            <div className="treats-col">
              <span className="score-badge treats">{entry.treatsCompleted}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="rank-legend">
        <p>📊 <strong>Sistema de puntuación:</strong> Los Tricks valen más que los Treats. En caso de empate en Tricks, se cuenta los Treats para desempatar.</p>
      </div>

      <style>{`
        .rank-list-container {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          padding: 24px;
          border: 2px solid #ff6b35;
          box-shadow: 
            0 8px 32px rgba(255, 107, 53, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          margin: 24px 0;
        }

        .rank-list-container h3 {
          color: #ff6b35;
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 20px;
          text-align: center;
          text-shadow: 0 2px 4px rgba(255, 107, 53, 0.3);
        }

        .loading-state, .error-state, .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #a0a0b0;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #2a2a40;
          border-top: 3px solid #ff6b35;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .rank-list-table {
          background: rgba(26, 26, 46, 0.3);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 107, 53, 0.2);
        }

        .rank-header {
          display: grid;
          grid-template-columns: 80px 1fr 100px 100px;
          gap: 16px;
          padding: 16px 20px;
          background: linear-gradient(90deg, #ff6b35, #ff8c42);
          color: white;
          font-weight: bold;
          font-size: 0.9rem;
        }

        .rank-row {
          display: grid;
          grid-template-columns: 80px 1fr 100px 100px;
          gap: 16px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 107, 53, 0.1);
          transition: all 0.3s ease;
          align-items: center;
        }

        .rank-row:hover {
          background: rgba(255, 107, 53, 0.05);
          transform: translateX(4px);
        }

        .rank-row:last-child {
          border-bottom: none;
        }

        .rank-col {
          text-align: center;
        }

        .rank-badge {
          font-size: 1.2rem;
          font-weight: bold;
          color: #ff6b35;
        }

        .name-col {
          color: #e0e0e0;
        }

        .player-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .display-name {
          font-weight: bold;
          font-size: 1rem;
          color: #ffffff;
        }

        .email {
          font-size: 0.8rem;
          color: #a0a0b0;
          opacity: 0.8;
        }

        .tricks-col, .treats-col {
          text-align: center;
        }

        .score-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.9rem;
          min-width: 40px;
          text-align: center;
        }

        .score-badge.tricks {
          background: linear-gradient(135deg, #6b46c1, #8b5cf6);
          color: white;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
        }

        .score-badge.treats {
          background: linear-gradient(135deg, #f59e0b, #fbbf24);
          color: white;
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
        }

        .rank-legend {
          margin-top: 16px;
          padding: 12px 16px;
          background: rgba(255, 107, 53, 0.1);
          border-radius: 8px;
          border-left: 4px solid #ff6b35;
        }

        .rank-legend p {
          margin: 0;
          font-size: 0.85rem;
          color: #d0d0d0;
          line-height: 1.4;
        }

        .rank-legend strong {
          color: #ff6b35;
        }

        @media (max-width: 768px) {
          .rank-header, .rank-row {
            grid-template-columns: 60px 1fr 80px 80px;
            gap: 8px;
            padding: 12px 16px;
          }

          .rank-header {
            font-size: 0.8rem;
          }

          .score-badge {
            padding: 4px 8px;
            font-size: 0.8rem;
            min-width: 32px;
          }

          .display-name {
            font-size: 0.9rem;
          }

          .email {
            font-size: 0.7rem;
          }

          .rank-list-container {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};