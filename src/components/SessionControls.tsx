import React, { useState } from 'react';
import { useGameSession } from '../hooks/useGameSession';
import type { Player } from '../types/session';

interface SessionControlsProps {
  onEndSession?: () => void;
}

export function SessionControls({ onEndSession }: SessionControlsProps) {
  const {
    session,
    players,
    currentPlayer,
    turn,
    leaderboard,
    isSessionActive,
    nextTurn,
    setCurrentPlayer,
    addPlayer,
    pauseSession,
    resumeSession,
    endSession,
    refreshSessionData
  } = useGameSession();

  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!session) {
    return (
      <div className="no-session">
        <p>No active session</p>
      </div>
    );
  }

  const handleNextTurn = async () => {
    setIsLoading(true);
    try {
      await nextTurn();
    } catch (error) {
      console.error('Failed to advance turn:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCurrentPlayer = async (playerId: string) => {
    setIsLoading(true);
    try {
      await setCurrentPlayer(playerId);
    } catch (error) {
      console.error('Failed to set current player:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setIsAddingPlayer(true);
    try {
      await addPlayer(newPlayerName.trim());
      setNewPlayerName('');
    } catch (error) {
      console.error('Failed to add player:', error);
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handlePauseResume = async () => {
    setIsLoading(true);
    try {
      if (isSessionActive) {
        await pauseSession();
      } else {
        await resumeSession();
      }
    } catch (error) {
      console.error('Failed to pause/resume session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (confirm('Are you sure you want to end this session? This cannot be undone.')) {
      setIsLoading(true);
      try {
        await endSession();
        onEndSession?.();
      } catch (error) {
        console.error('Failed to end session:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="session-controls">
      <div className="session-header">
        <h2>{session.session_name}</h2>
        <div className="session-status">
          <span className={`status-badge ${isSessionActive ? 'active' : 'paused'}`}>
            {isSessionActive ? 'Active' : 'Paused'}
          </span>
          <span className="session-id">ID: {session.id}</span>
        </div>
      </div>

      <div className="current-turn">
        <h3>Current Turn</h3>
        {currentPlayer ? (
          <div className="current-player">
            <span className="player-name">{currentPlayer.name}</span>
            <span className="turn-number">Turn #{turn?.turn_index || 0}</span>
          </div>
        ) : (
          <p>No current player</p>
        )}
        
        <div className="turn-controls">
          <button
            onClick={handleNextTurn}
            disabled={isLoading || !isSessionActive}
            className="next-turn-btn"
          >
            {isLoading ? 'Processing...' : 'Next Turn'}
          </button>
          
          <button
            onClick={handlePauseResume}
            disabled={isLoading}
            className="pause-resume-btn"
          >
            {isLoading ? 'Processing...' : (isSessionActive ? 'Pause' : 'Resume')}
          </button>
        </div>
      </div>

      <div className="players-section">
        <h3>Players ({players.length})</h3>
        
        <div className="players-list">
          {players.map((player: Player) => (
            <div
              key={player.id}
              className={`player-item ${currentPlayer?.id === player.id ? 'current' : ''}`}
            >
              <span className="player-name">{player.name}</span>
              <span className="player-score">Score: {player.score || 0}</span>
              {currentPlayer?.id !== player.id && (
                <button
                  onClick={() => handleSetCurrentPlayer(player.id)}
                  disabled={isLoading || !isSessionActive}
                  className="set-current-btn"
                >
                  Set Current
                </button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAddPlayer} className="add-player-form">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Add new player..."
            disabled={isAddingPlayer}
            maxLength={50}
          />
          <button
            type="submit"
            disabled={isAddingPlayer || !newPlayerName.trim()}
            className="add-player-btn"
          >
            {isAddingPlayer ? 'Adding...' : 'Add'}
          </button>
        </form>
      </div>

      <div className="leaderboard-section">
        <h3>Leaderboard</h3>
        {leaderboard.length > 0 ? (
          <div className="leaderboard">
            {leaderboard.map((entry, index) => (
              <div key={entry.player_id} className="leaderboard-item">
                <span className="rank">#{index + 1}</span>
                <span className="player-name">{entry.player_name}</span>
                <span className="score">{entry.score}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-scores">No scores yet</p>
        )}
      </div>

      <div className="session-actions">
        <button
          onClick={() => refreshSessionData()}
          disabled={isLoading}
          className="refresh-btn"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
        
        <button
          onClick={handleEndSession}
          disabled={isLoading}
          className="end-session-btn"
        >
          End Session
        </button>
      </div>

      <style>{`
        .session-controls {
          max-width: 600px;
          margin: 0 auto;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .session-header {
          text-align: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f3f4f6;
        }

        .session-header h2 {
          margin: 0 0 0.5rem 0;
          color: #333;
        }

        .session-status {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.active {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.paused {
          background: #fef3c7;
          color: #92400e;
        }

        .session-id {
          font-size: 0.875rem;
          color: #6b7280;
          font-family: monospace;
        }

        .current-turn {
          margin-bottom: 2rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .current-turn h3 {
          margin: 0 0 1rem 0;
          color: #374151;
        }

        .current-player {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .player-name {
          font-weight: 600;
          font-size: 1.1rem;
          color: #1f2937;
        }

        .turn-number {
          background: #4f46e5;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .turn-controls {
          display: flex;
          gap: 0.5rem;
        }

        .next-turn-btn, .pause-resume-btn {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .next-turn-btn {
          background: #10b981;
          color: white;
        }

        .next-turn-btn:hover:not(:disabled) {
          background: #059669;
        }

        .pause-resume-btn {
          background: #f59e0b;
          color: white;
        }

        .pause-resume-btn:hover:not(:disabled) {
          background: #d97706;
        }

        .players-section {
          margin-bottom: 2rem;
        }

        .players-section h3 {
          margin: 0 0 1rem 0;
          color: #374151;
        }

        .players-list {
          margin-bottom: 1rem;
        }

        .player-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-bottom: 0.5rem;
        }

        .player-item.current {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .player-score {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .set-current-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
        }

        .set-current-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .add-player-form {
          display: flex;
          gap: 0.5rem;
        }

        .add-player-form input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
        }

        .add-player-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
        }

        .add-player-btn:hover:not(:disabled) {
          background: #059669;
        }

        .leaderboard-section {
          margin-bottom: 2rem;
        }

        .leaderboard-section h3 {
          margin: 0 0 1rem 0;
          color: #374151;
        }

        .leaderboard-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .rank {
          font-weight: 600;
          color: #f59e0b;
          min-width: 2rem;
        }

        .score {
          font-weight: 600;
          color: #059669;
        }

        .no-scores {
          color: #6b7280;
          font-style: italic;
          text-align: center;
          padding: 1rem;
        }

        .session-actions {
          display: flex;
          gap: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .refresh-btn {
          flex: 1;
          background: #6b7280;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 6px;
          cursor: pointer;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #4b5563;
        }

        .end-session-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .end-session-btn:hover:not(:disabled) {
          background: #dc2626;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .no-session {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        @media (max-width: 640px) {
          .session-controls {
            margin: 1rem;
            padding: 1rem;
          }

          .session-status {
            flex-direction: column;
            gap: 0.5rem;
          }

          .turn-controls {
            flex-direction: column;
          }

          .player-item {
            flex-direction: column;
            gap: 0.5rem;
            text-align: center;
          }

          .session-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}