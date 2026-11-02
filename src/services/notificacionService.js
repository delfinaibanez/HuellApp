const Notificacion = require('../models/Notificacion');

// Crea una notificación interna para un usuario.
// coincidenciaId es opcional.
async function crearNotificacion(usuarioId, mensaje, coincidenciaId = null) {
  const datos = { usuario: usuarioId, mensaje };
  if (coincidenciaId) datos.coincidencia = coincidenciaId;
  return Notificacion.create(datos);
}

module.exports = { crearNotificacion };