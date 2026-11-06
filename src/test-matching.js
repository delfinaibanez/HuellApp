const assert = require('node:assert/strict');
const Publicacion = require('./models/Publicacion');
const Coincidencia = require('./models/Coincidencia');
const Notificacion = require('./models/Notificacion');

process.env.MATCH_THRESHOLD = '70';
process.env.MATCH_RADIUS_KM = '10';
process.env.AI_API_KEY = 'mock-key-never-sent';
process.env.GROQ_API_KEY = 'mock-groq-key-never-sent';

const originalFetch = global.fetch;
const originalSetTimeout = global.setTimeout;
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalFind = Publicacion.find;
const originalCoincidenciaFind = Coincidencia.find;
const originalCoincidenciaCreate = Coincidencia.create;
const originalNotificacionCreate = Notificacion.create;
const originalValidate = Publicacion.prototype.validate;
const originalSave = Publicacion.prototype.save;

let candidates = [];
let coincidencias = [];
let notificaciones = [];
let respuestaIA = '{"puntaje": 92, "explicacion": "Coinciden", "rasgosCoinciden": ["mancha"], "rasgosNoCoinciden": []}';
let errorIA = null;
let estadoGemini = 200;
let estadoGroq = 200;
let solicitudesGroq = [];
let llamadasIA = 0;

function distanciaKm(a, b) {
  const rad = (grados) => (grados * Math.PI) / 180;
  const [lngA, latA] = a;
  const [lngB, latB] = b;
  const dLat = rad(latB - latA);
  const dLng = rad(lngB - lngA);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(latA)) * Math.cos(rad(latB)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function crearPublicacion(id, tipo, usuario, distancia = 5) {
  const lat = -34.6;
  const lng = -58.38;
  return {
    _id: id,
    tipo,
    especie: 'perro',
    raza: 'mestizo',
    color: 'marron',
    tamano: 'mediano',
    descripcion: 'Perro de prueba',
    rasgos: 'mancha blanca',
    zona: 'Barrio de prueba',
    fechaEvento: new Date('2026-10-25T12:00:00Z'),
    ubicacion: {
      type: 'Point',
      coordinates: [lng + distancia / (111.32 * Math.cos((lat * Math.PI) / 180)), lat],
    },
    fotos: [],
    estado: 'activa',
    usuario,
  };
}

function reset({ candidatos = [], previas = [] } = {}) {
  candidates = candidatos;
  coincidencias = previas;
  notificaciones = [];
  respuestaIA =
    '{"puntaje": 92, "explicacion": "Coinciden", "rasgosCoinciden": ["mancha"], "rasgosNoCoinciden": []}';
  errorIA = null;
  estadoGemini = 200;
  estadoGroq = 200;
  solicitudesGroq = [];
  llamadasIA = 0;
  process.env.AI_API_KEY = 'mock-key-never-sent';
  process.env.GROQ_API_KEY = 'mock-groq-key-never-sent';

  Publicacion.find = (filtro) => ({
    limit: async (maximo) => {
      const [lng, lat] = filtro.ubicacion.$near.$geometry.coordinates;
      const rangoFecha = filtro.fechaEvento;
      return candidates
        .filter((p) => !filtro._id.$nin.map(String).includes(String(p._id)))
        .filter((p) => p.tipo === filtro.tipo && p.especie === filtro.especie)
        .filter((p) => p.estado === filtro.estado)
        .filter((p) => String(p.usuario) !== String(filtro.usuario.$ne))
        .filter(
          (p) =>
            p.fechaEvento >= rangoFecha.$gte &&
            p.fechaEvento <= rangoFecha.$lte
        )
        .filter(
          (p) =>
            distanciaKm([lng, lat], p.ubicacion.coordinates) * 1000 <=
            filtro.ubicacion.$near.$maxDistance
        )
        .slice(0, maximo);
    },
  });

  Coincidencia.find = async (filtro) =>
    coincidencias.filter((c) =>
      filtro.$or.some((clausula) =>
        Object.entries(clausula).some(([campo, id]) => String(c[campo]) === String(id))
      )
    );

  Coincidencia.create = async (datos) => {
    const duplicada = coincidencias.some(
      (c) =>
        String(c.publicacionPerdida) === String(datos.publicacionPerdida) &&
        String(c.publicacionEncontrada) === String(datos.publicacionEncontrada)
    );
    if (duplicada) throw Object.assign(new Error('duplicate key'), { code: 11000 });

    const coincidencia = { ...datos, _id: `coincidencia-${coincidencias.length + 1}` };
    coincidencias.push(coincidencia);
    return coincidencia;
  };

  Notificacion.create = async (datos) => {
    notificaciones.push(datos);
    return datos;
  };

  global.fetch = async (url, options = {}) => {
    if (url.startsWith('https://images.test/')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'image/jpeg' },
        arrayBuffer: async () => Buffer.from('mock-image'),
      };
    }

    llamadasIA += 1;
    if (errorIA) throw errorIA;

    if (url.includes('generativelanguage.googleapis.com')) {
      return {
        ok: estadoGemini === 200,
        status: estadoGemini,
        text: async () => 'Gemini unavailable',
        json: async () => ({
          candidates: [{ content: { parts: [{ text: respuestaIA }] } }],
        }),
      };
    }

    if (url.includes('api.groq.com')) {
      solicitudesGroq.push({
        body: JSON.parse(options.body),
        headers: options.headers,
      });
      return {
        ok: estadoGroq === 200,
        status: estadoGroq,
        text: async () => 'Groq unavailable',
        json: async () => ({
          choices: [{ message: { content: respuestaIA } }],
        }),
      };
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };
}

