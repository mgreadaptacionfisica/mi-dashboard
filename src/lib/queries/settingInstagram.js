import { supabase } from '../supabaseClient'

function fromRow(row) {
  return {
    fecha: row.fecha,
    bienvenidasEnviadas: row.bienvenidas_enviadas,
    bienvenidasRespondidas: row.bienvenidas_respondidas,
    mensajeBienvenida: row.mensaje_bienvenida || '',
    fupEnviados: row.fup_enviados,
    fupRespondidas: row.fup_respondidas,
    mensajeFup: row.mensaje_fup || '',
    ultimaBienvenida: row.ultima_bienvenida || '',
    llamadas: row.llamadas,
    ventas: row.ventas,
  }
}

function toRow(r) {
  return {
    fecha: r.fecha,
    bienvenidas_enviadas: r.bienvenidasEnviadas || 0,
    bienvenidas_respondidas: r.bienvenidasRespondidas || 0,
    mensaje_bienvenida: r.mensajeBienvenida || '',
    fup_enviados: r.fupEnviados || 0,
    fup_respondidas: r.fupRespondidas || 0,
    mensaje_fup: r.mensajeFup || '',
    ultima_bienvenida: r.ultimaBienvenida || '',
    llamadas: r.llamadas || 0,
    ventas: r.ventas || 0,
  }
}

export async function fetchSetting() {
  if (!supabase) return null
  const { data, error } = await supabase.from('setting_instagram').select('*').order('fecha', { ascending: false })
  if (error) {
    console.error('[settingInstagram] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

// El registro se identifica por fecha (unique), no por id. Si al editar se
// cambia la fecha, hay que borrar antes la fila vieja porque si no
// quedarían dos registros (el viejo y el nuevo) en vez de uno renombrado.
export async function upsertSettingRemote(registro, fechaAnterior) {
  if (!supabase) return
  if (fechaAnterior && fechaAnterior !== registro.fecha) {
    await supabase.from('setting_instagram').delete().eq('fecha', fechaAnterior)
  }
  const { error } = await supabase
    .from('setting_instagram')
    .upsert(toRow(registro), { onConflict: 'fecha' })
  if (error) console.error('[settingInstagram] upsert error:', error.message)
}

export async function deleteSettingRemote(fecha) {
  if (!supabase || !fecha) return
  const { error } = await supabase.from('setting_instagram').delete().eq('fecha', fecha)
  if (error) console.error('[settingInstagram] delete error:', error.message)
}
