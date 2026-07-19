import { supabase } from '../supabaseClient'

// Cierres manuales del "check final" del seguimiento semanal (ver
// supabase-sql/44_cierres_seguimiento_semanal.sql). Un cierre se identifica
// por (persona, semana): persona es el nombre del técnico, o 'ADMIN' para
// el cierre global del admin sobre todos los clientes del equipo.
function fromRow(row) {
  return {
    id: row.id,
    persona: row.persona,
    semana: row.semana,
    cerrado: row.cerrado ?? true,
    cerradoEn: row.cerrado_en,
    cerradoPor: row.cerrado_por || '',
  }
}

// Sin 'id': la tabla lo genera sola (uuid, igual que seguimientos.js) — la
// identidad real del registro es (persona, semana), por eso el upsert de
// abajo usa onConflict sobre esas dos columnas y deja que Postgres
// mantenga el id existente al actualizar.
function toRow(c) {
  return {
    persona: c.persona,
    semana: c.semana,
    cerrado: c.cerrado ?? true,
    cerrado_en: c.cerradoEn,
    cerrado_por: c.cerradoPor || '',
  }
}

export async function fetchCierresSeguimiento() {
  if (!supabase) return null
  const { data, error } = await supabase.from('cierres_seguimiento_semanal').select('*')
  if (error) {
    console.error('[cierresSeguimiento] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

// Se identifica por (persona, semana) — mismo patrón de upsert que
// seguimientos.js, para poder cerrar/reabrir sin preocuparse de si ya
// existía la fila.
export async function upsertCierreSeguimientoRemote(cierre) {
  if (!supabase) return
  const { error } = await supabase
    .from('cierres_seguimiento_semanal')
    .upsert(toRow(cierre), { onConflict: 'persona,semana' })
  if (error) console.error('[cierresSeguimiento] upsert error:', error.message)
}
