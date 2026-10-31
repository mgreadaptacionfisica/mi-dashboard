import { supabase } from '../supabaseClient'
import { avisaErrorGuardado } from '../avisosGuardado'

// 🎓 Formación (ver supabase-sql/69_formacion.sql): interesados en el programa
// para profesionales y el texto del programa. Solo admin por RLS: cualquier
// otro rol recibiría listas vacías.

function fromRow(row) {
  return {
    id: row.id,
    nombre: row.nombre || '',
    instagram: row.instagram || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    profesion: row.profesion || '',
    origen: row.origen || '',
    estado: row.estado || 'interesado',
    notas: row.notas || '',
    creadoEn: row.created_at || null,
  }
}

function toRow(entrada) {
  const row = {}
  ;['id', 'nombre', 'instagram', 'whatsapp', 'email', 'profesion', 'origen', 'estado', 'notas'].forEach((k) => {
    if (k in entrada) row[k] = entrada[k]
  })
  return row
}

export async function fetchFormacionInteresados() {
  if (!supabase) return null
  const { data, error } = await supabase.from('formacion_interesados').select('*').order('created_at', { ascending: false })
  if (error) {
    console.error('[formacion_interesados] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertFormacionInteresadoRemote(entrada) {
  if (!supabase) return
  const { error } = await supabase.from('formacion_interesados').insert(toRow(entrada))
  if (error) avisaErrorGuardado('[formacion_interesados] insert error:', error)
}

export async function updateFormacionInteresadoRemote(id, patch) {
  if (!supabase || !id) return
  const row = toRow(patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('formacion_interesados').update(row).eq('id', id)
  if (error) avisaErrorGuardado('[formacion_interesados] update error:', error)
}

export async function deleteFormacionInteresadoRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('formacion_interesados').delete().eq('id', id)
  if (error) avisaErrorGuardado('[formacion_interesados] delete error:', error)
}

// El programa es una única fila con id fijo: se lee con maybeSingle (puede no
// existir todavía) y se guarda con upsert.
const ID_PROGRAMA = 'principal'

export async function fetchFormacionPrograma() {
  if (!supabase) return null
  const { data, error } = await supabase.from('formacion_programa').select('*').eq('id', ID_PROGRAMA).maybeSingle()
  if (error) {
    console.error('[formacion_programa] fetch error:', error.message)
    return null
  }
  return { titulo: data?.titulo || '', contenido: data?.contenido || '', actualizadoEn: data?.updated_at || null }
}

export async function guardarFormacionProgramaRemote({ titulo, contenido }) {
  if (!supabase) return
  const { error } = await supabase.from('formacion_programa')
    .upsert({ id: ID_PROGRAMA, titulo, contenido, updated_at: new Date().toISOString() })
  if (error) avisaErrorGuardado('[formacion_programa] upsert error:', error)
}
