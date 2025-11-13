CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- TABLAS PRINCIPALES
-- ==========================================

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  username TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- ==========================================
-- TABLAS PARA ARQUITECTURA EVENT-DRIVEN
-- ==========================================

-- Tabla de eventos de usuario
CREATE TABLE user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'task_completed', 'level_up', 'achievement_unlocked', etc.
  event_data JSONB, -- Datos adicionales del evento
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de notificaciones
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'achievement'
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de puntuaciones y ranking
CREATE TABLE scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  last_activity TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de logros (achievements)
CREATE TABLE achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  points INTEGER DEFAULT 0,
  criteria JSONB -- Criterios para desbloquear el logro
);

-- Tabla de logros desbloqueados por usuario
CREATE TABLE user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ==========================================
-- FUNCIONES Y TRIGGERS
-- ==========================================

-- Función: Crear registro de score al crear usuario
CREATE OR REPLACE FUNCTION create_user_score()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO scores (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_user_score
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_score();

-- Función: Procesar evento de tarea completada/descompletada
CREATE OR REPLACE FUNCTION process_task_completed()
RETURNS TRIGGER AS $$
DECLARE
  points_earned INTEGER := 10;
  new_total INTEGER;
  new_level INTEGER;
  old_level INTEGER;
  tasks_count INTEGER;
BEGIN
  -- Caso 1: Tarea cambió de incompleta a completa
  IF NEW.done = true AND (OLD.done = false OR OLD.done IS NULL) THEN
    
    -- Actualizar timestamp de completado
    NEW.completed_at = NOW();
    
    -- Crear evento de tarea completada
    INSERT INTO user_events (user_id, event_type, event_data)
    VALUES (NEW.user_id, 'task_completed', jsonb_build_object(
      'task_id', NEW.id,
      'task_title', NEW.title,
      'points', points_earned
    ));
    
    -- Actualizar puntuación del usuario
    UPDATE scores
    SET 
      total_points = total_points + points_earned,
      tasks_completed = tasks_completed + 1,
      last_activity = NOW(),
      updated_at = NOW()
    WHERE user_id = NEW.user_id
    RETURNING total_points, tasks_completed INTO new_total, tasks_count;
    
    -- Calcular nuevo nivel (cada 50 puntos = 1 nivel)
    new_level := (new_total / 50) + 1;
    
    UPDATE scores
    SET current_level = new_level
    WHERE user_id = NEW.user_id AND current_level < new_level;
    
    -- Crear notificación de tarea completada
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.user_id,
      '¡Tarea completada! 🎉',
      format('Has completado "%s" y ganado %s puntos', NEW.title, points_earned),
      'success'
    );
    
    -- Verificar si subió de nivel
    IF new_level > (SELECT current_level FROM scores WHERE user_id = NEW.user_id) THEN
      INSERT INTO user_events (user_id, event_type, event_data)
      VALUES (NEW.user_id, 'level_up', jsonb_build_object(
        'new_level', new_level,
        'total_points', new_total
      ));
      
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        '¡Subiste de nivel! 🚀',
        format('¡Felicidades! Ahora estás en el nivel %s', new_level),
        'achievement'
      );
    END IF;
    
    -- Verificar logro: Primera tarea completada
    IF tasks_count = 1 THEN
      PERFORM unlock_achievement(NEW.user_id, 'first_task');
    END IF;
    
    -- Verificar logro: 10 tareas completadas
    IF tasks_count = 10 THEN
      PERFORM unlock_achievement(NEW.user_id, 'task_master');
    END IF;
    
  -- Caso 2: Tarea cambió de completa a incompleta (desmarcar)
  ELSIF NEW.done = false AND OLD.done = true THEN
    
    -- Limpiar timestamp de completado
    NEW.completed_at = NULL;
    
    -- Crear evento de tarea descompletada
    INSERT INTO user_events (user_id, event_type, event_data)
    VALUES (NEW.user_id, 'task_uncompleted', jsonb_build_object(
      'task_id', NEW.id,
      'task_title', NEW.title,
      'points', -points_earned
    ));
    
    -- Restar puntuación del usuario
    UPDATE scores
    SET 
      total_points = GREATEST(0, total_points - points_earned),  -- No permitir puntos negativos
      tasks_completed = GREATEST(0, tasks_completed - 1),        -- No permitir conteo negativo
      last_activity = NOW(),
      updated_at = NOW()
    WHERE user_id = NEW.user_id
    RETURNING total_points, current_level INTO new_total, old_level;
    
    -- Recalcular nivel (puede bajar de nivel)
    new_level := (new_total / 50) + 1;
    
    -- Actualizar nivel si cambió
    IF new_level != old_level THEN
      UPDATE scores
      SET current_level = new_level
      WHERE user_id = NEW.user_id;
      
      -- Si bajó de nivel, crear notificación
      IF new_level < old_level THEN
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (
          NEW.user_id,
          'Nivel actualizado',
          format('Has bajado al nivel %s', new_level),
          'info'
        );
      END IF;
    END IF;
    
    -- Crear notificación de tarea descompletada
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.user_id,
      'Tarea desmarcada',
      format('Has desmarcado "%s" y perdido %s puntos', NEW.title, points_earned),
      'info'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_task_completed
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION process_task_completed();

