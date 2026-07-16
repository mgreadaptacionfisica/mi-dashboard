import { supabase } from '../supabaseClient'

function fromRow(row) {
  return {
    id: row.id,
    clienteNombre: row.cliente_nombre,
    fecha: row.fecha,
    fuerza: row.fuerza || {},
    dinamometria: row.dinamometria || {},
    pliometria: row.pliometria || {},
    fuerzaCervical: row.fuerza_cervical || {},
    movilidadHombro: row.movilidad_hombro || {},
    movilidadCervical: row.movilidad_cervical || {},
    movilidadEscapular: row.movilidad_escapular || {},
    movilidadGeneral: row.movilidad_general || {},
    spadi: row.spadi || {},
    tampa: row.tampa || {},
    notas: row.notas || '',
    dolorEnDeporte: row.dolor_en_deporte ?? null,
    fase: row.fase ?? null,
    objetivo: row.objetivo || '',
  }
}

function toRow(v) {
  return {
    id: v.id,
    cliente_nombre: v.clienteNombre,
    fecha: v.fecha,
    fuerza: v.fuerza || {},
    dinamometria: v.dinamometria || {},
    pliometria: v.pliometria || {},
    fuerza_cervical: v.fuerzaCervical || {},
    movilidad_hombro: v.movilidadHombro || {},
    movilidad_cervical: v.movilidadCervical || {},
    movilidad_escapular: v.movilidadEscapular || {},
    movilidad_general: v.movilidadGeneral || {},
    spadi: v.spadi || {},
    tampa: v.tampa || {},
    notas: v.notas || '',
    dolor_en_deporte: v.dolorEnDeporte ?? null,
    fase: v.fase ?? null,
    objetivo: v.objetivo || '',
  }
}

export async function fetchValoraciones() {
  if (!supabase) return null
  const { data, error } = await supabase.from('valoraciones_clientes').select('*').order('fecha', { ascending: true })
  if (error) {
    console.error('[valoracionesClientes] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertValoracionRemote(valoracion) {
  if (!supabase) return
  const { error } = await supabase.from('valoraciones_clientes').insert(toRow(valoracion))
  if (error) console.error('[valoracionesClientes] insert error:', error.message)
}

export async function updateValoracionRemote(id, patch) {
  if (!supabase || !id) return
  const row = toRow({ id, ...patch })
  delete row.id
  const { error } = await supabase.from('valoraciones_clientes').update(row).eq('id', id)
  if (error) console.error('[valoracionesClientes] update error:', error.message)
}

export async function deleteValoracionRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('valoraciones_clientes').delete().eq('id', id)
  if (error) console.error('[valoracionesClientes] delete error:', error.message)
}
