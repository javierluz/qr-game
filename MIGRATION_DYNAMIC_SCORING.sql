-- 🎃 MIGRATION: Sistema Dinámico de Puntaje - Tricks y Treats
-- Ejecutar en el SQL Editor de Supabase Dashboard
-- ⚠️  IMPORTANTE: Hacer backup antes de ejecutar

BEGIN;

-- ==============================================
-- 0. VERIFICACIONES PREVIAS
-- ==============================================

-- Verificar que existan las tablas requeridas
DO $$
BEGIN
    -- Verificar que existe la tabla quizzes para las foreign keys
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quizzes') THEN
        RAISE EXCEPTION 'La tabla "quizzes" no existe. Esta migración requiere que exista previamente.';
    END IF;
    
    -- Verificar que existan las tablas del sistema de sesiones
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'game_sessions') THEN
        RAISE EXCEPTION 'La tabla "game_sessions" no existe. Ejecuta primero MIGRATION_MULTIPLAYER_SESSIONS.sql';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'players') THEN
        RAISE EXCEPTION 'La tabla "players" no existe. Ejecuta primero MIGRATION_MULTIPLAYER_SESSIONS.sql';
    END IF;
END $$;

-- ==============================================
-- 1. CREAR NUEVAS TABLAS
-- ==============================================

-- Tabla para tracking individual de tricks activos
CREATE TABLE IF NOT EXISTS player_tricks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deserted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    is_active BOOLEAN GENERATED ALWAYS AS (deserted_at IS NULL) STORED,
    -- Tracking de puntos generados por este trick
    points_generated INTEGER DEFAULT 0,
    last_point_turn INTEGER DEFAULT 0, -- Último turno en que generó puntos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, quiz_id, session_id) -- Un jugador no puede tener el mismo trick dos veces
);

-- Tabla para tracking individual de treats
CREATE TABLE IF NOT EXISTS player_treats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    deserted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    status TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN completed_at IS NOT NULL THEN 'completed'
            WHEN deserted_at IS NOT NULL THEN 'deserted'
            ELSE 'pending'
        END
    ) STORED,
    points_awarded INTEGER DEFAULT 0, -- +1 si completado, -1 si desertado, 0 si pendiente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, quiz_id, session_id) -- Un jugador no puede tener el mismo treat dos veces
);

-- Tabla para historial de turnos y tracking de acciones
CREATE TABLE IF NOT EXISTS turn_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    action_taken TEXT NOT NULL, -- 'turn_start', 'select_trick', 'select_treat', 'complete_treat', 'desert_trick', 'desert_treat'
    quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL, -- Quiz relacionado con la acción (si aplica)
    points_change INTEGER DEFAULT 0, -- Cambio en puntos debido a esta acción
    tricks_points_awarded INTEGER DEFAULT 0, -- Puntos específicos de tricks en este turno
    treats_points_awarded INTEGER DEFAULT 0, -- Puntos específicos de treats en este turno
    is_current BOOLEAN DEFAULT false, -- True para el turno actual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 2. MODIFICAR TABLAS EXISTENTES
-- ==============================================

-- Agregar nuevas columnas a la tabla players
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS current_score INTEGER DEFAULT 0, -- Puntaje calculado dinámicamente
ADD COLUMN IF NOT EXISTS total_tricks_selected INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_treats_selected INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tricks_deserted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_treats_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_treats_deserted INTEGER DEFAULT 0;

-- Migrar score existente a current_score
UPDATE players SET current_score = score WHERE current_score = 0;

-- Agregar tracking de turnos a la tabla turns
ALTER TABLE turns 
ADD COLUMN IF NOT EXISTS turn_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_action TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- ==============================================
-- 3. CREAR ÍNDICES PARA RENDIMIENTO
-- ==============================================

-- Índices para player_tricks
CREATE INDEX IF NOT EXISTS idx_player_tricks_active ON player_tricks(player_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_player_tricks_session ON player_tricks(session_id, is_active);
CREATE INDEX IF NOT EXISTS idx_player_tricks_points ON player_tricks(player_id, points_generated) WHERE is_active = true;

-- Índices para player_treats  
CREATE INDEX IF NOT EXISTS idx_player_treats_status ON player_treats(player_id, status);
CREATE INDEX IF NOT EXISTS idx_player_treats_session ON player_treats(session_id, status);
CREATE INDEX IF NOT EXISTS idx_player_treats_pending ON player_treats(player_id) WHERE status = 'pending';

-- Índices para turn_history
CREATE INDEX IF NOT EXISTS idx_turn_history_session ON turn_history(session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_turn_history_current ON turn_history(session_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_turn_history_player ON turn_history(player_id, turn_number);

-- ==============================================
-- 4. AGREGAR POLÍTICAS RLS PARA NUEVAS TABLAS
-- ==============================================

-- Player Tricks: Anyone can manage tricks within active sessions
ALTER TABLE player_tricks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Crear política solo si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'player_tricks' 
        AND policyname = 'Anyone can manage player tricks in active sessions'
    ) THEN
        CREATE POLICY "Anyone can manage player tricks in active sessions" ON player_tricks
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM game_sessions 
                    WHERE game_sessions.id = player_tricks.session_id 
                    AND game_sessions.is_active = true
                )
            );
    END IF;
