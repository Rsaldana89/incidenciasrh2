-- Incidencias 1.6 - Estructura base para catálogos y privilegios administrables
-- Ejecuta este script una sola vez antes del script de población.
SET NAMES utf8mb4;
SET @db_name := DATABASE();

SET @sql := IF(
    EXISTS(
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = @db_name
          AND table_name = 'departments'
    ),
    'SELECT ''Tabla departments ya existe'' AS info',
    'CREATE TABLE departments (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    EXISTS(
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = @db_name
          AND table_name = 'positions'
    ),
    'SELECT ''Tabla positions ya existe'' AS info',
    'CREATE TABLE positions (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    EXISTS(
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = @db_name
          AND table_name = 'user_departments'
    ),
    'SELECT ''Tabla user_departments ya existe'' AS info',
    'CREATE TABLE user_departments (
        user_id INT NOT NULL,
        department_id INT NOT NULL,
        PRIMARY KEY (user_id, department_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = @db_name
          AND table_name = 'users'
          AND column_name = 'all_departments'
    ),
    'SELECT ''Columna users.all_departments ya existe'' AS info',
    'ALTER TABLE users ADD COLUMN all_departments TINYINT(1) NOT NULL DEFAULT 0 AFTER full_name'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
