# 🐾 HuellApp

Plataforma web para reencontrar mascotas perdidas. Las personas publican mascotas **perdidas** o **encontradas** (especie, descripción, fotos, zona, fecha y ubicación) y una **inteligencia artificial** compara las publicaciones y avisa automáticamente cuando encuentra una coincidencia probable.

> Proyecto desarrollado para una hackathon.

## 💡 ¿Qué problema resuelve?

Hoy las mascotas perdidas se buscan en grupos de Facebook y WhatsApp: las publicaciones se pierden en el scroll, no tienen un formato común y nadie cruza la información de quien perdió una mascota con la de quien la encontró. **HuellApp busca por vos**: ordena los datos, los cruza y te avisa.

## ⚙️ ¿Cómo funciona?

1. La persona se registra y crea una publicación (*Perdí* o *Encontré*).
2. El sistema filtra las publicaciones del tipo opuesto, de la misma especie, cercanas en zona y fecha.
3. La IA compara los candidatos y devuelve un puntaje de similitud con una explicación.
4. Si el puntaje supera el umbral, se notifica a ambas personas dentro de la app (y por email).
5. Las personas confirman el reencuentro y la publicación se marca como resuelta.

> La IA **sugiere**, nunca decide: la confirmación final es siempre humana.

## 📊 Estado del proyecto

| Módulo | Estado |
|---|---|
| Estructura base y conexión a MongoDB | ✅ Listo |
| Modelos (Usuario, Publicacion, Coincidencia, Notificacion) | ✅ Listo |
| Registro, login y logout | ✅ Listo |
| Publicaciones (crear, listar, detalle, marcar como resuelta) | ✅ Listo |
| Subida de fotos (Cloudinary) | ✅ Listo |
| Notificaciones dentro de la app | ✅ Listo |
| Diseño visual (layout, home, registro, login, formulario) | ✅ Listo |
| Listado con filtros y detalle con el diseño nuevo | 🔄 En curso |
| Pantalla de coincidencia y bandeja de notificaciones con el diseño nuevo | ⏳ Pendiente |
| Matching con IA | ⏳ Pendiente |
| Emails de aviso | ⏳ Pendiente |
| Mapa interactivo (Leaflet) | ⏳ Pendiente |

## 🛠️ Tecnologías

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express |
| Vistas | EJS + Bootstrap 5 |
| Base de datos | MongoDB Atlas + Mongoose |
| Sesiones y contraseñas | express-session + bcryptjs |
| Fotos | Multer + Cloudinary |
| IA | Gemini con Groq como respaldo para comparar imágenes |
| Emails | Nodemailer |

## 📋 Requisitos previos

- [Node.js](https://nodejs.org/) (versión LTS)
- Cuenta gratuita en [MongoDB Atlas](https://www.mongodb.com/atlas)
- Cuenta gratuita en [Cloudinary](https://cloudinary.com/)
- API key de Gemini para el matching y, opcionalmente, una API key de Groq como respaldo si Gemini falla temporalmente. Configurá `GROQ_API_KEY` en `.env`.




## 📁 Estructura del proyecto

```
HuellApp/
├── src/
│   ├── app.js             # Configuración de Express, sesiones y rutas
│   ├── config/            # Conexión a MongoDB y Cloudinary
│   ├── models/            # Esquemas de Mongoose
│   ├── controllers/       # Lógica de cada ruta
│   ├── routes/            # Rutas de Express
│   ├── middlewares/       # Autenticación y subida de fotos
│   ├── services/          # Notificaciones y matching con IA
│   ├── views/             # Plantillas EJS
│   │   └── partials/      # Encabezado, pie de página e íconos compartidos
│   └── public/
│       └── css/           # Estilos propios (paleta HuellApp)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🧭 Rutas principales

| Ruta | Descripción |
|---|---|
| `GET /` | Página de inicio |
| `GET /registro`, `POST /registro` | Crear cuenta |
| `GET /login`, `POST /login` | Iniciar sesión |
| `POST /logout` | Cerrar sesión |
| `GET /publicaciones` | Listado (filtros `?tipo=&especie=&zona=`) |
| `GET /publicaciones/nueva` | Formulario de publicación (requiere sesión) |
| `POST /publicaciones` | Crear publicación con hasta 2 fotos |
| `GET /publicaciones/:id` | Detalle de una publicación |
| `POST /publicaciones/:id/resolver` | Marcar como resuelta (solo quien la creó) |
| `GET /notificaciones` | Bandeja de notificaciones (requiere sesión) |
| `POST /notificaciones/:id/leer` | Marcar una notificación como leída |
| `POST /notificaciones/leer-todas` | Marcar todas como leídas |

## 🗃️ Convenciones de datos

- Los campos van en español y sin tildes ni eñes (`tamano`, `fechaEvento`).
- `tipo`: `perdido` o `encontrado`.
- `especie`: `perro`, `gato` u `otro`.
- `tamano`: `pequeno`, `mediano` o `grande`.
- `estado`: `activa` o `resuelta`.
- La ubicación se guarda como GeoJSON en formato `[longitud, latitud]`, en ese orden.
- Fotos: hasta 2 por publicación, JPG, PNG o WEBP, de hasta 5 MB cada una.

## 🎨 Diseño

- Paleta: naranja `#B84E0F` (perdido), verde `#2F7D4F` (encontrado), crema `#FFF6EC` (fondo) y marrón `#3B2A20` (texto).
- Tipografía: Nunito.
- Cada tipo de publicación tiene su ícono y color: lupa naranja para **perdido** y corazón verde para **encontrado**.

## 🤝 Flujo de trabajo en equipo

- `main`: versión estable, la que se muestra en la demo.
- `develop`: donde se junta el trabajo de todas.
- `feature/nombre-de-la-tarea`: una rama por tarea, creada desde `develop` actualizado.

```bash
git checkout develop
git pull
git checkout -b feature/nombre-de-la-tarea
```

- Se integra a `develop` mediante **Pull Request**.
- Antes de cambiar de rama, `git status`: si hay cambios sin guardar, se commitean primero.
- Antes de cada commit, verificar que **`.env` no aparezca** en `git status`.
- Un Pull Request por tarea, y unirlo antes de crear la rama siguiente, para evitar conflictos.

## 🔒 Limitaciones

- La IA puede equivocarse, por eso la confirmación final es humana.
- La calidad de las coincidencias depende de la calidad de las fotos y descripciones.
- El prototipo está pensado para una zona geográfica acotada.
- Se maneja información personal: la ubicación pública debe ser aproximada y el contacto pasa por la plataforma.

## 🗺️ Próximos pasos

- Matching con IA y emails de aviso
- Pantalla de coincidencia
- Perfil de usuario con sus publicaciones
- Mapa interactivo con Leaflet
- Notificaciones push y aplicación móvil
- Convenios con veterinarias, refugios y municipios

## 👩‍💻 Equipo

| Integrante | Área principal |
|---|---|
| Delfina | Backend base, autenticación, publicaciones, fotos, notificaciones y frontend |
| Carolina | Matching con IA y emails de aviso |
| Candela | Presentación y apoyo al equipo |

## 📄 Licencia

Proyecto académico desarrollado para una hackathon.
