import React, { useState, useEffect } from 'react';
import { getCurrentUser, getUserStats, getUserSelections, type UserSelectedQuiz } from '../lib/quiz-utils';
import { supabase } from '../lib/supabase';

interface UserStats {
  totalQuizzes: number;
  tricksCompleted: number;
  treatsCompleted: number;
  tricksDeserted: number;
}

interface UserStatsProps {
  onStatsLoaded?: (stats: UserStats) => void;
}

const UserStatsComponent: React.FC<UserStatsProps> = ({ onStatsLoaded }) => {
  const [stats, setStats] = useState<UserStats>({
    totalQuizzes: 0,
    tricksCompleted: 0,
    treatsCompleted: 0,
    tricksDeserted: 0
  });
  const [selections, setSelections] = useState<UserSelectedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');

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

  const updateDisplayName = async () => {
    if (!newDisplayName.trim() || !user) return;

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: newDisplayName.trim(),
          full_name: newDisplayName.trim()
        }
      });

      if (error) {
        setError('Error al actualizar el nombre: ' + error.message);
        return;
      }

      // Reload user data to get updated info
      await loadUserData();
      setIsEditingName(false);
      setNewDisplayName('');
    } catch (err) {
      console.error('Error updating display name:', err);
      setError('Error al actualizar el nombre');
    } finally {
      setLoading(false);
    }
  };

  const startEditingName = () => {
    setIsEditingName(true);
    setNewDisplayName(user?.user_metadata?.display_name || '');
  };

  const cancelEditing = () => {
    setIsEditingName(false);
    setNewDisplayName('');
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

  const totalTricks = stats.tricksCompleted + stats.tricksDeserted;
  const desertionPercentage = totalTricks > 0 
    ? Math.round((stats.tricksDeserted / totalTricks) * 100)
    : 0;

  return (
    <div className="user-stats-container">
      {/* Header de Usuario */}
      <div className="user-header">
        <div className="user-avatar">👤</div>
        <div className="user-info">
          {isEditingName ? (
            <div className="edit-name-container">
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Nuevo nombre"
                className="edit-name-input"
                maxLength={50}
              />
              <div className="edit-name-actions">
                <button onClick={updateDisplayName} className="save-btn">
                  ✓ Guardar
                </button>
                <button onClick={cancelEditing} className="cancel-btn">
                  ✕ Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="display-name-container">
              <h3>{user?.user_metadata?.display_name || 'Aventurero'}</h3>
              <button onClick={startEditingName} className="edit-name-btn">
                ✏️ Editar
              </button>
            </div>
          )}
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
            <span className="stat-label">Tricks Activos</span>
          </div>
        </div>

        <div className="stat-card treats">
          <div className="stat-icon">🍬</div>
          <div className="stat-content">
            <span className="stat-number">{stats.treatsCompleted}</span>
            <span className="stat-label">Treats Completados</span>
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

          {totalTricks > 0 && (
            <div className="progress-item">
              <div className="progress-header">
                <span>Tasa de Deserción de Tricks</span>
                <span className="progress-percentage">{desertionPercentage}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill desertion"
                  style={{ width: `${desertionPercentage}%` }}
                ></div>
              </div>
              <small className="progress-note">
                {stats.tricksDeserted} de {totalTricks} tricks desertados
              </small>
            </div>
          )}
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