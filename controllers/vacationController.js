const xlsx = require('xlsx');
const db = require('../config/db');

function normalizeHeader(value) {
    return String(value == null ? '' : value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function normalizeEmployeeCode(value) {
    const digits = String(value == null ? '' : value).replace(/\D/g, '');
    if (!digits) return '';
    return String(parseInt(digits, 10));
}

function parseInteger(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
    }
    const normalized = String(value).replace(/,/g, '').trim();
    if (!normalized) return null;
    const number = Number(normalized);
    return Number.isFinite(number) ? Math.trunc(number) : null;
}

function parseExcelDate(value) {
    if (value == null || value === '') return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }

    if (typeof value === 'number') {
        const parsed = xlsx.SSF.parse_date_code(value);
        if (parsed && parsed.y && parsed.m && parsed.d) {
            const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
            return date.toISOString().slice(0, 10);
        }
    }

    const raw = String(value).trim();
    if (!raw) return null;

    const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (ddmmyyyy) {
        const day = ddmmyyyy[1].padStart(2, '0');
        const month = ddmmyyyy[2].padStart(2, '0');
        const year = ddmmyyyy[3].length === 2 ? `20${ddmmyyyy[3]}` : ddmmyyyy[3];
        return `${year}-${month}-${day}`;
    }

    const isoLike = new Date(raw);
    if (!Number.isNaN(isoLike.getTime())) {
        return isoLike.toISOString().slice(0, 10);
    }

    return null;
}

function formatDateDisplay(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function calculateCompletedYears(effectiveDate) {
    if (!effectiveDate) return 0;
    const start = new Date(effectiveDate);
    if (Number.isNaN(start.getTime())) return 0;

    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    const monthDelta = now.getMonth() - start.getMonth();
    const dayDelta = now.getDate() - start.getDate();

    if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
        years -= 1;
    }

    return Math.max(years, 0);
}

function computeCurrentPeriodDays(yearsCompleted) {
    const years = parseInteger(yearsCompleted) || 0;

    if (years <= 0) return 0;
    if (years === 1) return 12;
    if (years === 2) return 14;
    if (years === 3) return 16;
    if (years === 4) return 18;
    if (years === 5) return 20;
    if (years >= 6 && years <= 10) return 22;
    if (years >= 11 && years <= 15) return 24;
    if (years >= 16 && years <= 20) return 26;
    if (years >= 21 && years <= 25) return 28;
    if (years >= 26 && years <= 30) return 30;

    return 32;
}

function isRowEmpty(row) {
    return !Array.isArray(row) || row.every((cell) => String(cell == null ? '' : cell).trim() === '');
}

function detectTabularHeaderRow(rows) {
    return rows.findIndex((row) => {
        const normalized = row.map(normalizeHeader).filter(Boolean);
        if (!normalized.length) return false;
        const joined = normalized.join(' | ');
        return joined.includes('codigo del empleado') && (
            joined.includes('vacaciones pendientes') ||
            joined.includes('saldo total vacaciones') ||
            joined.includes('nombre')
        );
    });
}

function findHeaderIndexByAliases(normalizedHeaders, aliases) {
    return normalizedHeaders.findIndex((header) => aliases.includes(header));
}

