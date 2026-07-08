// Registro de gastos profesionales (de la empresa). Incluye tanto gastos
// añadidos a mano (material, software, publicidad no contabilizada en KPI Ads, etc.)
// como los pagos al equipo (comisión + fijo de closers, tarifa de técnicos) que
// se generan automáticamente desde Equipo al marcar un mes como "pagado".
//
// { id, fecha: 'YYYY-MM-DD', concepto: '', importe: 0, categoria: '', notas: '',
//   origen: 'manual' | 'equipo', personaNombre?: '', mes?: 'YYYY-MM' }
const gastosProfesionales = []

export default gastosProfesionales
