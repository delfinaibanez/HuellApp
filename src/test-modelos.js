require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('./models/Usuario');
const Publicacion = require('./models/Publicacion');
require('./models/Coincidencia');
require('./models/Notificacion');

async function probar() {
  await mongoose.connect(process.env.MONGODB_URI);

  const usuario = await Usuario.create({
    nombre: 'Prueba',
    email: 'prueba@test.com',
    password: '123456',
  });

  const publicacion = await Publicacion.create({
    tipo: 'perdido',
    especie: 'perro',
    color: 'marrón',
    tamano: 'mediano',
    descripcion: 'Perro marrón con collar rojo',
    fechaEvento: new Date(),
    zona: 'Centro',
    ubicacion: { type: 'Point', coordinates: [-68.8272, -32.8895] },
    usuario: usuario._id,
  });

  console.log('✅ Publicación creada:', publicacion._id.toString());

  await Publicacion.deleteOne({ _id: publicacion._id });
  await Usuario.deleteOne({ _id: usuario._id });
  console.log('🧹 Datos de prueba borrados');

  await mongoose.disconnect();
}

probar().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});