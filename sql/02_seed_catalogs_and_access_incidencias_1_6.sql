-- Incidencias 1.6 - Población de catálogos y migración de privilegios legacy
-- Este script replica exactamente el contenido legado de departamentos.json,
-- puestos.json y privilegios.json. Está pensado como migración inicial.
-- Si lo ejecutas de nuevo, restaurará la asignación legacy de usuarios.
SET NAMES utf8mb4;
START TRANSACTION;

-- 1) Catálogo de departamentos legado
INSERT INTO departments (name)
SELECT src.name
FROM (
SELECT 'OFICINAS' AS name
UNION ALL SELECT 'ATENCION A NEGOCIOS' AS name
UNION ALL SELECT 'CEDIS' AS name
UNION ALL SELECT 'EMPAQUE GRANOS' AS name
UNION ALL SELECT 'MANTENIMIENTO' AS name
UNION ALL SELECT 'PANADERIA' AS name
UNION ALL SELECT 'SISTEMAS' AS name
UNION ALL SELECT 'ALCANFORES' AS name
UNION ALL SELECT 'ANDADORES' AS name
UNION ALL SELECT 'ATELIER' AS name
UNION ALL SELECT 'AV CIMATARIO' AS name
UNION ALL SELECT 'AV CORREGIDORA NTE' AS name
UNION ALL SELECT 'AV DE LA LUZ' AS name
UNION ALL SELECT 'BUROCRATA' AS name
UNION ALL SELECT 'CAMPO MILITAR' AS name
UNION ALL SELECT 'CANDILES' AS name
UNION ALL SELECT 'CANDILES II' AS name
UNION ALL SELECT 'CANDILES III' AS name
UNION ALL SELECT 'CARRILLO' AS name
UNION ALL SELECT 'CERRITO COLORADO' AS name
UNION ALL SELECT 'CERRITO COLORADO II' AS name
UNION ALL SELECT 'CERRITO COLORADO III' AS name
UNION ALL SELECT 'CIUDAD DEL SOL' AS name
UNION ALL SELECT 'CIUDAD DEL SOL II' AS name
UNION ALL SELECT 'COLINAS DEL SOL' AS name
UNION ALL SELECT 'COLONIA CIMATARIO' AS name
UNION ALL SELECT 'EL CONDADO' AS name
UNION ALL SELECT 'EL MIRADOR' AS name
UNION ALL SELECT 'EL REFUGIO' AS name
UNION ALL SELECT 'EL REFUGIO II' AS name
UNION ALL SELECT 'EL ROCIO' AS name
UNION ALL SELECT 'EL PUEBLITO' AS name
UNION ALL SELECT 'EL SOL' AS name
UNION ALL SELECT 'EJIDO SAN MIGUEL' AS name
UNION ALL SELECT 'ENSUEÑO' AS name
UNION ALL SELECT 'FUENTES DE BALVANERA' AS name
UNION ALL SELECT 'GEO PLAZAS' AS name
UNION ALL SELECT 'HACIENDA LA CRUZ' AS name
UNION ALL SELECT 'INSURGENTES' AS name
UNION ALL SELECT 'JACAL' AS name
UNION ALL SELECT 'JARDINES DE LA HACIENDA' AS name
UNION ALL SELECT 'JURIQUILLA' AS name
UNION ALL SELECT 'JURIQUILLA II' AS name
UNION ALL SELECT 'LA GLORIA' AS name
UNION ALL SELECT 'LA POPULAR' AS name
UNION ALL SELECT 'LA PRADERA I' AS name
UNION ALL SELECT 'LA PRADERA II' AS name
UNION ALL SELECT 'LA NEGRETA' AS name
UNION ALL SELECT 'LOARCA' AS name
UNION ALL SELECT 'LOARCA II' AS name
UNION ALL SELECT 'LOMA BONITA' AS name
UNION ALL SELECT 'LOMAS DEL MARQUES' AS name
UNION ALL SELECT 'LOMAS CALLE 25' AS name
UNION ALL SELECT 'LOMAS CALLE 27' AS name
UNION ALL SELECT 'LOS HEROES' AS name
UNION ALL SELECT 'LOS HUERTOS' AS name
UNION ALL SELECT 'LOS OLVERA' AS name
UNION ALL SELECT 'MARQUES QUERETANO' AS name
UNION ALL SELECT 'MERCADO DE ABASTOS' AS name
UNION ALL SELECT 'MILENIO' AS name
UNION ALL SELECT 'MILENIO NO100' AS name
UNION ALL SELECT 'MIRANDA' AS name
UNION ALL SELECT 'MENCHACA' AS name
UNION ALL SELECT 'NIÑOS HEROES' AS name
UNION ALL SELECT 'PASEOS DE SAN MIGUEL' AS name
UNION ALL SELECT 'PASEOS DEL PEDREGAL' AS name
UNION ALL SELECT 'PEDRO ESCOBEDO' AS name
UNION ALL SELECT 'PEDRO ESCOBEDO II' AS name
UNION ALL SELECT 'PIE DE LA CUESTA' AS name
UNION ALL SELECT 'PIE DE LA CUESTA II' AS name
UNION ALL SELECT 'PIRAMIDES' AS name
UNION ALL SELECT 'PLATON' AS name
UNION ALL SELECT 'PLAZA BELEN' AS name
UNION ALL SELECT 'PLAZA CANDILES' AS name
UNION ALL SELECT 'PLAZA EL ROBLE SJR' AS name
UNION ALL SELECT 'PLAZA PALMARES' AS name
UNION ALL SELECT 'PLAZA VERONA' AS name
UNION ALL SELECT 'PLAZAS DEL SOL' AS name
UNION ALL SELECT 'PLAZA GARIBALDI SMA' AS name
UNION ALL SELECT 'PLAZA NACIONES' AS name
UNION ALL SELECT 'PRESIDENTES' AS name
UNION ALL SELECT 'PRIVADA JURIQUILLA' AS name
UNION ALL SELECT 'PROLONGACION PASTEUR' AS name
UNION ALL SELECT 'PUERTA NAVARRA' AS name
UNION ALL SELECT 'PUEBLO DE JURICA' AS name
UNION ALL SELECT 'REAL DE LA LOMA' AS name
UNION ALL SELECT 'REAL DEL BOSQUE' AS name
UNION ALL SELECT 'REAL SOLARE' AS name
UNION ALL SELECT 'REFORMA AGRARIA' AS name
UNION ALL SELECT 'REFUGIO III' AS name
UNION ALL SELECT 'RINCONES DEL MARQUES' AS name
UNION ALL SELECT 'SAN ISIDRO' AS name
UNION ALL SELECT 'SAN JUAN DE LETRAN' AS name
UNION ALL SELECT 'SAN MIGUEL DE ALLENDE' AS name
UNION ALL SELECT 'SAN MIGUEL DE ALLENDE II' AS name
UNION ALL SELECT 'SAN MIGUEL DE ALLENDE III' AS name
UNION ALL SELECT 'SAN PABLO' AS name
UNION ALL SELECT 'SAN ROQUE' AS name
UNION ALL SELECT 'SANTA MARIA MAGDALENA' AS name
UNION ALL SELECT 'SANTA FE' AS name
UNION ALL SELECT 'SANTUARIOS' AS name
UNION ALL SELECT 'REAL DE SAN ISIDRO SJR' AS name
UNION ALL SELECT 'SATELITE' AS name
UNION ALL SELECT 'SATELITE II' AS name
UNION ALL SELECT 'SAUCES' AS name
UNION ALL SELECT 'SAUCES II' AS name
UNION ALL SELECT 'SOMBRERETE' AS name
UNION ALL SELECT 'SONTERRA' AS name
UNION ALL SELECT 'TECNOLOGICO' AS name
UNION ALL SELECT 'TEJEDA' AS name
UNION ALL SELECT 'TEJEDA II' AS name
UNION ALL SELECT 'TEQUISQUIAPAN CENTRO' AS name
UNION ALL SELECT 'TINTERO' AS name
UNION ALL SELECT 'TINTERO II' AS name
UNION ALL SELECT 'VALLE DE SANTIAGO' AS name
UNION ALL SELECT 'VALLE DIAMANTE' AS name
UNION ALL SELECT 'VILLAS DE SANTIAGO' AS name
UNION ALL SELECT 'VIÑEDOS' AS name
UNION ALL SELECT 'VISTA REAL' AS name
UNION ALL SELECT 'VILLAS DEL REFUGIO' AS name
UNION ALL SELECT 'ZAKIA' AS name
UNION ALL SELECT 'ZAKIA ZIZANA' AS name
UNION ALL SELECT 'ZIBATA' AS name
UNION ALL SELECT 'XENTRIC ZIBATA' AS name
UNION ALL SELECT 'SUPERVISION 1' AS name
UNION ALL SELECT 'SUPERVISION 2' AS name
UNION ALL SELECT 'SUPERVISION 3' AS name
UNION ALL SELECT 'SUPERVISION 4' AS name
UNION ALL SELECT 'SUPERVISION 5' AS name
UNION ALL SELECT 'SUPERVISION 6' AS name
UNION ALL SELECT 'EYE QUESOS FRESCOS' AS name
UNION ALL SELECT 'EYE CONVERSION 1ER TURNO' AS name
UNION ALL SELECT 'EYE CONVERSION 2DO TURNO' AS name
UNION ALL SELECT 'EYE TORTILLAS' AS name
UNION ALL SELECT 'EYE ADMINISTRACION' AS name
UNION ALL SELECT 'EYE CONTROL PRODUCCION' AS name
UNION ALL SELECT 'OTRO' AS name
UNION ALL SELECT 'Baja' AS name
) AS src
LEFT JOIN (
    SELECT MIN(id) AS id, name
    FROM departments
    GROUP BY name
) AS existing
    ON existing.name = src.name
