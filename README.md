# Equipment Monitoring

Система учета аудиторий, оборудования и заявок на неисправности.

## Что уже есть

- роли `teacher`, `admin`, `super admin` через `is_super_admin`;
- главный администратор может управлять другими администраторами;
- обычный администратор не видит блок управления администраторами;
- архив заявок с удалением только для главного администратора;
- светлая админка с вкладками:
  - `Аудитории`
  - `Заявки`
  - `Архив`
  - `Пользователи`
  - `Аналитика`
- карточка заявки:
  - данные заявки
  - назначение ответственного администратора
  - комментарии
  - история изменений
  - вложения
- экспорт:
  - архив в CSV
  - аналитика в CSV
  - печатный отчет аналитики для сохранения в PDF
- демо-данные через `scripts/seed-demo-data.js`.

## Важные файлы

- [server.js](C:\Users\arkeb\Documents\GitHub\equipment-monitoring1\server.js)
- [src/config/db.js](C:\Users\arkeb\Documents\GitHub\equipment-monitoring1\src\config\db.js)
- [src/controllers/adminController.js](C:\Users\arkeb\Documents\GitHub\equipment-monitoring1\src\controllers\adminController.js)
- [src/controllers/complaintController.js](C:\Users\arkeb\Documents\GitHub\equipment-monitoring1\src\controllers\complaintController.js)
- [src/routes/adminRoutes.js](C:\Users\arkeb\Documents\GitHub\equipment-monitoring1\src\routes\adminRoutes.js)
- [public/admin-dashboard.html](C:\Users\arkeb\Documents\GitHub\equipment-monitoring1\public\admin-dashboard.html)
- [public/admin-complaint.html](C:\Users\arkeb\Documents\GitHub\equipment-monitoring1\public\admin-complaint.html)
- [public/js/main.js](C:\Users\arkeb\Documents\GitHub\equipment-monitoring1\public\js\main.js)
- [public/css/styles.css](C:\Users\arkeb\Documents\GitHub\equipment-monitoring1\public\css\styles.css)
- [scripts/seed-demo-data.js](C:\Users\arkeb\Documents\GitHub\equipment-monitoring1\scripts\seed-demo-data.js)

## Проверка

- синтаксис:
```powershell
node --check server.js
node --check src\controllers\adminController.js
node --check src\controllers\complaintController.js
node --check public\js\main.js
```

- демо-данные:
```powershell
node scripts\seed-demo-data.js
```

## Тестовые доступы

- главный администратор: `Admin / MainAdmin_2026`
- обычный администратор: `assistant_admin / Admin_2026`

## Важно

- если интерфейс ведет себя странно после правок, сначала сделать `Ctrl+F5`;
- в проекте есть изменяемая SQLite база `db.sqlite3`, многие визуальные проверки завязаны на текущие данные;
- продолжение плана и рабочие детали вынесены в [TASKS.md](C:\Users\arkeb\Documents\GitHub\equipment-monitoring1\TASKS.md) и [NOTES.md](C:\Users\arkeb\Documents\GitHub\equipment-monitoring1\NOTES.md).
