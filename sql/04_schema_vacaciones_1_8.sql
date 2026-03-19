-- Incidencias 1.8 - Modulo de Vacaciones RH
-- Ejecuta este script despues de 01_schema_incidencias_1_6.sql y antes de usar el nuevo modulo.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS vacation_balances (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_code VARCHAR(20) NOT NULL,
    nss VARCHAR(20) DEFAULT NULL,
    name VARCHAR(100) DEFAULT NULL,
    department VARCHAR(100) DEFAULT NULL,
    status VARCHAR(50) DEFAULT NULL,
    join_date DATE DEFAULT NULL,
    years_completed INT DEFAULT NULL,
    days INT DEFAULT NULL,
    vac_taken_before INT DEFAULT 0,
    vac_taken_card INT DEFAULT 0,
    vac_pending INT DEFAULT 0,
    current_period_days INT DEFAULT 0,
    pending_previous_days INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vacation_balances_employee_code (employee_code),
    KEY idx_vacation_balances_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vacation_import_logs (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    imported_by INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    imported_at DATETIME NOT NULL,
    total_records INT NOT NULL DEFAULT 0,
    inserted_records INT NOT NULL DEFAULT 0,
    updated_records INT NOT NULL DEFAULT 0,
    error_records INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_vacation_import_logs_imported_at (imported_at),
    KEY idx_vacation_import_logs_imported_by (imported_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
