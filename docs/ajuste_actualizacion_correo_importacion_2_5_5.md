# Ajuste 2.5.5: actualización de correo desde la plantilla de personal

La importación de la plantilla oficial ahora permite actualizar, para empleados ya existentes, únicamente los siguientes campos cuando la plantilla trae un valor válido y diferente al almacenado:

- `birth_date` a partir de la columna `fechanacimiento`.
- `email` a partir de la columna `CorreoElectronico` (también reconoce variantes equivalentes).

## Reglas de seguridad

- Un correo vacío o una columna de correo ausente no borra el correo guardado.
- Los demás datos del empleado existente no se modifican por estas actualizaciones puntuales.
- Las altas nuevas continúan registrándose con todos los datos disponibles, incluyendo fecha de nacimiento y correo.
- La vista previa incluye un filtro y una sección independiente para revisar correo guardado contra correo de plantilla antes de confirmar.
