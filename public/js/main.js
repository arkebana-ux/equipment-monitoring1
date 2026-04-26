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
  const normalized = String(dateValue).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    const sqliteUtc = new Date(normalized.replace(' ', 'T') + 'Z');
    if (!Number.isNaN(sqliteUtc.getTime())) return sqliteUtc;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const dateOnly = new Date(`${normalized}T00:00:00`);
    if (!Number.isNaN(dateOnly.getTime())) return dateOnly;
  }
  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) return direct;
  const fallback = new Date(normalized.replace(' ', 'T') + 'Z');
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
  if (diffMin < 1) return '\u0442\u043e\u043b\u044c\u043a\u043e \u0447\u0442\u043e';
  if (diffMin < 60) return `${diffMin} \u043c\u0438\u043d \u043d\u0430\u0437\u0430\u0434`;
  if (diffHour < 24) return `${diffHour} \u0447 \u043d\u0430\u0437\u0430\u0434`;
  if (diffDay < 7) return `${diffDay} \u0434\u043d \u043d\u0430\u0437\u0430\u0434`;
  return date.toLocaleDateString('ru-RU');
}

function statusBadge(status) {
  const value = String(status || '').toLowerCase();
  if (value === '\u043d\u0430 \u0440\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u0438') {
    return '<span class="status-badge status-review-badge">\u041d\u0430 \u0440\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u0438</span>';
  }
  if (value === '\u0432 \u0440\u0435\u043c\u043e\u043d\u0442\u0435') {
    return '<span class="status-badge status-repair-badge">\u0412 \u0440\u0435\u043c\u043e\u043d\u0442\u0435</span>';
  }
  if (value === '\u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e' || value === '\u0432 \u0440\u0430\u0431\u043e\u0442\u0435') {
    return `<span class="status-badge status-fixed-badge">${escapeHtml(status || '\u0412 \u0440\u0430\u0431\u043e\u0442\u0435')}</span>`;
  }
  return `<span class="status-badge">${escapeHtml(status || '\u0411\u0435\u0437 \u0441\u0442\u0430\u0442\u0443\u0441\u0430')}</span>`;
}

