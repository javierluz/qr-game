import React, { useState, useEffect } from 'react';
import { gameSessionService } from '../lib/gameSessionService';
import type { ActiveGameSession } from '../types/session';

interface SessionListProps {
  onSelectSession?: (sessionId: string) => void;
  onCreateNewSession?: () => void;
}

export function SessionList({ onSelectSession, onCreateNewSession }: SessionListProps) {
  const [sessions, setSessions] = useState<ActiveGameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const userSessions = await gameSessionService.getUserSessions();
      
      // Note: Removed test session as it causes UUID errors in /sessions/play
      // Real sessions should be created through the "New Session" flow
      
      setSessions(userSessions);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };  const handleSelectSession = (sessionId: string) => {
    if (onSelectSession) {
      onSelectSession(sessionId);
    }
  };

  const handleDeleteSession = async (sessionId: string, sessionName: string) => {
    if (confirm(`Are you sure you want to delete "${sessionName}"?`)) {
      await deleteSession(sessionId);
    }
  };

  const handleCreateNew = () => {
    if (onCreateNewSession) {
      onCreateNewSession();
    }
  };

    const deleteSession = async (sessionId: string) => {
    try {
      await gameSessionService.endSession(sessionId);
      await loadSessions(); // Reload the list
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('Failed to delete session');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="session-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading your sessions...</p>
        
        <style>{`
          .session-list-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            color: white;
          }

          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-left: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="session-list-error">
        <h3>❌ Error Loading Sessions</h3>
        <p>{error}</p>
        <button onClick={loadSessions} className="retry-btn">
          Try Again
        </button>
        
        <style>{`
          .session-list-error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
            color: white;
            margin: 2rem 0;
          }

          .session-list-error h3 {
            margin: 0 0 1rem 0;
            color: #fca5a5;
          }

          .session-list-error p {
            margin: 0 0 1.5rem 0;
            color: rgba(255, 255, 255, 0.8);
          }

          .retry-btn {
            background: #ef4444;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
          }

          .retry-btn:hover {
            background: #dc2626;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="session-list">
      <div className="session-list-header">
        <h2>Your Game Sessions</h2>
        <button onClick={handleCreateNew} className="create-new-btn">
          + New Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎮</div>
          <h3>No sessions yet</h3>
          <p>Create your first multiplayer game session to get started!</p>
          <button onClick={handleCreateNew} className="create-first-btn">
            Create Your First Session
          </button>
        </div>
      ) : (
        <div className="sessions-grid">
          {sessions.map((session) => (
            <div key={session.id} className="session-card">
              <div className="session-header">
                <h3 className="session-name">{session.session_name}</h3>
                <div className={`session-status ${session.is_active ? 'active' : 'finished'}`}>
                  {session.is_active ? '🟢 Active' : '🔴 Finished'}
                </div>
              </div>

              <div className="session-info">
                <div className="session-detail">
                  <span className="detail-label">Players:</span>
                  <span className="detail-value">{session.player_count}</span>
                </div>
                <div className="session-detail">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{formatDate(session.created_at)}</span>
                </div>
                <div className="session-detail">
                  <span className="detail-label">Updated:</span>
                  <span className="detail-value">{formatDate(session.updated_at)}</span>
                </div>
              </div>

              <div className="session-actions">
                <button 
                  onClick={() => {
                    const url = `/sessions/play?id=${session.id}`;
                    window.location.href = url;
                  }}
                  className={`select-btn ${session.is_active ? 'active' : 'finished'}`}
                >
                  {session.is_active ? '🎮 Jugar Ahora' : '📊 Ver Resultados'}
                </button>
                <button 
                  onClick={() => handleDeleteSession(session.id, session.session_name)}
                  className="delete-btn"
                  title="Delete session"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .session-list {
          max-width: 1000px;
          margin: 0 auto;
          padding: 1rem;
        }

        .session-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .session-list-header h2 {
          margin: 0;
          color: white;
          font-size: 2rem;
        }

        .create-new-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          transition: background-color 0.2s;
        }

        .create-new-btn:hover {
          background: #059669;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          margin: 0 0 1rem 0;
          color: white;
          font-size: 1.5rem;
        }

        .empty-state p {
          margin: 0 0 2rem 0;
          color: rgba(255, 255, 255, 0.8);
        }

        .create-first-btn {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1.1rem;
          transition: background-color 0.2s;
        }

        .create-first-btn:hover {
          background: #4338ca;
        }

        .sessions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .session-card {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 1.5rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .session-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
          gap: 1rem;
        }

        .session-name {
          margin: 0;
          color: white;
          font-size: 1.2rem;
          word-break: break-word;
          flex: 1;
        }

        .session-status {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .session-status.active {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .session-status.finished {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .session-info {
          margin-bottom: 1.5rem;
        }

        .session-detail {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .detail-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        .detail-value {
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .session-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .select-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background-color 0.2s;
        }

        .select-btn.active {
          background: #10b981;
          color: white;
        }

        .select-btn.active:hover {
          background: #059669;
        }

        .select-btn.finished {
          background: #6b7280;
          color: white;
        }

        .select-btn.finished:hover {
          background: #4b5563;
        }

        .delete-btn {
          background: rgba(239, 68, 68, 0.8);
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
          min-width: 44px;
        }

        .delete-btn:hover {
          background: rgba(239, 68, 68, 1);
        }

        @media (max-width: 768px) {
          .session-list {
            padding: 0.5rem;
          }

          .session-list-header {
            flex-direction: column;
            align-items: stretch;
          }

          .session-list-header h2 {
            text-align: center;
            font-size: 1.5rem;
          }

          .sessions-grid {
            grid-template-columns: 1fr;
          }

          .session-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .session-status {
            align-self: flex-start;
          }
        }
      `}</style>
    </div>
  );
}