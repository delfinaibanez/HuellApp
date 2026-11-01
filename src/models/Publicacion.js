const mongoose = require('mongoose');

const publicacionSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ['perdido', 'encontrado'],
      required: true,
    },
    especie: {
      type: String,
      enum: ['perro', 'gato', 'otro'],
      required: true,
    },
    raza: { type: String, trim: true },
    color: { type: String, required: true, trim: true },
    tamano: {
      type: String,
      enum: ['pequeno', 'mediano', 'grande'],
      required: true,
    },
    descripcion: { type: String, required: true, trim: true },
    rasgos: { type: String, trim: true }, // collar, manchas, cicatrices, chip, etc.
    fotos: [{ type: String }], // URLs de Cloudinary
    fechaEvento: { type: Date, required: true }, // cuándo se perdió o se encontró
    zona: { type: String, required: true, trim: true }, // barrio o localidad
    ubicacion: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      // IMPORTANTE: el orden es [longitud, latitud]
      coordinates: { type: [Number], required: true },
    },
    estado: {
      type: String,
      enum: ['activa', 'resuelta'],
      default: 'activa',
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
  },
  { timestamps: true }
);

// Permite buscar publicaciones cercanas a un punto
publicacionSchema.index({ ubicacion: '2dsphere' });

module.exports = mongoose.model('Publicacion', publicacionSchema);