// Aviso en pantalla cuando una escritura a Supabase falla.
//
// Por qué existe: las funciones de src/lib/queries son "dispara y olvida" —
// el componente actualiza su estado de React y llama a insert/update sin
// esperar respuesta. Si Supabase rechazaba la fila, el error solo se escribía
// en la consola del navegador y la app seguía como si nada: el usuario veía
// su cambio en pantalla, pero no estaba guardado y al recargar desaparecía.
// Así se perdieron 12 días de valoraciones (agosto 2026: faltaba la columna
// diagnostico_diferencial porque la migración 52 nunca se ejecutó en
// Supabase, y nadie se enteró hasta que un técnico dijo "no me aparece").
//
// Es un módulo con estado propio (no React), igual que demoGuard, para poder
// llamarlo desde las funciones de consulta, que no son componentes.
// AvisoErrores.jsx se suscribe y lo pinta.

const suscriptores = new Set()
let ultimoId = 0

// La llaman todas las escrituras de src/lib/queries cuando Supabase devuelve
// error. Devuelve el propio error para poder encadenar
// (`return avisaErrorGuardado(...)`) y que quien llame decida si además
// deshace su cambio local, como hace ValoracionCliente.
export function avisaErrorGuardado(origen, error) {
  // Se mantiene el console.error de siempre: sigue siendo lo más cómodo para
  // depurar y el aviso de pantalla no lo sustituye.
  console.error(origen, error?.message || error)
  const aviso = {
    id: ++ultimoId,
    // El origen viene con el formato '[tabla] operación error:' — se limpia
    // la cola para que quede legible en el detalle técnico del aviso.
    origen: String(origen || '').replace(/\s*error\s*:?\s*$/i, '').replace(/[:\s]+$/, ''),
    mensaje: error?.message || 'Error desconocido',
  }
  suscriptores.forEach((fn) => fn(aviso))
  return error
}

export function suscribirAvisosGuardado(fn) {
  suscriptores.add(fn)
  return () => { suscriptores.delete(fn) }
}
