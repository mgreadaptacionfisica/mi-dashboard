// Cuestionario previo del cliente — las 30 preguntas que contesta ANTES de la
// valoración, para que el fisio llegue con la materia prima de la red de
// determinantes ya recogida.
//
// La clave de todo esto es `factor`: el id del catálogo de
// src/utils/redDeterminantes.js al que alimenta cada respuesta. Gracias a eso
// el fisio no tiene que traducir nada — el panel le enseña las respuestas
// agrupadas por el factor que alimentan, al lado del editor de la red.
//
// Los enunciados viven AQUÍ y no en la fila de la base de datos: en
// `cuestionarios_previos.respuestas` solo se guarda { preguntaId: valor }. Así
// se puede corregir una redacción sin tocar lo ya recogido. El precio es que
// si algún día se borra una pregunta del catálogo, las respuestas viejas a esa
// pregunta se quedan sin enunciado — por eso se enseñan igualmente, con el id
// como etiqueta (ver respuestasSueltas()).
//
// Las preguntas del bloque 'lectura' NO llevan factor a propósito: no
// alimentan un nodo, alimentan los PORCENTAJES. La pregunta `contrafactual`
// es literalmente la pregunta ancla que usa el paso 3 del editor de la red
// ("si esto desapareciera, ¿cuánto mejorarías?").
//
// No se pregunta por dolor ni por kinesiofobia en escala: ya se miden con el
// SPADI y el TAMPA en la valoración, y el panel deriva esas dos gravedades
// solo de ahí (gravedadesSugeridas() en redDeterminantes.js). Preguntarlo
// otra vez daría dos cifras distintas para lo mismo.

