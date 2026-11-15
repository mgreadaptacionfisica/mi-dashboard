import { supabase } from '../supabaseClient'
import { leerTodo } from './leerTodo'
import { avisaErrorGuardado } from '../avisosGuardado'
import { normalizarParaCliente } from '../../utils/seguimientoHelpers'

function fromRow(row) {
  return {
    clienteNombre: row.cliente_nombre,
    semana: row.semana,
    dias: row.dias || {},
    comentarios: row.comentarios || '',
    cambiosPendientes: row.cambios_pendientes || [],
    revisiones: row.revisiones || [],
    // 📣 Qué explicar al cliente la semana que viene (migraciones 76 y 77):
    // lista de puntos con check y sesión. Solo se pone la clave si viene la
    // columna, para no mandarla nunca si no existe.
    ...(row.para_cliente !== undefined ? { paraClienteLista: normalizarParaCliente(row.para_cliente) } : {}),
  }
}

function toRow(registro) {
  const fila = {
    cliente_nombre: registro.clienteNombre,
    semana: registro.semana,
    dias: registro.dias || {},
    comentarios: registro.comentarios || '',
    cambios_pendientes: registro.cambiosPendientes || [],
    revisiones: registro.revisiones || [],
  }
  // Solo si el registro la trae (ver fromRow). Si no la trae, el upsert no
  // la toca y se conserva lo que hubiera.
  // Con la 77 la columna es jsonb; si aún fuera text, se guarda el JSON como
  // texto y normalizarParaCliente lo lee igual.
  if (registro.paraClienteLista !== undefined) fila.para_cliente = registro.paraClienteLista.length ? registro.paraClienteLista : null
  return fila
}

export async function fetchSeguimientos() {
  if (!supabase) return null
  const { data, error } = await leerTodo('seguimientos')
  if (error) {
    console.error('[seguimientos] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

// Un registro de seguimiento se identifica por (clienteNombre, semana), no
// por id (no se maneja un id propio en el front). Se hace upsert con el
// registro completo ya fusionado (dias + comentarios + revisiones), igual
// que construye el estado local SeguimientoCliente.jsx / Equipo.jsx.
export async function upsertSeguimientoRemote(registro) {
  if (!supabase) return
  const { error } = await supabase
    .from('seguimientos')
    .upsert(toRow(registro), { onConflict: 'cliente_nombre,semana' })
  if (error) avisaErrorGuardado('[seguimientos] upsert error:', error)
}
