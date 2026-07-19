// Seguimiento semanal de entrenamiento por cliente (equivalente a la hoja
// "SEGUIMIENTO SEMANAL PACIENTES" de Google Sheets).
//
// Cada registro es la semana de UN cliente concreto: qué bloques/fases de su
// plan se le asignaron cada día (lunes-domingo), y un comentario semanal
// general. Cada tarea se revisa de forma individual (no el día entero), y
// guarda la fecha en la que se marcó como revisada para poder calcular la
// "última revisión" de cada cliente/profesional.
//
// La semana se identifica por el lunes de esa semana en formato ISO
// (YYYY-MM-DD), igual que antes se usaba una pestaña por semana en Excel.
//
// Forma de cada registro:
// {
//   clienteNombre: 'DAVID GALLARDO',
//   semana: '2026-07-06',
//   dias: {
//     lunes: { tareas: [
//       { texto: 'DIA', revisado: true, revisadoEn: '2026-07-06' },
//       { texto: 'A/1', revisado: false, revisadoEn: null },
//     ] },
//     martes: { tareas: [] },
//     miercoles: { tareas: [] },
//     jueves: { tareas: [] },
//     viernes: { tareas: [] },
//     sabado: { tareas: [] },
//     domingo: { tareas: [] },
//   },
//   comentarios: '',
//   cambiosPendientes: [
//     { texto: 'Subir carga en press militar', hecho: false, hechoEn: null },
//   ],
// }
const seguimientos = []

export default seguimientos
