const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

router.get('/registro', auth.mostrarRegistro);
router.post('/registro', auth.registrar);

router.get('/login', auth.mostrarLogin);
router.post('/login', auth.iniciarSesion);

router.post('/logout', auth.cerrarSesion);

module.exports = router;