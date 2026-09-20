import { supabase } from '../supabaseClient'
import { avisaErrorGuardado } from '../avisosGuardado'

// Problemas del cliente (ver supabase-sql/60_problemas_cliente.sql): qué le
// ha pasado y qué hemos hecho para resolverlo. A diferencia de las notas de
// sesión y de los cambios de la semana, esto NO muere con la semana: un
// problema sigue abierto hasta que se resuelve.
function fromRow(row) {
  return {
    id: row.id,
    clienteNombre: row.cliente_nombre,
    problema: row.problema || '',
    detectadoEn: row.detectado_en,
    detectadoPor: row.detectado_por || '',
    origen: row.origen || 'manual',
    origenRef: row.origen_ref || null,
    estado: row.estado || 'abierto',
    acciones: row.acciones || [],
    resueltoEn: row.resuelto_en || null,
    resueltoPor: row.resuelto_por || '',
    resultado: row.resultado || '',
  }
}

function toRow(p) {
  return {
    id: p.id,
    cliente_nombre: p.clienteNombre,
    problema: p.problema || '',
    detectado_en: p.detectadoEn,
    detectado_por: p.detectadoPor || '',
    origen: p.origen || 'manual',
    origen_ref: p.origenRef || null,
    estado: p.estado || 'abierto',
    acciones: p.acciones || [],
    resuelto_en: p.resueltoEn || null,
    resuelto_por: p.resueltoPor || '',
    resultado: p.resultado || '',
  }
}

export async function fetchProblemasCliente() {
  if (!supabase) return null
  const { data, error } = await supabase.from('problemas_cliente').select('*')
  if (error) {
    console.error('[problemasCliente] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

// El id lo genera el navegador (texto, no uuid de la base): así el problema
// se pinta en pantalla al momento y cada guardado posterior —añadir una
// acción, resolverlo— es un upsert por ese mismo id, sin tener que pedir la
// fila de vuelta ni llevar dos identidades distintas.
export async function upsertProblemaClienteRemote(problema) {
  if (!supabase) return
  const { error } = await supabase.from('problemas_cliente').upsert(toRow(problema), { onConflict: 'id' })
  if (error) avisaErrorGuardado('[problemasCliente] upsert error:', error)
}

export async function deleteProblemaClienteRemote(id) {
  if (!supabase) return
  const { error } = await supabase.from('problemas_cliente').delete().eq('id', id)
  if (error) avisaErrorGuardado('[problemasCliente] delete error:', error)
}
