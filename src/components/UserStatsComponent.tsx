import React, { useState, useEffect } from 'react';
import { getCurrentUser, getUserStats, getUserSelections } from '../lib/quiz-utils';
import type { UserSelectedQuiz } from '../lib/quiz-utils';

interface UserStats {
  totalQuizzes: number;
  tricksCompleted: number;
  treatsCompleted: number;
}

interface UserStatsProps {
  onStatsLoaded?: (stats: UserStats) => void;
}

const UserStatsComponent: React.FC<UserStatsProps> = ({ onStatsLoaded }) => {
  const [stats, setStats] = useState<UserStats>({
    totalQuizzes: 0,
    tricksCompleted: 0,
    treatsCompleted: 0
  });
  const [selections, setSelections] = useState<UserSelectedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setError('Usuario no autenticado');
        return;
      }

      setUser(currentUser);

      const [userStats, userSelections] = await Promise.all([
        getUserStats(currentUser.id),
        getUserSelections(currentUser.id)
      ]);

      setStats(userStats);
      setSelections(userSelections);
      
      if (onStatsLoaded) {
        onStatsLoaded(userStats);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Error al cargar datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="stats-loading">
        <div className="spinner">🎃</div>
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-error">
        <div className="error-icon">😱</div>
        <p>{error}</p>
        <button onClick={loadUserData} className="retry-btn">
          Reintentar
        </button>
      </div>
    );
  }

  const tricksPercentage = stats.totalQuizzes > 0 
    ? Math.round((stats.tricksCompleted / stats.totalQuizzes) * 100)
    : 0;

  return (
    <div className="user-stats-container">
      {/* Header de Usuario */}
      <div className="user-header">
        <div className="user-avatar">👤</div>
        <div className="user-info">
          <h3>{user?.user_metadata?.display_name || 'Aventurero'}</h3>
          <p>{user?.email}</p>
        </div>
      </div>

      {/* Estadísticas Principales */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-number">{stats.totalQuizzes}</span>
            <span className="stat-label">Quizzes Completados</span>
          </div>
        </div>

        <div className="stat-card tricks">
          <div className="stat-icon">🎭</div>
          <div className="stat-content">
            <span className="stat-number">{stats.tricksCompleted}</span>
            <span className="stat-label">Tricks Realizados</span>
          </div>
        </div>

        <div className="stat-card treats">
          <div className="stat-icon">🍬</div>
          <div className="stat-content">
            <span className="stat-number">{stats.treatsCompleted}</span>
            <span className="stat-label">Treats Compartidos</span>
          </div>
        </div>
      </div>

      {/* Barras de Progreso */}
      {stats.totalQuizzes > 0 && (
        <div className="progress-section">
          <h4>📈 Tu Progreso</h4>
          
          <div className="progress-item">
            <div className="progress-header">
              <span>Preferencia por Tricks</span>
              <span className="progress-percentage">{tricksPercentage}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill tricks"
                style={{ width: `${tricksPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Historial Reciente */}
      {selections.length > 0 && (
        <div className="recent-activity">
          <h4>🕐 Actividad Reciente</h4>
          <div className="activity-list">
            {selections.slice(0, 5).map((selection) => (
              <div key={selection.id} className="activity-item">
                <div className="activity-icon">
                  {selection.choice === 'trick' ? '🎭' : '🍬'}
                </div>
                <div className="activity-content">
                  <span className="activity-title">
                    {selection.quiz?.title || 'Quiz Desconocido'}
                  </span>
                  <span className="activity-meta">
                    {selection.choice === 'trick' ? 'Trick' : 'Treat'} • {formatDate(selection.created_at)}
                  </span>
                </div>
                <div className={`activity-badge ${selection.choice}`}>
                  {selection.choice === 'trick' ? 'T' : 'T'}
                </div>
              </div>
            ))}
          </div>
          
          {selections.length > 5 && (
            <p className="activity-more">
              Y {selections.length - 5} actividades más...
            </p>
          )}
        </div>
      )}

      {/* Logros */}
      <div className="achievements-section">
        <h4>🏆 Logros</h4>
        <div className="achievements-grid">
          {stats.totalQuizzes >= 1 && (
            <div className="achievement unlocked">
              <span className="achievement-icon">🎪</span>
              <span className="achievement-name">Primer Paso</span>
            </div>
          )}
          
          {stats.tricksCompleted >= 3 && (
            <div className="achievement unlocked">
              <span className="achievement-icon">🎭</span>
              <span className="achievement-name">Maestro de Tricks</span>
            </div>
          )}
          
          {stats.treatsCompleted >= 3 && (
            <div className="achievement unlocked">
              <span className="achievement-icon">🍬</span>
              <span className="achievement-name">Rey de Treats</span>
            </div>
          )}
          
          {stats.totalQuizzes >= 10 && (
            <div className="achievement unlocked">
              <span className="achievement-icon">👑</span>
              <span className="achievement-name">Leyenda Halloween</span>
            </div>
          )}
          
          {stats.totalQuizzes >= 15 && (
            <div className="achievement unlocked special">
              <span className="achievement-icon">🏆</span>
              <span className="achievement-name">Completista</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserStatsComponent;