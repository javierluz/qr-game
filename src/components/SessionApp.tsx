import React, { useEffect, useState } from 'react';
import { SessionSetup } from './SessionSetup';
import { SessionControls } from './SessionControls';
import { SessionList } from './SessionList';
import { useGameSession } from '../hooks/useGameSession';

type ViewMode = 'list' | 'setup' | 'active';

export function SessionApp() {
  const { session, loadSession, loadPersistedSession, clearSession } = useGameSession();
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Try to load persisted session on mount
    const initializeSession = async () => {
      if (isInitialized) return; // Evitar re-inicialización
      
      try {
        const hasSession = await loadPersistedSession();
        if (hasSession) {
          setViewMode('active');
        } else {
          setViewMode('list');
        }
      } catch (error) {
        console.error('Failed to load persisted session:', error);
        setViewMode('list');
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeSession();
  }, []); // Solo ejecutar una vez al montar

  const handleSessionCreated = (sessionId: string) => {
    setViewMode('active');
  };

  const handleEndSession = () => {
    setViewMode('list');
  };

  const handleCreateNewSession = () => {
    setViewMode('setup');
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      await loadSession(sessionId);
      setViewMode('active');
    } catch (error) {
      console.error('Failed to load session:', error);
      alert('Failed to load session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToList = () => {
    clearSession();
    setViewMode('list');
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading session...</p>
        
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            color: white;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-left: 4px solid white;
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

  return (
    <div className="session-app">
      <header className="app-header">
        <h1>QR Game - Multiplayer Sessions</h1>
        
        {viewMode === 'active' && (
          <div className="header-actions">
            <button onClick={handleBackToList} className="back-to-list-btn">
              ← Back to Sessions
            </button>
            <button onClick={handleCreateNewSession} className="new-session-btn">
              New Session
            </button>
          </div>
        )}
        
        {viewMode === 'setup' && (
          <button onClick={handleBackToList} className="back-to-list-btn">
            ← Back to Sessions
          </button>
        )}
      </header>

      <div className="app-content">
        {viewMode === 'list' && (
          <SessionList 
            onSelectSession={handleSelectSession}
            onCreateNewSession={handleCreateNewSession}
          />
        )}
        
        {viewMode === 'setup' && (
          <SessionSetup onSessionCreated={handleSessionCreated} />
        )}
        
        {viewMode === 'active' && (
          <SessionControls onEndSession={handleEndSession} />
        )}
      </div>

      <style>{`
        .session-app {
          min-height: 100vh;
          color: white;
        }

        .app-header {
          text-align: center;
          margin-bottom: 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .app-header h1 {
          margin: 0;
          font-size: 2.5rem;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .new-session-btn, .back-to-list-btn {
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.2);
        }

        .new-session-btn:hover, .back-to-list-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .back-to-list-btn {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .back-to-list-btn:hover {
          background: rgba(59, 130, 246, 0.3);
          border-color: rgba(59, 130, 246, 0.5);
        }

        .app-content {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 60vh;
        }

        @media (max-width: 768px) {
          .app-header {
            flex-direction: column;
            gap: 1rem;
          }

          .app-header h1 {
            font-size: 2rem;
          }

          .app-content {
            padding: 0 1rem;
          }
        }
      `}</style>
    </div>
  );
}