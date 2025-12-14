function ensureAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }
  next();
}

function ensureRole(role) {
  return (req, res, next) => {
    if (!req.session.user || req.session.user.role !== role) {
      return res.status(403).json({ message: 'Нет доступа' });
    }
    next();
  };
}

function ensureMainAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(403).json({ message: 'Требуется главный администратор' });
  }
  const login = String(req.session.user.login || '').toLowerCase();
  if (login !== 'admin') {
    return res.status(403).json({ message: 'Требуется главный администратор' });
  }
  next();
}

module.exports = { ensureAuth, ensureRole, ensureMainAdmin };  // Теперь экспортируем ensureAuth