-- Función: Desbloquear logro
CREATE OR REPLACE FUNCTION unlock_achievement(p_user_id uuid, p_achievement_name TEXT)
RETURNS void AS $$
DECLARE
  v_achievement_id uuid;
  v_achievement_points INTEGER;
  v_achievement_title TEXT;
BEGIN
  -- Obtener el achievement
  SELECT id, points, name INTO v_achievement_id, v_achievement_points, v_achievement_title
  FROM achievements
  WHERE name = p_achievement_name;
  
  -- Verificar si existe y si el usuario no lo tiene ya
  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, v_achievement_id)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    
    -- Si se insertó (no había conflicto), crear notificación
    IF FOUND THEN
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        p_user_id,
        '¡Logro desbloqueado! 🏆',
        format('Has desbloqueado: %s (+%s puntos)', v_achievement_title, v_achievement_points),
        'achievement'
      );
      
      -- Agregar puntos del logro
      UPDATE scores
      SET total_points = total_points + v_achievement_points
      WHERE user_id = p_user_id;
      
      -- Crear evento
      INSERT INTO user_events (user_id, event_type, event_data)
      VALUES (p_user_id, 'achievement_unlocked', jsonb_build_object(
        'achievement_name', p_achievement_name,
        'points', v_achievement_points
      ));
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- DATOS DE PRUEBA
-- ==========================================

INSERT INTO users (email, password, username)
VALUES ('test@example.com', '1234', 'Usuario Demo');

INSERT INTO tasks (user_id, title, done)
VALUES (
  (SELECT id FROM users WHERE email = 'test@example.com'),
  'Complete first EduBoost module',
  false
),
(
  (SELECT id FROM users WHERE email = 'test@example.com'),
  'Watch introduction video',
  false
),
(
  (SELECT id FROM users WHERE email = 'test@example.com'),
  'Take knowledge quiz',
  false
);

-- Insert predefined achievements
INSERT INTO achievements (name, description, icon, points, criteria) VALUES
  ('first_task', 'First task completed', '🎯', 50, '{"tasks_completed": 1}'::jsonb),
  ('task_master', 'Complete 10 tasks', '⭐', 100, '{"tasks_completed": 10}'::jsonb),
  ('level_5', 'Reach level 5', '🚀', 150, '{"level": 5}'::jsonb),
  ('streak_7', '7 day streak', '🔥', 200, '{"streak": 7}'::jsonb);

-- Crear algunas notificaciones de bienvenida
INSERT INTO notifications (user_id, title, message, type)
VALUES (
  (SELECT id FROM users WHERE email = 'test@example.com'),
  '¡Bienvenido a EduBoost! 👋',
  'Comienza completando tu primera tarea para ganar puntos',
  'info'
);
