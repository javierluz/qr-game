# 🎃 Guía de Migración de Base de Datos - Sistema de Treats Completados

## 📋 Resumen de Cambios Necesarios

Esta migración añade funcionalidad para marcar treats como completados, lo que afecta:
- Sistema de puntuación del ranking (solo treats completados cuentan)
- UI de la home (muestra treats pendientes con botón completar)
- Lógica de negocio para gestión de estado de treats

---

## 🗄️ Cambios en Base de Datos

### 1. Migración SQL - Añadir Campo `completed`

**Ejecutar en el SQL Editor de Supabase:**

```sql
-- Añadir columna 'completed' a la tabla user_selected_quizzes
ALTER TABLE user_selected_quizzes 
ADD COLUMN completed BOOLEAN DEFAULT FALSE;

-- Crear índice para mejorar rendimiento en consultas de treats no completados
CREATE INDEX idx_user_selected_quizzes_completed_choice 
ON user_selected_quizzes(user_id, choice, completed);

-- Opcional: Crear índice compuesto para consultas de ranking
CREATE INDEX idx_user_selected_quizzes_ranking 
ON user_selected_quizzes(user_id, choice, completed, created_at);
```

### 2. Actualizar Políticas RLS (Row Level Security)

**Verificar que las políticas existentes cubran el nuevo campo:**

```sql
-- Verificar política de SELECT (debe permitir leer 'completed')
SELECT * FROM pg_policies WHERE tablename = 'user_selected_quizzes';

-- Si es necesario, actualizar política de SELECT para incluir 'completed'
-- (Normalmente las políticas existentes deberían funcionar)
```

### 3. Datos Existentes - Migración Automática

**Marcar todos los treats existentes como completados (comportamiento anterior):**

```sql
-- Actualizar todos los treats existentes como completados
-- Esto mantiene el comportamiento actual donde todos contaban para el ranking
UPDATE user_selected_quizzes 
SET completed = TRUE 
WHERE choice = 'treat';

-- Los tricks pueden mantenerse como FALSE ya que no necesitan completarse
-- (o TRUE si quieres mantener consistencia)
UPDATE user_selected_quizzes 
SET completed = TRUE 
WHERE choice = 'trick';
```

**Alternativa - Solo marcar treats existentes:**
```sql
-- Solo actualizar treats existentes como completados
UPDATE user_selected_quizzes 
SET completed = TRUE 
WHERE choice = 'treat';
```

---

## 🔍 Verificación de Migración

### Consultas de Verificación

```sql
-- 1. Verificar que la columna se añadió correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_selected_quizzes' AND column_name = 'completed';

-- 2. Verificar datos migrados
SELECT 
  choice,
  completed,
  COUNT(*) as count
FROM user_selected_quizzes 
GROUP BY choice, completed 
ORDER BY choice, completed;

-- 3. Verificar índices creados
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'user_selected_quizzes' 
AND indexname LIKE '%completed%';

-- 4. Consulta de ejemplo para treats no completados
SELECT u.*, q.treat_title, q.treat_content
FROM user_selected_quizzes u
JOIN quizzes q ON u.quiz_id = q.id
WHERE u.choice = 'treat' 
AND u.completed = FALSE
ORDER BY u.created_at DESC;
```

---

## 🎯 Impacto en el Sistema

### Antes de la Migración:
- ✅ Todos los treats contaban automáticamente para el ranking
- ✅ Solo se mostraba el treat más reciente en home
- ✅ No había concepto de "completar" treats

### Después de la Migración:
- 🆕 Solo treats completados cuentan para el ranking
- 🆕 Se muestran todos los treats pendientes en home
- 🆕 Cada treat tiene botón "Completar"
- 🆕 Treats completados desaparecen de la lista activa

---

## ⚠️ Consideraciones Importantes

### 1. **Compatibilidad hacia atrás:**
- Los datos existentes se marcan como completados
- El comportamiento actual se mantiene para registros históricos

### 2. **Rendimiento:**
- Los índices mejoran consultas de treats no completados
- Las consultas de ranking siguen siendo eficientes

### 3. **Rollback (si es necesario):**
```sql
-- Para revertir los cambios (CUIDADO: elimina datos)
DROP INDEX IF EXISTS idx_user_selected_quizzes_completed_choice;
DROP INDEX IF EXISTS idx_user_selected_quizzes_ranking;
ALTER TABLE user_selected_quizzes DROP COLUMN completed;
```

### 4. **Testing recomendado:**
- Crear algunos treats de prueba
- Verificar que aparecen en home como "pendientes"
- Completar treats y verificar que desaparecen
- Verificar que el ranking solo cuenta completados

---

## 📝 Checklist de Ejecución

### En Supabase Dashboard:

1. **SQL Editor:**
   - [ ] Ejecutar migración SQL (añadir columna + índices)
   - [ ] Ejecutar actualización de datos existentes
   - [ ] Ejecutar consultas de verificación

2. **Table Editor:**
   - [ ] Verificar que la columna `completed` aparece
   - [ ] Verificar que los datos tienen valores correctos

3. **API Docs:**
   - [ ] Verificar que las queries incluyen el nuevo campo

### En el Código:

1. **Backend (quiz-utils.ts):**
   - [ ] Actualizar interfaces TypeScript
   - [ ] Modificar funciones de treats
   - [ ] Actualizar lógica de ranking
   - [ ] Añadir función markTreatAsCompleted

2. **Frontend (home.astro):**
   - [ ] Actualizar UI para mostrar múltiples treats
   - [ ] Añadir botones "Completar"
   - [ ] Implementar handlers de completado

3. **Testing:**
   - [ ] Probar creación de nuevos treats
   - [ ] Probar completado de treats
   - [ ] Verificar ranking actualizado
   - [ ] Probar UI responsive

---

## 🚀 Orden de Ejecución Recomendado

1. **Ejecutar migración SQL** (este archivo)
2. **Actualizar código backend** (interfaces + funciones)
3. **Actualizar código frontend** (UI + handlers)
4. **Testing completo**
5. **Deploy y verificación en producción**

---

*Fecha de creación: 31 de Octubre, 2025*
*Aplicación: QR Trick or Treat - Halloween Game*