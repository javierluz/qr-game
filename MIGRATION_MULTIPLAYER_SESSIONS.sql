-- Migration: Convert from individual users to centralized game sessions
-- This migration creates the new schema for multiplayer party game sessions

-- 1. Create GameSessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Players table (replaces individual user management)
CREATE TABLE IF NOT EXISTS players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_position INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    active_tricks JSONB DEFAULT '[]'::jsonb, -- Array of quiz IDs currently active as tricks
    pending_treats JSONB DEFAULT '[]'::jsonb, -- Array of quiz IDs pending as treats
    completed_quizzes JSONB DEFAULT '[]'::jsonb, -- Array of completed quiz IDs for tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, order_position), -- Ensure unique order within session
    UNIQUE(session_id, name) -- Ensure unique names within session
);

-- 3. Create Turns table (manages current turn state)
CREATE TABLE IF NOT EXISTS turns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE UNIQUE, -- One turn record per session
    current_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    turn_index INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_host ON game_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_active ON game_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_players_session ON players(session_id);
CREATE INDEX IF NOT EXISTS idx_players_order ON players(session_id, order_position);
CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id);

-- 5. Add RLS policies

-- Game Sessions: Host can manage their own sessions, others can read active sessions
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can manage own sessions" ON game_sessions
    FOR ALL USING (auth.uid() = host_user_id);

CREATE POLICY "Anyone can read active sessions" ON game_sessions
    FOR SELECT USING (is_active = true);

-- Players: Anyone can read/modify players within active sessions
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage players in active sessions" ON players
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM game_sessions 
            WHERE game_sessions.id = players.session_id 
            AND game_sessions.is_active = true
        )
    );

-- Turns: Anyone can read/modify turns within active sessions
ALTER TABLE turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage turns in active sessions" ON turns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM game_sessions 
            WHERE game_sessions.id = turns.session_id 
            AND game_sessions.is_active = true
        )
    );

-- 6. Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_turns_updated_at BEFORE UPDATE ON turns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Create helpful views
CREATE OR REPLACE VIEW active_game_sessions AS
SELECT 
    gs.*,
    COUNT(p.id) as player_count,
    t.current_player_id,
    t.turn_index,
    cp.name as current_player_name
FROM game_sessions gs
LEFT JOIN players p ON gs.id = p.session_id
LEFT JOIN turns t ON gs.id = t.session_id
LEFT JOIN players cp ON t.current_player_id = cp.id
WHERE gs.is_active = true
GROUP BY gs.id, t.current_player_id, t.turn_index, cp.name;

-- 8. Function to get session leaderboard
CREATE OR REPLACE FUNCTION get_session_leaderboard(session_uuid UUID)
RETURNS TABLE (
    player_id UUID,
    player_name TEXT,
    score INTEGER,
    active_tricks_count INTEGER,
    pending_treats_count INTEGER,
    completed_quizzes_count INTEGER,
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.score,
        jsonb_array_length(p.active_tricks) as active_tricks_count,
        jsonb_array_length(p.pending_treats) as pending_treats_count,
        jsonb_array_length(p.completed_quizzes) as completed_quizzes_count,
        ROW_NUMBER() OVER (ORDER BY p.score DESC, p.order_position ASC)::INTEGER as rank
    FROM players p
    WHERE p.session_id = session_uuid
    ORDER BY p.score DESC, p.order_position ASC;
END;
$$ LANGUAGE plpgsql;