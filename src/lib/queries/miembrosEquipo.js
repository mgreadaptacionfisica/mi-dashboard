import { supabase } from '../supabaseClient'

function fromRow(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    rol: row.rol || '',
    email: row.email || '',
    telefono: row.telefono || '',
    comision: row.comision,
    fijo: row.fijo,
    carpetaDrive: row.carpeta_drive || '',
  }
}

function toRow(persona, area) {
  return {
    id: persona.id,
    nombre: persona.nombre,
    rol: persona.rol || '',
    email: persona.email || '',
    telefono: persona.telefono || '',
    area,
    comision: persona.comision ?? null,
    fijo: persona.fijo ?? null,
    carpeta_drive: persona.carpetaDrive || '',
  }
}

// Devuelve { tecnico: [...], ventas: [...], contenido: [...] } (igual que team.js)
// o null si Supabase no responde, para poder hacer fallback al archivo estático.
export async function fetchMiembrosEquipo() {
  if (!supabase) return null
  const { data, error } = await supabase.from('miembros_equipo').select('*').order('created_at', { ascending: true })
  if (error) {
    console.error('[miembrosEquipo] fetch error:', error.message)
    return null
  }
  const team = { tecnico: [], ventas: [], contenido: [] }
  data.forEach((row) => {
    if (team[row.area]) team[row.area].push(fromRow(row))
  })
  return team
}

export async function insertMiembroRemote(persona, area) {
  if (!supabase) return
  const { error } = await supabase.from('miembros_equipo').insert(toRow(persona, area))
  if (error) console.error('[miembrosEquipo] insert error:', error.message)
}

export async function updateMiembroRemote(id, patch, area) {
  if (!supabase || !id) return
  const row = toRow({ id, ...patch }, area)
  delete row.id
  const { error } = await supabase.from('miembros_equipo').update(row).eq('id', id)
  if (error) console.error('[miembrosEquipo] update error:', error.message)
}

export async function deleteMiembroRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('miembros_equipo').delete().eq('id', id)
  if (error) console.error('[miembrosEquipo] delete error:', error.message)
}

export async function deleteAllMiembrosRemote() {
  if (!supabase) return
  const { error } = await supabase.from('miembros_equipo').delete().neq('id', '')
  if (error) console.error('[miembrosEquipo] deleteAll error:', error.message)
}
