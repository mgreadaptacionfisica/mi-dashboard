import { createClient } from '@supabase/supabase-js'

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

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null
