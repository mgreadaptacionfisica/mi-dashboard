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
  const inicio = /^\d{4}-\d{2}-\d{2}$/.test(fechaInicioISO || '')
    ? new Date(`${fechaInicioISO}T00:00:00`)
    : new Date()
  return Array.from({ length: numero }, (_, i) => {
    const fecha = new Date(inicio)
    fecha.setMonth(fecha.getMonth() + i)
    return {
      numero: i + 1,
      importe: base,
      fecha: fecha.toISOString().slice(0, 10),
      pagado: false,
      fechaPago: null,
    }
  })
}
