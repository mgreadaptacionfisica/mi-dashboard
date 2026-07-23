import { createClient } from '@supabase/supabase-js'
import { esDemo } from './demoGuard'

// Cliente único de Supabase para toda la app.
// Las credenciales viven en variables de entorno (.env.local, no se commitea).
// La "publishable key" (antes llamada "anon key") es segura para el frontend
// siempre que las tablas tengan Row Level Security activado.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[supabaseClient] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local. ' +
    'La app seguirá funcionando con los datos estáticos de src/data mientras no estén configuradas.'
  )
}

const client = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Guard del Modo demo: cuando está activo, cualquier escritura (insert /
// update / upsert / delete) a una tabla se convierte en una operación
// vacía que resuelve sin error, mientras que las lecturas (select) siguen
// funcionando con normalidad. Así, mientras Raúl enseña/graba el panel con
// el modo demo puesto, ningún clic puede alterar datos reales en Supabase.
// Se intercepta en un único punto (client.from) para no tener que tocar
// cada archivo de consultas.
if (client) {
  const realFrom = client.from.bind(client)
  const escrituraVacia = () => {
    const resultado = Promise.resolve({ data: null, error: null })
    const cadena = {
      eq: () => cadena,
      neq: () => cadena,
      in: () => cadena,
      match: () => cadena,
      select: () => resultado,
      then: resultado.then.bind(resultado),
      catch: resultado.catch.bind(resultado),
      finally: resultado.finally.bind(resultado),
    }
    return cadena
  }
  client.from = (tabla) => {
    const builder = realFrom(tabla)
    if (!esDemo()) return builder
    return {
      select: builder.select.bind(builder),
      insert: escrituraVacia,
      update: escrituraVacia,
      upsert: escrituraVacia,
      delete: escrituraVacia,
    }
  }
}

export const supabase = client
