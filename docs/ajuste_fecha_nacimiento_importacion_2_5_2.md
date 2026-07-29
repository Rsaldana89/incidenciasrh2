# Ajuste 2.5.2 - Fecha de nacimiento en importación de personal

## Objetivo

Permitir que la plantilla de importación de personal use la columna `fechanacimiento` para guardar y actualizar `personal.birth_date`, sin alterar la información operativa de empleados que ya existen.

## Comportamiento implementado

- La columna de la plantilla es opcional.
- Si un empleado es nuevo y la fecha viene informada correctamente, se guarda en `birth_date`.
- Si un empleado es nuevo y la columna no existe, viene vacía o no contiene una fecha válida, `birth_date` queda en `NULL`.
- Si el empleado ya existe y la fecha válida de la plantilla es diferente a la guardada, se actualiza exclusivamente `birth_date`.
- La actualización puntual no modifica departamento, puesto, NSS, correo, fecha de ingreso ni otros campos.
- Las bajas y reingresos conservan su funcionamiento previo.
- La vista previa muestra una sección independiente con la fecha guardada y la fecha que se aplicará.
- La importación puede confirmarse aunque el único cambio detectado sean fechas de nacimiento.
- El frontend usa primero `birth_date` para mostrar la fecha y calcular la edad dinámicamente. Para registros antiguos que todavía no tengan fecha guardada, conserva el respaldo basado en RFC.

## Encabezados aceptados

El sistema reconoce los encabezados normalizados equivalentes a:

- `fechanacimiento`
- `fecha nacimiento`
- `birth_date`
- `birthdate`

## Base de datos

La versión presupone que la tabla `personal` cuenta con:

```sql
birth_date DATE NULL
```

El proyecto mantiene el script `sql/05_add_birth_date.sql` como referencia para instalaciones que todavía no tengan la columna.

## Pruebas recomendadas

1. Importar un empleado existente con fecha diferente y verificar que sólo cambie `birth_date`.
2. Importar un empleado existente con la misma fecha y verificar que aparezca sin cambios.
3. Importar un empleado existente sin la columna o con la celda vacía y verificar que conserve su fecha actual.
4. Importar un empleado nuevo con fecha válida y verificar el alta con `birth_date`.
5. Importar un empleado nuevo sin fecha y verificar que quede en `NULL`.
6. Confirmar que la tabla de personal muestre fecha de nacimiento y edad calculada.
7. Confirmar que las importaciones de altas, bajas, reingresos y correos continúen funcionando.