END $$;

-- Player Treats: Anyone can manage treats within active sessions
ALTER TABLE player_treats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Crear política solo si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'player_treats' 
        AND policyname = 'Anyone can manage player treats in active sessions'
    ) THEN
        CREATE POLICY "Anyone can manage player treats in active sessions" ON player_treats
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM game_sessions 
                    WHERE game_sessions.id = player_treats.session_id 
                    AND game_sessions.is_active = true
                )
            );
    END IF;
END $$;

-- Turn History: Anyone can read/add history within active sessions
ALTER TABLE turn_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Crear política solo si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'turn_history' 
        AND policyname = 'Anyone can manage turn history in active sessions'
    ) THEN
        CREATE POLICY "Anyone can manage turn history in active sessions" ON turn_history
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM game_sessions 
                    WHERE game_sessions.id = turn_history.session_id 
                    AND game_sessions.is_active = true
                )
            );
    END IF;
END $$;

-- ==============================================
-- 5. AGREGAR TRIGGERS PARA updated_at
-- ==============================================

-- Crear triggers solo si no existen
DO $$
BEGIN
    -- Trigger para player_tricks
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_player_tricks_updated_at'
    ) THEN
        CREATE TRIGGER update_player_tricks_updated_at BEFORE UPDATE ON player_tricks
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Trigger para player_treats
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_player_treats_updated_at'
    ) THEN
        CREATE TRIGGER update_player_treats_updated_at BEFORE UPDATE ON player_treats
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Trigger para turn_history
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_turn_history_updated_at'
    ) THEN
        CREATE TRIGGER update_turn_history_updated_at BEFORE UPDATE ON turn_history
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ==============================================
-- 6. FUNCIONES PARA LÓGICA DEL JUEGO
-- ==============================================

-- Función para calcular puntos dinámicos de un jugador
CREATE OR REPLACE FUNCTION calculate_player_score(p_player_id UUID)
RETURNS INTEGER AS $$
DECLARE
    tricks_points INTEGER := 0;
    treats_points INTEGER := 0;
    total_points INTEGER := 0;
BEGIN
    -- Sumar puntos de tricks activos (points_generated)
    SELECT COALESCE(SUM(points_generated), 0) 
    INTO tricks_points
    FROM player_tricks 
    WHERE player_id = p_player_id AND is_active = true;
    
    -- Sumar puntos de treats (completados = +1, desertados = -1)
    SELECT COALESCE(SUM(points_awarded), 0)
    INTO treats_points
    FROM player_treats 
    WHERE player_id = p_player_id;
    
    total_points := tricks_points + treats_points;
    
    -- Actualizar current_score en la tabla players
    UPDATE players 
    SET current_score = total_points 
    WHERE id = p_player_id;
    
    RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Función para inicio de turno (otorgar puntos por tricks activos)
CREATE OR REPLACE FUNCTION start_player_turn(p_player_id UUID, p_session_id UUID, p_turn_number INTEGER)
RETURNS INTEGER AS $$
DECLARE
    active_tricks_count INTEGER := 0;
    new_points INTEGER := 0;
BEGIN
    -- Contar tricks activos del jugador
    SELECT COUNT(*) 
    INTO active_tricks_count
    FROM player_tricks 
    WHERE player_id = p_player_id 
    AND is_active = true;
    
    -- Otorgar 1 punto por cada trick activo
    new_points := active_tricks_count;
    
    -- Actualizar points_generated y last_point_turn en cada trick activo
    UPDATE player_tricks 
    SET 
        points_generated = points_generated + 1,
        last_point_turn = p_turn_number
    WHERE player_id = p_player_id 
    AND is_active = true;
    
    -- Registrar en turn_history
    INSERT INTO turn_history (
        session_id, 
        player_id, 
        turn_number, 
        tricks_points_awarded,
        action_taken
    ) VALUES (
        p_session_id,
        p_player_id,
        p_turn_number,
        new_points,
        'turn_start'
    );
    
    -- Recalcular puntaje total del jugador
    PERFORM calculate_player_score(p_player_id);
    
    RETURN new_points;
END;
$$ LANGUAGE plpgsql;

