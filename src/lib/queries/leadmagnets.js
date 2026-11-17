import { supabase } from '../supabaseClient'
import { avisaErrorGuardado } from '../avisosGuardado'

// Contactos de los leadmagnets (migración 80). Las páginas públicas solo
// pueden llamar a la función `registrar_leadmagnet`; leer y tocar la tabla
// es solo para el equipo con sesión (Ventas → 🧲 Leadmagnets).

function fromRow(row) {
  return {
    id: row.id,
    creadoEn: row.creado_en,
    leadmagnet: row.leadmagnet,
    nombre: row.nombre || '',
    email: row.email || '',
    telefono: row.telefono || '',
    respuestas: row.respuestas || {},
    puntuacion: row.puntuacion,
    resultado: row.resultado || '',
    atribucion: row.atribucion || null,
    contactado: !!row.contactado,
    notas: row.notas || '',
  }
}

// Público. Devuelve true/false para que la página pueda avisar si falla
// (pero el resultado se enseña igualmente: no castigamos al visitante).
export async function registrarLeadmagnet(datos) {
  if (!supabase) return false
  const { error } = await supabase.rpc('registrar_leadmagnet', { datos })
  if (error) {
    console.error('[leadmagnets] registrar error:', error.message)
    return false
  }
  return true
}

export async function fetchLeadmagnetLeads() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('leadmagnet_leads')
    .select('*')
    .order('creado_en', { ascending: false })
    .limit(1000)
  if (error) {
    console.error('[leadmagnets] fetch error:', error.message)
    return []
  }
  return data.map(fromRow)
}

export async function updateLeadmagnetLead(id, patch) {
  if (!supabase || !id) return
  const row = {}
  if ('contactado' in patch) row.contactado = patch.contactado
  if ('notas' in patch) row.notas = patch.notas
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('leadmagnet_leads').update(row).eq('id', id)
  if (error) avisaErrorGuardado('[leadmagnets] update error:', error)
}

export async function deleteLeadmagnetLead(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('leadmagnet_leads').delete().eq('id', id)
  if (error) avisaErrorGuardado('[leadmagnets] delete error:', error)
}
