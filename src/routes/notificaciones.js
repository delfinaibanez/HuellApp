const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middlewares/auth');
const notificaciones = require('../controllers/notificacionController');

router.get('/notificaciones', requireLogin, notificaciones.listar);
router.post('/notificaciones/leer-todas', requireLogin, notificaciones.marcarTodasLeidas);
router.post('/notificaciones/:id/leer', requireLogin, notificaciones.marcarLeida);

module.exports = router;
