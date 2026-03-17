# Ajuste 1.6.2 - Eliminación controlada de departamentos y puestos

## Qué cambia
- En Admon. Sistema ahora puedes seleccionar un departamento o puesto del catálogo para eliminarlo.
- La selección es solo para eliminación; no se habilitó edición directa.
- Antes de eliminar, el sistema valida contra la tabla `personal` usando el texto guardado en `department_name` o `puesto`.

## Reglas aplicadas
- Si existe al menos un empleado con ese departamento en `personal.department_name`, no se permite eliminar el departamento del catálogo.
- Si existe al menos un empleado con ese puesto en `personal.puesto`, no se permite eliminar el puesto del catálogo.
- Si sí se permite eliminar un departamento, también se eliminan sus asignaciones en `user_departments` para no dejar basura lógica.
- La estructura de `personal` se respeta tal cual: texto libre, sin relaciones forzadas.

## Impacto
- No requiere cambios SQL.
- No afecta carga masiva.
- No cambia la lógica de asistencias, reportes ni administración de personal fuera del catálogo.
