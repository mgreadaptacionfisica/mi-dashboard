// Ritmo de publicación y reparto automático de ideas del calendario de contenido.
//
// Ritmo acordado con Raúl (nov 2026):
// - YouTube: 2 vídeos largos por semana (martes y viernes).
// - Cada vídeo largo da 3 cortes verticales. Cada corte se sube DOS veces: como
//   Short en YouTube y como Reel en Instagram (es el mismo vídeo, una sola edición).
//   Los cortes salen el día del largo, el siguiente y el otro (+0, +1, +2), así
//   martes→mar/mié/jue y viernes→vie/sáb/dom: cada día hay Short y Reel. El lunes
//   queda libre y se rellena con una idea propia de Reel/Short.
// - Instagram: un bloque de historias cada día.
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

// Temática por defecto de las historias según el día de la semana. Los días de
// vídeo largo se sustituye por el avance de ese vídeo.
const TEMAS_HISTORIAS = {
  1: '❓ Caja de preguntas: ¿qué te duele o qué quieres saber?',
  2: '⭐ Resultado o testimonio de un cliente',
  3: '🏋️ Detrás de cámaras: un entreno o una sesión con cliente',
  4: '💬 Respuestas a la caja de preguntas del lunes',
  5: '⭐ Resultado o testimonio de un cliente',
  6: '📊 Encuesta o quiz sobre el tema de la semana',
  0: '🧠 Reflexión de la semana y recordatorio de los vídeos',
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

function temaHistorias(fechaIso, largoDelDia) {
  if (largoDelDia) return `🎬 Avance del vídeo de hoy: «${largoDelDia.titulo}» (con enlace)`
  return TEMAS_HISTORIAS[isoADate(fechaIso).getDay()]
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
          titulo: `⭕ Historias · ${temaHistorias(fecha, occ(fecha).largo)}`,
          descripcion: '',
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
