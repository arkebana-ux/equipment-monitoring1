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
  const teacherForm = document.getElementById('teacherForm');

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
  }

  // ---------- ЛОГИН ----------
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const data = Object.fromEntries(formData.entries());

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

      try {
        const res = await postJSON('/auth/register', data);
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
        }

        // Жалобы
        if (complaintTableBody && Array.isArray(data.complaints)) {
          complaintTableBody.innerHTML = '';
          data.complaints.forEach(c => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
              <td>${c.id}</td>
              <td>${c.full_name || '-'}</td>
              <td>${c.equipment_name || '-'}</td>
              <td>${c.description || '-'}</td>
              <td>
                <select class="status-select" data-id="${c.id}">
                  <option value="на рассмотрении" ${c.status === 'на рассмотрении' ? 'selected' : ''}>на рассмотрении</option>
                  <option value="в ремонте" ${c.status === 'в ремонте' ? 'selected' : ''}>в ремонте</option>
                  <option value="исправлено" ${c.status === 'исправлено' ? 'selected' : ''}>исправлено</option>
                </select>
              </td>
              <td>
                <button class="btn hover-highlight btn-status-save" data-id="${c.id}">Сохранить</button>
              </td>
            `;
            complaintTableBody.appendChild(tr);
          });

          complaintTableBody.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-status-save');
            if (!btn) return;

            const id = btn.dataset.id;
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
            } catch (err) {
              console.error('Change status error:', err);
              alert('Ошибка при изменении статуса');
            }
          });
        }

        // Преподаватели (таблица во вкладке "Добавление преподавателей")
        if (teacherTableBody && Array.isArray(data.teachers)) {
          teacherTableBody.innerHTML = '';
          data.teachers.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${t.id}</td>
              <td>${t.full_name}</td>
              <td>${t.login}</td>
              <td>
                <button class="btn hover-highlight btn-teacher-edit" data-id="${t.id}">Редактировать</button>
                <button class="btn hover-highlight btn-teacher-delete" data-id="${t.id}">Удалить</button>
              </td>
            `;
            teacherTableBody.appendChild(tr);
          });
        }

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

      try {
        const res = await postJSON('/admin/rooms', data);
        alert('Аудитория добавлена: ' + res.data.name);
        location.reload();
      } catch (err) {
        console.error('Create room error:', err);
        alert('Ошибка при добавлении аудитории');
      }
    });
  }

  // Клик по аудитории → переход на admin-room.html
  if (roomTableBody) {
    roomTableBody.addEventListener('click', (e) => {
      const tr = e.target.closest('tr');
      if (!tr) return;
      const id = tr.dataset.id;
      const name = encodeURIComponent(tr.dataset.name);
      window.location.href = `/admin-room.html?roomId=${id}&roomName=${name}`;
    });
  }

  // Добавление преподавателя (во вкладке админа)
  if (teacherForm) {
    teacherForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(teacherForm);
      const data = Object.fromEntries(formData.entries());

      const roomsSelect = document.getElementById('teacherRoomsSelect');
      const selectedRooms = Array.from(roomsSelect.selectedOptions).map(o => o.value);
      data.rooms = selectedRooms;

      try {
        const res = await postJSON('/auth/register', data);
        alert(res.data.message || 'Преподаватель добавлен');
        location.reload();
      } catch (err) {
        console.error('Register teacher error:', err);
        alert('Ошибка при добавлении преподавателя');
      }
    });

    if (teacherTableBody) {
      teacherTableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-teacher-edit');
        const deleteBtn = e.target.closest('.btn-teacher-delete');

        // --- РЕДАКТИРОВАНИЕ ПРЕПОДАВАТЕЛЯ (ФИО + ЛОГИН + ПАРОЛЬ) ---
        if (editBtn) {
          const id = editBtn.dataset.id;
          const tr = editBtn.closest('tr');
          const nameCell = tr.children[1];
          const loginCell = tr.children[2];

          const currentName = nameCell.textContent;
          const currentLogin = loginCell.textContent;

          const newName = prompt('Новое ФИО преподавателя:', currentName);
          if (!newName) return;

          const newLogin = prompt('Новый логин преподавателя:', currentLogin);
          if (!newLogin) return;

          const newPassword = prompt('Новый пароль (оставьте пустым, чтобы не менять):', '');

          try {
            const res = await fetch(`/admin/teachers/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                full_name: newName,
                login: newLogin,
                password: newPassword || ''
              })
            });
            const json = await res.json();
            alert(json.message || 'Преподаватель обновлён');
            nameCell.textContent = newName;
            loginCell.textContent = newLogin;
          } catch (err) {
            console.error('Update teacher error:', err);
            alert('Ошибка при обновлении преподавателя');
          }
        }

        // --- УДАЛЕНИЕ ПРЕПОДАВАТЕЛЯ ---
        if (deleteBtn) {
          const id = deleteBtn.dataset.id;
          if (!confirm('Удалить преподавателя?')) return;
          try {
            const res = await fetch(`/admin/teachers/${id}`, {
              method: 'DELETE'
            });
            const json = await res.json();
            alert(json.message || 'Преподаватель удалён');
            deleteBtn.closest('tr').remove();
          } catch (err) {
            console.error('Delete teacher error:', err);
            alert('Ошибка при удалении преподавателя');
          }
        }
      });
    }
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
            <input type="checkbox" data-active-id="${eq.id}" ${eq.is_active ? 'checked' : ''} />
          </td>
          <td>
            <button class="btn hover-highlight btn-eq-save" data-id="${eq.id}">Сохранить</button>
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
        const activeCheckbox = row.querySelector('input[data-active-id]');

        const payload = {
          name: nameInput.value,
          serial_number: numberInput.value,
          purchase_date: dateInput.value
        };

        try {
          const res = await fetch(`/admin/equipment/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          await res.json();

          const res2 = await fetch(`/admin/equipment/${id}/active`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: activeCheckbox.checked })
          });
          const json2 = await res2.json();
          alert(json2.message || 'Оборудование обновлено');
        } catch (err) {
          console.error('Update equipment error:', err);
          alert('Ошибка при обновлении оборудования');
        }
      });
    }

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
  }

  // ============================================================
  //                СТРАНИЦА ПРЕПОДА (user-dashboard.html)
  // ============================================================

  if (complaintForm && !teacherForm) {
    complaintForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(complaintForm);

      try {
        const res = await fetch('/complaints', {
          method: 'POST',
          body: formData
        });
        const json = await res.json();
        alert(json.message || 'Жалоба отправлена');
        complaintForm.reset();
      } catch (err) {
        console.error('Create complaint error:', err);
        alert('Ошибка сети при отправке жалобы');
      }
    });
  }
});
