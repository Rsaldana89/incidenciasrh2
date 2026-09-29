# Ajuste 2.5.6 - Fecha de reingreso en altas nuevas

## Problema corregido

Cuando una fila de la plantilla correspondía a un empleado que aún no existía en la tabla `personal`, el sistema la clasificaba como alta nueva. Aunque la plantilla viniera con `estadoempleado = R` o `REINGRESO` y una `fechareingreso`, la consulta de inserción guardaba `fecha_reingreso = NULL`.

## Nuevo comportamiento

- Si el empleado no existe y llega como `R` o `REINGRESO`, se crea como alta nueva y se conserva `fechareingreso`.
- Si llega como `R` o `REINGRESO` sin fecha de reingreso, se usa la fecha actual y se genera una advertencia en la vista previa.
- Las altas normales (`A`, `ACTIVO`, `ALTA`) continúan guardándose sin fecha de reingreso.
- `fecha_baja` permanece en `NULL` para un empleado activo reingresado.
- La vista previa de altas ahora muestra el tipo (`ALTA` o `REINGRESO`) y la fecha de reingreso.

## Ejemplo esperado

Para un empleado nuevo con:

- `fechaalta = 17/06/2024`
- `fechabaja = 17/06/2024`
- `fechareingreso = 22/09/2026`
- `estadoempleado = R`

se guardará:

- `start_date = 2024-06-17`
- `fecha_baja = NULL`
- `fecha_reingreso = 2026-09-22`
