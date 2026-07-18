// Lógica de gastos/ingresos recurrentes (Finanzas): dada una regla (importe,
// fecha de inicio, cada cuántos meses se repite, fecha fin opcional), calcula
// qué periodos ya deberían existir como filas en la tabla correspondiente y
// cuáles faltan por generar. No hay cron en el servidor — esto se ejecuta en
// el cliente cada vez que se cargan los datos (ver App.jsx), a modo de
// "catch-up": si pasan varios meses sin abrir el panel, se generan todos los
// periodos pendientes de golpe la siguiente vez que se entra.

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export const FRECUENCIAS = [
  { value: 1, label: 'Cada mes' },
  { value: 2, label: 'Cada 2 meses' },
  { value: 3, label: 'Cada 3 meses' },
  { value: 6, label: 'Cada 6 meses' },
  { value: 12, label: 'Cada año' },
]

export const TABLAS_RECURRENTES = [
  { value: 'gastos_empresa', label: 'Gasto empresa' },
  { value: 'ingresos_empresa', label: 'Ingreso empresa' },
  { value: 'gastos_personales', label: 'Gasto personal' },
  { value: 'ingresos_personales', label: 'Ingreso personal' },
]

function diasEnMes(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

// Suma n meses a una fecha ISO (YYYY-MM-DD), conservando el día del mes
// cuando existe en el mes destino y recortando al último día cuando no
// (ej. 31 de enero + 1 mes = 28/29 de febrero, no 3 de marzo).
export function sumarMeses(fechaISO, n) {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const total = (m - 1) + n
  const year = y + Math.floor(total / 12)
  const monthIndex = ((total % 12) + 12) % 12
  const dia = Math.min(d, diasEnMes(year, monthIndex))
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

// Construye la fila de ledger (ingreso/gasto) que corresponde a una regla
// en una fecha concreta. El id es determinista (regla + fecha) para que,
// aunque el catch-up se ejecute más de una vez, no se dupliquen filas.
export function construirEntradaRecurrente(regla, fecha) {
  const base = {
    id: `fin-rec-${regla.id}-${fecha}`,
    fecha,
    concepto: regla.concepto,
    importe: regla.importe,
    notas: regla.notas || '',
    reglaRecurrenteId: regla.id,
  }
  if (regla.tabla === 'gastos_empresa') return { ...base, categoria: regla.categoria || '', origen: 'recurrente' }
  if (regla.tabla === 'ingresos_empresa') return { ...base, origen: 'recurrente' }
  return base
}

// Todas las filas que debería tener ya una regla activa entre su fecha de
// inicio y hoy (o su fecha fin, si es anterior a hoy), que todavía no
// existen en `entradasExistentes`.
export function entradasPendientes(regla, entradasExistentes = [], hoyISO = todayISO()) {
  if (!regla || !regla.activa || !regla.fechaInicio) return []
  const limite = regla.fechaFin && regla.fechaFin < hoyISO ? regla.fechaFin : hoyISO
  const fechasExistentes = new Set(
    entradasExistentes.filter((e) => e.reglaRecurrenteId === regla.id).map((e) => e.fecha)
  )
  const pendientes = []
  let fecha = regla.fechaInicio
  let guard = 0
  while (fecha <= limite && guard < 240) {
    if (!fechasExistentes.has(fecha)) pendientes.push(construirEntradaRecurrente(regla, fecha))
    fecha = sumarMeses(fecha, Number(regla.frecuenciaMeses) || 1)
    guard += 1
  }
  return pendientes
}
