function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  req.session.redirectAfterLogin = req.originalUrl;
  return res.redirect('/admin/login');
}

function redirectIfAuthed(req, res, next) {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin');
  }
  return next();
}

module.exports = { requireAuth, redirectIfAuthed };
