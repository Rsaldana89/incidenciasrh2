# Incidencias 1.6 - análisis técnico de la migración

## Resumen ejecutivo

El proyecto original dependía de tres archivos estáticos en frontend:

- `departamentos.json`
- `puestos.json`
- `privilegios.json`

Con base en el código y en el contexto de base de datos entregado en `tablasinicdencias.csv`, la migración más segura consiste en **mantener la experiencia de usuario casi intacta** y mover la fuente real de datos a la base de datos, dejando compatibilidad por medio de rutas dinámicas con el mismo contrato que ya consumían las pantallas.

Así, las pantallas ya no dependen de archivos JSON estáticos del catálogo, pero tampoco fue necesario reescribir agresivamente el frontend.

## Cómo funcionaba antes

### 1) Catálogo de departamentos

Se consumía desde `public/departamentos.json` principalmente en:

- `public/dashboard.html`
- `public/admon.html`

Uso real:

- Poblar selectores de filtros por departamento.
- Validar si el departamento capturado en `personal.department_name` pertenece al catálogo.
- Resaltar en rojo departamentos fuera de catálogo en administración de personal.

### 2) Catálogo de puestos

Se consumía desde `public/puestos.json` en:

- `public/admon.html`

Uso real:

- Poblar selector/filtro de puestos.
- Guiar la captura de puesto.
- En el proyecto original no se resaltaba en rojo un puesto inválido; solo el departamento.

### 3) Privilegios

Se consumía desde `public/privilegios.json` en:

- `public/dashboard.html`
- `public/admon.html`
- `public/asistencias.html`

Uso real:

- Resolver qué departamentos puede ver cada usuario según su rol y username.
- Filtrar en frontend qué empleados e incidencias aparecen para admins y managers.
- Mantener a los usuarios normales con visibilidad limitada o nula según el JSON.

### 4) Estructura actual de la base según el CSV

Del análisis de `tablasinicdencias.csv` se observa:

- Ya existe `departments`.
- Ya existe `user_departments`.
- `personal.department_name` sigue siendo texto.
- `personal.puesto` sigue siendo texto.
- `users` no trae la bandera equivalente a `Todos`.
- No existe tabla `positions`.

Eso significa que la migración correcta no es convertir `personal` a llaves foráneas, porque rompería tu integración actual con otras bases y exportaciones. La tabla `personal` debe seguir guardando texto libre exactamente como pediste.

## Decisiones de diseño aplicadas

### Se conserva `personal` en texto libre

- `personal.department_name` sigue siendo texto.
- `personal.puesto` sigue siendo texto.
- El alta y edición permite capturar valores que no existan en catálogo.
- Si no existen en catálogo, se siguen marcando visualmente como inválidos.

### Los catálogos ahora viven en BD

- `departments` = catálogo administrable de departamentos.
- `positions` = nuevo catálogo administrable de puestos.

### Los privilegios ahora viven en BD

- `user_departments` = relación usuario → departamentos permitidos.
- `users.all_departments` = bandera para representar el legacy `Todos` sin perder compatibilidad con la forma en que hoy operan admins y managers.

## Problemas detectados en la versión previa

### 1) `managerEYE` estaba modelado de forma frágil

En el JSON legacy aparecía como:

- `"Solo departamentos que empiezan con EYE"`

Pero el frontend original hacía comparación exacta de nombres de departamento, no una regla por prefijo. En la práctica, eso dejaba ese privilegio mal representado. En Incidencias 1.6 se migró a departamentos EYE explícitos en BD para que funcione de manera consistente.

### 2) Había duplicado en el catálogo legacy de departamentos

`departamentos.json` traía 139 entradas, pero solo 138 nombres únicos. El duplicado detectado fue:

- `EL REFUGIO II`

En la tabla se cargan nombres únicos.

### 3) El filtro de vacaciones podía dejar fuera departamentos no catalogados

Cuando un usuario con acceso total veía vacaciones, la lógica original se apoyaba demasiado en el catálogo. Se corrigió para que, si el usuario tiene acceso total, también aparezcan departamentos escritos libremente en `personal`, aunque no estén en catálogo.

