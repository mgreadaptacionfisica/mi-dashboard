// Cuestionario del cliente — lo contesta al arrancar, desde el onboarding
// (low y high ticket) o suelto en /cuestionario. Sustituye a los formularios
// iniciales de Harbiz ("INICIAL ENTREVISTA" e "INICIAL DOLOR"), que dejaron
// de asignarse: antes el cliente contestaba ~100 preguntas en tres sitios y
// se repetían unas cuantas. Harbiz se queda solo con los de seguimiento
// (semanal y mensual).
//
// Es GENERAL, no solo de hombro: la primera pregunta es la zona, y los
// enunciados que la nombran llevan {zona}, que textoPregunta() sustituye por
// "el hombro", "la rodilla"… según lo que haya contestado.
//
// Tiene dos clases de preguntas:
//   - Las que llevan `factor`: alimentan la red de determinantes (el id del
//     catálogo de src/utils/redDeterminantes.js). El panel las agrupa por
//     factor junto al editor de la red, para que el fisio no traduzca nada.
//   - Las que no (zona, seguridad, historia, entreno): son datos para el
//     equipo — sobre todo para el entrenador, que programa con ellos — y el
//     panel las enseña por bloque en "Datos generales" (datosGenerales()).
//     Las del bloque 'lectura' tampoco llevan factor, pero por otra razón:
//     alimentan los PORCENTAJES (la pregunta `contrafactual` es literalmente
//     la pregunta ancla del paso 3 del editor de la red).
//
// Los enunciados viven AQUÍ y no en la fila: en `cuestionarios_previos.
// respuestas` solo se guarda { preguntaId: valor }. Así se puede corregir una
// redacción sin tocar lo ya recogido. NO se cambian los ids de preguntas ya
// existentes: las respuestas viejas se perderían de su enunciado (se
// enseñarían igual, como "sueltas", pero feas).
//
// Dolor: en hombro se mide con el SPADI en la valoración y manda ese; la
// escala de intensidad de aquí es la referencia para el resto de zonas, que
// no tienen SPADI. Por eso va al factor 'dolor' pero solo se enseña, no se
// usa para calcular nada.