WHERE existing.id IS NULL;

-- 2) Catálogo de puestos legado
INSERT INTO positions (name)
SELECT src.name
FROM (
SELECT 'ALMACENISTA' AS name
UNION ALL SELECT 'ALMACENISTA CAMARA' AS name
UNION ALL SELECT 'ALMACENISTA ABARROTE' AS name
UNION ALL SELECT 'ANALISTA ADMINISTRATIVO' AS name
UNION ALL SELECT 'ANALISTA CONTABLE' AS name
UNION ALL SELECT 'ANALISTA CONTABLE 1' AS name
UNION ALL SELECT 'ANALISTA CONTABLE 2' AS name
UNION ALL SELECT 'ANALISTA CONTABLE 3' AS name
UNION ALL SELECT 'ANALISTA CONTABLE GESTORIA' AS name
UNION ALL SELECT 'ANALISTA DE CAPACITACION' AS name
UNION ALL SELECT 'ANALISTA DE CAPITAL HUMANO' AS name
UNION ALL SELECT 'ANALISTA DE CUENTAS POR COBRAR' AS name
UNION ALL SELECT 'ANALISTA DE CUENTAS POR PAGAR' AS name
UNION ALL SELECT 'ANALISTA DE EXPANSION' AS name
UNION ALL SELECT 'ANALISTA DE MERCADOTECNIA' AS name
UNION ALL SELECT 'ANALISTA DE NÓMINAS' AS name
UNION ALL SELECT 'ANALISTA DE VALORES' AS name
UNION ALL SELECT 'ANALISTA SH' AS name
UNION ALL SELECT 'ASESOR COMERCIAL' AS name
UNION ALL SELECT 'AUXILIAR ADMINISTRATIVO' AS name
UNION ALL SELECT 'AUXILIAR CONTABLE' AS name
UNION ALL SELECT 'AUXILIAR CONTABLE 1' AS name
UNION ALL SELECT 'AUXILIAR CONTABLE 2' AS name
UNION ALL SELECT 'AUXILIAR DE CONTROL DE CALIDAD' AS name
UNION ALL SELECT 'AUXILIAR DE GRANOS' AS name
UNION ALL SELECT 'AUXILIAR DE INTENDENCIA' AS name
UNION ALL SELECT 'AUXILIAR DE OPERACIONES' AS name
UNION ALL SELECT 'AUXILIAR DE PANADERÍA' AS name
UNION ALL SELECT 'AUXILIAR DE PRODUCCIÓN' AS name
UNION ALL SELECT 'AUXILIAR DE REBANADO' AS name
UNION ALL SELECT 'AUXILIAR DE SUCURSAL' AS name
UNION ALL SELECT 'AUXILIAR DE SUCURSAL A' AS name
UNION ALL SELECT 'AUXILIAR DE SUCURSAL B' AS name
UNION ALL SELECT 'AUXILIAR DE SUCURSAL C' AS name
UNION ALL SELECT 'AUXILIAR DE SUCURSAL EN DESARROLLO' AS name
UNION ALL SELECT 'AUXILIAR DE SUPERVISION' AS name
UNION ALL SELECT 'AUXILIAR FACTURACION' AS name
UNION ALL SELECT 'CHOFER ENTREGA ESPECIALIZADA' AS name
UNION ALL SELECT 'CHOFER REPARTIDOR' AS name
UNION ALL SELECT 'CHOFER REPARTIDOR COMERCIAL' AS name
UNION ALL SELECT 'CONQUISTADOR' AS name
UNION ALL SELECT 'CONTROL DE PRODUCCIÓN' AS name
UNION ALL SELECT 'COORDINADOR ADMINISTRATIVO' AS name
UNION ALL SELECT 'COORDINADOR DE CALIDAD' AS name
UNION ALL SELECT 'COORDINADOR DE MANTENIMIENTO' AS name
UNION ALL SELECT 'COORDINADOR DE OPERACIONES' AS name
UNION ALL SELECT 'COORDINADOR DE SEGURIDAD E HIGIENE' AS name
UNION ALL SELECT 'DESARROLLADOR' AS name
UNION ALL SELECT 'DISEÑADOR' AS name
UNION ALL SELECT 'DIRECTOR GENERAL' AS name
UNION ALL SELECT 'ENCARGADO' AS name
UNION ALL SELECT 'ENCARGADO DE SUCURSAL' AS name
UNION ALL SELECT 'ENCARGADO DE SUCURSAL A' AS name
UNION ALL SELECT 'ENCARGADO DE SUCURSAL B' AS name
UNION ALL SELECT 'ENCARGADO DE SUCURSAL C' AS name
UNION ALL SELECT 'ENCARGADO EMPACADO CREMAS' AS name
UNION ALL SELECT 'GERENTE' AS name
UNION ALL SELECT 'GERENTE DE PLANTA' AS name
UNION ALL SELECT 'GERENTE GENERAL' AS name
UNION ALL SELECT 'INTENDENCIA' AS name
UNION ALL SELECT 'JEFE DE ATENCION A NEGOCIOS' AS name
UNION ALL SELECT 'JEFE DE CAPITAL HUMANO' AS name
UNION ALL SELECT 'JEFE DE CEDIS' AS name
UNION ALL SELECT 'JEFE DE COMPRAS' AS name
UNION ALL SELECT 'JEFE DE FINANZAS' AS name
UNION ALL SELECT 'JEFE DE MERCADOTECNIA' AS name
UNION ALL SELECT 'JEFE DE SISTEMAS' AS name
UNION ALL SELECT 'JEFE DE TI' AS name
UNION ALL SELECT 'MEDICO LABORAL' AS name
UNION ALL SELECT 'MOLINERO' AS name
UNION ALL SELECT 'MONTACARGUISTA' AS name
UNION ALL SELECT 'MONTACARGUISTA MP' AS name
UNION ALL SELECT 'MONTACARGUISTA PT' AS name
UNION ALL SELECT 'OPERADOR CODIFICADORA' AS name
UNION ALL SELECT 'OPERADOR DE PRODUCCIÓN A' AS name
UNION ALL SELECT 'OPERADOR DE PRODUCCIÓN B' AS name
UNION ALL SELECT 'OPERADOR DE TORTILLAS' AS name
UNION ALL SELECT 'OPERADOR LAVADORA DE PALANGANAS' AS name
UNION ALL SELECT 'OPERADOR MAQ EMPACADORA' AS name
UNION ALL SELECT 'OPERADOR MP' AS name
UNION ALL SELECT 'PANADERO' AS name
UNION ALL SELECT 'PLANEADOR DE COMPRAS' AS name
UNION ALL SELECT 'PLANEADOR DE COMPRAS 1' AS name
UNION ALL SELECT 'PLANEADOR DE COMPRAS 2' AS name
UNION ALL SELECT 'PRUEBA' AS name
UNION ALL SELECT 'RECEPCIONISTA' AS name
UNION ALL SELECT 'RECOLECTOR VALORES' AS name
UNION ALL SELECT 'RESPONSABLE DE REBANADO' AS name
UNION ALL SELECT 'SUPERVISOR' AS name
UNION ALL SELECT 'SUPERVISOR DE ABARROTE' AS name
UNION ALL SELECT 'SUPERVISOR DE CONTABILIDAD' AS name
UNION ALL SELECT 'SUPERVISOR DE MANTENIMIENTO' AS name
UNION ALL SELECT 'SUPERVISOR DE OPERACIONES' AS name
UNION ALL SELECT 'SUPERVISOR DE PANADERIA' AS name
UNION ALL SELECT 'SUPERVISOR DE PRODUCCIÓN' AS name
UNION ALL SELECT 'SUPERVISOR DE PT' AS name
UNION ALL SELECT 'SUPERVISOR DE SUCURSAL' AS name
UNION ALL SELECT 'SUPERVISOR MATERIA PRIMA' AS name
UNION ALL SELECT 'TÉCNICO DE MANTENIMIENTO' AS name
UNION ALL SELECT 'TÉCNICO DE SISTEMAS' AS name
UNION ALL SELECT 'OTROS' AS name
) AS src
LEFT JOIN (
    SELECT MIN(id) AS id, name
    FROM positions
    GROUP BY name
) AS existing
    ON existing.name = src.name
