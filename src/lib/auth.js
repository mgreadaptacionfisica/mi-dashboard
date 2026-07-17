import { supabase } from './supabaseClient'

// Login obligatorio para todo el mundo, con roles reales por persona:
// 'admin' (Raúl), 'closer', 'tecnico', 'contenido'. El rol se guarda en
// app_metadata (no en user_metadata) porque app_metadata no se puede editar
// desde el propio navegador con la clave anon — solo por SQL/Admin API — así
// que una persona no puede auto-asignarse otro rol con las herramientas del
// navegador. Se fija con SQL directamente sobre auth.users (ver el script
// que asigna cada rol tras crear el usuario en el Dashboard de Supabase).

// 'manuales' se añade a los 4 roles a propósito: es el único archivo de
// documentos que ve todo el mundo, sea cual sea su acceso al resto del panel.
// 'clientes' (ClientesAdmin.jsx: contabilidad, contratos, cobros) y
// 'clientes-equipo' (ClientesEquipo.jsx: solo sus clientes asignados,
// Seguimiento y Valoración) son dos vistas distintas a propósito — un
// técnico no debe ver importes ni poder editar/borrar clientes, solo
// trabajar con los suyos.
// 'mi-ficha' (MiFicha.jsx) es la vista de auto-servicio del equipo técnico:
// su propia ficha, su pago, su seguimiento semanal y su contacto/revisiones
// — recortado a "lo suyo", sin las acciones de gestión de Equipo.jsx (que
// sigue siendo solo admin). Se la damos también a admin porque Raúl es a
// la vez entrenador con clientes propios asignados (ver ClientesEquipo.jsx).
export const SECCIONES_POR_ROL = {
  admin: ['dashboard', 'ventas', 'clientes', 'clientes-equipo', 'equipo', 'mi-ficha', 'comunicacion', 'finanzas', 'onboarding', 'operaciones', 'tareas', 'manuales'],
  closer: ['ventas', 'comunicacion', 'manuales'],
  tecnico: ['clientes-equipo', 'mi-ficha', 'operaciones', 'tareas', 'comunicacion', 'manuales'],
  contenido: ['operaciones', 'comunicacion', 'manuales'],
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
