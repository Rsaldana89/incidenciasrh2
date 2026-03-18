const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const jwt = require('jsonwebtoken');

const mysqldump = require('mysqldump');
const path = require('path');
const fs = require('fs');

process.env.TZ = 'America/Mexico_City';

// Definir la ruta del archivo de logs y la función logActivity
const logPath = path.join(__dirname, 'public', 'log.json');

function logActivity(action, user, details) {
    const query = `
        INSERT INTO logs (action, user, details)
        VALUES (?, ?, ?)
    `;

    const values = [
        action,
        user,
        JSON.stringify(details) // Convertir los detalles a texto
    ];

    db.query(query, values, (err) => {
        if (err) {
            // Ignorar errores relacionados con la tabla 'logs' inexistente
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.warn('La tabla "logs" no existe. Registro de logs omitido.');
            } else {
                console.error('Error al registrar el log en la base de datos:', err);
            }
        }
    });
}




// Ruta de la carpeta de backups
const backupsDir = path.join(__dirname, 'backups');

// Verificar si la carpeta existe; si no, crearla
if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir);
    console.log('Carpeta backups creada.');
}



app.get('/keepalive', (req, res) => {
    res.status(200).json({ message: 'OK' });
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});


app.get('/admin/backup', authenticateToken, async (req, res) => {
    try {
        const backupPath = path.join(__dirname, 'backups', `backup_${new Date().toISOString().slice(0, 10)}.sql`);

        await mysqldump({
            connection: {
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                timezone: 'local'
            },
            dumpToFile: backupPath,
        });

        res.download(backupPath, (err) => {
            if (err) {
                console.error('Error al descargar el respaldo:', err);
                res.status(500).send('Error al descargar el respaldo');
            } else {
                fs.unlink(backupPath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error al eliminar el archivo de respaldo:', unlinkErr);
                });
            }
        });
    } catch (error) {
        console.error('Error al generar el respaldo:', error);
        res.status(500).json({ error: 'Error al generar el respaldo de la base de datos' });
    }
});



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // No autorizado si no hay token

    jwt.verify(token, 'secret_key', (err, user) => {
        if (err) return res.sendStatus(403); // Token no válido
        req.user = user; // Asigna el usuario decodificado a req.user
        next(); // Continúa al siguiente middleware o ruta
    });
}

const legacyCatalogsDir = path.join(__dirname, 'legacy_catalogs');

function readLegacyCatalog(fileName) {
    const fullPath = path.join(legacyCatalogsDir, fileName);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function isMissingSchemaError(error) {
    return error && ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error.code);
}

function dbQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

async function getFreshUserSession(userId) {
    let users;
    try {
        users = await dbQuery(
            `SELECT id, username, full_name, role, IFNULL(all_departments, 0) AS all_departments
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );
    } catch (error) {
        if (!isMissingSchemaError(error)) throw error;
        users = await dbQuery(
            `SELECT id, username, full_name, role, 0 AS all_departments
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );
    }

    return users.length ? users[0] : null;
}

async function getAssignedDepartmentsByUserId(userId) {
    const rows = await dbQuery(
        `SELECT DISTINCT d.name
         FROM user_departments ud
         INNER JOIN departments d ON d.id = ud.department_id
         WHERE ud.user_id = ?
           AND d.name IS NOT NULL
           AND TRIM(d.name) <> ''
         ORDER BY d.name`,
        [userId]
    );

    return rows.map((row) => row.name);
}

