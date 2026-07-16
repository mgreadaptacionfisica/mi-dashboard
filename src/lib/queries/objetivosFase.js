import { supabase } from '../supabaseClient'

// Catálogo de objetivos por fase (ver supabase-sql/31_valoracion_v2.sql):
// mismo patrón CRUD que sops.js. Cualquier persona logueada puede leer (los
// técnicos eligen objetivos de aquí al confirmar la fase de un cliente en
// Valoración); el botón de editar solo se muestra en el panel a rol admin.
function fromRow(row) {
  return {
    id: row.id,
    fase: row.fase,
    texto: row.texto,
    orden: row.orden ?? 0,
    creadoEn: row.creado_en,
  }
}

function toRow(o) {
  return {
    id: o.id,
    fase: o.fase,
    texto: o.texto,
    orden: o.orden ?? 0,
    creado_en: o.creadoEn,
  }
}

export async function fetchObjetivosFase() {
  if (!supabase) return null
  const { data, error } = await supabase.from('objetivos_fase').select('*').order('fase', { ascending: true }).order('orden', { ascending: true })
  if (error) {
    console.error('[objetivosFase] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertObjetivoFaseRemote(objetivo) {
  if (!supabase) return
  const { error } = await supabase.from('objetivos_fase').insert(toRow(objetivo))
  if (error) console.error('[objetivosFase] insert error:', error.message)
}

export async function updateObjetivoFaseRemote(id, patch) {
  if (!supabase || !id) return
  const row = toRow({ id, ...patch })
  delete row.id
  const { error } = await supabase.from('objetivos_fase').update(row).eq('id', id)
  if (error) console.error('[objetivosFase] update error:', error.message)
}

export async function deleteObjetivoFaseRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('objetivos_fase').delete().eq('id', id)
  if (error) console.error('[objetivosFase] delete error:', error.message)
}
