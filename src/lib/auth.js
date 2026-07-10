import { supabase } from './supabaseClient'

// Autenticación mínima: por ahora solo Raúl tiene cuenta (rol admin). El
// resto del equipo sigue entrando al panel sin login, igual que hasta ahora.
// Cualquier sesión de Supabase Auth activa se trata como "admin", porque de
// momento es la única cuenta que existe. Si en el futuro se dan cuentas al
// resto del equipo, aquí habrá que mirar un campo "rol" real en vez de
// asumir que toda sesión = admin.

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthChange(callback) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

export async function signIn(email, password) {
  if (!supabase) return { error: { message: 'Supabase no está configurado.' } }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return { error }
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}
