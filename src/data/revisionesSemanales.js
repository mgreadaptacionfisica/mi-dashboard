// Check final del seguimiento semanal por cliente (ver
// supabase-sql/45_revisiones_semanales_cliente.sql). Fallback estático
// vacío: ningún cliente tiene ninguna semana marcada como revisada
// todavía, hasta que se marque desde el panel.
//
// { id, clienteNombre, semana: 'YYYY-MM-DD' (lunes), revisado: boolean, revisadoEn, revisadoPor }
const revisionesSemanales = []

export default revisionesSemanales
