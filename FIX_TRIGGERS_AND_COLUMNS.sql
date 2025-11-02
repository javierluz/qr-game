-- ELIMINAR TRIGGERS PROBLEMÁTICOS Y CORREGIR FUNCIONES
-- Esta corrección elimina referencias a updated_at que no existen en el esquema actual

-- 1. Eliminar triggers que referencian updated_at en tablas que no lo tienen
DROP TRIGGER IF EXISTS update_player_tricks_updated_at ON player_tricks;
DROP TRIGGER IF EXISTS update_player_treats_updated_at ON player_treats;
DROP TRIGGER IF EXISTS update_turn_history_updated_at ON turn_history;

-- 2. Asegurar que la función update_updated_at_column existe (por si otros la usan)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actualizar si la columna updated_at existe
    IF TG_TABLE_NAME = 'players' OR TG_TABLE_NAME = 'game_sessions' OR TG_TABLE_NAME = 'turns' THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-crear triggers solo para tablas que SÍ tienen updated_at
-- Usar IF NOT EXISTS para evitar errores de duplicados

DO $$
BEGIN
    -- Trigger para players
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_players_updated_at'
        AND event_object_table = 'players'
    ) THEN
        CREATE TRIGGER update_players_updated_at 
            BEFORE UPDATE ON players
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Trigger para game_sessions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_game_sessions_updated_at'
        AND event_object_table = 'game_sessions'
    ) THEN
        CREATE TRIGGER update_game_sessions_updated_at 
            BEFORE UPDATE ON game_sessions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Trigger para turns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_turns_updated_at'
        AND event_object_table = 'turns'
    ) THEN
        CREATE TRIGGER update_turns_updated_at 
            BEFORE UPDATE ON turns
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;