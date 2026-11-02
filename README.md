# HuellApp

## Publicaciones y fotos

Para publicar, iniciá sesión y entrá a `/publicaciones/nueva`. Las fotos son
opcionales; se aceptan hasta dos imágenes JPG, PNG o WEBP de hasta 5 MB cada
una. Se guardan en la carpeta `huellapp` de Cloudinary y sus URLs se almacenan
en el campo `fotos` de MongoDB.

Configurá `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y
`CLOUDINARY_API_SECRET` en `.env` para habilitar las subidas. Sin fotos, se
puede crear una publicación sin credenciales de Cloudinary.

Después de publicar, la aplicación abre el detalle; también se pueden consultar
las publicaciones en `/publicaciones`.
