const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function verificarConfiguracion() {
  const faltantes = [
    ['CLOUDINARY_CLOUD_NAME', process.env.CLOUDINARY_CLOUD_NAME],
    ['CLOUDINARY_API_KEY', process.env.CLOUDINARY_API_KEY],
    ['CLOUDINARY_API_SECRET', process.env.CLOUDINARY_API_SECRET],
  ]
    .filter(([, valor]) => !valor)
    .map(([nombre]) => nombre);

  if (faltantes.length > 0) {
    throw new Error(`Falta configurar Cloudinary: ${faltantes.join(', ')}`);
  }
}

function subirFoto(buffer) {
  verificarConfiguracion();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'huellapp',
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'webp'],
      },
      (error, resultado) => {
        if (error) {
          return reject(error);
        }
        if (!resultado || !resultado.secure_url || !resultado.public_id) {
          return reject(new Error('Cloudinary no devolvió los datos de la imagen.'));
        }

        resolve({ url: resultado.secure_url, publicId: resultado.public_id });
      }
    );

    stream.end(buffer);
  });
}

function eliminarFoto(publicId) {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

module.exports = { eliminarFoto, subirFoto };
