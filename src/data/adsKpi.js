// Registro semanal de inversión y resultados de Ads (LA SALA).
// Migrado desde la plantilla "Raúl Morales La Sala PLANTILLA Resumen Ads 2026.xlsx"
// (una pestaña por mes, con columnas Semana 1 a Semana 5). La plantilla llegó
// en blanco (todo a cero), así que este array empieza vacío: cada semana que
// no tenga registro se trata como 0 en todas las métricas.
//
// Forma de cada registro:
// {
//   mes: 'ENERO',        // uno de los 12 meses (ver MESES_ADS en components/AdsKpi.jsx)
//   semana: 1,           // 1 a 5
//   bienvenidas: 0,
//   conversaciones: 0,
//   agendas: 0,
//   llamadas: 0,
//   canceladas: 0,
//   noShow: 0,
//   ventas: 0,
//   facturado: 0,
//   cashCobrado: 0,
//   inversion: 0,
// }
const adsKpi = []

export default adsKpi
