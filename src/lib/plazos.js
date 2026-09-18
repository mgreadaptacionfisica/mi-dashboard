// Genera el plan de cobros en `n` plazos iguales, con fechas mensuales a
// partir de hoy. Compartido por Clientes.jsx (alta manual, máx. 3 plazos) y
// Ventas.jsx (venta cerrada desde el pipeline, hasta 12 plazos): antes cada
// uno construía el cliente a su manera y Ventas.jsx no generaba este array
// en absoluto, así que las ventas cerradas desde el pipeline nunca
// aparecían en Clientes > Cobros pendientes ni generaban el ingreso
// automático en Finanzas > Ingresos empresa (que depende de este `Plazos`,
// no de los campos sueltos "Primer pago"/"Segundo pago"/"Tercer pago").
export function generarPlazosPorNumero(n, importeTotal) {
  return generarPlazosDesdeFecha(n, importeTotal, null)
}

// Igual que generarPlazosPorNumero, pero con la fecha de inicio del primer
// plazo configurable (los siguientes van mensuales a partir de ahí). Se usa
// para los cobros de RENOVACIÓN, cuyo primer pago no es "hoy" sino la fecha
// de renovación que ponga Raúl en la ficha. Si no se pasa fecha válida,
// arranca en hoy (comportamiento del contrato inicial de siempre).
export function generarPlazosDesdeFecha(n, importeTotal, fechaInicioISO) {
  const total = Number(importeTotal) || 0
  const numero = Number(n) || 1
  if (total <= 0 || numero <= 0) return []
  const base = Math.round((total / numero) * 100) / 100
  // El último plazo se lleva el descuadre de los redondeos (1.000€ en 3 no da
  // 333,33 × 3), para que la suma de los plazos sea exactamente el total
  // contratado y no falten céntimos en Finanzas.
  const ultimo = Math.round((total - base * (numero - 1)) * 100) / 100
  const inicio = /^\d{4}-\d{2}-\d{2}$/.test(fechaInicioISO || '')
    ? new Date(`${fechaInicioISO}T00:00:00`)
    : new Date()
  return Array.from({ length: numero }, (_, i) => {
    const fecha = new Date(inicio)
    fecha.setMonth(fecha.getMonth() + i)
    return {
      numero: i + 1,
      importe: i === numero - 1 ? ultimo : base,
      fecha: fechaLocalISO(fecha),
      pagado: false,
      fechaPago: null,
    }
  })
}

// Las fechas se construyen en hora LOCAL (`...T00:00:00`), así que no se
// pueden serializar con toISOString(): en España eso resta 1-2 horas y
// devuelve el día anterior (pedías el 1 de octubre y salía el 30 de
// septiembre). Se formatea a mano con el día local.
function fechaLocalISO(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}
