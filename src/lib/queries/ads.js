import { supabase } from '../supabaseClient'

// ---------- ads_kpi (identificado por mes + semana) ----------

function fromRowKpi(row) {
  return {
    mes: row.mes,
    semana: row.semana,
    bienvenidas: row.bienvenidas,
    conversaciones: row.conversaciones,
    agendas: row.agendas,
    llamadas: row.llamadas,
    canceladas: row.canceladas,
    noShow: row.no_show,
    ventas: row.ventas,
    facturado: row.facturado,
    cashCobrado: row.cash_cobrado,
    inversion: row.inversion,
  }
}

function toRowKpi(r) {
  return {
    mes: r.mes,
    semana: r.semana,
    bienvenidas: r.bienvenidas || 0,
    conversaciones: r.conversaciones || 0,
    agendas: r.agendas || 0,
    llamadas: r.llamadas || 0,
    canceladas: r.canceladas || 0,
    no_show: r.noShow || 0,
    ventas: r.ventas || 0,
    facturado: r.facturado || 0,
    cash_cobrado: r.cashCobrado || 0,
    inversion: r.inversion || 0,
  }
}

export async function fetchAdsKpi() {
  if (!supabase) return null
  const { data, error } = await supabase.from('ads_kpi').select('*')
  if (error) {
    console.error('[ads] fetch ads_kpi error:', error.message)
    return null
  }
  return data.map(fromRowKpi)
}

export async function upsertAdsKpiRemote(registro) {
  if (!supabase) return
  const { error } = await supabase.from('ads_kpi').upsert(toRowKpi(registro), { onConflict: 'mes,semana' })
  if (error) console.error('[ads] upsert ads_kpi error:', error.message)
}

// ---------- ads_notas_mensuales (identificado por mes) ----------

export async function fetchAdsNotas() {
  if (!supabase) return null
  const { data, error } = await supabase.from('ads_notas_mensuales').select('*')
  if (error) {
    console.error('[ads] fetch ads_notas error:', error.message)
    return null
  }
  return data.map((row) => ({ mes: row.mes, notas: row.notas || '' }))
}

export async function upsertAdsNotaRemote(mes, notas) {
  if (!supabase) return
  const { error } = await supabase.from('ads_notas_mensuales').upsert({ mes, notas }, { onConflict: 'mes' })
  if (error) console.error('[ads] upsert ads_notas error:', error.message)
}

// ---------- anuncios (id propio, generado en el front) ----------

function fromRowAnuncio(row) {
  return {
    id: row.id,
    nombre: row.nombre || '',
    video: row.video || '',
    llamadas: row.llamadas,
    ventas: row.ventas,
  }
}

export async function fetchAnuncios() {
  if (!supabase) return null
  const { data, error } = await supabase.from('anuncios').select('*')
  if (error) {
    console.error('[ads] fetch anuncios error:', error.message)
    return null
  }
  return data.map(fromRowAnuncio)
}

export async function insertAnuncioRemote(anuncio) {
  if (!supabase) return
  const { error } = await supabase.from('anuncios').insert(anuncio)
  if (error) console.error('[ads] insert anuncio error:', error.message)
}

export async function updateAnuncioRemote(id, patch) {
  if (!supabase || !id) return
  const { error } = await supabase.from('anuncios').update(patch).eq('id', id)
  if (error) console.error('[ads] update anuncio error:', error.message)
}

export async function deleteAnuncioRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('anuncios').delete().eq('id', id)
  if (error) console.error('[ads] delete anuncio error:', error.message)
}
