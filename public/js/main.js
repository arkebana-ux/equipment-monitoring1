async function postJSON(url, data, method = 'POST') {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, data: json, status: res.status };
}

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(params.entries());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatRelativeTime(dateValue) {
  let date = new Date(dateValue);
  if (Number.isNaN(date.getTime()) && typeof dateValue === 'string') {
    date = new Date(dateValue.replace(' ', 'T') + 'Z');
  }
  if (Number.isNaN(date.getTime())) {
    return '';
  }

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
  const analyticsRoomChart = document.getElementById('analyticsRoomChart');

  const userEditModal = document.getElementById('userEditModal');
  const userEditForm = document.getElementById('userEditForm');
  const userEditModalTitle = document.getElementById('userEditModalTitle');
  const closeUserEditModal = document.getElementById('closeUserEditModal');
  const cancelUserEditModal = document.getElementById('cancelUserEditModal');

  const roomPageTitle = document.getElementById('roomPageTitle');
  const equipmentForm = document.getElementById('equipmentForm');
  const equipmentTableBody = document.getElementById('equipmentTableBody');
  const roomTeachersTableBody = document.getElementById('roomTeachersTableBody');
  const roomTeacherForm = document.getElementById('roomTeacherForm');
  const roomTeacherSelect = document.getElementById('roomTeacherSelect');
  const deleteRoomBtn = document.getElementById('deleteRoomBtn');

  const userRoomsTableBody = document.getElementById('userRoomsTableBody');
  const userEquipmentTableBody = document.getElementById('userEquipmentTableBody');
  const userRoomTitle = document.getElementById('userRoomTitle');

  const notificationBtn = document.getElementById('notificationBtn');
  const notificationDropdown = document.getElementById('notificationDropdown');
  const notificationList = document.getElementById('notificationList');
  const notificationBadge = document.getElementById('notificationBadge');
  const markAllReadBtn = document.getElementById('markAllReadBtn');

  let currentAdminUser = null;
  const isMainAdmin = () => Boolean(currentAdminUser && currentAdminUser.is_super_admin);

  function closeEditModal() {
    if (!userEditModal || !userEditForm) return;
    userEditModal.classList.add('hidden');
    userEditModal.setAttribute('aria-hidden', 'true');
    userEditForm.reset();
  }

  function openEditModal({ id, userType, fullName, login }) {
    if (!userEditModal || !userEditForm) return;
    userEditForm.elements.id.value = id;
    userEditForm.elements.user_type.value = userType;
    userEditForm.elements.full_name.value = fullName;
    userEditForm.elements.login.value = login;
    userEditForm.elements.password.value = '';
    if (userEditModalTitle) {
      userEditModalTitle.textContent = userType === 'admin'
        ? 'Редактирование администратора'
        : 'Редактирование преподавателя';
    }
    userEditModal.classList.remove('hidden');
    userEditModal.setAttribute('aria-hidden', 'false');
  }

  function renderAnalyticsBars(container, items, getValue) {
    if (!container) return;
    if (!Array.isArray(items) || items.length === 0) {
      container.innerHTML = '<p class="hint">Пока данных нет.</p>';
      return;
    }
    const max = Math.max(...items.map(getValue), 1);
    container.innerHTML = items.map((item) => {
      const value = getValue(item);
      const width = Math.max(8, Math.round((value / max) * 100));
      return `
        <div class="analytics-bar-row">
          <div class="analytics-bar-label">${escapeHtml(item.label)}</div>
          <div class="analytics-bar-track">
            <div class="analytics-bar-fill" style="width:${width}%"></div>
          </div>
          <div class="analytics-bar-value">${value}</div>
        </div>
      `;
    }).join('');
  }

  function renderAnalytics(analytics) {
    if (!analytics) return;

    if (analyticsSummary) {
      const summary = analytics.summary || {};
      const cards = [
        ['Аудиторий', summary.totalRooms || 0],
        ['Оборудования', summary.totalEquipment || 0],
        ['Преподавателей', summary.totalTeachers || 0],
        ['Администраторов', summary.totalAdmins || 0],
        ['Всего заявок', summary.totalComplaints || 0],
        ['Закрыто заявок', summary.archivedComplaints || 0]
      ];
      analyticsSummary.innerHTML = cards.map(([label, value]) => `
        <div class="analytics-stat">
          <div class="analytics-stat-label">${label}</div>
          <div class="analytics-stat-value">${value}</div>
        </div>
      `).join('');
    }

    renderAnalyticsBars(analyticsStatusChart, analytics.complaintStatuses || [], (item) => Number(item.value || 0));
    renderAnalyticsBars(analyticsEquipmentChart, analytics.equipmentStatuses || [], (item) => Number(item.value || 0));

    if (analyticsRoomChart) {
      const rows = Array.isArray(analytics.roomLoad) ? analytics.roomLoad : [];
      analyticsRoomChart.innerHTML = rows.length ? rows.map((room) => `
        <div class="room-analytics-item">
          <div class="room-analytics-top">
            <div class="room-analytics-name">${escapeHtml(room.roomName)}</div>
            <div class="room-analytics-meta">Открытых заявок: ${Number(room.activeComplaints || 0)}</div>
          </div>
          <div class="room-analytics-tags">
            <span class="room-analytics-tag">Оборудование: ${Number(room.equipmentCount || 0)}</span>
            <span class="room-analytics-tag">Всего заявок: ${Number(room.totalComplaints || 0)}</span>
            <span class="room-analytics-tag">В архиве: ${Number(room.archivedComplaints || 0)}</span>
          </div>
        </div>
      `).join('') : '<p class="hint">Пока нет данных по аудиториям.</p>';
    }
  }

  async function loadAdminDashboard() {
    const res = await fetch('/admin/dashboard');
    const data = await res.json();
    currentAdminUser = data.currentUser || null;

    if (mainAdminSection) mainAdminSection.hidden = !isMainAdmin();
    if (archiveDeleteHint) archiveDeleteHint.hidden = isMainAdmin();

    if (roomTableBody) {
      roomTableBody.innerHTML = (data.rooms || []).map((room) => `
        <tr data-id="${room.id}" data-name="${escapeHtml(room.name)}">
          <td>${room.id}</td>
          <td>${escapeHtml(room.name)}</td>
        </tr>
      `).join('');
    }

    if (teacherRoomsSelect) {
      teacherRoomsSelect.innerHTML = (data.rooms || []).map((room) => `
        <option value="${room.id}">${escapeHtml(room.name)}</option>
      `).join('');
    }

    const complaints = Array.isArray(data.complaints) ? data.complaints : [];
    const activeComplaints = complaints.filter((item) => item.status !== 'исправлено');
    const archivedComplaints = complaints.filter((item) => item.status === 'исправлено');

    if (complaintTableBody) {
      complaintTableBody.innerHTML = activeComplaints.map((item) => `
        <tr>
          <td>${item.id}</td>
          <td>${escapeHtml(item.full_name || '-')}</td>
          <td>${escapeHtml(item.equipment_name || '-')}</td>
          <td class="compl-desc">${escapeHtml(item.description || '-')}</td>
          <td>
            <select class="status-select" data-id="${item.id}">
              <option value="на рассмотрении" ${item.status === 'на рассмотрении' ? 'selected' : ''}>на рассмотрении</option>
              <option value="в ремонте" ${item.status === 'в ремонте' ? 'selected' : ''}>в ремонте</option>
              <option value="исправлено" ${item.status === 'исправлено' ? 'selected' : ''}>исправлено</option>
            </select>
          </td>
          <td>
            <button class="btn hover-highlight btn-status-save" data-id="${item.id}">Сохранить</button>
            <button class="btn hover-highlight btn-open-complaint" data-id="${item.id}">Открыть</button>
          </td>
        </tr>
      `).join('');
    }

    if (archiveTableBody) {
      archiveTableBody.innerHTML = archivedComplaints.map((item) => `
        <tr>
          <td>${item.id}</td>
          <td>${escapeHtml(item.full_name || '-')}</td>
          <td>${escapeHtml(item.equipment_name || '-')}</td>
          <td>${escapeHtml(item.description || '-')}</td>
          <td>${escapeHtml(item.created_at || '-')}</td>
          <td>${escapeHtml(item.updated_at || '-')}</td>
          <td>
            ${isMainAdmin()
              ? `<button class="btn hover-highlight btn-archive-delete" data-id="${item.id}">Удалить</button>`
              : '<span class="hint">Только главный админ</span>'}
          </td>
        </tr>
      `).join('');
    }

    if (teacherTableBody) {
      teacherTableBody.innerHTML = (data.teachers || []).map((teacher) => `
        <tr data-id="${teacher.id}" data-user-type="teacher" data-full-name="${escapeHtml(teacher.full_name)}" data-login="${escapeHtml(teacher.login)}">
          <td>${teacher.id}</td>
          <td>${escapeHtml(teacher.full_name)}</td>
          <td>${escapeHtml(teacher.login)}</td>
          <td>
            <button class="btn hover-highlight btn-user-edit" data-id="${teacher.id}" data-user-type="teacher">Редактировать</button>
            <button class="btn hover-highlight btn-user-delete" data-id="${teacher.id}" data-user-type="teacher">Удалить</button>
          </td>
        </tr>
      `).join('');
    }

    if (adminTableBody) {
      adminTableBody.innerHTML = (data.admins || []).map((admin) => `
        <tr data-id="${admin.id}" data-user-type="admin" data-full-name="${escapeHtml(admin.full_name)}" data-login="${escapeHtml(admin.login)}">
          <td>${admin.id}</td>
          <td>${escapeHtml(admin.full_name)}</td>
          <td>${escapeHtml(admin.login)}</td>
          <td>${admin.is_super_admin ? 'Главный' : 'Обычный'}</td>
          <td>
            ${admin.is_super_admin
              ? '<span class="hint">Недоступно</span>'
              : `
                <button class="btn hover-highlight btn-user-edit" data-id="${admin.id}" data-user-type="admin">Редактировать</button>
                <button class="btn hover-highlight btn-user-delete" data-id="${admin.id}" data-user-type="admin">Удалить</button>
              `}
          </td>
        </tr>
      `).join('');
    }

    renderAnalytics(data.analytics);
  }

  async function submitUserCreate(form, role) {
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.role = role;

    if (role === 'teacher' && teacherRoomsSelect) {
      payload.rooms = Array.from(teacherRoomsSelect.selectedOptions).map((option) => option.value);
    } else {
      payload.rooms = [];
    }

    if (!payload.full_name || payload.full_name.length < 3) {
      return alert('Введите корректное ФИО');
    }
    if (!payload.login || !/^[A-Za-z0-9_]{3,30}$/.test(payload.login)) {
      return alert('Логин: 3-30 символов, буквы/цифры/_');
    }
    if (!payload.password || payload.password.length < 6) {
      return alert('Пароль минимум 6 символов');
    }

    const res = await postJSON('/auth/register', payload);
    if (!res.ok) {
      return alert(res.data.message || 'Ошибка при сохранении пользователя');
    }

    alert(res.data.message || (role === 'admin' ? 'Администратор добавлен' : 'Преподаватель добавлен'));
    form.reset();
    if (teacherRoomsSelect && role === 'teacher') {
      Array.from(teacherRoomsSelect.options).forEach((option) => { option.selected = false; });
    }
    await loadAdminDashboard();
  }

  async function loadAdminRoomPage() {
    const { roomId, roomName } = getQueryParams();
    if (!roomId) return;
    if (roomPageTitle) roomPageTitle.textContent = `Аудитория ${roomName || roomId}`;

    const res = await fetch(`/admin/rooms/${roomId}/data`);
    const data = await res.json();

    if (equipmentTableBody) {
      equipmentTableBody.innerHTML = (data.equipment || []).map((eq) => `
        <tr data-id="${eq.id}">
          <td>${eq.id}</td>
          <td>${escapeHtml(eq.name)}</td>
          <td>${escapeHtml(eq.serial_number || '')}</td>
          <td>${escapeHtml(eq.purchase_date || '')}</td>
          <td>${escapeHtml(eq.status || '')}</td>
          <td>
            <button class="btn btn-sm hover-highlight btn-equipment-edit" data-id="${eq.id}">Редактировать</button>
            <button class="btn btn-sm hover-highlight btn-equipment-status" data-id="${eq.id}">Статус</button>
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

  async function loadUserRooms() {
    const res = await fetch('/user/rooms');
    const data = await res.json();
    if (userRoomsTableBody) {
      userRoomsTableBody.innerHTML = (data.rooms || []).map((room) => `
        <tr data-id="${room.id}" data-name="${escapeHtml(room.name)}">
          <td>${room.id}</td>
          <td>${escapeHtml(room.name)}</td>
        </tr>
      `).join('');
    }
  }

  async function loadUserRoomEquipment() {
    const { roomId, roomName } = getQueryParams();
    if (!roomId || !userEquipmentTableBody) return;
    if (userRoomTitle) userRoomTitle.textContent = `Аудитория ${roomName || roomId}`;

    const res = await fetch(`/user/rooms/${roomId}/equipment`);
    const data = await res.json();
    userEquipmentTableBody.innerHTML = (data.equipment || []).map((eq) => {
      const lower = String(eq.status || '').toLowerCase();
      const rowClass = lower === 'на рассмотрении'
        ? 'status-review'
        : (lower === 'в ремонте' ? 'status-repair' : '');
      return `
        <tr class="${rowClass}" data-id="${eq.id}" data-name="${escapeHtml(eq.name)}">
          <td>${eq.id}</td>
          <td>${escapeHtml(eq.name)}</td>
          <td>${escapeHtml(eq.serial_number || '')}</td>
          <td>${escapeHtml(eq.purchase_date || '')}</td>
          <td>${escapeHtml(eq.status || '')}</td>
        </tr>
      `;
    }).join('');
  }

  async function loadNotifications() {
    if (!notificationBtn) return;
    const res = await fetch('/notifications');
    if (!res.ok) return;
    const { notifications, unreadCount } = await res.json();
    const isTeacherPage = Boolean(userRoomsTableBody || userEquipmentTableBody);

    if (notificationBadge) {
      notificationBadge.textContent = unreadCount || 0;
      notificationBadge.classList.toggle('has-unread', Number(unreadCount) > 0);
    }

    if (!notificationList) return;
    if (!notifications || notifications.length === 0) {
      notificationList.innerHTML = '<p class="notification-empty">Нет уведомлений</p>';
      return;
    }

    notificationList.innerHTML = '';
    notifications.forEach((notif) => {
      const div = document.createElement('div');
      div.className = `notification-item ${notif.is_read === 0 ? 'unread' : ''} ${isTeacherPage ? 'static-note' : ''}`;

      div.innerHTML = `
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
      div.appendChild(deleteBtn);

      div.addEventListener('click', async () => {
        if (notif.is_read === 0) {
          await fetch(`/notifications/${notif.id}/read`, { method: 'PUT' });
        }

        if (!isTeacherPage && notif.complaint_id) {
          try {
            const activeTabBtn = document.querySelector('.tab.active');
            if (activeTabBtn?.dataset?.tab) {
              sessionStorage.setItem('adminLastTab', activeTabBtn.dataset.tab);
            }
          } catch (e) {
            console.error(e);
          }
          window.location.href = `/admin-complaint.html?id=${encodeURIComponent(notif.complaint_id)}`;
          return;
        }

        loadNotifications();
      });

      notificationList.appendChild(div);
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(loginForm).entries());
      const res = await postJSON('/auth/login', payload);
      if (!res.ok) {
        return alert(res.data.message || 'Ошибка входа');
      }
      window.location.href = '/';
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await postJSON('/auth/logout', {});
      window.location.href = '/auth/login';
    });
  }

  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  if (tabs.length) {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const name = tab.dataset.tab;
        tabs.forEach((item) => item.classList.remove('active'));
        tabContents.forEach((content) => content.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${name}`)?.classList.add('active');
      });
    });

    const initialTab = getQueryParams().tab || sessionStorage.getItem('adminLastTab');
    if (initialTab) {
      const tab = Array.from(tabs).find((item) => item.dataset.tab === initialTab);
      if (tab) tab.click();
      sessionStorage.removeItem('adminLastTab');
    }
  }

  if (roomTableBody) {
    loadAdminDashboard().catch((err) => console.error(err));

    roomTableBody.addEventListener('click', (event) => {
      const tr = event.target.closest('tr');
      if (!tr) return;
      window.location.href = `/admin-room.html?roomId=${encodeURIComponent(tr.dataset.id)}&roomName=${encodeURIComponent(tr.dataset.name || '')}`;
    });

    complaintTableBody?.addEventListener('click', async (event) => {
      const openBtn = event.target.closest('.btn-open-complaint');
      const saveBtn = event.target.closest('.btn-status-save');

      if (openBtn) {
        const activeTab = document.querySelector('.tab.active')?.dataset?.tab;
        if (activeTab) sessionStorage.setItem('adminLastTab', activeTab);
        window.location.href = `/admin-complaint.html?id=${encodeURIComponent(openBtn.dataset.id)}`;
        return;
      }

      if (saveBtn) {
        const select = complaintTableBody.querySelector(`.status-select[data-id="${saveBtn.dataset.id}"]`);
        const res = await postJSON(`/admin/complaints/${saveBtn.dataset.id}/status`, { status: select.value }, 'PATCH');
        if (!res.ok) {
          return alert(res.data.message || 'Ошибка при изменении статуса');
        }
        alert(res.data.message || 'Статус обновлён');
        await loadAdminDashboard();
      }
    });

    archiveTableBody?.addEventListener('click', async (event) => {
      const deleteBtn = event.target.closest('.btn-archive-delete');
      if (!deleteBtn) return;
      if (!confirm('Удалить запись из архива?')) return;

      const res = await fetch(`/admin/archive/${deleteBtn.dataset.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return alert(json.message || 'Ошибка при удалении записи');
      }
      await loadAdminDashboard();
    });

    function attachUserTableHandlers(container) {
      container?.addEventListener('click', async (event) => {
        const editBtn = event.target.closest('.btn-user-edit');
        const deleteBtn = event.target.closest('.btn-user-delete');

        if (editBtn) {
          const row = editBtn.closest('tr');
          openEditModal({
            id: editBtn.dataset.id,
            userType: editBtn.dataset.userType || row.dataset.userType,
            fullName: row.dataset.fullName,
            login: row.dataset.login
          });
          return;
        }

        if (deleteBtn) {
          if (!confirm('Удалить пользователя?')) return;
          const userType = deleteBtn.dataset.userType;
          const endpoint = userType === 'admin'
            ? `/admin/admins/${deleteBtn.dataset.id}`
            : `/admin/teachers/${deleteBtn.dataset.id}`;
          const res = await fetch(endpoint, { method: 'DELETE' });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            return alert(json.message || 'Ошибка при удалении');
          }
          await loadAdminDashboard();
        }
      });
    }

    attachUserTableHandlers(teacherTableBody);
    attachUserTableHandlers(adminTableBody);
  }

  if (roomForm) {
    roomForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(roomForm).entries());
      const res = await postJSON('/admin/rooms', payload);
      if (!res.ok) {
        return alert(res.data.message || 'Ошибка при создании аудитории');
      }
      roomForm.reset();
      await loadAdminDashboard();
    });
  }

  if (teacherRegisterForm) {
    teacherRegisterForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await submitUserCreate(teacherRegisterForm, 'teacher');
    });
  }

  if (adminRegisterForm) {
    adminRegisterForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await submitUserCreate(adminRegisterForm, 'admin');
    });
  }

  if (userEditForm) {
    closeUserEditModal?.addEventListener('click', closeEditModal);
    cancelUserEditModal?.addEventListener('click', closeEditModal);
    userEditModal?.addEventListener('click', (event) => {
      if (event.target === userEditModal) closeEditModal();
    });

    userEditForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(userEditForm).entries());
      const endpoint = payload.user_type === 'admin'
        ? `/admin/admins/${payload.id}`
        : `/admin/teachers/${payload.id}`;
      const res = await postJSON(endpoint, {
        full_name: payload.full_name,
        login: payload.login,
        password: payload.password || ''
      }, 'PATCH');
      if (!res.ok) {
        return alert(res.data.message || 'Ошибка при сохранении');
      }
      closeEditModal();
      await loadAdminDashboard();
    });
  }

  if (roomPageTitle) {
    loadAdminRoomPage().catch((err) => console.error(err));

    equipmentForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const { roomId } = getQueryParams();
      const payload = Object.fromEntries(new FormData(equipmentForm).entries());
      const res = await postJSON(`/admin/rooms/${roomId}/equipment`, payload);
      if (!res.ok) {
        return alert(res.data.message || 'Ошибка при добавлении оборудования');
      }
      equipmentForm.reset();
      await loadAdminRoomPage();
    });

    equipmentTableBody?.addEventListener('click', async (event) => {
      const editBtn = event.target.closest('.btn-equipment-edit');
      const statusBtn = event.target.closest('.btn-equipment-status');
      const deleteBtn = event.target.closest('.btn-equipment-delete');

      if (editBtn) {
        const row = editBtn.closest('tr');
        const currentName = row.children[1].textContent;
        const currentSerial = row.children[2].textContent;
        const currentDate = row.children[3].textContent;
        const name = prompt('Название оборудования:', currentName);
        if (!name) return;
        const serial_number = prompt('Серийный номер:', currentSerial) ?? '';
        const purchase_date = prompt('Дата покупки (YYYY-MM-DD):', currentDate) ?? '';
        const res = await postJSON(`/admin/equipment/${editBtn.dataset.id}`, { name, serial_number, purchase_date }, 'PATCH');
        if (!res.ok) return alert(res.data.message || 'Ошибка обновления');
        await loadAdminRoomPage();
      }

      if (statusBtn) {
        const status = prompt('Новый статус: в работе / на рассмотрении / в ремонте / исправлено', 'в работе');
        if (!status) return;
        const res = await postJSON(`/admin/equipment/${statusBtn.dataset.id}/active`, { status }, 'PATCH');
        if (!res.ok) return alert(res.data.message || 'Ошибка обновления статуса');
        await loadAdminRoomPage();
      }

      if (deleteBtn) {
        if (!confirm('Удалить оборудование?')) return;
        const res = await fetch(`/admin/equipment/${deleteBtn.dataset.id}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return alert(json.message || 'Ошибка удаления');
        await loadAdminRoomPage();
      }
    });

    roomTeacherForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const { roomId } = getQueryParams();
      const payload = Object.fromEntries(new FormData(roomTeacherForm).entries());
      const res = await postJSON(`/admin/rooms/${roomId}/teachers`, payload);
      if (!res.ok) return alert(res.data.message || 'Ошибка назначения преподавателя');
      await loadAdminRoomPage();
    });

    roomTeachersTableBody?.addEventListener('click', async (event) => {
      const removeBtn = event.target.closest('.btn-room-teacher-remove');
      if (!removeBtn) return;
      if (!confirm('Удалить преподавателя из аудитории?')) return;
      const { roomId } = getQueryParams();
      const res = await fetch(`/admin/rooms/${roomId}/teachers/${removeBtn.dataset.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return alert(json.message || 'Ошибка удаления преподавателя');
      await loadAdminRoomPage();
    });

    deleteRoomBtn?.addEventListener('click', async () => {
      const { roomId } = getQueryParams();
      if (!confirm('Удалить аудиторию и связанные данные?')) return;
      const res = await fetch(`/admin/rooms/${roomId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return alert(json.message || 'Ошибка удаления аудитории');
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
    setInterval(() => {
      loadUserRoomEquipment().catch((err) => console.error(err));
    }, 8000);

    userEquipmentTableBody.addEventListener('click', (event) => {
      const row = event.target.closest('tr');
      if (!row) return;
      if (row.classList.contains('status-review') || row.classList.contains('status-repair')) {
        return alert('По этому оборудованию уже есть активная заявка или оно находится в ремонте');
      }

      document.getElementById('complaintRoomId').value = getQueryParams().roomId || '';
      document.getElementById('complaintEquipmentId').value = row.dataset.id || '';
      document.getElementById('complaintEquipmentName').value = row.dataset.name || '';
      Array.from(userEquipmentTableBody.querySelectorAll('tr')).forEach((tr) => tr.classList.remove('selected'));
      row.classList.add('selected');
    });
  }

  if (complaintForm) {
    complaintForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const roomId = document.getElementById('complaintRoomId')?.value;
      const equipmentId = document.getElementById('complaintEquipmentId')?.value;
      const description = complaintForm.querySelector('textarea[name="description"]')?.value || '';
      if (!roomId || !equipmentId) return alert('Сначала выберите оборудование');
      if (description.length < 5) return alert('Описание должно быть минимум 5 символов');

      const res = await fetch('/complaints', {
        method: 'POST',
        body: new FormData(complaintForm)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return alert(json.message || `Ошибка сервера (${res.status})`);
      }

      alert(json.message || 'Жалоба отправлена');
      complaintForm.reset();
      await loadUserRoomEquipment();
    });
  }

  if (notificationBtn) {
    notificationBtn.addEventListener('click', () => {
      notificationDropdown?.classList.toggle('open');
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.notification-bell')) {
        notificationDropdown?.classList.remove('open');
      }
    });

    markAllReadBtn?.addEventListener('click', async (event) => {
      event.stopPropagation();
      await fetch('/notifications/read/all', { method: 'PUT' });
      loadNotifications();
    });

    loadNotifications().catch((err) => console.error(err));
    setInterval(() => {
      loadNotifications().catch((err) => console.error(err));
    }, 30000);
  }
});
