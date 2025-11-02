# 🎃 Migration Guide: Sistema Dinámico de Puntaje - Tricks y Treats

## 📋 Cambios Requeridos en Base de Datos

### 1. Nuevas Tablas para Sistema Dinámico

#### **Tabla `player_tricks`** - Tracking individual de tricks activos
```sql
CREATE TABLE IF NOT EXISTS player_tricks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deserted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    is_active BOOLEAN GENERATED ALWAYS AS (deserted_at IS NULL) STORED,
    -- Tracking de puntos generados
    points_generated INTEGER DEFAULT 0,
    last_point_turn INTEGER DEFAULT 0, -- Último turno en que generó puntos
    UNIQUE(player_id, quiz_id, session_id) -- Un jugador no puede tener el mismo trick dos veces
);
```

#### **Tabla `player_treats`** - Tracking individual de treats
```sql
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
    UNIQUE(player_id, quiz_id, session_id) -- Un jugador no puede tener el mismo treat dos veces
);
```

#### **Tabla `turn_history`** - Historial de turnos para tracking
```sql
CREATE TABLE IF NOT EXISTS turn_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    tricks_points_awarded INTEGER DEFAULT 0, -- Puntos ganados por tricks al inicio del turno
    action_taken TEXT, -- 'new_trick', 'new_treat', 'complete_treat', 'desert_trick', 'desert_treat'
    quiz_selected UUID REFERENCES quizzes(id), -- Quiz relacionado con la acción
    is_current BOOLEAN DEFAULT true
);
```

### 2. Modificaciones a Tablas Existentes

#### **Actualizar tabla `players`**
```sql
-- Agregar nuevas columnas para tracking dinámico
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS current_score INTEGER DEFAULT 0, -- Puntaje calculado dinámicamente
ADD COLUMN IF NOT EXISTS total_tricks_selected INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_treats_selected INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tricks_deserted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_treats_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_treats_deserted INTEGER DEFAULT 0;

-- Migrar datos existentes (mantener score actual como current_score)
UPDATE players SET current_score = score WHERE current_score = 0;
```

#### **Actualizar tabla `turns`** 
```sql
-- Agregar tracking de turnos
ALTER TABLE turns 
ADD COLUMN IF NOT EXISTS turn_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_action TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
```

### 3. Índices para Rendimiento

```sql
-- Índices para player_tricks
CREATE INDEX IF NOT EXISTS idx_player_tricks_active ON player_tricks(player_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_player_tricks_session ON player_tricks(session_id, is_active);

-- Índices para player_treats  
CREATE INDEX IF NOT EXISTS idx_player_treats_status ON player_treats(player_id, status);
CREATE INDEX IF NOT EXISTS idx_player_treats_session ON player_treats(session_id, status);

-- Índices para turn_history
CREATE INDEX IF NOT EXISTS idx_turn_history_session ON turn_history(session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_turn_history_current ON turn_history(session_id, is_current) WHERE is_current = true;
```

### 4. Políticas RLS (Row Level Security)

```sql
-- Player tricks
ALTER TABLE player_tricks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage tricks in active sessions" ON player_tricks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM game_sessions gs
            JOIN players p ON gs.id = p.session_id 
            WHERE p.id = player_tricks.player_id 
            AND gs.is_active = true
        )
    );

-- Player treats
ALTER TABLE player_treats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage treats in active sessions" ON player_treats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM game_sessions gs
            JOIN players p ON gs.id = p.session_id 
            WHERE p.id = player_treats.player_id 
            AND gs.is_active = true
        )
    );

-- Turn history
ALTER TABLE turn_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage turn history in active sessions" ON turn_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM game_sessions 
            WHERE game_sessions.id = turn_history.session_id 
            AND game_sessions.is_active = true
        )
    );
```

### 5. Funciones Auxiliares

#### **Función para calcular puntos dinámicos**
```sql
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
```

#### **Función para inicio de turno (otorgar puntos por tricks)**
```sql
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
```

#### **Función para completar treat**
```sql
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
```

#### **Función para desertar trick o treat**
```sql
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
```

### 6. Vista Actualizada para Leaderboard

```sql
CREATE OR REPLACE VIEW session_leaderboard_view AS
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
    -- Ranking
    ROW_NUMBER() OVER (PARTITION BY p.session_id ORDER BY p.current_score DESC, p.order_position ASC) as rank
FROM players p
LEFT JOIN player_tricks pt_active ON p.id = pt_active.player_id AND pt_active.is_active = true
LEFT JOIN player_treats ptr_completed ON p.id = ptr_completed.player_id AND ptr_completed.status = 'completed'
LEFT JOIN player_treats ptr_pending ON p.id = ptr_pending.player_id AND ptr_pending.status = 'pending'
LEFT JOIN player_treats ptr_deserted ON p.id = ptr_deserted.player_id AND ptr_deserted.status = 'deserted'
LEFT JOIN player_treats ptr_all ON p.id = ptr_all.player_id
GROUP BY 
    p.id, p.session_id, p.name, p.order_position, p.current_score
ORDER BY 
    p.session_id, p.current_score DESC, p.order_position ASC;
```

---

## 🚀 Pasos de Implementación

### Paso 1: Ejecutar Migración en Supabase
1. Ir al SQL Editor en tu dashboard de Supabase
2. Ejecutar todos los scripts SQL de arriba en orden
3. Verificar que las tablas se crearon correctamente

### Paso 2: Migrar Datos Existentes
```sql
-- Si ya tienes datos en el sistema actual, migrar:
-- (Este script se ejecutará después de crear las nuevas tablas)

-- Migrar active_tricks de JSONB a tabla relacional
INSERT INTO player_tricks (player_id, quiz_id, session_id, activated_at)
SELECT 
    p.id as player_id,
    (jsonb_array_elements_text(p.active_tricks))::uuid as quiz_id,
    p.session_id,
    p.created_at
FROM players p
WHERE jsonb_array_length(p.active_tricks) > 0;

-- Migrar pending_treats de JSONB a tabla relacional  
INSERT INTO player_treats (player_id, quiz_id, session_id, selected_at)
SELECT 
    p.id as player_id,
    (jsonb_array_elements_text(p.pending_treats))::uuid as quiz_id,
    p.session_id,
    p.created_at
FROM players p
WHERE jsonb_array_length(p.pending_treats) > 0;
```

### Paso 3: Verificar Migración
```sql
-- Verificar que los datos se migraron correctamente
SELECT 
    p.name,
    p.current_score,
    COUNT(pt.id) as migrated_tricks,
    COUNT(ptr.id) as migrated_treats
FROM players p
LEFT JOIN player_tricks pt ON p.id = pt.player_id
LEFT JOIN player_treats ptr ON p.id = ptr.player_id
GROUP BY p.id, p.name, p.current_score;
```

---

## ⚠️ Notas Importantes

1. **Backup**: Haz backup de tu base de datos antes de ejecutar la migración
2. **Transacciones**: Ejecuta la migración dentro de una transacción para poder hacer rollback si es necesario
3. **Testing**: Prueba el nuevo sistema en un entorno de desarrollo primero
4. **Limpieza**: Después de verificar que todo funciona, puedes eliminar las columnas JSONB antiguas:
   ```sql
   -- SOLO después de verificar que todo funciona
   ALTER TABLE players 
   DROP COLUMN IF EXISTS active_tricks,
   DROP COLUMN IF EXISTS pending_treats,
   DROP COLUMN IF EXISTS completed_quizzes;
   ```

Esta migración mantendrá la compatibilidad con el sistema actual mientras introduce el nuevo sistema de puntaje dinámico.