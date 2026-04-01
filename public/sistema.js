const systemState = {
    users: [],
    departments: [],
    positions: [],
    selectedDepartmentId: null,
    selectedPositionId: null,
};

function getToken() {
    return localStorage.getItem('token');
}

async function apiRequest(url, options = {}) {
    const token = getToken();
    const headers = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`,
    };

    if (!headers['Content-Type'] && options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    let payload = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        payload = await response.json();
    } else {
        payload = await response.text();
    }

    if (!response.ok) {
        const message = payload && payload.error ? payload.error : 'Ocurrió un error en la solicitud';
        throw new Error(message);
    }

    return payload;
}

function fillSessionInfo(data) {
    document.getElementById('username').textContent = data.username;
    document.getElementById('full-name').textContent = data.full_name;
    document.getElementById('user-role').textContent = data.role;
}

function renderUsersTable() {
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = '';

    systemState.users.forEach((user) => {
        const row = document.createElement('tr');
        const departmentsSummary = user.all_departments
            ? 'Todos los departamentos'
            : (user.department_names || []).join(', ') || 'Sin departamentos asignados';

        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.full_name}</td>
            <td>${user.role}</td>
            <td>${user.all_departments ? 'Sí' : 'No'}</td>
            <td class="system-user-summary">${departmentsSummary}</td>
            <td>
                <div class="system-table-actions">
                    <button type="button" onclick="openEditUserModal(${user.id})">Editar</button>
                    <button type="button" onclick="openPasswordModal(${user.id})">Contraseña</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderCatalogList(listId, items, selectedId, onSelect) {
    const list = document.getElementById(listId);
    list.innerHTML = '';

    items.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item.name;
        li.dataset.id = item.id;
        li.tabIndex = 0;
        if (item.id === selectedId) {
            li.classList.add('selected');
        }
        li.addEventListener('click', () => onSelect(item.id));
        li.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(item.id);
            }
        });
        list.appendChild(li);
    });
}

function renderDepartmentChecklist(selectedIds = []) {
    const container = document.getElementById('department-checklist');
    const selected = new Set((selectedIds || []).map((value) => parseInt(value, 10)));
    container.innerHTML = '';

    systemState.departments.forEach((department) => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" value="${department.id}" ${selected.has(department.id) ? 'checked' : ''}>
            <span>${department.name}</span>
        `;
        container.appendChild(label);
    });

    updateDepartmentChecklistState();
}

function updateDepartmentChecklistState() {
    const container = document.getElementById('department-checklist');
    const allDepartments = document.getElementById('modal-all-departments').checked;
    container.style.opacity = allDepartments ? '0.55' : '1';
    container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.disabled = allDepartments;
    });
}

function openOverlay() {
    document.getElementById('modal-overlay').style.display = 'block';
}

function closeOverlayIfNeeded() {
    const userModalVisible = document.getElementById('user-modal').style.display === 'block';
    const passwordModalVisible = document.getElementById('password-modal').style.display === 'block';
    document.getElementById('modal-overlay').style.display = (userModalVisible || passwordModalVisible) ? 'block' : 'none';
}

function openCreateUserModal() {
    document.getElementById('user-form').dataset.mode = 'create';
    document.getElementById('user-modal-title').textContent = 'Crear Usuario';
    document.getElementById('user-id').value = '';
    document.getElementById('modal-username').value = '';
    document.getElementById('modal-username').disabled = false;
    document.getElementById('modal-full-name').value = '';
    document.getElementById('modal-password').value = '';
    document.getElementById('modal-password-group').style.display = 'block';
    document.getElementById('modal-role').value = 'user';
    document.getElementById('modal-all-departments').checked = false;
    renderDepartmentChecklist([]);
    document.getElementById('user-modal').style.display = 'block';
    openOverlay();
}