WHERE existing.id IS NULL;

-- 3) Usuarios con acceso total (equivalente a "Todos" en el JSON legacy)
UPDATE users
SET all_departments = 1
WHERE username IN ('managerchc', 'adminrh', 'managerrh', 'vacacionesrh', 'adminMQ', 'adminnomina', 'userSI');

DELETE ud
FROM user_departments ud
INNER JOIN users u ON u.id = ud.user_id
WHERE u.username IN ('managerchc', 'adminrh', 'managerrh', 'vacacionesrh', 'adminMQ', 'adminnomina', 'userSI');

-- 4) Usuarios con acceso parcial por departamentos
UPDATE users
SET all_departments = 0
WHERE username IN ('eyemanager', 'eyeconsultor', 'managerSI', 'managerEYE', 'jefefinanzas', 'jefecedis', 'manageratn', 'auxoperacion', 'supervision1', 'supervision2', 'supervision3', 'supervision4', 'supervision5', 'supervision6', 'eyetortillas', 'eyequeso', 'eyeturno1', 'eyeturno2', 'eyecontrol');

DELETE ud
FROM user_departments ud
INNER JOIN users u ON u.id = ud.user_id
WHERE u.username IN ('eyemanager', 'eyeconsultor', 'managerSI', 'managerEYE', 'jefefinanzas', 'jefecedis', 'manageratn', 'auxoperacion', 'supervision1', 'supervision2', 'supervision3', 'supervision4', 'supervision5', 'supervision6', 'eyetortillas', 'eyequeso', 'eyeturno1', 'eyeturno2', 'eyecontrol');

