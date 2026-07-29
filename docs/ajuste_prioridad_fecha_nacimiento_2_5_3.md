# Ajuste 2.5.3 - Prioridad de fecha de nacimiento guardada

## Objetivo

Asegurar que la Administración de Personal muestre y utilice primero la fecha almacenada en `personal.birth_date`.

## Regla aplicada

1. Si `birth_date` tiene una fecha, esa fecha se muestra y se usa para calcular la edad.
2. Sólo cuando `birth_date` está en `NULL` o vacío, se intenta obtener la fecha desde el RFC.
3. Si no existe una fecha guardada ni se puede obtener una fecha válida del RFC, se muestra `N/D`.
4. Si existe un valor almacenado pero no puede interpretarse como fecha, no se sustituye silenciosamente con el RFC. Esto evita mostrar una fecha distinta de la registrada en la base de datos.

## Alcance

El cambio afecta únicamente la resolución de la fecha de nacimiento y la edad en la tabla de Administración de Personal. No modifica la lógica de altas, bajas, reingresos, importaciones ni otros campos.
