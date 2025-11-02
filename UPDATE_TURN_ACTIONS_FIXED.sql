-- Actualización CORREGIDA para registrar acciones en turn_history y controlar 1 quiz por turno
-- Adaptado al esquema real de la base de datos

-- Función auxiliar para verificar si el jugador ya hizo un quiz en el turno actual
CREATE OR REPLACE FUNCTION has_player_done_quiz_in_current_turn(p_player_id UUID, p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_turn_num INTEGER;
    quiz_action_count INTEGER;
BEGIN
    -- Obtener el número del turno actual del jugador
    SELECT turn_number INTO current_turn_num
    FROM turns 
    WHERE current_player_id = p_player_id 
    AND session_id = p_session_id;
    
    -- Si no hay turno actual, retornar false
    IF current_turn_num IS NULL THEN
        RETURN false;
    END IF;
    
    -- Contar acciones de quiz en el turno actual
    SELECT COUNT(*) INTO quiz_action_count
    FROM turn_history 
    WHERE player_id = p_player_id 
    AND session_id = p_session_id 
    AND turn_number = current_turn_num
    AND action_taken IN ('select_trick', 'select_treat');
    
    -- Retornar true si ya hizo alguna acción de quiz
    RETURN quiz_action_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Función actualizada para seleccionar un nuevo trick con registro de acción
CREATE OR REPLACE FUNCTION select_new_trick(p_player_id UUID, p_session_id UUID, p_quiz_id UUID)
RETURNS UUID AS $$
DECLARE
    new_trick_id UUID;
    current_turn_num INTEGER;
BEGIN
    -- Verificar si el jugador ya hizo un quiz en este turno
    IF has_player_done_quiz_in_current_turn(p_player_id, p_session_id) THEN
        RAISE EXCEPTION 'El jugador ya realizó un quiz en este turno';
    END IF;
    
    -- Obtener número del turno actual
    SELECT turn_number INTO current_turn_num
    FROM turns 
    WHERE current_player_id = p_player_id 
    AND session_id = p_session_id;
    
    -- Si no hay turno actual, error
    IF current_turn_num IS NULL THEN
        RAISE EXCEPTION 'No hay turno activo para este jugador';
    END IF;
    
    -- Insertar nuevo trick activo
    INSERT INTO player_tricks (player_id, quiz_id, session_id)
    VALUES (p_player_id, p_quiz_id, p_session_id)
    RETURNING id INTO new_trick_id;
    
    -- Registrar la acción en turn_history (usando quiz_selected en lugar de quiz_id)
    INSERT INTO turn_history (
        session_id, 
        player_id, 
        turn_number, 
        action_taken,
        quiz_selected,
        is_current
    ) VALUES (
        p_session_id,
        p_player_id,
        current_turn_num,
        'select_trick',
        p_quiz_id,
        false  -- No es el turno current, es una acción dentro del turno
    );
    
    -- Actualizar estadísticas del jugador
    UPDATE players 
    SET total_tricks_selected = total_tricks_selected + 1
    WHERE id = p_player_id;
    
    -- Recalcular puntaje (aunque no cambie inmediatamente para tricks)
    PERFORM calculate_player_score(p_player_id);
    
    RETURN new_trick_id;
END;
$$ LANGUAGE plpgsql;

-- Función actualizada para seleccionar un nuevo treat con registro de acción
CREATE OR REPLACE FUNCTION select_new_treat(p_player_id UUID, p_session_id UUID, p_quiz_id UUID)
RETURNS UUID AS $$
DECLARE
    new_treat_id UUID;
    current_turn_num INTEGER;
BEGIN
    -- Verificar si el jugador ya hizo un quiz en este turno
    IF has_player_done_quiz_in_current_turn(p_player_id, p_session_id) THEN
        RAISE EXCEPTION 'El jugador ya realizó un quiz en este turno';
    END IF;
    
    -- Obtener número del turno actual
    SELECT turn_number INTO current_turn_num
    FROM turns 
    WHERE current_player_id = p_player_id 
    AND session_id = p_session_id;
    
    -- Si no hay turno actual, error
    IF current_turn_num IS NULL THEN
        RAISE EXCEPTION 'No hay turno activo para este jugador';
    END IF;
    
    -- Insertar nuevo treat pendiente
    INSERT INTO player_treats (player_id, quiz_id, session_id)
    VALUES (p_player_id, p_quiz_id, p_session_id)
    RETURNING id INTO new_treat_id;
    
    -- Registrar la acción en turn_history (usando quiz_selected en lugar de quiz_id)
    INSERT INTO turn_history (
        session_id, 
        player_id, 
        turn_number, 
        action_taken,
        quiz_selected,
        is_current
    ) VALUES (
        p_session_id,
        p_player_id,
        current_turn_num,
        'select_treat',
        p_quiz_id,
        false  -- No es el turno current, es una acción dentro del turno
    );
    
    -- Actualizar estadísticas del jugador
    UPDATE players 
    SET total_treats_selected = total_treats_selected + 1
    WHERE id = p_player_id;
    
    RETURN new_treat_id;
END;
$$ LANGUAGE plpgsql;