### 4) Administración de personal no conservaba bien el contexto al refrescar

Después de ciertas operaciones, la tabla podía refrescar sin reusar correctamente el alcance de departamentos permitido y el filtro de puesto. Eso quedó ajustado.

## Qué se modificó en el proyecto

### Backend

Se reemplazó la dependencia a archivos estáticos por rutas respaldadas por base de datos:

- `GET /departamentos.json` ahora responde desde `departments`.
- `GET /puestos.json` ahora responde desde `positions`.
- `GET /privilegios.json` ahora responde desde `users + user_departments + users.all_departments`.

Además, se dejó una compatibilidad temporal: si todavía no se han ejecutado los scripts SQL, el backend puede caer al contenido legacy desde `legacy_catalogs/` para no dejar el sistema muerto durante la transición.

También se agregó la administración del sistema:

- Alta de usuarios.
- Cambio de contraseña.
- Cambio de rol.
- Asignación de todos los departamentos o departamentos puntuales.
- Alta de departamentos.
- Alta de puestos.

### Frontend

#### `dashboard.html`

- Sigue usando la misma experiencia general.
- El selector de departamentos ahora toma tanto catálogo como departamentos realmente presentes en `personal`.
- Respeta correctamente `Todos`.
- Se añadió acceso visual a `Admon. Sistema` solo para admins.

#### `admon.html`

- Departamento y puesto del empleado cambiaron de selector rígido a captura libre con sugerencias (`datalist`).
- Se conserva la regla de negocio: se puede guardar texto no catalogado.
- Se resalta en rojo tanto departamento inválido como puesto inválido.
- Se cuidó que los filtros sigan funcionando.
- Se añadió acceso visual a `Admon. Sistema` solo para admins.

#### `asistencias.html`

- Mantiene la experiencia general.
- Sigue resolviendo privilegios por departamentos, pero ahora desde BD a través del endpoint dinámico.
- Se añadió acceso visual a `Admon. Sistema` solo para admins.

#### Nueva pantalla `sistema.html`

Visible únicamente para administradores.

Permite:

- Crear usuarios.
- Cambiar contraseñas.
- Reasignar roles.
- Asignar departamentos a managers y admins.
- Dar acceso total por departamentos cuando corresponda.
- Mantener catálogos de departamentos y puestos.

## Scripts SQL entregados

### `01_schema_incidencias_1_6.sql`

Crea o asegura:

- `departments` si faltara.
- `positions`.
- `user_departments` si faltara.
- `users.all_departments`.

Aunque tu CSV ya muestra `departments` y `user_departments`, el script es idempotente para que sirva también en ambientes atrasados o inconsistentes.

### `02_seed_catalogs_and_access_incidencias_1_6.sql`

Carga:

- El catálogo actual de departamentos.
- El catálogo actual de puestos.
- La migración de privilegios legacy a BD.

Incluye la conversión del caso especial `managerEYE` a departamentos EYE concretos.

### `03_verificacion_incidencias_1_6.sql`

Da consultas rápidas para validar:

- Conteos de catálogos.
- Usuarios clave.
- Roles.
- Bandera de acceso total.
- Departamentos asignados.

## Orden recomendado de instalación

1. Respaldar base y proyecto actual.
2. Ejecutar `01_schema_incidencias_1_6.sql`.
3. Ejecutar `02_seed_catalogs_and_access_incidencias_1_6.sql`.
4. Publicar el proyecto Incidencias 1.6.
5. Ejecutar `03_verificacion_incidencias_1_6.sql` para revisar que todo quedó como se esperaba.

## Resultado esperado

- Ya no dependes de archivos JSON estáticos para departamentos, puestos y privilegios.
- `personal` conserva texto libre en puesto y departamento.
- No se rompe la experiencia actual de asistencias, reportes ni administración de personal.
- Admins y managers siguen viendo departamentos asignados, ahora desde BD.
- El sistema queda autoadministrable con una nueva pantalla de administración del sistema.