async function getCurrentAdminUser(userId) {
    const users = await dbQuery(
        `SELECT id, username, full_name, role
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [userId]
    );
    return users.length ? users[0] : null;
}

async function requireAdminCurrentUser(req, res, next) {
    try {
        const currentUser = await getCurrentAdminUser(req.user.id);
        if (!currentUser) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        if (currentUser.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden realizar esta acción' });
        }
        req.currentUser = currentUser;
        next();
    } catch (error) {
        console.error('Error validando usuario administrador:', error);
        res.status(500).json({ error: 'No se pudo validar el usuario administrador' });
    }
}

function normalizeRole(role) {
    return ['admin', 'manager', 'user'].includes(role) ? role : 'user';
}

function sanitizeDepartmentIds(departmentIds) {
    if (!Array.isArray(departmentIds)) return [];

    const values = departmentIds
        .map((id) => parseInt(id, 10))
        .filter((id) => Number.isInteger(id) && id > 0);

    return [...new Set(values)];
}

async function replaceUserDepartments(userId, departmentIds) {
    await dbQuery('DELETE FROM user_departments WHERE user_id = ?', [userId]);

    if (!departmentIds.length) return;

    const values = departmentIds.map((departmentId) => [userId, departmentId]);
    await dbQuery('INSERT INTO user_departments (user_id, department_id) VALUES ?', [values]);
}

async function getDistinctDepartmentsWithIds() {
    return dbQuery(
        `SELECT MIN(id) AS id, name
         FROM departments
         WHERE name IS NOT NULL
           AND TRIM(name) <> ''
         GROUP BY name
         ORDER BY MIN(id)`
    );
}

async function getDistinctPositionsWithIds() {
    return dbQuery(
        `SELECT MIN(id) AS id, name
         FROM positions
         WHERE name IS NOT NULL
           AND TRIM(name) <> ''
         GROUP BY name
         ORDER BY MIN(id)`
    );
}

async function buildPrivilegesPayload() {
    const payload = { roles: { admin: {}, user: {}, manager: {} } };

    let users;
    try {
        users = await dbQuery(
            `SELECT id, username, role, IFNULL(all_departments, 0) AS all_departments
             FROM users
             ORDER BY role, username`
        );
    } catch (error) {
        if (!isMissingSchemaError(error)) throw error;
        users = await dbQuery(
            `SELECT id, username, role, 0 AS all_departments
             FROM users
             ORDER BY role, username`
        );
    }

    let departmentRows = [];
    try {
        departmentRows = await dbQuery(
            `SELECT ud.user_id, d.name
             FROM user_departments ud
             INNER JOIN departments d ON d.id = ud.department_id
             WHERE d.name IS NOT NULL
               AND TRIM(d.name) <> ''
             ORDER BY d.name`
        );
    } catch (error) {
        if (!isMissingSchemaError(error)) throw error;
    }

    const departmentsByUser = new Map();
    departmentRows.forEach((row) => {
        const current = departmentsByUser.get(row.user_id) || [];
        current.push(row.name);
        departmentsByUser.set(row.user_id, current);
    });

    users.forEach((user) => {
        const role = normalizeRole(user.role);
        const departments = user.all_departments
            ? ['Todos']
            : [...new Set(departmentsByUser.get(user.id) || [])];

        payload.roles[role][user.username] = { departments };
    });

    return payload;
}

async function getSystemBootstrapPayload() {
    const departments = await getDistinctDepartmentsWithIds();
    const positions = await getDistinctPositionsWithIds();

    let users;
    try {
        users = await dbQuery(
            `SELECT id, username, full_name, role, IFNULL(all_departments, 0) AS all_departments
             FROM users
             ORDER BY username`
        );
    } catch (error) {
        if (!isMissingSchemaError(error)) throw error;
        users = await dbQuery(
            `SELECT id, username, full_name, role, 0 AS all_departments
             FROM users
             ORDER BY username`
        );
    }

    const departmentRows = await dbQuery(
        `SELECT ud.user_id, d.id AS department_id, d.name
         FROM user_departments ud
         INNER JOIN departments d ON d.id = ud.department_id
         ORDER BY d.name`
    );

    const departmentMap = new Map();
    departmentRows.forEach((row) => {
        const current = departmentMap.get(row.user_id) || { department_ids: [], department_names: [] };
        if (!current.department_ids.includes(row.department_id)) {
            current.department_ids.push(row.department_id);
        }
        if (!current.department_names.includes(row.name)) {
            current.department_names.push(row.name);
        }
        departmentMap.set(row.user_id, current);
    });

    return {
        departments,
        positions,
        users: users.map((user) => {
            const assigned = departmentMap.get(user.id) || { department_ids: [], department_names: [] };
            return {
                ...user,
                all_departments: !!user.all_departments,
                department_ids: assigned.department_ids,
                department_names: assigned.department_names,
            };
        }),
    };
}

app.get('/departamentos.json', async (req, res) => {
    try {
        const rows = await getDistinctDepartmentsWithIds();
        if (!rows.length) {
            return res.json(readLegacyCatalog('departamentos.json'));
        }
        res.json({ departments: rows.map((row) => row.name) });
    } catch (error) {
        console.warn('Usando departamentos legacy por error de esquema:', error.code || error.message);
        res.json(readLegacyCatalog('departamentos.json'));
    }
});

app.get('/puestos.json', async (req, res) => {
    try {
        const rows = await getDistinctPositionsWithIds();
        if (!rows.length) {
            return res.json(readLegacyCatalog('puestos.json'));
        }
        res.json({ positions: rows.map((row) => row.name) });
    } catch (error) {
        console.warn('Usando puestos legacy por error de esquema:', error.code || error.message);
        res.json(readLegacyCatalog('puestos.json'));
    }
});

app.get('/privilegios.json', async (req, res) => {
    try {
        const payload = await buildPrivilegesPayload();
        const totalUsers = Object.values(payload.roles).reduce((acc, users) => acc + Object.keys(users).length, 0);
        if (!totalUsers) {
            return res.json(readLegacyCatalog('privilegios.json'));
        }
        res.json(payload);
    } catch (error) {
        console.warn('Usando privilegios legacy por error de esquema:', error.code || error.message);
        res.json(readLegacyCatalog('privilegios.json'));
    }
});

app.use('/auth', authRoutes);

app.get('/api/admin/system/bootstrap', authenticateToken, requireAdminCurrentUser, async (req, res) => {
    try {
        const payload = await getSystemBootstrapPayload();
        res.json(payload);
    } catch (error) {
        console.error('Error al cargar la administración del sistema:', error);
        res.status(500).json({ error: 'No se pudo cargar la administración del sistema. Verifica que el script SQL ya se aplicó.' });
    }
});

app.post('/api/admin/system/departments', authenticateToken, requireAdminCurrentUser, async (req, res) => {
    try {
        const name = (req.body.name || '').trim();
        if (!name) {
            return res.status(400).json({ error: 'El nombre del departamento es obligatorio' });
        }

        const existing = await dbQuery(
            `SELECT MIN(id) AS id, name
             FROM departments
             WHERE TRIM(name) = ?
             GROUP BY name
             LIMIT 1`,
            [name]
        );

        if (existing.length) {
            return res.json({ message: 'El departamento ya existe', department: existing[0] });
        }

        const result = await dbQuery('INSERT INTO departments (name) VALUES (?)', [name]);

        logActivity('Agregar departamento de catálogo', req.currentUser.username, { name });

        res.status(201).json({ message: 'Departamento agregado correctamente', department: { id: result.insertId, name } });
    } catch (error) {
        console.error('Error al agregar departamento:', error);
        res.status(500).json({ error: 'No se pudo agregar el departamento' });
    }
});

app.delete('/api/admin/system/departments/:id', authenticateToken, requireAdminCurrentUser, async (req, res) => {
    try {
        const departmentId = parseInt(req.params.id, 10);
        if (!Number.isInteger(departmentId) || departmentId <= 0) {
            return res.status(400).json({ error: 'Departamento inválido' });
        }

        const existing = await dbQuery('SELECT id, name FROM departments WHERE id = ? LIMIT 1', [departmentId]);
        if (!existing.length) {
            return res.status(404).json({ error: 'Departamento no encontrado' });
        }

        const departmentName = (existing[0].name || '').trim();
        const assignedEmployees = await dbQuery(
            `SELECT COUNT(*) AS total
             FROM personal
             WHERE TRIM(IFNULL(department_name, '')) = ?`,
            [departmentName]
        );

        if ((assignedEmployees[0] && assignedEmployees[0].total) > 0) {
            return res.status(409).json({ error: 'No se puede eliminar el departamento porque hay empleados asignados con ese texto en su registro.' });
        }

        await dbQuery('DELETE FROM user_departments WHERE department_id = ?', [departmentId]);
        await dbQuery('DELETE FROM departments WHERE id = ?', [departmentId]);

        logActivity('Eliminar departamento de catálogo', req.currentUser.username, {
            department_id: departmentId,
            name: departmentName,
        });

        res.json({ message: 'Departamento eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar departamento:', error);
        res.status(500).json({ error: 'No se pudo eliminar el departamento' });
    }
});

app.post('/api/admin/system/positions', authenticateToken, requireAdminCurrentUser, async (req, res) => {
    try {
        const name = (req.body.name || '').trim();
        if (!name) {
            return res.status(400).json({ error: 'El nombre del puesto es obligatorio' });
        }

        const existing = await dbQuery(
            `SELECT MIN(id) AS id, name
             FROM positions
             WHERE TRIM(name) = ?
             GROUP BY name
             LIMIT 1`,
            [name]
        );

        if (existing.length) {
            return res.json({ message: 'El puesto ya existe', position: existing[0] });
        }

        const result = await dbQuery('INSERT INTO positions (name) VALUES (?)', [name]);

        logActivity('Agregar puesto de catálogo', req.currentUser.username, { name });

        res.status(201).json({ message: 'Puesto agregado correctamente', position: { id: result.insertId, name } });
    } catch (error) {
        console.error('Error al agregar puesto:', error);
        res.status(500).json({ error: 'No se pudo agregar el puesto' });
    }
});

app.delete('/api/admin/system/positions/:id', authenticateToken, requireAdminCurrentUser, async (req, res) => {
    try {
        const positionId = parseInt(req.params.id, 10);
        if (!Number.isInteger(positionId) || positionId <= 0) {
            return res.status(400).json({ error: 'Puesto inválido' });
        }

        const existing = await dbQuery('SELECT id, name FROM positions WHERE id = ? LIMIT 1', [positionId]);
        if (!existing.length) {
            return res.status(404).json({ error: 'Puesto no encontrado' });
        }

        const positionName = (existing[0].name || '').trim();
        const assignedEmployees = await dbQuery(
            `SELECT COUNT(*) AS total
             FROM personal
             WHERE TRIM(IFNULL(puesto, '')) = ?`,
            [positionName]
        );

        if ((assignedEmployees[0] && assignedEmployees[0].total) > 0) {
            return res.status(409).json({ error: 'No se puede eliminar el puesto porque hay empleados asignados con ese texto en su registro.' });
        }

        await dbQuery('DELETE FROM positions WHERE id = ?', [positionId]);

        logActivity('Eliminar puesto de catálogo', req.currentUser.username, {
            position_id: positionId,
            name: positionName,
        });

        res.json({ message: 'Puesto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar puesto:', error);
        res.status(500).json({ error: 'No se pudo eliminar el puesto' });
    }
});

app.post('/api/admin/system/users', authenticateToken, requireAdminCurrentUser, async (req, res) => {
    try {
        const username = (req.body.username || '').trim();
        const full_name = (req.body.full_name || '').trim();
        const password = req.body.password || '';
        const role = normalizeRole(req.body.role || 'user');
        const all_departments = !!req.body.all_departments;
        const departmentIds = all_departments ? [] : sanitizeDepartmentIds(req.body.department_ids);

        if (!username || !full_name || !password) {
            return res.status(400).json({ error: 'Usuario, nombre completo y contraseña son obligatorios' });
        }

        const duplicate = await dbQuery('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
        if (duplicate.length) {
            return res.status(409).json({ error: 'El nombre de usuario ya existe' });
        }

        const result = await dbQuery(
            'INSERT INTO users (username, password, role, full_name, all_departments) VALUES (?, ?, ?, ?, ?)',
            [username, password, role, full_name, all_departments ? 1 : 0]
        );

        await replaceUserDepartments(result.insertId, departmentIds);

        logActivity('Crear usuario del sistema', req.currentUser.username, {
            username,
            role,
            full_name,
            all_departments,
            department_ids: departmentIds,
        });

        res.status(201).json({ message: 'Usuario creado correctamente' });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ error: 'No se pudo crear el usuario' });
    }
});

app.put('/api/admin/system/users/:id', authenticateToken, requireAdminCurrentUser, async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ error: 'Usuario inválido' });
        }

        const full_name = (req.body.full_name || '').trim();
        const role = normalizeRole(req.body.role || 'user');
        const all_departments = !!req.body.all_departments;
        const departmentIds = all_departments ? [] : sanitizeDepartmentIds(req.body.department_ids);

        if (!full_name) {
            return res.status(400).json({ error: 'El nombre completo es obligatorio' });
        }

        const existing = await dbQuery('SELECT id, username FROM users WHERE id = ? LIMIT 1', [userId]);
        if (!existing.length) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        await dbQuery(
            'UPDATE users SET full_name = ?, role = ?, all_departments = ? WHERE id = ?',
            [full_name, role, all_departments ? 1 : 0, userId]
        );

        await replaceUserDepartments(userId, departmentIds);

        logActivity('Actualizar usuario del sistema', req.currentUser.username, {
            user_id: userId,
            username: existing[0].username,
            role,
            full_name,
            all_departments,
            department_ids: departmentIds,
        });

        res.json({ message: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ error: 'No se pudo actualizar el usuario' });
    }
});

app.put('/api/admin/system/users/:id/password', authenticateToken, requireAdminCurrentUser, async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const password = req.body.password || '';

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ error: 'Usuario inválido' });
        }
        if (!password) {
            return res.status(400).json({ error: 'La contraseña es obligatoria' });
        }

        const existing = await dbQuery('SELECT id, username FROM users WHERE id = ? LIMIT 1', [userId]);
        if (!existing.length) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        await dbQuery('UPDATE users SET password = ? WHERE id = ?', [password, userId]);

        logActivity('Cambiar contraseña de usuario', req.currentUser.username, {
            user_id: userId,
            username: existing[0].username,
        });

        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
    }
});

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.redirect('/login.html');
});

app.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const currentUser = await getFreshUserSession(req.user.id);
        if (!currentUser) {
            return res.sendStatus(401);
        }

        let departments = [];
        try {
            departments = await getAssignedDepartmentsByUserId(currentUser.id);
        } catch (error) {
            if (!isMissingSchemaError(error)) {
                throw error;
            }
        }

        res.json({
            username: currentUser.username,
            full_name: currentUser.full_name,
            role: currentUser.role,
            all_departments: !!currentUser.all_departments,
            departments,
            version: '1.6',
        });
    } catch (error) {
        console.error('Error al construir el contexto de sesión:', error);
        res.json({ username: req.user.username, full_name: req.user.full_name, role: req.user.role, all_departments: false, departments: [], version: '1.6' });
    }
});

app.get('/vacaciones', authenticateToken, (req, res) => {
    const query = `
    SELECT 
        employee_number, 
        full_name, 
        department_name,
        FLOOR(DATEDIFF(CURDATE(), start_date) / 365) AS years_worked,
        CASE
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) = 1 THEN 12
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) = 2 THEN 14
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) = 3 THEN 16
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) = 4 THEN 18
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) = 5 THEN 20
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) BETWEEN 6 AND 10 THEN 22
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) BETWEEN 11 AND 15 THEN 24
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) BETWEEN 16 AND 20 THEN 26
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) BETWEEN 21 AND 25 THEN 28
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) BETWEEN 26 AND 30 THEN 30
            ELSE 12
        END AS total_vacation_days,
        IFNULL(days_taken, 0) AS days_taken,
        CASE
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) = 1 THEN 12
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) = 2 THEN 14
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) = 3 THEN 16
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) = 4 THEN 18
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) = 5 THEN 20
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) BETWEEN 6 AND 10 THEN 22
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) BETWEEN 11 AND 15 THEN 24
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) BETWEEN 16 AND 20 THEN 26
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) BETWEEN 21 AND 25 THEN 28
            WHEN FLOOR(DATEDIFF(CURDATE(), start_date) / 365) BETWEEN 26 AND 30 THEN 30
            ELSE 12 
        END - IFNULL(days_taken, 0) AS remaining_days
    FROM personal
    ORDER BY employee_number;
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener los datos de vacaciones' });
        }
        res.json({
            role: req.user.role,
            data: results
        });
    });
});

