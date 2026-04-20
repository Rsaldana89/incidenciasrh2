# Ajuste Vacaciones / Reportes COMPAQ 1.8.1

## Vacaciones
- Se agregó el campo `puesto` al payload del módulo de vacaciones.
- Cada empleado ahora muestra dos grupos de acciones:
  - **Datos de Vacaciones**: Excel, PDF e imprimir del resumen individual.
  - **Formato de solicitud de vacaciones**: Excel, PDF e imprimir del formato personalizado.
- El formato personalizado se genera con estos datos precargados:
  - Área/Sucursal = departamento del empleado.
  - Fecha D/M/A = fecha actual.
  - Número de empleado con 5 dígitos.
  - Nombre.
  - Puesto.
  - Antigüedad calculada desde reingreso si existe; en caso contrario, desde ingreso.
  - Fecha de ingreso mostrada con la misma fecha base usada para la antigüedad.
- Se dejan en blanco para captura manual:
  - Nombre y puesto del jefe inmediato.
  - Fechas de inicio y término de vacaciones.
  - Fecha de reincorporación.
  - Tabla de días pendientes / saldo.
- El formato se genera duplicado en una sola hoja/página, como el archivo base.
- La fecha fija del encabezado del formato se mantiene en `dic-22`.
- La firma del solicitante toma el nombre del empleado y la de Capital Humano conserva `MENDOZA ROMERO ANDRES`.

## Reportes COMPAQ
- En los 6 reportes COMPAQ se cambió la traducción de incidencia `DT` por `DDL`.
- También se cambió el encabezado de columna exportado de `DT` a `DDL`.
- La suma exportada respeta el nuevo término `DDL`.
