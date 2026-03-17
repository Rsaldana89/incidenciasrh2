# CHC Incidencias 1.6

Este paquete contiene la migración del proyecto para dejar de depender de los JSON estáticos de departamentos, puestos y privilegios, moviendo esos datos a tablas en la base de datos sin romper la estructura actual de `personal`.

## Archivos principales

- `sql/01_schema_incidencias_1_6.sql`
- `sql/02_seed_catalogs_and_access_incidencias_1_6.sql`
- `sql/03_verificacion_incidencias_1_6.sql`
- `docs/analisis_incidencias_1_6.md`
- `public/sistema.html`
- `public/sistema.js`
- `public/sistema.svg`

## Instalación sugerida

1. Respaldar proyecto y base.
2. Ejecutar los scripts SQL en orden.
3. Desplegar este proyecto.
4. Entrar como admin y validar la pantalla `Admon. Sistema`.

## Principios respetados en esta versión

- `personal.department_name` sigue siendo texto libre.
- `personal.puesto` sigue siendo texto libre.
- Se permiten empleados con departamento o puesto no catalogado.
- Los valores fuera de catálogo se marcan visualmente en rojo.
- Los privilegios de admins y managers ahora viven en base de datos.
- La interfaz cambia lo mínimo indispensable.