async function ejecutarCaso(nombre, prueba) {
  await prueba();
  originalConsoleLog(`PASS ${nombre}`);
}

async function crearPorControlador(controller) {
  let guardada = false;
  let redireccion = '';
  Publicacion.prototype.validate = async function () {};
  Publicacion.prototype.save = async function () {
    guardada = true;
  };

  await controller.crear(
    {
      body: {
        tipo: 'perdido',
        especie: 'perro',
        raza: 'mestizo',
        color: 'marron',
        tamano: 'mediano',
        descripcion: 'Perro de prueba',
        rasgos: 'mancha blanca',
        fechaEvento: '2026-10-25',
        zona: 'Barrio de prueba',
        latitud: '-34.6',
        longitud: '-58.38',
      },
      files: [],
      session: { usuario: { id: '000000000000000000000001' } },
    },
    { redirect: (ruta) => (redireccion = ruta) }
  );
  await new Promise((resolve) => setImmediate(resolve));
  return { guardada, redireccion };
}

async function main() {
  const { buscarCoincidencias } = require('./services/matchingService');
  const controller = require('./controllers/publicacionController');
  const perdida = crearPublicacion('perdida-1', 'perdido', 'usuario-1');
  const encontrada = crearPublicacion('encontrada-1', 'encontrado', 'usuario-2');

  console.log = () => {};
  console.error = () => {};

  await ejecutarCaso('puntaje alto: coincidencia y dos notificaciones', async () => {
    reset({ candidatos: [encontrada] });
    await buscarCoincidencias(perdida);
    assert.equal(coincidencias.length, 1);
    assert.equal(coincidencias[0].publicacionPerdida, perdida._id);
    assert.equal(coincidencias[0].publicacionEncontrada, encontrada._id);
    assert.equal(notificaciones.length, 2);
    assert.equal(solicitudesGroq.length, 0);
    assert.ok(notificaciones.every((n) => n.coincidencia === coincidencias[0]._id));
    assert.deepEqual(
      notificaciones.map((n) => String(n.usuario)).sort(),
      ['usuario-1', 'usuario-2']
    );
  });

  await ejecutarCaso('puntaje bajo: no crea coincidencia', async () => {
    reset({ candidatos: [encontrada] });
    respuestaIA =
      '{"puntaje": 45, "explicacion": "No coinciden", "rasgosCoinciden": [], "rasgosNoCoinciden": []}';
    await buscarCoincidencias(perdida);
    assert.equal(coincidencias.length, 0);
    assert.equal(notificaciones.length, 0);
  });

  await ejecutarCaso('Gemini 503: Groq compara las fotos y notifica', async () => {
    reset({ candidatos: [encontrada] });
    estadoGemini = 503;
    const perdidaConFoto = {
      ...perdida,
      fotos: ['https://images.test/perdida-1.jpg', 'https://images.test/perdida-2.jpg'],
    };
    const encontradaConFoto = {
      ...encontrada,
      fotos: ['https://images.test/encontrada-1.jpg', 'https://images.test/encontrada-2.jpg'],
    };
    candidates = [encontradaConFoto];

    global.setTimeout = (callback) => {
      queueMicrotask(callback);
      return 0;
    };
    try {
      await buscarCoincidencias(perdidaConFoto);
    } finally {
      global.setTimeout = originalSetTimeout;
    }

    assert.equal(coincidencias.length, 1);
    assert.equal(notificaciones.length, 2);
    assert.equal(llamadasIA, 4);
    const contenido = solicitudesGroq[0].body.messages[0].content;
    assert.equal(
      contenido.filter((parte) => parte.type === 'image_url').length,
      3
    );
    assert.equal(
      solicitudesGroq[0].headers.Authorization,
      'Bearer mock-groq-key-never-sent'
    );
    assert.ok(
      contenido.some((parte) =>
        parte.image_url?.url.startsWith('data:image/jpeg;base64,')
      )
    );
  });

  await ejecutarCaso('fuera del radio: no consulta IA', async () => {
    reset({ candidatos: [crearPublicacion('lejana', 'encontrado', 'usuario-2', 25)] });
    await buscarCoincidencias(perdida);
    assert.equal(llamadasIA, 0);
    assert.equal(coincidencias.length, 0);
  });

  await ejecutarCaso('misma persona: no consulta IA', async () => {
    reset({ candidatos: [crearPublicacion('propia', 'encontrado', 'usuario-1')] });
    await buscarCoincidencias(perdida);
    assert.equal(llamadasIA, 0);
    assert.equal(coincidencias.length, 0);
  });

  await ejecutarCaso('JSON mal formado: no lanza ni crea coincidencia', async () => {
    reset({ candidatos: [encontrada] });
    respuestaIA = 'respuesta sin JSON';
    await assert.doesNotReject(buscarCoincidencias(perdida));
    assert.equal(coincidencias.length, 0);
  });

  await ejecutarCaso('coincidencia existente: no duplica ni consulta IA', async () => {
    reset({
      candidatos: [encontrada],
      previas: [{ publicacionPerdida: perdida._id, publicacionEncontrada: encontrada._id }],
    });
    await buscarCoincidencias(perdida);
    assert.equal(llamadasIA, 0);
    assert.equal(coincidencias.length, 1);
    assert.equal(notificaciones.length, 0);
  });

  await ejecutarCaso('E11000 concurrente: no falla ni notifica de nuevo', async () => {
    reset({
      candidatos: [encontrada],
      previas: [{ publicacionPerdida: perdida._id, publicacionEncontrada: encontrada._id }],
    });
    Coincidencia.find = async () => [];
    await assert.doesNotReject(buscarCoincidencias(perdida));
    assert.equal(notificaciones.length, 0);
  });

  await ejecutarCaso('fallo de API: búsqueda no rechaza', async () => {
    reset({ candidatos: [encontrada] });
    errorIA = new Error('simulated network failure');
    global.setTimeout = (callback) => {
      queueMicrotask(callback);
      return 0;
    };
    try {
      await assert.doesNotReject(buscarCoincidencias(perdida));
    } finally {
      global.setTimeout = originalSetTimeout;
    }
    assert.equal(coincidencias.length, 0);
  });

  await ejecutarCaso('sin clave: búsqueda no rechaza', async () => {
    reset({ candidatos: [encontrada] });
    delete process.env.AI_API_KEY;
    await assert.doesNotReject(buscarCoincidencias(perdida));
    assert.equal(llamadasIA, 0);
    assert.equal(coincidencias.length, 0);
  });

  await ejecutarCaso('publicación guardada aunque la IA responda mal', async () => {
    reset({
      candidatos: [
        crearPublicacion(
          'encontrada-controller',
          'encontrado',
          '000000000000000000000002'
        ),
      ],
    });
    respuestaIA = 'respuesta sin JSON';
    const { guardada, redireccion } = await crearPorControlador(controller);

    assert.equal(guardada, true);
    assert.match(redireccion, /^\/publicaciones\//);
  });

  await ejecutarCaso('publicación guardada y redirigida sin clave de IA', async () => {
    reset({
      candidatos: [
        crearPublicacion(
          'encontrada-sin-clave',
          'encontrado',
          '000000000000000000000002'
        ),
      ],
    });
    delete process.env.AI_API_KEY;
    const { guardada, redireccion } = await crearPorControlador(controller);
    assert.equal(guardada, true);
    assert.match(redireccion, /^\/publicaciones\//);
    assert.equal(coincidencias.length, 0);
  });
}

main()
  .then(() => originalConsoleLog('Todas las pruebas mock pasaron; no se usó MongoDB ni la API real.'))
  .catch((error) => {
    originalConsoleError(error);
    process.exitCode = 1;
  })
  .finally(() => {
    Publicacion.find = originalFind;
    Coincidencia.find = originalCoincidenciaFind;
    Coincidencia.create = originalCoincidenciaCreate;
    Notificacion.create = originalNotificacionCreate;
    Publicacion.prototype.validate = originalValidate;
    Publicacion.prototype.save = originalSave;
    global.fetch = originalFetch;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