function formatDateLabel(dateValue) {
  const date = parseDate(dateValue);
  if (!date) return '\u2014';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const topbarBrand = document.querySelector('.topbar-brand');
  const topbarEyebrow = topbarBrand?.querySelector('.eyebrow');
  const topbarHeading = topbarBrand?.querySelector('h1');
  const topbarSubtitle = topbarBrand?.querySelector('.topbar-subtitle');

  if (document.body.classList.contains('dashboard-page')) {
    document.title = '\u0410\u0443\u0434\u0438\u0442\u043e\u0440\u043d\u044b\u0439 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c';
    if (topbarEyebrow) topbarEyebrow.textContent = '\u0411\u0410\u0413\u0421\u0423 \u2022 \u0410\u0443\u0434\u0438\u0442\u043e\u0440\u043d\u044b\u0439 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c';
    if (topbarHeading) topbarHeading.textContent = '\u0421\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f \u0432 \u0443\u0447\u0435\u0431\u043d\u044b\u0445 \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u044f\u0445';
    if (topbarSubtitle) topbarSubtitle.textContent = '\u0417\u0430\u044f\u0432\u043a\u0438, \u0430\u0440\u0445\u0438\u0432, \u0430\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0430 \u0438 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u043f\u043e \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u044f\u043c \u0411\u0430\u0448\u043a\u0438\u0440\u0441\u043a\u043e\u0439 \u0430\u043a\u0430\u0434\u0435\u043c\u0438\u0438 \u0433\u043e\u0441\u0443\u0434\u0430\u0440\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0439 \u0441\u043b\u0443\u0436\u0431\u044b \u0438 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f.';
  }


  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const roomForm = document.getElementById('roomForm');
  const teacherRegisterForm = document.getElementById('teacherRegisterForm');
  const adminRegisterForm = document.getElementById('adminRegisterForm');
  const complaintForm = document.getElementById('complaintForm');

  const roomTableBody = document.getElementById('roomTableBody');
  const roomsCardGrid = document.getElementById('roomsCardGrid');
  const complaintTableBody = document.getElementById('complaintTableBody');
  const archiveTableBody = document.getElementById('archiveTableBody');
  const teacherTableBody = document.getElementById('teacherTableBody');
  const adminTableBody = document.getElementById('adminTableBody');
  const mainAdminSection = document.getElementById('mainAdminSection');
  const teacherRoomsSelect = document.getElementById('teacherRoomsSelect');
  const archiveDeleteHint = document.getElementById('archiveDeleteHint');

  const analyticsSummary = document.getElementById('analyticsSummary');
  const roomOverviewStats = document.getElementById('roomOverviewStats');
  const complaintsSummary = document.getElementById('complaintsSummary');
  const archiveSummary = document.getElementById('archiveSummary');
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
  const archiveRoomDropdown = document.getElementById('archiveRoomDropdown');
  const archiveRoomDropdownBtn = document.getElementById('archiveRoomDropdownBtn');
  const archiveRoomDropdownPanel = document.getElementById('archiveRoomDropdownPanel');
  const archiveDateFrom = document.getElementById('archiveDateFrom');
  const archiveDateTo = document.getElementById('archiveDateTo');
  const archiveSortSelect = document.getElementById('archiveSortSelect');
  const archiveBulkDeleteBtn = document.getElementById('archiveBulkDeleteBtn');
  const archiveSelectHeader = document.getElementById('archiveSelectHeader');
  const archiveSelectAll = document.getElementById('archiveSelectAll');
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
  const roomQuickStats = document.getElementById('roomQuickStats');
  const roomIdentityCard = document.getElementById('roomIdentityCard');
  const roomRecentComplaints = document.getElementById('roomRecentComplaints');
  const editRoomBtn = document.getElementById('editRoomBtn');
  const equipmentForm = document.getElementById('equipmentForm');
  const equipmentTableBody = document.getElementById('equipmentTableBody');
  const roomTeachersTableBody = document.getElementById('roomTeachersTableBody');
  const roomTeacherForm = document.getElementById('roomTeacherForm');
  const roomTeacherSearch = document.getElementById('roomTeacherSearch');
  const roomTeacherOptions = document.getElementById('roomTeacherOptions');
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
    analytics: null,
    roomInsights: [],
    archiveRoomFilters: [],
    archiveSelectedIds: new Set()
  };

  const roomPageState = {
    room: null,
    equipment: [],
    roomTeachers: [],
    allTeachers: [],
    recentComplaints: [],
    summary: null,
    pendingTeacherIds: new Set()
  };

  const isMainAdmin = () => Boolean(dashboardState.currentUser?.is_super_admin);

  function showToast(message, type = 'success', title = '\u0413\u043e\u0442\u043e\u0432\u043e') {
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

  function askConfirm({ title, message, acceptLabel = '\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c' }) {
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

  function getArchiveRoomFilters() {
    return dashboardState.archiveRoomFilters || [];
  }

  function updateArchiveRoomButtonLabel() {
    if (!archiveRoomDropdownBtn) return;
    const selected = getArchiveRoomFilters();
    if (!selected.length) {
      archiveRoomDropdownBtn.textContent = '\u0410\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0438: \u0432\u0441\u0435';
      return;
    }
    if (selected.length <= 2) {
      archiveRoomDropdownBtn.textContent = `\u0410\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0438: ${selected.join(', ')}`;
      return;
    }
    archiveRoomDropdownBtn.textContent = `\u0410\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0438: \u0432\u044b\u0431\u0440\u0430\u043d\u043e ${selected.length}`;
  }

  function renderArchiveRoomDropdown() {
    if (!archiveRoomDropdownPanel) return;
    archiveRoomDropdownPanel.innerHTML = `
      <div class="checkbox-list">
        ${dashboardState.rooms.map((room) => `
          <label class="checkbox-item">
            <input class="archive-room-checkbox" type="checkbox" value="${escapeHtml(room.name)}" ${getArchiveRoomFilters().includes(String(room.name)) ? 'checked' : ''} />
            <span></span>
            <strong class="checkbox-item-label">${escapeHtml(room.name)}</strong>
          </label>
        `).join('')}
      </div>
    `;
    updateArchiveRoomButtonLabel();
  }

  function renderMiniStats(container, items) {
    if (!container) return;
    container.innerHTML = items.map((item) => `
      <div class="mini-stat">
        <div class="mini-stat-label">${escapeHtml(item.label)}</div>
        <div class="mini-stat-value">${escapeHtml(item.value)}</div>
        <div class="mini-stat-hint">${escapeHtml(item.hint || '')}</div>
      </div>
    `).join('');
  }

  function resolveRoomCardStatus(roomInsight) {
    const active = Number(roomInsight.active_complaints || 0);
    if (active >= 3) return { label: '\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u044f', className: 'danger' };
    if (active >= 1) return { label: '\u0415\u0441\u0442\u044c \u043e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u044f', className: 'warning' };
    return { label: '\u0417\u0430\u044f\u0432\u043e\u043a \u043d\u0435\u0442', className: 'success' };
  }

  function renderAnalytics() {
    const analytics = dashboardState.analytics;
    if (!analytics) return;

    const summaryCards = [
      { label: '\u0410\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0439', value: analytics.summary.totalRooms || 0, tone: 'info', trend: '\u041e\u0431\u0449\u0438\u0439 \u043e\u0445\u0432\u0430\u0442 \u0443\u0447\u0435\u0431\u043d\u043e\u0433\u043e \u0444\u043e\u043d\u0434\u0430', accent: '\u041a\u0430\u0431\u0438\u043d\u0435\u0442\u044b \u043f\u043e\u0434 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u0435\u043c' },
      { label: '\u0415\u0434\u0438\u043d\u0438\u0446 \u0442\u0435\u0445\u043d\u0438\u043a\u0438', value: analytics.summary.totalEquipment || 0, tone: 'dark', trend: '\u0412\u0441\u044f \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430 \u043f\u043e \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u044f\u043c', accent: '\u041e\u0442 \u041f\u041a \u0434\u043e \u043c\u0443\u043b\u044c\u0442\u0438\u043c\u0435\u0434\u0438\u0430' },
      { label: '\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u0437\u043e\u043d \u0440\u0438\u0441\u043a\u0430', value: (analytics.roomLoad || []).filter((room) => Number(room.activeComplaints || 0) > 0).length, tone: 'warning', trend: '\u0410\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0438, \u0433\u0434\u0435 \u043d\u0443\u0436\u043d\u043e \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u0435', accent: '\u0411\u044b\u0441\u0442\u0440\u044b\u0439 \u0441\u0440\u0435\u0437 \u043f\u043e \u0440\u0438\u0441\u043a\u0430\u043c' },
      { label: '\u0421\u0440\u0435\u0434\u043d\u0435\u0435 \u0432\u0440\u0435\u043c\u044f \u0440\u0435\u043c\u043e\u043d\u0442\u0430', value: `${analytics.summary.avgRepairHours || 0} \u0447`, tone: 'success', trend: '\u041e\u0442 \u043f\u043e\u0434\u0430\u0447\u0438 \u0434\u043e \u0437\u0430\u043a\u0440\u044b\u0442\u0438\u044f', accent: '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c \u0440\u0435\u0430\u043a\u0446\u0438\u0438 \u0441\u0438\u0441\u0442\u0435\u043c\u044b' }
    ];

    if (analyticsSummary) {
      analyticsSummary.innerHTML = summaryCards.map((item) => `
        <div class="analytics-stat" data-tone="${item.tone}">
          <div class="analytics-stat-kicker">\u0421\u0432\u043e\u0434\u043a\u0430</div>
          <div class="analytics-stat-label">${item.label}</div>
          <div class="analytics-stat-value">${item.value}</div>
          <div class="analytics-trend">${item.trend}</div>
          <div class="analytics-stat-accent">${item.accent}</div>
        </div>
      `).join('');
    }

    renderAnalyticsBars(analyticsStatusChart, analytics.complaintStatuses || [], {
      classNameFor: (item) => item.label === '\u043d\u0430 \u0440\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u0438' ? 'warning' : (item.label === '\u0432 \u0440\u0435\u043c\u043e\u043d\u0442\u0435' ? 'danger' : 'success')
    });
    renderAnalyticsBars(analyticsEquipmentChart, analytics.equipmentStatuses || [], {
      classNameFor: (item) => item.label === '\u043d\u0430 \u0440\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u0438' ? 'warning' : (item.label === '\u0432 \u0440\u0435\u043c\u043e\u043d\u0442\u0435' ? 'danger' : 'success')
    });
    renderAnalyticsBars(analyticsTopEquipmentChart, analytics.topBrokenEquipment || [], { classNameFor: () => 'accent' });
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
            <div class="room-analytics-name">\u0410\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u044f ${escapeHtml(room.roomName)}</div>
            <div class="room-analytics-meta">${Math.max(0, 100 - (room.activeComplaints * 18) - (room.totalComplaints * 6))}% \u0443\u0441\u0442\u043e\u0439\u0447\u0438\u0432\u043e\u0441\u0442\u0438</div>
          </div>
          <div class="room-analytics-tags">
            <span class="room-analytics-tag">\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435: ${room.equipmentCount}</span>
            <span class="room-analytics-tag">\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435: ${room.activeComplaints}</span>
            <span class="room-analytics-tag">\u0418\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e: ${room.archivedComplaints}</span>
          </div>
          <p>${room.activeComplaints === 0 ? '\u041a\u0430\u0431\u0438\u043d\u0435\u0442 \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u0441\u0442\u0430\u0431\u0438\u043b\u044c\u043d\u043e, \u043e\u0442\u043a\u0440\u044b\u0442\u044b\u0445 \u043e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u0439 \u0441\u0435\u0439\u0447\u0430\u0441 \u043d\u0435\u0442.' : `\u0421\u0435\u0439\u0447\u0430\u0441 \u0432 \u0440\u0430\u0431\u043e\u0442\u0435 ${room.activeComplaints} \u043e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u0439. \u0418\u0441\u0442\u043e\u0440\u0438\u0447\u0435\u0441\u043a\u0438 \u043f\u043e \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0438 \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u043e ${room.totalComplaints} \u0437\u0430\u044f\u0432\u043e\u043a.`}</p>
        </div>
      `).join('') : '<p class="hint">\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u043f\u043e \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u044f\u043c.</p>';
    }
  }

  function applyDashboardFilters() {
    const roomsQuery = roomsSearchInput?.value?.trim().toLowerCase() || '';
    const complaintsQuery = complaintsSearchInput?.value?.trim().toLowerCase() || '';
    const complaintsStatus = complaintsStatusFilter?.value || '';
    const complaintsSort = complaintsSortSelect?.value || 'review_first';
    const archiveQuery = archiveSearchInput?.value?.trim().toLowerCase() || '';
    const archiveRooms = getArchiveRoomFilters();
    const archiveFrom = archiveDateFrom?.value || '';
    const archiveTo = archiveDateTo?.value || '';
    const archiveSort = archiveSortSelect?.value || 'closed_desc';
    const teachersQuery = teachersSearchInput?.value?.trim().toLowerCase() || '';
    const adminsQuery = adminsSearchInput?.value?.trim().toLowerCase() || '';

    const filteredRooms = (dashboardState.roomInsights || []).filter((room) => String(room.name || '').toLowerCase().includes(roomsQuery));

    const activeComplaints = dashboardState.complaints
      .filter((item) => item.status !== 'исправлено')
      .filter((item) => {
        const haystack = `${item.room_name || ''} ${item.full_name || ''} ${item.equipment_name || ''} ${item.description || ''}`.toLowerCase();
        return (!complaintsQuery || haystack.includes(complaintsQuery)) && (!complaintsStatus || item.status === complaintsStatus);
      })
      .sort((a, b) => {
        if (complaintsSort === 'review_first') {
          const order = { '\u043d\u0430 \u0440\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u0438': 0, '\u0432 \u0440\u0435\u043c\u043e\u043d\u0442\u0435': 1 };
          const byStatus = (order[a.status] ?? 9) - (order[b.status] ?? 9);
          if (byStatus !== 0) return byStatus;
          return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
        }
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
        const roomMatch = !archiveRooms.length || archiveRooms.includes(item.room_name);
        return (!archiveQuery || haystack.includes(archiveQuery)) && roomMatch && fromMatch && toMatch;
      })
      .sort((a, b) => {
        if (archiveSort === 'closed_asc') return new Date(a.updated_at || 0) - new Date(b.updated_at || 0);
        if (archiveSort === 'created_desc') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        if (archiveSort === 'room_asc') return String(a.room_name || '').localeCompare(String(b.room_name || ''), 'ru');
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      });

    const filteredTeachers = dashboardState.teachers.filter((item) => `${item.full_name} ${item.login} ${item.email || ''}`.toLowerCase().includes(teachersQuery));
    const filteredAdmins = dashboardState.admins.filter((item) => `${item.full_name} ${item.login} ${item.email || ''}`.toLowerCase().includes(adminsQuery));

    const visibleArchiveIds = new Set(archivedComplaints.map((item) => Number(item.id)));
    dashboardState.archiveSelectedIds = new Set(
      Array.from(dashboardState.archiveSelectedIds).filter((id) => visibleArchiveIds.has(Number(id)))
    );

    renderMiniStats(roomOverviewStats, [
      { label: '\u0410\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0439', value: String(dashboardState.rooms.length), hint: '\u0412\u0441\u0435\u0433\u043e \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u043e\u0432 \u043f\u043e\u0434 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u0435\u043c' },
      { label: '\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0437\u0430\u044f\u0432\u043a\u0438', value: String(dashboardState.complaints.filter((item) => item.status !== '\u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e').length), hint: '\u0422\u0440\u0435\u0431\u0443\u044e\u0442 \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u044f \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u043e\u0432' },
      { label: '\u0410\u0440\u0445\u0438\u0432', value: String(dashboardState.complaints.filter((item) => item.status === '\u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e').length), hint: '\u0417\u0430\u043a\u0440\u044b\u0442\u044b\u0435 \u043e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u044f \u043f\u043e \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044e' },
      { label: '\u041f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u0438', value: String(dashboardState.teachers.length), hint: '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438 \u0441 \u0437\u0430\u043a\u0440\u0435\u043f\u043b\u0435\u043d\u043d\u044b\u043c\u0438 \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u044f\u043c\u0438' }
    ]);

    if (roomsCardGrid) {
      roomsCardGrid.innerHTML = filteredRooms.map((room) => {
        const roomStatus = resolveRoomCardStatus(room);
        return `
          <article class="room-card" data-id="${room.id}" data-name="${escapeHtml(room.name)}">
            <div class="room-card-head">
              <div>
                <h3 class="room-card-title">${escapeHtml(room.name)}</h3>
              </div>
              <span class="room-card-status ${roomStatus.className}">${escapeHtml(roomStatus.label)}</span>
            </div>
            <div class="room-card-metrics">
              <div class="room-card-metric">
                <strong>${Number(room.equipment_count || 0)}</strong>
                <span>\u0435\u0434\u0438\u043d\u0438\u0446 \u0442\u0435\u0445\u043d\u0438\u043a\u0438</span>
              </div>
              <div class="room-card-metric">
                <strong>${Number(room.teacher_count || 0)}</strong>
                <span>\u043f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u0435\u0439</span>
              </div>
              <div class="room-card-metric">
                <strong>${Number(room.active_complaints || 0)}</strong>
                <span>\u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u043e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u0439</span>
              </div>
              <div class="room-card-metric">
                <strong>${Number(room.total_complaints || 0)}</strong>
                <span>\u0437\u0430 \u0432\u0441\u0451 \u0432\u0440\u0435\u043c\u044f</span>
              </div>
            </div>
            <div class="room-card-footer">
              <span>\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043f\u0430\u0441\u043f\u043e\u0440\u0442 \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0438</span>
            </div>
          </article>
        `;
      }).join('');
    }
    if (roomTableBody) {
      roomTableBody.innerHTML = filteredRooms.map((room) => `
        <tr data-id="${room.id}" data-name="${escapeHtml(room.name)}">
          <td>${room.id}</td>
          <td>${escapeHtml(room.name)}</td>
        </tr>
      `).join('');
    }
    if (roomsEmptyState) roomsEmptyState.hidden = filteredRooms.length > 0;

    renderMiniStats(complaintsSummary, [
      { label: '\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435', value: String(activeComplaints.length), hint: '\u0412\u0441\u0435 \u043e\u0442\u043a\u0440\u044b\u0442\u044b\u0435 \u043e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u044f \u043f\u043e\u0441\u043b\u0435 \u0444\u0438\u043b\u044c\u0442\u0440\u0430\u0446\u0438\u0438' },
      { label: '\u041d\u0430 \u0440\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u0438', value: String(activeComplaints.filter((item) => item.status === '\u043d\u0430 \u0440\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u0438').length), hint: '\u041e\u0436\u0438\u0434\u0430\u044e\u0442 \u0440\u0435\u0448\u0435\u043d\u0438\u044f \u0438\u043b\u0438 \u0434\u0438\u0430\u0433\u043d\u043e\u0441\u0442\u0438\u043a\u0438' },
      { label: '\u0412 \u0440\u0435\u043c\u043e\u043d\u0442\u0435', value: String(activeComplaints.filter((item) => item.status === '\u0432 \u0440\u0435\u043c\u043e\u043d\u0442\u0435').length), hint: '\u0422\u0435\u0445\u043d\u0438\u043a\u0430 \u043f\u0435\u0440\u0435\u0434\u0430\u043d\u0430 \u0432 \u0440\u0430\u0431\u043e\u0442\u0443' },
      { label: '\u0410\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0439 \u0441 \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0430\u043c\u0438', value: String(new Set(activeComplaints.map((item) => item.room_name)).size), hint: '\u041a\u0430\u0431\u0438\u043d\u0435\u0442\u044b \u0441 \u0442\u0435\u043a\u0443\u0449\u0438\u043c\u0438 \u043e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u044f\u043c\u0438' }
    ]);

    if (complaintTableBody) {
      complaintTableBody.innerHTML = activeComplaints.map((item) => `
        <tr>
          <td>${item.id}</td>
          <td>${escapeHtml(item.room_name || '-')}</td>
          <td>${escapeHtml(item.full_name || '-')}</td>
          <td>${escapeHtml(item.equipment_name || '-')}</td>
          <td>${escapeHtml(item.assigned_admin_name || '\u041d\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d')}</td>
          <td class="compl-desc">${escapeHtml(item.description || '-')}</td>
          <td>${statusBadge(item.status)}</td>
          <td class="table-actions-cell">
            <div class="action-stack">
              <select class="status-select toolbar-input" data-id="${item.id}">
                <option value="\u043d\u0430 \u0440\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u0438" ${item.status === '\u043d\u0430 \u0440\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u0438' ? 'selected' : ''}>\u041d\u0430 \u0440\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u0438</option>
                <option value="\u0432 \u0440\u0435\u043c\u043e\u043d\u0442\u0435" ${item.status === '\u0432 \u0440\u0435\u043c\u043e\u043d\u0442\u0435' ? 'selected' : ''}>\u0412 \u0440\u0435\u043c\u043e\u043d\u0442\u0435</option>
              </select>
              <button class="btn btn-sm hover-highlight btn-status-save" data-id="${item.id}">\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c</button>
              <button class="btn btn-sm btn-success btn-mark-fixed" data-id="${item.id}">\u041f\u043e\u0447\u0438\u043d\u0435\u043d\u043e</button>
              <button class="btn btn-sm hover-highlight btn-open-complaint" data-id="${item.id}">\u041e\u0442\u043a\u0440\u044b\u0442\u044c</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
    if (complaintsEmptyState) complaintsEmptyState.hidden = activeComplaints.length > 0;

    if (archiveTableBody) {
      archiveTableBody.innerHTML = archivedComplaints.map((item) => `
        <tr>
          <td>${item.id}</td>
          ${isMainAdmin() ? `
            <td>
              <label class="check-cell">
                <input class="archive-row-checkbox" type="checkbox" data-id="${item.id}" ${dashboardState.archiveSelectedIds.has(Number(item.id)) ? 'checked' : ''} />
                <span></span>
              </label>
            </td>
          ` : ''}
          <td>${escapeHtml(item.room_name || '-')}</td>
          <td>${escapeHtml(item.full_name || '-')}</td>
          <td>${escapeHtml(item.equipment_name || '-')}</td>
          <td>${escapeHtml(item.description || '-')}</td>
          <td>${escapeHtml(item.created_at || '-')}</td>
          <td>${escapeHtml(item.updated_at || '-')}</td>
          <td class="table-actions-cell">
            <div class="action-stack">
              <button class="btn btn-sm hover-highlight btn-open-complaint" data-id="${item.id}">\u041e\u0442\u043a\u0440\u044b\u0442\u044c</button>
              ${isMainAdmin() ? `<button class="btn btn-sm btn-danger btn-archive-delete" data-id="${item.id}">\u0423\u0434\u0430\u043b\u0438\u0442\u044c</button>` : '<span class="hint">\u0422\u043e\u043b\u044c\u043a\u043e \u0433\u043b\u0430\u0432\u043d\u044b\u0439 \u0430\u0434\u043c\u0438\u043d</span>'}
            </div>
          </td>
        </tr>
      `).join('');
    }
    if (archiveSelectHeader) archiveSelectHeader.hidden = !isMainAdmin();
    if (archiveBulkDeleteBtn) archiveBulkDeleteBtn.hidden = !isMainAdmin();
    if (archiveSelectAll) {
      const visibleCount = archivedComplaints.length;
      const selectedVisibleCount = archivedComplaints.filter((item) => dashboardState.archiveSelectedIds.has(Number(item.id))).length;
      archiveSelectAll.checked = visibleCount > 0 && visibleCount === selectedVisibleCount;
    }
    if (archiveEmptyState) archiveEmptyState.hidden = archivedComplaints.length > 0;

    renderMiniStats(archiveSummary, [
      { label: '\u0412 \u0430\u0440\u0445\u0438\u0432\u0435', value: String(archivedComplaints.length), hint: '\u0417\u0430\u043a\u0440\u044b\u0442\u044b\u0435 \u0437\u0430\u044f\u0432\u043a\u0438 \u043f\u043e\u0441\u043b\u0435 \u0444\u0438\u043b\u044c\u0442\u0440\u0430\u0446\u0438\u0438' },
      { label: '\u0410\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0439', value: String(new Set(archivedComplaints.map((item) => item.room_name)).size), hint: '\u041a\u0430\u0431\u0438\u043d\u0435\u0442\u044b \u0441 \u0437\u0430\u043a\u0440\u044b\u0442\u044b\u043c\u0438 \u043e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u044f\u043c\u0438' },
      { label: '\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435', value: String(new Set(archivedComplaints.map((item) => item.equipment_name)).size), hint: '\u0415\u0434\u0438\u043d\u0438\u0446 \u0442\u0435\u0445\u043d\u0438\u043a\u0438 \u0441 \u0438\u0441\u0442\u043e\u0440\u0438\u0435\u0439 \u043e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u0439' },
      { label: '\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0435 \u0437\u0430\u043a\u0440\u044b\u0442\u0438\u0435', value: archivedComplaints[0]?.updated_at ? formatDateLabel(archivedComplaints[0].updated_at) : '\u2014', hint: '\u0421\u0430\u043c\u0430\u044f \u0441\u0432\u0435\u0436\u0430\u044f \u0437\u0430\u043f\u0438\u0441\u044c \u0430\u0440\u0445\u0438\u0432\u0430' }
    ]);

    if (teacherTableBody) {
      teacherTableBody.innerHTML = filteredTeachers.map((item) => `
        <tr data-id="${item.id}" data-user-type="teacher" data-full-name="${escapeHtml(item.full_name)}" data-login="${escapeHtml(item.login)}" data-email="${escapeHtml(item.email || '')}">
          <td>${item.id}</td>
          <td>${escapeHtml(item.full_name)}</td>
          <td>${escapeHtml(item.login)}</td>
          <td>
            <button class="btn btn-sm hover-highlight btn-user-edit" data-id="${item.id}" data-user-type="teacher">\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0430</button>
            <button class="btn btn-sm btn-danger btn-user-delete" data-id="${item.id}" data-user-type="teacher">\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u0435</button>
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
          <td>${item.is_super_admin ? '\u0413\u043b\u0430\u0432\u043d\u044b\u0439' : '\u041e\u0431\u044b\u0447\u043d\u044b\u0439'}</td>
          <td>
            ${item.is_super_admin
              ? '<span class="hint">\u041d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e</span>'
              : `
                <button class="btn btn-sm hover-highlight btn-user-edit" data-id="${item.id}" data-user-type="admin">\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0430</button>
                <button class="btn btn-sm btn-danger btn-user-delete" data-id="${item.id}" data-user-type="admin">\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u0435</button>
              `}
          </td>
        </tr>
      `).join('');
    }
    if (adminsEmptyState) adminsEmptyState.hidden = filteredAdmins.length > 0;
  }

  async function loadAdminDashboard() {
    const { ok, data } = await requestJSON('/admin/dashboard');
    if (!ok) return showToast(data.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0430\u0434\u043c\u0438\u043d\u043a\u0443', 'error', '\u041e\u0448\u0438\u0431\u043a\u0430');
    dashboardState.currentUser = data.currentUser || null;
    dashboardState.rooms = data.rooms || [];
    dashboardState.complaints = data.complaints || [];
    dashboardState.teachers = data.teachers || [];
    dashboardState.admins = data.admins || [];
    dashboardState.analytics = data.analytics || null;
    dashboardState.roomInsights = data.roomInsights || [];

    if (mainAdminSection) mainAdminSection.hidden = !isMainAdmin();
    if (archiveDeleteHint) archiveDeleteHint.hidden = isMainAdmin();
    if (teacherRoomsSelect) {
      teacherRoomsSelect.innerHTML = dashboardState.rooms.map((room) => `<option value="${room.id}">${escapeHtml(room.name)}</option>`).join('');
    }
    renderArchiveRoomDropdown();
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
    if (!ok) return showToast(data.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f', 'error', '\u041e\u0448\u0438\u0431\u043a\u0430');
    form.reset();
    Array.from(teacherRoomsSelect?.options || []).forEach((option) => { option.selected = false; });
    showToast(role === 'admin' ? '\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d' : '\u041f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u044c \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d');
    await loadAdminDashboard();
  }

  async function loadAdminRoomPage() {
    const { roomId, roomName } = getQueryParams();
    const safeRoomName = roomName && roomName !== 'undefined' ? roomName : '';
    if (!roomId) return;
    const { ok, data } = await requestJSON(`/admin/rooms/${roomId}/data`);
    if (!ok) return showToast(data.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u044e', 'error', '\u041e\u0448\u0438\u0431\u043a\u0430');

    roomPageState.room = data.room || null;
    roomPageState.equipment = data.equipment || [];
    roomPageState.recentComplaints = data.recentComplaints || [];
    roomPageState.summary = data.roomSummary || null;
    if (roomPageTitle) roomPageTitle.textContent = `\u0410\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u044f ${data.room?.name || safeRoomName || roomId}`;
    if (roomNameHeading) roomNameHeading.textContent = data.room?.name || safeRoomName || roomId;

    renderMiniStats(roomQuickStats, [
      {
        label: '\u0422\u0435\u0445\u043d\u0438\u043a\u0430',
        value: String(Number(roomPageState.summary?.equipment_count || roomPageState.equipment.length || 0)),
        hint: '\u0412\u0441\u0435\u0433\u043e \u0435\u0434\u0438\u043d\u0438\u0446 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f \u0432 \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0438'
      },
      {
        label: '\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0437\u0430\u044f\u0432\u043a\u0438',
        value: String(Number(roomPageState.summary?.active_complaints || 0)),
        hint: '\u041e\u0442\u043a\u0440\u044b\u0442\u044b\u0435 \u043e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u044f \u043f\u043e \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0443'
      },
      {
        label: '\u0410\u0440\u0445\u0438\u0432',
        value: String(Number(roomPageState.summary?.archived_complaints || 0)),
        hint: '\u0417\u0430\u043a\u0440\u044b\u0442\u044b\u0435 \u0437\u0430\u044f\u0432\u043a\u0438 \u043f\u043e \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0438'
      },
      {
        label: '\u041f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u0438',
        value: String((data.roomTeachers || []).length),
        hint: '\u0417\u0430\u043a\u0440\u0435\u043f\u043b\u0435\u043d\u043d\u044b\u0435 \u043f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u0438'
      }
    ]);

    if (roomIdentityCard) {
      const roomSummary = roomPageState.summary || {};
      roomIdentityCard.innerHTML = `
        <div class="room-identity-main">
          <h3>${escapeHtml(data.room?.name || safeRoomName || roomId)}</h3>
          <p>\u041f\u0430\u0441\u043f\u043e\u0440\u0442 \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0438 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u0442\u0435\u043a\u0443\u0449\u0443\u044e \u043e\u0441\u043d\u0430\u0449\u0435\u043d\u043d\u043e\u0441\u0442\u044c \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0430, \u0437\u0430\u043a\u0440\u0435\u043f\u043b\u0435\u043d\u043d\u044b\u0445 \u043f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u0435\u0439 \u0438 \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u043e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u0439 \u043f\u043e \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044e.</p>
        </div>
        <div class="room-identity-tags">
          <span class="room-identity-tag">\u0422\u0435\u0445\u043d\u0438\u043a\u0438: ${Number(roomSummary.equipment_count || roomPageState.equipment.length || 0)}</span>
          <span class="room-identity-tag">\u0418\u0441\u043f\u0440\u0430\u0432\u043d\u043e: ${Number(roomSummary.healthy_equipment_count || 0)}</span>
          <span class="room-identity-tag">\u041d\u0430 \u0440\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u0438: ${Number(roomSummary.review_equipment_count || 0)}</span>
          <span class="room-identity-tag">\u0412 \u0440\u0435\u043c\u043e\u043d\u0442\u0435: ${Number(roomSummary.repair_equipment_count || 0)}</span>
          <span class="room-identity-tag">\u041f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u0435\u0439: ${(data.roomTeachers || []).length}</span>
          <span class="room-identity-tag">\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u044f\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c: ${escapeHtml(formatDateLabel(roomSummary.last_activity_at))}</span>
        </div>
      `;
    }

    if (roomRecentComplaints) {
      roomRecentComplaints.innerHTML = roomPageState.recentComplaints.length
        ? roomPageState.recentComplaints.map((item) => `
          <article class="room-timeline-item">
            <div class="room-timeline-top">
              <div>
                <h3 class="room-timeline-title">${escapeHtml(item.equipment_name || '\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435')}</h3>
                <p class="room-timeline-meta">${escapeHtml(item.full_name || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d')} - ${escapeHtml(formatDateLabel(item.updated_at || item.created_at))}</p>
              </div>
              ${statusBadge(item.status || '\u043d\u0430 \u0440\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u0438')}
            </div>
            <p>${escapeHtml(item.description || '\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u044f \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442')}</p>
          </article>
        `).join('')
        : `
          <article class="room-timeline-item">
            <div class="room-timeline-top">
              <div>
                <h3 class="room-timeline-title">\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u0439 \u043f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u0430</h3>
                <p class="room-timeline-meta">\u0414\u043b\u044f \u044d\u0442\u043e\u0439 \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u0438 \u0435\u0449\u0435 \u043d\u0435\u0442 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0445 \u0437\u0430\u044f\u0432\u043e\u043a.</p>
              </div>
            </div>
          </article>
        `;
    }

    if (equipmentTableBody) {
      equipmentTableBody.innerHTML = roomPageState.equipment.map((eq) => `
        <tr data-id="${eq.id}">
          <td>${eq.id}</td>
          <td>${escapeHtml(eq.name)}</td>
          <td>${escapeHtml(eq.serial_number || '')}</td>
          <td>${escapeHtml(eq.purchase_date || '')}</td>
          <td>${statusBadge(eq.status || '\u0432 \u0440\u0430\u0431\u043e\u0442\u0435')}</td>
          <td class="table-actions-cell">
            <button class="btn btn-sm hover-highlight btn-equipment-edit" data-id="${eq.id}">\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c</button>
            <button class="btn btn-sm btn-danger btn-equipment-delete" data-id="${eq.id}">\u0423\u0434\u0430\u043b\u0438\u0442\u044c</button>
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
          <td><button class="btn btn-sm btn-danger btn-room-teacher-remove" data-id="${teacher.id}">\u0423\u0434\u0430\u043b\u0438\u0442\u044c</button></td>
        </tr>
      `).join('');
    }

    roomPageState.roomTeachers = data.roomTeachers || [];
    roomPageState.allTeachers = data.allTeachers || [];
    const assignedIds = new Set(roomPageState.roomTeachers.map((teacher) => String(teacher.id)));
    roomPageState.pendingTeacherIds = new Set(
      Array.from(roomPageState.pendingTeacherIds).filter((teacherId) => !assignedIds.has(String(teacherId)))
    );
    renderRoomTeacherPicker();
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

  function renderRoomTeacherPicker() {
    if (!roomTeacherOptions) return;
    const query = roomTeacherSearch?.value.trim().toLowerCase() || '';
    const assignedIds = new Set(roomPageState.roomTeachers.map((teacher) => String(teacher.id)));
    const filtered = roomPageState.allTeachers.filter((teacher) => {
      const haystack = `${teacher.full_name} ${teacher.login}`.toLowerCase();
      return !assignedIds.has(String(teacher.id)) && (!query || haystack.includes(query));
    });
    if (!filtered.length) {
      roomTeacherOptions.innerHTML = '<p class="teacher-picker-empty">\u041d\u0435\u0442 \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0438\u0445 \u043f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u0435\u0439</p>';
      return;
    }
    roomTeacherOptions.innerHTML = filtered.map((teacher) => `
      <label class="teacher-picker-item">
        <input
          class="room-teacher-checkbox"
          type="checkbox"
          value="${teacher.id}"
          ${roomPageState.pendingTeacherIds.has(String(teacher.id)) ? 'checked' : ''}
        />
        <span class="teacher-picker-check"></span>
        <span class="teacher-picker-text">
          <strong>${escapeHtml(teacher.full_name)}</strong>
          <small>${escapeHtml(teacher.login)}</small>
        </span>
      </label>
    `).join('');
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
    const { ok, data } = await requestJSON(`/user/rooms/${roomId}/equipment`);
    if (!ok) return;
    const resolvedRoomName = data.room?.name || safeRoomName || roomId;
    if (userRoomTitle) userRoomTitle.textContent = `\u0410\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u044f ${resolvedRoomName}`;
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
      notificationList.innerHTML = '<p class="notification-empty">\u041d\u0435\u0442 \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0439</p>';
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
            ${notif.type === 'warning' ? '\u0417\u0430\u044f\u0432\u043a\u0430' : (notif.type === 'success' ? '\u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e' : '\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0435')}
          </div>
        </div>
      `;
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'notification-delete-btn';
      deleteBtn.type = 'button';
      deleteBtn.innerHTML = '&times;';
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
  roomTeacherSearch?.addEventListener('input', renderRoomTeacherPicker);
  roomTeacherOptions?.addEventListener('change', (event) => {
    const checkbox = event.target.closest('.room-teacher-checkbox');
    if (!checkbox) return;
    if (checkbox.checked) roomPageState.pendingTeacherIds.add(String(checkbox.value));
    else roomPageState.pendingTeacherIds.delete(String(checkbox.value));
  });
  [complaintsStatusFilter, complaintsSortSelect, archiveDateFrom, archiveDateTo, archiveSortSelect].forEach((input) => input?.addEventListener('change', applyDashboardFilters));

  archiveRoomDropdownBtn?.addEventListener('click', () => {
    archiveRoomDropdownPanel?.classList.toggle('hidden');
  });

  archiveRoomDropdownPanel?.addEventListener('change', (event) => {
    const checkbox = event.target.closest('.archive-room-checkbox');
    if (!checkbox) return;
    const selected = new Set(getArchiveRoomFilters());
    if (checkbox.checked) selected.add(checkbox.value);
    else selected.delete(checkbox.value);
    dashboardState.archiveRoomFilters = Array.from(selected);
    updateArchiveRoomButtonLabel();
    applyDashboardFilters();
  });

  document.addEventListener('click', (event) => {
    if (archiveRoomDropdown && !event.target.closest('#archiveRoomDropdown')) {
      archiveRoomDropdownPanel?.classList.add('hidden');
    }
  });

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
      showToast(data.message || 'Пользователь обновлён');
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

    roomsCardGrid?.addEventListener('click', (event) => {
      const card = event.target.closest('.room-card');
      if (!card) return;
      window.location.href = `/admin-room.html?roomId=${encodeURIComponent(card.dataset.id)}&roomName=${encodeURIComponent(card.dataset.name || '')}`;
    });

    complaintTableBody?.addEventListener('click', async (event) => {
      const saveBtn = event.target.closest('.btn-status-save');
      const fixedBtn = event.target.closest('.btn-mark-fixed');
      const openBtn = event.target.closest('.btn-open-complaint');
      if (openBtn) {
        sessionStorage.setItem('adminLastTab', 'errors');
        window.location.href = `/admin-complaint.html?id=${encodeURIComponent(openBtn.dataset.id)}`;
        return;
      }
      if (fixedBtn) {
        const confirmed = await askConfirm({
          title: 'Перевести в архив',
          message: 'Заявка будет помечена как исправленная, а оборудование вернётся в рабочее состояние.',
          acceptLabel: 'Починено'
        });
        if (!confirmed) return;
        const { ok, data } = await requestJSON(`/admin/complaints/${fixedBtn.dataset.id}/status`, jsonOptions('PATCH', { status: 'исправлено' }));
        if (!ok) return showToast(data.message || 'Не удалось закрыть заявку', 'error', 'Ошибка');
        showToast(data.message || 'Заявка переведена в архив');
        await loadAdminDashboard();
        return;
      }
      if (!saveBtn) return;
      const select = complaintTableBody.querySelector(`.status-select[data-id="${saveBtn.dataset.id}"]`);
      const { ok, data } = await requestJSON(`/admin/complaints/${saveBtn.dataset.id}/status`, jsonOptions('PATCH', { status: select.value }));
      if (!ok) return showToast(data.message || 'Не удалось обновить статус', 'error', 'Ошибка');
      showToast(data.message || 'Статус обновлён');
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
      dashboardState.archiveSelectedIds.delete(Number(deleteBtn.dataset.id));
      showToast('Запись из архива удалена');
      await loadAdminDashboard();
    });

    archiveTableBody?.addEventListener('change', (event) => {
      const checkbox = event.target.closest('.archive-row-checkbox');
      if (!checkbox) return;
      const id = Number(checkbox.dataset.id);
      if (checkbox.checked) dashboardState.archiveSelectedIds.add(id);
      else dashboardState.archiveSelectedIds.delete(id);
      applyDashboardFilters();
    });

    archiveSelectAll?.addEventListener('change', (event) => {
      const checked = Boolean(event.target.checked);
      Array.from(archiveTableBody?.querySelectorAll('.archive-row-checkbox') || []).forEach((checkbox) => {
        checkbox.checked = checked;
        const id = Number(checkbox.dataset.id);
        if (checked) dashboardState.archiveSelectedIds.add(id);
        else dashboardState.archiveSelectedIds.delete(id);
      });
      applyDashboardFilters();
    });

    archiveBulkDeleteBtn?.addEventListener('click', async () => {
      const ids = Array.from(dashboardState.archiveSelectedIds);
      if (!ids.length) {
        return showToast('Сначала отметьте записи в архиве', 'warning', 'Внимание');
      }
      const confirmed = await askConfirm({
        title: 'Удаление выбранных записей',
        message: `Будут удалены ${ids.length} архивных записей без возможности восстановления.`,
        acceptLabel: 'Удалить выбранные'
      });
      if (!confirmed) return;

      for (const id of ids) {
        const { ok, data } = await requestJSON(`/admin/archive/${id}`, { method: 'DELETE' });
        if (!ok) return showToast(data.message || 'Не удалось удалить часть записей архива', 'error', 'Ошибка');
      }

      dashboardState.archiveSelectedIds = new Set();
      showToast('Выбранные записи из архива удалены');
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
            message: 'Пользователь будет удалён из системы.',
            acceptLabel: 'Удалить'
          });
          if (!confirmed) return;
          const url = deleteBtn.dataset.userType === 'admin'
            ? `/admin/admins/${deleteBtn.dataset.id}`
            : `/admin/teachers/${deleteBtn.dataset.id}`;
          const { ok, data } = await requestJSON(url, { method: 'DELETE' });
      if (!ok) return showToast(data.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f', 'error', '\u041e\u0448\u0438\u0431\u043a\u0430');
      showToast(data.message || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u0443\u0434\u0430\u043b\u0435\u043d');
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
    if (!ok) return showToast(data.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u044e', 'error', '\u041e\u0448\u0438\u0431\u043a\u0430');
    roomForm.reset();
    showToast('\u0410\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u044f \u0441\u043e\u0437\u0434\u0430\u043d\u0430');
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
      const teacherIds = Array.from(roomPageState.pendingTeacherIds);
      if (!teacherIds.length) return showToast('Выберите хотя бы одного преподавателя', 'warning', 'Внимание');
      const { ok, data } = await requestJSON(`/admin/rooms/${roomId}/teachers`, jsonOptions('POST', { teacher_id: teacherIds }));
      if (!ok) return showToast(data.message || 'Не удалось назначить преподавателей', 'error', 'Ошибка');
      showToast('Преподаватели добавлены в аудиторию');
      roomPageState.pendingTeacherIds = new Set();
      if (roomTeacherSearch) roomTeacherSearch.value = '';
      await loadAdminRoomPage();
    });

    roomTeachersTableBody?.addEventListener('click', async (event) => {
      const removeBtn = event.target.closest('.btn-room-teacher-remove');
      if (!removeBtn) return;
      const { roomId } = getQueryParams();
      const confirmed = await askConfirm({
        title: 'Удаление преподавателя',
        message: 'Преподаватель будет откреплён от аудитории.',
        acceptLabel: 'Удалить'
      });
      if (!confirmed) return;
      const { ok, data } = await requestJSON(`/admin/rooms/${roomId}/teachers/${removeBtn.dataset.id}`, { method: 'DELETE' });
      if (!ok) return showToast(data.message || 'Не удалось удалить преподавателя', 'error', 'Ошибка');
      showToast('Преподаватель удалён из аудитории');
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

    try {
      const response = await fetch('/complaints', { method: 'POST', body: new FormData(complaintForm) });
      const data = await response.json().catch(() => ({}));
      if (response.status === 404) {
        return showToast('Сервер работает на старой версии. Перезапустите приложение и обновите страницу.', 'error', 'Нужно обновление');
      }
      if (!response.ok) return showToast(data.message || 'Не удалось отправить заявку', 'error', 'Ошибка');
      complaintForm.reset();
      showToast('Заявка отправлена');
      await loadUserRoomEquipment();
    } catch (error) {
      showToast('Не удалось отправить заявку. Проверьте, что сервер запущен и страница обновлена.', 'error', 'Ошибка');
    }
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
