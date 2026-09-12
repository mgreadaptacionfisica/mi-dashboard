// Red de determinantes — mapa bio-psico-social de un cliente.
//
// La idea: en vez de una lista plana de "cosas que le pasan", se dibuja un
// grafo dirigido donde cada factor es un nodo y cada flecha es "esto causa
// esto otro, y en esta proporción". Así se ve no solo QUÉ le afecta, sino
// CUÁNTO y por qué camino — un factor puede no tocar el dolor directamente y
// ser aun así de lo más importante porque llega por detrás (turnos de noche →
// duerme mal → más irritabilidad → más dolor).
//
// De dónde sale el método (los tres se complementan):
//
// - RPS-Form (Steiner et al. 2002, Physical Therapy 82:1098), la hoja clásica
//   de rehabilitación basada en el modelo ICF de la OMS: problema diana en el
//   centro y alrededor los factores bio, personales y ambientales, unidos con
//   flechas. De aquí viene la separación por ejes y la idea de "problema
//   diana".
//
// - Process-based physiotherapy / "Clinical Compass" (ensayo NCT07704593):
//   su paso 2 es construir un modelo de red específico de la persona con
//   objetivos, problemas y factores influyentes como nodos interconectados,
//   incluyendo los BUCLES que mantienen la queja; el paso 3 es decidir con el
//   cliente cuál es el proceso modificable más central. De aquí vienen
//   `detectarBucles()` y la marca `modificable` de cada factor.
//
// - PECAN — Perceived Causal Networks (Klintwall, Bellander & Cervin 2023,
//   Assessment 30(1)): el método numérico. Elegir entre 7 y 15 problemas,
//   puntuar cada uno de 0 a 100 en gravedad, y para cada uno señalar COMO
//   MÁXIMO 3 causas repartiendo 100% entre ellas más un "no lo sé". La
//   importancia sale de una centralidad de salida ponderada por gravedad.
//   De aquí vienen MAX_CAUSAS, la escala 0-100 y `centralidades()`.
//
// AVISO IMPORTANTE que conviene no perder de vista (lo dicen los propios
// autores de PECAN): esto refleja la causalidad PERCIBIDA por quien rellena,
// no la causalidad real. Es una base para hablar con el cliente y decidir por
// dónde empezar, no una máquina de diagnosticar. En el panel lo rellena el
// fisio durante la valoración.

import { spadiTotal, tampaTotal } from './valoracionHelpers'

// Los tres ejes del modelo bio-psico-social. Son las tres columnas en las
// que se pinta la red.
//
// El "problema diana" (el target problem del RPS-Form: la queja u objetivo
// que se está intentando explicar) NO es un eje más: es una MARCA sobre uno
// de los nodos — `diana: true`. Se hizo así a propósito, porque un problema
// diana sigue teniendo su eje: "dolor" es biológico aunque sea la diana, y
// perder ese dato dejaría al nodo sin columna donde pintarse.
export const EJES = [
  {
    id: 'bio',
    label: 'Biológico',
    emoji: '🔴',
    descripcion: 'Estructura, función y estado físico: dolor, movilidad, fuerza, sueño, comorbilidades.',
  },
  {
    id: 'psico',
    label: 'Psicológico',
    emoji: '🟣',
    descripcion: 'Creencias, miedos y estado de ánimo: cómo interpreta lo que le pasa y cómo eso cambia lo que hace.',
  },
  {
    id: 'social',
    label: 'Social / entorno',
    emoji: '🔵',
    descripcion: 'Todo lo que le rodea: trabajo, tiempo, apoyo, acceso a material, otros profesionales.',
  },
]

export function ejeInfo(id) {
  return EJES.find((e) => e.id === id) || null
}

