const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middlewares/auth');
const coincidencias = require('../controllers/coincidenciaController');

router.get('/coincidencias/:id', requireLogin, coincidencias.ver);
router.post('/coincidencias/:id/confirmar', requireLogin, coincidencias.confirmar);
router.post('/coincidencias/:id/descartar', requireLogin, coincidencias.descartar);

module.exports = router;