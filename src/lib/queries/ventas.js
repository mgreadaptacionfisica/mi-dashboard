import { supabase } from '../supabaseClient'

function fromRow(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email || '',
    telefono: row.telefono || '',
    closer: row.closer || '',
    etapa: row.etapa,
    fechaAgenda: row.fecha_agenda || '',
    horaAgenda: row.hora_agenda || '',
    creadoEn: row.creado_en || '',
    preLlamada: row.pre_llamada || { whatsapp: false, prellamada: false, recordatorio: false },
    resultadoLlamada: row.resultado_llamada,
    compraEnLlamada: row.compra_en_llamada,
    objeciones: row.objeciones || [],
    seguimiento: row.seguimiento || { realizado: false, contesta: null, compraTrasSeguimiento: null },
    notasSeguimiento: row.notas_seguimiento || [],
    grabacionUrl: row.grabacion_url || '',
    motivoPerdida: row.motivo_perdida,
    venta: row.venta,
    recontacto: row.recontacto,
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
  fechaAgenda: 'fecha_agenda',
  horaAgenda: 'hora_agenda',
  creadoEn: 'creado_en',
  preLlamada: 'pre_llamada',
  resultadoLlamada: 'resultado_llamada',
  compraEnLlamada: 'compra_en_llamada',
  objeciones: 'objeciones',
  seguimiento: 'seguimiento',
  notasSeguimiento: 'notas_seguimiento',
  grabacionUrl: 'grabacion_url',
  motivoPerdida: 'motivo_perdida',
  venta: 'venta',
  recontacto: 'recontacto',
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
