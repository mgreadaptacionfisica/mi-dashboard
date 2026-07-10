import { supabase } from '../supabaseClient'

// Las 3 tablas de Finanzas comparten forma base (id, fecha, concepto,
// importe, notas); gastos_profesionales añade categoria/origen/
// personaNombre/mes (para el pago automático al equipo desde Equipo.jsx).
// Un solo helper genérico parametrizado por tabla, en vez de triplicar
// fetch/insert/update/delete.
const TABLAS = {
  ingresos_personales: {
    id: 'id', fecha: 'fecha', concepto: 'concepto', importe: 'importe', notas: 'notas',
  },
  gastos_personales: {
    id: 'id', fecha: 'fecha', concepto: 'concepto', importe: 'importe', notas: 'notas',
  },
  gastos_profesionales: {
    id: 'id', fecha: 'fecha', concepto: 'concepto', importe: 'importe', notas: 'notas',
    categoria: 'categoria', origen: 'origen', personaNombre: 'persona_nombre', mes: 'mes',
  },
}

function toRow(tabla, entrada) {
  const mapa = TABLAS[tabla]
  const row = {}
  Object.entries(entrada).forEach(([key, value]) => {
    const columna = mapa[key]
    if (columna) row[columna] = value
  })
  return row
}

function fromRow(tabla, row) {
  const mapa = TABLAS[tabla]
  const out = {}
  Object.entries(mapa).forEach(([camel, columna]) => { out[camel] = row[columna] })
  out.concepto = out.concepto || ''
  out.notas = out.notas || ''
  if ('categoria' in out) out.categoria = out.categoria || ''
  if ('origen' in out) out.origen = out.origen || 'manual'
  return out
}

export async function fetchFinanzas(tabla) {
  if (!supabase) return null
  const { data, error } = await supabase.from(tabla).select('*')
  if (error) {
    console.error(`[finanzas] fetch ${tabla} error:`, error.message)
    return null
  }
  return data.map((row) => fromRow(tabla, row))
}

export async function insertFinanzaRemote(tabla, entrada) {
  if (!supabase) return
  const { error } = await supabase.from(tabla).insert(toRow(tabla, entrada))
  if (error) console.error(`[finanzas] insert ${tabla} error:`, error.message)
}

export async function updateFinanzaRemote(tabla, id, patch) {
  if (!supabase || !id) return
  const row = toRow(tabla, patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from(tabla).update(row).eq('id', id)
  if (error) console.error(`[finanzas] update ${tabla} error:`, error.message)
}

export async function deleteFinanzaRemote(tabla, id) {
  if (!supabase || !id) return
  const { error } = await supabase.from(tabla).delete().eq('id', id)
  if (error) console.error(`[finanzas] delete ${tabla} error:`, error.message)
}
