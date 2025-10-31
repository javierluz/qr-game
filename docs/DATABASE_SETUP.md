# 🎃 Database Setup Guide - QR Trick or Treat

Esta guía te ayudará a configurar las tablas necesarias en Supabase para tu aplicación de Halloween "QR Trick or Treat".

## 📋 Tablas Requeridas

### 1. Tabla `quizzes`
Esta tabla almacena todos los quizzes disponibles con sus contenidos de Trick y Treat.

### 2. Tabla `user_selected_quizzes`
Esta tabla registra qué quizzes han seleccionado los usuarios y su elección (trick o treat).

---

## 🛠️ Instrucciones Paso a Paso

### **Paso 1: Acceder al Dashboard de Supabase**

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto: `qeukexybvytxydziczah`
4. En el menú lateral, haz clic en **"Table Editor"**

### **Paso 2: Crear la tabla `quizzes`**

1. Haz clic en **"Create a new table"**
2. Configura la tabla con estos datos:
   - **Name**: `quizzes`
   - **Description**: `Tabla que contiene todos los quizzes de Halloween`
   - Deja marcado **"Enable Row Level Security (RLS)"**

3. **Configura las columnas:**

   | Column Name | Type | Default Value | Primary | Not Null | Unique |
   |-------------|------|---------------|---------|----------|--------|
   | `id` | `uuid` | `gen_random_uuid()` | ✅ | ✅ | ✅ |
   | `title` | `text` | - | ❌ | ✅ | ❌ |
   | `description` | `text` | - | ❌ | ✅ | ❌ |
   | `trick_title` | `text` | - | ❌ | ✅ | ❌ |
   | `trick_content` | `text` | - | ❌ | ✅ | ❌ |
   | `treat_title` | `text` | - | ❌ | ✅ | ❌ |
   | `treat_content` | `text` | - | ❌ | ✅ | ❌ |
   | `created_at` | `timestamptz` | `now()` | ❌ | ✅ | ❌ |

4. Haz clic en **"Save"**

### **Paso 3: Crear la tabla `user_selected_quizzes`**

1. Haz clic en **"Create a new table"** nuevamente
2. Configura la tabla:
   - **Name**: `user_selected_quizzes`
   - **Description**: `Registro de selecciones de quiz por usuario`
   - Deja marcado **"Enable Row Level Security (RLS)"**

3. **Configura las columnas:**

   | Column Name | Type | Default Value | Primary | Not Null | Unique |
   |-------------|------|---------------|---------|----------|--------|
   | `id` | `uuid` | `gen_random_uuid()` | ✅ | ✅ | ✅ |
   | `user_id` | `uuid` | - | ❌ | ✅ | ❌ |
   | `quiz_id` | `uuid` | - | ❌ | ✅ | ❌ |
   | `choice` | `text` | - | ❌ | ✅ | ❌ |
   | `created_at` | `timestamptz` | `now()` | ❌ | ✅ | ❌ |

4. Haz clic en **"Save"**

### **Paso 4: Configurar Foreign Keys**

1. Ve a la tabla `user_selected_quizzes`
2. Haz clic en **"Edit"** (ícono de lápiz) junto al nombre de la tabla
3. Ve a la pestaña **"Foreign Keys"**
4. Haz clic en **"Add foreign key"**

   **Foreign Key 1 (Usuario):**
   - **Name**: `user_selected_quizzes_user_id_fkey`
   - **Source Schema**: `public`
   - **Source Table**: `user_selected_quizzes`
   - **Source Columns**: `user_id`
   - **Referenced Schema**: `auth`
   - **Referenced Table**: `users`
   - **Referenced Columns**: `id`
   - **OnUpdate**: `CASCADE`
   - **OnDelete**: `CASCADE`

5. Haz clic en **"Add foreign key"** nuevamente

   **Foreign Key 2 (Quiz):**
   - **Name**: `user_selected_quizzes_quiz_id_fkey`
   - **Source Schema**: `public`
   - **Source Table**: `user_selected_quizzes`
   - **Source Columns**: `quiz_id`
   - **Referenced Schema**: `public`
   - **Referenced Table**: `quizzes`
   - **Referenced Columns**: `id`
   - **OnUpdate**: `CASCADE`
   - **OnDelete**: `CASCADE`

6. Haz clic en **"Save"**

### **Paso 5: Configurar Row Level Security (RLS)**

#### **Para la tabla `quizzes`:**

