-- VERSIÓN SIMPLIFICADA: Solo actualizar las funciones existentes para agregar validación y registro

-- Función actualizada para seleccionar un nuevo trick con registro de acción
CREATE OR REPLACE FUNCTION select_new_trick(p_player_id UUID, p_session_id UUID, p_quiz_id UUID)
RETURNS UUID AS $$
DECLARE
    new_trick_id UUID;
    current_turn_num INTEGER;
    quiz_action_count INTEGER;
BEGIN
    -- Obtener el turn_number actual del último registro de este jugador en turn_history
    SELECT COALESCE(MAX(turn_number), 1) INTO current_turn_num
    FROM turn_history 
    WHERE player_id = p_player_id 
    AND session_id = p_session_id;
    
    -- Contar acciones de quiz en el turno actual
    SELECT COUNT(*) INTO quiz_action_count
    FROM turn_history 
    WHERE player_id = p_player_id 
    AND session_id = p_session_id 
    AND turn_number = current_turn_num
    AND action_taken IN ('select_trick', 'select_treat');
    
    -- Verificar si el jugador ya hizo un quiz en este turno
    IF quiz_action_count > 0 THEN
        RAISE EXCEPTION 'El jugador ya realizó un quiz en este turno';
    END IF;
    
    -- Insertar nuevo trick activo
    INSERT INTO player_tricks (player_id, quiz_id, session_id)
    VALUES (p_player_id, p_quiz_id, p_session_id)
    RETURNING id INTO new_trick_id;
    
    -- Registrar la acción en turn_history
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
        false
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
    quiz_action_count INTEGER;
BEGIN
    -- Obtener el turn_number actual del último registro de este jugador en turn_history
    SELECT COALESCE(MAX(turn_number), 1) INTO current_turn_num
    FROM turn_history 
    WHERE player_id = p_player_id 
    AND session_id = p_session_id;
    
    -- Contar acciones de quiz en el turno actual
    SELECT COUNT(*) INTO quiz_action_count
    FROM turn_history 
    WHERE player_id = p_player_id 
    AND session_id = p_session_id 
    AND turn_number = current_turn_num
    AND action_taken IN ('select_trick', 'select_treat');
    
    -- Verificar si el jugador ya hizo un quiz en este turno
    IF quiz_action_count > 0 THEN
        RAISE EXCEPTION 'El jugador ya realizó un quiz en este turno';
    END IF;
    
    -- Insertar nuevo treat pendiente
    INSERT INTO player_treats (player_id, quiz_id, session_id)
    VALUES (p_player_id, p_quiz_id, p_session_id)
    RETURNING id INTO new_treat_id;
    
    -- Registrar la acción en turn_history
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
        false
    );
    
    -- Actualizar estadísticas del jugador
    UPDATE players 
    SET total_treats_selected = total_treats_selected + 1
    WHERE id = p_player_id;
    
    RETURN new_treat_id;
END;
$$ LANGUAGE plpgsql;