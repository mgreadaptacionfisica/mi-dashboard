import { supabase } from '../supabaseClient'

function fromRow(row) {
  return {
    id: row.id,
    clienteNombre: row.cliente_nombre || '',
    dni: row.dni || '',
    email: row.email || '',
    origen: row.origen || '',
    datos: row.datos || {},
    texto: row.texto || [],
    version: row.version || '',
    firma: row.firma || '',
    firmadoEn: row.firmado_en,
  }
}

export async function fetchContratosClientes() {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('contratos_clientes')
    .select('*')
    .order('firmado_en', { ascending: false })
  if (error) {
    console.error('[contratosClientes] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

// Firma desde la ruta PÚBLICA, sin login. Mismas dos reglas que
// enviarCuestionarioPublico: NO se encadena .select() (anon solo puede
// insertar, migración 62) y se DEVUELVE el error para que el cliente vea que
// no se ha guardado y pueda reintentar, en vez de un "firmado" falso.
export async function firmarContratoPublico(contrato) {
  if (!supabase) return { message: 'No hay conexión con la base de datos.' }
  const { error } = await supabase.from('contratos_clientes').insert({
    id: contrato.id,
    cliente_nombre: contrato.clienteNombre || null,
    dni: contrato.dni || null,
    email: contrato.email || null,
    origen: contrato.origen || null,
    datos: contrato.datos || {},
    texto: contrato.texto || [],
    version: contrato.version || null,
    firma: contrato.firma || null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  })
  if (error) {
    console.error('[contratosClientes] insert público error:', error.message)
    return error
  }
  return null
}
