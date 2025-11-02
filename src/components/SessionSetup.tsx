import React, { useState } from 'react';
import { useGameSession } from '../hooks/useGameSession';

interface SessionSetupProps {
  onSessionCreated?: (sessionId: string) => void;
}

export function SessionSetup({ onSessionCreated }: SessionSetupProps) {
  const [sessionName, setSessionName] = useState('');
  const [playerNames, setPlayerNames] = useState(['']);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createSession } = useGameSession();

  const addPlayerField = () => {
    setPlayerNames([...playerNames, '']);
  };

  const removePlayerField = (index: number) => {
    if (playerNames.length > 1) {
      const newNames = playerNames.filter((_, i) => i !== index);
      setPlayerNames(newNames);
    }
  };

  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      // Validate inputs
      if (!sessionName.trim()) {
        throw new Error('Session name is required');
      }

      const validPlayerNames = playerNames
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (validPlayerNames.length < 1) {
        throw new Error('At least one player is required');
      }

      // Create session
      const session = await createSession(sessionName.trim(), validPlayerNames);
      
      // Notify parent component
      onSessionCreated?.(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="session-setup">
      <h2>Create New Game Session</h2>
      
      <form onSubmit={handleSubmit} className="setup-form">
        <div className="form-group">
          <label htmlFor="sessionName">Session Name:</label>
          <input
            id="sessionName"
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Enter session name..."
            required
            disabled={isCreating}
          />
        </div>

        <div className="form-group">
          <label>Players:</label>
          <div className="players-list">
            {playerNames.map((name, index) => (
              <div key={index} className="player-input">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updatePlayerName(index, e.target.value)}
                  placeholder={`Player ${index + 1} name...`}
                  disabled={isCreating}
                />
                {playerNames.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePlayerField(index)}
                    className="remove-player"
                    disabled={isCreating}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <button
            type="button"
            onClick={addPlayerField}
            className="add-player"
            disabled={isCreating || playerNames.length >= 8}
          >
            + Add Player
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="create-session-btn"
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Session'}
          </button>
        </div>
      </form>

      <style>{`
        .session-setup {
          max-width: 500px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .session-setup h2 {
          text-align: center;
          margin-bottom: 2rem;
          color: #333;
        }

        .setup-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: #555;
        }

        .form-group input {
          padding: 0.75rem;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #4f46e5;
        }

        .players-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .player-input {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .player-input input {
          flex: 1;
        }

        .remove-player {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
        }

        .remove-player:hover {
          background: #dc2626;
        }

        .add-player {
          background: #10b981;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          align-self: flex-start;
        }

        .add-player:hover {
          background: #059669;
        }

        .add-player:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 6px;
          border: 1px solid #fecaca;
          font-size: 0.9rem;
        }

        .form-actions {
          margin-top: 1rem;
        }

        .create-session-btn {
          width: 100%;
          background: #4f46e5;
          color: white;
          border: none;
          padding: 1rem;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .create-session-btn:hover {
          background: #4338ca;
        }

        .create-session-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}