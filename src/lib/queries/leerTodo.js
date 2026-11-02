import { supabase } from '../supabaseClient'

// Supabase (PostgREST) devuelve como mucho 1000 filas por consulta y corta
// SIN avisar: no hay error, simplemente faltan filas. Con `select('*')` a
// secas, cuando una tabla pasa de 1000 el panel deja de ver parte de ellas
// (y no siempre las mismas, porque sin orden la base las da como quiere).
// Pasó con `contactos_semanales` en noviembre 2026: el técnico marcaba el
// contacto, se guardaba bien, y al recargar no aparecía porque esa fila
// caía fuera de las 1000 leídas.
//
// Esto lee la tabla entera por páginas. El orden final por `id` (todas las
// tablas lo tienen como clave primaria) hace que las páginas no se solapen
// ni se salten filas. `ajustar` recibe la consulta para añadirle filtros u
// órdenes propios antes del de `id`.
const PAGINA = 1000

export async function leerTodo(tabla, ajustar = (consulta) => consulta) {
  const filas = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await ajustar(supabase.from(tabla).select('*'))
      .order('id', { ascending: true })
      .range(desde, desde + PAGINA - 1)
    if (error) return { data: null, error }
    filas.push(...data)
    if (data.length < PAGINA) return { data: filas, error: null }
  }
}