1. Ve a la tabla `quizzes`
2. Haz clic en el ícono de **"Authentication"** (escudo)
3. Haz clic en **"New Policy"**
4. Selecciona **"Get started quickly"**
5. Selecciona **"Enable read access for all users"**
6. La política debería verse así:
   ```sql
   CREATE POLICY "Enable read access for all users" ON "public"."quizzes"
   AS PERMISSIVE FOR SELECT
   TO public
   USING (true)
   ```

#### **Para la tabla `user_selected_quizzes`:**

1. Ve a la tabla `user_selected_quizzes`
2. Haz clic en el ícono de **"Authentication"** (escudo)
3. Haz clic en **"New Policy"**
4. Selecciona **"For full customization"**
5. Configura la política:
   - **Policy name**: `Users can manage their own selections`
   - **Allowed operation**: `ALL`
   - **Target roles**: `authenticated`
   - **USING expression**: `auth.uid() = user_id`
   - **WITH CHECK expression**: `auth.uid() = user_id`

La política SQL se verá así:
```sql
CREATE POLICY "Users can manage their own selections" ON "public"."user_selected_quizzes"
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

### **Paso 6: Añadir datos de ejemplo**

1. Ve a la tabla `quizzes`
2. Haz clic en **"Insert"** y luego **"Insert row"**
3. Añade algunos quizzes de ejemplo:

**Quiz 1:**
```
title: "Aventura en la Casa Embrujada"
description: "Una noche misteriosa en una antigua mansión"
trick_title: "Desafío de Valentia"
trick_content: "Debes pasar 5 minutos en completo silencio sin usar tu teléfono, pensando en la historia más aterradora que conozcas."
treat_title: "Confesión Misteriosa"
treat_content: "¿Cuál ha sido la experiencia más extraña o inexplicable que has vivido? Comparte todos los detalles."
```

**Quiz 2:**
```
title: "El Laboratorio del Dr. Frankenstein"
description: "Experimentos que salieron mal"
trick_title: "Experimento Social"
trick_content: "Durante las próximas 2 horas, debes hablar con un acento diferente al tuyo con todas las personas que encuentres."
treat_title: "Secreto Científico"
treat_content: "¿Qué teoría conspirativa o fenómeno paranormal te parece más convincente y por qué?"
```

**Quiz 3:**
```
title: "Noche de Brujas en el Cementerio"
description: "Rituales antiguos bajo la luna llena"
trick_title: "Ritual de Medianoche"
trick_content: "Debes escribir una carta a tu yo del pasado de hace 5 años y luego leerla en voz alta frente a un espejo."
treat_title: "Confesión Nocturna"
treat_content: "¿Cuál es el sueño más extraño o perturbador que recuerdas haber tenido? Describe cada detalle que puedas recordar."
```

### **Paso 7: Verificar la configuración**

1. Ve a **"SQL Editor"** en el menú lateral
2. Ejecuta esta consulta para verificar que todo funciona:

```sql
-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('quizzes', 'user_selected_quizzes');

-- Verificar que hay datos en quizzes
SELECT count(*) as quiz_count FROM quizzes;

-- Verificar las foreign keys
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'user_selected_quizzes';
```

---

## ✅ Verificación Final

Si todo está configurado correctamente, deberías ver:

1. **Dos tablas creadas**: `quizzes` y `user_selected_quizzes`
2. **RLS habilitado** en ambas tablas
3. **Políticas configuradas** correctamente
4. **Foreign keys** establecidas
5. **Datos de ejemplo** en la tabla `quizzes`

## 🚀 ¡Listo para usar!

Una vez completados estos pasos, tu base de datos estará lista para la aplicación "QR Trick or Treat". Los usuarios podrán:

- ✅ Ver quizzes disponibles
- ✅ Seleccionar entre Trick o Treat
- ✅ Tener un solo Trick activo a la vez
- ✅ Ver sus estadísticas personales
- ✅ Solo acceder a sus propios datos

## 🔧 Troubleshooting

**Si tienes problemas:**

1. **Error de permisos**: Verifica que las políticas RLS estén configuradas correctamente
2. **Error de foreign key**: Asegúrate de que las referencias apunten a las tablas y columnas correctas
3. **Error de conexión**: Verifica que las variables de entorno en `.env` sean correctas

**Para depuración, puedes usar estas consultas:**

```sql
-- Ver todas las políticas
SELECT * FROM pg_policies WHERE tablename IN ('quizzes', 'user_selected_quizzes');

-- Ver foreign keys
SELECT * FROM information_schema.referential_constraints 
WHERE constraint_schema = 'public';
```