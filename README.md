# 🐾 HuellApp

HuellApp es una plataforma web para ayudar a reencontrar mascotas perdidas. Las personas publican avisos de mascotas perdidas o encontradas y el sistema busca posibles coincidencias usando la información y las fotos de cada publicación.

> Proyecto académico desarrollado para una hackathon.

## 💡 El problema

La búsqueda de mascotas suele repartirse entre grupos y publicaciones que se pierden rápidamente. Además, la información no siempre está presentada de la misma manera y encontrar avisos relacionados requiere que las personas los revisen manualmente.

HuellApp organiza los datos de cada aviso y compara publicaciones compatibles para acercar a quienes perdieron una mascota con quienes encontraron una.

## ⚙️ ¿Cómo funciona?

1. Una persona crea una cuenta y publica que perdió o encontró una mascota.
2. HuellApp busca publicaciones activas del tipo opuesto, de la misma especie, de otra persona, a menos de 10 km y con fechas dentro de un rango de 30 días. Se analizan hasta cinco candidatos.
3. La IA compara los datos y las fotos de cada candidato y devuelve un puntaje, una explicación y rasgos a favor y en contra.
4. Si el puntaje alcanza el umbral configurado, HuellApp crea una coincidencia y notifica a ambas personas dentro de la aplicación.
5. Las personas revisan la coincidencia y deciden si corresponde. Al confirmarla, ambas publicaciones quedan resueltas.

> La IA solo sugiere posibles coincidencias: las personas siempre tienen la decisión final.

## ✨ Funcionalidades

- Registro, inicio y cierre de sesión.
- Inicio público para visitantes e inicio personalizado para personas registradas.
- Creación de avisos de mascotas perdidas o encontradas, con hasta dos fotos.
- Listado privado de avisos con filtros por tipo, especie y zona.
- Detalle de publicación con descripción, fotos y mapa de zona aproximada.
- Matching de publicaciones con Gemini y respaldo de Groq ante errores temporales del proveedor principal.
- Coincidencias con puntaje, explicación y rasgos coincidentes y no coincidentes.
- Notificaciones dentro de la app, con actualización automática cada cinco segundos y opciones para marcarlas como leídas.
- Perfil con resumen de actividad y administración de publicaciones propias.
- Posibilidad de marcar una publicación como resuelta o eliminarla.
- Interfaz adaptable a escritorio y celulares.

La recompensa se presenta como una propuesta para la comunidad en la demo. HuellApp no administra ni procesa pagos. Las notificaciones se muestran en la aplicación; los avisos por email todavía no están implementados.

## 🛠️ Tecnologías

| Área | Tecnología |
|---|---|
| Servidor | Node.js y Express |
| Vistas | EJS y Bootstrap 5 |
| Base de datos | MongoDB y Mongoose |
| Sesiones y contraseñas | express-session y bcryptjs |
| Subida de imágenes | Multer y Cloudinary |
| Matching de imágenes | Google Gemini, con Groq como respaldo |
| Mapa | Leaflet y OpenStreetMap |

## 📋 Requisitos

