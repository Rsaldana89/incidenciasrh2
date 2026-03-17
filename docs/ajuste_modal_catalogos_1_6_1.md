# Ajuste 1.6.1 - Modal de empleados con catálogo obligatorio

Se ajustó `public/admon.html` para que en el modal de **Agregar/Editar Empleado** los campos:

- Puesto
- Departamento

usen selección restringida al catálogo cargado desde BD mediante:

- `puestos.json`
- `departamentos.json`

## Comportamiento nuevo

- En **crear empleado**, solo permite elegir valores válidos del catálogo.
- En **editar empleado**, si el empleado trae un valor legacy que ya no existe en catálogo o no está dentro de los permisos del usuario, el selector lo muestra como advertencia y obliga a elegir un valor válido antes de guardar.
- La **carga masiva** no se toca; sigue permitiendo texto libre en `personal`.
- La tabla de personal sigue resaltando en rojo valores fuera de catálogo.

## Alcance

No se cambiaron endpoints, estructura SQL ni lógica de carga masiva.