function parseTabularRows(rows) {
    const headerRowIndex = detectTabularHeaderRow(rows);
    if (headerRowIndex === -1) {
        return null;
    }

    const normalizedHeaders = rows[headerRowIndex].map(normalizeHeader);
    const idx = {
        department: findHeaderIndexByAliases(normalizedHeaders, ['sucursal', 'departamento']),
        employee_code: findHeaderIndexByAliases(normalizedHeaders, ['codigo del empleado', 'id del empleado', 'empleado']),
        nss: findHeaderIndexByAliases(normalizedHeaders, ['nss']),
        name: findHeaderIndexByAliases(normalizedHeaders, ['nombre']),
        status: findHeaderIndexByAliases(normalizedHeaders, ['estado actual', 'estado']),
        join_date: findHeaderIndexByAliases(normalizedHeaders, ['fecha', 'fecha de ingreso']),
        years_completed: findHeaderIndexByAliases(normalizedHeaders, ['anos comp', 'anos comp ', 'anos completos', 'antiguedad anos']),
        days: findHeaderIndexByAliases(normalizedHeaders, ['dias', 'dias periodo actual']),
        vac_taken_before: findHeaderIndexByAliases(normalizedHeaders, ['vac tomadas antes de reg empleado', 'vac tomadas antes de reg', 'vacaciones tomadas antes de reg empleado']),
        vac_taken_card: findHeaderIndexByAliases(normalizedHeaders, ['vac tomadas tarjeta vacaciones', 'vac tomadas tarjeta', 'vacaciones tomadas tarjeta vacaciones']),
        vac_pending: findHeaderIndexByAliases(normalizedHeaders, ['vacaciones pendientes', 'saldo total vacaciones', 'saldo']),
    };

    const records = [];
    for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
        const row = rows[i];
        if (isRowEmpty(row)) continue;

        const employeeCode = idx.employee_code >= 0 ? normalizeEmployeeCode(row[idx.employee_code]) : '';
        const vacPending = idx.vac_pending >= 0 ? parseInteger(row[idx.vac_pending]) : null;

        const rawRecord = {
            employee_code: employeeCode,
            nss: idx.nss >= 0 ? String(row[idx.nss] == null ? '' : row[idx.nss]).trim() : '',
            name: idx.name >= 0 ? String(row[idx.name] == null ? '' : row[idx.name]).trim() : '',
            department: idx.department >= 0 ? String(row[idx.department] == null ? '' : row[idx.department]).trim() : '',
            status: idx.status >= 0 ? String(row[idx.status] == null ? '' : row[idx.status]).trim() : '',
            join_date: idx.join_date >= 0 ? parseExcelDate(row[idx.join_date]) : null,
            years_completed: idx.years_completed >= 0 ? parseInteger(row[idx.years_completed]) : null,
            days: idx.days >= 0 ? parseInteger(row[idx.days]) : null,
            vac_taken_before: idx.vac_taken_before >= 0 ? (parseInteger(row[idx.vac_taken_before]) || 0) : 0,
            vac_taken_card: idx.vac_taken_card >= 0 ? (parseInteger(row[idx.vac_taken_card]) || 0) : 0,
            vac_pending: vacPending,
            source_row: i + 1,
            source_format: 'tabular',
        };

        if (!rawRecord.employee_code && !rawRecord.name && rawRecord.vac_pending == null) {
            continue;
        }

        records.push(rawRecord);
    }

    return {
        format: 'tabular',
        records,
    };
}

function looksLikeEmployeeDataRow(row) {
    const employeeCode = normalizeEmployeeCode(row[0]);
    const name = String(row[2] == null ? '' : row[2]).trim();
    return !!employeeCode && !!name;
}

function cleanDepartmentLabel(value) {
    let cleaned = String(value == null ? '' : value).trim();
    cleaned = cleaned.replace(/^'+/, '').trim();
    cleaned = cleaned.replace(/^\d+\s+/, '').trim();
    return cleaned;
}

function parseContpaqiRows(rows) {
    const records = [];
    let currentDepartment = '';
    let foundData = false;

    for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        if (isRowEmpty(row)) continue;

        const firstCell = String(row[0] == null ? '' : row[0]).trim();

        if ((firstCell.startsWith("'") || /^\d+\s+/.test(firstCell)) && !looksLikeEmployeeDataRow(row)) {
            const possibleDepartment = cleanDepartmentLabel(firstCell);
            if (possibleDepartment && possibleDepartment.length > 2) {
                currentDepartment = possibleDepartment;
            }
            continue;
        }

        if (!looksLikeEmployeeDataRow(row)) {
            continue;
        }

        foundData = true;

        // Formato CONTPAQi oficial:
        // A = Codigo del Empleado
        // B = NSS
        // C = Nombre
        // D = Estado Actual
        // E = Fecha
        // F = Anos Comp.
        // G = Dias (dato propio del reporte, NO se usa como dias del periodo actual)
        // H = Vac. Tomadas antes de reg. empleado
        // I = Vac. Tomadas Tarjeta Vacaciones
        // J = Vacaciones Pendientes  <-- este es el saldo total oficial a importar
        records.push({
            employee_code: normalizeEmployeeCode(row[0]),
            nss: String(row[1] == null ? '' : row[1]).trim(),
            name: String(row[2] == null ? '' : row[2]).trim(),
            status: String(row[3] == null ? '' : row[3]).trim(),
            join_date: parseExcelDate(row[4]),
            years_completed: parseInteger(row[5]),
            days: null,
            vac_taken_before: parseInteger(row[7]) || 0,
            vac_taken_card: parseInteger(row[8]) || 0,
            vac_pending: parseInteger(row[9]),
            department: currentDepartment,
            source_row: i + 1,
            source_format: 'contpaqi',
        });
    }

    if (!foundData) {
        return null;
    }

    return {
        format: 'contpaqi',
        records,
    };
}

