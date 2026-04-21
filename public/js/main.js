async function requestJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

function jsonOptions(method, payload) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  };
}

function getQueryParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseDate(dateValue) {
  if (!dateValue) return null;
  const direct = new Date(dateValue);
  if (!Number.isNaN(direct.getTime())) return direct;
  const fallback = new Date(String(dateValue).replace(' ', 'T') + 'Z');
  if (!Number.isNaN(fallback.getTime())) return fallback;
  return null;
}

function formatRelativeTime(dateValue) {
  const date = parseDate(dateValue);
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин назад`;
  if (diffHour < 24) return `${diffHour} ч назад`;
  if (diffDay < 7) return `${diffDay} дн назад`;
  return date.toLocaleDateString('ru-RU');
}

function statusBadge(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'на рассмотрении') {
    return '<span class="status-badge status-review-badge">На рассмотрении</span>';
  }
  if (value === 'в ремонте') {
    return '<span class="status-badge status-repair-badge">В ремонте</span>';
  }
  if (value === 'исправлено' || value === 'в работе') {
    return `<span class="status-badge status-fixed-badge">${escapeHtml(status || 'В работе')}</span>`;
  }
  return `<span class="status-badge">${escapeHtml(status || 'Без статуса')}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const roomForm = document.getElementById('roomForm');
  const teacherRegisterForm = document.getElementById('teacherRegisterForm');
  const adminRegisterForm = document.getElementById('adminRegisterForm');
  const complaintForm = document.getElementById('complaintForm');

  const roomTableBody = document.getElementById('roomTableBody');
  const complaintTableBody = document.getElementById('complaintTableBody');
  const archiveTableBody = document.getElementById('archiveTableBody');
  const teacherTableBody = document.getElementById('teacherTableBody');
  const adminTableBody = document.getElementById('adminTableBody');
  const mainAdminSection = document.getElementById('mainAdminSection');
  const teacherRoomsSelect = document.getElementById('teacherRoomsSelect');
  const archiveDeleteHint = document.getElementById('archiveDeleteHint');

  const analyticsSummary = document.getElementById('analyticsSummary');
  const analyticsStatusChart = document.getElementById('analyticsStatusChart');
  const analyticsEquipmentChart = document.getElementById('analyticsEquipmentChart');
  const analyticsTopEquipmentChart = document.getElementById('analyticsTopEquipmentChart');
  const analyticsReliabilityChart = document.getElementById('analyticsReliabilityChart');
  const analyticsRoomChart = document.getElementById('analyticsRoomChart');

  const roomsSearchInput = document.getElementById('roomsSearchInput');
  const complaintsSearchInput = document.getElementById('complaintsSearchInput');
  const complaintsStatusFilter = document.getElementById('complaintsStatusFilter');
  const complaintsSortSelect = document.getElementById('complaintsSortSelect');
  const archiveSearchInput = document.getElementById('archiveSearchInput');
  const archiveRoomFilter = document.getElementById('archiveRoomFilter');
  const archiveDateFrom = document.getElementById('archiveDateFrom');
  const archiveDateTo = document.getElementById('archiveDateTo');
  const teachersSearchInput = document.getElementById('teachersSearchInput');
  const adminsSearchInput = document.getElementById('adminsSearchInput');

  const roomsEmptyState = document.getElementById('roomsEmptyState');
  const complaintsEmptyState = document.getElementById('complaintsEmptyState');
  const archiveEmptyState = document.getElementById('archiveEmptyState');
  const teachersEmptyState = document.getElementById('teachersEmptyState');
  const adminsEmptyState = document.getElementById('adminsEmptyState');

  const userEditModal = document.getElementById('userEditModal');
  const userEditForm = document.getElementById('userEditForm');
  const userEditModalTitle = document.getElementById('userEditModalTitle');
  const closeUserEditModal = document.getElementById('closeUserEditModal');
  const cancelUserEditModal = document.getElementById('cancelUserEditModal');

  const confirmModal = document.getElementById('confirmModal');
  const confirmModalTitle = document.getElementById('confirmModalTitle');
  const confirmModalMessage = document.getElementById('confirmModalMessage');
  const confirmModalCancel = document.getElementById('confirmModalCancel');
  const confirmModalAccept = document.getElementById('confirmModalAccept');
  const toastContainer = document.getElementById('toastContainer');

  const roomPageTitle = document.getElementById('roomPageTitle');
  const roomNameHeading = document.getElementById('roomNameHeading');
  const editRoomBtn = document.getElementById('editRoomBtn');
  const equipmentForm = document.getElementById('equipmentForm');
  const equipmentTableBody = document.getElementById('equipmentTableBody');
  const roomTeachersTableBody = document.getElementById('roomTeachersTableBody');
  const roomTeacherForm = document.getElementById('roomTeacherForm');
  const roomTeacherSelect = document.getElementById('roomTeacherSelect');
  const deleteRoomBtn = document.getElementById('deleteRoomBtn');
  const equipmentEditModal = document.getElementById('equipmentEditModal');
  const equipmentEditForm = document.getElementById('equipmentEditForm');
  const closeEquipmentEditModal = document.getElementById('closeEquipmentEditModal');
  const cancelEquipmentEditModal = document.getElementById('cancelEquipmentEditModal');
  const roomEditModal = document.getElementById('roomEditModal');
  const roomEditForm = document.getElementById('roomEditForm');
  const closeRoomEditModal = document.getElementById('closeRoomEditModal');
  const cancelRoomEditModal = document.getElementById('cancelRoomEditModal');

  const userRoomsTableBody = document.getElementById('userRoomsTableBody');
  const userEquipmentTableBody = document.getElementById('userEquipmentTableBody');
  const userRoomTitle = document.getElementById('userRoomTitle');

  const notificationBtn = document.getElementById('notificationBtn');
  const notificationDropdown = document.getElementById('notificationDropdown');
  const notificationList = document.getElementById('notificationList');
  const notificationBadge = document.getElementById('notificationBadge');
  const markAllReadBtn = document.getElementById('markAllReadBtn');

  const dashboardState = {
    currentUser: null,
    rooms: [],
    complaints: [],
    teachers: [],
    admins: [],
    analytics: null
  };

  const roomPageState = {
    room: null,
    equipment: []
  };

  const isMainAdmin = () => Boolean(dashboardState.currentUser?.is_super_admin);

  function showToast(message, type = 'success', title = 'Готово') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<p class="toast-title">${escapeHtml(title)}</p><p class="toast-message">${escapeHtml(message)}</p>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3400);
  }

  function openModal(element) {
    if (!element) return;
    element.classList.remove('hidden');
    element.setAttribute('aria-hidden', 'false');
  }

  function closeModal(element, form) {
    if (!element) return;
    element.classList.add('hidden');
    element.setAttribute('aria-hidden', 'true');
    form?.reset();
  }

  function askConfirm({ title, message, acceptLabel = 'Подтвердить' }) {
    if (!confirmModal) return Promise.resolve(window.confirm(message));
    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    confirmModalAccept.textContent = acceptLabel;
    openModal(confirmModal);
    return new Promise((resolve) => {
      const cleanup = (result) => {
        closeModal(confirmModal);
        confirmModalAccept.removeEventListener('click', onAccept);
        confirmModalCancel.removeEventListener('click', onCancel);
        confirmModal.removeEventListener('click', onBackdrop);
        resolve(result);
      };
      const onAccept = () => cleanup(true);
      const onCancel = () => cleanup(false);
      const onBackdrop = (event) => {
        if (event.target === confirmModal) cleanup(false);
      };
      confirmModalAccept.addEventListener('click', onAccept);
      confirmModalCancel.addEventListener('click', onCancel);
      confirmModal.addEventListener('click', onBackdrop);
    });
  }

  function openUserModal({ id, userType, fullName, login, email }) {
    if (!userEditModal || !userEditForm) return;
    userEditForm.elements.id.value = id;
    userEditForm.elements.user_type.value = userType;
    userEditForm.elements.full_name.value = fullName || '';
    userEditForm.elements.login.value = login || '';
    userEditForm.elements.email.value = email || '';
    userEditForm.elements.password.value = '';
    userEditModalTitle.textContent = userType === 'admin' ? 'Карточка администратора' : 'Карточка преподавателя';
    openModal(userEditModal);
  }

  function renderAnalyticsBars(container, items, options = {}) {
    if (!container) return;
    if (!items?.length) {
      container.innerHTML = '<p class="hint">Пока данных недостаточно.</p>';
      return;
    }
    const max = Math.max(...items.map((item) => Number(item.value || item.score || 0)), 1);
    container.innerHTML = items.map((item) => {
      const value = Number(item.value || item.score || 0);
      const width = Math.max(10, Math.round((value / max) * 100));
      const className = options.classNameFor ? options.classNameFor(item) : '';
      return `
        <div class="analytics-bar-row">
          <div class="analytics-bar-label">${escapeHtml(item.label)}</div>
          <div class="analytics-bar-track">
            <div class="analytics-bar-fill ${className}" style="width:${width}%"></div>
          </div>
          <div class="analytics-bar-value">${options.valueFormatter ? options.valueFormatter(item) : value}</div>
        </div>
      `;
    }).join('');
  }

  function renderAnalytics() {
    const analytics = dashboardState.analytics;
    if (!analytics) return;

    const summaryCards = [
      { label: 'Аудиторий', value: analytics.summary.totalRooms || 0, tone: 'info', trend: 'Общий охват инфраструктуры' },
      { label: 'Оборудования', value: analytics.summary.totalEquipment || 0, tone: 'dark', trend: 'Вся техника под контролем' },
      { label: 'Всего заявок', value: analytics.summary.totalComplaints || 0, tone: 'warning', trend: 'Текущий объем обращений' },
      { label: 'Среднее время ремонта', value: `${analytics.summary.avgRepairHours || 0} ч`, tone: 'success', trend: 'От подачи до исправления' }
    ];

    if (analyticsSummary) {
      analyticsSummary.innerHTML = summaryCards.map((item) => `
        <div class="analytics-stat" data-tone="${item.tone}">
          <div class="analytics-stat-label">${item.label}</div>
          <div class="analytics-stat-value">${item.value}</div>
          <div class="analytics-trend">${item.trend}</div>
        </div>
      `).join('');
    }

    renderAnalyticsBars(analyticsStatusChart, analytics.complaintStatuses || [], {
      classNameFor: (item) => item.label === 'на рассмотрении' ? 'warning' : (item.label === 'в ремонте' ? 'danger' : 'success')
    });
    renderAnalyticsBars(analyticsEquipmentChart, analytics.equipmentStatuses || [], {
      classNameFor: (item) => item.label === 'на рассмотрении' ? 'warning' : (item.label === 'в ремонте' ? 'danger' : 'success')
    });
    renderAnalyticsBars(analyticsTopEquipmentChart, analytics.topBrokenEquipment || [], { classNameFor: () => 'dark' });
    renderAnalyticsBars((analyticsReliabilityChart), (analytics.roomReliability || []).slice(0, 6).map((item) => ({
      label: item.roomName,
      score: item.score
    })), {
      classNameFor: () => 'success',
      valueFormatter: (item) => `${item.score} / 100`
    });

    if (analyticsRoomChart) {
      const rows = analytics.roomLoad || [];
      analyticsRoomChart.innerHTML = rows.length ? rows.map((room) => `
        <div class="room-analytics-item">
          <div class="room-analytics-top">
            <div class="room-analytics-name">${escapeHtml(room.roomName)}</div>
            <div class="room-analytics-meta">Открытых заявок: ${room.activeComplaints}</div>
          </div>
          <div class="room-analytics-tags">
            <span class="room-analytics-tag">Оборудование: ${room.equipmentCount}</span>
            <span class="room-analytics-tag">Всего заявок: ${room.totalComplaints}</span>
            <span class="room-analytics-tag">В архиве: ${room.archivedComplaints}</span>
          </div>
        </div>
      `).join('') : '<p class="hint">Пока нет данных по аудиториям.</p>';
    }
  }

  function applyDashboardFilters() {
    const roomsQuery = roomsSearchInput?.value?.trim().toLowerCase() || '';
    const complaintsQuery = complaintsSearchInput?.value?.trim().toLowerCase() || '';
    const complaintsStatus = complaintsStatusFilter?.value || '';
    const complaintsSort = complaintsSortSelect?.value || 'updated_desc';
    const archiveQuery = archiveSearchInput?.value?.trim().toLowerCase() || '';
    const archiveRoom = archiveRoomFilter?.value || '';
    const archiveFrom = archiveDateFrom?.value || '';
    const archiveTo = archiveDateTo?.value || '';
    const teachersQuery = teachersSearchInput?.value?.trim().toLowerCase() || '';
    const adminsQuery = adminsSearchInput?.value?.trim().toLowerCase() || '';

    const filteredRooms = dashboardState.rooms.filter((room) => room.name.toLowerCase().includes(roomsQuery));

    const activeComplaints = dashboardState.complaints
      .filter((item) => item.status !== 'исправлено')
      .filter((item) => {
        const haystack = `${item.room_name || ''} ${item.full_name || ''} ${item.equipment_name || ''} ${item.description || ''}`.toLowerCase();
        return (!complaintsQuery || haystack.includes(complaintsQuery)) && (!complaintsStatus || item.status === complaintsStatus);
      })
      .sort((a, b) => {
        if (complaintsSort === 'room_asc') return String(a.room_name || '').localeCompare(String(b.room_name || ''), 'ru');
        if (complaintsSort === 'status_asc') return String(a.status || '').localeCompare(String(b.status || ''), 'ru');
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      });

    const archivedComplaints = dashboardState.complaints
      .filter((item) => item.status === 'исправлено')
      .filter((item) => {
        const haystack = `${item.room_name || ''} ${item.full_name || ''} ${item.equipment_name || ''} ${item.description || ''}`.toLowerCase();
        const updatedDate = String(item.updated_at || '').slice(0, 10);
        const fromMatch = !archiveFrom || (updatedDate && updatedDate >= archiveFrom);
        const toMatch = !archiveTo || (updatedDate && updatedDate <= archiveTo);
        return (!archiveQuery || haystack.includes(archiveQuery)) && (!archiveRoom || item.room_name === archiveRoom) && fromMatch && toMatch;
      })
      .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

    const filteredTeachers = dashboardState.teachers.filter((item) => `${item.full_name} ${item.login} ${item.email || ''}`.toLowerCase().includes(teachersQuery));
    const filteredAdmins = dashboardState.admins.filter((item) => `${item.full_name} ${item.login} ${item.email || ''}`.toLowerCase().includes(adminsQuery));

    if (roomTableBody) {
      roomTableBody.innerHTML = filteredRooms.map((room) => `
        <tr data-id="${room.id}" data-name="${escapeHtml(room.name)}">
          <td>${room.id}</td>
          <td>${escapeHtml(room.name)}</td>
        </tr>
      `).join('');
    }
    if (roomsEmptyState) roomsEmptyState.hidden = filteredRooms.length > 0;

    if (complaintTableBody) {
      complaintTableBody.innerHTML = activeComplaints.map((item) => `
        <tr>
          <td>${item.id}</td>
          <td>${escapeHtml(item.room_name || '-')}</td>
          <td>${escapeHtml(item.full_name || '-')}</td>
          <td>${escapeHtml(item.equipment_name || '-')}</td>
          <td>${escapeHtml(item.assigned_admin_name || 'Не назначен')}</td>
          <td class="compl-desc">${escapeHtml(item.description || '-')}</td>
          <td>${statusBadge(item.status)}</td>
          <td>
            <select class="status-select" data-id="${item.id}">
              <option value="на рассмотрении" ${item.status === 'на рассмотрении' ? 'selected' : ''}>На рассмотрении</option>
              <option value="в ремонте" ${item.status === 'в ремонте' ? 'selected' : ''}>В ремонте</option>
              <option value="исправлено" ${item.status === 'исправлено' ? 'selected' : ''}>Исправлено</option>
            </select>
            <button class="btn btn-sm hover-highlight btn-status-save" data-id="${item.id}">Сохранить</button>
            <button class="btn btn-sm hover-highlight btn-open-complaint" data-id="${item.id}">Открыть</button>
          </td>
        </tr>
      `).join('');
    }
    if (complaintsEmptyState) complaintsEmptyState.hidden = activeComplaints.length > 0;

    if (archiveTableBody) {
      archiveTableBody.innerHTML = archivedComplaints.map((item) => `
        <tr>
          <td>${item.id}</td>
          <td>${escapeHtml(item.room_name || '-')}</td>
          <td>${escapeHtml(item.full_name || '-')}</td>
          <td>${escapeHtml(item.equipment_name || '-')}</td>
          <td>${escapeHtml(item.description || '-')}</td>
          <td>${escapeHtml(item.created_at || '-')}</td>
          <td>${escapeHtml(item.updated_at || '-')}</td>
          <td>
            <button class="btn btn-sm hover-highlight btn-open-complaint" data-id="${item.id}">Открыть</button>
            ${isMainAdmin() ? `<button class="btn btn-sm hover-highlight btn-archive-delete" data-id="${item.id}">Удалить</button>` : '<span class="hint">Только главный админ</span>'}
          </td>
        </tr>
      `).join('');
    }
    if (archiveEmptyState) archiveEmptyState.hidden = archivedComplaints.length > 0;

    if (teacherTableBody) {
      teacherTableBody.innerHTML = filteredTeachers.map((item) => `
        <tr data-id="${item.id}" data-user-type="teacher" data-full-name="${escapeHtml(item.full_name)}" data-login="${escapeHtml(item.login)}" data-email="${escapeHtml(item.email || '')}">
          <td>${item.id}</td>
          <td>${escapeHtml(item.full_name)}</td>
          <td>${escapeHtml(item.login)}</td>
          <td>
            <button class="btn btn-sm hover-highlight btn-user-edit" data-id="${item.id}" data-user-type="teacher">Карточка</button>
            <button class="btn btn-sm btn-danger btn-user-delete" data-id="${item.id}" data-user-type="teacher">Удалить</button>
          </td>
        </tr>
      `).join('');
    }
    if (teachersEmptyState) teachersEmptyState.hidden = filteredTeachers.length > 0;

    if (adminTableBody) {
      adminTableBody.innerHTML = filteredAdmins.map((item) => `
        <tr data-id="${item.id}" data-user-type="admin" data-full-name="${escapeHtml(item.full_name)}" data-login="${escapeHtml(item.login)}" data-email="${escapeHtml(item.email || '')}">
          <td>${item.id}</td>
          <td>${escapeHtml(item.full_name)}</td>
          <td>${escapeHtml(item.login)}</td>
          <td>${item.is_super_admin ? 'Главный' : 'Обычный'}</td>
          <td>
            ${item.is_super_admin
              ? '<span class="hint">Недоступно</span>'
              : `
                <button class="btn btn-sm hover-highlight btn-user-edit" data-id="${item.id}" data-user-type="admin">Карточка</button>
                <button class="btn btn-sm btn-danger btn-user-delete" data-id="${item.id}" data-user-type="admin">Удалить</button>
              `}
          </td>
        </tr>
      `).join('');
    }
    if (adminsEmptyState) adminsEmptyState.hidden = filteredAdmins.length > 0;
  }

  async function loadAdminDashboard() {
    const { ok, data } = await requestJSON('/admin/dashboard');
    if (!ok) return showToast(data.message || 'Не удалось загрузить админку', 'error', 'Ошибка');
    dashboardState.currentUser = data.currentUser || null;
    dashboardState.rooms = data.rooms || [];
    dashboardState.complaints = data.complaints || [];
    dashboardState.teachers = data.teachers || [];
    dashboardState.admins = data.admins || [];
    dashboardState.analytics = data.analytics || null;

    if (mainAdminSection) mainAdminSection.hidden = !isMainAdmin();
    if (archiveDeleteHint) archiveDeleteHint.hidden = isMainAdmin();
    if (teacherRoomsSelect) {
      teacherRoomsSelect.innerHTML = dashboardState.rooms.map((room) => `<option value="${room.id}">${escapeHtml(room.name)}</option>`).join('');
    }
    if (archiveRoomFilter) {
      archiveRoomFilter.innerHTML = '<option value="">Все аудитории</option>' + dashboardState.rooms.map((room) => `<option value="${escapeHtml(room.name)}">${escapeHtml(room.name)}</option>`).join('');
    }
    renderAnalytics();
    applyDashboardFilters();
  }

  async function submitUserCreate(form, role) {
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.role = role;
    payload.rooms = role === 'teacher' && teacherRoomsSelect
      ? Array.from(teacherRoomsSelect.selectedOptions).map((option) => option.value)
      : [];

    const { ok, data } = await requestJSON('/auth/register', jsonOptions('POST', payload));
    if (!ok) return showToast(data.message || 'Не удалось создать пользователя', 'error', 'Ошибка');
    form.reset();
    Array.from(teacherRoomsSelect?.options || []).forEach((option) => { option.selected = false; });
    showToast(role === 'admin' ? 'Администратор добавлен' : 'Преподаватель добавлен');
    await loadAdminDashboard();
  }

  async function loadAdminRoomPage() {
    const { roomId, roomName } = getQueryParams();
    const safeRoomName = roomName && roomName !== 'undefined' ? roomName : '';
    if (!roomId) return;
    const { ok, data } = await requestJSON(`/admin/rooms/${roomId}/data`);
    if (!ok) return showToast(data.message || 'Не удалось загрузить аудиторию', 'error', 'Ошибка');

    roomPageState.room = data.room || null;
    roomPageState.equipment = data.equipment || [];
    if (roomPageTitle) roomPageTitle.textContent = `Аудитория ${data.room?.name || safeRoomName || roomId}`;
    if (roomNameHeading) roomNameHeading.textContent = data.room?.name || safeRoomName || roomId;

    if (equipmentTableBody) {
      equipmentTableBody.innerHTML = roomPageState.equipment.map((eq) => `
        <tr data-id="${eq.id}">
          <td>${eq.id}</td>
          <td>${escapeHtml(eq.name)}</td>
          <td>${escapeHtml(eq.serial_number || '')}</td>
          <td>${escapeHtml(eq.purchase_date || '')}</td>
          <td>${statusBadge(eq.status || 'в работе')}</td>
          <td class="table-actions-cell">
            <button class="btn btn-sm hover-highlight btn-equipment-edit" data-id="${eq.id}">Редактировать</button>
            <button class="btn btn-sm btn-danger btn-equipment-delete" data-id="${eq.id}">Удалить</button>
          </td>
        </tr>
      `).join('');
    }

    if (roomTeachersTableBody) {
      roomTeachersTableBody.innerHTML = (data.roomTeachers || []).map((teacher) => `
        <tr>
          <td>${teacher.id}</td>
          <td>${escapeHtml(teacher.full_name)}</td>
          <td>${escapeHtml(teacher.login)}</td>
          <td><button class="btn btn-sm btn-danger btn-room-teacher-remove" data-id="${teacher.id}">Удалить</button></td>
        </tr>
      `).join('');
    }

    if (roomTeacherSelect) {
      roomTeacherSelect.innerHTML = (data.allTeachers || []).map((teacher) => `
        <option value="${teacher.id}">${escapeHtml(teacher.full_name)} (${escapeHtml(teacher.login)})</option>
      `).join('');
    }
  }

  function openEquipmentModal(equipment) {
    if (!equipmentEditModal || !equipmentEditForm) return;
    equipmentEditForm.elements.id.value = equipment.id;
    equipmentEditForm.elements.name.value = equipment.name || '';
    equipmentEditForm.elements.serial_number.value = equipment.serial_number || '';
    equipmentEditForm.elements.purchase_date.value = equipment.purchase_date || '';
    equipmentEditForm.elements.status.value = equipment.status || 'в работе';
    openModal(equipmentEditModal);
  }

  function openRoomModal() {
    if (!roomEditModal || !roomEditForm) return;
    roomEditForm.elements.name.value = roomPageState.room?.name || '';
    openModal(roomEditModal);
  }

  async function loadUserRooms() {
    const { ok, data } = await requestJSON('/user/rooms');
    if (!ok || !userRoomsTableBody) return;
    userRoomsTableBody.innerHTML = (data.rooms || []).map((room) => `
      <tr data-id="${room.id}" data-name="${escapeHtml(room.name)}">
        <td>${room.id}</td>
        <td>${escapeHtml(room.name)}</td>
      </tr>
    `).join('');
  }

  async function loadUserRoomEquipment() {
    const { roomId, roomName } = getQueryParams();
    const safeRoomName = roomName && roomName !== 'undefined' ? roomName : '';
    if (!roomId || !userEquipmentTableBody) return;
    if (userRoomTitle) userRoomTitle.textContent = `Аудитория ${safeRoomName || roomId}`;
    const { ok, data } = await requestJSON(`/user/rooms/${roomId}/equipment`);
    if (!ok) return;
    userEquipmentTableBody.innerHTML = (data.equipment || []).map((item) => {
      const lower = String(item.status || '').toLowerCase();
      const rowClass = lower === 'на рассмотрении' ? 'status-review' : (lower === 'в ремонте' ? 'status-repair' : '');
      return `
        <tr class="${rowClass}" data-id="${item.id}" data-name="${escapeHtml(item.name)}">
          <td>${item.id}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.serial_number || '')}</td>
          <td>${escapeHtml(item.purchase_date || '')}</td>
          <td>${statusBadge(item.status || 'в работе')}</td>
        </tr>
      `;
    }).join('');
  }

  async function loadNotifications() {
    if (!notificationBtn || !notificationList) return;
    const { ok, data } = await requestJSON('/notifications');
    if (!ok) return;
    const notifications = data.notifications || [];
    const isTeacherPage = Boolean(userRoomsTableBody || userEquipmentTableBody);

    if (notificationBadge) {
      notificationBadge.textContent = data.unreadCount || 0;
      notificationBadge.classList.toggle('has-unread', Number(data.unreadCount) > 0);
    }

    if (!notifications.length) {
      notificationList.innerHTML = '<p class="notification-empty">Нет уведомлений</p>';
      return;
    }

    notificationList.innerHTML = '';
    notifications.forEach((notif) => {
      const element = document.createElement('div');
      element.className = `notification-item ${notif.is_read === 0 ? 'unread' : ''} ${isTeacherPage ? 'static-note' : ''}`;
      element.innerHTML = `
        <div class="notification-content">
          <p class="notification-title">${escapeHtml(notif.title)}</p>
          <p class="notification-message">${escapeHtml(notif.message)}</p>
          <div class="notification-time">${escapeHtml(formatRelativeTime(notif.created_at))}</div>
          <div class="notification-type-badge ${escapeHtml(notif.type || 'info')}">
            ${notif.type === 'warning' ? 'Заявка' : (notif.type === 'success' ? 'Выполнено' : 'Обновление')}
          </div>
        </div>
      `;
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'notification-delete-btn';
      deleteBtn.type = 'button';
      deleteBtn.innerHTML = '×';
      deleteBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        await fetch(`/notifications/${notif.id}`, { method: 'DELETE' });
        loadNotifications();
      });
      element.appendChild(deleteBtn);

      element.addEventListener('click', async () => {
        if (notif.is_read === 0) {
          await fetch(`/notifications/${notif.id}/read`, { method: 'PUT' });
        }
        if (!isTeacherPage && notif.complaint_id) {
          const activeTab = document.querySelector('.tab.active')?.dataset?.tab;
          if (activeTab) sessionStorage.setItem('adminLastTab', activeTab);
          window.location.href = `/admin-complaint.html?id=${encodeURIComponent(notif.complaint_id)}`;
          return;
        }
        loadNotifications();
      });
      notificationList.appendChild(element);
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(loginForm).entries());
      const { ok, data } = await requestJSON('/auth/login', jsonOptions('POST', payload));
      if (!ok) return showToast(data.message || 'Ошибка входа', 'error', 'Ошибка');
      window.location.href = '/';
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await requestJSON('/auth/logout', jsonOptions('POST', {}));
      window.location.href = '/auth/login';
    });
  }

  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  if (tabs.length) {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((node) => node.classList.remove('active'));
        tabContents.forEach((node) => node.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
      });
    });
    const initialTab = getQueryParams().tab || sessionStorage.getItem('adminLastTab');
    if (initialTab) {
      Array.from(tabs).find((item) => item.dataset.tab === initialTab)?.click();
      sessionStorage.removeItem('adminLastTab');
    }
  }

  [
    roomsSearchInput,
    complaintsSearchInput,
    archiveSearchInput,
    archiveDateFrom,
    archiveDateTo,
    teachersSearchInput,
    adminsSearchInput
  ].forEach((input) => input?.addEventListener('input', applyDashboardFilters));
  [complaintsStatusFilter, complaintsSortSelect, archiveRoomFilter, archiveDateFrom, archiveDateTo].forEach((input) => input?.addEventListener('change', applyDashboardFilters));

  closeUserEditModal?.addEventListener('click', () => closeModal(userEditModal, userEditForm));
  cancelUserEditModal?.addEventListener('click', () => closeModal(userEditModal, userEditForm));
  userEditModal?.addEventListener('click', (event) => {
    if (event.target === userEditModal) closeModal(userEditModal, userEditForm);
  });

  if (userEditForm) {
    userEditForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(userEditForm).entries());
      const url = payload.user_type === 'admin' ? `/admin/admins/${payload.id}` : `/admin/teachers/${payload.id}`;
      const { ok, data } = await requestJSON(url, jsonOptions('PATCH', {
        full_name: payload.full_name,
        login: payload.login,
        email: payload.email || '',
        password: payload.password || ''
      }));
      if (!ok) return showToast(data.message || 'Не удалось сохранить пользователя', 'error', 'Ошибка');
      closeModal(userEditModal, userEditForm);
      showToast(data.message || 'Пользователь обновлен');
      await loadAdminDashboard();
    });
  }

  if (roomTableBody) {
    loadAdminDashboard().catch((err) => console.error(err));

    roomTableBody.addEventListener('click', (event) => {
      const tr = event.target.closest('tr');
      if (!tr) return;
      window.location.href = `/admin-room.html?roomId=${encodeURIComponent(tr.dataset.id)}&roomName=${encodeURIComponent(tr.dataset.name || '')}`;
    });

    complaintTableBody?.addEventListener('click', async (event) => {
      const saveBtn = event.target.closest('.btn-status-save');
      const openBtn = event.target.closest('.btn-open-complaint');
      if (openBtn) {
        sessionStorage.setItem('adminLastTab', 'errors');
        window.location.href = `/admin-complaint.html?id=${encodeURIComponent(openBtn.dataset.id)}`;
        return;
      }
      if (!saveBtn) return;
      const select = complaintTableBody.querySelector(`.status-select[data-id="${saveBtn.dataset.id}"]`);
      const { ok, data } = await requestJSON(`/admin/complaints/${saveBtn.dataset.id}/status`, jsonOptions('PATCH', { status: select.value }));
      if (!ok) return showToast(data.message || 'Не удалось обновить статус', 'error', 'Ошибка');
      showToast(data.message || 'Статус обновлен');
      await loadAdminDashboard();
    });

    archiveTableBody?.addEventListener('click', async (event) => {
      const openBtn = event.target.closest('.btn-open-complaint');
      const deleteBtn = event.target.closest('.btn-archive-delete');
      if (openBtn) {
        sessionStorage.setItem('adminLastTab', 'archive');
        window.location.href = `/admin-complaint.html?id=${encodeURIComponent(openBtn.dataset.id)}`;
        return;
      }
      if (!deleteBtn) return;
      const confirmed = await askConfirm({
        title: 'Удаление записи из архива',
        message: 'Эта запись будет удалена без возможности восстановления.',
        acceptLabel: 'Удалить'
      });
      if (!confirmed) return;
      const { ok, data } = await requestJSON(`/admin/archive/${deleteBtn.dataset.id}`, { method: 'DELETE' });
      if (!ok) return showToast(data.message || 'Не удалось удалить запись', 'error', 'Ошибка');
      showToast('Запись из архива удалена');
      await loadAdminDashboard();
    });

    const attachUserHandlers = (container) => {
      container?.addEventListener('click', async (event) => {
        const editBtn = event.target.closest('.btn-user-edit');
        const deleteBtn = event.target.closest('.btn-user-delete');
        if (editBtn) {
          const row = editBtn.closest('tr');
          openUserModal({
            id: editBtn.dataset.id,
            userType: editBtn.dataset.userType,
            fullName: row.dataset.fullName,
            login: row.dataset.login,
            email: row.dataset.email
          });
        }
        if (deleteBtn) {
          const confirmed = await askConfirm({
            title: 'Удаление пользователя',
            message: 'Пользователь будет удален из системы.',
            acceptLabel: 'Удалить'
          });
          if (!confirmed) return;
          const url = deleteBtn.dataset.userType === 'admin'
            ? `/admin/admins/${deleteBtn.dataset.id}`
            : `/admin/teachers/${deleteBtn.dataset.id}`;
          const { ok, data } = await requestJSON(url, { method: 'DELETE' });
          if (!ok) return showToast(data.message || 'Не удалось удалить пользователя', 'error', 'Ошибка');
          showToast(data.message || 'Пользователь удален');
          await loadAdminDashboard();
        }
      });
    };

    attachUserHandlers(teacherTableBody);
    attachUserHandlers(adminTableBody);
  }

  roomForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(roomForm).entries());
    const { ok, data } = await requestJSON('/admin/rooms', jsonOptions('POST', payload));
    if (!ok) return showToast(data.message || 'Не удалось создать аудиторию', 'error', 'Ошибка');
    roomForm.reset();
    showToast('Аудитория создана');
    await loadAdminDashboard();
  });

  teacherRegisterForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitUserCreate(teacherRegisterForm, 'teacher');
  });

  adminRegisterForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitUserCreate(adminRegisterForm, 'admin');
  });

  if (roomPageTitle) {
    loadAdminRoomPage().catch((err) => console.error(err));

    equipmentForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const { roomId } = getQueryParams();
      const payload = Object.fromEntries(new FormData(equipmentForm).entries());
      const { ok, data } = await requestJSON(`/admin/rooms/${roomId}/equipment`, jsonOptions('POST', payload));
      if (!ok) return showToast(data.message || 'Не удалось добавить оборудование', 'error', 'Ошибка');
      equipmentForm.reset();
      showToast('Оборудование добавлено');
      await loadAdminRoomPage();
    });

    equipmentTableBody?.addEventListener('click', async (event) => {
      const editBtn = event.target.closest('.btn-equipment-edit');
      const deleteBtn = event.target.closest('.btn-equipment-delete');
      if (editBtn) {
        const equipment = roomPageState.equipment.find((item) => Number(item.id) === Number(editBtn.dataset.id));
        if (equipment) openEquipmentModal(equipment);
        return;
      }
      if (!deleteBtn) return;
      const confirmed = await askConfirm({
        title: 'Удаление оборудования',
        message: 'Эта единица оборудования будет удалена.',
        acceptLabel: 'Удалить'
      });
      if (!confirmed) return;
      const { ok, data } = await requestJSON(`/admin/equipment/${deleteBtn.dataset.id}`, { method: 'DELETE' });
      if (!ok) return showToast(data.message || 'Не удалось удалить оборудование', 'error', 'Ошибка');
      showToast('Оборудование удалено');
      await loadAdminRoomPage();
    });

    equipmentEditForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(equipmentEditForm).entries());
      const { ok, data } = await requestJSON(`/admin/equipment/${payload.id}`, jsonOptions('PATCH', {
        name: payload.name,
        serial_number: payload.serial_number || '',
        purchase_date: payload.purchase_date || '',
        status: payload.status
      }));
      if (!ok) return showToast(data.message || 'Не удалось обновить оборудование', 'error', 'Ошибка');
      closeModal(equipmentEditModal, equipmentEditForm);
      showToast('Оборудование обновлено');
      await loadAdminRoomPage();
    });

    closeEquipmentEditModal?.addEventListener('click', () => closeModal(equipmentEditModal, equipmentEditForm));
    cancelEquipmentEditModal?.addEventListener('click', () => closeModal(equipmentEditModal, equipmentEditForm));
    equipmentEditModal?.addEventListener('click', (event) => {
      if (event.target === equipmentEditModal) closeModal(equipmentEditModal, equipmentEditForm);
    });

    editRoomBtn?.addEventListener('click', openRoomModal);
    closeRoomEditModal?.addEventListener('click', () => closeModal(roomEditModal, roomEditForm));
    cancelRoomEditModal?.addEventListener('click', () => closeModal(roomEditModal, roomEditForm));
    roomEditModal?.addEventListener('click', (event) => {
      if (event.target === roomEditModal) closeModal(roomEditModal, roomEditForm);
    });

    roomEditForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const { roomId } = getQueryParams();
      const payload = Object.fromEntries(new FormData(roomEditForm).entries());
      const { ok, data } = await requestJSON(`/admin/rooms/${roomId}`, jsonOptions('PATCH', payload));
      if (!ok) return showToast(data.message || 'Не удалось обновить аудиторию', 'error', 'Ошибка');
      closeModal(roomEditModal, roomEditForm);
      showToast('Название аудитории обновлено');
      await loadAdminRoomPage();
    });

    roomTeacherForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const { roomId } = getQueryParams();
      const payload = Object.fromEntries(new FormData(roomTeacherForm).entries());
      const { ok, data } = await requestJSON(`/admin/rooms/${roomId}/teachers`, jsonOptions('POST', payload));
      if (!ok) return showToast(data.message || 'Не удалось назначить преподавателя', 'error', 'Ошибка');
      showToast('Преподаватель добавлен в аудиторию');
      await loadAdminRoomPage();
    });

    roomTeachersTableBody?.addEventListener('click', async (event) => {
      const removeBtn = event.target.closest('.btn-room-teacher-remove');
      if (!removeBtn) return;
      const { roomId } = getQueryParams();
      const confirmed = await askConfirm({
        title: 'Удаление преподавателя',
        message: 'Преподаватель будет откреплен от аудитории.',
        acceptLabel: 'Удалить'
      });
      if (!confirmed) return;
      const { ok, data } = await requestJSON(`/admin/rooms/${roomId}/teachers/${removeBtn.dataset.id}`, { method: 'DELETE' });
      if (!ok) return showToast(data.message || 'Не удалось удалить преподавателя', 'error', 'Ошибка');
      showToast('Преподаватель удален из аудитории');
      await loadAdminRoomPage();
    });

    deleteRoomBtn?.addEventListener('click', async () => {
      const { roomId } = getQueryParams();
      const confirmed = await askConfirm({
        title: 'Удаление аудитории',
        message: 'Будут удалены аудитория и все связанные данные.',
        acceptLabel: 'Удалить аудиторию'
      });
      if (!confirmed) return;
      const { ok, data } = await requestJSON(`/admin/rooms/${roomId}`, { method: 'DELETE' });
      if (!ok) return showToast(data.message || 'Не удалось удалить аудиторию', 'error', 'Ошибка');
      window.location.href = '/';
    });
  }

  if (userRoomsTableBody) {
    loadUserRooms().catch((err) => console.error(err));
    userRoomsTableBody.addEventListener('click', (event) => {
      const tr = event.target.closest('tr');
      if (!tr) return;
      window.location.href = `/user-room.html?roomId=${encodeURIComponent(tr.dataset.id)}&roomName=${encodeURIComponent(tr.dataset.name || '')}`;
    });
  }

  if (userEquipmentTableBody) {
    loadUserRoomEquipment().catch((err) => console.error(err));
    setInterval(() => loadUserRoomEquipment().catch((err) => console.error(err)), 8000);
    userEquipmentTableBody.addEventListener('click', (event) => {
      const tr = event.target.closest('tr');
      if (!tr) return;
      if (tr.classList.contains('status-review') || tr.classList.contains('status-repair')) {
        return showToast('По этому оборудованию уже есть активная заявка или оно в ремонте', 'warning', 'Недоступно');
      }
      document.getElementById('complaintRoomId').value = getQueryParams().roomId || '';
      document.getElementById('complaintEquipmentId').value = tr.dataset.id || '';
      document.getElementById('complaintEquipmentName').value = tr.dataset.name || '';
      Array.from(userEquipmentTableBody.querySelectorAll('tr')).forEach((row) => row.classList.remove('selected'));
      tr.classList.add('selected');
    });
  }

  complaintForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const roomId = document.getElementById('complaintRoomId')?.value;
    const equipmentId = document.getElementById('complaintEquipmentId')?.value;
    const description = complaintForm.querySelector('textarea[name="description"]')?.value || '';
    if (!roomId || !equipmentId) return showToast('Сначала выберите оборудование', 'warning', 'Внимание');
    if (description.length < 5) return showToast('Описание должно быть минимум 5 символов', 'warning', 'Внимание');

    const response = await fetch('/complaints', { method: 'POST', body: new FormData(complaintForm) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return showToast(data.message || 'Не удалось отправить заявку', 'error', 'Ошибка');
    complaintForm.reset();
    showToast('Заявка отправлена');
    await loadUserRoomEquipment();
  });

  if (notificationBtn) {
    notificationBtn.addEventListener('click', () => notificationDropdown?.classList.toggle('open'));
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.notification-bell')) notificationDropdown?.classList.remove('open');
    });
    markAllReadBtn?.addEventListener('click', async (event) => {
      event.stopPropagation();
      await fetch('/notifications/read/all', { method: 'PUT' });
      loadNotifications();
    });
    loadNotifications().catch((err) => console.error(err));
    setInterval(() => loadNotifications().catch((err) => console.error(err)), 30000);
  }
});
