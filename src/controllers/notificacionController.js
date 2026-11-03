const mongoose = require('mongoose');
const Notificacion = require('../models/Notificacion');
require('../models/Coincidencia');
async function listar(req, res) {
  try {
    const notificaciones = await Notificacion.find({
      usuario: req.session.usuario.id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('coincidencia');

    res.render('notificaciones/listado', { notificaciones });
  } catch (error) {
    console.error('Error al listar notificaciones:', error.message);
    res.status(500).send('Error al cargar las notificaciones');
  }
}

async function marcarLeida(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).send('Notificación no encontrada');
    }

    // Filtra también por usuario: nadie puede tocar notificaciones ajenas
    const notificacion = await Notificacion.findOneAndUpdate(
      { _id: id, usuario: req.session.usuario.id },
      { leida: true },
      { new: true }
    );

    if (!notificacion) {
      return res.status(404).send('Notificación no encontrada');
    }

    res.redirect('/notificaciones');
  } catch (error) {
    console.error('Error al marcar notificación:', error.message);
    res.status(500).send('No se pudo actualizar la notificación');
  }
}

async function marcarTodasLeidas(req, res) {
  try {
    await Notificacion.updateMany(
      { usuario: req.session.usuario.id, leida: false },
      { leida: true }
    );
    res.redirect('/notificaciones');
  } catch (error) {
    console.error('Error al marcar todas como leídas:', error.message);
    res.status(500).send('No se pudieron actualizar las notificaciones');
  }
}

module.exports = { listar, marcarLeida, marcarTodasLeidas };