function parseVacationWorkbook(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: false, raw: false });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const tabular = parseTabularRows(rows);
    if (tabular) {
        return {
            sheet_name: sheetName,
            ...tabular,
        };
    }

    const contpaqi = parseContpaqiRows(rows);
    if (contpaqi) {
        return {
            sheet_name: sheetName,
            ...contpaqi,
        };
    }

    throw new Error('No se reconoció el formato del archivo. Usa un Excel exportado desde CONTPAQi o la plantilla estándar del sistema.');
}

async function query(sql, params = []) {
    const [rows] = await db.promise().query(sql, params);
    return rows;
}

async function getUserAccess(userId, role) {
    if (role === 'admin') {
        return { all_departments: true, departments: [] };
    }

    const users = await query('SELECT IFNULL(all_departments, 0) AS all_departments FROM users WHERE id = ? LIMIT 1', [userId]);
    if (users.length && Number(users[0].all_departments) === 1) {
        return { all_departments: true, departments: [] };
    }

    const departments = await query(
        `SELECT DISTINCT d.name
         FROM user_departments ud
         INNER JOIN departments d ON d.id = ud.department_id
         WHERE ud.user_id = ?
         ORDER BY d.name`,
        [userId]
    );

    return {
        all_departments: false,
        departments: departments.map((row) => row.name).filter(Boolean),
    };
}

