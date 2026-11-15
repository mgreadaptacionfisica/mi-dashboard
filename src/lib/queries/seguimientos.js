import { supabase } from '../supabaseClient'
import { leerTodo } from './leerTodo'
import { avisaErrorGuardado } from '../avisosGuardado'

function fromRow(row) {
  return {
    clienteNombre: row.cliente_nombre,
    semana: row.semana,
    dias: row.dias || {},
    comentarios: row.comentarios || '',
    cambiosPendientes: row.cambios_pendientes || [],
    revisiones: row.revisiones || [],
    // 📣 Qué explicar al cliente la semana que viene (migración 76). Solo
    // se pone la clave si viene la columna: así, antes de correr la
    // migración, nunca se manda y el guardado de la semana no falla.
    ...(row.para_cliente !== undefined ? { paraCliente: row.para_cliente || '' } : {}),
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
  if (registro.paraCliente !== undefined) fila.para_cliente = registro.paraCliente || null
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