export const BLOQUES_CUESTIONARIO = [
  {
    id: 'bio',
    eje: 'bio',
    eyebrow: 'Bloque 1 · Cuerpo',
    titulo: 'Cómo se comporta ahora mismo',
    intro: 'La movilidad y la fuerza las medimos nosotros en la valoración. Aquí nos interesa lo que solo tú puedes contarnos: cómo se comporta el resto del día.',
    preguntas: [
      {
        id: 'irritabilidad',
        factor: 'irritabilidad',
        texto: 'Cuando se te enciende el hombro, ¿cuánto tarda en calmarse?',
        tipo: 'opciones',
        opciones: ['Minutos', 'Un par de horas', 'El resto del día', 'Al día siguiente sigue igual'],
      },
      {
        id: 'tolerancia',
        factor: 'toleranciaCarga',
        texto: '¿Qué puedes hacer antes de que aparezcan las molestias?',
        pista: 'Sé concreto: "unas 20 flexiones", "media hora de ordenador", "el primer set de dominadas".',
        tipo: 'texto',
      },
      {
        id: 'suenoHoras',
        factor: 'sueno',
        texto: '¿Cuántas horas duermes de media entre semana?',
        tipo: 'corto',
        placeholder: 'Ej: 6 horas y media',
      },
      {
        id: 'suenoDespierta',
        factor: 'sueno',
        texto: '¿Te despierta el hombro por la noche?',
        tipo: 'opciones',
        opciones: ['Nunca', 'Alguna noche', 'Casi todas', 'Todas'],
      },
      {
        id: 'suenoCalidad',
        factor: 'sueno',
        texto: '¿Qué tal descansas, en general?',
        tipo: 'escala',
        extremos: ['0 · Me levanto destrozado', '10 · Descanso perfectamente'],
      },
      {
        id: 'salud',
        factor: 'comorbilidades',
        texto: '¿Tienes alguna otra condición de salud que debamos tener en cuenta?',
        pista: 'Otra lesión activa, problemas de tiroides, diabetes, reuma, migrañas, lo que sea.',
        tipo: 'texto',
      },
      {
        id: 'medicacion',
        factor: 'medicacion',
        texto: '¿Estás tomando algo para el dolor, o te han infiltrado?',
        pista: 'Nos importa porque puede enmascarar lo que sientes durante la sesión.',
        tipo: 'texto',
      },
      {
        id: 'imagen',
        factor: 'degeneracion',
        texto: '¿Te han hecho alguna prueba de imagen? ¿Qué te dijeron exactamente?',
        pista: 'Si te acuerdas de las palabras que usaron, escríbelas tal cual.',
        tipo: 'texto',
      },
    ],
  },
  {
    id: 'psico',
    eje: 'psico',
    eyebrow: 'Bloque 2 · Cabeza',
    titulo: 'Qué piensas que te pasa',
    intro: 'Lo que uno cree sobre su lesión cambia lo que hace con ella, y eso cambia cómo evoluciona. Por eso preguntamos.',
    preguntas: [
      {
        id: 'creencia',
        factor: 'creenciasErroneas',
        texto: '¿Qué crees que tienes en el hombro? Dilo con tus palabras.',
        pista: 'Sin tecnicismos. Lo que le contarías a un amigo.',
        tipo: 'texto',
      },
      {
        id: 'catastrofismo',
        factor: 'catastrofismo',
        texto: 'Cuando te duele, ¿con qué fuerza aparece la idea de que esto no va a mejorar?',
        tipo: 'escala',
        extremos: ['0 · Nunca lo pienso', '10 · Lo pienso constantemente'],
      },
      {
        id: 'miedoGesto',
        factor: 'miedoRecaer',
        texto: '¿Hay algún movimiento o gesto que evitas por miedo a que te pase algo?',
        pista: 'Aunque no te duela al hacerlo.',
        tipo: 'texto',
      },
      {
        id: 'hipervigilancia',
        factor: 'hipervigilancia',
        texto: '¿Cuánto tiempo del día estás pendiente de cómo va el hombro?',
        tipo: 'escala',
        extremos: ['0 · Me olvido de él', '10 · Todo el rato'],
      },
      {
        id: 'estres',
        factor: 'estres',
        texto: '¿Cómo va tu nivel de estrés estos meses?',
        tipo: 'escala',
        extremos: ['0 · Tranquilo', '10 · Al límite'],
      },
      {
        id: 'animo',
        factor: 'animoBajo',
        texto: '¿Y el ánimo?',
        tipo: 'escala',
        // Ojo: esta escala va al revés que las demás (10 = bien). El factor
        // que alimenta es "ánimo bajo", así que al pasarlo a la red hay que
        // invertirlo — el panel lo avisa al enseñar la respuesta.
        invertida: true,
        extremos: ['0 · Muy bajo', '10 · Muy bien'],
      },
      {
        id: 'autoeficacia',
        factor: 'autoeficacia',
        texto: '¿Cuánto te ves capaz de sacar esto adelante?',
        tipo: 'escala',
        // Igual que la anterior: el factor es "BAJA autoeficacia".
        invertida: true,
        extremos: ['0 · No me veo', '10 · Totalmente capaz'],
      },
      {
        id: 'expectativa',
        factor: 'expectativas',
        texto: '¿En cuánto tiempo esperas estar bien, y qué significa "bien" para ti?',
        pista: 'Ponle nombre a algo concreto que hoy no puedes hacer y quieres recuperar.',
        tipo: 'texto',
      },
      {
        id: 'adherencia',
        factor: 'adherencia',
        texto: 'Siendo sincero: ¿qué es lo que más te va a costar de cumplir un plan de entrenamiento?',
        pista: 'Aquí es donde menos sirve quedar bien.',
        tipo: 'texto',
      },
    ],
  },
  {
    id: 'social',
    eje: 'social',
    eyebrow: 'Bloque 3 · Vida',
    titulo: 'Con qué cuentas y con qué no',
    intro: 'El mejor programa del mundo no sirve si no cabe en tu semana. Cuéntanos cómo es tu semana de verdad, no la ideal.',
    preguntas: [
      {
        id: 'trabajo',
        factor: 'cargaTrabajo',
        texto: '¿A qué te dedicas y qué le pides al hombro en un día normal de trabajo?',
        pista: 'Peso que cargas, gestos que repites, horas con el brazo arriba o al ordenador.',
        tipo: 'texto',
      },
      {
        id: 'ergonomia',
        factor: 'ergonomia',
        texto: '¿Cómo es tu puesto? ¿Hay algo que puedas cambiar de él?',
        tipo: 'texto',
      },
      {
        id: 'tiempo',
        factor: 'faltaTiempo',
        texto: '¿Cuántos días a la semana puedes entrenar de verdad?',
        pista: 'La cifra realista de una semana mala, no la de una semana buena.',
        tipo: 'corto',
        placeholder: 'Ej: 2 días, y alguna semana ninguno',
      },
      {
        id: 'apoyo',
        factor: 'apoyoEntorno',
        texto: '¿La gente de tu casa acompaña esto, o más bien lo complica?',
        tipo: 'opciones',
        opciones: ['Me ayudan mucho', 'Ni ayudan ni molestan', 'Lo complican', 'Vivo solo'],
      },
      {
        id: 'deporte',
        factor: 'presionDeportiva',
        texto: '¿Practicas algún deporte? ¿Hay alguien esperando que vuelvas pronto?',
        pista: 'Entrenador, equipo, compañeros de box, una competición con fecha.',
        tipo: 'texto',
      },
      {
        id: 'material',
        factor: 'accesoMaterial',
        texto: '¿Dónde vas a entrenar y con qué material cuentas?',
        pista: 'Gimnasio, casa, gomas, mancuernas, nada.',
        tipo: 'texto',
      },
      {
        id: 'otrosProfesionales',
        factor: 'mensajesContradictorios',
        texto: '¿Qué te han dicho otros profesionales sobre este hombro?',
        pista: 'Aunque te parezca que no viene a cuento, o que se contradice con lo que te hemos dicho nosotros.',
        tipo: 'texto',
      },
      {
        id: 'laboral',
        factor: 'situacionLaboral',
        texto: '¿Estás de baja, con una incapacidad en trámite o con algún proceso abierto por esto?',
        tipo: 'opciones',
        opciones: ['No', 'De baja', 'Incapacidad en trámite', 'Proceso legal abierto'],
      },
      {
        id: 'turnos',
        factor: 'turnosViajes',
        texto: '¿Trabajas a turnos o viajas a menudo?',
        tipo: 'opciones',
        opciones: ['No', 'Turnos rotativos', 'Turnos de noche', 'Viajo mucho'],
      },
    ],
  },
  {
    id: 'lectura',
    eje: null,
    eyebrow: 'Bloque 4 · Tu lectura',
    titulo: 'Qué crees tú que lo está causando',
    intro: 'Esta es la parte que más nos interesa. Llevas conviviendo con esto mucho más tiempo que nosotros.',
    preguntas: [
      {
        id: 'causas',
        texto: 'Si tuvieras que decir qué te está causando esto, ¿qué tres cosas dirías?',
        pista: 'Ordénalas de más a menos importante. Vale cualquier cosa: el trabajo, el estrés, una caída de hace años, dormir mal.',
        tipo: 'texto',
      },
      {
        id: 'contrafactual',
        texto: 'Coge la primera de esas tres. Si desapareciera mañana y todo lo demás siguiera igual, ¿cuánto mejorarías?',
        pista: 'Esta es la pregunta que más nos ayuda a repartir el peso de cada factor.',
        tipo: 'escala',
        extremos: ['0 · Nada, seguiría igual', '10 · Se resolvería casi todo'],
      },
      {
        id: 'peor',
        texto: '¿Qué hace que empeore, y qué hace que mejore?',
        pista: 'Momentos del día, actividades, posturas, épocas del año.',
        tipo: 'texto',
      },
      {
        id: 'algoMas',
        texto: '¿Hay algo más que creas que deberíamos saber?',
        pista: 'Cualquier cosa. Aquí caben las que no encajaban en ninguna pregunta.',
        tipo: 'texto',
      },
    ],
  },
]

