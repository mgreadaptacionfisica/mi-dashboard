import { supabase } from '../supabaseClient'

// Enlaces de interés: zona privada del admin (ver supabase-sql/50_enlaces_interes.sql)
// para guardar enlaces que se usan a menudo (ej. el dashboard de un cliente)
// y copiarlos rápido para pasarlos por WhatsApp o donde haga falta.
// A diferencia de "manuales", aquí ni el select es público: la RLS solo
// deja pasar al rol admin, así que si algún otro rol llegase a llamar a
// fetchEnlacesInteres() simplemente recibiría una lista vacía.
function fromRow(row) {
  return {
    id: row.id,
    titulo: row.titulo || '',
    enlace: row.enlace || '',
  }
}

function toRow(entrada) {
  const row = {}
  if ('id' in entrada) row.id = entrada.id
  if ('titulo' in entrada) row.titulo = entrada.titulo
  if ('enlace' in entrada) row.enlace = entrada.enlace
  return row
}

export async function fetchEnlacesInteres() {
  if (!supabase) return null
  const { data, error } = await supabase.from('enlaces_interes').select('*').order('created_at', { ascending: true })
  if (error) {
    console.error('[enlaces_interes] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertEnlaceInteresRemote(entrada) {
  if (!supabase) return
  const { error } = await supabase.from('enlaces_interes').insert(toRow(entrada))
  if (error) console.error('[enlaces_interes] insert error:', error.message)
}

export async function updateEnlaceInteresRemote(id, patch) {
  if (!supabase || !id) return
  const row = toRow(patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('enlaces_interes').update(row).eq('id', id)
  if (error) console.error('[enlaces_interes] update error:', error.message)
}

export async function deleteEnlaceInteresRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('enlaces_interes').delete().eq('id', id)
  if (error) console.error('[enlaces_interes] delete error:', error.message)
}
