import { supabase } from '../supabaseClient'

// Puente entre las filas de Supabase (snake_case) y la forma que ya usa
// el resto del panel (camelCase, igual que src/data/sops.js) para no tener
// que tocar los componentes que ya consumen "sops".
function fromRow(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    categoria: row.categoria,
    contenido: row.contenido,
    enlace: row.enlace,
    actualizadoEn: row.actualizado_en,
  }
}

function toRow(sop) {
  return {
    id: sop.id,
    titulo: sop.titulo,
    categoria: sop.categoria,
    contenido: sop.contenido,
    enlace: sop.enlace,
    actualizado_en: sop.actualizadoEn,
  }
}

// Devuelve null si Supabase no está configurado o falla (para poder hacer
// fallback a src/data/sops.js), o el array ya mapeado si todo va bien.
export async function fetchSops() {
  if (!supabase) return null
  const { data, error } = await supabase.from('sops').select('*').order('created_at', { ascending: true })
  if (error) {
    console.error('[sops] fetchSops error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertSopRemote(sop) {
  if (!supabase) return
  const { error } = await supabase.from('sops').insert(toRow(sop))
  if (error) console.error('[sops] insertSopRemote error:', error.message)
}

export async function updateSopRemote(id, patch) {
  if (!supabase) return
  const row = toRow({ id, ...patch })
  delete row.id
  const { error } = await supabase.from('sops').update(row).eq('id', id)
  if (error) console.error('[sops] updateSopRemote error:', error.message)
}

export async function deleteSopRemote(id) {
  if (!supabase) return
  const { error } = await supabase.from('sops').delete().eq('id', id)
  if (error) console.error('[sops] deleteSopRemote error:', error.message)
}
