import { supabase } from '../supabaseClient'

// Check final del seguimiento semanal, POR CLIENTE (ver
// supabase-sql/45_revisiones_semanales_cliente.sql). Se identifica por
// (clienteNombre, semana): el técnico/admin lo marca desde el modal de
// Seguimiento de cada cliente cuando ya está todo revisado para esa
// semana concreta.
function fromRow(row) {
  return {
    id: row.id,
    clienteNombre: row.cliente_nombre,
    semana: row.semana,
    revisado: row.revisado ?? true,
    revisadoEn: row.revisado_en,
    revisadoPor: row.revisado_por || '',
  }
}

// Sin 'id': la tabla lo genera sola (uuid) — la identidad real del
// registro es (clienteNombre, semana), por eso el upsert de abajo usa
// onConflict sobre esas dos columnas.
function toRow(r) {
  return {
    cliente_nombre: r.clienteNombre,
    semana: r.semana,
    revisado: r.revisado ?? true,
    revisado_en: r.revisadoEn,
    revisado_por: r.revisadoPor || '',
  }
}

export async function fetchRevisionesSemanales() {
  if (!supabase) return null
  const { data, error } = await supabase.from('revisiones_semanales_cliente').select('*')
  if (error) {
    console.error('[revisionesSemanales] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function upsertRevisionSemanalRemote(revision) {
  if (!supabase) return
  const { error } = await supabase
    .from('revisiones_semanales_cliente')
    .upsert(toRow(revision), { onConflict: 'cliente_nombre,semana' })
  if (error) console.error('[revisionesSemanales] upsert error:', error.message)
}
