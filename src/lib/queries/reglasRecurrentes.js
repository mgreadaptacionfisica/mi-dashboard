import { supabase } from '../supabaseClient'

// CRUD de reglas_recurrentes (ver supabase-sql/37_reglas_recurrentes.sql y
// utils/recurrenciaHelpers.js para la lógica de generación de periodos).
function fromRow(row) {
  return {
    id: row.id,
    tabla: row.tabla,
    concepto: row.concepto || '',
    importe: row.importe ?? 0,
    categoria: row.categoria || '',
    notas: row.notas || '',
    fechaInicio: row.fecha_inicio,
    frecuenciaMeses: row.frecuencia_meses ?? 1,
    fechaFin: row.fecha_fin || null,
    activa: row.activa !== false,
  }
}

function toRow(entrada) {
  const row = {}
  if ('id' in entrada) row.id = entrada.id
  if ('tabla' in entrada) row.tabla = entrada.tabla
  if ('concepto' in entrada) row.concepto = entrada.concepto
  if ('importe' in entrada) row.importe = entrada.importe
  if ('categoria' in entrada) row.categoria = entrada.categoria || ''
  if ('notas' in entrada) row.notas = entrada.notas || ''
  if ('fechaInicio' in entrada) row.fecha_inicio = entrada.fechaInicio
  if ('frecuenciaMeses' in entrada) row.frecuencia_meses = entrada.frecuenciaMeses
  if ('fechaFin' in entrada) row.fecha_fin = entrada.fechaFin || null
  if ('activa' in entrada) row.activa = entrada.activa
  return row
}

export async function fetchReglasRecurrentes() {
  if (!supabase) return null
  const { data, error } = await supabase.from('reglas_recurrentes').select('*')
  if (error) {
    console.error('[reglasRecurrentes] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertReglaRecurrenteRemote(entrada) {
  if (!supabase) return
  const { error } = await supabase.from('reglas_recurrentes').insert(toRow(entrada))
  if (error) console.error('[reglasRecurrentes] insert error:', error.message)
}

export async function updateReglaRecurrenteRemote(id, patch) {
  if (!supabase || !id) return
  const row = toRow(patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('reglas_recurrentes').update(row).eq('id', id)
  if (error) console.error('[reglasRecurrentes] update error:', error.message)
}

export async function deleteReglaRecurrenteRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('reglas_recurrentes').delete().eq('id', id)
  if (error) console.error('[reglasRecurrentes] delete error:', error.message)
}