-- Función para seleccionar un nuevo trick
CREATE OR REPLACE FUNCTION select_new_trick(p_player_id UUID, p_session_id UUID, p_quiz_id UUID)
RETURNS UUID AS $$
DECLARE
    new_trick_id UUID;
BEGIN
    -- Insertar nuevo trick activo
    INSERT INTO player_tricks (player_id, quiz_id, session_id)
    VALUES (p_player_id, p_quiz_id, p_session_id)
    RETURNING id INTO new_trick_id;
    
    -- Actualizar estadísticas del jugador
    UPDATE players 
    SET total_tricks_selected = total_tricks_selected + 1
    WHERE id = p_player_id;
    
    -- Recalcular puntaje (aunque no cambie inmediatamente para tricks)
    PERFORM calculate_player_score(p_player_id);
    
    RETURN new_trick_id;
END;
$$ LANGUAGE plpgsql;

-- Función para seleccionar un nuevo treat
CREATE OR REPLACE FUNCTION select_new_treat(p_player_id UUID, p_session_id UUID, p_quiz_id UUID)
RETURNS UUID AS $$
DECLARE
    new_treat_id UUID;
BEGIN
    -- Insertar nuevo treat pendiente
    INSERT INTO player_treats (player_id, quiz_id, session_id)
    VALUES (p_player_id, p_quiz_id, p_session_id)
    RETURNING id INTO new_treat_id;
    
    -- Actualizar estadísticas del jugador
    UPDATE players 
    SET total_treats_selected = total_treats_selected + 1
    WHERE id = p_player_id;
    
    RETURN new_treat_id;
END;
$$ LANGUAGE plpgsql;

-- Función para completar treat (+1 punto)
CREATE OR REPLACE FUNCTION complete_treat(p_treat_id UUID, p_player_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Marcar treat como completado y otorgar +1 punto
    UPDATE player_treats 
    SET 
        completed_at = NOW(),
        points_awarded = 1
    WHERE id = p_treat_id 
    AND player_id = p_player_id 
    AND status = 'pending';
    
    IF FOUND THEN
        -- Actualizar estadísticas del jugador
        UPDATE players 
        SET total_treats_completed = total_treats_completed + 1
        WHERE id = p_player_id;
        
        -- Recalcular puntaje
        PERFORM calculate_player_score(p_player_id);
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Función para desertar trick o treat
CREATE OR REPLACE FUNCTION desert_trick_or_treat(p_item_id UUID, p_player_id UUID, p_item_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_item_type = 'trick' THEN
        -- Desertar trick (ya no genera más puntos)
        UPDATE player_tricks 
        SET deserted_at = NOW()
        WHERE id = p_item_id 
        AND player_id = p_player_id 
        AND is_active = true;
        
        IF FOUND THEN
            UPDATE players 
            SET total_tricks_deserted = total_tricks_deserted + 1
            WHERE id = p_player_id;
        END IF;
        
    ELSIF p_item_type = 'treat' THEN
        -- Desertar treat (-1 punto)
        UPDATE player_treats 
        SET 
            deserted_at = NOW(),
            points_awarded = -1
        WHERE id = p_item_id 
        AND player_id = p_player_id 
        AND status = 'pending';
        
        IF FOUND THEN
            UPDATE players 
            SET total_treats_deserted = total_treats_deserted + 1
            WHERE id = p_player_id;
        END IF;
    END IF;
    
    -- Recalcular puntaje en ambos casos
    PERFORM calculate_player_score(p_player_id);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 7. VISTAS ACTUALIZADAS
-- ==============================================

-- Eliminar vista existente para evitar conflictos de estructura
DROP VIEW IF EXISTS session_leaderboard_view;

-- Vista actualizada para leaderboard con el nuevo sistema
CREATE VIEW session_leaderboard_view AS
SELECT 
    p.id as player_id,
    p.session_id,
    p.name as player_name,
    p.order_position,
    p.current_score,
    -- Tricks stats
    COUNT(pt_active.id) as active_tricks_count,
    COALESCE(SUM(pt_active.points_generated), 0) as total_tricks_points,
    -- Treats stats  
    COUNT(ptr_completed.id) as completed_treats_count,
    COUNT(ptr_pending.id) as pending_treats_count,
    COUNT(ptr_deserted.id) as deserted_treats_count,
    COALESCE(SUM(ptr_all.points_awarded), 0) as total_treats_points,
    -- Totals
    p.total_tricks_selected,
    p.total_treats_selected,
    p.total_tricks_deserted,
    p.total_treats_completed,
    p.total_treats_deserted,
    -- Ranking
    ROW_NUMBER() OVER (PARTITION BY p.session_id ORDER BY p.current_score DESC, p.order_position ASC) as rank
FROM players p
LEFT JOIN player_tricks pt_active ON p.id = pt_active.player_id AND pt_active.is_active = true
LEFT JOIN player_treats ptr_completed ON p.id = ptr_completed.player_id AND ptr_completed.status = 'completed'
LEFT JOIN player_treats ptr_pending ON p.id = ptr_pending.player_id AND ptr_pending.status = 'pending'
LEFT JOIN player_treats ptr_deserted ON p.id = ptr_deserted.player_id AND ptr_deserted.status = 'deserted'
LEFT JOIN player_treats ptr_all ON p.id = ptr_all.player_id
GROUP BY 
    p.id, p.session_id, p.name, p.order_position, p.current_score,
    p.total_tricks_selected, p.total_treats_selected, p.total_tricks_deserted,
    p.total_treats_completed, p.total_treats_deserted
ORDER BY 
    p.session_id, p.current_score DESC, p.order_position ASC;

-- ==============================================
-- 8. MIGRAR DATOS EXISTENTES (SI LOS HAY)
-- ==============================================

-- Verificar si existen las columnas JSONB antes de migrar
DO $$
BEGIN
    -- Migrar active_tricks de JSONB a tabla relacional solo si la columna existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'players' AND column_name = 'active_tricks') THEN
        
        INSERT INTO player_tricks (player_id, quiz_id, session_id, activated_at)
        SELECT 
            p.id as player_id,
            (jsonb_array_elements_text(p.active_tricks))::uuid as quiz_id,
            p.session_id,
            p.created_at
        FROM players p
        WHERE jsonb_array_length(p.active_tricks) > 0
        ON CONFLICT (player_id, quiz_id, session_id) DO NOTHING;
        
        RAISE NOTICE 'Migrated active_tricks from JSONB to player_tricks table';
    ELSE
        RAISE NOTICE 'Column active_tricks does not exist, skipping migration';
    END IF;
    
    -- Migrar pending_treats de JSONB a tabla relacional solo si la columna existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'players' AND column_name = 'pending_treats') THEN
        
        INSERT INTO player_treats (player_id, quiz_id, session_id, selected_at)
        SELECT 
            p.id as player_id,
            (jsonb_array_elements_text(p.pending_treats))::uuid as quiz_id,
            p.session_id,
            p.created_at
        FROM players p
        WHERE jsonb_array_length(p.pending_treats) > 0
        ON CONFLICT (player_id, quiz_id, session_id) DO NOTHING;
        
        RAISE NOTICE 'Migrated pending_treats from JSONB to player_treats table';
    ELSE
        RAISE NOTICE 'Column pending_treats does not exist, skipping migration';
    END IF;
