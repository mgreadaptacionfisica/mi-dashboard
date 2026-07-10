import { supabase } from './supabaseClient'

// Login obligatorio para todo el mundo, con roles reales por persona:
// 'admin' (Raúl), 'closer', 'tecnico', 'contenido'. El rol se guarda en
// app_metadata (no en user_metadata) porque app_metadata no se puede editar
// desde el propio navegador con la clave anon — solo por SQL/Admin API — así
// que una persona no puede auto-asignarse otro rol con las herramientas del
// navegador. Se fija con SQL directamente sobre auth.users (ver el script
// que asigna cada rol tras crear el usuario en el Dashboard de Supabase).

export const SECCIONES_POR_ROL = {
  admin: ['dashboard', 'ventas', 'clientes', 'equipo', 'comunicacion', 'finanzas', 'onboarding', 'operaciones', 'tareas'],
  closer: ['ventas', 'comunicacion'],
  tecnico: ['clientes', 'comunicacion'],
  contenido: ['operaciones', 'comunicacion'],
}

export function getRole(session) {
  return session?.user?.app_metadata?.rol || null
}

export function seccionesDelRol(rol) {
  return SECCIONES_POR_ROL[rol] || []
}

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
