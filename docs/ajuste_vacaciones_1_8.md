# Ajuste Vacaciones 1.8

## Resumen
Se rediseñó el módulo de vacaciones para convertirlo en una herramienta informativa y operativa para RH con las siguientes capacidades:

- Consulta filtrada por departamento, ID y nombre de empleado.
- Respeto a visibilidad por departamentos según permisos del usuario.
- Cálculo automático de días del periodo en curso con base en la antigüedad actual.
- Determinación de días pendientes de periodos anteriores como saldo importado menos días del periodo en curso.
- Importación masiva desde Excel CONTPAQi o plantilla depurada.
- Vista previa de importación antes de confirmar.
- Bitácora básica de cargas.
- Exportación a Excel, PDF e impresión del listado visible o por empleado.
- Plantilla estándar y reporte estilo Compaq para administradores.

## Archivos agregados
- `controllers/vacationController.js`
- `routes/vacationRoutes.js`
- `sql/04_schema_vacaciones_1_8.sql`
- `public/vacaciones.js`

## Archivos modificados
- `index.js`
- `package.json`
- `package-lock.json`
- `public/dashboard.html`
- `public/styles.css`

## Endpoints nuevos
- `GET /api/vacations`
- `GET /api/vacations/export`
- `GET /api/vacations/template`
- `GET /api/vacations/import-logs`
- `POST /api/vacations/preview-import`
- `POST /api/vacations/import`

## Script SQL
Ejecutar `sql/04_schema_vacaciones_1_8.sql` antes de usar el nuevo módulo.
