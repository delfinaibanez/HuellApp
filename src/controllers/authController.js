const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');

function mostrarRegistro(req, res) {
  res.render('registro');
}

function mostrarLogin(req, res) {
  res.render('login');
}

async function registrar(req, res) {
  try {
    const { nombre, email, password, zona } = req.body;

    if (!nombre || !email || !password) {
      req.session.error = 'Completá nombre, email y contraseña';
      return res.redirect('/registro');
    }
    if (password.length < 6) {
      req.session.error = 'La contraseña debe tener al menos 6 caracteres';
      return res.redirect('/registro');
    }

    const existe = await Usuario.findOne({ email: email.toLowerCase().trim() });
    if (existe) {
      req.session.error = 'Ya existe una cuenta con ese email';
      return res.redirect('/registro');
    }

    const hash = await bcrypt.hash(password, 10);
    const usuario = await Usuario.create({ nombre, email, password: hash, zona });

    req.session.usuario = { id: usuario._id.toString(), nombre: usuario.nombre };
    res.redirect('/');
  } catch (error) {
    console.error('Error en registro:', error.message);
    req.session.error = 'Ocurrió un error, probá de nuevo';
    res.redirect('/registro');
  }
}

async function iniciarSesion(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      req.session.error = 'Completá email y contraseña';
      return res.redirect('/login');
    }

    const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() });
    const passwordOk = usuario && (await bcrypt.compare(password, usuario.password));

    if (!passwordOk) {
      req.session.error = 'Email o contraseña incorrectos';
      return res.redirect('/login');
    }

    req.session.usuario = { id: usuario._id.toString(), nombre: usuario.nombre };
    res.redirect('/');
  } catch (error) {
    console.error('Error en login:', error.message);
    req.session.error = 'Ocurrió un error, probá de nuevo';
    res.redirect('/login');
  }
}

function cerrarSesion(req, res) {
  req.session.destroy(() => {
    res.redirect('/');
  });
}

module.exports = {
  mostrarRegistro,
  mostrarLogin,
  registrar,
  iniciarSesion,
  cerrarSesion,
};