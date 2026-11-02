require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const connectDB = require('./config/db');
const Notificacion = require('./models/Notificacion');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }, // 1 día
  })
);

// Datos disponibles en todas las vistas
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.error = req.session.error || null;
  delete req.session.error; // el mensaje se muestra una sola vez
  next();
});

// Cantidad de notificaciones sin leer (disponible en todas las vistas)
app.use(async (req, res, next) => {
  res.locals.noLeidas = 0;
  if (req.session.usuario) {
    try {
      res.locals.noLeidas = await Notificacion.countDocuments({
        usuario: req.session.usuario.id,
        leida: false,
      });
    } catch (error) {
      console.error('Error al contar notificaciones:', error.message);
    }
  }
  next();
});

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/publicaciones'));
app.use('/', require('./routes/notificaciones'));

app.get('/', (req, res) => {
  res.render('home');
});

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
  });
});