function openEditUserModal(userId) {
    const user = systemState.users.find((item) => item.id === userId);
    if (!user) return;

    document.getElementById('user-form').dataset.mode = 'edit';
    document.getElementById('user-modal-title').textContent = 'Editar Usuario';
    document.getElementById('user-id').value = user.id;
    document.getElementById('modal-username').value = user.username;
    document.getElementById('modal-username').disabled = true;
    document.getElementById('modal-full-name').value = user.full_name;
    document.getElementById('modal-password').value = '';
    document.getElementById('modal-password-group').style.display = 'none';
    document.getElementById('modal-role').value = user.role;
    document.getElementById('modal-all-departments').checked = !!user.all_departments;
    renderDepartmentChecklist(user.department_ids || []);
    document.getElementById('user-modal').style.display = 'block';
    openOverlay();
}

function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
    closeOverlayIfNeeded();
}

function openPasswordModal(userId) {
    const user = systemState.users.find((item) => item.id === userId);
    if (!user) return;

    document.getElementById('password-user-id').value = user.id;
    document.getElementById('password-user-label').textContent = `Usuario: ${user.username}`;
    document.getElementById('new-password').value = '';
    document.getElementById('password-modal').style.display = 'block';
    openOverlay();
}

function closePasswordModal() {
    document.getElementById('password-modal').style.display = 'none';
    closeOverlayIfNeeded();
}

function getSelectedDepartmentIds() {
    if (document.getElementById('modal-all-departments').checked) {
        return [];
    }

    return Array.from(document.querySelectorAll('#department-checklist input[type="checkbox"]:checked'))
        .map((checkbox) => parseInt(checkbox.value, 10))
        .filter((value) => Number.isInteger(value));
}

async function refreshSystemData() {
    const payload = await apiRequest('/api/admin/system/bootstrap');
    systemState.users = payload.users || [];
    // Ordenar departamentos alfabéticamente, dejando "Baja" al final
    let departments = payload.departments || [];
    departments = departments.slice().sort((a, b) => {
        const aLower = (a.name || '').toLowerCase();
        const bLower = (b.name || '').toLowerCase();
        if (aLower === 'baja' && bLower !== 'baja') return 1;
        if (bLower === 'baja' && aLower !== 'baja') return -1;
        return aLower.localeCompare(bLower);
    });
    systemState.departments = departments;
    // Ordenar puestos alfabéticamente
    let positions = payload.positions || [];
    positions = positions.slice().sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
    systemState.positions = positions;

    if (!systemState.departments.some((item) => item.id === systemState.selectedDepartmentId)) {
        systemState.selectedDepartmentId = null;
    }
    if (!systemState.positions.some((item) => item.id === systemState.selectedPositionId)) {
        systemState.selectedPositionId = null;
    }

    renderUsersTable();
    renderCatalogList('departments-list', systemState.departments, systemState.selectedDepartmentId, selectDepartmentItem);
    renderCatalogList('positions-list', systemState.positions, systemState.selectedPositionId, selectPositionItem);
}

