import { supabase } from '../supabaseClient'

// Archivo de manuales/documentos de la agencia (ver supabase-sql/20_manuales.sql):
// cualquier rol logueado puede leerlos, solo admin puede añadir/editar/borrar.
function fromRow(row) {
  return {
    id: row.id,
    titulo: row.titulo || '',
    descripcion: row.descripcion || '',
    enlace: row.enlace || '',
  }
}

function toRow(entrada) {
  const row = {}
  if ('id' in entrada) row.id = entrada.id
  if ('titulo' in entrada) row.titulo = entrada.titulo
  if ('descripcion' in entrada) row.descripcion = entrada.descripcion
  if ('enlace' in entrada) row.enlace = entrada.enlace
  return row
}

export async function fetchManuales() {
  if (!supabase) return null
  const { data, error } = await supabase.from('manuales').select('*').order('created_at', { ascending: true })
  if (error) {
    console.error('[manuales] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertManualRemote(entrada) {
  if (!supabase) return
  const { error } = await supabase.from('manuales').insert(toRow(entrada))
  if (error) console.error('[manuales] insert error:', error.message)
}

export async function updateManualRemote(id, patch) {
  if (!supabase || !id) return
  const row = toRow(patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('manuales').update(row).eq('id', id)
  if (error) console.error('[manuales] update error:', error.message)
}

export async function deleteManualRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('manuales').delete().eq('id', id)
  if (error) console.error('[manuales] delete error:', error.message)
}
