const express = require('express');
const multer = require('multer');
const publicaciones = require('../controllers/publicacionController');
const { requireLogin } = require('../middlewares/auth');

const router = express.Router();
const tiposImagenPermitidos = new Set(['image/jpeg', 'image/png', 'image/webp']);

const subirFotos = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 2,
  },
  fileFilter(req, file, callback) {
    if (!tiposImagenPermitidos.has(file.mimetype)) {
      return callback(new Error('UNSUPPORTED_IMAGE_TYPE'));
    }
    callback(null, true);
  },
});

router.get('/publicaciones', publicaciones.listar);
router.get('/publicaciones/nueva', requireLogin, publicaciones.mostrarFormulario);
router.post(
  '/publicaciones',
  requireLogin,
  subirFotos.array('fotos', 2),
  publicaciones.crear
);
router.get('/publicaciones/:id', publicaciones.mostrarDetalle);
router.post('/publicaciones/:id/resolver', requireLogin, publicaciones.marcarResuelta);
router.post('/publicaciones/:id/eliminar', requireLogin, publicaciones.eliminar);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      req.session.error = 'Cada foto puede pesar hasta 5 MB';
    } else if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
      req.session.error = 'Podés subir hasta dos fotos';
    } else {
      return next(error);
    }
  } else if (error.message === 'UNSUPPORTED_IMAGE_TYPE') {
    req.session.error = 'Solo se permiten imágenes JPG, PNG o WEBP';
  } else {
    return next(error);
  }

  res.redirect('/publicaciones/nueva');
});

module.exports = router;