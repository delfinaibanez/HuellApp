const mongoose = require('mongoose');
const Publicacion = require('../models/Publicacion');
const { eliminarFoto, subirFoto } = require('../services/cloudinary');

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function escaparRegex(valor) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mostrarFormulario(req, res) {
  const tipoInicial = ['perdido', 'encontrado'].includes(req.query.tipo)
    ? req.query.tipo
    : '';
  res.render('publicacionNueva', { tipoInicial });
}

async function listar(req, res) {
  try {
    const { tipo, especie, zona } = req.query;
    const filtro = { estado: 'activa' };

    if (['perdido', 'encontrado'].includes(tipo)) filtro.tipo = tipo;
    if (['perro', 'gato', 'otro'].includes(especie)) filtro.especie = especie;
    if (typeof zona === 'string' && zona.trim()) {
      filtro.zona = new RegExp(escaparRegex(zona.trim()), 'i');
    }

    const publicaciones = await Publicacion.find(filtro)
      .sort({ createdAt: -1 })
      .limit(60)
      .populate('usuario', 'nombre');

    res.render('publicaciones', { publicaciones, filtros: req.query });
  } catch (error) {
    console.error('Error al listar publicaciones:', error.message);
    res.status(500).send('No se pudieron cargar las publicaciones.');
  }
}

async function mostrarDetalle(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).send('Publicación no encontrada.');
  }

  try {
    const publicacion = await Publicacion.findById(req.params.id).populate('usuario', 'nombre');
    if (!publicacion) {
      return res.status(404).send('Publicación no encontrada.');
    }

    const esDueno =
      !!req.session.usuario &&
      publicacion.usuario._id.toString() === req.session.usuario.id;

    res.render('publicacionDetalle', { publicacion, esDueno });
  } catch (error) {
    console.error('Error al cargar publicación:', error.message);
    res.status(500).send('No se pudo cargar la publicación.');
  }
}

async function crear(req, res) {
  const latitudTexto = texto(req.body.latitud);
  const longitudTexto = texto(req.body.longitud);
  const latitud = Number(latitudTexto);
  const longitud = Number(longitudTexto);

  if (
    !latitudTexto ||
    !longitudTexto ||
    !Number.isFinite(latitud) ||
    !Number.isFinite(longitud) ||
    latitud < -90 ||
    latitud > 90 ||
    longitud < -180 ||
    longitud > 180
  ) {
    req.session.error = 'Ingresá una latitud y longitud válidas.';
    return res.redirect('/publicaciones/nueva');
  }

  const publicacion = new Publicacion({
    tipo: texto(req.body.tipo),
    especie: texto(req.body.especie),
    raza: texto(req.body.raza),
    color: texto(req.body.color),
    tamano: texto(req.body.tamano),
    descripcion: texto(req.body.descripcion),
    rasgos: texto(req.body.rasgos),
    fechaEvento: texto(req.body.fechaEvento),
    zona: texto(req.body.zona),
    ubicacion: {
      type: 'Point',
      coordinates: [longitud, latitud],
    },
    usuario: req.session.usuario.id,
    fotos: [],
  });
  const fotosSubidas = [];

  try {
    await publicacion.validate();

    for (const archivo of req.files || []) {
      fotosSubidas.push(await subirFoto(archivo.buffer));
    }

    publicacion.fotos = fotosSubidas.map((foto) => foto.url);
    await publicacion.save();

    // TODO (Carolina): acá se llama al servicio de matching con IA.
    // Debe atrapar sus propios errores para no frenar la publicación.
    // Ejemplo: matchingService.buscarCoincidencias(publicacion).catch(console.error);

    res.redirect(`/publicaciones/${publicacion._id}`);
  } catch (error) {
    await Promise.all(
      fotosSubidas.map(async (foto) => {
        try {
          await eliminarFoto(foto.publicId);
        } catch (errorLimpieza) {
          console.error('Error al eliminar una foto de Cloudinary:', errorLimpieza.message);
        }
      })
    );

    if (error.name === 'ValidationError' || error.name === 'CastError') {
      req.session.error = 'Completá todos los campos obligatorios con valores válidos.';
    } else {
      console.error('Error al crear publicación:', error.message);
      req.session.error = 'No se pudo crear la publicación. Intentá nuevamente.';
    }

    res.redirect('/publicaciones/nueva');
  }
}

async function marcarResuelta(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).send('Publicación no encontrada.');
  }

  try {
    const publicacion = await Publicacion.findById(req.params.id);
    if (!publicacion) {
      return res.status(404).send('Publicación no encontrada.');
    }
    if (publicacion.usuario.toString() !== req.session.usuario.id) {
      return res.status(403).send('No tenés permiso para modificar esta publicación.');
    }

    publicacion.estado = 'resuelta';
    await publicacion.save();

    res.redirect(`/publicaciones/${publicacion._id}`);
  } catch (error) {
    console.error('Error al marcar como resuelta:', error.message);
    res.status(500).send('No se pudo actualizar la publicación.');
  }
}

module.exports = {
  crear,
  listar,
  mostrarDetalle,
  mostrarFormulario,
  marcarResuelta,
};