export const BLOQUES_CUESTIONARIO = [
  {
    id: 'zona',
    eje: null,
    eyebrow: 'Para empezar',
    titulo: 'Dónde está el problema',
    intro: 'Con esto adaptamos el resto de preguntas a tu caso.',
    preguntas: [
      {
        id: 'zona',
        texto: '¿Qué zona es la que te molesta?',
        pista: 'Si es más de una, elige la que más te limita y cuéntanos el resto en la siguiente.',
        tipo: 'opciones',
        opciones: ['Hombro', 'Codo, muñeca o mano', 'Cuello', 'Espalda', 'Cadera', 'Rodilla', 'Tobillo o pie', 'Otra'],
      },
      {
        id: 'zonaDetalle',
        texto: '¿Dónde exactamente, y de qué lado?',
        pista: 'Ej: "parte delantera del hombro derecho", "por dentro de la rodilla izquierda".',
        tipo: 'corto',
      },
      {
        id: 'inicio',
        texto: '¿Cuándo empezó y cómo?',
        pista: 'De golpe (una caída, un gesto concreto) o poco a poco, sin saber por qué. Con la fecha aproximada.',
        tipo: 'texto',
      },
    ],
  },
  {
    id: 'seguridad',
    eje: null,
    eyebrow: 'Tu salud',
    titulo: 'Antes de ponerte a entrenar',
    intro: 'Preguntas rápidas de seguridad. Si contestas que sí a alguna no pasa nada: lo hablamos contigo antes de empezar.',
    preguntas: [
      {
        id: 'parqCorazon',
        alerta: 'Sí',
        texto: '¿Te ha dicho un médico alguna vez que tienes un problema de corazón y que solo hagas la actividad física que él te indique?',
        tipo: 'opciones',
        opciones: ['No', 'Sí'],
      },
      {
        id: 'parqPecho',
        alerta: 'Sí',
        texto: '¿Notas dolor en el pecho cuando haces actividad física?',
        tipo: 'opciones',
        opciones: ['No', 'Sí'],
      },
      {
        id: 'parqMareo',
        alerta: 'Sí',
        texto: '¿Pierdes el equilibrio por mareos o te has desmayado alguna vez?',
        tipo: 'opciones',
        opciones: ['No', 'Sí'],
      },
      {
        id: 'parqCronica',
        alerta: 'Sí',
        texto: '¿Tienes hipertensión, diabetes, alguna enfermedad respiratoria u otra enfermedad crónica?',
        tipo: 'opciones',
        opciones: ['No', 'Sí'],
      },
      {
        id: 'salud',
        factor: 'comorbilidades',
        texto: '¿Tienes alguna condición de salud que debamos tener en cuenta?',
        pista: 'Si has dicho que sí arriba, cuéntanos cuál. También otra lesión activa, tiroides, reuma, migrañas, lo que sea.',
        tipo: 'texto',
      },
      {
        id: 'medicacion',
        factor: 'medicacion',
        texto: '¿Tomas alguna medicación (para el dolor o para otra cosa), o te han infiltrado?',
        pista: 'Nos importa porque puede enmascarar lo que sientes al entrenar.',
        tipo: 'texto',
      },
      {
        id: 'alergias',
        texto: '¿Alguna alergia o intolerancia?',
        tipo: 'corto',
        placeholder: 'Ej: ninguna',
      },
      {
        id: 'fuma',
        texto: '¿Fumas?',
        tipo: 'opciones',
        opciones: ['No', 'Poco', 'Bastante'],
      },
    ],
  },
  {
    id: 'bio',
    eje: 'bio',
    eyebrow: 'Bloque 1 · Cuerpo',
    titulo: 'Cómo es tu dolor',
    intro: 'La movilidad y la fuerza las medimos nosotros. Aquí nos interesa lo que solo tú puedes contarnos: cómo se comporta el resto del día.',
    preguntas: [
      {
        id: 'intensidad',
        factor: 'dolor',
        texto: 'En un día normal, ¿cuánto te duele?',
        tipo: 'escala',
        extremos: ['0 · Nada', '10 · El peor dolor imaginable'],
      },
      {
        id: 'tipoDolor',
        factor: 'dolor',
        texto: '¿Cómo describirías tu dolor?',
        pista: 'Marca todas las que encajen.',
        tipo: 'varias',
        opciones: ['Punzante', 'Sordo o pesado', 'Quemazón', 'Continuo', 'Va y viene', 'Solo con ciertos gestos'],
      },
      {
        id: 'reposo',
        factor: 'dolor',
        texto: '¿Te duele estando en reposo, sin hacer nada?',
        tipo: 'opciones',
        opciones: ['No', 'A veces', 'Casi siempre'],
      },
      {
        id: 'irritabilidad',
        factor: 'irritabilidad',
        texto: 'Cuando se te enciende {zona}, ¿cuánto tarda en calmarse?',
        tipo: 'opciones',
        opciones: ['Minutos', 'Un par de horas', 'El resto del día', 'Al día siguiente sigue igual'],
      },
      {
        id: 'tolerancia',
        factor: 'toleranciaCarga',
        texto: '¿Qué puedes hacer antes de que aparezcan las molestias?',
        pista: 'Sé concreto: "unas 20 flexiones", "media hora caminando", "subir dos pisos de escaleras".',
        tipo: 'texto',
      },
      {
        id: 'neuro',
        alerta: ['Hormigueo o adormecimiento', 'Pérdida de fuerza', 'Las dos cosas'],
        texto: '¿Notas hormigueo, adormecimiento o pérdida de fuerza?',
        tipo: 'opciones',
        opciones: ['No', 'Hormigueo o adormecimiento', 'Pérdida de fuerza', 'Las dos cosas'],
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
        texto: '¿Te despierta {zona} por la noche?',
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
        id: 'imagen',
        factor: 'degeneracion',
        texto: '¿Te han hecho alguna prueba de imagen? ¿Qué te dijeron exactamente?',
        pista: 'Si te acuerdas de las palabras que usaron, escríbelas tal cual.',
        tipo: 'texto',
      },
      {
        id: 'lesiones',
        texto: 'Lesiones que hayas tenido antes y operaciones',
        pista: 'De esta zona y de cualquier otra. Con el año aproximado.',
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
        texto: '¿Qué crees que tienes en {zona}? Dilo con tus palabras.',
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
        texto: '¿Cuánto tiempo del día estás pendiente de cómo va {zona}?',
        tipo: 'escala',
        extremos: ['0 · Me olvido', '10 · Todo el rato'],
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
        texto: '¿Qué quieres conseguir, en cuánto tiempo, y qué significa "estar bien" para ti?',
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
    intro: 'El mejor programa del mundo no sirve si no cabe en tu vida. Cuéntanos cómo es de verdad, no la ideal.',
    preguntas: [
      {
        id: 'trabajo',
        factor: 'cargaTrabajo',
        texto: '¿A qué te dedicas y qué le pides a {zona} en un día normal de trabajo?',
        pista: 'Peso que cargas, gestos que repites, horas de pie, sentado o al ordenador.',
        tipo: 'texto',
      },
      {
        id: 'ergonomia',
        factor: 'ergonomia',
        texto: '¿Cómo es tu puesto? ¿Hay algo que puedas cambiar de él?',
        tipo: 'texto',
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
        pista: 'Entrenador, equipo, compañeros, una competición con fecha.',
        tipo: 'texto',
      },
      {
        id: 'otrosProfesionales',
        factor: 'mensajesContradictorios',
        texto: '¿Qué te han dicho otros profesionales sobre {zona}?',
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
    id: 'entreno',
    eje: null,
    eyebrow: 'Bloque 4 · Tu entreno',
    titulo: 'Cómo, cuándo y dónde vas a entrenar',
    intro: 'Con esto te montamos el programa. Piensa en tu semana real, no en la ideal.',
    preguntas: [
      {
        id: 'entrenaAhora',
        texto: '¿Haces ejercicio ahora mismo? ¿Qué y cuántos días?',
        tipo: 'texto',
      },
      {
        id: 'nivel',
        texto: '¿Qué nivel de condición física crees que tienes?',
        tipo: 'opciones',
        opciones: ['Bajo', 'Medio', 'Bueno', 'Muy bueno'],
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
        id: 'horario',
        texto: '¿En qué momento del día sueles poder entrenar?',
        pista: 'Marca todas las que te valgan.',
        tipo: 'varias',
        opciones: ['Mañana', 'Mediodía', 'Tarde', 'Noche'],
      },
      {
        id: 'duracionSesion',
        texto: '¿Cuánto tiempo tienes por sesión?',
        tipo: 'opciones',
        opciones: ['Menos de 30 min', '30-45 min', '45-60 min', 'Más de 1 hora'],
      },
      {
        id: 'material',
        factor: 'accesoMaterial',
        texto: '¿Dónde vas a entrenar y con qué material cuentas?',
        pista: 'Gimnasio, casa, parque, gomas, mancuernas, nada.',
        tipo: 'texto',
      },
      {
        id: 'gustos',
        texto: '¿Hay ejercicios que te gusten, o que no soportes?',
        tipo: 'texto',
      },
    ],
  },
  {
    id: 'lectura',
    eje: null,
    eyebrow: 'Bloque 5 · Tu lectura',
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

// La zona con su artículo, para meterla en los enunciados que llevan {zona}.
const ZONA_EN_FRASE = {
  Hombro: 'el hombro',
  'Codo, muñeca o mano': 'el codo, la muñeca o la mano',
  Cuello: 'el cuello',
  Espalda: 'la espalda',
  Cadera: 'la cadera',
  Rodilla: 'la rodilla',
  'Tobillo o pie': 'el tobillo o el pie',
  Otra: 'esa zona',
}

// Enunciado con la zona del cliente dentro. Sin zona contestada (o en
// cuestionarios viejos, que eran todos de hombro) se cae a "la zona que te
// molesta", que se entiende siempre.
export function textoPregunta(pregunta, respuestas) {
  if (!pregunta?.texto) return ''
  const zona = ZONA_EN_FRASE[(respuestas || {}).zona] || 'la zona que te molesta'
  return pregunta.texto.replace('{zona}', zona)
}

// Hay respuesta. Las de tipo 'varias' se guardan como array.
export function tieneValor(v) {
  if (Array.isArray(v)) return v.length > 0
  return v !== undefined && v !== null && String(v).trim() !== ''
}

// Una respuesta que conviene ver antes de empezar a entrenar (los "sí" de
// seguridad, hormigueo o pérdida de fuerza). `alerta` en la pregunta es el
// valor o los valores que la disparan.
export function esAlerta(pregunta, valor) {
  if (!pregunta?.alerta || !tieneValor(valor)) return false
  const disparadores = Array.isArray(pregunta.alerta) ? pregunta.alerta : [pregunta.alerta]
  return disparadores.includes(valor)
}

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
  return PREGUNTAS_CUESTIONARIO.filter((p) => tieneValor((respuestas || {})[p.id])).length
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
    if (!tieneValor(v)) return
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
    .filter((x) => tieneValor(x.valor))
}

// Las preguntas que no van a ningún factor ni a la lectura (zona, seguridad,
// historia, entreno), agrupadas por su bloque. Es lo que necesita el
// entrenador para programar y lo que hay que mirar antes de empezar.
export function datosGenerales(respuestas) {
  const datos = respuestas || {}
  return BLOQUES_CUESTIONARIO
    .map((b) => ({
      bloque: b,
      items: b.preguntas
        .filter((p) => !p.factor && b.id !== 'lectura' && tieneValor(datos[p.id]))
        .map((p) => ({ pregunta: p, valor: datos[p.id] })),
    }))
    .filter((g) => g.items.length > 0)
}

// Las alertas de un cuestionario, para destacarlas arriba.
export function alertasCuestionario(respuestas) {
  const datos = respuestas || {}
  return PREGUNTAS_CUESTIONARIO
    .filter((p) => esAlerta(p, datos[p.id]))
    .map((p) => ({ pregunta: p, valor: datos[p.id] }))
}

// Respuestas guardadas cuya pregunta ya no existe en el catálogo (porque se
// quitó o se renombró). Se enseñan igual, con el id como etiqueta: es dato del
// cliente y esconderlo sería peor que enseñarlo feo.
export function respuestasSueltas(respuestas) {
  return Object.entries(respuestas || {})
    .filter(([id, v]) => !preguntaInfo(id) && tieneValor(v))
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
