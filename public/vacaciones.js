const vacationState = {
    session: null,
    rows: [],
    departments: [],
    preview: null,
    logsVisible: false,
    // Copias de los datos brutos devueltos por el servidor. Se usan para volver a aplicar filtros
    // (por ejemplo, mostrar/ocultar empleados en BAJA) sin tener que solicitar de nuevo los datos.
    rawRows: [],
    rawDepartments: [],
};

function getToken() {
    return localStorage.getItem('token');
}

async function apiRequest(url, options = {}) {
    const token = getToken();
    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
    };

    if (!(options.body instanceof FormData) && options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    const contentType = response.headers.get('content-type') || '';
    let payload;
    if (contentType.includes('application/json')) {
        payload = await response.json();
    } else {
        payload = await response.blob();
    }

    if (!response.ok) {
        const message = payload && payload.error ? payload.error : 'Ocurrió un error al procesar la solicitud.';
        throw new Error(message);
    }

    return payload;
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${minute}`;
}

function setFeedback(message, type = 'info') {
    const box = document.getElementById('import-feedback');
    box.textContent = message || '';
    box.className = `vac18-feedback ${type}`;
}

function toggleSystemAdminLink(role) {
    const link = document.getElementById('system-admin-link');
    if (link) {
        link.style.display = role === 'admin' ? 'inline-flex' : 'none';
    }
}

function updateAccessSummary() {
    if (!vacationState.session) return;
    const label = document.getElementById('vac18-access-summary');
    const { role, all_departments: allDepartments, departments = [] } = vacationState.session;

    if (role === 'admin' || allDepartments) {
        label.textContent = 'Acceso: todos los departamentos';
        return;
    }

    if (!departments.length) {
        label.textContent = 'Acceso: sin departamentos asignados';
        return;
    }

    label.textContent = `Acceso: ${departments.length} departamento(s)`;
}

function updateVisibleCount() {
    const label = document.getElementById('vac18-visible-count');
    label.textContent = `${vacationState.rows.length} empleado(s) visibles`;
}

/**
 * Aplica el filtro de empleados dados de baja según el estado del checkbox
 * y actualiza el estado de filas y departamentos visibles. Se invoca después
 * de cargar datos desde el servidor o al cambiar el checkbox.
 */
function applyFiltersAndRender() {
    // Determinar si el usuario quiere incluir a empleados dados de baja.
    const checkbox = document.getElementById('show-baja-checkbox');
    const includeBaja = checkbox && checkbox.checked;

    let rows = vacationState.rawRows.slice();
    let departments = vacationState.rawDepartments.slice();

    // Filtrar empleados cuyo departamento (o estatus) sea 'baja' (ignorando mayúsculas/minúsculas).
    if (!includeBaja) {
        rows = rows.filter((row) => {
            const dep = String(row.department || '').trim().toLowerCase();
            return dep !== 'baja';
        });
        departments = departments.filter((d) => {
            return String(d || '').trim().toLowerCase() !== 'baja';
        });
    }

    vacationState.rows = rows;
    vacationState.departments = departments;

    populateDepartments(departments);
    renderVacationRows(rows);
    updateVisibleCount();
}

function getCurrentFilters() {
    return {
        department: document.getElementById('filter-department').value.trim(),
        employee_code: document.getElementById('filter-employee').value.trim(),
        name: document.getElementById('filter-name').value.trim(),
    };
}

function buildQueryString(filters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) {
            params.set(key, value);
        }
    });
    return params.toString();
}

function populateDepartments(departments) {
    const select = document.getElementById('filter-department');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Todos los departamentos</option>';

    const values = currentValue && !departments.includes(currentValue)
        ? [currentValue, ...departments]
        : [...departments];

    [...new Set(values)].forEach((department) => {
        const option = document.createElement('option');
        option.value = department;
        option.textContent = department;
        select.appendChild(option);
    });

    if (currentValue) {
        select.value = currentValue;
    }
}

function renderVacationRows(rows) {
    // Contenedor de tarjetas para la interfaz renovada (v1.93)
    const cardsContainer = document.getElementById('vacation-cards-container');
    if (cardsContainer) {
        cardsContainer.innerHTML = '';
    }
    // También limpiamos la tabla oculta para evitar residuos en caso de que se reutilice para exportaciones.
    const tbody = document.querySelector('#vacation-table tbody');
    if (tbody) {
        tbody.innerHTML = '';
    }

    rows.forEach((row) => {
        // Rellenamos la tabla oculta si está presente (por compatibilidad con funciones existentes)
        if (tbody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(row.employee_code)}</td>
                <td>${escapeHtml(row.name)}</td>
                <td>${escapeHtml(row.department || '')}</td>
                <td>${escapeHtml(formatDate(row.join_date))}</td>
                <td>${escapeHtml(formatDate(row.reentry_date))}</td>
                <td>${escapeHtml(row.pending_previous_days)}</td>
                <td>${escapeHtml(row.current_period_days)}</td>
                <td>${escapeHtml(row.total_remaining_days)}</td>
                <td>
                    <div class="vac18-row-actions">
                        <button type="button" class="secondary small" data-action="excel" data-employee="${row.employee_number}">Excel</button>
                        <button type="button" class="secondary small" data-action="pdf" data-employee="${row.employee_number}">PDF</button>
                        <button type="button" class="secondary small" data-action="print" data-employee="${row.employee_number}">Imprimir</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        }

        // Construir tarjeta para la nueva visualización
        if (cardsContainer) {
            const card = document.createElement('div');
            card.classList.add('vacation-card');
            card.innerHTML = `
                <div class="vacation-card-header">
                    <span class="employee-id">${escapeHtml(row.employee_code)}</span>
                    <span class="employee-name">${escapeHtml(row.name)}</span>
                    <span class="employee-department">${escapeHtml(row.department || '')}</span>
                </div>
                <div class="vacation-card-body">
                    <div class="vacation-card-field">
                        <span class="label">Fecha ingreso</span>
                        <span class="value">${escapeHtml(formatDate(row.join_date)) || '-'}</span>
                    </div>
                    <div class="vacation-card-field">
                        <span class="label">Fecha reingreso</span>
                        <span class="value">${escapeHtml(formatDate(row.reentry_date)) || '-'}</span>
                    </div>
                    <div class="vacation-card-field">
                        <span class="label">Pendientes anteriores</span>
                        <span class="value">${escapeHtml(row.pending_previous_days)}</span>
                    </div>
                    <div class="vacation-card-field">
                        <span class="label">Periodo actual</span>
                        <span class="value">${escapeHtml(row.current_period_days)}</span>
                    </div>
                    <div class="vacation-card-field">
                        <span class="label">Total restante</span>
                        <span class="value">${escapeHtml(row.total_remaining_days)}</span>
                    </div>
                </div>
                <div class="vacation-card-actions vac18-row-actions">
                    <button type="button" class="secondary small" data-action="excel" data-employee="${row.employee_number}">Excel</button>
                    <button type="button" class="secondary small" data-action="pdf" data-employee="${row.employee_number}">PDF</button>
                    <button type="button" class="secondary small" data-action="print" data-employee="${row.employee_number}">Imprimir</button>
                </div>
            `;
            cardsContainer.appendChild(card);
        }
    });

    document.getElementById('vacation-empty-state').hidden = rows.length > 0;
}

function renderPreview(previewResponse) {
    vacationState.preview = previewResponse;
    const panel = document.getElementById('preview-panel');
    const summary = document.getElementById('preview-summary');
    const tbody = document.querySelector('#preview-table tbody');

    const { total_read: totalRead, ready, rejected, not_found: notFound } = previewResponse.summary;
    summary.innerHTML = `
        <span class="vac18-chip">Formato detectado: ${escapeHtml(previewResponse.detected_format)}</span>
        <span class="vac18-chip">Leídos: ${totalRead}</span>
        <span class="vac18-chip success">Listos: ${ready}</span>
        <span class="vac18-chip warning">No encontrados: ${notFound}</span>
        <span class="vac18-chip danger">Rechazados: ${rejected}</span>
    `;

    tbody.innerHTML = '';
    previewResponse.preview.forEach((row) => {
        const statusClass = row.status === 'listo' ? 'success' : (row.status === 'no_encontrado' ? 'warning' : 'danger');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.source_row}</td>
            <td>${escapeHtml(row.employee_code)}</td>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.department)}</td>
            <td>${escapeHtml(row.total_remaining_days)}</td>
            <td>${escapeHtml(row.current_period_days)}</td>
            <td>${escapeHtml(row.pending_previous_days)}</td>
            <td><span class="vac18-chip ${statusClass}">${escapeHtml(row.status.replace('_', ' '))}</span></td>
            <td>${escapeHtml(row.message)}</td>
        `;
        tbody.appendChild(tr);
    });

    panel.hidden = false;
    document.getElementById('btn-confirm-import').disabled = ready === 0;
}

