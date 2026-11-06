const Publicacion = require('../models/Publicacion');
const Coincidencia = require('../models/Coincidencia');
const { crearNotificacion } = require('./notificacionService');

const UMBRAL = Number(process.env.MATCH_THRESHOLD) || 70;
const RADIO_KM = Number(process.env.MATCH_RADIUS_KM) || 10;
const MAX_CANDIDATOS = 5;
const MAX_DIAS = 30;
const MODELO = process.env.AI_MODEL || 'gemini-2.5-flash-lite';
const MODELO_GROQ = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';


// 1) FILTRO POR REGLAS (sin IA): tipo opuesto, misma especie, cerca, fechas cercanas,
//    otro usuario y sin coincidencia previa. Máximo 5.
async function buscarCandidatos(publicacion) {
  const tipoOpuesto = publicacion.tipo === 'perdido' ? 'encontrado' : 'perdido';
  const id = String(publicacion._id);

  const previas = await Coincidencia.find(
    { $or: [{ publicacionPerdida: publicacion._id }, { publicacionEncontrada: publicacion._id }] },
    'publicacionPerdida publicacionEncontrada'
  );
  const excluir = previas.map((c) =>
    String(c.publicacionPerdida) === id ? c.publicacionEncontrada : c.publicacionPerdida
  );

  const ms = MAX_DIAS * 24 * 60 * 60 * 1000;
  const fecha = new Date(publicacion.fechaEvento).getTime();

  return Publicacion.find({
    _id: { $nin: excluir },
    tipo: tipoOpuesto,
    especie: publicacion.especie,
    estado: 'activa',
    usuario: { $ne: publicacion.usuario },
    fechaEvento: { $gte: new Date(fecha - ms), $lte: new Date(fecha + ms) },
    ubicacion: {
      $near: {
        $geometry: { type: 'Point', coordinates: publicacion.ubicacion.coordinates },
        $maxDistance: RADIO_KM * 1000, // en metros
      },
    },
  }).limit(MAX_CANDIDATOS);
}

// Solo datos de la mascota (nada de nombre, email ni contacto)
function datosMascota(p) {
  return {
    tipo: p.tipo,
    especie: p.especie,
    raza: p.raza || '',
    color: p.color,
    tamano: p.tamano,
    descripcion: p.descripcion,
    rasgos: p.rasgos || '',
    zona: p.zona,
    fechaEvento: new Date(p.fechaEvento).toISOString().slice(0, 10),
  };
}


// Valida el JSON de la IA. Devuelve null si está mal formado.
function validarRespuesta(texto) {
  try {
    const inicio = texto.indexOf('{');
    const fin = texto.lastIndexOf('}');
    if (inicio === -1 || fin === -1) return null;
    const dato = JSON.parse(texto.slice(inicio, fin + 1));

    const puntaje = Number(dato.puntaje);
    if (!Number.isFinite(puntaje) || typeof dato.explicacion !== 'string') return null;

    const lista = (x) => (Array.isArray(x) ? x.filter((i) => typeof i === 'string') : []);
    return {
      puntaje: Math.max(0, Math.min(100, Math.round(puntaje))),
      explicacion: dato.explicacion.trim(),
      rasgosCoinciden: lista(dato.rasgosCoinciden),
      rasgosNoCoinciden: lista(dato.rasgosNoCoinciden),
    };
  } catch (error) {
    return null;
  }
}

