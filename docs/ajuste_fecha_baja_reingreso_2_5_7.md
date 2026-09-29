# Ajuste 2.5.7 - Conservación y validación de fecha de baja en reingresos

## Problema detectado

La importación 2.5.6 ya conservaba `fechareingreso`, pero al confirmar un reingreso de un empleado existente el sistema ejecutaba una actualización que establecía `fecha_baja = NULL`. Además, cuando un empleado marcado como `R` todavía no existía en Bitácora, el alta por reingreso insertaba también `fecha_baja` como `NULL`.

Esto dejaba registros activos con fecha de reingreso pero sin la fecha de baja histórica, aun cuando la plantilla sí contenía una fecha válida.

## Regla nueva

Para un reingreso se considera válida la fecha de baja solamente cuando se cumple:

`fecha_alta_original < fecha_baja < fecha_reingreso`

- Se prioriza la `fechabaja` de la plantilla si cumple la regla.
- Si la fecha de la plantilla falta o es incoherente, se conserva la fecha de baja ya guardada en el sistema cuando ésta sí es válida.
- Si no existe ninguna fecha de baja válida, el reingreso/historial no se aplica y aparece en **Omitidos**. Así se evita guardar un reingreso sin fecha de baja.

## Reparación de registros importados con 2.5.6

Si un empleado ya quedó activo con `fecha_reingreso` pero `fecha_baja` vacía por la versión anterior, al volver a cargar la misma plantilla con estado `R` el sistema detecta que falta el historial y muestra la acción **COMPLETAR HISTORIAL**.

En ese caso se actualizan únicamente:

- `fecha_baja`
- `fecha_reingreso`

No se cambia departamento, puesto, NSS, correo ni asistencias.

## Cambios de persistencia

- Altas nuevas marcadas como reingreso guardan tanto `fecha_baja` como `fecha_reingreso`.
- Reingresos desde el departamento `BAJA` ya no limpian `fecha_baja`; conservan la fecha histórica validada.
- La vista previa muestra `Fecha baja` para altas por reingreso y reingresos.
- En reingresos ya activos se muestra la acción `COMPLETAR HISTORIAL`.

## Ejemplos de la plantilla revisada

- Empleado 12152: `2026-04-14 < 2026-09-07 < 2026-09-22` -> válido.
- Empleado 05843: `2025-03-27 < 2025-11-11 < 2026-09-21` -> válido.
- Una fecha de baja igual a la fecha de alta no se considera una baja histórica válida para reingreso.
