import { supabase } from '../supabaseClient'

// Objetivos por fase de CADA CLIENTE (ver supabase-sql/43_objetivos_cliente_fase.sql).
// Sustituye al catálogo compartido "objetivos_fase": aquí cada fila es un
// objetivo propio de un cliente concreto, agrupado por fase (1-4), que se
// va marcando como cumplido. Mismo patrón de permisos que el resto del
// panel: cualquier persona logueada puede leer/escribir.
function fromRow(row) {
  return {
    id: row.id,
    clienteNombre: row.cliente_nombre,
    fase: row.fase,
    texto: row.texto,
    cumplido: row.cumplido ?? false,
    cumplidoEn: row.cumplido_en ?? null,
    orden: row.orden ?? 0,
    creadoEn: row.creado_en,
  }
}

function toRow(o) {
  return {
    id: o.id,
    cliente_nombre: o.clienteNombre,
    fase: o.fase,
    texto: o.texto,
    cumplido: o.cumplido ?? false,
    cumplido_en: o.cumplidoEn ?? null,
    orden: o.orden ?? 0,
    creado_en: o.creadoEn,
  }
}

export async function fetchObjetivosClienteFase() {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('objetivos_cliente_fase')
    .select('*')
    .order('fase', { ascending: true })
    .order('orden', { ascending: true })
  if (error) {
    console.error('[objetivosClienteFase] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertObjetivoClienteFaseRemote(objetivo) {
  if (!supabase) return
  const { error } = await supabase.from('objetivos_cliente_fase').insert(toRow(objetivo))
  if (error) console.error('[objetivosClienteFase] insert error:', error.message)
}

export async function updateObjetivoClienteFaseRemote(id, patch) {
  if (!supabase || !id) return
  const row = toRow({ id, ...patch })
  delete row.id
  const { error } = await supabase.from('objetivos_cliente_fase').update(row).eq('id', id)
  if (error) console.error('[objetivosClienteFase] update error:', error.message)
}

export async function deleteObjetivoClienteFaseRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('objetivos_cliente_fase').delete().eq('id', id)
  if (error) console.error('[objetivosClienteFase] delete error:', error.message)
}