// Todas las preguntas en plano, con su bloque y su número correlativo (el que
// ve el cliente en pantalla), para poder buscarlas por id sin recorrer la
// estructura cada vez.
export const PREGUNTAS_CUESTIONARIO = BLOQUES_CUESTIONARIO.flatMap((b, bi) =>
  b.preguntas.map((p, pi) => ({
    ...p,
    bloqueId: b.id,
    eje: b.eje,
    numero: BLOQUES_CUESTIONARIO.slice(0, bi).reduce((t, x) => t + x.preguntas.length, 0) + pi + 1,
  })),
)

export function preguntaInfo(id) {
  return PREGUNTAS_CUESTIONARIO.find((p) => p.id === id) || null
}

export function cuestionarioVacio() {
  return { clienteNombre: '', email: '', respuestas: {} }
}

// Cuántas preguntas tienen respuesta. Sirve para el progreso del formulario y
// para que el panel avise de un cuestionario a medias.
export function respondidas(respuestas) {
  return PREGUNTAS_CUESTIONARIO.filter((p) => {
    const v = (respuestas || {})[p.id]
    return v !== undefined && v !== null && String(v).trim() !== ''
  }).length
}

export const TOTAL_PREGUNTAS = PREGUNTAS_CUESTIONARIO.length

// Respuestas agrupadas por el factor de la red al que alimentan, que es como
// las necesita el fisio mientras monta la red: no leyendo el cuestionario de
// arriba abajo, sino mirando "¿qué me han contado sobre el sueño?".
export function respuestasPorFactor(respuestas) {
  const datos = respuestas || {}
  const mapa = new Map()
  PREGUNTAS_CUESTIONARIO.forEach((p) => {
    if (!p.factor) return
    const v = datos[p.id]
    if (v === undefined || v === null || String(v).trim() === '') return
    if (!mapa.has(p.factor)) mapa.set(p.factor, [])
    mapa.get(p.factor).push({ pregunta: p, valor: v })
  })
  return [...mapa.entries()].map(([factor, items]) => ({ factor, items }))
}

