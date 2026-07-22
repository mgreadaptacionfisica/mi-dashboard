import { supabase } from '../supabaseClient'

// Renombrado en cascada del historial de un cliente. El panel enlaza el
// historial de cada cliente por su NOMBRE (cliente_nombre) en vez de por un
// id estable, así que al corregir el nombre en la ficha hay que arrastrar
// ese cambio a todas las tablas que dependen de él — si no, el historial se
// queda colgando del nombre viejo y "desaparece" (es justo lo que pasó con
// Hilde Nieto/Niego). Esto lo automatiza: al cambiar el nombre de un
// cliente se actualiza cliente_nombre en las 5 tablas de una vez.
const TABLAS_HISTORIAL = [
  'seguimientos',
  'contactos_semanales',
  'valoraciones_clientes',
  'objetivos_cliente_fase',
  'revisiones_semanales_cliente',
]

export async function renombrarClienteEnHistorial(nombreViejo, nombreNuevo) {
  if (!supabase) return
  const viejo = (nombreViejo || '').trim()
  const nuevo = (nombreNuevo || '').trim()
  if (!viejo || !nuevo || viejo === nuevo) return
  for (const tabla of TABLAS_HISTORIAL) {
    const { error } = await supabase.from(tabla).update({ cliente_nombre: nuevo }).eq('cliente_nombre', viejo)
    // Nota: seguimientos/contactos_semanales/revisiones_semanales_cliente
    // tienen unique(cliente_nombre, semana). En un renombrado normal (el
    // nombre nuevo no tenía datos previos) no hay conflicto. Si algún día
    // chocara —porque ya existiera una fila con el nombre nuevo esa misma
    // semana— el update de esa tabla fallaría aquí y habría que fusionar a
    // mano como se hizo con Hilde; se registra el error para detectarlo.
    if (error) console.error(`[renombrarCliente] ${tabla}:`, error.message)
  }
}
