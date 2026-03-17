-- Incidencias 1.6 - Verificación rápida posterior a migración
SELECT COUNT(*) AS total_departments FROM departments;
SELECT COUNT(*) AS total_positions FROM positions;

SELECT
    u.username,
    u.role,
    IFNULL(u.all_departments, 0) AS all_departments,
    GROUP_CONCAT(DISTINCT d.name ORDER BY d.name SEPARATOR ' | ') AS assigned_departments
FROM users u
LEFT JOIN user_departments ud ON ud.user_id = u.id
LEFT JOIN departments d ON d.id = ud.department_id
WHERE u.username IN ('managerchc', 'adminrh', 'managerrh', 'vacacionesrh', 'adminMQ', 'adminnomina', 'userSI', 'eyemanager', 'eyeconsultor', 'managerSI', 'managerEYE', 'jefefinanzas', 'jefecedis', 'manageratn', 'auxoperacion', 'supervision1', 'supervision2', 'supervision3', 'supervision4', 'supervision5', 'supervision6', 'eyetortillas', 'eyequeso', 'eyeturno1', 'eyeturno2', 'eyecontrol')
GROUP BY u.id, u.username, u.role, u.all_departments
ORDER BY u.role, u.username;
