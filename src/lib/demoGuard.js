// Interruptor global del "Modo demo / presentación" (solo admin).
// Cuando está activo:
//  - los datos personales se enmascaran en pantalla (ver utils/modoDemo.js), y
//  - se BLOQUEA cualquier escritura a Supabase (ver supabaseClient.js), para
//    que enseñar/grabar el panel no pueda alterar ni un dato real por error.
// Es un módulo con estado propio (no React) para poder consultarlo también
// desde las funciones de consulta, que no son componentes.
let activo = false

export function activarDemo(valor) {
  activo = Boolean(valor)
}

export function esDemo() {
  return activo
}
