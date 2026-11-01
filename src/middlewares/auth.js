function requireLogin(req, res, next) {
  if (!req.session.usuario) {
    req.session.error = 'Tenés que iniciar sesión para continuar';
    return res.redirect('/login');
  }
  next();
}

module.exports = { requireLogin };
