/**
 * Datos reales exportados desde Notion (CLIENTES).
 * Para actualizar: exporta de nuevo el CSV desde Notion y ejecuta el script de conversión.
 */
import DATA from '../data.json'

export async function fetchKPIs() {
  const { kpis } = DATA
  return {
    clientes_activos:   kpis.clientes_activos,
    clientes_no_activos: kpis.clientes_no_activos,
    total_clientes:     kpis.total_clientes,
    high_ticket:        kpis.high_ticket,
    low_ticket:         kpis.low_ticket,
    ingresos_registrados: kpis.ingresos_registrados,
    tasa_retencion:     kpis.tasa_retencion,
  }
}

export async function fetchClientesPorServicio() {
  return DATA.clientes_por_servicio
}

export async function fetchClientesPorFormaPago() {
  return DATA.clientes_por_forma_pago
}

export async function fetchProximasRenovaciones() {
  return DATA.proximas_renovaciones
}

export async function fetchTodosLosClientes() {
  return DATA.todos_los_clientes
}
