import { supabase } from '../supabaseClient'

// A diferencia del resto de módulos, los objetos "cliente" que usa el panel
// no están en camelCase: usan las claves tal cual vienen del CSV original
// ("Nombre", "Servicio contratado", "Estado del cliente"...). Se respeta esa
// forma aquí para no tener que tocar Clientes.jsx/CobrosPendientes.jsx más
// de lo necesario.
function fromRow(row) {
  return {
    id: row.id,
    Nombre: row.nombre || '',
    Drive: row.drive || '',
    Email: row.email || '',
    'Estado del cliente': row.estado || '',
    'Fecha inicio': row.fecha_inicio || '',
    'Fecha fin': row.fecha_fin || '',
    'Fecha primer pago': row.fecha_primer_pago || '',
    'Fecha segundo pago': row.fecha_segundo_pago || '',
    'Fecha tercer pago': row.fecha_tercer_pago || '',
    'Forma de pago': row.forma_pago || '',
    Pago: row.pago || '',
    'Primer pago': row.primer_pago,
    'Segundo pago': row.segundo_pago,
    'Tercer pago': row.tercer_pago,
    Renueva: row.renueva || 'No',
    'Forma de renovación': row.forma_renovacion || '',
    'Importe renovación': row.importe_renovacion,
    'Fecha renovación': row.fecha_renovacion || '',
    'Servicio contratado': row.servicio_contratado || '',
    Teléfono: row.telefono || '',
    'Tipo de cliente': row.tipo_cliente || '',
    Trabajadores: row.trabajadores || [],
    'Importe total': row.importe_total,
    Plazos: row.plazos || [],
  }
}

// Mapa clave-tal-cual-la-usa-la-app -> columna snake_case. Se usa tanto para
// el insert/guardado completo (handleSubmit en Clientes.jsx envía el objeto
// entero) como para los patches parciales (reasignar Trabajadores desde la
// tabla, o actualizar Plazos desde Cobros pendientes).
const CAMPO_A_COLUMNA = {
  Nombre: 'nombre',
  Drive: 'drive',
  Email: 'email',
  'Estado del cliente': 'estado',
  'Fecha inicio': 'fecha_inicio',
  'Fecha fin': 'fecha_fin',
  'Fecha primer pago': 'fecha_primer_pago',
  'Fecha segundo pago': 'fecha_segundo_pago',
  'Fecha tercer pago': 'fecha_tercer_pago',
  'Forma de pago': 'forma_pago',
  Pago: 'pago',
  'Primer pago': 'primer_pago',
  'Segundo pago': 'segundo_pago',
  'Tercer pago': 'tercer_pago',
  Renueva: 'renueva',
  'Forma de renovación': 'forma_renovacion',
  'Importe renovación': 'importe_renovacion',
  'Fecha renovación': 'fecha_renovacion',
  'Servicio contratado': 'servicio_contratado',
  Teléfono: 'telefono',
  'Tipo de cliente': 'tipo_cliente',
  Trabajadores: 'trabajadores',
  'Importe total': 'importe_total',
  Plazos: 'plazos',
}

// Columnas numéricas: una cadena vacía ('' del formulario, sin importe)
// rompe el insert/update en Postgres, así que se envía null en su lugar.
const COLUMNAS_NUMERICAS = new Set([
  'primer_pago', 'segundo_pago', 'tercer_pago', 'importe_renovacion', 'importe_total',
])

function toColumns(cliente) {
  const row = {}
  Object.entries(cliente).forEach(([key, value]) => {
    const columna = CAMPO_A_COLUMNA[key]
    if (!columna) return
    row[columna] = COLUMNAS_NUMERICAS.has(columna) && value === '' ? null : value
  })
  return row
}

export async function fetchClientes() {
  if (!supabase) return null
  const { data, error } = await supabase.from('clientes').select('*').order('nombre', { ascending: true })
  if (error) {
    console.error('[clientes] fetch error:', error.message)
    return null
  }
  return data.map(fromRow)
}

export async function insertClienteRemote(cliente) {
  if (!supabase || !cliente.id) return
  const row = { id: cliente.id, ...toColumns(cliente) }
  const { error } = await supabase.from('clientes').insert(row)
  if (error) console.error('[clientes] insert error:', error.message)
}

// patch usa las mismas claves que el objeto cliente en memoria (Nombre,
// 'Servicio contratado', Plazos...). Solo se envían las columnas presentes.
export async function updateClienteRemote(id, patch) {
  if (!supabase || !id) return
  const row = toColumns(patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('clientes').update(row).eq('id', id)
  if (error) console.error('[clientes] update error:', error.message)
}

export async function deleteClienteRemote(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) console.error('[clientes] delete error:', error.message)
}