// Catálogo de factores.
//
// Cada uno lleva:
//   - eje: dónde se pinta.
//   - ayuda: cómo reconocerlo, en la línea de los "positivoSi" del
//     diagnóstico diferencial — para que dos técnicos distintos entiendan lo
//     mismo por el mismo factor y los datos sean comparables entre clientes.
//   - modificable: si se puede atacar desde nuestro programa. Esto NO es
//     decoración: un factor puede salir muy central y no servir de nada como
//     prioridad si no hay palanca (la edad, una degeneración tisular). El
//     ranking los separa para no señalar como objetivo algo intocable. Los
//     no modificables siguen siendo útiles: explican el cuadro y ajustan
//     expectativas.
//   - derivaDe (opcional): cuestionario de la propia valoración del que se
//     puede proponer la gravedad ya calculada, para no puntuar a ciegas algo
//     que ya has medido. Siempre es una PROPUESTA: se puede corregir a mano.
//
// El catálogo es cerrado a propósito (así se pueden comparar clientes y ver
// patrones), pero cada eje admite factores "otro:" de texto libre — la
// lección de BLOQUES_SESION, que se quedó corto por ser cerrado del todo.
export const FACTORES = [
  // 🔴 Biológicos
  {
    id: 'dolor',
    eje: 'bio',
    label: 'Dolor actual',
    ayuda: 'Intensidad y frecuencia del dolor tal y como está ahora mismo, entre sesiones incluido.',
    modificable: true,
    derivaDe: 'spadi',
  },
  {
    id: 'irritabilidad',
    eje: 'bio',
    label: 'Irritabilidad alta',
    ayuda: 'Se enciende con poco y tarda en calmarse. Es el criterio que marca la fase (ver FASES en valoracionHelpers).',
    modificable: true,
  },
  {
    id: 'movilidadHombro',
    eje: 'bio',
    label: 'Pérdida de movilidad de hombro',
    ayuda: 'Recorrido limitado en el semáforo de movilidad de hombro (amarillos o rojos).',
    modificable: true,
  },
  {
    id: 'movilidadCervical',
    eje: 'bio',
    label: 'Pérdida de movilidad cervical',
    ayuda: 'Recorrido cervical limitado. Ojo: 1 de cada 2 con dolor de hombro tiene también dolor cervical.',
    modificable: true,
  },
  {
    id: 'deficitFuerza',
    eje: 'bio',
    label: 'Déficit de fuerza',
    ayuda: 'Por debajo de los valores de referencia en %BW de su sexo en los ejercicios de carga.',
    modificable: true,
  },
  {
    id: 'asimetria',
    eje: 'bio',
    label: 'Asimetría entre lados',
    ayuda: 'Índice de simetría por debajo del 90% en los pares Dx/Izq (ver SIMETRIA_PARES).',
    modificable: true,
  },
  {
    id: 'controlEscapular',
    eje: 'bio',
    label: 'Falta de control escapular',
    ayuda: 'La escápula no acompaña el movimiento del brazo: ritmo alterado, alado, elevación compensatoria.',
    modificable: true,
  },
  {
    id: 'toleranciaCarga',
    eje: 'bio',
    label: 'Baja tolerancia a la carga',
    ayuda: 'Aguanta poco volumen o poca intensidad antes de que aparezcan síntomas, aunque la fuerza máxima no esté tan mal.',
    modificable: true,
  },
  {
    id: 'sueno',
    eje: 'bio',
    label: 'Sueño insuficiente o de mala calidad',
    ayuda: 'Duerme poco, se despierta por el hombro o se levanta sin descansar. Muy habitual como nodo puente entre lo social y lo biológico.',
    modificable: true,
  },
  {
    id: 'comorbilidades',
    eje: 'bio',
    label: 'Comorbilidades',
    ayuda: 'Otras patologías que condicionan el programa (metabólicas, reumatológicas, otra lesión activa).',
    modificable: false,
  },
  {
    id: 'degeneracion',
    eje: 'bio',
    label: 'Degeneración tisular / edad',
    ayuda: 'Cambios estructurales propios de la edad. No modificable, pero explica parte del cuadro y ajusta expectativas.',
    modificable: false,
  },
  {
    id: 'medicacion',
    eje: 'bio',
    label: 'Medicación o infiltraciones',
    ayuda: 'Analgesia o infiltraciones que enmascaran síntomas y pueden falsear lo que se siente en sesión.',
    modificable: false,
  },

  // 🟣 Psicológicos
  {
    id: 'kinesiofobia',
    eje: 'psico',
    label: 'Kinesiofobia (miedo al movimiento)',
    ayuda: 'Evita moverse por miedo a hacerse daño. Se mide con el TAMPA: por encima de 37 es alta.',
    modificable: true,
    derivaDe: 'tampa',
  },
  {
    id: 'catastrofismo',
    eje: 'psico',
    label: 'Catastrofismo',
    ayuda: 'Se pone en el peor escenario: "esto no se va a arreglar nunca", "cada vez va a ir a peor".',
    modificable: true,
  },
  {
    id: 'creenciasErroneas',
    eje: 'psico',
    label: 'Creencias erróneas sobre la lesión',
    ayuda: 'Ideas que no se sostienen y condicionan lo que hace: "lo tengo roto", "tengo el hombro desgastado, no puedo cargar".',
    modificable: true,
  },
  {
    id: 'miedoRecaer',
    eje: 'psico',
    label: 'Miedo a recaer',
    ayuda: 'Distinto de la kinesiofobia general: aquí sí se mueve, pero frena ante el gesto concreto que le lesionó.',
    modificable: true,
  },
  {
    id: 'estres',
    eje: 'psico',
    label: 'Estrés o ansiedad',
    ayuda: 'Nivel de activación mantenido, venga de donde venga. Suele alimentar el sueño y la irritabilidad.',
    modificable: true,
  },
  {
    id: 'animoBajo',
    eje: 'psico',
    label: 'Ánimo bajo',
    ayuda: 'Desánimo, apatía o desmotivación. Si es marcado y persistente, valorar derivación a psicología.',
    modificable: true,
  },
  {
    id: 'autoeficacia',
    eje: 'psico',
    label: 'Baja autoeficacia',
    ayuda: 'No se ve capaz de sacar el programa adelante ni de gestionar el dolor por su cuenta.',
    modificable: true,
  },
  {
    id: 'expectativas',
    eje: 'psico',
    label: 'Expectativas poco realistas',
    ayuda: 'Espera plazos o resultados que no cuadran con su punto de partida, en cualquiera de los dos sentidos.',
    modificable: true,
  },
  {
    id: 'hipervigilancia',
    eje: 'psico',
    label: 'Hipervigilancia al dolor',
    ayuda: 'Está pendiente todo el rato de cualquier señal del hombro y la interpreta como daño.',
    modificable: true,
  },
  {
    id: 'adherencia',
    eje: 'psico',
    label: 'Baja adherencia al programa',
    ayuda: 'No completa las sesiones pautadas. Mirar si es causa o consecuencia: casi siempre es un nodo de paso, no el origen.',
    modificable: true,
  },

  // 🔵 Sociales / entorno
  {
    id: 'cargaTrabajo',
    eje: 'social',
    label: 'Carga de trabajo / gestos repetidos',
    ayuda: 'Su trabajo le exige el gesto que le duele, o un volumen que no puede bajar a voluntad.',
    modificable: false,
  },
  {
    id: 'ergonomia',
    eje: 'social',
    label: 'Ergonomía del puesto',
    ayuda: 'Cómo está montado su puesto. A diferencia de la carga, esto sí se suele poder tocar.',
    modificable: true,
  },
  {
    id: 'faltaTiempo',
    eje: 'social',
    label: 'Falta de tiempo para entrenar',
    ayuda: 'No encuentra hueco real en su semana. Se ataca rediseñando el programa, no insistiendo.',
    modificable: true,
  },
  {
    id: 'apoyoEntorno',
    eje: 'social',
    label: 'Falta de apoyo de pareja o familia',
    ayuda: 'El entorno cercano no acompaña el proceso, o directamente lo desincentiva.',
    modificable: false,
  },
  {
    id: 'presionDeportiva',
    eje: 'social',
    label: 'Presión del entorno deportivo',
    ayuda: 'Club, equipo, box o entrenador empujando a volver antes de tiempo o a cargar más de la cuenta.',
    modificable: true,
  },
  {
    id: 'accesoMaterial',
    eje: 'social',
    label: 'Acceso limitado a gimnasio o material',
    ayuda: 'No tiene el material que pide el programa. Se ataca adaptando la pauta a lo que sí tiene.',
    modificable: true,
  },
  {
    id: 'mensajesContradictorios',
    eje: 'social',
    label: 'Mensajes contradictorios de otros profesionales',
    ayuda: 'Otro profesional le ha dicho lo contrario que nosotros. Alimenta mucho las creencias erróneas.',
    modificable: true,
  },
  {
    id: 'situacionLaboral',
    eje: 'social',
    label: 'Situación laboral (baja, incapacidad)',
    ayuda: 'Baja médica, incapacidad o litigio en curso. Condiciona plazos y a veces los incentivos.',
    modificable: false,
  },
  {
    id: 'turnosViajes',
    eje: 'social',
    label: 'Turnos o viajes',
    ayuda: 'Horarios rotativos o desplazamientos que rompen la rutina de sueño y de entrenamiento.',
    modificable: false,
  },
]