app.get('/admin/personal', authenticateToken, (req, res) => {
    const query = `
    SELECT 
        employee_number, 
        full_name, 
        rfc, 
        curp, 
        nss, 
        email,
        puesto, 
        department_name, 
        start_date, 
        fecha_baja, 
        fecha_reingreso, 
        days_pending,   -- Agregado
        days_taken      -- Agregado
    FROM personal
    ORDER BY 
        CASE WHEN department_name = 'Baja' THEN 1 ELSE 0 END, 
        employee_number;
    `;
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener los datos del personal' });
        }
        res.json(results);
    });
});

app.get('/admin/personal/:employee_number', authenticateToken, (req, res) => {
    const { employee_number } = req.params;
    const query = 'SELECT * FROM personal WHERE employee_number = ?';
    db.query(query, [employee_number], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener el empleado' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }
        res.json(results[0]);
    });
});

app.post('/admin/personal', authenticateToken, (req, res) => {
    const { 
        employee_number, 
        full_name, 
        rfc, 
        curp, 
        nss, 
        email,
        puesto, 
        department_name, 
        start_date, 
        fecha_baja, 
        fecha_reingreso 
    } = req.body;

    if (!employee_number || !full_name || !department_name || !start_date) {
        return res.status(400).json({ error: 'Todos los campos obligatorios deben estar presentes' });
    }
    
    const safeEmail = (email === undefined || email === '') ? null : email;

    const query = `
        INSERT INTO personal (employee_number, full_name, rfc, curp, nss, email, puesto, department_name, start_date, fecha_baja, fecha_reingreso)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [employee_number, full_name, rfc, curp, nss, safeEmail, puesto, department_name, start_date, fecha_baja, fecha_reingreso], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'El número de empleado ya existe' });
            }
            console.error('Error al agregar el empleado:', err);
            return res.status(500).json({ error: 'Error al agregar el empleado' });
        }

        // Si el empleado se agregó correctamente, insertar 52 semanas de asistencias para el nuevo empleado
        const year = new Date().getFullYear();
        const attendanceRecords = [];

        for (let week = 1; week <= 52; week++) {
            attendanceRecords.push([employee_number, week, year, '1', '1', '1', '1', '1', '1', '1']);
        }

        const attendanceQuery = `
            INSERT INTO asistencias (EMPLOYEE_NUMBER, WEEK_NUMBER, YEAR, LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO)
            VALUES ?
        `;

        db.query(attendanceQuery, [attendanceRecords], (err2) => {
            if (err2) {
                console.error('Error al agregar registros de asistencia:', err2);
                return res.status(500).json({ error: 'Error al generar las asistencias para el nuevo empleado' });
            }

            // Registrar la acción en el log
            logActivity('Agregar empleado', req.user.username, { 
                employee_number, 
                full_name, 
                department_name, 
                start_date,
                email: safeEmail
            });

            res.status(201).json({ message: 'Empleado y asistencias agregados correctamente' });
        });
    });
});


app.post('/admin/personal/bulk', authenticateToken, (req, res) => {
    const employees = req.body; // Se espera un array de empleados

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
        return res.status(400).json({ error: 'No se enviaron datos o el formato no es válido.' });
    }

    // Validar que cada empleado tenga los campos requeridos
    for (const employee of employees) {
        if (!employee.employee_number || !employee.full_name || !employee.department_name || !employee.start_date) {
            return res.status(400).json({
                error: `El empleado ${employee.employee_number || '[sin ID]'} tiene datos incompletos.`,
            });
        }
    }

    // Construir los valores para la inserción masiva
    const values = employees.map((emp) => [
        emp.employee_number,
        emp.full_name,
        emp.rfc || null,
        emp.curp || null,
        emp.nss || null,
        (emp.email === undefined || emp.email === '') ? null : emp.email,
        emp.puesto || null,
        emp.department_name,
        emp.start_date,
        emp.fecha_baja || null,
        emp.fecha_reingreso || null,
    ]);

    const query = `
        INSERT INTO personal (employee_number, full_name, rfc, curp, nss, email, puesto, department_name, start_date, fecha_baja, fecha_reingreso)
        VALUES ?
    `;

    db.query(query, [values], (err, result) => {
        if (err) {
            console.error('Error al agregar empleados:', err);

            // Detectar duplicados
            if (err.code === 'ER_DUP_ENTRY') {
                const match = err.sqlMessage.match(/Duplicate entry '(\d+)' for key/);
                const duplicateID = match ? match[1] : 'desconocido';
                return res.status(409).json({
                    error: `El empleado con ID ${duplicateID} ya existe en la base de datos.`,
                });
            }

            return res.status(500).json({
                error: 'Error al agregar empleados. Revisa los datos y vuelve a intentar.',
            });
        }

        // Si los empleados se agregaron correctamente, insertar asistencias para cada uno
        const year = new Date().getFullYear();
        const attendanceRecords = [];

        employees.forEach((emp) => {
            for (let week = 1; week <= 52; week++) {
                attendanceRecords.push([
                    emp.employee_number,
                    week,
                    year,
                    '1', // LUNES
                    '1', // MARTES
                    '1', // MIERCOLES
                    '1', // JUEVES
                    '1', // VIERNES
                    '1', // SABADO
                    '1', // DOMINGO
                ]);
            }
        });

        const attendanceQuery = `
            INSERT INTO asistencias (EMPLOYEE_NUMBER, WEEK_NUMBER, YEAR, LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO)
            VALUES ?
        `;

        db.query(attendanceQuery, [attendanceRecords], (err2) => {
            if (err2) {
                console.error('Error al agregar registros de asistencia:', err2);
                return res.status(500).json({ error: 'Error al generar las asistencias para los nuevos empleados.' });
            }

            // Registrar la acción en el log
            logActivity('Agregar empleados (masivo)', req.user.username, {
                total_empleados: employees.length,
                empleados: employees.map((e) => ({
                    employee_number: e.employee_number,
                    full_name: e.full_name,
                    department_name: e.department_name,
                })),
            });

            res.status(201).json({
                message: 'Empleados y asistencias agregados correctamente.',
                added: result.affectedRows,
            });
        });
    });
});




// Nueva ruta para actualizar los campos de días pendientes y días tomados
app.put('/admin/personal/vacaciones/:employee_number', authenticateToken, (req, res) => {
    const { employee_number } = req.params;
    const { days_pending, days_taken } = req.body;

    // Validar que los valores sean correctos
    if (days_pending >= 0 && days_pending <= 60 && days_taken >= 0 && days_taken <= 60) {
        const query = 'UPDATE personal SET days_pending = ?, days_taken = ? WHERE employee_number = ?';
        db.query(query, [days_pending, days_taken, employee_number], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error al actualizar los datos de vacaciones' });
            }

            // Registrar la acción en el log
            logActivity('Actualizar vacaciones', req.user.username, {
                employee_number,
                days_pending,
                days_taken,
            });

            res.json({ message: 'Vacaciones actualizadas correctamente' });
        });
    } else {
        res.status(400).json({ error: 'Los valores de días deben estar entre 0 y 60' });
    }
});


// Nueva ruta para actualizar los registros de asistencia en la base de datos
// Nueva ruta para actualizar los registros de asistencia en la base de datos
app.put('/admin/attendances/:employee_number/:week/:year', authenticateToken, (req, res) => {
    const { employee_number, week, year } = req.params;
    let { 
        LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO, 
        COMPENSACION, COMISION, BONO_PRODUCTIVIDAD, APOYO_TRANSPORTE, PRIMA_DOMINICAL,
        DESCUENTO_PRESTAMO_INVENTARIO, BONO_RECOMENDACION, DESCUENTO_EFECTIVO, NOTAS
    } = req.body;

    // Asegurarse de que los valores numéricos se procesen correctamente
    COMPENSACION = COMPENSACION ? parseFloat(COMPENSACION) : 0;
    COMISION = COMISION ? parseInt(COMISION, 10) : 0;
    BONO_PRODUCTIVIDAD = BONO_PRODUCTIVIDAD ? parseFloat(BONO_PRODUCTIVIDAD) : 0;
    APOYO_TRANSPORTE = APOYO_TRANSPORTE ? parseFloat(APOYO_TRANSPORTE) : 0;
    PRIMA_DOMINICAL = PRIMA_DOMINICAL ? parseFloat(PRIMA_DOMINICAL) : 0;
    DESCUENTO_PRESTAMO_INVENTARIO = DESCUENTO_PRESTAMO_INVENTARIO ? parseFloat(DESCUENTO_PRESTAMO_INVENTARIO) : 0;
    BONO_RECOMENDACION = BONO_RECOMENDACION ? parseFloat(BONO_RECOMENDACION) : 0;
    DESCUENTO_EFECTIVO = DESCUENTO_EFECTIVO ? parseFloat(DESCUENTO_EFECTIVO) : 0;
    NOTAS = NOTAS || ''; // Si está vacío, lo definimos como una cadena vacía

    const query = `
        UPDATE asistencias 
        SET LUNES = ?, 
            MARTES = ?, 
            MIERCOLES = ?, 
            JUEVES = ?, 
            VIERNES = ?, 
            SABADO = ?, 
            DOMINGO = ?, 
            COMPENSACION = ?, 
            COMISION = ?, 
            BONO_PRODUCTIVIDAD = ?, 
            APOYO_TRANSPORTE = ?, 
            PRIMA_DOMINICAL = ?, 
            DESCUENTO_PRESTAMO_INVENTARIO = ?, 
            BONO_RECOMENDACION = ?, 
            DESCUENTO_EFECTIVO = ?, 
            NOTAS = ?
        WHERE EMPLOYEE_NUMBER = ? AND WEEK_NUMBER = ? AND YEAR = ?
    `;

    const values = [
        LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO, 
        COMPENSACION, COMISION, BONO_PRODUCTIVIDAD, APOYO_TRANSPORTE, PRIMA_DOMINICAL,
        DESCUENTO_PRESTAMO_INVENTARIO, BONO_RECOMENDACION, DESCUENTO_EFECTIVO, NOTAS, 
        employee_number, week, year
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error al actualizar los datos de asistencia:', err);
            return res.status(500).json({ error: 'Error al actualizar los datos de asistencia' });
        }

        // Registrar la acción en el log
        logActivity('Actualizar asistencia', req.user.username, {
            employee_number,
            week,
            year,
            asistencia: {
                LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO,
                COMPENSACION, COMISION, BONO_PRODUCTIVIDAD, APOYO_TRANSPORTE, PRIMA_DOMINICAL,
                DESCUENTO_PRESTAMO_INVENTARIO, BONO_RECOMENDACION, DESCUENTO_EFECTIVO, NOTAS
            }
        });

        res.json({ success: true, message: 'Asistencia actualizada correctamente' });
    });
});







app.put('/admin/personal/:employee_number', authenticateToken, (req, res) => {
    const { employee_number } = req.params;
    const { 
        full_name, 
        rfc, 
        curp, 
        nss, 
        email,
        puesto, 
        department_name, 
        start_date, 
        fecha_baja, 
        fecha_reingreso 
    } = req.body;

    const safeEmail = (email === undefined || email === '') ? null : email;

    const query = `
        UPDATE personal 
        SET full_name = ?, 
            rfc = ?, 
            curp = ?, 
            nss = ?, 
            email = ?,
            puesto = ?, 
            department_name = ?, 
            start_date = ?, 
            fecha_baja = ?, 
            fecha_reingreso = ?
        WHERE employee_number = ?
    `;

    db.query(query, [full_name, rfc, curp, nss, safeEmail, puesto, department_name, start_date, fecha_baja, fecha_reingreso, employee_number], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al actualizar el empleado' });
        }

        // Registrar la acción en el log
        logActivity('Actualizar empleado', req.user.username, {
            employee_number,
            updated_fields: {
                full_name,
                rfc,
                curp,
                nss,
                email: safeEmail,
                puesto,
                department_name,
                start_date,
                fecha_baja,
                fecha_reingreso
            }
        });

        res.json({ message: 'Empleado actualizado correctamente' });
    });
});


// Modificación para actualizar la fecha de baja con fecha proporcionada o actual
app.put('/admin/personal/baja/:employee_number', authenticateToken, (req, res) => {
    const { employee_number } = req.params;
    const { fecha_baja } = req.body;

    // Determinar la fecha de baja: usar la proporcionada o la fecha actual
    const finalFechaBaja = fecha_baja || new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

    // Validar que la fecha de baja sea válida
    if (isNaN(new Date(finalFechaBaja).getTime())) {
        return res.status(400).json({ error: 'La fecha de baja proporcionada no es válida.' });
    }

    const query = 'UPDATE personal SET department_name = "Baja", fecha_baja = ? WHERE employee_number = ?';
    db.query(query, [finalFechaBaja, employee_number], (err) => {
        if (err) {
            console.error('Error al dar de baja al empleado:', err);
            return res.status(500).json({ error: 'Error al dar de baja al empleado.' });
        }

        // Registrar la acción en el log
        logActivity('Dar de baja empleado', req.user.username, {
            employee_number,
            fecha_baja: finalFechaBaja
        });

        res.json({ message: 'Empleado dado de baja correctamente', fecha_baja: finalFechaBaja });
    });
});



app.get('/admin/attendances', authenticateToken, (req, res) => {
    const { week, year } = req.query;

    const query = `
        SELECT
            p.employee_number AS 'Codigo trabajador',
            p.department_name AS 'Departamento',
            p.full_name AS 'Nombre',
            a.LUNES,
            a.MARTES,
            a.MIERCOLES,
            a.JUEVES,
            a.VIERNES,
            a.SABADO,
            a.DOMINGO,
            COALESCE(a.TOTAL_EXTRA, 0) AS 'T.Extra Total',
            COALESCE(a.DIAS_DESCANSO_TRABAJADO, 0) AS 'Dias descanso trabajado',
            COALESCE(a.FALTA, 0) AS 'Falta',
            COALESCE(a.COMPENSACION, 0) AS 'Compensacion',
            COALESCE(a.COMISION, 0) AS 'Comision',
            COALESCE(a.BONO_PRODUCTIVIDAD, 0) AS 'Bono productividad',
            COALESCE(a.APOYO_TRANSPORTE, 0) AS 'Apoyo transporte',
            COALESCE(a.PRIMA_DOMINICAL, 0) AS 'Prima dominical',
            COALESCE(a.DIAS_FESTIVOS, 0) AS 'Dias festivos',
            COALESCE(a.INCAPACIDAD, 0) AS 'Incapacidad',
            COALESCE(a.DESCUENTO_PRESTAMO_INVENTARIO, 0) AS 'Descuento prestamo inventario',
            COALESCE(a.BONO_RECOMENDACION, 0) AS 'Bono recomendacion',
            COALESCE(a.DESCUENTO_EFECTIVO, 0) AS 'Descuento efectivo',
            COALESCE(a.NOTAS, 'Sin notas') AS 'Notas'
        FROM asistencias a
        INNER JOIN personal p ON a.EMPLOYEE_NUMBER = p.employee_number
        WHERE a.WEEK_NUMBER = ? AND a.YEAR = ?
        ORDER BY p.employee_number;
    `;

    const values = [week, year];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Error al obtener las asistencias:', err);
            return res.status(500).json({ error: 'Error al obtener las asistencias' });
        }
        res.json(results);
    });
});


process.on('uncaughtException', (error) => {
    console.error("Uncaught Exception:", error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

app.use((err, req, res, next) => {
    console.error("Error detectado:", err);
    res.status(500).send("Internal Server Error");
});



const server = app.listen(port, '0.0.0.0', () => {
     console.log(`Servidor corriendo en http://0.0.0.0:${port}`);
});

function shutdown(signal) {
    console.log(`${signal} recibido. Cerrando servidor...`);
    server.close(() => {
        console.log('Servidor HTTP cerrado correctamente.');
        process.exit(0);
    });

    setTimeout(() => {
        console.warn('Forzando cierre del proceso tras timeout de shutdown.');
        process.exit(0);
    }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});