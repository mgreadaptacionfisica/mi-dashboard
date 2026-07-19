// Cierres del "check final" del seguimiento semanal (ver
// supabase-sql/44_cierres_seguimiento_semanal.sql). Fallback estático
// vacío: nadie tiene ninguna semana cerrada todavía hasta que se marque
// desde el panel.
//
// { id, persona, semana: 'YYYY-MM-DD' (lunes), cerrado: boolean, cerradoEn, cerradoPor }
const cierresSeguimiento = []

export default cierresSeguimiento