export function factorInfo(id) {
  return FACTORES.find((f) => f.id === id) || null
}

export function factoresDeEje(ejeId) {
  return FACTORES.filter((f) => f.eje === ejeId)
}

// --- Factores "otro" -------------------------------------------------------
// Los de texto libre se guardan con id 'otro:<slug>' y su propia etiqueta
// dentro del nodo. El prefijo permite distinguirlos al agregar datos entre
// clientes: los 'otro:' no se pueden comparar, los del catálogo sí.

export const PREFIJO_OTRO = 'otro:'

export function esFactorOtro(id) {
  return typeof id === 'string' && id.startsWith(PREFIJO_OTRO)
}

export function nuevoIdOtro(etiqueta) {
  const slug = String(etiqueta || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // fuera tildes (marcas diacriticas)
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${PREFIJO_OTRO}${slug || Date.now()}`
}

// Etiqueta a mostrar de un nodo: la suya propia si es 'otro', y si no la del
// catálogo. El fallback al id evita que un factor retirado del catálogo en el
// futuro deje nodos sin nombre en las valoraciones ya guardadas.
export function etiquetaNodo(nodo) {
  if (!nodo) return ''
  if (nodo.etiqueta) return nodo.etiqueta
  return factorInfo(nodo.id)?.label || nodo.id
}

// Un 'otro:' se considera modificable salvo que se marque lo contrario al
// crearlo: lo más común es que el técnico apunte algo sobre lo que sí puede
// actuar, y equivocarse hacia "se puede hacer algo" es menos malo que
// descartar de oficio.
export function esModificable(nodo) {
  if (!nodo) return false
  if (typeof nodo.modificable === 'boolean') return nodo.modificable
  return factorInfo(nodo.id)?.modificable ?? true
}

// --- Reglas de relleno -----------------------------------------------------
// MIN/MAX son RECOMENDACIÓN, no validación dura (PECAN los usa como rango de
// trabajo: menos de 7 se queda pobre, más de 15 es inmanejable de puntuar).
// MAX_CAUSAS sí es tope real: obliga a priorizar, que es justo lo que hace
// útil al método. Si todo causa todo, la red no dice nada.
export const MIN_NODOS = 7
export const MAX_NODOS = 15
export const MAX_CAUSAS = 3

// Clave reservada para el "otras causas / no lo sé" del reparto. Empieza por
// guion bajo para no chocar nunca con un id de factor.
export const CLAVE_DESCONOCIDO = '_desconocido'

export function redVacia() {
  return { nodos: [], causas: {}, notas: '' }
}

// Gravedad propuesta a partir de lo que ya se ha medido en esta valoración.
// Devuelve un objeto { factorId: 0-100 } solo con los que se pueden derivar.
// Es una propuesta: el formulario la precarga y el técnico la ajusta.
export function gravedadesSugeridas(valoracion) {
  const out = {}
  if (!valoracion) return out

  // SPADI ya viene en 0-100, misma escala que la gravedad: va directo.
  const spadi = spadiTotal(valoracion.spadi)
  if (spadi !== null && spadi !== undefined) out.dolor = Math.round(spadi)

  // TAMPA va de 11 a 44 (11 = sin kinesiofobia): se reescala a 0-100.
  const tampa = tampaTotal(valoracion.tampa)
  if (tampa !== null && tampa !== undefined) {
    out.kinesiofobia = Math.round(((tampa - 11) / 33) * 100)
  }
  return out
}

// --- Lectura de la red -----------------------------------------------------

export function nodosDe(red) {
  return (red && Array.isArray(red.nodos)) ? red.nodos : []
}

export function nodoPorId(red, id) {
  return nodosDe(red).find((n) => n.id === id) || null
}

// Nodos marcados como problema diana. Se admite más de uno (un cliente puede
// tener dos quejas: el dolor y no poder dormir), aunque lo normal es uno y es
// lo que propone el formulario.
export function dianasDe(red) {
  return nodosDe(red).filter((n) => n.diana === true)
}

// Causas declaradas de un nodo, SIN el "no lo sé" (que no es un nodo real y
// no forma aristas del grafo, solo sirve para cuadrar el 100%).
export function causasDe(red, nodoId) {
  const brutas = (red?.causas || {})[nodoId] || {}
  const out = {}
  Object.entries(brutas).forEach(([id, pct]) => {
    if (id !== CLAVE_DESCONOCIDO && Number(pct) > 0) out[id] = Number(pct)
  })
  return out
}

export function sumaReparto(reparto) {
  return Object.values(reparto || {}).reduce((t, v) => t + (Number(v) || 0), 0)
}

export function gravedadDe(red, nodoId) {
  const n = nodoPorId(red, nodoId)
  return Number(n?.gravedad) || 0
}

// Mapa inverso: de quién sale cada flecha. Las causas se guardan por EFECTO
// ("¿qué causa esto?", que es como se pregunta), pero para recorrer el grafo
// hacia delante hace falta ir por origen. Se calcula una vez y se reutiliza.
export function mapaEfectos(red) {
  const out = {}
  nodosDe(red).forEach((n) => { out[n.id] = [] })
  Object.keys(red?.causas || {}).forEach((efectoId) => {
    Object.entries(causasDe(red, efectoId)).forEach(([causaId, pct]) => {
      if (!out[causaId]) out[causaId] = []
      out[causaId].push({ efecto: efectoId, peso: pct })
    })
  })
  return out
}

// --- Importancia de cada factor -------------------------------------------
// Centralidad de salida ponderada por gravedad (PECAN): lo que pesa un factor
// es su propia gravedad MÁS la gravedad de lo que provoca, descontada por la
// proporción en que lo provoca.
//
//   centralidad(i) = gravedad(i) + Σ [ gravedad(j) × pct(i→j) / 100 ]
//
// Es deliberadamente de un solo paso, como en el paper: mide "cuánto sostiene
// este factor el cuadro ahora mismo". Lo que llega por caminos largos se mide
// aparte, en efectoSobre(), donde además se ve POR DÓNDE llega — que para
// decidir qué tocar es más informativo que un número agregado.
export function centralidades(red) {
  const efectos = mapaEfectos(red)
  const bruto = nodosDe(red).map((n) => {
    const propia = Number(n.gravedad) || 0
    const arrastre = (efectos[n.id] || []).reduce(
      (t, { efecto, peso }) => t + gravedadDe(red, efecto) * (peso / 100),
      0,
    )
    return { id: n.id, nodo: n, centralidad: propia + arrastre }
  })

  const total = bruto.reduce((t, x) => t + x.centralidad, 0)
  return bruto
    .map((x) => ({
      ...x,
      // Proporción sobre el total de la red: permite comparar dos redes
      // distintas (una con 8 nodos y otra con 14) sin que la más grande
      // salga siempre con números más altos.
      proporcion: total > 0 ? Math.round((x.centralidad / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.centralidad - a.centralidad)
}

// --- Efecto sobre la diana: directo vs indirecto ---------------------------
// Enumera los caminos simples (sin repetir nodo) desde un factor hasta la
// diana y multiplica los porcentajes a lo largo de cada uno. Un camino de
// dos nodos es efecto DIRECTO; cualquiera más largo es INDIRECTO.
//
// "Sin repetir nodo" no es un detalle: sin eso, un bucle dolor → miedo →
// dolor haría que el recorrido no terminase nunca. Los bucles se miran
// aparte, en detectarBucles().
const PROFUNDIDAD_MAXIMA = 5

export function caminosHasta(red, origenId, dianaId, maxProf = PROFUNDIDAD_MAXIMA) {
  if (!origenId || !dianaId || origenId === dianaId) return []
  const efectos = mapaEfectos(red)
  const encontrados = []

  function recorre(actual, visitados, peso, camino) {
    if (camino.length > maxProf) return
    ;(efectos[actual] || []).forEach(({ efecto, peso: pct }) => {
      if (visitados.has(efecto)) return
      const pesoNuevo = peso * (pct / 100)
      const caminoNuevo = [...camino, efecto]
      if (efecto === dianaId) {
        // Llegamos: no se sigue más allá de la diana (lo que la diana cause
        // a su vez es otra historia, no es un camino hacia ella).
        encontrados.push({ camino: caminoNuevo, peso: pesoNuevo })
        return
      }
      visitados.add(efecto)
      recorre(efecto, visitados, pesoNuevo, caminoNuevo)
      visitados.delete(efecto)
    })
  }

  recorre(origenId, new Set([origenId]), 1, [origenId])
  return encontrados
}

// Para cada nodo (menos la propia diana), cuánto le llega a la diana por vía
// directa y cuánto por vías indirectas, en % (0-100). El total puede pasar de
// 100 si un factor llega por varios caminos a la vez; no es un reparto de
// probabilidad, es "cuánta influencia acumula".
export function efectoSobre(red, dianaId) {
  return nodosDe(red)
    .filter((n) => n.id !== dianaId)
    .map((n) => {
      const caminos = caminosHasta(red, n.id, dianaId)
      const directos = caminos.filter((c) => c.camino.length === 2)
      const indirectos = caminos.filter((c) => c.camino.length > 2)
      const suma = (lista) => Math.round(lista.reduce((t, c) => t + c.peso, 0) * 1000) / 10
      return {
        id: n.id,
        nodo: n,
        directo: suma(directos),
        indirecto: suma(indirectos),
        total: suma(caminos),
        caminos: indirectos.sort((a, b) => b.peso - a.peso),
      }
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
}

// --- Bucles ----------------------------------------------------------------
// Ciclos del grafo: dolor → kinesiofobia → menos actividad → menos tolerancia
// a la carga → dolor. Clínicamente es lo más jugoso de toda la red, porque un
// bucle se mantiene solo: mientras siga cerrado, quitar intensidad al cuadro
// no basta. Basta con romperlo por su eslabón más débil o más accesible.
export function detectarBucles(red) {
  const efectos = mapaEfectos(red)
  const encontrados = []
  const vistos = new Set()

  function registra(ciclo) {
    // Un mismo ciclo se descubre una vez por cada nodo por el que se empiece.
    // Se normaliza rotándolo para que empiece siempre por el id menor, y así
    // se cuenta una sola vez.
    const menor = ciclo.indexOf([...ciclo].sort()[0])
    const normalizado = [...ciclo.slice(menor), ...ciclo.slice(0, menor)]
    const clave = normalizado.join('→')
    if (vistos.has(clave)) return
    vistos.add(clave)
    const peso = normalizado.reduce((t, id, i) => {
      const siguiente = normalizado[(i + 1) % normalizado.length]
      const salida = (efectos[id] || []).find((e) => e.efecto === siguiente)
      return t * ((salida?.peso || 0) / 100)
    }, 1)
    encontrados.push({ ciclo: normalizado, peso: Math.round(peso * 1000) / 10 })
  }

  function recorre(actual, camino) {
    if (camino.length > PROFUNDIDAD_MAXIMA) return
    ;(efectos[actual] || []).forEach(({ efecto }) => {
      const desde = camino.indexOf(efecto)
      if (desde !== -1) {
        registra(camino.slice(desde))
        return
      }
      recorre(efecto, [...camino, efecto])
    })
  }

  nodosDe(red).forEach((n) => recorre(n.id, [n.id]))
  return encontrados.sort((a, b) => b.peso - a.peso)
}

// --- Prioridades -----------------------------------------------------------
// El ranking del paso 3 del Clinical Compass: por dónde empezar. Ordena por
// centralidad y separa lo que se puede tocar de lo que no. Los no
// modificables NO se esconden: explican el cuadro y sirven para ajustar
// expectativas con el cliente, solo que no son candidatos a objetivo.
export function prioridades(red, dianaId = null) {
  const diana = dianaId || dianasDe(red)[0]?.id || null
  const efectos = diana ? efectoSobre(red, diana) : []
  const porId = Object.fromEntries(efectos.map((e) => [e.id, e]))

  const lista = centralidades(red)
    .filter((c) => c.id !== diana)
    .map((c) => ({
      ...c,
      modificable: esModificable(c.nodo),
      directo: porId[c.id]?.directo || 0,
      indirecto: porId[c.id]?.indirecto || 0,
      sobreLaDiana: porId[c.id]?.total || 0,
    }))

  return {
    diana,
    modificables: lista.filter((x) => x.modificable),
    noModificables: lista.filter((x) => !x.modificable),
  }
}

// --- Validación ------------------------------------------------------------
// Avisos para el formulario. Ninguno bloquea el guardado: una red a medias
// sigue siendo más útil que ninguna, y el técnico puede querer dejarla
// abierta para terminarla con el cliente en la siguiente sesión. Son
// 'aviso' (conviene revisarlo) o 'info' (solo para que lo sepas).
export function validarRed(red) {
  const avisos = []
  const nodos = nodosDe(red)
  if (nodos.length === 0) return avisos

  const dianas = dianasDe(red)
  if (dianas.length === 0) {
    avisos.push({ nivel: 'aviso', texto: 'No hay ningún problema diana marcado: sin él no se puede calcular qué le afecta y por qué camino.' })
  }

  if (nodos.length < MIN_NODOS) {
    avisos.push({ nivel: 'info', texto: `Solo hay ${nodos.length} factores. Por debajo de ${MIN_NODOS} la red se queda corta y suele salir un único culpable.` })
  }
  if (nodos.length > MAX_NODOS) {
    avisos.push({ nivel: 'info', texto: `Hay ${nodos.length} factores. Por encima de ${MAX_NODOS} cuesta mucho repartir los porcentajes y la red se vuelve ilegible.` })
  }

  nodos.forEach((n) => {
    if (!Number(n.gravedad)) {
      avisos.push({ nivel: 'aviso', nodoId: n.id, texto: `"${etiquetaNodo(n)}" está sin puntuar de gravedad.` })
    }
    // El reparto sí incluye el "no lo sé": para cuadrar a 100 cuenta.
    const reparto = (red?.causas || {})[n.id] || {}
    const suma = sumaReparto(reparto)
    if (Object.keys(reparto).length > 0 && suma !== 100) {
      avisos.push({ nivel: 'aviso', nodoId: n.id, texto: `Las causas de "${etiquetaNodo(n)}" suman ${suma}% en vez de 100%.` })
    }
    if (Object.keys(causasDe(red, n.id)).length > MAX_CAUSAS) {
      avisos.push({ nivel: 'aviso', nodoId: n.id, texto: `"${etiquetaNodo(n)}" tiene más de ${MAX_CAUSAS} causas. El tope obliga a priorizar: si todo causa todo, la red no dice nada.` })
    }
  })

  // Nodos sueltos: elegidos pero sin ninguna flecha ni de entrada ni de
  // salida. No es un error, pero casi siempre es que falta terminar.
  const efectos = mapaEfectos(red)
  nodos.forEach((n) => {
    const sale = (efectos[n.id] || []).length > 0
    const entra = Object.keys(causasDe(red, n.id)).length > 0
    if (!sale && !entra) {
      avisos.push({ nivel: 'info', nodoId: n.id, texto: `"${etiquetaNodo(n)}" está suelto: ni causa nada ni nada lo causa.` })
    }
  })

  return avisos
}

// Resumen corto para cabeceras y badges, sin tener que recalcular la red
// entera en el sitio donde se pinta.
export function resumenRed(red) {
  const nodos = nodosDe(red)
  if (nodos.length === 0) return { vacia: true, nodos: 0, avisos: 0, principal: null, bucles: 0 }
  const ranking = prioridades(red)
  const principal = ranking.modificables[0] || null
  return {
    vacia: false,
    nodos: nodos.length,
    avisos: validarRed(red).filter((a) => a.nivel === 'aviso').length,
    bucles: detectarBucles(red).length,
    principal: principal ? { id: principal.id, label: etiquetaNodo(principal.nodo), proporcion: principal.proporcion } : null,
  }
}

// --- Edición de la red -----------------------------------------------------
// Todas son puras: reciben la red y devuelven una nueva. El componente NO
// toca el objeto a mano. Así la consistencia del grafo (referencias que
// quedan colgando al quitar un nodo, repartos que no cuadran a 100) se
// garantiza en un solo sitio y se puede probar sin montar la interfaz.

export function tieneNodo(red, id) {
  return nodosDe(red).some((n) => n.id === id)
}

// Reparte 100 a partes iguales entre unos ids, dándole el resto al último
// para que la suma sea exactamente 100 y no 99 por el redondeo.
function repartirEquitativo(ids) {
  const out = {}
  if (ids.length === 0) return out
  const base = Math.floor(100 / ids.length)
  ids.forEach((id, i) => {
    out[id] = i === ids.length - 1 ? 100 - base * (ids.length - 1) : base
  })
  return out
}

// Recalcula el "otras causas / no lo sé" como lo que sobra hasta 100. Nunca
// se pide a mano: es siempre el resto, para que el reparto cuadre solo y el
// técnico solo tenga que decir lo que SÍ sabe.
function conDesconocido(reparto) {
  const explicitas = {}
  Object.entries(reparto || {}).forEach(([id, pct]) => {
    if (id !== CLAVE_DESCONOCIDO && Number(pct) > 0) explicitas[id] = Number(pct)
  })
  const resto = 100 - sumaReparto(explicitas)
  if (Object.keys(explicitas).length === 0) return {}
  return resto > 0 ? { ...explicitas, [CLAVE_DESCONOCIDO]: resto } : explicitas
}

export function anadirNodo(red, factorId) {
  const f = factorInfo(factorId)
  if (!f || tieneNodo(red, factorId)) return red
  return { ...red, nodos: [...nodosDe(red), { id: factorId, eje: f.eje, gravedad: 0 }] }
}

// Quitar un nodo se lleva por delante TODAS las flechas que lo tocan: las que
// salen de él (su entrada en `causas`) y las que llegan a él (donde aparece
// como causa de otro). Si no, quedarían referencias a un nodo inexistente y
// los cálculos contarían caminos que ya no existen.
export function quitarNodo(red, nodoId) {
  const causas = {}
  Object.entries(red?.causas || {}).forEach(([efectoId, reparto]) => {
    if (efectoId === nodoId) return
    const limpio = { ...reparto }
    delete limpio[nodoId]
    causas[efectoId] = conDesconocido(limpio)
  })
  return { ...red, nodos: nodosDe(red).filter((n) => n.id !== nodoId), causas }
}

export function alternarNodo(red, factorId) {
  return tieneNodo(red, factorId) ? quitarNodo(red, factorId) : anadirNodo(red, factorId)
}

export function anadirNodoOtro(red, eje, etiqueta, modificable = true) {
  const texto = String(etiqueta || '').trim()
  if (!texto) return red
  let id = nuevoIdOtro(texto)
  // Dos "otros" con el mismo nombre darían el mismo id y se pisarían.
  if (tieneNodo(red, id)) id = `${id}-${nodosDe(red).length + 1}`
  return { ...red, nodos: [...nodosDe(red), { id, eje, etiqueta: texto, gravedad: 0, modificable }] }
}

export function fijarGravedad(red, nodoId, valor) {
  const g = Math.max(0, Math.min(100, Math.round(Number(valor) || 0)))
  return { ...red, nodos: nodosDe(red).map((n) => (n.id === nodoId ? { ...n, gravedad: g } : n)) }
}

// Marca un nodo como problema diana y desmarca el resto. Volver a pulsar el
// que ya lo es lo deja sin diana (mismo gesto que los botones del
// diagnóstico diferencial: repulsar deshace).
export function fijarDiana(red, nodoId) {
  const yaEra = nodoPorId(red, nodoId)?.diana === true
  return {
    ...red,
    nodos: nodosDe(red).map((n) => {
      if (n.id !== nodoId) return { ...n, diana: false }
      return { ...n, diana: !yaEra }
    }),
  }
}

// Añade o quita una causa. Al añadir se reparte 100 a partes iguales entre
// las que haya: con una causa queda al 100%, con dos a 50/50. A partir de
// ahí el técnico afina y lo que baje se va al "no lo sé". Es más rápido que
// empezar todo a cero, que es el caso raro.
export function alternarCausa(red, efectoId, causaId) {
  if (efectoId === causaId) return red // nada se causa a sí mismo
  const actuales = Object.keys(causasDe(red, efectoId))
  const ya = actuales.includes(causaId)
  if (!ya && actuales.length >= MAX_CAUSAS) return red
  const ids = ya ? actuales.filter((id) => id !== causaId) : [...actuales, causaId]
  return { ...red, causas: { ...(red?.causas || {}), [efectoId]: repartirEquitativo(ids) } }
}

// Fija el peso de una causa manteniendo el reparto cuadrado a 100.
//
// La regla al SUBIR una causa: el hueco que necesita sale primero del "no lo
// sé" (que para eso es el colchón) y, solo si ese se agota, se les quita
// proporcionalmente a las demás causas. Al BAJAR, lo que sobra vuelve al
// "no lo sé".
//
// La primera versión hacía otra cosa —limitar el valor a lo que quedase
// libre— y era inservible: con tres causas repartidas a 33/33/34 el 100% ya
// está ocupado, así que cualquier intento de subir una se quedaba clavado sin
// explicar por qué. Dejar 60/30/10 obligaba a bajar dos antes de subir la
// tercera. Con la cesión proporcional, subir siempre funciona.
export function fijarPesoCausa(red, efectoId, causaId, pct) {
  const actuales = causasDe(red, efectoId)
  if (!(causaId in actuales)) return red

  const valor = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)))
  const otras = { ...actuales }
  delete otras[causaId]

  const sumaOtras = sumaReparto(otras)
  const disponible = 100 - valor
  let ajustadas = otras

  if (sumaOtras > disponible && sumaOtras > 0) {
    const ids = Object.keys(otras)
    const factor = disponible / sumaOtras
    ajustadas = {}
    ids.forEach((id) => { ajustadas[id] = Math.round(otras[id] * factor) })
    // El redondeo puede dejar la suma en 99 o 101: el descuadre se le carga
    // a la causa más grande, que es donde menos se nota.
    const desfase = disponible - sumaReparto(ajustadas)
    if (desfase !== 0 && ids.length > 0) {
      const mayor = ids.reduce((a, b) => (ajustadas[a] >= ajustadas[b] ? a : b))
      ajustadas[mayor] = Math.max(0, ajustadas[mayor] + desfase)
    }
  }

  return { ...red, causas: { ...(red?.causas || {}), [efectoId]: conDesconocido({ ...ajustadas, [causaId]: valor }) } }
}

export function fijarNotas(red, notas) {
  return { ...red, notas: notas || '' }
}

// Cuánto queda sin explicar en un nodo (el "no lo sé"), para poder enseñarlo
// en el formulario sin que el componente tenga que calcularlo.
export function desconocidoDe(red, nodoId) {
  const reparto = (red?.causas || {})[nodoId] || {}
  return Number(reparto[CLAVE_DESCONOCIDO]) || 0
}
