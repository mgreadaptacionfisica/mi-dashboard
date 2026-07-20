import { supabase } from '../supabaseClient'

function fromRow(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email || '',
    telefono: row.telefono || '',
    closer: row.closer || '',
    etapa: row.etapa,
    etapaAnterior: row.etapa_anterior || null,
    fechaAgenda: row.fecha_agenda || '',
    horaAgenda: row.hora_agenda || '',
    creadoEn: row.creado_en || '',
    preLlamada: row.pre_llamada || { whatsapp: false, prellamada: false, recordatorio: false },
    resultadoLlamada: row.resultado_llamada,
    compraEnLlamada: row.compra_en_llamada,
    objeciones: row.objeciones || [],
    seguimiento: row.seguimiento || { realizado: false, contesta: null, compraTrasSeguimiento: null },
    // 'reagendar' cuando el lead pasó a seguimiento por una llamada
    // cancelada/no-show (en vez del seguimiento normal post-llamada, cuando
    // no compró en el momento) — ver 51_origen_seguimiento_ventas.sql.
    origenSeguimiento: row.origen_seguimiento || null,
    notasSeguimiento: row.notas_seguimiento || [],
    grabacionUrl: row.grabacion_url || '',
    motivoPerdida: row.motivo_perdida,
    venta: row.venta,
    recontacto: row.recontacto,
    informePrellamadaPath: row.informe_prellamada_path || '',
  }
}

// Mapa camelCase -> columna snake_case. Se usa tanto para el insert
// completo como para los patches parciales que hace updateLead() en
// Ventas.jsx (que es el único punto de mutación de leads en toda la app).
const CAMPO_A_COLUMNA = {
  nombre: 'nombre',
  email: 'email',
  telefono: 'telefono',
  closer: 'closer',
  etapa: 'etapa',
  etapaAnterior: 'etapa_anterior',
  fechaAgenda: 'fecha_agenda',
  horaAgenda: 'hora_agenda',
  creadoEn: 'creado_en',
  preLlamada: 'pre_llamada',
  resultadoLlamada: 'resultado_llamada',
  compraEnLlamada: 'compra_en_llamada',
  objeciones: 'objeciones',
  seguimiento: 'seguimiento',
  origenSeguimiento: 'origen_seguimiento',
  notasSeguimiento: 'notas_seguimiento',
  grabacionUrl: 'grabacion_url',
  motivoPerdida: 'motivo_perdida',
  venta: 'venta',
  recontacto: 'recontacto',
  informePrellamadaPath: 'informe_prellamada_path',
}

// fecha_agenda y creado_en son columnas "date" en Supabase: un '' (fecha sin
// rellenar en el formulario) hace que el insert falle en silencio (Postgres
// rechaza '' como fecha), así que el lead se veía en pantalla pero
// desaparecía al refrescar porque nunca llegó a guardarse de verdad.
const COLUMNAS_FECHA = new Set(['fecha_agenda', 'creado_en'])

function toColumns(obj) {
  const row = {}
  Object.entries(obj).forEach(([key, value]) => {
    const columna = CAMPO_A_COLUMNA[key]
    if (!columna) return
    row[columna] = COLUMNAS_FECHA.has(columna) && value === '' ? null : value
  })
  return row
}

export async function fetchVentas() {
  if (!supabase) return null
  const { data, error } = await supabase.from('ventas').select('*').order('creado_en', { ascending: false })
  if (error) {
    console.error('[ventas] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertLeadRemote(lead) {
  if (!supabase) return
  const row = { id: lead.id, ...toColumns(lead) }
  const { error } = await supabase.from('ventas').insert(row)
  if (error) console.error('[ventas] insert error:', error.message)
}

// patch va en camelCase (igual que se usa internamente en Ventas.jsx),
// solo se envían las columnas presentes en el patch.
export async function updateLeadRemote(id, patch) {
  if (!supabase || !id) return
  const row = toColumns(patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('ventas').update(row).eq('id', id)
  if (error) console.error('[ventas] update error:', error.message)
}

export async function deleteLeadRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('ventas').delete().eq('id', id)
  if (error) console.error('[ventas] delete error:', error.message)
}

// Informe prellamada (PDF de ZeroChats, Calendly...) adjunto a un lead.
// Bucket privado: se sube con un nombre único dentro de una carpeta por
// lead, y se lee siempre con URL firmada (caduca en 1h), nunca con enlace
// público permanente — ver 25_informes_leads.sql.
export async function uploadInformePrellamada(leadId, file) {
  if (!supabase || !leadId || !file) return null
  const extension = (file.name.split('.').pop() || 'pdf').toLowerCase()
  const path = `${leadId}/informe-${Date.now()}.${extension}`
  const { error } = await supabase.storage.from('informes-leads').upload(path, file, { upsert: true })
  if (error) {
    console.error('[ventas] upload informe error:', error.message)
    return null
  }
  return path
}

export async function getInformePrellamadaUrl(path) {
  if (!supabase || !path) return null
  const { data, error } = await supabase.storage.from('informes-leads').createSignedUrl(path, 3600)
  if (error) {
    console.error('[ventas] signed url informe error:', error.message)
    return null
  }
  return data?.signedUrl || null
}
