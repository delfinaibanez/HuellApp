const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    mensaje: { type: String, required: true },
    coincidencia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coincidencia',
    },
    leida: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notificacion', notificacionSchema);