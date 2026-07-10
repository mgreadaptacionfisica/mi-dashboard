import { supabase } from '../supabaseClient'

function fromRow(row) {
  return {
    id: row.id,
    nombre: row.nombre || '',
    canal: row.canal || 'WhatsApp',
    contacto: row.contacto || '',
    motivo: row.motivo || '',
    fechaContacto: row.fecha_contacto || '',
    contactado: row.contactado,
    respondido: row.respondido,
    comprado: row.comprado,
  }
}

function toRow(r) {
  return {
    id: r.id,
    nombre: r.nombre || '',
    canal: r.canal || 'WhatsApp',
    contacto: r.contacto || '',
    motivo: r.motivo || '',
    fecha_contacto: r.fechaContacto || null,
    contactado: !!r.contactado,
    respondido: r.respondido,
    comprado: r.comprado,
  }
}

// Mapa camelCase -> columna, para actualizar solo los campos presentes en
// un patch parcial (el panel permite editar campo a campo, ej. solo
// marcar "contactado" sin reenviar nombre/canal/etc.).
const CAMPO_A_COLUMNA = {
  nombre: 'nombre',
  canal: 'canal',
  contacto: 'contacto',
  motivo: 'motivo',
  fechaContacto: 'fecha_contacto',
  contactado: 'contactado',
  respondido: 'respondido',
  comprado: 'comprado',
}

function toColumns(patch) {
  const row = {}
  Object.entries(patch).forEach(([key, value]) => {
    const columna = CAMPO_A_COLUMNA[key]
    if (columna) row[columna] = value
  })
  return row
}

export async function fetchRecontactos() {
  if (!supabase) return null
  const { data, error } = await supabase.from('recontactos').select('*')
  if (error) {
    console.error('[recontactos] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertRecontactoRemote(recontacto) {
  if (!supabase) return
  const { error } = await supabase.from('recontactos').insert(toRow(recontacto))
  if (error) console.error('[recontactos] insert error:', error.message)
}

export async function updateRecontactoRemote(id, patch) {
  if (!supabase || !id) return
  const row = toColumns(patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('recontactos').update(row).eq('id', id)
  if (error) console.error('[recontactos] update error:', error.message)
}

export async function deleteRecontactoRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('recontactos').delete().eq('id', id)
  if (error) console.error('[recontactos] delete error:', error.message)
}
