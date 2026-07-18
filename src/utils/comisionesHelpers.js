// Comisiones de pasarela de pago (Stripe/Hotmart/...). Ver
// supabase-sql/39_tarifas_pasarela.sql para las tarifas de partida.
//
// Decisión de contabilidad (confirmada con Raúl): el ingreso se sigue
// registrando por el importe BRUTO que paga el cliente — la comisión se
// registra aparte, como un gasto de categoría "Comisión pasarela". Así el
// balance ya descuenta la comisión sola, pero se puede ver por separado
// cuánto se factura de verdad y cuánto se comen las comisiones.
//
// La "reserva de seguridad" de Hotmart (parte del cobro que no se paga de
// golpe) no genera una segunda fila de ingreso — eso duplicaría el ingreso
// ya reconocido. Se añade como nota informativa en el ingreso, con el
// importe retenido y la fecha prevista de liberación.

export function calcularComision(importeBruto, tarifa) {
  if (!tarifa) return 0
  const pct = Number(tarifa.porcentaje) || 0
  const fijo = Number(tarifa.fijo) || 0
  const bruto = Number(importeBruto) || 0
  if (bruto <= 0) return 0
  return Math.round((bruto * (pct / 100) + fijo) * 100) / 100
}

function sumarDiasISO(fechaISO, dias) {
  const d = new Date(fechaISO)
  d.setDate(d.getDate() + Number(dias || 0))
  return d.toISOString().slice(0, 10)
}

// Construye (si aplica) el gasto de comisión a insertar en gastos_empresa
// junto al ingreso de un cobro, más una nota informativa de reserva de
// seguridad (Hotmart) para añadir al ingreso. idBase debe ser el mismo id
// que se usa para el ingreso, para poder deshacer el cobro y borrar la
// comisión asociada sin dejar restos.
export function construirComisionCobro({ idBase, fecha, importeBruto, tarifa }) {
  const comision = calcularComision(importeBruto, tarifa)
  const reservaPct = tarifa ? Number(tarifa.reservaPct) || 0 : 0
  const reservaDias = tarifa ? Number(tarifa.reservaDias) || 0 : 0

  let notaReserva = ''
  if (reservaPct > 0) {
    const neto = Math.round(((Number(importeBruto) || 0) - comision) * 100) / 100
    const importeReserva = Math.round((neto * reservaPct / 100) * 100) / 100
    const fechaLiberacion = sumarDiasISO(fecha, reservaDias)
    notaReserva = `${tarifa.pasarela || tarifa.id} retiene ${importeReserva.toLocaleString('es-ES')}€ (${reservaPct}% del neto) como reserva de seguridad — liberación prevista el ${fechaLiberacion}.`
  }

  const gasto = comision > 0
    ? {
      id: `${idBase}-comision`,
      fecha,
      concepto: `Comisión ${tarifa.pasarela || tarifa.id}`,
      importe: comision,
      notas: `Comisión automática sobre un cobro de ${(Number(importeBruto) || 0).toLocaleString('es-ES')}€.`,
      categoria: 'Comisión pasarela',
      origen: 'comision_pasarela',
    }
    : null

  return { gasto, notaReserva, comision }
}
