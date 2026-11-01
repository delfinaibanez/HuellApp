const mongoose = require('mongoose');

const coincidenciaSchema = new mongoose.Schema(
  {
    publicacionPerdida: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Publicacion',
      required: true,
    },
    publicacionEncontrada: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Publicacion',
      required: true,
    },
    puntaje: { type: Number, min: 0, max: 100, required: true },
    explicacion: { type: String }, // por qué la IA cree que coinciden
    rasgosCoinciden: [{ type: String }],
    rasgosNoCoinciden: [{ type: String }],
    estado: {
      type: String,
      enum: ['pendiente', 'confirmada', 'descartada'],
      default: 'pendiente',
    },
  },
  { timestamps: true }
);

// Evita crear dos veces la misma coincidencia
coincidenciaSchema.index(
  { publicacionPerdida: 1, publicacionEncontrada: 1 },
  { unique: true }
);

module.exports = mongoose.model('Coincidencia', coincidenciaSchema);