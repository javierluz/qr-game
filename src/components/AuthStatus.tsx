import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthStatusProps {
  showUserInfo?: boolean;
  showLoginButton?: boolean;
  className?: string;
}

export function AuthStatus({ showUserInfo = true, showLoginButton = true, className = '' }: AuthStatusProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    }
  };

  if (loading) {
    return (
      <div className={`auth-status loading ${className}`}>
        <span>⏳</span>
        
        <style>{`
          .auth-status.loading {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
          }
        `}</style>
      </div>
    );
  }

  if (user) {
    return (
      <div className={`auth-status authenticated ${className}`}>
        {showUserInfo && (
          <div className="user-info">
            <span className="user-indicator">👤</span>
            <span className="user-email">{user.email}</span>
            {user.user_metadata?.display_name && (
              <span className="user-name">({user.user_metadata.display_name})</span>
            )}
          </div>
        )}
        
        <div className="auth-actions">
          <a href="/sessions" className="sessions-link">
            🎮 Sessions
          </a>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>

        <style>{`
          .auth-status.authenticated {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
          }

          .user-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: white;
            font-size: 0.9rem;
          }

          .user-indicator {
            font-size: 1.2rem;
          }

          .user-email {
            font-weight: 600;
          }

          .user-name {
            color: rgba(255, 255, 255, 0.8);
            font-style: italic;
          }

          .auth-actions {
            display: flex;
            gap: 0.5rem;
            align-items: center;
          }

          .sessions-link {
            background: rgba(79, 70, 229, 0.8);
            color: white;
            text-decoration: none;
            padding: 0.4rem 0.8rem;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 600;
            transition: background-color 0.2s;
          }

          .sessions-link:hover {
            background: rgba(79, 70, 229, 1);
          }

          .logout-btn {
            background: rgba(239, 68, 68, 0.8);
            color: white;
            border: none;
            padding: 0.4rem 0.8rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            transition: background-color 0.2s;
          }

          .logout-btn:hover {
            background: rgba(239, 68, 68, 1);
          }

          @media (max-width: 640px) {
            .auth-status.authenticated {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
            }

            .user-info {
              flex-wrap: wrap;
            }
          }
        `}</style>
      </div>
    );
  }

  // Not authenticated
  if (!showLoginButton) {
    return (
      <div className={`auth-status not-authenticated ${className}`}>
        <span className="auth-indicator">🔒</span>
        <span>Not logged in</span>
        
        <style>{`
          .auth-status.not-authenticated {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
          }

          .auth-indicator {
            font-size: 1rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`auth-status not-authenticated ${className}`}>
      <span className="auth-indicator">🔒</span>
      <a href="/login" className="login-link">
        Login
      </a>

      <style>{`
        .auth-status.not-authenticated {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .auth-indicator {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .login-link {
          background: rgba(79, 70, 229, 0.8);
          color: white;
          text-decoration: none;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: background-color 0.2s;
        }

        .login-link:hover {
          background: rgba(79, 70, 229, 1);
        }
      `}</style>
    </div>
  );
}