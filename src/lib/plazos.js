// Genera el plan de cobros en `n` plazos iguales, con fechas mensuales a
// partir de hoy. Compartido por Clientes.jsx (alta manual, máx. 3 plazos) y
// Ventas.jsx (venta cerrada desde el pipeline, hasta 12 plazos): antes cada
// uno construía el cliente a su manera y Ventas.jsx no generaba este array
// en absoluto, así que las ventas cerradas desde el pipeline nunca
// aparecían en Clientes > Cobros pendientes ni generaban el ingreso
// automático en Finanzas > Ingresos empresa (que depende de este `Plazos`,
// no de los campos sueltos "Primer pago"/"Segundo pago"/"Tercer pago").
export function generarPlazosPorNumero(n, importeTotal) {
  const total = Number(importeTotal) || 0
  const numero = Number(n) || 1
  if (total <= 0 || numero <= 0) return []
  const base = Math.round((total / numero) * 100) / 100
  const hoy = new Date()
  return Array.from({ length: numero }, (_, i) => {
    const fecha = new Date(hoy)
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
