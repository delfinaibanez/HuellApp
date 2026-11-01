require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const connectDB = require('./config/db');
const { requireLogin } = require('./middlewares/auth');

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

app.use('/', require('./routes/auth'));

app.get('/', (req, res) => {
  const saludo = req.session.usuario
    ? `Hola ${req.session.usuario.nombre} 🐾`
    : 'HuellApp funcionando 🐾';
  res.send(saludo);
});

// RUTA TEMPORAL para probar el middleware (se borra después de probar)
app.get('/privado', requireLogin, (req, res) => {
  res.send('Entraste a una ruta protegida ✅');
});

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
  });
});