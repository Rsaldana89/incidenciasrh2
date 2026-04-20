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
    assets: {
        logoDataUrl: '',
    },
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


function triggerBrowserDownload(url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function openPdfPrintPreview(pdfUrl, title = 'Formato de vacaciones') {
    const previewUrl = `print-preview.html?file=${encodeURIComponent(pdfUrl)}&title=${encodeURIComponent(title)}`;
    window.open(previewUrl, '_blank', 'noopener');
}

function openHtmlPrintPreview(html, title = 'Vista previa de impresión') {
    const storageKey = `print-preview-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(storageKey, html);
    const previewUrl = `print-preview.html?mode=html&storageKey=${encodeURIComponent(storageKey)}&title=${encodeURIComponent(title)}`;
    window.location.href = previewUrl;
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


const VACATION_FORM_CONSTANTS = {
    templateDateLabel: 'dic-22',
    humanCapitalName: 'MENDOZA ROMERO ANDRES',
    humanCapitalRole: 'Capital Humano',
    disclaimerLine1: 'Por el presente expreso mi conformidad de solicitar y gozar de mis vacaciones de acuerdo a lo que establece el artículo 76 de la Ley Federal del Trabajo, considerando los datos asentados en el presente formato. De conformidad con el artículo 81 de la LFT, se extiende constancia de antigüedad y periodo vacacional.',
    disclaimerLine2: 'Por medio del presente expreso que gocé mis vacaciones conforme a la solicitud realizada.',
};

function normalizeUpperText(value) {
    return String(value == null ? '' : value).trim().toUpperCase();
}

function formatSeniorityYears(years) {
    const normalized = Number.isFinite(Number(years)) ? Math.max(parseInt(years, 10), 0) : 0;
    return normalized === 1 ? '1 AÑO' : `${normalized} AÑOS`;
}

function getEffectiveJoinDate(row) {
    return row.reentry_date || row.join_date || '';
}

function getVacationRequestFormData(row) {
    const employeeCode = row.employee_code || String(row.employee_number || '').padStart(5, '0');
    return {
        employeeCode,
        department: normalizeUpperText(row.department || ''),
        currentDate: formatDate(new Date()),
        name: normalizeUpperText(row.name || ''),
        position: normalizeUpperText(row.position || ''),
        seniority: formatSeniorityYears(row.years_completed),
        joinDate: formatDate(getEffectiveJoinDate(row)),
        applicantName: normalizeUpperText(row.name || ''),
        humanCapitalName: VACATION_FORM_CONSTANTS.humanCapitalName,
        humanCapitalRole: VACATION_FORM_CONSTANTS.humanCapitalRole,
        templateDateLabel: VACATION_FORM_CONSTANTS.templateDateLabel,
    };
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('No se pudo convertir el archivo a base64.'));
        reader.readAsDataURL(blob);
    });
}

async function ensureVacationFormAssets() {
    if (vacationState.assets.logoDataUrl) {
        return vacationState.assets;
    }

    try {
        const response = await fetch('Logoheader.png');
        if (!response.ok) {
            throw new Error('No se pudo cargar el logotipo del formato.');
        }
        const blob = await response.blob();
        vacationState.assets.logoDataUrl = await blobToDataUrl(blob);
    } catch (error) {
        console.warn('No se pudo precargar el logotipo del formato de vacaciones:', error);
        vacationState.assets.logoDataUrl = '';
    }

    return vacationState.assets;
}

function downloadBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function buildVacationRequestSectionHtml(formData, logoDataUrl) {
    const logoMarkup = logoDataUrl
        ? `<img src="${logoDataUrl}" alt="Hermanos Coronel" class="vac-form-logo-image">`
        : '<div class="vac-form-logo-text">Hermanos Coronel<br><span>Cremería</span></div>';

    return `
        <section class="vac-form-sheet">
            <table class="vac-form-table vac-form-header-table">
                <tr>
                    <td class="vac-form-logo-cell">${logoMarkup}</td>
                    <td class="vac-form-title-cell">
                        <table class="vac-form-table vac-form-table-nested vac-form-title-table">
                            <tr><td class="vac-form-yellow vac-form-center vac-form-strong">FORMATO</td></tr>
                            <tr><td class="vac-form-center vac-form-strong vac-form-title-main">Solicitud de Vacaciones</td></tr>
                        </table>
                    </td>
                    <td class="vac-form-meta-cell">
                        <table class="vac-form-table vac-form-table-nested vac-form-meta-table">
                            <tr><td class="vac-form-meta-label">Código:</td><td class="vac-form-center">CH.FO.012</td></tr>
                            <tr><td class="vac-form-meta-label">Revisión:</td><td class="vac-form-center">2</td></tr>
                            <tr><td class="vac-form-meta-label">Fecha:</td><td class="vac-form-center">${escapeHtml(formData.templateDateLabel)}</td></tr>
                            <tr><td class="vac-form-meta-label">Página:</td><td class="vac-form-center">1 de 1</td></tr>
                        </table>
                    </td>
                </tr>
            </table>

            <table class="vac-form-table vac-form-main-table vac-form-area-table">
                <tr>
                    <td class="vac-form-yellow vac-form-field-label vac-form-field-short">ÁREA/SUCURSAL</td>
                    <td class="vac-form-field-value vac-form-field-medium">${escapeHtml(formData.department)}</td>
                    <td class="vac-form-yellow vac-form-field-label vac-form-field-short">FECHA D/M/A:</td>
                    <td class="vac-form-field-value">${escapeHtml(formData.currentDate)}</td>
                </tr>
            </table>

            <table class="vac-form-table vac-form-main-table vac-form-personal-table">
                <tr><td class="vac-form-yellow vac-form-field-label">NUMERO DE EMPLEADO:</td><td class="vac-form-field-value">${escapeHtml(formData.employeeCode)}</td></tr>
                <tr><td class="vac-form-yellow vac-form-field-label">NOMBRE:</td><td class="vac-form-field-value">${escapeHtml(formData.name)}</td></tr>
                <tr><td class="vac-form-yellow vac-form-field-label">PUESTO:</td><td class="vac-form-field-value">${escapeHtml(formData.position)}</td></tr>
                <tr><td class="vac-form-yellow vac-form-field-label">ANTIGÜEDAD (AÑOS):</td><td class="vac-form-field-value">${escapeHtml(formData.seniority)}</td></tr>
                <tr><td class="vac-form-yellow vac-form-field-label">FECHA DE INGRESO:</td><td class="vac-form-field-value">${escapeHtml(formData.joinDate)}</td></tr>
                <tr><td class="vac-form-yellow vac-form-field-label">NOMBRE JEFE INMEDIATO:</td><td class="vac-form-field-value"></td></tr>
                <tr><td class="vac-form-yellow vac-form-field-label">PUESTO JEFE INMEDIATO:</td><td class="vac-form-field-value"></td></tr>
            </table>

            <table class="vac-form-table vac-form-main-table vac-form-dates-table">
                <tr><td class="vac-form-yellow vac-form-field-label">FECHA INICIO DE VACACIONES:</td><td class="vac-form-field-value"></td></tr>
                <tr><td class="vac-form-yellow vac-form-field-label">FECHA TERMINO DE VACACIONES:</td><td class="vac-form-field-value"></td></tr>
                <tr><td class="vac-form-yellow vac-form-field-label">FECHA QUE ME PRESENTO A TRABAJAR:</td><td class="vac-form-field-value"></td></tr>
            </table>

            <table class="vac-form-table vac-form-balance-table">
                <tr>
                    <th>DIAS PENDIENTES POR TOMAR</th>
                    <th>DÍAS A TOMAR COMO VACACIONES</th>
                    <th>SALDO</th>
                </tr>
                <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            </table>

            <p class="vac-form-disclaimer">${escapeHtml(VACATION_FORM_CONSTANTS.disclaimerLine1)}</p>
            <p class="vac-form-disclaimer vac-form-disclaimer-secondary">${escapeHtml(VACATION_FORM_CONSTANTS.disclaimerLine2)}</p>

            <table class="vac-form-signature-table">
                <tr>
                    <td>
                        <div class="vac-form-signature-line">${escapeHtml(formData.applicantName)}</div>
                        <div class="vac-form-signature-role">Solicitante</div>
                    </td>
                    <td>
                        <div class="vac-form-signature-line"></div>
                        <div class="vac-form-signature-role">Jefe Directo</div>
                    </td>
                    <td>
                        <div class="vac-form-signature-line">${escapeHtml(formData.humanCapitalName)}</div>
                        <div class="vac-form-signature-role">${escapeHtml(formData.humanCapitalRole)}</div>
                    </td>
                </tr>
            </table>
        </section>
    `;
}

function buildVacationRequestHtmlDocument(row, logoDataUrl) {
    const formData = getVacationRequestFormData(row);
    const formMarkup = [1, 2]
        .map(() => buildVacationRequestSectionHtml(formData, logoDataUrl))
        .join('');

    return `
        <!DOCTYPE html>
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" lang="es">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="ProgId" content="Excel.Sheet">
            <title>Formato de solicitud de vacaciones ${escapeHtml(formData.employeeCode)}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    color: #000;
                    margin: 0;
                    padding: 12px;
                    background: #fff;
                }
                .vac-form-sheet {
                    width: 930px;
                    margin: 0 auto 20px;
                }
                .vac-form-table {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                }
                .vac-form-table td,
                .vac-form-table th {
                    border: 2px solid #000;
                    padding: 4px 6px;
                    font-size: 14px;
                    vertical-align: middle;
                }
                .vac-form-table-nested td,
                .vac-form-table-nested th {
                    border-width: 2px;
                }
                .vac-form-header-table {
                    margin-bottom: 14px;
                }
                .vac-form-logo-cell {
                    width: 235px;
                    text-align: center;
                    padding: 10px;
                }
                .vac-form-logo-image {
                    max-width: 100%;
                    max-height: 76px;
                    display: block;
                    margin: 0 auto;
                }
                .vac-form-logo-text {
                    color: #8a1f1f;
                    font-size: 34px;
                    font-weight: 700;
                    line-height: 1;
                    text-align: center;
                }
                .vac-form-logo-text span {
                    color: #8a1f1f;
                    font-size: 22px;
                }
                .vac-form-title-cell {
                    width: 390px;
                    padding: 0;
                }
                .vac-form-meta-cell {
                    width: 255px;
                    padding: 0;
                }
                .vac-form-title-table td {
                    height: 34px;
                }
                .vac-form-title-main {
                    font-size: 18px;
                }
                .vac-form-yellow {
                    background: #e6c948;
                }
                .vac-form-center {
                    text-align: center;
                }
                .vac-form-strong,
                .vac-form-field-label,
                .vac-form-meta-label,
                .vac-form-balance-table th {
                    font-weight: 700;
                }
                .vac-form-meta-label {
                    width: 42%;
                }
                .vac-form-area-table,
                .vac-form-personal-table,
                .vac-form-dates-table {
                    margin-bottom: 14px;
                }
                .vac-form-field-label {
                    width: 29%;
                }
                .vac-form-field-short {
                    width: 27%;
                }
                .vac-form-field-medium {
                    width: 18%;
                }
                .vac-form-field-value {
                    height: 30px;
                }
                .vac-form-balance-table {
                    width: 56%;
                    margin: 10px auto 18px;
                }
                .vac-form-balance-table th,
                .vac-form-balance-table td {
                    text-align: center;
                    height: 28px;
                }
                .vac-form-disclaimer {
                    font-size: 12px;
                    text-align: center;
                    line-height: 1.4;
                    margin: 18px 42px 0;
                }
                .vac-form-disclaimer-secondary {
                    margin-top: 12px;
                }
                .vac-form-signature-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    margin-top: 26px;
                }
                .vac-form-signature-table td {
                    border: none;
                    width: 33.33%;
                    text-align: center;
                    padding: 0 12px;
                }
                .vac-form-signature-line {
                    border-top: 2px solid #000;
                    min-height: 18px;
                    padding-top: 6px;
                    font-size: 12px;
                }
                .vac-form-signature-role {
                    font-size: 12px;
                    margin-top: 4px;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    .vac-form-sheet {
                        page-break-after: avoid;
                        margin-bottom: 18px;
                    }
                }
            </style>
        </head>
        <body>${formMarkup}</body>
        </html>
    `;
}


function escapeXml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildVacationRequestSpreadsheetXml(row) {
    const formData = getVacationRequestFormData(row);
    const disclaimer1 = VACATION_FORM_CONSTANTS.disclaimerLine1;
    const disclaimer2 = VACATION_FORM_CONSTANTS.disclaimerLine2;

    const xmlRows = [];

    function pushRow(cells, options = {}) {
        xmlRows.push({ cells, height: options.height || 18 });
    }

    function sectionRows() {
        return [
            {
                height: 38,
                cells: [
                    { mergeAcross: 1, style: 'sLogo', value: 'Hermanos\nCoronel\nCremería' },
                    { mergeAcross: 2, style: 'sTitleYellow', value: 'FORMATO' },
                    { style: 'sMetaLabel', value: 'Código:' },
                    { style: 'sMetaValue', value: 'CH.FO.012' },
                ],
            },
            {
                height: 32,
                cells: [
                    { mergeAcross: 1, style: 'sLogoBottom', value: '' },
                    { mergeAcross: 2, style: 'sTitleMain', value: 'Solicitud de Vacaciones' },
                    { style: 'sMetaLabel', value: 'Revisión:' },
                    { style: 'sMetaValue', value: '2' },
                ],
            },
            {
                height: 18,
                cells: [
                    { mergeAcross: 1, style: 'sEmptyHeader', value: '' },
                    { mergeAcross: 2, style: 'sEmptyHeader', value: '' },
                    { style: 'sMetaLabel', value: 'Fecha:' },
                    { style: 'sMetaValue', value: formData.templateDateLabel },
                ],
            },
            {
                height: 18,
                cells: [
                    { mergeAcross: 1, style: 'sEmptyHeader', value: '' },
                    { mergeAcross: 2, style: 'sEmptyHeader', value: '' },
                    { style: 'sMetaLabel', value: 'Página:' },
                    { style: 'sMetaValue', value: '1 de 1' },
                ],
            },
            {
                height: 8,
                cells: [{ style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }],
            },
            {
                height: 22,
                cells: [
                    { style: 'sLabel', value: 'ÁREA/SUCURSAL' },
                    { style: 'sValueCenter', value: formData.department },
                    { style: 'sLabel', value: 'FECHA D/M/A:' },
                    { mergeAcross: 1, style: 'sValueCenter', value: formData.currentDate },
                ],
            },
            {
                height: 8,
                cells: [{ style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }],
            },
            { height: 20, cells: [{ style: 'sLabel', value: 'NUMERO DE EMPLEADO:' }, { mergeAcross: 3, style: 'sValueCenter', value: formData.employeeCode }] },
            { height: 20, cells: [{ style: 'sLabel', value: 'NOMBRE:' }, { mergeAcross: 3, style: 'sValueCenter', value: formData.name }] },
            { height: 20, cells: [{ style: 'sLabel', value: 'PUESTO:' }, { mergeAcross: 3, style: 'sValueCenter', value: formData.position }] },
            { height: 20, cells: [{ style: 'sLabel', value: 'ANTIGÜEDAD (AÑOS):' }, { mergeAcross: 3, style: 'sValueCenter', value: formData.seniority }] },
            { height: 20, cells: [{ style: 'sLabel', value: 'FECHA DE INGRESO:' }, { mergeAcross: 3, style: 'sValueCenter', value: formData.joinDate }] },
            { height: 20, cells: [{ style: 'sLabel', value: 'NOMBRE JEFE INMEDIATO:' }, { mergeAcross: 3, style: 'sValueBlank', value: '' }] },
            { height: 20, cells: [{ style: 'sLabel', value: 'PUESTO JEFE INMEDIATO:' }, { mergeAcross: 3, style: 'sValueBlank', value: '' }] },
            {
                height: 8,
                cells: [{ style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }],
            },
            { height: 24, cells: [{ style: 'sLabel', value: 'FECHA INICIO DE VACACIONES:' }, { mergeAcross: 3, style: 'sValueBlank', value: '' }] },
            { height: 24, cells: [{ style: 'sLabel', value: 'FECHA TERMINO DE VACACIONES:' }, { mergeAcross: 3, style: 'sValueBlank', value: '' }] },
            { height: 24, cells: [{ style: 'sLabel', value: 'FECHA QUE ME PRESENTO A TRABAJAR:' }, { mergeAcross: 3, style: 'sValueBlank', value: '' }] },
            {
                height: 10,
                cells: [{ style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }],
            },
            {
                height: 22,
                cells: [
                    { style: 'sBalanceHeader', value: 'DIAS PENDIENTES POR TOMAR' },
                    { style: 'sBalanceHeader', value: 'DÍAS A TOMAR COMO VACACIONES' },
                    { style: 'sBalanceHeader', value: 'SALDO' },
                ],
                leadingBlanks: 1,
                trailingBlanks: 1,
            },
            {
                height: 32,
                cells: [
                    { style: 'sBalanceValue', value: '' },
                    { style: 'sBalanceValue', value: '' },
                    { style: 'sBalanceValue', value: '' },
                ],
                leadingBlanks: 1,
                trailingBlanks: 1,
            },
            {
                height: 38,
                cells: [{ mergeAcross: 4, style: 'sDisclaimer', value: disclaimer1 }],
            },
            {
                height: 24,
                cells: [{ mergeAcross: 4, style: 'sDisclaimer', value: disclaimer2 }],
            },
            {
                height: 18,
                cells: [{ style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }],
            },
            {
                height: 20,
                cells: [
                    { style: 'sSignatureName', value: formData.applicantName },
                    { style: 'sSignatureName', value: '0' },
                    { style: 'sSignatureName', value: formData.humanCapitalName },
                ],
                leadingBlanks: 0,
                interleaveBlanks: true,
            },
            {
                height: 18,
                cells: [
                    { style: 'sSignatureRole', value: 'Solicitante' },
                    { style: 'sSignatureRole', value: 'Jefe Directo' },
                    { style: 'sSignatureRole', value: formData.humanCapitalRole },
                ],
                leadingBlanks: 0,
                interleaveBlanks: true,
            }
        ];
    }

    function normalizeSectionRow(rowDef) {
        const cells = [];
        if (rowDef.leadingBlanks) {
            for (let i = 0; i < rowDef.leadingBlanks; i += 1) {
                cells.push({ style: 'sSpacer', value: '' });
            }
        }
        if (rowDef.interleaveBlanks) {
            rowDef.cells.forEach((cell, index) => {
                cells.push(cell);
                if (index < rowDef.cells.length - 1) {
                    cells.push({ style: 'sSpacer', value: '' });
                }
            });
        } else {
            cells.push(...rowDef.cells);
        }
        if (rowDef.trailingBlanks) {
            for (let i = 0; i < rowDef.trailingBlanks; i += 1) {
                cells.push({ style: 'sSpacer', value: '' });
            }
        }
        return { height: rowDef.height, cells };
    }

    sectionRows().forEach((rowDef) => pushRow(normalizeSectionRow(rowDef).cells, { height: rowDef.height }));
    pushRow([{ style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }, { style: 'sSpacer', value: '' }], { height: 12 });
    sectionRows().forEach((rowDef) => pushRow(normalizeSectionRow(rowDef).cells, { height: rowDef.height }));

    const xmlRowString = xmlRows.map((row) => {
        const cells = row.cells.map((cell) => {
            const mergeAcross = cell.mergeAcross != null ? ` ss:MergeAcross="${cell.mergeAcross}"` : '';
            const style = cell.style ? ` ss:StyleID="${cell.style}"` : '';
            const data = `<Data ss:Type="String">${escapeXml(cell.value || '')}</Data>`;
            return `<Cell${style}${mergeAcross}>${data}</Cell>`;
        }).join('');
        return `<Row ss:AutoFitHeight="0" ss:Height="${row.height}">${cells}</Row>`;
    }).join('');

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>ChatGPT</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
  <WindowHeight>12000</WindowHeight>
  <WindowWidth>21500</WindowWidth>
  <ProtectStructure>False</ProtectStructure>
  <ProtectWindows>False</ProtectWindows>
 </ExcelWorkbook>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Arial" ss:Size="10"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="sSpacer"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="8"/><Borders/></Style>
  <Style ss:ID="sLogo"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/></Borders><Font ss:FontName="Arial" ss:Size="18" ss:Bold="1" ss:Color="#8A1F1F"/></Style>
  <Style ss:ID="sLogoBottom"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/></Borders></Style>
  <Style ss:ID="sTitleYellow"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/></Borders><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#E6C948" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sTitleMain"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/></Borders><Font ss:FontName="Arial" ss:Size="12" ss:Bold="1"/></Style>
  <Style ss:ID="sEmptyHeader"><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/></Borders></Style>
  <Style ss:ID="sMetaLabel"><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/></Borders><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/></Style>
  <Style ss:ID="sMetaValue"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/></Borders><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="sLabel"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/></Borders><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#E6C948" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sValueCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/></Borders><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="sValueBlank"><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/></Borders></Style>
  <Style ss:ID="sBalanceHeader"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/></Borders><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#E6C948" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sBalanceValue"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/></Borders></Style>
  <Style ss:ID="sDisclaimer"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Size="10"/><Borders/></Style>
  <Style ss:ID="sSignatureName"><Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="sSignatureRole"><Alignment ss:Horizontal="Center" ss:Vertical="Top"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
 </Styles>
 <Worksheet ss:Name="Solicitud">
  <Table ss:ExpandedColumnCount="5" ss:ExpandedRowCount="${xmlRows.length}" x:FullColumns="1" x:FullRows="1" ss:DefaultColumnWidth="54" ss:DefaultRowHeight="18">
   <Column ss:Width="165"/>
   <Column ss:Width="100"/>
   <Column ss:Width="130"/>
   <Column ss:Width="118"/>
   <Column ss:Width="118"/>
   ${xmlRowString}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup>
    <Layout x:Orientation="Portrait"/>
    <Header x:Margin="0.2"/>
    <Footer x:Margin="0.2"/>
    <PageMargins x:Bottom="0.35" x:Left="0.25" x:Right="0.25" x:Top="0.35"/>
   </PageSetup>
   <Print>
    <ValidPrinterInfo/>
    <PaperSizeIndex>9</PaperSizeIndex>
    <Scale>78</Scale>
    <FitWidth>1</FitWidth>
    <FitHeight>1</FitHeight>
    <HorizontalResolution>600</HorizontalResolution>
    <VerticalResolution>600</VerticalResolution>
   </Print>
   <Selected/>
   <DoNotDisplayGridlines/>
   <Panes>
    <Pane>
     <Number>3</Number>
     <ActiveRow>1</ActiveRow>
     <ActiveCol>1</ActiveCol>
    </Pane>
   </Panes>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;
}

async function downloadVacationRequestExcel(row) {
    const formData = getVacationRequestFormData(row);

    if (!window.JSZip) {
        throw new Error('No se pudo cargar la librería necesaria para generar el Excel.');
    }

    const response = await fetch('FormatoVacaciones.xlsx');
    if (!response.ok) {
        throw new Error('No se pudo cargar la plantilla de Excel del formato de vacaciones.');
    }

    const arrayBuffer = await response.arrayBuffer();
    const zip = await window.JSZip.loadAsync(arrayBuffer);
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const mainNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    const sharedStringsXml = await zip.file('xl/sharedStrings.xml').async('string');
    const sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');

    const sharedDoc = parser.parseFromString(sharedStringsXml, 'application/xml');
    const sheetDoc = parser.parseFromString(sheetXml, 'application/xml');

    const sst = sharedDoc.getElementsByTagNameNS(mainNs, 'sst')[0];
    const sheetData = sheetDoc.getElementsByTagNameNS(mainNs, 'sheetData')[0];

    function findCell(address) {
        const cells = sheetDoc.getElementsByTagNameNS(mainNs, 'c');
        for (const cell of cells) {
            if (cell.getAttribute('r') === address) {
                return cell;
            }
        }
        return null;
    }

    function ensureSharedString(value) {
        const si = sharedDoc.createElementNS(mainNs, 'si');
        const t = sharedDoc.createElementNS(mainNs, 't');
        t.textContent = String(value == null ? '' : value);
        si.appendChild(t);
        sst.appendChild(si);

        const currentCount = parseInt(sst.getAttribute('count') || '0', 10) + 1;
        const currentUnique = parseInt(sst.getAttribute('uniqueCount') || '0', 10);
        sst.setAttribute('count', String(currentCount));
        sst.setAttribute('uniqueCount', String(currentUnique + 1));
        return currentUnique;
    }

    function setSharedStringCell(address, value) {
        const cell = findCell(address);
        if (!cell) {
            throw new Error(`No se encontró la celda ${address} dentro de la plantilla.`);
        }

        while (cell.firstChild) {
            cell.removeChild(cell.firstChild);
        }

        cell.setAttribute('t', 's');
        const valueNode = sheetDoc.createElementNS(mainNs, 'v');
        valueNode.textContent = String(ensureSharedString(value));
        cell.appendChild(valueNode);
    }

    const sections = [
        {
            area: 'C7',
            date: 'E7',
            employee: 'C9',
            name: 'C10',
            position: 'C11',
            seniority: 'C12',
            joinDate: 'C13',
            applicantName: 'B29',
            directBossName: 'C29',
        },
        {
            area: 'C42',
            date: 'E42',
            employee: 'C44',
            name: 'C45',
            position: 'C46',
            seniority: 'C48',
            joinDate: 'C47',
            applicantName: 'B63',
            directBossName: 'C63',
        },
    ];

    sections.forEach((section) => {
        setSharedStringCell(section.area, formData.department);
        setSharedStringCell(section.date, formData.currentDate);
        setSharedStringCell(section.employee, formData.employeeCode);
        setSharedStringCell(section.name, formData.name);
        setSharedStringCell(section.position, formData.position);
        setSharedStringCell(section.seniority, formData.seniority);
        setSharedStringCell(section.joinDate, formData.joinDate);
        setSharedStringCell(section.applicantName, formData.applicantName);
        setSharedStringCell(section.directBossName, '');
    });

    zip.file('xl/sharedStrings.xml', serializer.serializeToString(sharedDoc));
    zip.file('xl/worksheets/sheet1.xml', serializer.serializeToString(sheetDoc));

    const workbookXml = await zip.file('xl/workbook.xml').async('string');
    const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    const contentTypesXml = await zip.file('[Content_Types].xml').async('string');

    const workbookDoc = parser.parseFromString(workbookXml, 'application/xml');
    const relsDoc = parser.parseFromString(relsXml, 'application/xml');
    const contentTypesDoc = parser.parseFromString(contentTypesXml, 'application/xml');

    const calcPrNodes = workbookDoc.getElementsByTagNameNS(mainNs, 'calcPr');
    while (calcPrNodes.length) {
        calcPrNodes[0].parentNode.removeChild(calcPrNodes[0]);
    }

    const relNodes = Array.from(relsDoc.getElementsByTagName('Relationship'));
    relNodes.forEach((node) => {
        const targetValue = node.getAttribute('Target') || '';
        const typeValue = node.getAttribute('Type') || '';
        if (targetValue.includes('calcChain.xml') || typeValue.includes('/calcChain')) {
            node.parentNode.removeChild(node);
        }
    });

    const overrideNodes = Array.from(contentTypesDoc.getElementsByTagName('Override'));
    overrideNodes.forEach((node) => {
        const partName = node.getAttribute('PartName') || '';
        if (partName.includes('/xl/calcChain.xml')) {
            node.parentNode.removeChild(node);
        }
    });

    zip.file('xl/workbook.xml', serializer.serializeToString(workbookDoc));
    zip.file('xl/_rels/workbook.xml.rels', serializer.serializeToString(relsDoc));
    zip.file('[Content_Types].xml', serializer.serializeToString(contentTypesDoc));
    if (zip.file('xl/calcChain.xml')) {
        zip.remove('xl/calcChain.xml');
    }

    const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    downloadBlob(blob, `formato_solicitud_vacaciones_${formData.employeeCode}.xlsx`);
}

function drawPdfCell(doc, x, y, width, height, text = '', options = {}) {
    const {
        fillColor = null,
        align = 'left',
        fontSize = 8,
        fontStyle = 'normal',
        padding = 1.4,
    } = options;

    if (fillColor) {
        doc.setFillColor(...fillColor);
        doc.rect(x, y, width, height, 'FD');
    } else {
        doc.rect(x, y, width, height);
    }

    if (text) {
        doc.setFont(undefined, fontStyle);
        doc.setFontSize(fontSize);
        const lines = Array.isArray(text) ? text : doc.splitTextToSize(String(text), Math.max(width - (padding * 2), 2));
        const totalTextHeight = Math.max(lines.length, 1) * (fontSize * 0.38);
        const baseY = y + (height / 2) - (totalTextHeight / 2) + (fontSize * 0.34);
        const textX = align === 'center' ? x + (width / 2) : (align === 'right' ? x + width - padding : x + padding);
        doc.text(lines, textX, baseY, { align, maxWidth: Math.max(width - (padding * 2), 2) });
        doc.setFont(undefined, 'normal');
    }
}

function drawVacationRequestPdfSection(doc, formData, startY, logoDataUrl) {
    const yellow = [230, 201, 72];
    const x = 10;
    const pageWidth = 195;
    const logoWidth = 54;
    const titleWidth = 82;
    const metaWidth = pageWidth - logoWidth - titleWidth;
    const headerHeight = 15;
    const titleRowHeight = headerHeight / 2;
    const metaRowHeight = headerHeight / 4;
    const sectionSpacing = 2;

    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);
    doc.setLineWidth(0.3);

    drawPdfCell(doc, x, startY, logoWidth, headerHeight, '');
    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, 'PNG', x + 2, startY + 2, logoWidth - 4, headerHeight - 4, undefined, 'FAST');
        } catch (error) {
            doc.setFontSize(18);
            doc.setTextColor(138, 31, 31);
            doc.text('Hermanos Coronel', x + (logoWidth / 2), startY + 10, { align: 'center' });
            doc.setTextColor(0, 0, 0);
        }
    } else {
        doc.setFontSize(18);
        doc.setTextColor(138, 31, 31);
        doc.text('Hermanos Coronel', x + (logoWidth / 2), startY + 10, { align: 'center' });
        doc.setTextColor(0, 0, 0);
    }

    drawPdfCell(doc, x + logoWidth, startY, titleWidth, titleRowHeight, 'FORMATO', { fillColor: yellow, align: 'center', fontStyle: 'bold', fontSize: 8.5 });
    drawPdfCell(doc, x + logoWidth, startY + titleRowHeight, titleWidth, titleRowHeight, 'Solicitud de Vacaciones', { align: 'center', fontStyle: 'bold', fontSize: 9 });

    const metaLabelWidth = metaWidth * 0.48;
    const metaValueWidth = metaWidth - metaLabelWidth;
    const metaRows = [
        ['Código:', 'CH.FO.012'],
        ['Revisión:', '2'],
        ['Fecha:', formData.templateDateLabel],
        ['Página:', '1 de 1'],
    ];
    metaRows.forEach((metaRow, index) => {
        const rowY = startY + (index * metaRowHeight);
        drawPdfCell(doc, x + logoWidth + titleWidth, rowY, metaLabelWidth, metaRowHeight, metaRow[0], { fontStyle: 'bold', fontSize: 7.5 });
        drawPdfCell(doc, x + logoWidth + titleWidth + metaLabelWidth, rowY, metaValueWidth, metaRowHeight, metaRow[1], { align: 'center', fontSize: 7.5 });
    });

    const areaY = startY + headerHeight + sectionSpacing;
    const areaLabel1 = 54;
    const areaValue1 = 35;
    const areaLabel2 = 43;
    const areaValue2 = pageWidth - areaLabel1 - areaValue1 - areaLabel2;
    drawPdfCell(doc, x, areaY, areaLabel1, 7, 'ÁREA/SUCURSAL', { fillColor: yellow, fontStyle: 'bold', fontSize: 7.5 });
    drawPdfCell(doc, x + areaLabel1, areaY, areaValue1, 7, formData.department, { align: 'center', fontSize: 7.5 });
    drawPdfCell(doc, x + areaLabel1 + areaValue1, areaY, areaLabel2, 7, 'FECHA D/M/A:', { fillColor: yellow, fontStyle: 'bold', fontSize: 7.5 });
    drawPdfCell(doc, x + areaLabel1 + areaValue1 + areaLabel2, areaY, areaValue2, 7, formData.currentDate, { align: 'center', fontSize: 7.5 });

    const personalY = areaY + 10;
    const personalLabelWidth = 54;
    const personalValueWidth = pageWidth - personalLabelWidth;
    const personalRows = [
        ['NUMERO DE EMPLEADO:', formData.employeeCode],
        ['NOMBRE:', formData.name],
        ['PUESTO:', formData.position],
        ['ANTIGÜEDAD (AÑOS):', formData.seniority],
        ['FECHA DE INGRESO:', formData.joinDate],
        ['NOMBRE JEFE INMEDIATO:', ''],
        ['PUESTO JEFE INMEDIATO:', ''],
    ];
    personalRows.forEach((personalRow, index) => {
        const rowY = personalY + (index * 5.6);
        drawPdfCell(doc, x, rowY, personalLabelWidth, 5.6, personalRow[0], { fillColor: yellow, fontStyle: 'bold', fontSize: 6.5 });
        drawPdfCell(doc, x + personalLabelWidth, rowY, personalValueWidth, 5.6, personalRow[1], { align: 'center', fontSize: 6.5 });
    });

    const datesY = personalY + (personalRows.length * 5.6) + 3;
    const datesRows = [
        'FECHA INICIO DE VACACIONES:',
        'FECHA TERMINO DE VACACIONES:',
        'FECHA QUE ME PRESENTO A TRABAJAR:',
    ];
    datesRows.forEach((label, index) => {
        const rowY = datesY + (index * 6);
        drawPdfCell(doc, x, rowY, personalLabelWidth, 6, label, { fillColor: yellow, fontStyle: 'bold', fontSize: 6.4 });
        drawPdfCell(doc, x + personalLabelWidth, rowY, personalValueWidth, 6, '', { fontSize: 6.4 });
    });

    const balanceY = datesY + (datesRows.length * 6) + 3;
    const balanceX = x + 58;
    const balanceWidths = [38, 47, 24];
    const balanceHeaders = ['DIAS PENDIENTES POR TOMAR', 'DÍAS A TOMAR COMO VACACIONES', 'SALDO'];
    let balanceCursorX = balanceX;
    balanceHeaders.forEach((header, index) => {
        drawPdfCell(doc, balanceCursorX, balanceY, balanceWidths[index], 6.5, header, { fillColor: yellow, align: 'center', fontStyle: 'bold', fontSize: 5.9 });
        drawPdfCell(doc, balanceCursorX, balanceY + 6.5, balanceWidths[index], 6.5, '', { align: 'center', fontSize: 6.2 });
        balanceCursorX += balanceWidths[index];
    });

    doc.setFontSize(5.2);
    const paragraphWidth = 150;
    const centerX = x + (pageWidth / 2);
    const paragraphOneLines = doc.splitTextToSize(VACATION_FORM_CONSTANTS.disclaimerLine1, paragraphWidth);
    doc.text(paragraphOneLines, centerX, balanceY + 18, { align: 'center', maxWidth: paragraphWidth });
    const paragraphTwoLines = doc.splitTextToSize(VACATION_FORM_CONSTANTS.disclaimerLine2, paragraphWidth);
    doc.text(paragraphTwoLines, centerX, balanceY + 28, { align: 'center', maxWidth: paragraphWidth });

    const signatureY = balanceY + 38;
    const signatureWidth = 48;
    const signaturePositions = [x + 4, x + 73, x + 142];
    const signatureNames = [formData.applicantName, '', formData.humanCapitalName];
    const signatureRoles = ['Solicitante', 'Jefe Directo', formData.humanCapitalRole];

    signaturePositions.forEach((signatureX, index) => {
        doc.line(signatureX, signatureY, signatureX + signatureWidth, signatureY);
        if (signatureNames[index]) {
            doc.setFontSize(5.8);
            doc.text(signatureNames[index], signatureX + (signatureWidth / 2), signatureY - 1.3, { align: 'center', maxWidth: signatureWidth });
        }
        doc.setFontSize(5.8);
        doc.text(signatureRoles[index], signatureX + (signatureWidth / 2), signatureY + 4, { align: 'center' });
    });
}

async function buildVacationRequestPdf(row) {
    const { logoDataUrl } = await ensureVacationFormAssets();
    const formData = getVacationRequestFormData(row);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    drawVacationRequestPdfSection(doc, formData, 8, logoDataUrl);
    drawVacationRequestPdfSection(doc, formData, 145, logoDataUrl);
    return {
        doc,
        formData,
        blob: doc.output('blob'),
    };
}

async function downloadVacationRequestPdf(row) {
    const { blob, formData } = await buildVacationRequestPdf(row);
    downloadBlob(blob, `formato_solicitud_vacaciones_${formData.employeeCode}.pdf`);
}

async function printVacationRequestPdf(row) {
    const { blob } = await buildVacationRequestPdf(row);
    const objectUrl = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = objectUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } finally {
                setTimeout(() => {
                    URL.revokeObjectURL(objectUrl);
                    iframe.remove();
                }, 60000);
            }
        }, 400);
    };
}

async function handleVacationRowAction(action, row) {
    switch (action) {
    case 'data-excel':
        exportRowsToExcel([row], `datos_vacaciones_${row.employee_code}.xlsx`);
        break;
    case 'data-pdf':
        exportRowsToPdf([row], `Datos de vacaciones ${row.employee_code}`);
        break;
    case 'data-print':
        printRows([row], `Datos de vacaciones ${row.employee_code}`);
        break;
    case 'form-excel':
        await downloadVacationRequestExcel(row);
        break;
    case 'form-pdf':
        await downloadVacationRequestPdf(row);
        break;
    case 'form-print':
        await printVacationRequestPdf(row);
        break;
    default:
        break;
    }
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
    const filters = {
        department: document.getElementById('filter-department').value.trim(),
    };
    // Tomar el valor del campo unificado y determinar si es un ID numérico o un nombre.
    const searchValueEl = document.getElementById('filter-search');
    const searchValue = searchValueEl ? searchValueEl.value.trim() : '';
    if (searchValue) {
        // Si contiene solo dígitos, se trata como código de empleado; de lo contrario, como nombre.
        const isNumeric = /^\d+$/.test(searchValue);
        if (isNumeric) {
            filters.employee_code = searchValue;
        } else {
            filters.name = searchValue;
        }
    }
    return filters;
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

    // Eliminar duplicados y ordenar alfabéticamente dejando "Baja" al final
    let unique = [...new Set(values)];
    unique = unique.sort((a, b) => {
        const aLower = String(a || '').toLowerCase();
        const bLower = String(b || '').toLowerCase();
        if (aLower === 'baja' && bLower !== 'baja') return 1;
        if (bLower === 'baja' && aLower !== 'baja') return -1;
        return aLower.localeCompare(bLower);
    });

    unique.forEach((department) => {
        const option = document.createElement('option');
        option.value = department;
        option.textContent = department;
        select.appendChild(option);
    });

    if (currentValue) {
        select.value = currentValue;
    }
}

function buildEmployeeActionGroupsHtml(employeeNumber) {
    return `
        <div class="vac18-row-action-groups">
            <div class="vac18-row-action-group">
                <div class="vac18-row-action-label">Datos de Vacaciones</div>
                <div class="vac18-row-actions">
                    <button type="button" class="secondary small" data-action="data-excel" data-employee="${employeeNumber}">Excel</button>
                    <button type="button" class="secondary small" data-action="data-pdf" data-employee="${employeeNumber}">PDF</button>
                    <button type="button" class="secondary small" data-action="data-print" data-employee="${employeeNumber}">Imprimir</button>
                </div>
            </div>
            <div class="vac18-row-action-group">
                <div class="vac18-row-action-label">Formato de solicitud de vacaciones</div>
                <div class="vac18-row-actions">
                    <button type="button" class="secondary small" data-action="form-excel" data-employee="${employeeNumber}">Excel</button>
                    <button type="button" class="secondary small" data-action="form-pdf" data-employee="${employeeNumber}">PDF</button>
                    <button type="button" class="secondary small" data-action="form-print" data-employee="${employeeNumber}">Imprimir</button>
                </div>
            </div>
        </div>
    `;
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
        const actionGroupsHtml = buildEmployeeActionGroupsHtml(row.employee_number);

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
                <td>${actionGroupsHtml}</td>
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
                        <span class="label">Puesto</span>
                        <span class="value">${escapeHtml(row.position || '') || '-'}</span>
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
                ${actionGroupsHtml}
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
    const tableRows = buildReportRows(rows)
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
        .join('');

    const html = `
        <html>
            <head>
                <title>${escapeHtml(title)}</title>
                <style>
                    @page { margin: 14mm; }
                    body { font-family: Arial, sans-serif; padding: 18px; color: #111827; }
                    h1 { margin: 0 0 16px; font-size: 28px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #bfc7cf; padding: 8px; font-size: 12px; text-align: left; }
                    th { background: #e5e7eb; }
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
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    iframe.onload = () => {
        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } finally {
                setTimeout(() => iframe.remove(), 60000);
            }
        }, 250);
    };

    iframe.srcdoc = html;
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
        ensureVacationFormAssets().catch(() => null);

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
        const searchInput = document.getElementById('filter-search');
        if (searchInput) searchInput.value = '';
        await loadVacations();
    });

    // Permitir la búsqueda al pulsar Enter en el campo de búsqueda unificado
    const unifiedSearchInput = document.getElementById('filter-search');
    if (unifiedSearchInput) {
        unifiedSearchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                loadVacations().catch((error) => alert(error.message));
            }
        });
    }

    document.getElementById('btn-export-excel').addEventListener('click', () => {
        exportRowsToExcel(vacationState.rows, 'vacaciones_visibles_1_8.xlsx');
    });
    document.getElementById('btn-export-pdf').addEventListener('click', () => {
        exportRowsToPdf(vacationState.rows, 'Reporte de vacaciones');
    });
    document.getElementById('btn-print').addEventListener('click', () => {
        printRows(vacationState.rows, 'Reporte de vacaciones');
    });

    // Gestión de descarga e impresión del formato de vacaciones
    // Este formulario adicional permite descargar el archivo adjunto (Excel o PDF) o abrirlo en una nueva pestaña para impresión.
    const btnDownloadExcel = document.getElementById('btn-download-excel');
    if (btnDownloadExcel) {
        btnDownloadExcel.addEventListener('click', () => {
            triggerBrowserDownload('FormatoVacaciones.xlsx');
        });
    }
    const btnDownloadPdf = document.getElementById('btn-download-pdf');
    if (btnDownloadPdf) {
        btnDownloadPdf.addEventListener('click', () => {
            triggerBrowserDownload('FormatoVacaciones.pdf');
        });
    }
    const btnPrintFormat = document.getElementById('btn-print-format');
    if (btnPrintFormat) {
        btnPrintFormat.addEventListener('click', () => {
            openPdfPrintPreview('FormatoVacaciones.pdf', 'Formato de vacaciones');
        });
    }

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

        handleVacationRowAction(button.dataset.action, row).catch((error) => {
            alert(error.message || 'No se pudo generar el archivo solicitado.');
        });
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

            handleVacationRowAction(button.dataset.action, row).catch((error) => {
                alert(error.message || 'No se pudo generar el archivo solicitado.');
            });
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
