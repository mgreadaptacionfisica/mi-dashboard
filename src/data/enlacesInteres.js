// Fallback estático de "Enlaces de interés" (sección admin-only). Empieza
// vacío a propósito: no había nada equivalente antes de crear la tabla en
// Supabase (supabase-sql/50_enlaces_interes.sql), así que no hay datos
// históricos que migrar aquí.
//
// Forma de cada registro:
// { id: string, titulo: string, enlace: string }
export default []