END $$;

-- Recalcular puntajes para todos los jugadores existentes
SELECT calculate_player_score(id) FROM players;

-- ==============================================
-- 9. VERIFICACIÓN
-- ==============================================

-- Verificar migración
DO $$
DECLARE
    rec RECORD;
    tricks_migrated INTEGER := 0;
    treats_migrated INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO tricks_migrated FROM player_tricks;
    SELECT COUNT(*) INTO treats_migrated FROM player_treats;
    
    RAISE NOTICE '✅ Migración completada:';
    RAISE NOTICE '   - Tricks migrados: %', tricks_migrated;
    RAISE NOTICE '   - Treats migrados: %', treats_migrated;
    RAISE NOTICE '   - Nuevas tablas creadas: player_tricks, player_treats, turn_history';
    RAISE NOTICE '   - Funciones creadas: calculate_player_score, start_player_turn, complete_treat, desert_trick_or_treat';
    RAISE NOTICE '   - Vista actualizada: session_leaderboard_view';
END $$;

COMMIT;

-- ==============================================
-- 10. SCRIPT DE VERIFICACIÓN POST-MIGRACIÓN
-- ==============================================

-- Ejecutar por separado para verificar que todo funciona:
/*
SELECT 
    'Verification Results' as test_name,
    (SELECT COUNT(*) FROM player_tricks) as tricks_count,
    (SELECT COUNT(*) FROM player_treats) as treats_count,
    (SELECT COUNT(*) FROM turn_history) as turn_history_count,
    (SELECT COUNT(*) FROM players WHERE current_score IS NOT NULL) as players_with_scores;

-- Verificar leaderboard
SELECT * FROM session_leaderboard_view LIMIT 5;

-- Verificar integridad de datos
SELECT 
    p.name,
    p.current_score,
    COUNT(pt.id) as active_tricks,
    COUNT(ptr.id) as pending_treats
FROM players p
LEFT JOIN player_tricks pt ON p.id = pt.player_id AND pt.is_active = true
LEFT JOIN player_treats ptr ON p.id = ptr.player_id AND ptr.status = 'pending'
GROUP BY p.id, p.name, p.current_score
ORDER BY p.current_score DESC;
*/