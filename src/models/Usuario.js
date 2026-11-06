const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true }, // se guarda con hash (bcryptjs)
    zona: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Usuario', usuarioSchema);