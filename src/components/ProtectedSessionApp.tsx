import React, { useEffect, useState } from 'react';
import { SessionApp } from './SessionApp';
import { AuthComponent } from './AuthComponent';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function ProtectedSessionApp() {
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
        
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

  if (user) {
    return <SessionApp />;
  }

  // Not authenticated - show auth component
  return (
    <div>
      <div className="auth-redirect-header">
        <h2>🔐 Authentication Required</h2>
        <p>Please login to access multiplayer game sessions</p>
      </div>
      
      <AuthComponent redirectAfterLogin="/sessions" />
      
      <style>{`
        .auth-redirect-header {
          text-align: center;
          margin-bottom: 2rem;
          color: white;
        }

        .auth-redirect-header h2 {
          margin: 0 0 1rem 0;
          font-size: 2rem;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .auth-redirect-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 1.1rem;
        }
      `}</style>
    </div>
  );
}