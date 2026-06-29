/**
 * Capa de API — conecta con tu backend real.
 * Por defecto usa datos de ejemplo para que el dashboard funcione de inmediato.
 * Para conectar tu API: cambia USE_MOCK_DATA a false y ajusta BASE_URL.
 */

const USE_MOCK_DATA = true  // ← Pon en false cuando tengas tu API lista
const BASE_URL = '/api'     // ← Ajusta según la URL de tu backend

// ─── Helper de fetch ────────────────────────────────────────────────────────

async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      // Añade aquí tu token si lo necesitas:
      // 'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
  return res.json()
}

// ─── Datos de ejemplo (mock) ─────────────────────────────────────────────────

const MOCK = {
  kpis: {
    ventas_totales: 128450,
    ventas_cambio: +12.4,
    clientes_activos: 3842,
    clientes_cambio: +8.1,
    ticket_promedio: 334,
    ticket_cambio: +3.7,
    tasa_retencion: 87.2,
    retencion_cambio: -1.2,
  },

  ventas_mensuales: [
    { mes: 'Ene', ventas: 82000, meta: 80000 },
    { mes: 'Feb', ventas: 75000, meta: 82000 },
    { mes: 'Mar', ventas: 91000, meta: 85000 },
    { mes: 'Abr', ventas: 88000, meta: 87000 },
    { mes: 'May', ventas: 105000, meta: 90000 },
    { mes: 'Jun', ventas: 128450, meta: 95000 },
  ],

  clientes_por_segmento: [
    { segmento: 'Premium', cantidad: 412 },
    { segmento: 'Estándar', cantidad: 1850 },
    { segmento: 'Básico', cantidad: 1580 },
  ],

  clientes_recientes: [
    { id: 1, nombre: 'Empresa ABC S.A.', email: 'contacto@abc.com', plan: 'Premium', estado: 'activo', valor: 4200 },
    { id: 2, nombre: 'Tech Solutions', email: 'info@techsol.com', plan: 'Estándar', estado: 'activo', valor: 1800 },
    { id: 3, nombre: 'Distribuidora Norte', email: 'ventas@dnorte.com', plan: 'Básico', estado: 'pendiente', valor: 650 },
    { id: 4, nombre: 'Grupo Meridian', email: 'admin@meridian.com', plan: 'Premium', estado: 'activo', valor: 5500 },
    { id: 5, nombre: 'Comercial Sur Ltda.', email: 'info@csur.com', plan: 'Estándar', estado: 'inactivo', valor: 1200 },
  ],
}

// ─── Endpoints públicos ───────────────────────────────────────────────────────

export async function fetchKPIs() {
  if (USE_MOCK_DATA) return MOCK.kpis
  return request('/kpis')
}

export async function fetchVentasMensuales(periodo = '6m') {
  if (USE_MOCK_DATA) return MOCK.ventas_mensuales
  return request(`/ventas/mensuales?periodo=${periodo}`)
}

export async function fetchClientesPorSegmento() {
  if (USE_MOCK_DATA) return MOCK.clientes_por_segmento
  return request('/clientes/segmentos')
}

export async function fetchClientesRecientes() {
  if (USE_MOCK_DATA) return MOCK.clientes_recientes
  return request('/clientes/recientes')
}