function buildVacationWhereClause(filters, access) {
    const conditions = [];
    const params = [];

    if (!access.all_departments) {
        if (!access.departments.length) {
            conditions.push('1 = 0');
        } else {
            conditions.push(`p.department_name IN (${access.departments.map(() => '?').join(', ')})`);
            params.push(...access.departments);
        }
    }

    if (filters.department) {
        conditions.push('p.department_name = ?');
        params.push(filters.department);
    }

    if (filters.employee_code) {
        conditions.push('CAST(p.employee_number AS UNSIGNED) = ?');
        params.push(parseInt(filters.employee_code, 10));
    }

    if (filters.name) {
        conditions.push('p.full_name LIKE ?');
        params.push(`%${filters.name}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params };
}

async function getVacationRowsForUser(user, filters = {}) {
    const access = await getUserAccess(user.id, user.role);
    const sanitizedFilters = {
        department: String(filters.department || '').trim(),
        employee_code: normalizeEmployeeCode(filters.employee_code || ''),
        name: String(filters.name || '').trim(),
    };
    const { whereClause, params } = buildVacationWhereClause(sanitizedFilters, access);

    const rows = await query(
        `SELECT
            p.employee_number,
            p.full_name,
            p.department_name,
            p.start_date,
            p.fecha_reingreso,
            p.fecha_baja,
            p.nss,
            vb.employee_code AS imported_employee_code,
            vb.name AS imported_name,
            vb.department AS imported_department,
            vb.status AS imported_status,
            vb.join_date AS imported_join_date,
            vb.years_completed AS imported_years_completed,
            vb.days AS imported_days,
            vb.vac_taken_before,
            vb.vac_taken_card,
            vb.vac_pending,
            vb.updated_at AS balance_updated_at
         FROM personal p
         LEFT JOIN vacation_balances vb
            ON CAST(vb.employee_code AS UNSIGNED) = CAST(p.employee_number AS UNSIGNED)
         ${whereClause}
         ORDER BY p.department_name ASC, p.full_name ASC, p.employee_number ASC`,
        params
    );

    const data = rows.map((row) => {
        const effectiveDate = row.fecha_reingreso || row.start_date;
        const yearsCompleted = calculateCompletedYears(effectiveDate);
        const currentPeriodDays = computeCurrentPeriodDays(yearsCompleted);
        const totalRemaining = parseInteger(row.vac_pending) || 0;
        const pendingPreviousDays = Math.max(totalRemaining - currentPeriodDays, 0);

        return {
            employee_code: String(row.employee_number).padStart(5, '0'),
            employee_number: row.employee_number,
            name: row.full_name,
            department: row.department_name,
            join_date: row.start_date,
            reentry_date: row.fecha_reingreso,
            nss: row.nss || '',
            status: row.imported_status || (row.fecha_baja ? 'Baja' : 'Alta'),
            years_completed: yearsCompleted,
            imported_years_completed: row.imported_years_completed,
            current_period_days: currentPeriodDays,
            pending_previous_days: pendingPreviousDays,
            total_remaining_days: totalRemaining,
            vac_taken_before: parseInteger(row.vac_taken_before) || 0,
            vac_taken_card: parseInteger(row.vac_taken_card) || 0,
            imported_days: parseInteger(row.imported_days),
            balance_updated_at: row.balance_updated_at,
            source_balance_exists: row.vac_pending != null,
        };
    });

    return { access, filters: sanitizedFilters, data };
}

async function getPersonalMap() {
    const rows = await query(
        `SELECT employee_number, full_name, department_name, start_date, fecha_reingreso, nss
         FROM personal`
    );
    const map = new Map();
    rows.forEach((row) => {
        map.set(normalizeEmployeeCode(row.employee_number), row);
    });
    return map;
}

async function enrichImportedRecords(parsedRecords) {
    const personalMap = await getPersonalMap();

    const preview = [];
    let rejected = 0;
    let notFound = 0;
    let ready = 0;

    parsedRecords.forEach((record) => {
        const employeeCode = normalizeEmployeeCode(record.employee_code);
        const pendingTotal = parseInteger(record.vac_pending);
        const basePreview = {
            employee_code: employeeCode ? String(employeeCode).padStart(5, '0') : '',
            name: record.name || '',
            department: record.department || '',
            join_date: record.join_date || null,
            total_remaining_days: pendingTotal || 0,
            current_period_days: 0,
            pending_previous_days: 0,
            status: 'rechazado',
            message: '',
            source_row: record.source_row,
        };

        if (!employeeCode || pendingTotal == null) {
            rejected += 1;
            preview.push({
                ...basePreview,
                status: 'rechazado',
                message: 'Fila sin ID de empleado o saldo pendiente válido.',
            });
            return;
        }

        const personal = personalMap.get(employeeCode);
        if (!personal) {
            notFound += 1;
            preview.push({
                ...basePreview,
                status: 'no_encontrado',
                message: 'El empleado no existe en la tabla personal.',
            });
            return;
        }

        const effectiveDate = personal.fecha_reingreso || personal.start_date || record.join_date;
        const yearsCompleted = calculateCompletedYears(effectiveDate);
        const currentPeriodDays = computeCurrentPeriodDays(yearsCompleted);
        const pendingPreviousDays = Math.max((pendingTotal || 0) - currentPeriodDays, 0);

        ready += 1;
        preview.push({
            ...basePreview,
            name: personal.full_name || record.name || '',
            department: personal.department_name || record.department || '',
            join_date: personal.start_date || record.join_date || null,
            current_period_days: currentPeriodDays,
            pending_previous_days: pendingPreviousDays,
            status: 'listo',
            message: 'Registro listo para importar.',
            normalized_record: {
                employee_code: employeeCode,
                nss: record.nss || personal.nss || '',
                name: personal.full_name || record.name || '',
                department: personal.department_name || record.department || '',
                status: record.status || 'Alta',
                join_date: record.join_date || (personal.start_date ? new Date(personal.start_date).toISOString().slice(0, 10) : null),
                years_completed: record.years_completed != null ? record.years_completed : yearsCompleted,
                days: record.days,
                vac_taken_before: parseInteger(record.vac_taken_before) || 0,
                vac_taken_card: parseInteger(record.vac_taken_card) || 0,
                vac_pending: pendingTotal || 0,
                current_period_days: currentPeriodDays,
                pending_previous_days: pendingPreviousDays,
            },
        });
    });

    return {
        preview,
        summary: {
            total_read: parsedRecords.length,
            ready,
            rejected,
            not_found: notFound,
        },
    };
}

function sendWorkbook(res, workbook, filename) {
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
}

function buildDepuradoSheet(rows) {
    const sheetRows = [
        [
            'ID del empleado',
            'Nombre del empleado',
            'Departamento',
            'Fecha de ingreso',
            'Fecha de reingreso',
            'Días pendientes de periodos anteriores',
            'Días correspondientes al periodo en curso',
            'Total restante de vacaciones',
        ],
        ...rows.map((row) => [
            row.employee_code,
            row.name,
            row.department,
            formatDateDisplay(row.join_date),
            formatDateDisplay(row.reentry_date),
            row.pending_previous_days,
            row.current_period_days,
            row.total_remaining_days,
        ]),
    ];

    return xlsx.utils.aoa_to_sheet(sheetRows);
}

function buildCompaqStyleSheet(rows) {
    const sheetRows = [
        [
            'Sucursal',
            'Código del Empleado',
            'NSS',
            'Nombre',
            'Estado Actual',
            'Fecha',
            'Años Comp.',
            'Días',
            'Vac. Tomadas antes de reg. empleado',
            'Vac. Tomadas Tarjeta Vacaciones',
            'Vacaciones Pendientes',
        ],
        ...rows.map((row) => [
            row.department,
            row.employee_code,
            row.nss || '',
            row.name,
            row.status,
            formatDateDisplay(row.join_date),
            row.years_completed,
            row.current_period_days,
            row.vac_taken_before || 0,
            row.vac_taken_card || 0,
            row.total_remaining_days,
        ]),
    ];

    return xlsx.utils.aoa_to_sheet(sheetRows);
}

async function listVacations(req, res) {
    try {
        const payload = await getVacationRowsForUser(req.user, req.query);
        const departments = [...new Set(payload.data.map((row) => row.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
        res.json({
            data: payload.data,
            departments,
            filters: payload.filters,
            access: payload.access,
        });
    } catch (error) {
        console.error('Error al obtener vacaciones:', error);
        res.status(500).json({ error: 'No se pudo obtener la información del módulo de vacaciones.' });
    }
}

async function previewImport(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Selecciona un archivo Excel para la vista previa.' });
        }

        const parsed = parseVacationWorkbook(req.file.buffer);
        const enriched = await enrichImportedRecords(parsed.records);

        res.json({
            file_name: req.file.originalname,
            detected_format: parsed.format,
            sheet_name: parsed.sheet_name,
            summary: enriched.summary,
            preview: enriched.preview.slice(0, 25).map((row) => ({
                employee_code: row.employee_code,
                name: row.name,
                department: row.department,
                total_remaining_days: row.total_remaining_days,
                current_period_days: row.current_period_days,
                pending_previous_days: row.pending_previous_days,
                status: row.status,
                message: row.message,
                source_row: row.source_row,
            })),
        });
    } catch (error) {
        console.error('Error en vista previa de importación:', error);
        res.status(400).json({ error: error.message || 'No se pudo generar la vista previa del archivo.' });
    }
}

async function importVacations(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: 'Selecciona un archivo Excel para importar.' });
    }

    // Obtener una conexión dedicada desde el pool. Usamos getConnection() para poder
    // iniciar y gestionar transacciones (beginTransaction, commit, rollback). Si
    // usamos directamente db.promise() no disponemos de beginTransaction.
    const connection = await db.promise().getConnection();

    try {
        const parsed = parseVacationWorkbook(req.file.buffer);
        const enriched = await enrichImportedRecords(parsed.records);
        const readyRecords = enriched.preview
            .filter((row) => row.status === 'listo')
            .map((row) => row.normalized_record);

        let inserted = 0;
        let updated = 0;

        // Iniciar la transacción en la conexión obtenida
        await connection.beginTransaction();

        for (const record of readyRecords) {
            const existing = await connection.query(
                'SELECT id FROM vacation_balances WHERE employee_code = ? LIMIT 1',
                [record.employee_code]
            );

            if (existing[0].length) {
                updated += 1;
                await connection.query(
                    `UPDATE vacation_balances
                     SET nss = ?, name = ?, department = ?, status = ?, join_date = ?, years_completed = ?, days = ?, vac_taken_before = ?, vac_taken_card = ?, vac_pending = ?, current_period_days = ?, pending_previous_days = ?, updated_at = NOW()
                     WHERE employee_code = ?`,
                    [
                        record.nss,
                        record.name,
                        record.department,
                        record.status,
                        record.join_date,
                        record.years_completed,
                        record.days,
                        record.vac_taken_before,
                        record.vac_taken_card,
                        record.vac_pending,
                        record.current_period_days,
                        record.pending_previous_days,
                        record.employee_code,
                    ]
                );
            } else {
                inserted += 1;
                await connection.query(
                    `INSERT INTO vacation_balances
                     (employee_code, nss, name, department, status, join_date, years_completed, days, vac_taken_before, vac_taken_card, vac_pending, current_period_days, pending_previous_days, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [
                        record.employee_code,
                        record.nss,
                        record.name,
                        record.department,
                        record.status,
                        record.join_date,
                        record.years_completed,
                        record.days,
                        record.vac_taken_before,
                        record.vac_taken_card,
                        record.vac_pending,
                        record.current_period_days,
                        record.pending_previous_days,
                    ]
                );
            }
        }

        await connection.query(
            `INSERT INTO vacation_import_logs
             (imported_by, file_name, imported_at, total_records, inserted_records, updated_records, error_records)
             VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
            [
                req.user.id,
                req.file.originalname,
                enriched.summary.total_read,
                inserted,
                updated,
                enriched.summary.rejected + enriched.summary.not_found,
            ]
        );

        await connection.commit();
        // Liberar la conexión de vuelta al pool
        connection.release();

        res.json({
            message: 'Importación de vacaciones completada correctamente.',
            detected_format: parsed.format,
            summary: {
                total_read: enriched.summary.total_read,
                inserted,
                updated,
                rejected: enriched.summary.rejected,
                not_found: enriched.summary.not_found,
                imported: readyRecords.length,
            },
        });
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error('Error al revertir importación de vacaciones:', rollbackError);
        }
        // Asegurarnos de liberar la conexión incluso si hay un error
        try {
            connection.release();
        } catch (releaseError) {
            console.error('Error al liberar la conexión tras fallo en importación:', releaseError);
        }
        console.error('Error al importar vacaciones:', error);
        res.status(400).json({ error: error.message || 'No se pudo importar el archivo de vacaciones.' });
    }
}

async function downloadTemplate(req, res) {
    try {
        const workbook = xlsx.utils.book_new();
        const templateSheet = xlsx.utils.aoa_to_sheet([
            ['Sucursal', 'Código del Empleado', 'Nombre', 'Fecha', 'Años Comp.', 'Vacaciones Pendientes'],
            ['Administración', '00001', 'NOMBRE DE EJEMPLO', '01/01/2024', 1, 6],
        ]);
        const instructionsSheet = xlsx.utils.aoa_to_sheet([
            ['Instrucciones'],
            ['1. No cambies los encabezados de la primera hoja.'],
            ['2. El ID del empleado debe existir en la tabla personal del sistema.'],
            ['3. El campo Vacaciones Pendientes representa el saldo total restante cargado desde RH/CONTPAQi.'],
            ['4. El sistema calculará automáticamente los días del periodo en curso y los pendientes de periodos anteriores.'],
        ]);
        xlsx.utils.book_append_sheet(workbook, templateSheet, 'Plantilla');
        xlsx.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');
        sendWorkbook(res, workbook, 'vacaciones_plantilla_1_8.xlsx');
    } catch (error) {
        console.error('Error al generar plantilla de vacaciones:', error);
        res.status(500).json({ error: 'No se pudo generar la plantilla de vacaciones.' });
    }
}

async function exportVacations(req, res) {
    try {
        const format = String(req.query.format || 'depurado').toLowerCase();
        if (format === 'compaq' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden exportar el reporte estilo CONTPAQi.' });
        }

        const payload = await getVacationRowsForUser(req.user, req.query);
        const workbook = xlsx.utils.book_new();
        if (format === 'compaq') {
            xlsx.utils.book_append_sheet(workbook, buildCompaqStyleSheet(payload.data), 'Vacaciones Compaq');
            return sendWorkbook(res, workbook, 'vacaciones_reporte_compaq_1_8.xlsx');
        }

        xlsx.utils.book_append_sheet(workbook, buildDepuradoSheet(payload.data), 'Vacaciones');
        return sendWorkbook(res, workbook, 'vacaciones_reporte_depurado_1_8.xlsx');
    } catch (error) {
        console.error('Error al exportar vacaciones:', error);
        res.status(500).json({ error: 'No se pudo exportar el reporte de vacaciones.' });
    }
}

async function getImportLogs(req, res) {
    try {
        const rows = await query(
            `SELECT vil.id, vil.file_name, vil.imported_at, vil.total_records, vil.inserted_records, vil.updated_records, vil.error_records,
                    u.username, u.full_name
             FROM vacation_import_logs vil
             LEFT JOIN users u ON u.id = vil.imported_by
             ORDER BY vil.imported_at DESC
             LIMIT 50`
        );
        res.json({ data: rows });
    } catch (error) {
        console.error('Error al obtener bitácora de vacaciones:', error);
        res.status(500).json({ error: 'No se pudo obtener la bitácora de importaciones.' });
    }
}

module.exports = {
    listVacations,
    previewImport,
    importVacations,
    downloadTemplate,
    exportVacations,
    getImportLogs,
    computeCurrentPeriodDays,
    formatDateDisplay,
    parseVacationWorkbook,
    enrichImportedRecords,
};
