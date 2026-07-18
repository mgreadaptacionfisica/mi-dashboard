import { supabase } from '../supabaseClient'

// CRUD de tarifas_pasarela — ver supabase-sql/39_tarifas_pasarela.sql y
// utils/comisionesHelpers.js.
function fromRow(row) {
  return {
    id: row.id,
    pasarela: row.pasarela || row.id,
    porcentaje: row.porcentaje ?? 0,
    fijo: row.fijo ?? 0,
    reservaPct: row.reserva_pct ?? 0,
    reservaDias: row.reserva_dias ?? 0,
    notas: row.notas || '',
    actualizadoEn: row.actualizado_en || null,
  }
}

function toRow(entrada) {
  const row = {}
  if ('id' in entrada) row.id = entrada.id
  if ('pasarela' in entrada) row.pasarela = entrada.pasarela
  if ('porcentaje' in entrada) row.porcentaje = entrada.porcentaje
  if ('fijo' in entrada) row.fijo = entrada.fijo
  if ('reservaPct' in entrada) row.reserva_pct = entrada.reservaPct
  if ('reservaDias' in entrada) row.reserva_dias = entrada.reservaDias
  if ('notas' in entrada) row.notas = entrada.notas || ''
  if ('actualizadoEn' in entrada) row.actualizado_en = entrada.actualizadoEn
  return row
}

export async function fetchTarifasPasarela() {
  if (!supabase) return null
  const { data, error } = await supabase.from('tarifas_pasarela').select('*')
  if (error) {
    console.error('[tarifasPasarela] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertTarifaPasarelaRemote(entrada) {
  if (!supabase) return
  const { error } = await supabase.from('tarifas_pasarela').insert(toRow(entrada))
  if (error) console.error('[tarifasPasarela] insert error:', error.message)
}

export async function updateTarifaPasarelaRemote(id, patch) {
  if (!supabase || !id) return
  const row = toRow(patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('tarifas_pasarela').update(row).eq('id', id)
  if (error) console.error('[tarifasPasarela] update error:', error.message)
}

export async function deleteTarifaPasarelaRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('tarifas_pasarela').delete().eq('id', id)
  if (error) console.error('[tarifasPasarela] delete error:', error.message)
}
