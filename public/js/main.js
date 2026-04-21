// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ JSON-запросов
async function postJSON(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  return { ok: res.ok, data: json };
}

// получить query-параметры (?roomId=1&roomName=207)
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const obj = {};
  for (const [k, v] of params.entries()) {
    obj[k] = v;
  }
  return obj;
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const roomForm = document.getElementById('roomForm');
  const complaintForm = document.getElementById('complaintForm');
  const userRegisterForm = document.getElementById('userRegisterForm');

  // ---------- ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК В АДМИНКЕ (ТОЛЬКО НА admin-dashboard.html) ----------
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  if (tabs.length) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const name = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(`tab-${name}`).classList.add('active');
      });
    });
    // If URL contains ?tab=... activate that tab on load (useful when returning from detail page)
    try {
      const paramsInit = getQueryParams();
      if (paramsInit.tab) {
        const tbtn = Array.from(tabs).find(x => x.dataset.tab === paramsInit.tab);
        if (tbtn) tbtn.click();
      } else {
        // fallback: try to restore last active tab saved in sessionStorage
        try {
          const last = sessionStorage.getItem('adminLastTab');
          if (last) {
            const tbtn2 = Array.from(tabs).find(x => x.dataset.tab === last);
            if (tbtn2) {
              tbtn2.click();
              sessionStorage.removeItem('adminLastTab');
            }
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  }

  // ---------- ЛОГИН ----------
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const data = Object.fromEntries(formData.entries());

      // Client-side validation
      if (!data.login || data.login.length < 3) return alert('Логин минимум 3 символа');
      if (!data.password || data.password.length < 6) return alert('Пароль минимум 6 символов');

      try {
        const res = await postJSON('/auth/login', data);
        if (res.ok && res.data.role) {
          window.location.href = '/';
        } else {
          alert(res.data.message || 'Ошибка входа');
        }
      } catch (err) {
        console.error('Login error:', err);
        alert('Ошибка сети при входе');
      }
    });
  }

  // ---------- РЕГИСТРАЦИЯ (общая, на index.html) ----------
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(registerForm);
      const data = Object.fromEntries(formData.entries());

      // Client-side validation
      if (!data.full_name || data.full_name.length < 3) return alert('Введите корректное ФИО');
      if (!data.login || !/^[A-Za-z0-9_]{3,30}$/.test(data.login)) return alert('Логин: 3-30 символов, буквы/цифры/_');
      if (!data.password || data.password.length < 6) return alert('Пароль минимум 6 символов');

      try {
        const res = await postJSON('/auth/register', data);
        if (!res.ok) {
          if (res.data && res.data.errors && res.data.errors.length) {
            const msg = res.data.errors.map(x => x.msg).join('\n');
            return alert(msg);
          }
          return alert(res.data.message || 'Ошибка регистрации');
        }
        alert(res.data.message || 'Регистрация завершена');
      } catch (err) {
        console.error('Register error:', err);
        alert('Ошибка сети при регистрации');
      }
    });
  }

  // ---------- ВЫХОД ----------
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await postJSON('/auth/logout', {});
        window.location.href = '/auth/login';
      } catch (err) {
        console.error('Logout error:', err);
        alert('Ошибка сети при выходе');
      }
    });
  }

  // ============================================================
  //                АДМИН-ПАНЕЛЬ (admin-dashboard.html)
  // ============================================================

  const roomTableBody = document.getElementById('roomTableBody');
  const complaintTableBody = document.getElementById('complaintTableBody');
  const archiveTableBody = document.getElementById('archiveTableBody');
  const teacherTableBody = document.getElementById('teacherTableBody');
  const teacherRoomsSelect = document.getElementById('teacherRoomsSelect');

  if (roomTableBody || complaintTableBody || teacherTableBody) {
    // мы на admin-dashboard.html
    fetch('/admin/dashboard')
      .then(r => r.json())
      .then(data => {
        // Аудитории
        if (roomTableBody && Array.isArray(data.rooms)) {
          roomTableBody.innerHTML = '';
          data.rooms.forEach(room => {
            const tr = document.createElement('tr');
            tr.dataset.id = room.id;
            tr.dataset.name = room.name;
            tr.innerHTML = `
              <td>${room.id}</td>
              <td>${room.name}</td>
            `;
            roomTableBody.appendChild(tr);
          });
          // Позволяем админу кликнуть по строке аудитории и перейти на страницу управления аудиторией
          roomTableBody.addEventListener('click', (e) => {
            const tr = e.target.closest('tr');
            if (!tr) return;
            const id = tr.dataset.id || tr.children[0]?.textContent?.trim();
            const name = tr.dataset.name || tr.children[1]?.textContent?.trim();
            const encName = encodeURIComponent(name || '');
            window.location.href = `/admin-room.html?roomId=${id}&roomName=${encName}`;
          });
        }

        // Жалобы и архив
        if (Array.isArray(data.complaints)) {
          // разделяем на активные и исправленные
          const active = data.complaints.filter(c => c.status !== 'исправлено');
          const archived = data.complaints.filter(c => c.status === 'исправлено');

          if (complaintTableBody) {
            complaintTableBody.innerHTML = '';
            active.forEach(c => {
              const tr = document.createElement('tr');
                tr.innerHTML = `
                  <td>${c.id}</td>
                  <td>${c.full_name || '-'}</td>
                  <td>${c.equipment_name || '-'}</td>
                  <td class="compl-desc">${c.description || '-'}</td>
                  <td>
                    <select class="status-select" data-id="${c.id}">
                      <option value="на рассмотрении" ${c.status === 'на рассмотрении' ? 'selected' : ''}>на рассмотрении</option>
                      <option value="в ремонте" ${c.status === 'в ремонте' ? 'selected' : ''}>в ремонте</option>
                      <option value="исправлено" ${c.status === 'исправлено' ? 'selected' : ''}>исправлено</option>
                    </select>
                  </td>
                  <td>
                    <button class="btn hover-highlight btn-status-save" data-id="${c.id}">Сохранить</button>
                    <button class="btn hover-highlight btn-open-complaint" data-id="${c.id}">Открыть</button>
                  </td>
                `;
              complaintTableBody.appendChild(tr);
            });

            complaintTableBody.addEventListener('click', async (e) => {
              const saveBtn = e.target.closest('.btn-status-save');
              const openBtn = e.target.closest('.btn-open-complaint');
              if (openBtn) {
                const id = openBtn.dataset.id;
                // preserve active admin tab so back can restore it
                const activeTabBtn = document.querySelector('.tab.active');
                const tabName = activeTabBtn ? activeTabBtn.dataset.tab : '';
                try {
                  if (tabName) sessionStorage.setItem('adminLastTab', tabName);
                } catch (e) {}
                window.location.href = `/admin-complaint.html?id=${encodeURIComponent(id)}`;
                return;
              }

              if (!saveBtn) return;

              const id = saveBtn.dataset.id;
              const select = complaintTableBody.querySelector(`select.status-select[data-id="${id}"]`);
              if (!select) return;

              const newStatus = select.value;
              try {
                const res = await fetch(`/admin/complaints/${id}/status`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: newStatus })
                });
                const json = await res.json();
                alert(json.message || 'Статус обновлён');
                // обновим страницу, чтобы архив/таблицы обновились
                location.reload();
              } catch (err) {
                console.error('Change status error:', err);
                alert('Ошибка при изменении статуса');
              }
            });
          }

          if (archiveTableBody) {
            archiveTableBody.innerHTML = '';
            archived.forEach(c => {
              const tr = document.createElement('tr');
              tr.innerHTML = `
                <td>${c.id}</td>
                <td>${c.full_name || '-'}</td>
                <td>${c.equipment_name || '-'}</td>
                <td>${c.description || '-'}</td>
                <td>${c.created_at || '-'}</td>
                <td>${c.updated_at || '-'}</td>
              `;
              archiveTableBody.appendChild(tr);
            });
          }
        }

        // Пользователи: преподаватели
        if (teacherTableBody && Array.isArray(data.teachers)) {
          teacherTableBody.innerHTML = '';
          data.teachers.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${t.id}</td>
              <td>${t.full_name}</td>
              <td>${t.login}</td>
              <td>
                <button class="btn hover-highlight btn-user-edit" data-id="${t.id}">Редактировать</button>
                <button class="btn hover-highlight btn-user-delete" data-id="${t.id}">Удалить</button>
              </td>
            `;
            teacherTableBody.appendChild(tr);
          });
        }

        // Администраторы
        if (adminTableBody && Array.isArray(data.admins)) {
          adminTableBody.innerHTML = '';
          data.admins.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${a.id}</td>
              <td>${a.full_name}</td>
              <td>${a.login}</td>
              <td>
                <button class="btn hover-highlight btn-user-edit" data-id="${a.id}">Редактировать</button>
                <button class="btn hover-highlight btn-user-delete" data-id="${a.id}">Удалить</button>
              </td>
            `;
            adminTableBody.appendChild(tr);
          });
        }

        // Обработчики редактирования/удаления для списков пользователей
        const attachUserHandlers = (container) => {
          if (!container) return;
          container.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.btn-user-edit');
            const deleteBtn = e.target.closest('.btn-user-delete');

            if (editBtn) {
              const id = editBtn.dataset.id;
              const tr = editBtn.closest('tr');
              const nameCell = tr.children[1];
              const loginCell = tr.children[2];

              const currentName = nameCell.textContent;
              const currentLogin = loginCell.textContent;

              const newName = prompt('Новое ФИО пользователя:', currentName);
              if (!newName) return;

              const newLogin = prompt('Новый логин пользователя:', currentLogin);
              if (!newLogin) return;

              const newPassword = prompt('Новый пароль (оставьте пустым, чтобы не менять):', '');

              try {
                const res = await fetch(`/admin/teachers/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ full_name: newName, login: newLogin, password: newPassword || '' })
                });
                const json = await res.json();
                alert(json.message || 'Пользователь обновлён');
                nameCell.textContent = newName;
                loginCell.textContent = newLogin;
              } catch (err) {
                console.error('Update user error:', err);
                alert('Ошибка при обновлении пользователя');
              }
            }

            if (deleteBtn) {
              const id = deleteBtn.dataset.id;
              if (!confirm('Удалить пользователя?')) return;
              try {
                const res = await fetch(`/admin/teachers/${id}`, { method: 'DELETE' });
                const json = await res.json();
                alert(json.message || 'Пользователь удалён');
                deleteBtn.closest('tr').remove();
              } catch (err) {
                console.error('Delete user error:', err);
                alert('Ошибка при удалении пользователя');
              }
            }
          });
        };

        attachUserHandlers(teacherTableBody);
        attachUserHandlers(adminTableBody);

        // Наполняем мультиселект аудиторий при добавлении преподавателя
        if (teacherRoomsSelect && Array.isArray(data.rooms)) {
          teacherRoomsSelect.innerHTML = '';
          data.rooms.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.textContent = r.name;
            teacherRoomsSelect.appendChild(opt);
          });
        }

        // Insert role field according to current user: main admin -> select, others -> hidden role=teacher
        try {
          const roleContainer = document.getElementById('roleFieldContainer');
          const current = data.currentUser;
          if (roleContainer) {
            roleContainer.innerHTML = '';
            if (current && String(current.login || '').toLowerCase() === 'admin') {
              const label = document.createElement('label');
              label.textContent = 'Роль';

              const select = document.createElement('select');
              select.name = 'role';

              const optTeacher = document.createElement('option');
              optTeacher.value = 'teacher';
              optTeacher.textContent = 'Преподаватель';
              select.appendChild(optTeacher);

              const optAdmin = document.createElement('option');
              optAdmin.value = 'admin';
              optAdmin.textContent = 'Администратор';
              select.appendChild(optAdmin);

              const hint = document.createElement('div');
              hint.className = 'hint';
              hint.textContent = 'Выберите роль пользователя в системе';

              label.appendChild(select);
              label.appendChild(hint);
              roleContainer.appendChild(label);
            } else {
              const hidden = document.createElement('input');
              hidden.type = 'hidden';
              hidden.name = 'role';
              hidden.value = 'teacher';
              roleContainer.appendChild(hidden);
            }
          }
        } catch (e) {
          console.error('Adjust role field error:', e);
        }
      })
      .catch(err => {
        console.error('Load admin dashboard error:', err);
      });
  }

  // Создание аудитории
  if (roomForm) {
    roomForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(roomForm);
      const data = Object.fromEntries(formData.entries());
      if (!data.name || data.name.trim().length === 0) return alert('Название аудитории обязательно');

      try {
        const res = await fetch('/admin/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        alert(json.message || 'Аудитория создана');
        // Перезагрузим страницу, чтобы в списке появилась новая аудитория
        location.reload();
      } catch (err) {
        console.error('Create room error:', err);
        alert('Ошибка при создании аудитории');
      }
    });
  }

  // Управление пользователями (таб "Пользователи")
  const adminTableBody = document.getElementById('adminTableBody');
  if (userRegisterForm) {
    console.log('Found userRegisterForm, attaching event listener');
    userRegisterForm.addEventListener('submit', async (e) => {
      console.log('userRegisterForm submit event fired');
      e.preventDefault();
      const formData = new FormData(userRegisterForm);
      const data = Object.fromEntries(formData.entries());

      const roomsSelect = document.getElementById('teacherRoomsSelect');
      if (roomsSelect) {
        const selectedRooms = Array.from(roomsSelect.selectedOptions).map(o => o.value);
        data.rooms = selectedRooms;
      }

      // client-side validation
      if (!data.full_name || data.full_name.length < 3) return alert('Введите корректное ФИО');
      if (!data.login || !/^[A-Za-z0-9_]{3,30}$/.test(data.login)) return alert('Логин: 3-30 символов, буквы/цифры/_');
      if (!data.password || data.password.length < 6) return alert('Пароль минимум 6 символов');

      try {
        const res = await postJSON('/auth/register', data);
        console.log('Register response:', res);
        if (!res.ok) {
          return alert(res.data.message || 'Ошибка при регистрации');
        }
        alert(res.data.message || 'Пользователь добавлен');
        try { sessionStorage.setItem('adminLastTab', 'teachers'); } catch (e) {}
        location.reload();
      } catch (err) {
        console.error('Register user error:', err);
        alert('Ошибка при добавлении пользователя');
      }
    });
  }

  // действия над списками преподавателей и админов
  if (teacherTableBody || adminTableBody) {
    const tableContainer = document.getElementById('teacherTableBody');
    // обработчики редактирования/удаления находятся дальше при отрисовке таблиц
  }

  // ============================================================
  //              СТРАНИЦА АУДИТОРИИ (admin-room.html)
  // ============================================================

  const roomPageTitle = document.getElementById('roomPageTitle');
  const equipmentForm = document.getElementById('equipmentForm');
  const equipmentTableBody = document.getElementById('equipmentTableBody');
  const roomTeachersTableBody = document.getElementById('roomTeachersTableBody');
  const roomTeacherForm = document.getElementById('roomTeacherForm');
  const roomTeacherSelect = document.getElementById('roomTeacherSelect');

  if (roomPageTitle) {
    // Мы на странице admin-room.html
    const { roomId, roomName } = getQueryParams();
    if (!roomId) {
      roomPageTitle.textContent = 'Аудитория (ID не задан)';
    } else {
      roomPageTitle.textContent = `Аудитория ${roomName || roomId}`;
      loadRoomData();
    }

    async function loadRoomData() {
      const res = await fetch(`/admin/rooms/${roomId}/data`);
      const data = await res.json();

      // Оборудование
      equipmentTableBody.innerHTML = '';
      (data.equipment || []).forEach(eq => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${eq.id}</td>
          <td><input type="text" value="${eq.name}" data-field="name" data-id="${eq.id}" /></td>
          <td><input type="text" value="${eq.serial_number || ''}" data-field="serial_number" data-id="${eq.id}" /></td>
          <td><input type="date" value="${eq.purchase_date || ''}" data-field="purchase_date" data-id="${eq.id}" /></td>
          <td>
            <select data-status-id="${eq.id}">
              <option value="в работе" ${eq.status === 'в работе' ? 'selected' : ''}>в работе</option>
              <option value="на рассмотрении" ${eq.status === 'на рассмотрении' ? 'selected' : ''}>на рассмотрении</option>
              <option value="в ремонте" ${eq.status === 'в ремонте' ? 'selected' : ''}>в ремонте</option>
              <option value="исправлено" ${eq.status === 'исправлено' ? 'selected' : ''}>исправлено</option>
            </select>
          </td>
          <td>
            <button class="btn btn-sm hover-highlight btn-eq-save" data-id="${eq.id}" aria-label="Сохранить">
              ✓
            </button>
            <button class="btn btn-sm btn-danger btn-eq-delete" data-id="${eq.id}">Удалить</button>
          </td>
        `;
        equipmentTableBody.appendChild(tr);
      });

      // Преподаватели в аудитории
      roomTeachersTableBody.innerHTML = '';
      const assigned = data.roomTeachers || [];
      assigned.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${t.id}</td>
          <td>${t.full_name}</td>
          <td>${t.login}</td>
          <td>
            <button class="btn hover-highlight btn-room-teacher-remove" data-id="${t.id}">Удалить</button>
          </td>
        `;
        roomTeachersTableBody.appendChild(tr);
      });

      // Селект "Добавить преподавателя в аудиторию"
      roomTeacherSelect.innerHTML = '';
      const assignedIds = new Set(assigned.map(t => String(t.id)));
      (data.allTeachers || []).forEach(t => {
        if (!assignedIds.has(String(t.id))) {
          const opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = t.full_name + ' (' + t.login + ')';
          roomTeacherSelect.appendChild(opt);
        }
      });
    }

    // Добавление оборудования
    if (equipmentForm) {
      equipmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(equipmentForm);
        const data = Object.fromEntries(formData.entries());

        try {
          const res = await fetch(`/admin/rooms/${roomId}/equipment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          await res.json();
          alert('Оборудование добавлено');
          equipmentForm.reset();
          await loadRoomData();
        } catch (err) {
          console.error('Add equipment error:', err);
          alert('Ошибка при добавлении оборудования');
        }
      });
    }

    // Сохранение изменений оборудования
    if (equipmentTableBody) {
      equipmentTableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-eq-save');
        if (!btn) return;

        const id = btn.dataset.id;
        const row = btn.closest('tr');
        const nameInput = row.querySelector('input[data-field="name"]');
        const numberInput = row.querySelector('input[data-field="serial_number"]');
        const dateInput = row.querySelector('input[data-field="purchase_date"]');
        const statusSelect = row.querySelector('select[data-status-id]');

        const payload = {
          name: nameInput.value,
          serial_number: numberInput.value,
          purchase_date: dateInput.value,
          status: statusSelect ? statusSelect.value : undefined
        };

        try {
          const res = await fetch(`/admin/equipment/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          alert(json.message || 'Оборудование обновлено');
        } catch (err) {
          console.error('Update equipment error:', err);
          alert('Ошибка при обновлении оборудования');
        }
      });
    }

    // Удаление оборудования
    equipmentTableBody.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('.btn-eq-delete');
      if (!delBtn) return;
      const id = delBtn.dataset.id;
      if (!confirm('Удалить оборудование?')) return;
      try {
        const res = await fetch(`/admin/equipment/${id}`, { method: 'DELETE' });
        const json = await res.json();
        alert(json.message || 'Оборудование удалено');
        await loadRoomData();
      } catch (err) {
        console.error('Delete equipment error:', err);
        alert('Ошибка при удалении оборудования');
      }
    });

    // Добавление преподавателя в аудиторию
    if (roomTeacherForm) {
      roomTeacherForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(roomTeacherForm);
        const data = Object.fromEntries(formData.entries());

        try {
          const res = await fetch(`/admin/rooms/${roomId}/teachers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          const json = await res.json();
          alert(json.message || 'Преподаватель добавлен');
          await loadRoomData();
        } catch (err) {
          console.error('Assign teacher error:', err);
          alert('Ошибка при добавлении преподавателя в аудиторию');
        }
      });
    }

    // Удаление преподавателя из аудитории
    if (roomTeachersTableBody) {
      roomTeachersTableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-room-teacher-remove');
        if (!btn) return;
        const teacherId = btn.dataset.id;
        if (!confirm('Удалить преподавателя из аудитории?')) return;

        try {
          const res = await fetch(`/admin/rooms/${roomId}/teachers/${teacherId}`, {
            method: 'DELETE'
          });
          const json = await res.json();
          alert(json.message || 'Преподаватель удалён из аудитории');
          await loadRoomData();
        } catch (err) {
          console.error('Remove teacher from room error:', err);
          alert('Ошибка при удалении преподавателя из аудитории');
        }
      });
    }

    // Удалить аудиторию целиком
    const deleteRoomBtn = document.getElementById('deleteRoomBtn');
    if (deleteRoomBtn) {
      deleteRoomBtn.addEventListener('click', async () => {
        if (!confirm('Удалить аудиторию и все связанные данные (оборудование, жалобы, привязки преподавателей)?')) return;
        try {
          const res = await fetch(`/admin/rooms/${roomId}`, { method: 'DELETE' });
          const json = await res.json();
          alert(json.message || 'Аудитория удалена');
          // вернёмся в админ-панель
          window.location.href = '/';
        } catch (err) {
          console.error('Delete room error:', err);
          alert('Ошибка при удалении аудитории');
        }
      });
    }
  }

  // ============================================================
  //                СТРАНИЦА ПРЕПОДА (user-dashboard.html)
  // ============================================================

  // Навигация: клик по аудитории в списке пользователя → открывает страницу аудитории
  const userRoomsTableBody = document.getElementById('userRoomsTableBody');
  if (userRoomsTableBody) {
    userRoomsTableBody.addEventListener('click', (e) => {
      const tr = e.target.closest('tr');
      if (!tr) return;
      const id = tr.dataset.id || tr.children[0]?.textContent?.trim();
      const name = tr.dataset.name || tr.children[1]?.textContent?.trim();
      const encName = encodeURIComponent(name || '');
      window.location.href = `/user-room.html?roomId=${id}&roomName=${encName}`;
    });
  }

  // Страница аудитории (user-room.html): загрузка оборудования и выбор для жалобы
  const userEquipmentTableBody = document.getElementById('userEquipmentTableBody');
  const userRoomTitle = document.getElementById('userRoomTitle');
  if (userEquipmentTableBody) {
    const { roomId, roomName } = getQueryParams();
    const initialRoomName = roomName || roomId;
    if (userRoomTitle) userRoomTitle.textContent = `Аудитория ${initialRoomName}`;
    // keep initial room name on body so it can't become undefined if URL changes
    try { document.body.dataset.roomName = initialRoomName; } catch (e) {}

    async function loadUserRoomEquipment() {
      try {
        const res = await fetch(`/user/rooms/${roomId}/equipment`);
        const json = await res.json();
        userEquipmentTableBody.innerHTML = '';
        (json.equipment || []).forEach(eq => {
          const tr = document.createElement('tr');
          tr.dataset.id = eq.id;
          tr.dataset.name = eq.name;
          // add classes based on status to visually mark and block selection
          const statusText = (eq.status || (eq.is_active ? 'в работе' : 'неисправно')) || '';
          const lower = String(statusText).toLowerCase();
          if (lower === 'на рассмотрении') tr.classList.add('status-review');
          if (lower === 'в ремонте') tr.classList.add('status-repair');
          tr.innerHTML = `
            <td>${eq.id}</td>
            <td>${eq.name}</td>
            <td>${eq.serial_number || ''}</td>
            <td>${eq.purchase_date || ''}</td>
            <td>${statusText}</td>
          `;
          userEquipmentTableBody.appendChild(tr);
        });
      } catch (err) {
        console.error('Load user room equipment error:', err);
      }
    }

    // Авто-обновление оборудования на странице пользователя
    // (удалён вызов `loadRoomData()` — он относится к админской странице и вызывал ошибку)

    // Выбор оборудования — заполняет форму жалобы
    userEquipmentTableBody.addEventListener('click', (e) => {
      const tr = e.target.closest('tr');
      if (!tr) return;
      // don't allow selecting rows that are under review or in repair
      if (tr.classList.contains('status-review') || tr.classList.contains('status-repair')) {
        alert('По этому оборудованию жалоба уже принимается или оно в ремонте');
        return;
      }
      const eqId = tr.dataset.id;
      const eqName = tr.dataset.name;
      const roomIdInput = document.getElementById('complaintRoomId');
      const eqIdInput = document.getElementById('complaintEquipmentId');
      const eqNameInput = document.getElementById('complaintEquipmentName');
      if (roomIdInput) roomIdInput.value = getQueryParams().roomId || '';
      if (eqIdInput) eqIdInput.value = eqId || '';
      if (eqNameInput) eqNameInput.value = eqName || '';

      // Визуально выделяем выбранную строку
      Array.from(userEquipmentTableBody.querySelectorAll('tr')).forEach(r => r.classList.remove('selected'));
      tr.classList.add('selected');
    });

    loadUserRoomEquipment();
    // автоперезагрузка оборудования на странице пользователя чтобы отражать изменения статуса
    let userRoomInterval = null;
    if (!userRoomInterval) {
      userRoomInterval = setInterval(() => {
        loadUserRoomEquipment().catch(err => console.error('Auto refresh user room equipment error:', err));
      }, 8000);
    }
  }

  if (complaintForm) {
    complaintForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(complaintForm);
      // client-side validation: ensure equipment selected and description length
      const roomIdVal = document.getElementById('complaintRoomId')?.value;
      const equipmentIdVal = document.getElementById('complaintEquipmentId')?.value;
      const desc = complaintForm.querySelector('textarea[name="description"]')?.value || '';
      if (!roomIdVal || !equipmentIdVal) return alert('Выберите аудиторию и оборудование перед отправкой');
      if (desc.length < 5) return alert('Описание должно быть минимум 5 символов');

      try {
          // ensure no native form submit
          e.preventDefault();
          e.stopPropagation();

          const res = await fetch('/complaints', {
            method: 'POST',
            body: formData
          });

          // Пытаемся распарсить JSON — если статус не OK, покажем сообщение об ошибке
          const json = await res.json().catch(() => null);
          if (!res.ok) {
            const msg = (json && json.message) || `Ошибка сервера (${res.status})`;
            alert(msg);
            return;
          }

          alert(json?.message || 'Жалоба отправлена');
          complaintForm.reset();

          // Визуально помечаем выбранную строку оборудования и ставим статус 'на рассмотрении'
          const selected = document.querySelector('#userEquipmentTableBody tr.selected');
          if (selected) {
            selected.classList.add('sent');
            const statusCell = selected.children[4];
            if (statusCell) statusCell.textContent = 'на рассмотрении';
          }

          // restore room title from stored value (avoid 'undefined') and refresh equipment list from server
          try {
            const rn = document.body.dataset.roomName || initialRoomName;
            if (userRoomTitle) userRoomTitle.textContent = `Аудитория ${rn}`;
          } catch (e) {}
          // reload equipment to reflect server-side state
          try { await loadUserRoomEquipment(); } catch (e) { console.error('Refresh after complaint error', e); }
        } catch (err) {
          console.error('Create complaint error:', err);
          alert('Ошибка сети при отправке жалобы');
        }
    });
  }

  // ============================================================
  //              СИСТЕМА УВЕДОМЛЕНИЙ
  // ============================================================

  const notificationBtn = document.getElementById('notificationBtn');
  const notificationDropdown = document.getElementById('notificationDropdown');
  const notificationList = document.getElementById('notificationList');
  const notificationBadge = document.getElementById('notificationBadge');
  const markAllReadBtn = document.getElementById('markAllReadBtn');

  if (notificationBtn) {
    // Открыть/закрыть меню уведомлений
    notificationBtn.addEventListener('click', () => {
      notificationDropdown.classList.toggle('open');
    });

    // Закрыть меню при клике вне его
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.notification-bell')) {
        notificationDropdown.classList.remove('open');
      }
    });

    // Загрузить и отобразить уведомления
    async function loadNotifications() {
      try {
        const res = await fetch('/notifications');
        if (!res.ok) return;
        const { notifications, unreadCount } = await res.json();

        // Обновить счетчик
        notificationBadge.textContent = unreadCount;
        if (unreadCount > 0) {
          notificationBadge.classList.add('has-unread');
        } else {
          notificationBadge.classList.remove('has-unread');
        }

        // Отобразить уведомления
        if (!notifications || notifications.length === 0) {
          notificationList.innerHTML = '<p class="notification-empty">Нет уведомлений</p>';
          return;
        }

        notificationList.innerHTML = '';
        notifications.forEach(notif => {
          const div = document.createElement('div');
          div.className = `notification-item ${notif.is_read === 0 ? 'unread' : ''}`;

          const content = document.createElement('div');
          content.className = 'notification-content';

          const title = document.createElement('p');
          title.className = 'notification-title';
          title.textContent = notif.title;
          content.appendChild(title);

          const message = document.createElement('p');
          message.className = 'notification-message';
          message.textContent = notif.message;
          content.appendChild(message);

          const time = document.createElement('div');
          time.className = 'notification-time';
          // parse SQLite datetime like 'YYYY-MM-DD HH:MM:SS' into a JS Date reliably
          let createdDate = new Date(notif.created_at);
          try {
            if (!createdDate || isNaN(createdDate.getTime())) {
              if (notif.created_at && typeof notif.created_at === 'string') {
                const iso = notif.created_at.replace(' ', 'T') + 'Z';
                createdDate = new Date(iso);
              }
            }
          } catch (e) { /* ignore parse errors */ }
          time.textContent = formatTime(createdDate instanceof Date && !isNaN(createdDate.getTime()) ? createdDate : new Date());
          content.appendChild(time);

          const badge = document.createElement('div');
          badge.className = `notification-type-badge ${notif.type || 'info'}`;
          badge.textContent = notif.type === 'warning' ? 'Заявка' : (notif.type === 'success' ? 'Выполнено' : 'Обновление');
          content.appendChild(badge);

          div.appendChild(content);

          // Кнопка удаления
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'notification-delete-btn';
          deleteBtn.innerHTML = '×';
          deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
              await fetch(`/notifications/${notif.id}`, { method: 'DELETE' });
              loadNotifications();
            } catch (err) {
              console.error('Delete notification error:', err);
            }
          });
          div.appendChild(deleteBtn);

          // Клик по уведомлению - отметить как прочитанное и перейти к жалобе
          div.addEventListener('click', async () => {
            try {
              // preserve active admin tab so back can restore it
              try {
                const activeTabBtn = document.querySelector('.tab.active');
                const tabName = activeTabBtn ? activeTabBtn.dataset.tab : '';
                if (tabName) sessionStorage.setItem('adminLastTab', tabName);
              } catch (e) {}

              if (notif.is_read === 0) {
                await fetch(`/notifications/${notif.id}/read`, { method: 'PUT' });
              }

              // if notification refers to a complaint — open its detail page
              if (notif.complaint_id) {
                window.location.href = `/admin-complaint.html?id=${encodeURIComponent(notif.complaint_id)}`;
                return;
              }

              // otherwise just reload the list
              loadNotifications();
            } catch (err) {
              console.error('Notification click error:', err);
            }
          });

          notificationList.appendChild(div);
        });
      } catch (err) {
        console.error('Load notifications error:', err);
      }
    }

    // Отметить все как прочитанные
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await fetch('/notifications/read/all', { method: 'PUT' });
          loadNotifications();
        } catch (err) {
          console.error('Mark all as read error:', err);
        }
      });
    }

    // Загрузить уведомления при загрузке страницы
    loadNotifications();

    // Обновлять уведомления каждые 30 секунд
    setInterval(loadNotifications, 30000);
  }

  // Функция для форматирования времени
  function formatTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'только что';
    if (diffMins < 60) return `${diffMins}м назад`;
    if (diffHours < 24) return `${diffHours}ч назад`;
    if (diffDays < 7) return `${diffDays}д назад`;
    
    return date.toLocaleDateString('ru-RU');
  }
});