// Lo que contestó en el bloque 4 (su propia lectura). No alimenta ningún
// factor: alimenta los porcentajes, así que se enseña aparte y entero.
export function suLectura(respuestas) {
  const datos = respuestas || {}
  return PREGUNTAS_CUESTIONARIO
    .filter((p) => p.bloqueId === 'lectura')
    .map((p) => ({ pregunta: p, valor: datos[p.id] }))
    .filter((x) => x.valor !== undefined && x.valor !== null && String(x.valor).trim() !== '')
}

// Respuestas guardadas cuya pregunta ya no existe en el catálogo (porque se
// quitó o se renombró). Se enseñan igual, con el id como etiqueta: es dato del
// cliente y esconderlo sería peor que enseñarlo feo.
export function respuestasSueltas(respuestas) {
  return Object.entries(respuestas || {})
    .filter(([id, v]) => !preguntaInfo(id) && v !== undefined && v !== null && String(v).trim() !== '')
    .map(([id, valor]) => ({ id, valor }))
}

// Busca el cuestionario de un cliente. El enlace es por NOMBRE (la trampa
// conocida del panel), así que la comparación es tolerante: sin tildes, sin
// mayúsculas y sin espacios de más. Así "Jose Ramon " encuentra a "José
// Ramón" y no hace falta que el cliente lo teclee clavado — aunque lo normal
// es que ni lo teclee, porque le llega en el enlace.
export function normalizaNombre(nombre) {
  return String(nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Devuelve el cuestionario más reciente de ese cliente, o null. La lista
// llega ya ordenada por fecha de envío descendente desde la query, así que el
// primero que casa es el bueno: si lo mandó dos veces, la segunda corrige a
// la primera.
export function cuestionarioDeCliente(cuestionarios, clienteNombre) {
  const buscado = normalizaNombre(clienteNombre)
  if (!buscado) return null
  return (cuestionarios || []).find((c) => normalizaNombre(c.clienteNombre) === buscado) || null
}

// Enlace que se le pasa al cliente. El nombre viaja dentro para que no tenga
// que teclearlo y coincida exacto con su ficha.
export function enlaceCuestionario(clienteNombre, origen) {
  const base = origen || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/cuestionario?c=${encodeURIComponent(clienteNombre || '')}`
}
