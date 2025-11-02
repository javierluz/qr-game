-- CORRECCIÓN DE FUNCIONES: Adaptadas al esquema real de la base de datos

-- Función corregida para completar treat (+1 punto)
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
    AND completed_at IS NULL 
    AND deserted_at IS NULL;  -- Solo si está pendiente (no completado ni desertado)
    
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

-- Función corregida para desertar trick
CREATE OR REPLACE FUNCTION desert_trick(p_trick_id UUID, p_player_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Desertar trick (ya no genera más puntos)
    UPDATE player_tricks 
    SET deserted_at = NOW()
    WHERE id = p_trick_id 
    AND player_id = p_player_id 
    AND deserted_at IS NULL;  -- Solo si no está ya desertado
    
    IF FOUND THEN
        UPDATE players 
        SET total_tricks_deserted = total_tricks_deserted + 1
        WHERE id = p_player_id;
        
        -- Recalcular puntaje
        PERFORM calculate_player_score(p_player_id);
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Función corregida para desertar treat
CREATE OR REPLACE FUNCTION desert_treat(p_treat_id UUID, p_player_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Desertar treat (-1 punto)
    UPDATE player_treats 
    SET 
        deserted_at = NOW(),
        points_awarded = -1
    WHERE id = p_treat_id 
    AND player_id = p_player_id 
    AND completed_at IS NULL 
    AND deserted_at IS NULL;  -- Solo si está pendiente
    
    IF FOUND THEN
        UPDATE players 
        SET total_treats_deserted = total_treats_deserted + 1
        WHERE id = p_player_id;
        
        -- Recalcular puntaje
        PERFORM calculate_player_score(p_player_id);
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Función corregida para calcular puntaje del jugador
CREATE OR REPLACE FUNCTION calculate_player_score(p_player_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_score INTEGER := 0;
    tricks_points INTEGER := 0;
    treats_points INTEGER := 0;
BEGIN
    -- Sumar puntos de tricks activos
    SELECT COALESCE(SUM(points_generated), 0) INTO tricks_points
    FROM player_tricks 
    WHERE player_id = p_player_id 
    AND deserted_at IS NULL;  -- Solo tricks no desertados
    
    -- Sumar puntos de treats (completados +1, desertados -1)
    SELECT COALESCE(SUM(points_awarded), 0) INTO treats_points
    FROM player_treats 
    WHERE player_id = p_player_id;
    
    total_score := tricks_points + treats_points;
    
    -- Actualizar score y current_score del jugador
    UPDATE players 
    SET 
        score = total_score,
        current_score = total_score
    WHERE id = p_player_id;
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;