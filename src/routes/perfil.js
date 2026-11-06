const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middlewares/auth');
const perfil = require('../controllers/perfilController');

router.get('/perfil', requireLogin, perfil.ver);

module.exports = router;
