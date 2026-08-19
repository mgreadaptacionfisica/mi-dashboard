import { supabase } from '../supabaseClient'
import { avisaErrorGuardado } from '../avisosGuardado'

// Pasos de cada proyecto (ver supabase-sql/55_proyectos.sql). Tabla aparte
// de `proyectos` porque se marcan/desmarcan de uno en uno y así cada toque
// del checkbox es un update de una fila, no de un JSON entero.
//
// El % de avance del proyecto sale de contar estos pasos (hechos ÷ totales)
// en la UI — no se guarda en ningún sitio.
function fromRow(row) {
  return {
    id: row.id,
    proyectoId: row.proyecto_id,
    texto: row.texto || '',
    hecho: !!row.hecho,
    prioridad: row.prioridad || null,
    fecha: row.fecha || null,
    orden: typeof row.orden === 'number' ? row.orden : 0,
  }
}

function toRow(entrada) {
  const row = {}
  if ('id' in entrada) row.id = entrada.id
  if ('proyectoId' in entrada) row.proyecto_id = entrada.proyectoId
  if ('texto' in entrada) row.texto = entrada.texto
  if ('hecho' in entrada) row.hecho = entrada.hecho
  if ('prioridad' in entrada) row.prioridad = entrada.prioridad || null
  if ('fecha' in entrada) row.fecha = entrada.fecha || null
  if ('orden' in entrada) row.orden = entrada.orden
  return row
}

export async function fetchProyectoPasos() {
  if (!supabase) return null
  const { data, error } = await supabase.from('proyecto_pasos').select('*').order('orden', { ascending: true })
  if (error) {
    console.error('[proyectoPasos] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertProyectoPasoRemote(entrada) {
  if (!supabase) return
  const { error } = await supabase.from('proyecto_pasos').insert(toRow(entrada))
  if (error) avisaErrorGuardado('[proyectoPasos] insert error:', error)
}

export async function updateProyectoPasoRemote(id, patch) {
  if (!supabase || !id) return
  const row = toRow(patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('proyecto_pasos').update(row).eq('id', id)
  if (error) avisaErrorGuardado('[proyectoPasos] update error:', error)
}

export async function deleteProyectoPasoRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('proyecto_pasos').delete().eq('id', id)
  if (error) avisaErrorGuardado('[proyectoPasos] delete error:', error)
}
