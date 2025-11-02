# 🎮 PRUEBAS DEL SISTEMA DINÁMICO - Guía de Testing

## ✅ Estado Actual
- ✅ **Migración completada** en Supabase
- ✅ **Componentes actualizados** a versiones dinámicas
- ✅ **Servidor funcionando** en http://localhost:4321

## 🧪 CÓMO PROBAR EL NUEVO SISTEMA

### **Paso 1: Verificar la UI Actualizada**

1. **Visita la página de sesiones:**
   ```
   http://localhost:4321/sessions/play?id=test-session-123
   ```

2. **Verifica que aparezcan los nuevos componentes:**
   - **SessionTurnDisplayDynamic** - Turno con número de turno y puntos automáticos
   - **PlayerTricksAndTreatsDynamic** - Controles para completar/desertar
   - **SessionLeaderboardDynamic** - Ranking con desglose detallado

### **Paso 2: Probar la Funcionalidad Dinámica**

#### **🎭 Testing de Tricks:**
1. Haz clic en "Nuevo Quiz"
2. Selecciona un "Trick"
3. **Resultado esperado**: No gana puntos inmediatos
4. Avanza el turno (simular vuelta completa)
5. **Resultado esperado**: Al iniciar el siguiente turno, gana +1 punto automáticamente

#### **🍬 Testing de Treats:**
1. Selecciona un "Treat"
2. Ve a la sección "Treats Pendientes"
3. **Opciones esperadas**:
   - Botón "✅ Completar (+1 punto)"
   - Botón "🏃‍♂️ Desertar (-1 punto)"
4. Prueba ambas opciones

#### **📊 Testing del Leaderboard:**
1. Después de cada acción, el ranking debe actualizarse automáticamente
2. **Desglose esperado**:
   - Tricks activos y puntos generados
   - Treats completados/pendientes/desertados
   - Puntaje total dinámico

### **Paso 3: Validar con Base de Datos**

Si quieres verificar en Supabase que todo funciona:

```sql
-- Ver estado de la migración
SELECT COUNT(*) as player_tricks FROM player_tricks;
SELECT COUNT(*) as player_treats FROM player_treats;
SELECT COUNT(*) as turn_history FROM turn_history;

-- Ver datos dinámicos de un jugador
SELECT 
    p.name,
    p.current_score,
    COUNT(pt.id) as active_tricks,
    COUNT(ptr.id) as pending_treats
FROM players p
LEFT JOIN player_tricks pt ON p.id = pt.player_id AND pt.is_active = true
LEFT JOIN player_treats ptr ON p.id = ptr.player_id AND ptr.status = 'pending'
GROUP BY p.id, p.name, p.current_score;
```

---

## 🐛 TROUBLESHOOTING

### **Si no carga la página:**
1. Verifica que el servidor esté corriendo con `pnpm dev`
2. Checa la consola del navegador para errores de JavaScript
3. Revisa la consola del servidor para errores de TypeScript

### **Si los componentes no aparecen:**
1. Verifica que los archivos existan:
   - `SessionTurnDisplayDynamic.tsx`
   - `PlayerTricksAndTreatsDynamic.tsx`
   - `SessionLeaderboardDynamic.tsx`
2. Checa que `SessionGameView.tsx` esté importando correctamente

### **Si las funciones de base de datos fallan:**
1. Verifica que el script `MIGRATION_DYNAMIC_SCORING.sql` se ejecutó completo
2. Checa que las funciones SQL existan:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_type = 'FUNCTION' 
   AND routine_name LIKE '%trick%' OR routine_name LIKE '%treat%';
   ```

### **Si no hay datos dinámicos:**
1. Puede ser que necesites crear datos de prueba:
   ```sql
   -- Crear jugador de prueba si no existe
   INSERT INTO players (id, session_id, name, order_position, current_score)
   VALUES ('test-player-123', 'test-session-123', 'Jugador Prueba', 1, 0)
   ON CONFLICT (id) DO NOTHING;
   ```

---

## 🎯 FUNCIONALIDADES A VERIFICAR

### **✅ Sistema de Turnos:**
- [ ] El número de turno se incrementa correctamente
- [ ] Los puntos de tricks se otorgan automáticamente al inicio
- [ ] La notificación de puntos aparece cuando corresponde

### **✅ Gestión de Tricks:**
- [ ] Se pueden seleccionar múltiples tricks
- [ ] Los tricks aparecen en la lista de "Activos"
- [ ] Se pueden desertar (dejan de generar puntos)
- [ ] El contador de puntos generados se actualiza

### **✅ Gestión de Treats:**
- [ ] Los treats aparecen como "Pendientes"
- [ ] Se pueden completar (+1 punto)
- [ ] Se pueden desertar (-1 punto)
- [ ] Los estados cambian correctamente

### **✅ Leaderboard Dinámico:**
- [ ] Se actualiza automáticamente tras cada acción
- [ ] Muestra desglose detallado de puntos
- [ ] El ranking se ordena correctamente
- [ ] Los colores y badges funcionan

---

## 🚀 SIGUIENTE PASO

Una vez que hayas verificado que todo funciona:

1. **Integrar con el sistema de quizzes real** - Conectar `handleNewQuiz()` con el quiz generator
2. **Añadir múltiples jugadores** - Probar con sesiones reales de múltiples jugadores
3. **Optimizar la UI** - Añadir animaciones y feedback más rico
4. **Testing exhaustivo** - Probar edge cases y scenarios extremos

¡El sistema dinámico está listo para usar! 🎉