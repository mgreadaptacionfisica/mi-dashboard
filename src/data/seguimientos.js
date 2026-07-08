// Seguimiento semanal de entrenamiento por cliente (equivalente a la hoja
// "SEGUIMIENTO SEMANAL PACIENTES" de Google Sheets).
//
// Cada registro es la semana de UN cliente concreto: qué bloques/fases de su
// plan se le asignaron cada día (lunes-domingo), si esa tarea ya fue
// revisada por el profesional, y un comentario semanal general.
//
// La semana se identifica por el lunes de esa semana en formato ISO
// (YYYY-MM-DD), igual que antes se usaba una pestaña por semana en Excel.
//
// Forma de cada registro:
// {
//   clienteNombre: 'DAVID GALLARDO',
//   semana: '2026-07-06',
//   dias: {
//     lunes:     { tareas: ['DIA', 'A/1'], revisado: true },
//     martes:    { tareas: [], revisado: false },
//     miercoles: { tareas: [], revisado: false },
//     jueves:    { tareas: [], revisado: false },
//     viernes:   { tareas: [], revisado: false },
//     sabado:    { tareas: [], revisado: false },
//     domingo:   { tareas: [], revisado: false },
//   },
//   comentarios: '',
// }
const seguimientos = []

export default seguimientos