- [Node.js](https://nodejs.org/) LTS y npm.
- Una base de datos MongoDB, por ejemplo en [MongoDB Atlas](https://www.mongodb.com/atlas).
- Una cuenta y credenciales de [Cloudinary](https://cloudinary.com/) para las fotos.
- Una clave de Google AI Studio para Gemini.
- Una clave de Groq es opcional; se utiliza como respaldo cuando Gemini tiene un error temporal.

## 🚀 Instalación y ejecución

1. Cloná el repositorio y entrá en la carpeta:

   ```bash
   git clone https://github.com/delfinaibanez/HuellApp.git
   cd HuellApp
   ```

2. Instalá las dependencias:

   ```bash
   npm install
   ```

3. Creá un archivo `.env` a partir de `.env.example`:

   ```bash
   cp .env.example .env
   ```

   En PowerShell podés usar:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Completá en `.env` las credenciales de MongoDB, Cloudinary y Gemini. Agregá `GROQ_API_KEY` si querés habilitar el proveedor de respaldo.

5. Iniciá la aplicación en modo desarrollo:

   ```bash
   npm run dev
   ```

   También podés ejecutarla con `npm start`. Por defecto, la app queda disponible en [http://localhost:3000](http://localhost:3000). Para cambiar el puerto, configurá `PORT`.

No compartas ni subas el archivo `.env`: contiene credenciales privadas.

## 🔧 Variables de entorno

| Variable | Uso |
|---|---|
| `PORT` | Puerto del servidor (por defecto, `3000`). |
| `SESSION_SECRET` | Secreto para firmar las sesiones. |
| `MONGODB_URI` | Cadena de conexión a MongoDB. |
| `CLOUDINARY_CLOUD_NAME` | Nombre de la cuenta de Cloudinary. |
| `CLOUDINARY_API_KEY` | Clave de API de Cloudinary. |
| `CLOUDINARY_API_SECRET` | Secreto de API de Cloudinary. |
| `AI_API_KEY` | Clave de Google AI Studio para Gemini. |
| `AI_MODEL` | Modelo de Gemini (por defecto, `gemini-2.5-flash-lite`). |
| `GROQ_API_KEY` | Clave opcional de Groq para el respaldo. |
| `GROQ_MODEL` | Modelo de Groq (por defecto, `qwen/qwen3.8-27b`). |
| `MATCH_THRESHOLD` | Puntaje mínimo para crear una coincidencia (por defecto, `70`). |
| `MATCH_RADIUS_KM` | Radio máximo de búsqueda en kilómetros (por defecto, `10`). |

`EMAIL_USER` y `EMAIL_PASS` aparecen en `.env.example` como preparación para una posible integración; actualmente no se usan para enviar correos.

## 🧭 Rutas principales

Las rutas de publicaciones, perfil, notificaciones y coincidencias requieren iniciar sesión.

| Método y ruta | Descripción |
|---|---|
| `GET /` | Inicio público o registrado, según la sesión. |
| `GET /registro`, `POST /registro` | Registro de cuenta. |
| `GET /login`, `POST /login` | Inicio de sesión. |
| `POST /logout` | Cierre de sesión. |
| `GET /publicaciones` | Listado de avisos; acepta `tipo`, `especie` y `zona` como filtros. |
| `GET /publicaciones/nueva` | Formulario para crear un aviso. |
| `POST /publicaciones` | Crear un aviso con hasta dos imágenes. |
| `GET /publicaciones/:id` | Ver el detalle de un aviso. |
| `POST /publicaciones/:id/resolver` | Marcar como resuelto un aviso propio. |
| `POST /publicaciones/:id/eliminar` | Eliminar un aviso propio. |
| `GET /perfil` | Ver el perfil y las publicaciones propias. |
| `GET /notificaciones` | Ver las notificaciones. |
| `GET /notificaciones/estado` | Consultar el estado de notificaciones para la actualización automática. |
| `POST /notificaciones/:id/leer` | Marcar una notificación como leída. |
| `POST /notificaciones/leer-todas` | Marcar todas las notificaciones como leídas. |
| `GET /coincidencias/:id` | Ver una coincidencia asociada a una de las publicaciones propias. |
| `POST /coincidencias/:id/confirmar` | Confirmar un posible reencuentro. |
| `POST /coincidencias/:id/descartar` | Descartar una posible coincidencia. |

## 📁 Estructura del proyecto

```text
HuellApp/
├── src/
│   ├── app.js
│   ├── config/          # Conexión a MongoDB y servicios externos
│   ├── controllers/     # Lógica de las rutas
│   ├── middlewares/     # Autenticación
│   ├── models/          # Esquemas de Mongoose
│   ├── routes/          # Rutas de Express
│   ├── services/        # Matching, imágenes y notificaciones
│   ├── views/           # Vistas EJS y parciales
│   └── public/          # CSS, imágenes y recursos públicos
├── .env.example
├── package.json
└── README.md
```

## 🗃️ Datos y privacidad

- `tipo`: `perdido` o `encontrado`.
- `especie`: `perro`, `gato` u `otro`.
- `tamano`: `pequeno`, `mediano` o `grande`.
- `estado` de publicación: `activa` o `resuelta`.
- La ubicación se guarda como GeoJSON `[longitud, latitud]`.
- Se aceptan hasta dos imágenes por aviso, en formato JPG, PNG o WEBP, de hasta 5 MB cada una.
- El mapa del aviso muestra una zona aproximada, no la ubicación exacta.
- La IA recibe características de la mascota y sus imágenes para realizar la comparación; no se le envían nombre, correo ni datos de contacto.
- El listado y los detalles de avisos son privados y requieren iniciar sesión.

## 🔒 Limitaciones conocidas

- Un puntaje alto no confirma por sí mismo que dos avisos sean del mismo animal.
- Los resultados dependen de la calidad y cantidad de fotos y descripciones.
- El matching se ejecuta al crear una publicación. Si un proveedor no está disponible o el puntaje no alcanza el umbral, no se genera una coincidencia.
- El prototipo está pensado para una zona geográfica acotada.
- La gestión o el procesamiento de recompensas y los avisos por email no están implementados.

## 🤝 Colaboración

El trabajo se organiza en ramas por funcionalidad y se integra mediante Pull Requests. Antes de abrir un PR, verificá que `.env` no esté entre los archivos a publicar.

## 👩‍💻 Equipo

| Integrante | Área principal |
|---|---|
| Delfina | Backend, autenticación, publicaciones, fotos, notificaciones e interfaz |
| Carolina | Matching con inteligencia artificial |
| Candela | Presentación y apoyo al equipo |

##Imagenes 
<img width="1358" height="1582" alt="image" src="https://github.com/user-attachments/assets/bad6f96a-da2c-47f5-99c6-c92959d612ca" />
<img width="1358" height="921" alt="image" src="https://github.com/user-attachments/assets/02c6f3b7-a7f2-48e2-a976-681e24f673a5" />
<img width="1358" height="1158" alt="image" src="https://github.com/user-attachments/assets/0ec6ac8b-a91b-41af-9e8e-1df055112d0e" />
<img width="1358" height="1325" alt="image" src="https://github.com/user-attachments/assets/b9edc56e-e02d-4312-9762-9f98524b1b94" />




## 📄 Licencia

Proyecto académico desarrollado para una hackathon. No se definió una licencia de distribución.
