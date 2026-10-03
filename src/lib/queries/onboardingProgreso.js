import { supabase } from '../supabaseClient'
import { avisaErrorGuardado } from '../avisosGuardado'

function fromRow(row) {
  return {
    id: row.id,
    clienteNombre: row.cliente_nombre || '',
    variante: row.variante || '',
    paso: row.paso,
    hecho: row.hecho !== false,
    por: row.por || '',
    creadoEn: row.creado_en,
  }
}

// Orden ASCENDENTE a propósito: el estado de cada paso es su último evento,
// así que recorrerlos en orden y pisar es lo más sencillo.
export async function fetchOnboardingProgreso() {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('onboarding_progreso')
    .select('*')
    .order('creado_en', { ascending: true })
  if (error) {
    console.error('[onboardingProgreso] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

// Desde la ruta PÚBLICA, sin login. Sin .select() (anon solo inserta,
// migración 63) y sin avisar al cliente si falla: es un dato para nosotros,
// su progreso en pantalla sigue funcionando igual con el localStorage.
export async function registrarPasoOnboarding({ clienteNombre, variante, paso, hecho }) {
  if (!supabase || !clienteNombre) return
  const { error } = await supabase.from('onboarding_progreso').insert({
    id: `onb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    cliente_nombre: clienteNombre,
    variante,
    paso,
    hecho,
  })
  if (error) console.error('[onboardingProgreso] insert público error:', error.message)
}

// Desde el panel (admin): "ya le he escrito / grupo creado".
export async function marcarContactadoOnboarding(evento) {
  if (!supabase) return
  const { error } = await supabase.from('onboarding_progreso').insert({
    id: evento.id,
    cliente_nombre: evento.clienteNombre,
    variante: evento.variante || null,
    paso: 'contactado',
    hecho: evento.hecho,
    por: evento.por || null,
  })
  if (error) avisaErrorGuardado('[onboardingProgreso] contactado error:', error)
}