async function fotoABase64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo bajar la foto (${r.status})`);
  const tipo = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
  const buffer = Buffer.from(await r.arrayBuffer());
  return { inline_data: { mime_type: tipo, data: buffer.toString('base64') } };
}

async function armarPartes(a, b, conFotos, maxFotos = Infinity) {
  const partes = [
    {
      text:
        'Compará estas dos publicaciones de mascotas y decidí si podrían ser el mismo animal.\n\n' +
        `PUBLICACION A:\n${JSON.stringify(datosMascota(a))}\n\n` +
        `PUBLICACION B:\n${JSON.stringify(datosMascota(b))}\n\n` +
        'Respondé SOLO con un JSON válido, sin texto extra ni markdown, con esta forma exacta:\n' +
        '{"puntaje": 0-100, "explicacion": "breve, en español", ' +
        '"rasgosCoinciden": ["..."], "rasgosNoCoinciden": ["..."]}',
    },
  ];

  if (conFotos) {
    let cantidadFotos = 0;
    for (const [nombre, p] of [['A', a], ['B', b]]) {
      for (const url of (p.fotos || []).slice(0, 2)) {
        if (cantidadFotos >= maxFotos) break;
        partes.push({ text: `Foto de la publicación ${nombre}:` });
        partes.push(await fotoABase64(url));
        cantidadFotos += 1;
      }
    }
  }
  return partes;
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function errorProveedor(proveedor, status, detalle) {
  const estado = status === null ? 'no está disponible' : `respondió ${status}`;
  const error = new Error(`${proveedor} ${estado}: ${detalle}`);
  error.temporal = status === null || status === 429 || status >= 500;
  return error;
}

async function llamarGemini(a, b, conFotos, contador) {
  if (!process.env.AI_API_KEY) throw new Error('Falta AI_API_KEY en .env');

  const cuerpo = JSON.stringify({
    contents: [{ role: 'user', parts: await armarPartes(a, b, conFotos) }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 600 },
  });

  const INTENTOS = 3;
  for (let intento = 1; intento <= INTENTOS; intento++) {
    contador.llamadas += 1;
    let respuesta;
    try {
      respuesta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.AI_API_KEY,
          },
          body: cuerpo,
        }
      );
    } catch (error) {
      if (intento < INTENTOS) {
        console.error(`[matching] Gemini no disponible, reintento ${intento}/${INTENTOS - 1}...`);
        await esperar(2000 * intento);
        continue;
      }
      throw errorProveedor('Gemini', null, error.message);
    }

    if (respuesta.ok) {
      const dato = await respuesta.json();
      const texto = dato.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return validarRespuesta(texto);
    }

    const temporal = respuesta.status === 429 || respuesta.status >= 500;
    if (temporal && intento < INTENTOS) {
      console.error(`[matching] Gemini respondió ${respuesta.status}, reintento ${intento}/${INTENTOS - 1}...`);
      await esperar(2000 * intento); // 2 s, luego 4 s
      continue;
    }

    const detalle = await respuesta.text();
    throw errorProveedor('Gemini', respuesta.status, detalle.slice(0, 200));
  }
}

async function llamarGroq(a, b, conFotos, contador) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('Falta GROQ_API_KEY en .env para usar el respaldo de IA.');
  }

  const partes = await armarPartes(a, b, conFotos, 3);
  const contenido = partes.map((parte) => {
    if (parte.inline_data) {
      const { mime_type, data } = parte.inline_data;
      return {
        type: 'image_url',
        image_url: { url: `data:${mime_type};base64,${data}` },
      };
    }
    return { type: 'text', text: parte.text };
  });
  const INTENTOS = 2;

  for (let intento = 1; intento <= INTENTOS; intento++) {
    contador.llamadas += 1;
    let respuesta;
    try {
      respuesta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODELO_GROQ,
          messages: [{ role: 'user', content: contenido }],
          response_format: { type: 'json_object' },
          max_completion_tokens: 600,
        }),
      });
    } catch (error) {
      if (intento < INTENTOS) {
        console.error('[matching] Groq no disponible, reintento 1/1...');
        await esperar(1000);
        continue;
      }
      throw errorProveedor('Groq', null, error.message);
    }

    if (respuesta.ok) {
      const dato = await respuesta.json();
      const texto = dato.choices?.[0]?.message?.content || '';
      return validarRespuesta(texto);
    }

    const temporal = respuesta.status === 429 || respuesta.status >= 500;
    if (temporal && intento < INTENTOS) {
      console.error(`[matching] Groq respondió ${respuesta.status}, reintento 1/1...`);
      await esperar(1000);
      continue;
    }

    const detalle = await respuesta.text();
    throw errorProveedor('Groq', respuesta.status, detalle.slice(0, 200));
  }
}

// 2) COMPARACIÓN CON IA. Usa Groq como respaldo ante fallas temporales de Gemini.
async function compararConIA(a, b, contador) {
  const hayFotos = (a.fotos || []).length + (b.fotos || []).length > 0;
  try {
    return await llamarGemini(a, b, hayFotos, contador);
  } catch (error) {
    if (error.temporal) {
      console.error('[matching] Gemini no disponible; intentando con Groq como respaldo.');
      return llamarGroq(a, b, hayFotos, contador);
    }
    if (!hayFotos) throw error;
    console.error('[matching] Falló con fotos, reintento sin fotos:', error.message);
    return llamarGemini(a, b, false, contador);
  }
}

// 3) UMBRAL: crea la Coincidencia y notifica a las dos personas
async function crearCoincidenciaYNotificar(publicacion, candidato, resultado) {
  const perdida = publicacion.tipo === 'perdido' ? publicacion : candidato;
  const encontrada = publicacion.tipo === 'perdido' ? candidato : publicacion;

  let coincidencia;
  try {
    coincidencia = await Coincidencia.create({
      publicacionPerdida: perdida._id,
      publicacionEncontrada: encontrada._id,
      puntaje: resultado.puntaje,
      explicacion: resultado.explicacion,
      rasgosCoinciden: resultado.rasgosCoinciden,
      rasgosNoCoinciden: resultado.rasgosNoCoinciden,
    });
  } catch (error) {
    if (error.code === 11000) return null; // ya existía, se ignora
    throw error;
  }

  await crearNotificacion(
    perdida.usuario,
    `Encontramos una posible coincidencia (${resultado.puntaje}%) para tu mascota perdida. Revisala y confirmá o descartá.`,
    coincidencia._id
  );
  await crearNotificacion(
    encontrada.usuario,
    `Alguien publicó una mascota perdida que podría ser la que encontraste (${resultado.puntaje}%). Revisala y confirmá o descartá.`,
    coincidencia._id
  );
  return coincidencia;
}

async function buscarCoincidencias(publicacion) {
  const contador = { llamadas: 0 };
  const candidatos = await buscarCandidatos(publicacion);

  for (const candidato of candidatos) {
    try {
      const resultado = await compararConIA(publicacion, candidato, contador);
      if (!resultado) {
        console.error('[matching] Respuesta de IA mal formada, se omite el candidato', candidato._id);
        continue;
      }
      if (resultado.puntaje >= UMBRAL) {
        await crearCoincidenciaYNotificar(publicacion, candidato, resultado);
      }
    } catch (error) {
      console.error('[matching] Error con el candidato', String(candidato._id), error.message);
    }
  }

  console.log(
    `[matching] Publicación ${publicacion._id}: ${candidatos.length} candidatos, ${contador.llamadas} llamadas a la IA`
  );
}

module.exports = { buscarCoincidencias };