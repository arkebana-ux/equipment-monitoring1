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

module.exports = { ensureAuth, ensureRole };  // Теперь экспортируем ensureAuth