function renderLogs(logs) {
    const tbody = document.querySelector('#logs-table tbody');
    tbody.innerHTML = '';

    logs.forEach((row) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(formatDateTime(row.imported_at))}</td>
            <td>${escapeHtml(row.file_name)}</td>
            <td>${escapeHtml(row.full_name || row.username || '')}</td>
            <td>${escapeHtml(row.total_records)}</td>
            <td>${escapeHtml(row.inserted_records)}</td>
            <td>${escapeHtml(row.updated_records)}</td>
            <td>${escapeHtml(row.error_records)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function getRowByEmployee(employeeNumber) {
    return vacationState.rows.find((row) => String(row.employee_number) === String(employeeNumber));
}

function buildReportRows(rows) {
    return rows.map((row) => [
        row.employee_code,
        row.name,
        row.department || '',
        formatDate(row.join_date),
        formatDate(row.reentry_date),
        row.pending_previous_days,
        row.current_period_days,
        row.total_remaining_days,
    ]);
}

function exportRowsToExcel(rows, filename) {
    const data = [
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
        ...buildReportRows(rows),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vacaciones');
    XLSX.writeFile(workbook, filename);
}

function exportRowsToPdf(rows, title) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.autoTable({
        startY: 22,
        head: [[
            'ID',
            'Nombre',
            'Departamento',
            'Ingreso',
            'Reingreso',
            'Pend. Anterior',
            'Periodo Actual',
            'Total Restante',
        ]],
        body: buildReportRows(rows),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [57, 98, 153] },
    });
    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

function printRows(rows, title) {
    const printable = window.open('', '_blank');
    const tableRows = buildReportRows(rows)
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
        .join('');

    printable.document.write(`
        <html>
            <head>
                <title>${escapeHtml(title)}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 24px; }
                    h1 { margin-bottom: 16px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; text-align: left; }
                    th { background: #f1f5f9; }
                </style>
            </head>
            <body>
                <h1>${escapeHtml(title)}</h1>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Departamento</th>
                            <th>Fecha de ingreso</th>
                            <th>Fecha de reingreso</th>
                            <th>Días pendientes de periodos anteriores</th>
                            <th>Días correspondientes al periodo en curso</th>
                            <th>Total restante de vacaciones</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </body>
        </html>
    `);
    printable.document.close();
    printable.focus();
    printable.print();
}

async function downloadAuthenticated(url, filenameHint) {
    const blob = await apiRequest(url, { method: 'GET' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filenameHint || 'archivo.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
}

async function loadVacations() {
    const filters = getCurrentFilters();
    const queryString = buildQueryString(filters);
    const url = queryString ? `/api/vacations?${queryString}` : '/api/vacations';

    const response = await apiRequest(url, { method: 'GET' });
    // Guardar los datos completos y los departamentos originales para permitir aplicar filtros locales.
    vacationState.rawRows = response.data || [];
    vacationState.rawDepartments = response.departments || [];
    // Aplicar filtros locales (por ejemplo ocultar empleados en BAJA) y renderizar.
    applyFiltersAndRender();
}

async function loadImportLogs() {
    const response = await apiRequest('/api/vacations/import-logs', { method: 'GET' });
    renderLogs(response.data || []);
}

async function initializePage() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const session = await apiRequest('/dashboard', { method: 'GET' });
        vacationState.session = session;

        document.getElementById('username').textContent = session.username || '';
        document.getElementById('full-name').textContent = session.full_name || '';
        document.getElementById('user-role').textContent = session.role || '';
        document.getElementById('version-label').textContent = `Versión ${session.version || '1.8'}`;
        toggleSystemAdminLink(session.role);
        updateAccessSummary();

        if (session.role === 'admin') {
            document.getElementById('admin-panel').hidden = false;
        }

        await loadVacations();

        // Suscribirse al cambio del checkbox para incluir/excluir empleados en BAJA.
        const bajaCheckbox = document.getElementById('show-baja-checkbox');
        if (bajaCheckbox) {
            bajaCheckbox.addEventListener('change', () => {
                applyFiltersAndRender();
            });
        }
    } catch (error) {
        alert(error.message || 'No se pudo cargar la sesión actual.');
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    }
}

async function handlePreviewImport() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];
    if (!file) {
        setFeedback('Selecciona un archivo antes de generar la vista previa.', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setFeedback('Generando vista previa...', 'info');

    try {
        const response = await apiRequest('/api/vacations/preview-import', {
            method: 'POST',
            body: formData,
        });
        renderPreview(response);
        setFeedback(`Vista previa lista. Formato detectado: ${response.detected_format}.`, 'success');
    } catch (error) {
        document.getElementById('preview-panel').hidden = true;
        document.getElementById('btn-confirm-import').disabled = true;
        setFeedback(error.message, 'danger');
    }
}

async function handleConfirmImport() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];
    if (!file) {
        setFeedback('Selecciona un archivo antes de importar.', 'warning');
        return;
    }

    const confirmed = window.confirm('Se actualizarán masivamente los saldos de vacaciones con base en el archivo seleccionado. ¿Deseas continuar?');
    if (!confirmed) {
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setFeedback('Importando archivo...', 'info');

    try {
        const response = await apiRequest('/api/vacations/import', {
            method: 'POST',
            body: formData,
        });

        const { summary } = response;
        setFeedback(
            `Importación completada. Importados: ${summary.imported}. Insertados: ${summary.inserted}. Actualizados: ${summary.updated}. No encontrados: ${summary.not_found}. Rechazados: ${summary.rejected}.`,
            'success'
        );
        document.getElementById('preview-panel').hidden = true;
        document.getElementById('btn-confirm-import').disabled = true;
        fileInput.value = '';
        vacationState.preview = null;
        await loadVacations();
        if (vacationState.logsVisible) {
            await loadImportLogs();
        }
    } catch (error) {
        setFeedback(error.message, 'danger');
    }
}

function attachEvents() {
    document.getElementById('btn-search').addEventListener('click', () => loadVacations().catch((error) => alert(error.message)));
    document.getElementById('btn-clear').addEventListener('click', async () => {
        document.getElementById('filter-department').value = '';
        document.getElementById('filter-employee').value = '';
        document.getElementById('filter-name').value = '';
        await loadVacations();
    });

    document.getElementById('filter-employee').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            loadVacations().catch((error) => alert(error.message));
        }
    });
    document.getElementById('filter-name').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            loadVacations().catch((error) => alert(error.message));
        }
    });

    document.getElementById('btn-export-excel').addEventListener('click', () => {
        exportRowsToExcel(vacationState.rows, 'vacaciones_visibles_1_8.xlsx');
    });
    document.getElementById('btn-export-pdf').addEventListener('click', () => {
        exportRowsToPdf(vacationState.rows, 'Reporte de vacaciones');
    });
    document.getElementById('btn-print').addEventListener('click', () => {
        printRows(vacationState.rows, 'Reporte de vacaciones');
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });

    const tableBody = document.querySelector('#vacation-table tbody');
    tableBody.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const employeeNumber = button.dataset.employee;
        const row = getRowByEmployee(employeeNumber);
        if (!row) return;

        if (button.dataset.action === 'excel') {
            exportRowsToExcel([row], `vacaciones_${row.employee_code}.xlsx`);
        }
        if (button.dataset.action === 'pdf') {
            exportRowsToPdf([row], `Vacaciones ${row.employee_code}`);
        }
        if (button.dataset.action === 'print') {
            printRows([row], `Vacaciones ${row.employee_code}`);
        }
    });

    // También asignamos las acciones de exportar/descargar/imprimir a las tarjetas de empleados.
    const cardsContainer = document.getElementById('vacation-cards-container');
    if (cardsContainer) {
        cardsContainer.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            const employeeNumber = button.dataset.employee;
            const row = getRowByEmployee(employeeNumber);
            if (!row) return;
            if (button.dataset.action === 'excel') {
                exportRowsToExcel([row], `vacaciones_${row.employee_code}.xlsx`);
            }
            if (button.dataset.action === 'pdf') {
                exportRowsToPdf([row], `Vacaciones ${row.employee_code}`);
            }
            if (button.dataset.action === 'print') {
                printRows([row], `Vacaciones ${row.employee_code}`);
            }
        });
    }

    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        document.getElementById('btn-preview-import').addEventListener('click', handlePreviewImport);
        document.getElementById('btn-confirm-import').addEventListener('click', handleConfirmImport);
        document.getElementById('btn-download-template').addEventListener('click', () => {
            downloadAuthenticated('/api/vacations/template', 'vacaciones_plantilla_1_8.xlsx').catch((error) => setFeedback(error.message, 'danger'));
        });
        document.getElementById('btn-export-compaq').addEventListener('click', () => {
            const query = buildQueryString({ ...getCurrentFilters(), format: 'compaq' });
            downloadAuthenticated(`/api/vacations/export?${query}`, 'vacaciones_reporte_compaq_1_8.xlsx').catch((error) => setFeedback(error.message, 'danger'));
        });
        document.getElementById('btn-export-depurado-server').addEventListener('click', () => {
            const query = buildQueryString({ ...getCurrentFilters(), format: 'depurado' });
            downloadAuthenticated(`/api/vacations/export?${query}`, 'vacaciones_reporte_depurado_1_8.xlsx').catch((error) => setFeedback(error.message, 'danger'));
        });
        document.getElementById('btn-toggle-logs').addEventListener('click', async () => {
            const panel = document.getElementById('logs-panel');
            vacationState.logsVisible = !panel.hidden;
            if (panel.hidden) {
                await loadImportLogs();
                panel.hidden = false;
                vacationState.logsVisible = true;
            } else {
                panel.hidden = true;
                vacationState.logsVisible = false;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    attachEvents();
    initializePage();
});
