const { COOKIE_NAME, verifySession, ADMIN_COOKIE_NAME, verifyAdminSession } = require('../utils/auth.util');

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  const user = token && verifySession(token);
  if (!user) return res.status(401).json({ ok: false, error: 'Please sign in.' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  const session = token && verifyAdminSession(token);
  if (!session) return res.status(401).json({ ok: false, error: 'Admin sign-in required.' });
  next();
}

module.exports = { requireAuth, requireAdmin };