async function addDepartment() {
    const input = document.getElementById('new-department-name');
    const name = input.value.trim();
    if (!name) {
        alert('Escribe el nombre del departamento.');
        return;
    }

    try {
        const result = await apiRequest('/api/admin/system/departments', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
        input.value = '';
        await refreshSystemData();
        alert(result.message || 'Departamento agregado correctamente');
    } catch (error) {
        alert(error.message);
    }
}

async function addPosition() {
    const input = document.getElementById('new-position-name');
    const name = input.value.trim();
    if (!name) {
        alert('Escribe el nombre del puesto.');
        return;
    }

    try {
        const result = await apiRequest('/api/admin/system/positions', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
        input.value = '';
        await refreshSystemData();
        alert(result.message || 'Puesto agregado correctamente');
    } catch (error) {
        alert(error.message);
    }
}

async function saveUserForm(event) {
    event.preventDefault();

    const mode = document.getElementById('user-form').dataset.mode;
    const userId = document.getElementById('user-id').value;
    const payload = {
        username: document.getElementById('modal-username').value.trim(),
        full_name: document.getElementById('modal-full-name').value.trim(),
        role: document.getElementById('modal-role').value,
        all_departments: document.getElementById('modal-all-departments').checked,
        department_ids: getSelectedDepartmentIds(),
    };

    if (mode === 'create') {
        payload.password = document.getElementById('modal-password').value;
    }

    if (!payload.full_name || !payload.username || (mode === 'create' && !payload.password)) {
        alert('Completa los campos obligatorios del usuario.');
        return;
    }

    try {
        const url = mode === 'create' ? '/api/admin/system/users' : `/api/admin/system/users/${userId}`;
        const method = mode === 'create' ? 'POST' : 'PUT';
        const result = await apiRequest(url, {
            method,
            body: JSON.stringify(payload),
        });
        await refreshSystemData();
        closeUserModal();
        alert(result.message || 'Usuario guardado correctamente');
    } catch (error) {
        alert(error.message);
    }
}

async function savePassword(event) {
    event.preventDefault();
    const userId = document.getElementById('password-user-id').value;
    const password = document.getElementById('new-password').value;

    if (!password) {
        alert('Escribe la nueva contraseña.');
        return;
    }

    try {
        const result = await apiRequest(`/api/admin/system/users/${userId}/password`, {
            method: 'PUT',
            body: JSON.stringify({ password }),
        });
        closePasswordModal();
        alert(result.message || 'Contraseña actualizada correctamente');
    } catch (error) {
        alert(error.message);
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

async function initializeSystemPage() {
    const token = getToken();
    if (!token) {
        alert('No estás autenticado. Por favor, inicia sesión.');
        window.location.href = '/login.html';
        return;
    }

    try {
        const session = await apiRequest('/dashboard', { method: 'GET' });
        fillSessionInfo(session);

        if (session.role !== 'admin') {
            alert('Esta pantalla solo está disponible para administradores.');
            window.location.href = '/asistencias.html';
            return;
        }

        await refreshSystemData();
    } catch (error) {
        console.error('Error al inicializar la pantalla del sistema:', error);
        alert(error.message || 'No se pudo cargar la pantalla del sistema.');
        window.location.href = '/login.html';
    }
}

document.getElementById('user-form').addEventListener('submit', saveUserForm);
document.getElementById('password-form').addEventListener('submit', savePassword);
document.getElementById('modal-all-departments').addEventListener('change', updateDepartmentChecklistState);
document.getElementById('logout-btn').addEventListener('click', logout);
document.addEventListener('DOMContentLoaded', initializeSystemPage);


function selectDepartmentItem(id) {
    systemState.selectedDepartmentId = id;
    renderCatalogList('departments-list', systemState.departments, systemState.selectedDepartmentId, selectDepartmentItem);
}

function selectPositionItem(id) {
    systemState.selectedPositionId = id;
    renderCatalogList('positions-list', systemState.positions, systemState.selectedPositionId, selectPositionItem);
}

async function deleteSelectedDepartment() {
    if (!systemState.selectedDepartmentId) {
        alert('Selecciona un departamento para eliminar.');
        return;
    }

    const selected = systemState.departments.find((item) => item.id === systemState.selectedDepartmentId);
    if (!selected) {
        alert('El departamento seleccionado ya no existe.');
        await refreshSystemData();
        return;
    }

    const confirmed = confirm(`¿Eliminar el departamento "${selected.name}" del catálogo?`);
    if (!confirmed) return;

    try {
        const result = await apiRequest(`/api/admin/system/departments/${selected.id}`, {
            method: 'DELETE',
        });
        systemState.selectedDepartmentId = null;
        await refreshSystemData();
        alert(result.message || 'Departamento eliminado correctamente');
    } catch (error) {
        alert(error.message);
    }
}

async function deleteSelectedPosition() {
    if (!systemState.selectedPositionId) {
        alert('Selecciona un puesto para eliminar.');
        return;
    }

    const selected = systemState.positions.find((item) => item.id === systemState.selectedPositionId);
    if (!selected) {
        alert('El puesto seleccionado ya no existe.');
        await refreshSystemData();
        return;
    }

    const confirmed = confirm(`¿Eliminar el puesto "${selected.name}" del catálogo?`);
    if (!confirmed) return;

    try {
        const result = await apiRequest(`/api/admin/system/positions/${selected.id}`, {
            method: 'DELETE',
        });
        systemState.selectedPositionId = null;
        await refreshSystemData();
        alert(result.message || 'Puesto eliminado correctamente');
    } catch (error) {
        alert(error.message);
    }
}
