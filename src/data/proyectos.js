// Fallback estático de "Proyectos" (sección admin-only). Empieza vacío a
// propósito: la sección nace con la tabla de Supabase
// (supabase-sql/55_proyectos.sql), no hay datos históricos que migrar.
//
// Forma de cada registro:
// { id: string, nombre: string, descripcion: string, fechaObjetivo: string|null,
//   prioridad: 'alta'|'media'|'baja', estado: 'planificado'|'en_curso'|'completado',
//   ambito: 'personal'|'profesional', createdAt: string|null }
export default []
