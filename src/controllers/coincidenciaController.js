const mongoose = require('mongoose');
const Coincidencia = require('../models/Coincidencia');
const Publicacion = require('../models/Publicacion');

// Carga la coincidencia y verifica que la persona sea dueña de una de las dos publicaciones
async function cargarCoincidencia(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(404).send('Coincidencia no encontrada.');
    return null;
  }

  const coincidencia = await Coincidencia.findById(id)
    .populate({ path: 'publicacionPerdida', populate: { path: 'usuario', select: 'nombre' } })
    .populate({ path: 'publicacionEncontrada', populate: { path: 'usuario', select: 'nombre' } });

  if (!coincidencia || !coincidencia.publicacionPerdida || !coincidencia.publicacionEncontrada) {
    res.status(404).send('Coincidencia no encontrada.');
    return null;
  }

  const usuarioId = req.session.usuario.id;
  const esParte = [coincidencia.publicacionPerdida, coincidencia.publicacionEncontrada].some(
    (p) => p.usuario._id.toString() === usuarioId
  );
  if (!esParte) {
    res.status(403).send('No tenés permiso para ver esta coincidencia.');
    return null;
  }

  return coincidencia;
}

async function ver(req, res) {
  try {
    const coincidencia = await cargarCoincidencia(req, res);
    if (!coincidencia) return;

    res.render('coincidencia', {
      coincidencia,
      perdida: coincidencia.publicacionPerdida,
      encontrada: coincidencia.publicacionEncontrada,
    });
  } catch (error) {
    console.error('Error al ver coincidencia:', error.message);
    res.status(500).send('No se pudo cargar la coincidencia.');
  }
}

async function confirmar(req, res) {
  try {
    const coincidencia = await cargarCoincidencia(req, res);
    if (!coincidencia) return;

    if (coincidencia.estado === 'pendiente') {
      coincidencia.estado = 'confirmada';
      await coincidencia.save();
      // Al confirmarse el reencuentro, las dos publicaciones pasan a resueltas
      await Publicacion.updateMany(
        {
          _id: {
            $in: [coincidencia.publicacionPerdida._id, coincidencia.publicacionEncontrada._id],
          },
        },
        { estado: 'resuelta' }
      );
    }

    res.redirect(`/coincidencias/${coincidencia._id}`);
  } catch (error) {
    console.error('Error al confirmar coincidencia:', error.message);
    res.status(500).send('No se pudo confirmar la coincidencia.');
  }
}

async function descartar(req, res) {
  try {
    const coincidencia = await cargarCoincidencia(req, res);
    if (!coincidencia) return;

    if (coincidencia.estado === 'pendiente') {
      coincidencia.estado = 'descartada';
      await coincidencia.save();
    }

    res.redirect(`/coincidencias/${coincidencia._id}`);
  } catch (error) {
    console.error('Error al descartar coincidencia:', error.message);
    res.status(500).send('No se pudo descartar la coincidencia.');
  }
}

module.exports = { ver, confirmar, descartar };