INSERT INTO user_departments (user_id, department_id)
SELECT u.id AS user_id, d.id AS department_id
FROM users u
INNER JOIN (
SELECT 'eyemanager' AS username, 'EYE ADMINISTRACION' AS department_name
UNION ALL SELECT 'eyemanager' AS username, 'EYE TORTILLAS' AS department_name
UNION ALL SELECT 'eyemanager' AS username, 'EYE QUESOS FRESCOS' AS department_name
UNION ALL SELECT 'eyemanager' AS username, 'EYE CONVERSION 1ER TURNO' AS department_name
UNION ALL SELECT 'eyemanager' AS username, 'EYE CONVERSION 2DO TURNO' AS department_name
UNION ALL SELECT 'eyemanager' AS username, 'EYE CONTROL PRODUCCION' AS department_name
UNION ALL SELECT 'eyeconsultor' AS username, 'EYE ADMINISTRACION' AS department_name
UNION ALL SELECT 'eyeconsultor' AS username, 'EYE TORTILLAS' AS department_name
UNION ALL SELECT 'eyeconsultor' AS username, 'EYE QUESOS FRESCOS' AS department_name
UNION ALL SELECT 'eyeconsultor' AS username, 'EYE CONVERSION 1ER TURNO' AS department_name
UNION ALL SELECT 'eyeconsultor' AS username, 'EYE CONVERSION 2DO TURNO' AS department_name
UNION ALL SELECT 'eyeconsultor' AS username, 'EYE CONTROL PRODUCCION' AS department_name
UNION ALL SELECT 'managerSI' AS username, 'SISTEMAS' AS department_name
UNION ALL SELECT 'managerSI' AS username, 'CEDIS' AS department_name
UNION ALL SELECT 'managerEYE' AS username, 'EYE QUESOS FRESCOS' AS department_name
UNION ALL SELECT 'managerEYE' AS username, 'EYE CONVERSION 1ER TURNO' AS department_name
UNION ALL SELECT 'managerEYE' AS username, 'EYE CONVERSION 2DO TURNO' AS department_name
UNION ALL SELECT 'managerEYE' AS username, 'EYE TORTILLAS' AS department_name
UNION ALL SELECT 'managerEYE' AS username, 'EYE ADMINISTRACION' AS department_name
UNION ALL SELECT 'managerEYE' AS username, 'EYE CONTROL PRODUCCION' AS department_name
UNION ALL SELECT 'jefefinanzas' AS username, 'PANADERIA' AS department_name
UNION ALL SELECT 'jefefinanzas' AS username, 'MANTENIMIENTO' AS department_name
UNION ALL SELECT 'jefefinanzas' AS username, 'EMPAQUE GRANOS' AS department_name
UNION ALL SELECT 'jefecedis' AS username, 'CEDIS' AS department_name
UNION ALL SELECT 'manageratn' AS username, 'ATENCION A NEGOCIOS' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PANADERIA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'MANTENIMIENTO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'EMPAQUE GRANOS' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'MERCADO DE ABASTOS' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'AV DE LA LUZ' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'CARRILLO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'CERRITO COLORADO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'CERRITO COLORADO II' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'CERRITO COLORADO III' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'EL SOL' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'GEO PLAZAS' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'INSURGENTES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LOMA BONITA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PLAZAS DEL SOL' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PLAZA VERONA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PUERTA NAVARRA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SAN JUAN DE LETRAN' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SAUCES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SAUCES II' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SATELITE' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SATELITE II' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SONTERRA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SUPERVISION 2' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'TINTERO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'TINTERO II' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'VIÑEDOS' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'AV CORREGIDORA NTE' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'EL REFUGIO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'EL REFUGIO II' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'HACIENDA LA CRUZ' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LA PRADERA I' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LA PRADERA II' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LA POPULAR' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LOS HEROES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LOS HUERTOS' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'MIRANDA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'MENCHACA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'NIÑOS HEROES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'REAL SOLARE' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PLATON' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'REFUGIO III' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'RINCONES DEL MARQUES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SUPERVISION 1' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'VILLAS DEL REFUGIO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'ZAKIA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'ZIBATA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'XENTRIC ZIBATA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'ATELIER' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'CIUDAD DEL SOL' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'CIUDAD DEL SOL II' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'JURIQUILLA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'JURIQUILLA II' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LOARCA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PASEOS DE SAN MIGUEL' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PASEOS DEL PEDREGAL' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PIE DE LA CUESTA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PIE DE LA CUESTA II' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PLAZA BELEN' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PLAZA GARIBALDI SMA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PLAZA NACIONES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PLAZA PALMARES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PRIVADA JURIQUILLA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PUEBLO DE JURICA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'REAL DE LA LOMA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SAN ISIDRO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SAN MIGUEL DE ALLENDE' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SAN MIGUEL DE ALLENDE II' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SAN MIGUEL DE ALLENDE III' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SOMBRERETE' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SUPERVISION 3' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'VALLE DE SANTIAGO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'VILLAS DE SANTIAGO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'ANDADORES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'CANDILES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'CANDILES II' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'CANDILES III' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'COLINAS DEL SOL' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'COLONIA CIMATARIO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'EL PUEBLITO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'EL CONDADO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'FUENTES DE BALVANERA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LA NEGRETA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LOMAS CALLE 25' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LOMAS CALLE 27' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LOS OLVERA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PIRAMIDES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PLAZA CANDILES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PRESIDENTES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PROLONGACION PASTEUR' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'REAL DEL BOSQUE' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'REFORMA AGRARIA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SANTUARIOS' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SUPERVISION 4' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'TEJEDA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'TEJEDA II' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'VALLE DIAMANTE' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'VISTA REAL' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'ALCANFORES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'AV CIMATARIO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'BUROCRATA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'CAMPO MILITAR' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'EL MIRADOR' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'ENSUEÑO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'JACAL' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'JARDINES DE LA HACIENDA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LA GLORIA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LOMAS DEL MARQUES' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'MILENIO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'MILENIO NO100' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PLAZA EL ROBLE SJR' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PEDRO ESCOBEDO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'PEDRO ESCOBEDO II' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'REAL DE SAN ISIDRO SJR' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SAN PABLO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SAN ROQUE' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SANTA FE' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SANTA MARIA MAGDALENA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'SUPERVISION 5' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'TECNOLOGICO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'TEQUISQUIAPAN CENTRO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'ZAKIA ZIZANA' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'MARQUES QUERETANO' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'EJIDO SAN MIGUEL' AS department_name
UNION ALL SELECT 'auxoperacion' AS username, 'LOARCA II' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'PASEOS DE SAN MIGUEL' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'LOARCA' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'SAN MIGUEL DE ALLENDE' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'JURIQUILLA' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'REAL DE LA LOMA' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'CIUDAD DEL SOL' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'VALLE DE SANTIAGO' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'PLAZA PALMARES' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'CIUDAD DEL SOL II' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'SAN MIGUEL DE ALLENDE II' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'SAN ISIDRO' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'ATELIER' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'SAN MIGUEL DE ALLENDE III' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'PLAZA GARIBALDI SMA' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'PRIVADA JURIQUILLA' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'PUERTA NAVARRA' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'PUEBLO DE JURICA' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'LOMA BONITA' AS department_name
UNION ALL SELECT 'supervision1' AS username, 'SUPERVISION 1' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'EL MIRADOR' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'HACIENDA LA CRUZ' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'LA PRADERA I' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'LA PRADERA II' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'LOS HEROES' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'MILENIO' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'MILENIO NO100' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'MIRANDA' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'PEDRO ESCOBEDO' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'PEDRO ESCOBEDO II' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'PLAZA EL ROBLE SJR' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'REAL DE SAN ISIDRO SJR' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'REAL SOLARE' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'RINCONES DEL MARQUES' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'TEQUISQUIAPAN CENTRO' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'VILLAS DEL REFUGIO' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'XENTRIC ZIBATA' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'ZAKIA' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'ZAKIA ZIZANA' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'ZIBATA' AS department_name
UNION ALL SELECT 'supervision2' AS username, 'SUPERVISION 2' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'AV CIMATARIO' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'BUROCRATA' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'CAMPO MILITAR' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'COLONIA CIMATARIO' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'EL PUEBLITO' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'ENSUEÑO' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'JACAL' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'JARDINES DE LA HACIENDA' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'LA GLORIA' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'MERCADO DE ABASTOS' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'NIÑOS HEROES' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'PIRAMIDES' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'PLAZAS DEL SOL' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'SAN JUAN DE LETRAN' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'SANTA FE' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'SANTA MARIA MAGDALENA' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'SANTUARIOS' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'TECNOLOGICO' AS department_name
UNION ALL SELECT 'supervision3' AS username, 'SUPERVISION 3' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'AV DE LA LUZ' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'CARRILLO' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'CERRITO COLORADO' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'CERRITO COLORADO II' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'CERRITO COLORADO III' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'EL ROCIO' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'EL SOL' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'EJIDO SAN MIGUEL' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'GEO PLAZAS' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'INSURGENTES' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'LOARCA II' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'PLAZA VERONA' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'SATELITE' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'SATELITE II' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'SAUCES' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'SAUCES II' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'SONTERRA' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'TINTERO' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'TINTERO II' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'VIÑEDOS' AS department_name
UNION ALL SELECT 'supervision4' AS username, 'SUPERVISION 4' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'ALCANFORES' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'AV CORREGIDORA NTE' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'EL REFUGIO' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'EL REFUGIO II' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'LA POPULAR' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'LOMAS DEL MARQUES' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'LOS HUERTOS' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'MENCHACA' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'MARQUES QUERETANO' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'PASEOS DEL PEDREGAL' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'PIE DE LA CUESTA' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'PIE DE LA CUESTA II' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'PLATON' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'PLAZA BELEN' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'PLAZA NACIONES' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'REFUGIO III' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'SAN PABLO' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'SAN ROQUE' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'SOMBRERETE' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'VILLAS DE SANTIAGO' AS department_name
UNION ALL SELECT 'supervision5' AS username, 'SUPERVISION 5' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'ANDADORES' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'CANDILES' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'CANDILES II' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'CANDILES III' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'COLINAS DEL SOL' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'EL CONDADO' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'FUENTES DE BALVANERA' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'LA NEGRETA' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'LOMAS CALLE 25' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'LOMAS CALLE 27' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'LOS OLVERA' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'PLAZA CANDILES' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'PRESIDENTES' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'PROLONGACION PASTEUR' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'REAL DEL BOSQUE' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'REFORMA AGRARIA' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'TEJEDA' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'TEJEDA II' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'VALLE DIAMANTE' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'VISTA REAL' AS department_name
UNION ALL SELECT 'supervision6' AS username, 'SUPERVISION 6' AS department_name
UNION ALL SELECT 'eyetortillas' AS username, 'EYE TORTILLAS' AS department_name
UNION ALL SELECT 'eyequeso' AS username, 'EYE QUESOS FRESCOS' AS department_name
UNION ALL SELECT 'eyeturno1' AS username, 'EYE CONVERSION 1ER TURNO' AS department_name
UNION ALL SELECT 'eyeturno2' AS username, 'EYE CONVERSION 2DO TURNO' AS department_name
UNION ALL SELECT 'eyecontrol' AS username, 'EYE CONTROL PRODUCCION' AS department_name
) AS mapping
    ON mapping.username = u.username
INNER JOIN (
    SELECT MIN(id) AS id, name
    FROM departments
    GROUP BY name
) AS d
    ON d.name = mapping.department_name;

COMMIT;
