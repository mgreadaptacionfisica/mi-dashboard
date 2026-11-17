// Ritmo de publicación y reparto automático de ideas del calendario de contenido.
//
// Ritmo acordado con Raúl (nov 2026):
// - YouTube: 2 vídeos largos por semana (martes y viernes).
// - Cada vídeo largo da 3 cortes verticales. Cada corte se sube DOS veces: como
//   Short en YouTube y como Reel en Instagram (es el mismo vídeo, una sola edición).
//   Los cortes salen el día del largo, el siguiente y el otro (+0, +1, +2), así
//   martes→mar/mié/jue y viernes→vie/sáb/dom: cada día hay Short y Reel. El lunes
//   queda libre y se rellena con una idea propia de Reel/Short.
// - Instagram: historias cada día, con un objetivo por día (SEMANA_HISTORIAS).
//
// Aquí solo hay funciones puras (sin Supabase ni React) para poder razonar el
// reparto y enseñar una vista previa antes de guardar nada.

export const FORMATO_LARGO = 'Vídeo largo'
export const FORMATO_CORTE = 'Corte (Short + Reel)'
export const FORMATO_HISTORIAS = 'Historias'

// getDay(): 0 domingo … 6 sábado
export const DIAS_LARGO = [2, 5] // martes y viernes
export const NUM_CORTES = 3

// Formatos que ocupan el hueco del "vídeo vertical del día" (Reel + Short).
const FORMATOS_VERTICALES = ['Reel', 'Vídeo corto', 'Carrusel', 'Foto', FORMATO_CORTE]

// Semana de historias (nov 2026). Cada día tiene un OBJETIVO y una forma de
// repartirlas; la idea concreta la pone Raúl ese día. Criterios, de lo que
// recomiendan las guías y estudios de 2025-2026 (Social Insider, Dash Social,
// Shopify, Metricool, Glofox):
// - 3-5 historias al día: la media aconsejada está en 2-5 y la retención baja
//   cuantas más pantallas se suben seguidas.
// - La gente se va sobre todo en la 1.ª y la última pantalla: la 1.ª tiene que
//   enganchar (vídeo y texto grande), y la última pide algo (sticker o DM).
// - El vídeo retiene más que la foto.
// - Episodios fijos por día, «como un canal de TV», y cada día alineado con un
//   objetivo: conexión, autoridad, tráfico o conversión.
// - En salud y fitness la decisión se toma por mensaje privado: casi todas
//   las secuencias terminan invitando a escribir.
// getDay(): 0 domingo … 6 sábado. `cuantas` = historias de la secuencia.
export const SEMANA_HISTORIAS = {
  1: {
    dia: 'Lunes',
    objetivo: 'Conexión',
    para: 'Abrir la semana y recoger dudas (son el material del jueves).',
    cuantas: '3-4',
    reparto: [
      'Por la mañana · 1-2 historias: tú en cámara contando qué vas a hacer esta semana o algo tuyo.',
      'Mediodía · 1: un dato o una situación con la que tu cliente se identifique.',
      'Tarde-noche · 1: caja de preguntas («¿qué te duele o qué quieres saber?»).',
    ],
  },
  2: {
    dia: 'Martes',
    objetivo: 'Tráfico al vídeo de YouTube',
    para: 'Llevar gente al vídeo largo que sale hoy.',
    cuantas: '3',
    reparto: [
      'Cuando sale el vídeo · 1: el problema que resuelve, en una frase y en vídeo.',
      '1: un trozo de 10-15 s del vídeo (lo más potente).',
      '1: sticker de enlace al vídeo + encuesta («¿te pasa?»).',
    ],
  },
  3: {
    dia: 'Miércoles',
    objetivo: 'Autoridad',
    para: 'Enseñar cómo trabajas y por qué sabes lo que haces.',
    cuantas: '4',
    reparto: [
      'Mañana o mediodía · secuencia de 3 seguidas: detrás de cámaras de una sesión o de cómo decides algo (qué ves → qué haces → por qué).',
      'Noche · 1: la conclusión + «si te pasa, escríbeme».',
    ],
  },
  4: {
    dia: 'Jueves',
    objetivo: 'Educación e interacción',
    para: 'Responder las dudas del lunes: demuestra que escuchas y resuelve objeciones.',
    cuantas: '3-5',
    reparto: [
      'A lo largo del día · 1 pregunta por historia, respondida en vídeo (2-4 en total).',
      'Última · 1: «¿te ha quedado alguna duda? Respóndeme aquí».',
    ],
  },
  5: {
    dia: 'Viernes',
    objetivo: 'Prueba social + tráfico',
    para: 'Que vean resultados reales y llevar al vídeo largo de hoy.',
    cuantas: '4',
    reparto: [
      'Mañana · 2: el caso o resultado de un cliente (antes → qué hicimos → ahora), o un mensaje suyo.',
      'Cuando sale el vídeo · 1: avance del vídeo de hoy.',
      '1: sticker de enlace al vídeo.',
    ],
  },
  6: {
    dia: 'Sábado',
    objetivo: 'Conversión',
    para: 'Convertir seguidores en contactos con un leadmagnet o en llamadas.',
    cuantas: '3',
    reparto: [
      'Mañana · 1: encuesta sobre un problema («¿te duele el hombro al hacer press?»).',
      '1: por qué pasa, en 15 s, y que tienes algo que lo explica.',
      '1: CTA claro, con enlace al test o recurso, o «escríbeme PALABRA y te lo mando».',
    ],
  },
  0: {
    dia: 'Domingo',
    objetivo: 'Conexión personal',
    para: 'Humanizar la cuenta: que te conozcan fuera del trabajo. Día ligero.',
    cuantas: '2-3',
    reparto: [
      'Cuando quieras · 1-2: algo personal (tu entreno, una reflexión de la semana).',
      'Noche · 1: lo que viene la semana que viene + recordatorio de los vídeos de la semana.',
    ],
  },
}

