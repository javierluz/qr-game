# Guía de Migración: Múltiples Tricks Activos y Sistema de Deserción

## 📝 Resumen de Cambios

Esta migración modifica el comportamiento de los **tricks** para permitir:
- ✅ **Múltiples tricks activos** por usuario (antes solo 1)
- ✅ **Sistema de deserción** - usuarios pueden "desertar" tricks
- ✅ **Exclusión del ranking** - tricks desertados no cuentan para puntos
- ✅ **Preservación de historial** - los datos no se eliminan, solo se marcan

## 🗄️ Cambios en el Modelo de Datos

### Tabla: `user_selected_quizzes`

**Campo Nuevo:**
- `deserted` (BOOLEAN, nullable) - Indica si un trick fue desertado

**Impacto:**
- Los tricks desertados (`deserted = true`) no cuentan para el ranking
- Los tricks activos tienen `deserted = null` o `deserted = false`
- Los treats no usan este campo (siempre `null`)

## 🚀 Pasos de Migración en Supabase

### Paso 1: Agregar Columna `deserted`

```sql
-- Agregar la nueva columna 'deserted' a la tabla user_selected_quizzes
ALTER TABLE user_selected_quizzes 
ADD COLUMN deserted BOOLEAN DEFAULT NULL;
```

**Verificación:**
```sql
-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_selected_quizzes' 
AND column_name = 'deserted';
```

### Paso 2: Agregar Índice para Rendimiento

```sql
-- Crear índice compuesto para consultas eficientes de tricks activos
CREATE INDEX idx_user_selected_quizzes_active_tricks 
ON user_selected_quizzes (user_id, choice, completed, deserted) 
WHERE choice = 'trick';
```

**Verificación:**
```sql
-- Verificar que el índice se creó correctamente
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'user_selected_quizzes' 
AND indexname = 'idx_user_selected_quizzes_active_tricks';
```

### Paso 3: Actualizar Políticas RLS (si aplica)

```sql
-- Si tienes Row Level Security habilitado, verifica que las políticas 
-- incluyan el nuevo campo 'deserted'

-- Ejemplo de política actualizada para SELECT
DROP POLICY IF EXISTS "Users can view their own quiz selections" ON user_selected_quizzes;

CREATE POLICY "Users can view their own quiz selections" 
ON user_selected_quizzes FOR SELECT 
USING (auth.uid() = user_id);

-- Ejemplo de política actualizada para UPDATE (para desertar tricks)
DROP POLICY IF EXISTS "Users can update their own quiz selections" ON user_selected_quizzes;

CREATE POLICY "Users can update their own quiz selections" 
ON user_selected_quizzes FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Paso 4: Migración de Datos Existentes

```sql
-- IMPORTANTE: Todos los tricks existentes se consideran "activos" (no desertados)
-- No es necesario actualizar datos existentes ya que NULL = no desertado

-- Verificación: Contar tricks existentes por estado
SELECT 
  choice,
  deserted,
  COUNT(*) as count
FROM user_selected_quizzes 
GROUP BY choice, deserted 
ORDER BY choice, deserted;
```

### Paso 5: Verificaciones de Integridad

```sql
-- Verificar que solo los tricks pueden tener 'deserted' = true
SELECT COUNT(*) as invalid_treats
FROM user_selected_quizzes 
WHERE choice = 'treat' AND deserted = true;
-- Debe retornar 0

-- Verificar estructura de datos
SELECT 
  user_id,
  choice,
  completed,
  deserted,
  COUNT(*) as count
FROM user_selected_quizzes 
GROUP BY user_id, choice, completed, deserted 
ORDER BY user_id, choice;
```

## 🔄 Proceso de Rollback (En caso de problemas)

### Rollback Paso 1: Eliminar Índice
```sql
DROP INDEX IF EXISTS idx_user_selected_quizzes_active_tricks;
```

### Rollback Paso 2: Eliminar Columna
```sql
-- ⚠️ CUIDADO: Esto eliminará todos los datos de 'deserted'
ALTER TABLE user_selected_quizzes DROP COLUMN IF EXISTS deserted;
```

### Rollback Paso 3: Restaurar Políticas RLS Originales
```sql
-- Restaurar políticas originales según tu configuración previa
-- (Guarda una copia de las políticas actuales antes de la migración)
```

## 📊 Consultas de Ejemplo Post-Migración

### Obtener Tricks Activos (No Desertados)
```sql
SELECT * FROM user_selected_quizzes 
WHERE user_id = 'USER_UUID_HERE'
AND choice = 'trick' 
AND completed = false 
AND (deserted IS NULL OR deserted = false)
ORDER BY created_at DESC;
```

### Obtener Estadísticas de Ranking (Excluyendo Desertados)
```sql
SELECT 
  user_id,
  SUM(CASE WHEN choice = 'trick' AND (deserted IS NULL OR deserted = false) THEN 1 ELSE 0 END) as tricks_completed,
  SUM(CASE WHEN choice = 'treat' AND completed = true THEN 1 ELSE 0 END) as treats_completed
FROM user_selected_quizzes 
GROUP BY user_id
ORDER BY tricks_completed DESC, treats_completed DESC;
```

### Desertar un Trick
```sql
UPDATE user_selected_quizzes 
SET deserted = true 
WHERE id = 'TRICK_ID_HERE' 
AND user_id = 'USER_UUID_HERE' 
AND choice = 'trick';
```

## ✅ Lista de Verificación

- [ ] **Paso 1 Completado:** Columna `deserted` agregada
- [ ] **Paso 2 Completado:** Índice creado para rendimiento
- [ ] **Paso 3 Completado:** Políticas RLS actualizadas (si aplica)
- [ ] **Paso 4 Completado:** Verificación de datos existentes
- [ ] **Paso 5 Completado:** Verificaciones de integridad pasadas
- [ ] **Frontend Actualizado:** Código de la aplicación desplegado
- [ ] **Pruebas Realizadas:** Funcionalidad probada en producción

## 🚨 Consideraciones Importantes

1. **Backup:** Realiza un backup completo antes de la migración
2. **Downtime:** La migración puede requerir unos segundos de downtime
3. **Reversibilidad:** El rollback elimina datos de `deserted` permanentemente
4. **Performance:** El nuevo índice mejora el rendimiento de consultas de tricks
5. **Compatibilidad:** La aplicación actual debe actualizarse simultáneamente

## 📞 Soporte

Si encuentras problemas durante la migración:
1. Verifica los logs de Supabase
2. Ejecuta las consultas de verificación
3. Considera hacer rollback si hay errores críticos
4. Revisa que el código de la aplicación esté actualizado

---
**Fecha de creación:** $(date)  
**Versión:** 1.0  
**Autor:** Sistema de migración automática