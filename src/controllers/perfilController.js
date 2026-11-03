const Usuario = require('../models/Usuario');
const Publicacion = require('../models/Publicacion');

async function ver(req, res) {
  try {
    const usuario = await Usuario.findById(req.session.usuario.id).select('-password');
    if (!usuario) {
      return res.redirect('/login');
    }

    const publicaciones = await Publicacion.find({ usuario: usuario._id }).sort({ createdAt: -1 });

    const activas = publicaciones.filter((p) => p.estado === 'activa').length;
    const resueltas = publicaciones.length - activas;

    res.render('perfil', { perfil: usuario, publicaciones, activas, resueltas });
  } catch (error) {
    console.error('Error al cargar el perfil:', error.message);
    res.status(500).send('No se pudo cargar el perfil.');
  }
}

module.exports = { ver };