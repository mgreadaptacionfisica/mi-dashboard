// Lógica compartida de actividad/pago del equipo técnico, extraída de
// Equipo.jsx (vista de admin) para poder reutilizarla también en MiFicha.jsx
// (vista de auto-servicio del propio técnico) sin duplicar código.

const MESES_ES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
}

const NOMBRES_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

// Acepta fechas en formato ISO (2026-07-08) o en texto largo en español
// (7 de junio de 2026), que es como llegan los clientes sincronizados de Notion.
export function parseFechaFlexible(value) {
  if (!value) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const esLarga = /^(\d{1,2}) de ([a-záéíóúñ]+) de (\d{4})/i.exec(value.trim())
  if (esLarga) {
    const mes = MESES_ES[esLarga[2].toLowerCase()]
    if (mes) return new Date(Number(esLarga[3]), mes - 1, Number(esLarga[1]))
  }
  return null
}

export function mesesEntreFechas(inicio, fin) {
  if (!inicio) return []
  const start = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  const limite = fin || new Date()
  const end = new Date(limite.getFullYear(), limite.getMonth(), 1)
  if (end < start) return []
  const meses = []
  let cursor = start
  let guard = 0
  while (cursor <= end && guard < 240) {
    meses.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    guard += 1
  }
  return meses
}

export function mesActualISO() {
  return new Date().toISOString().slice(0, 7)
}

export function mesLabel(mesKey) {
  const [y, m] = (mesKey || '').split('-')
  const nombre = NOMBRES_MES[Number(m) - 1]
  if (!nombre) return mesKey
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${y}`
}

// Tarifa por cliente activo del equipo técnico, según volumen total asignado.
export function tarifaPorClientes(n) {
  if (n <= 20) return 30
  if (n <= 40) return 35
  return 40
}

// Clientes (activos e históricos) asignados a un técnico, tarifa actual y
// desglose mensual de pago derivado en vivo de las fechas de cada cliente.
export function actividadTecnico(persona, clientes) {
  const clientesAsignados = clientes.filter((cliente) => {
    const asignados = cliente.Trabajadores || (cliente.Trabajador ? [cliente.Trabajador] : [])
    return asignados.includes(persona.nombre)
  })
  const activos = clientesAsignados.filter((c) => (c['Estado del cliente'] || '').toUpperCase() === 'ACTIVO')
  const tarifaActual = tarifaPorClientes(activos.length)
  const totalMes = activos.length * tarifaActual

  const conteoPorMes = {}
  clientesAsignados.forEach((cliente) => {
    const inicio = parseFechaFlexible(cliente['Fecha inicio'])
    if (!inicio) return
    const estado = (cliente['Estado del cliente'] || '').toUpperCase()
    const fin = estado === 'NO ACTIVO' ? parseFechaFlexible(cliente['Fecha fin']) : null
    mesesEntreFechas(inicio, fin).forEach((mes) => {
      conteoPorMes[mes] = (conteoPorMes[mes] || 0) + 1
    })
  })

  const historial = Object.keys(conteoPorMes)
    .sort((a, b) => b.localeCompare(a))
    .map((mes) => {
      const n = conteoPorMes[mes]
      const tarifa = tarifaPorClientes(n)
      return { mes, clientes: n, tarifa, total: n * tarifa }
    })

  return { clientesAsignados, totalAsignados: clientesAsignados.length, activos: activos.length, tarifaActual, totalMes, historial }
}

// Resumen del seguimiento semanal (progreso de tareas revisadas de la
// semana actual, por cliente y agregado) para los clientes de un técnico.
export function seguimientoTecnico(clientesAsignados, seguimientos, helpers) {
  const { semanaActualISO, progresoSemana, ultimaRevisionCliente } = helpers
  const semanaActual = semanaActualISO()
  let totalTareas = 0
  let totalRevisadas = 0
  let ultimaRevisionGeneral = null

  const resumenClientes = clientesAsignados.map((cliente) => {
    const registroActual = seguimientos.find((s) => s.clienteNombre === cliente.Nombre && s.semana === semanaActual)
    const progreso = progresoSemana(registroActual)
    const ultima = ultimaRevisionCliente(seguimientos, cliente.Nombre)
    totalTareas += progreso.total
    totalRevisadas += progreso.revisadas
    if (ultima && (!ultimaRevisionGeneral || ultima > ultimaRevisionGeneral)) ultimaRevisionGeneral = ultima
    return { cliente, progreso, ultimaRevision: ultima }
  })

  const revisionesRecientes = clientesAsignados
    .flatMap((cliente) =>
      seguimientos
        .filter((s) => s.clienteNombre === cliente.Nombre)
        .flatMap((s) => (s.revisiones || []).map((r) => ({ ...r, clienteNombre: cliente.Nombre })))
    )
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
    .slice(0, 15)

  return {
    resumenClientes,
    porcentajeGeneral: totalTareas > 0 ? Math.round((totalRevisadas / totalTareas) * 100) : null,
    ultimaRevisionGeneral,
    revisionesRecientes,
  }
}

// Progreso agregado del contacto semanal (3 checks por cliente) de la semana actual.
export function contactoTecnico(clientesAsignados, contactosSemanales, helpers) {
  const { semanaActualISO, progresoContacto } = helpers
  const semanaActual = semanaActualISO()
  let hechos = 0
  const total = clientesAsignados.length * 3
  clientesAsignados.forEach((cliente) => {
    const registro = contactosSemanales.find((c) => c.clienteNombre === cliente.Nombre && c.semana === semanaActual)
    hechos += progresoContacto(registro).hechos
  })
  return { hechos, total, porcentaje: total > 0 ? Math.round((hechos / total) * 100) : null }
}
