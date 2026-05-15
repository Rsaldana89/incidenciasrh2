-- Script para añadir la columna birth_date si no existe
-- Esta columna se utilizará para almacenar la fecha de nacimiento explícita de los empleados

ALTER TABLE personal
    ADD COLUMN IF NOT EXISTS birth_date DATE NULL AFTER fecha_reingreso;