export function descripcionHistorias(dia) {
  const h = SEMANA_HISTORIAS[dia]
  return `Objetivo: ${h.objetivo}. ${h.para}\nCuántas: ${h.cuantas} historias.\n${h.reparto.map((r) => `• ${r}`).join('\n')}`
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function isoADate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function dateAIso(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function sumarDias(iso, dias) {
  const d = isoADate(iso)
  d.setDate(d.getDate() + dias)
  return dateAIso(d)
}

export function diferenciaDias(desdeIso, hastaIso) {
  return Math.round((isoADate(hastaIso) - isoADate(desdeIso)) / 86400000)
}

// A qué hueco del día pertenece una idea: 'largo', 'vertical', 'historias' o
// null (formato sin decidir / no encaja en el ritmo).
export function huecoDeIdea(idea) {
  if (!idea) return null
  if (idea.formato === FORMATO_LARGO) return 'largo'
  if (idea.formato === FORMATO_HISTORIAS) return 'historias'
  if (idea.origenId || FORMATOS_VERTICALES.includes(idea.formato)) return 'vertical'
  return null
}

// Qué está cubierto un día: YouTube (largo o Short), Instagram (Reel) e historias.
export function coberturaDia(ideasDia = []) {
  const cob = { youtube: false, instagram: false, historias: false }
  ideasDia.forEach((i) => {
    const hueco = huecoDeIdea(i)
    const redes = i.redes || []
    if (hueco === 'historias') cob.historias = true
    if (hueco === 'largo' || (hueco === 'vertical' && redes.includes('YouTube'))) cob.youtube = true
    if (hueco === 'vertical' && (redes.length === 0 || redes.includes('Instagram'))) cob.instagram = true
  })
  return cob
}

// Los cortes de un vídeo largo. Id determinista (corte-<id largo>-<n>) para no
// duplicarlos si se pulsa dos veces.
export function crearCortes(largo, num = NUM_CORTES) {
  return Array.from({ length: num }, (_, k) => ({
    id: `corte-${largo.id}-${k + 1}`,
    fecha: largo.fecha ? sumarDias(largo.fecha, k) : '',
    titulo: `✂️ Corte ${k + 1} · ${largo.titulo || 'Vídeo largo'}`,
    descripcion: `Corte vertical del vídeo largo «${largo.titulo || ''}». Se sube como Short en YouTube y como Reel en Instagram.`,
    redes: ['YouTube', 'Instagram'],
    formato: FORMATO_CORTE,
    editores: [...(largo.editores || [])],
    portadaLista: false,
    estado: 'Idea',
    origenId: largo.id,
  }))
}

function tituloHistorias(fechaIso, largoDelDia) {
  const h = SEMANA_HISTORIAS[isoADate(fechaIso).getDay()]
  return `⭕ Historias · ${h.objetivo}${largoDelDia ? ` («${largoDelDia.titulo}»)` : ''}`
}

// Orden en el que salen las ideas sin fecha: por id, así las nuevas
// (contenido-<timestamp>) van antes que el banco antiguo (idea-post-NN), y
// cada grupo en el orden en que se creó.
export function ordenarBanco(a, b) {
  return String(a.id).localeCompare(String(b.id), 'es', { numeric: true })
}

// Reparte las ideas sin fecha en los huecos libres entre `desde` y `semanas`
// semanas después. Devuelve el plan (no toca nada):
//   [{ accion: 'asignar' | 'nuevo', hueco: 'largo'|'vertical'|'corte'|'historias', idea }]
// - Una idea con formato elegido solo va a su hueco; una "sin decidir" rellena
//   el primer hueco de largo o vertical que quede libre.
// - Al colocar un largo se crean sus 3 cortes (si no los tenía).
// - Si `rellenarHistorias`, los días sin historias reciben una entrada nueva con
//   la temática del día.
export function distribuirIdeas({ ideas = [], desde, semanas = 4, rellenarHistorias = true }) {
  // Una sola cola en orden: para cada hueco se coge la primera idea que encaje
  // (su formato o «sin decidir»). Así las ideas nuevas salen antes que el banco
  // antiguo aunque no tengan formato.
  const cola = ideas.filter((i) => !i.fecha && !i.origenId).sort(ordenarBanco)
  const sacar = (hueco, aceptaSinDecidir = true) => {
    const idx = cola.findIndex((i) => {
      const h = huecoDeIdea(i)
      return h === hueco || (aceptaSinDecidir && h === null)
    })
    return idx === -1 ? null : cola.splice(idx, 1)[0]
  }

  // Ocupación de cada día con lo que ya está programado.
  const ocupacion = {}
  const occ = (fecha) => {
    ocupacion[fecha] = ocupacion[fecha] || { largo: null, vertical: false, historias: false }
    return ocupacion[fecha]
  }
  const marcar = (idea, hueco) => {
    if (!idea.fecha) return
    const o = occ(idea.fecha)
    if (hueco === 'largo') o.largo = o.largo || idea
    if (hueco === 'vertical' || hueco === 'corte') o.vertical = true
    if (hueco === 'historias') o.historias = true
  }
  ideas.filter((i) => i.fecha).forEach((i) => marcar(i, huecoDeIdea(i)))

  const plan = []
  const anadir = (accion, hueco, idea) => {
    plan.push({ accion, hueco, idea })
    marcar(idea, hueco)
  }
  const conRedes = (idea, porDefecto) => ((idea.redes || []).length ? idea.redes : porDefecto)

  const totalDias = Math.max(1, Number(semanas) || 1) * 7
  for (let d = 0; d < totalDias; d += 1) {
    const fecha = sumarDias(desde, d)
    const dia = isoADate(fecha).getDay()

    if (DIAS_LARGO.includes(dia) && !occ(fecha).largo) {
      const idea = sacar('largo')
      if (idea) {
        const largo = { ...idea, fecha, formato: FORMATO_LARGO, redes: conRedes(idea, ['YouTube']) }
        anadir('asignar', 'largo', largo)
        const yaTieneCortes = ideas.some((i) => i.origenId === idea.id)
        if (!yaTieneCortes) crearCortes(largo).forEach((c) => anadir('nuevo', 'corte', c))
      }
    }

    if (!occ(fecha).vertical) {
      const idea = sacar('vertical')
      if (idea) {
        anadir('asignar', 'vertical', {
          ...idea,
          fecha,
          formato: idea.formato || 'Reel',
          redes: conRedes(idea, ['Instagram', 'YouTube']),
        })
      }
    }

    if (!occ(fecha).historias) {
      const idea = sacar('historias', false)
      if (idea) {
        anadir('asignar', 'historias', { ...idea, fecha, redes: conRedes(idea, ['Instagram']) })
      } else if (rellenarHistorias) {
        anadir('nuevo', 'historias', {
          id: `historias-${fecha}`,
          fecha,
          titulo: tituloHistorias(fecha, occ(fecha).largo),
          descripcion: descripcionHistorias(isoADate(fecha).getDay()),
          redes: ['Instagram'],
          formato: FORMATO_HISTORIAS,
          editores: [],
          portadaLista: false,
          estado: 'Idea',
        })
      }
    }
  }

  plan.sort((a, b) => a.idea.fecha.localeCompare(b.idea.fecha))
  return { plan, sobrantes: cola.length }
}
