import { useMemo } from 'react'
import KPICard from './KPICard'
import CalendarioAvisos from './CalendarioAvisos'
import { parseFechaFlexible, formatFechaISO } from '../utils/fechasEsp'
import { calcularEmbudo, filtrarPorPeriodo, rangoPeriodo, semaforo } from '../utils/embudoVentas'
import {
  semanaActualISO, mondayOf, toISO, pendientesDeCliente, progresoContacto, progresoSemana,
} from '../utils/seguimientoHelpers'

// Dashboard: la pantalla de "¿cómo va el negocio hoy?", a petición de Raúl con
// el mínimo ruido posible. Solo tres preguntas, en este orden:
//   1. ¿Qué requiere acción hoy?  (lo que se escapa si no se mira)
//   2. ¿Cómo van las ventas?      (llamadas, asistencia, cierre, dinero del mes)
//   3. ¿Cómo va el seguimiento?   (equipo al día, contacto, renovaciones)
//
// Se quitaron a propósito (no se usaban para decidir nada): los gráficos de
// clientes por servicio y forma de pago, el total de ingresos de empresa, la
// tasa de retención y el aviso de vídeos editados (eso vive en Operaciones).
// Los números de ventas salen del mismo sitio que la pestaña 🩺 Embudo
// (utils/embudoVentas.js), para que no haya dos formas distintas de calcular
// la misma tasa de cierre.

function euro(n) {
  return `${Math.round(Number(n) || 0).toLocaleString('es-ES')}€`
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function diasEntre(isoDesde, isoHasta) {
  const a = new Date(`${isoDesde}T00:00:00`)
  const b = new Date(`${isoHasta}T00:00:00`)
  return Math.round((b - a) / 86400000)
}

function diasLabel(dias) {
  if (dias < 0) return `Venció hace ${Math.abs(dias)}d`
  if (dias === 0) return 'Vence hoy'
  return `${dias}d restantes`
}

function diasColor(dias) {
  if (dias < 0) return '#ef4444'
  if (dias <= 15) return '#f59e0b'
  return '#10b981'
}

const esActivo = (c) => (c['Estado del cliente'] || '').toUpperCase() === 'ACTIVO'

// Domingo de la semana en curso, para contar las llamadas de la semana.
function finDeSemanaISO() {
  const d = mondayOf(new Date())
  d.setDate(d.getDate() + 6)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function inicioDeSemanaISO() {
  const d = mondayOf(new Date())
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Dashboard({
  clientes = [], ventas = [], recontactos = [], tareasPersonales = [],
  seguimientos = [], contactosSemanales = [], revisionesSemanales = [], onNavigate,
}) {
  const hoy = todayISO()
  const semanaActual = semanaActualISO()
  const activos = useMemo(() => clientes.filter(esActivo), [clientes])

  // ————— Ventas —————
  const ventasMes = useMemo(() => {
    const embudo = calcularEmbudo(filtrarPorPeriodo(ventas, rangoPeriodo('mes')))
    // El dinero va por fecha de cierre (lo cobrado/firmado este mes), no por
    // la fecha de la llamada: mismo criterio que Finanzas y el resumen semanal.
    const mes = hoy.slice(0, 7)
    const cierres = ventas.filter((l) => l.etapa === 'ganada' && (l.venta?.fechaCierre || '').slice(0, 7) === mes)
    return {
      embudo,
      cierres: cierres.length,
      vendido: cierres.reduce((t, l) => t + (Number(l.venta?.importe) || 0), 0),
    }
  }, [ventas, hoy])

  const llamadas = useMemo(() => {
    const desde = inicioDeSemanaISO()
    const hasta = finDeSemanaISO()
    const enSemana = ventas.filter((l) => l.fechaAgenda && l.fechaAgenda >= desde && l.fechaAgenda <= hasta)
    return {
      semana: enSemana.length,
      hoy: ventas.filter((l) => l.fechaAgenda === hoy && l.etapa === 'agendada').length,
      // Llamadas que ya pasaron y siguen sin resultado: mientras estén así,
      // no cuentan en ninguna tasa.
      sinMarcar: ventas.filter((l) => l.etapa === 'agendada' && l.fechaAgenda && l.fechaAgenda < hoy).length,
    }
  }, [ventas, hoy])

  // Gente a la que tocaba volver a escribir y sigue sin hacerse: leads en
  // seguimiento con fecha de recontacto cumplida + filas de la tabla de
  // recontactos (las dos fuentes que usa la pestaña 🔁 Recontactar).
  const recontactosVencidos = useMemo(() => {
    const deLeads = ventas.filter((l) => l.recontacto?.fechaContacto && !l.recontacto?.contactado && l.recontacto.fechaContacto <= hoy && l.etapa !== 'ganada' && l.etapa !== 'perdida').length
    const deTabla = recontactos.filter((r) => r.fechaContacto && !r.contactado && r.fechaContacto <= hoy).length
    return deLeads + deTabla
  }, [ventas, recontactos, hoy])

  // ————— Seguimiento —————
  const seguimiento = useMemo(() => {
    const pendientes = activos.map((c) => pendientesDeCliente(c, {
      seguimientos, revisionesSemanales, contactos: contactosSemanales, semanaActual,
    }))
    const atrasados = pendientes.filter((p) => p.atrasado)
    let contactoHechos = 0
    let sesionesSinMarcar = 0
    let sinSesiones = 0
    activos.forEach((c) => {
      const contacto = contactosSemanales.find((x) => x.clienteNombre === c.Nombre && x.semana === semanaActual)
      contactoHechos += progresoContacto(contacto).hechos
      const seg = seguimientos.find((s) => s.clienteNombre === c.Nombre && s.semana === semanaActual)
      const progreso = progresoSemana(seg)
      if (progreso.total === 0) sinSesiones += 1
      else sesionesSinMarcar += progreso.total - progreso.revisadas
    })
    return {
      alDia: activos.length - atrasados.length,
      atrasados: atrasados.length,
      contactoHechos,
      contactoTotal: activos.length * 3,
      sesionesSinMarcar,
      sinSesiones,
    }
  }, [activos, seguimientos, contactosSemanales, revisionesSemanales, semanaActual])

  // ————— Clientes: pausas, renovaciones y cobros —————
  const pausasAviso = useMemo(() => clientes
    .filter((c) => (c['Estado del cliente'] || '').toUpperCase() === 'EN PAUSA')
    .map((c) => ({
      id: c.id || c.Nombre,
      nombre: c.Nombre,
      fecha: parseFechaFlexible(c['Fecha fin de pausa']),
      motivo: c['Motivo de la pausa'] || '',
    }))
    .filter((p) => p.fecha && p.fecha <= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha)), [clientes, hoy])

  const renovaciones = useMemo(() => activos
    .map((c) => {
      const fechaFinISO = parseFechaFlexible(c['Fecha fin'])
      return {
        id: c.id || c.Nombre,
        nombre: c.Nombre,
        servicio: c['Servicio contratado'],
        fechaFin: fechaFinISO,
        diasRestantes: fechaFinISO ? diasEntre(hoy, fechaFinISO) : null,
      }
    })
    .filter((c) => c.fechaFin)
    .sort((a, b) => a.diasRestantes - b.diasRestantes), [activos, hoy])

  const renuevanPronto = renovaciones.filter((r) => r.diasRestantes <= 30).length

  // Plazos con fecha ya pasada y sin cobrar: dinero que está fuera.
  const cobrosVencidos = useMemo(() => {
    let total = 0
    let importe = 0
    clientes.forEach((c) => {
      (c.Plazos || []).forEach((p) => {
        if (!p.pagado && p.fecha && p.fecha <= hoy) {
          total += 1
          importe += Number(p.importe) || 0
        }
      })
    })
    return { total, importe }
  }, [clientes, hoy])

  const tareasAviso = useMemo(() => tareasPersonales
    .filter((t) => !t.hecha && t.fecha && t.fecha <= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha)), [tareasPersonales, hoy])

  // ————— Lo que requiere acción hoy —————
  // Una sola lista, ordenada por gravedad: es lo primero que se lee al entrar
  // y cada línea lleva a la sección donde se arregla.
  const acciones = useMemo(() => {
    const items = []
    if (llamadas.hoy > 0) items.push({ icono: '📞', texto: `${llamadas.hoy} llamada${llamadas.hoy === 1 ? '' : 's'} agendada${llamadas.hoy === 1 ? '' : 's'} para hoy`, seccion: 'ventas', tono: 'info' })
    if (llamadas.sinMarcar > 0) items.push({ icono: '❓', texto: `${llamadas.sinMarcar} llamada${llamadas.sinMarcar === 1 ? '' : 's'} ya pasada${llamadas.sinMarcar === 1 ? '' : 's'} sin marcar el resultado`, seccion: 'ventas', tono: 'alerta' })
    if (recontactosVencidos > 0) items.push({ icono: '🔁', texto: `${recontactosVencidos} recontacto${recontactosVencidos === 1 ? '' : 's'} con la fecha cumplida`, seccion: 'ventas', tono: 'alerta' })
    if (seguimiento.atrasados > 0) items.push({ icono: '🚨', texto: `${seguimiento.atrasados} cliente${seguimiento.atrasados === 1 ? '' : 's'} con seguimiento atrasado (semanas sin cerrar)`, seccion: 'clientes-equipo', tono: 'alerta' })
    if (seguimiento.sinSesiones > 0) items.push({ icono: '📋', texto: `${seguimiento.sinSesiones} cliente${seguimiento.sinSesiones === 1 ? '' : 's'} sin ninguna sesión registrada esta semana`, seccion: 'clientes-equipo', tono: 'info' })
    if (cobrosVencidos.total > 0) items.push({ icono: '💸', texto: `${cobrosVencidos.total} plazo${cobrosVencidos.total === 1 ? '' : 's'} vencido${cobrosVencidos.total === 1 ? '' : 's'} sin cobrar · ${euro(cobrosVencidos.importe)}`, seccion: 'clientes', tono: 'alerta' })
    if (renuevanPronto > 0) items.push({ icono: '🔄', texto: `${renuevanPronto} cliente${renuevanPronto === 1 ? '' : 's'} renueva${renuevanPronto === 1 ? '' : 'n'} en 30 días o menos`, seccion: 'clientes', tono: 'info' })
    if (pausasAviso.length > 0) items.push({ icono: '⏸️', texto: `${pausasAviso.length} cliente${pausasAviso.length === 1 ? '' : 's'} en pausa a los que ya toca retomar: ${pausasAviso.slice(0, 3).map((p) => `${p.nombre} (${formatFechaISO(p.fecha)})`).join(', ')}`, seccion: 'clientes', tono: 'alerta' })
    if (tareasAviso.length > 0) items.push({ icono: '🔔', texto: `${tareasAviso.length} tarea${tareasAviso.length === 1 ? '' : 's'} tuya${tareasAviso.length === 1 ? '' : 's'} para hoy o vencida${tareasAviso.length === 1 ? '' : 's'}: ${tareasAviso.slice(0, 2).map((t) => t.texto).join(' · ')}`, seccion: 'tareas', tono: 'info' })
    return items.sort((a, b) => (a.tono === 'alerta' ? 0 : 1) - (b.tono === 'alerta' ? 0 : 1))
  }, [llamadas, recontactosVencidos, seguimiento, cobrosVencidos, renuevanPronto, pausasAviso, tareasAviso])

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const e = ventasMes.embudo
  const colorTexto = (valor, clave, muestra) => `dash-texto-${semaforo(valor, clave, muestra)}`

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-subtitle">{today}</div>
        </div>
      </header>

      <main className="page-content">
        <div className="dash-acciones">
          <div className="dash-acciones-titulo">⚡ Requiere acción</div>
          {acciones.length === 0 ? (
            <p className="dash-acciones-ok">✅ Nada pendiente: llamadas marcadas, seguimiento al día y sin cobros vencidos.</p>
          ) : (
            <ul>
              {acciones.map((a, i) => (
                <li key={i} className={`dash-accion dash-accion-${a.tono}`}>
                  <button type="button" onClick={() => onNavigate?.(a.seccion)}>
                    <span>{a.icono}</span> {a.texto}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-title" style={{ margin: '4px 0 10px' }}>💰 Ventas de este mes</div>
        <div className="kpi-grid">
          <KPICard
            label="Vendido este mes"
            value={euro(ventasMes.vendido)}
            subtext={`${ventasMes.cierres} venta${ventasMes.cierres === 1 ? '' : 's'} cerrada${ventasMes.cierres === 1 ? '' : 's'}`}
            type="text" icon="💰" iconBg="#d1fae5" accent="#10b981"
          />
          <KPICard
            label="Llamadas esta semana"
            value={llamadas.semana}
            subtext={llamadas.hoy > 0 ? `${llamadas.hoy} hoy` : 'ninguna hoy'}
            type="number" icon="📞" iconBg="#dbeafe" accent="#3b82f6"
          />
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Asistencia (mes)</span>
              <div className="kpi-icon" style={{ background: '#e0e7ff' }}>🙋</div>
            </div>
            <div className={`kpi-card-value ${colorTexto(e.tasaAsistencia, 'asistencia', e.resueltosAsistencia)}`}>
              {e.tasaAsistencia === null ? '—' : `${e.tasaAsistencia}%`}
            </div>
            <div className="kpi-card-delta kpi-delta-nota">{e.asistieron} de {e.resueltosAsistencia} vinieron · objetivo 70%</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Cierre (mes)</span>
              <div className="kpi-icon" style={{ background: '#ede9fe' }}>📈</div>
            </div>
            <div className={`kpi-card-value ${colorTexto(e.tasaCierre, 'cierre', e.asistieron)}`}>
              {e.tasaCierre === null ? '—' : `${e.tasaCierre}%`}
            </div>
            <div className="kpi-card-delta kpi-delta-nota">
              de las llamadas hechas · objetivo 25% ·{' '}
              <button type="button" className="tabla-link-btn" onClick={() => onNavigate?.('ventas')}>ver embudo →</button>
            </div>
          </div>
        </div>

        <div className="card-title" style={{ margin: '4px 0 10px' }}>📋 Clientes y seguimiento</div>
        <div className="kpi-grid">
          <KPICard
            label="Clientes activos"
            value={activos.length}
            subtext={`${clientes.length} en total`}
            type="number" icon="✅" iconBg="#d1fae5" accent="#10b981"
          />
          <KPICard
            label="Seguimiento al día"
            value={`${seguimiento.alDia}/${activos.length}`}
            subtext={seguimiento.atrasados > 0 ? `${seguimiento.atrasados} con semanas sin cerrar` : 'sin nada atrasado'}
            type="text" icon="📋" iconBg={seguimiento.atrasados > 0 ? '#fee2e2' : '#d1fae5'} accent={seguimiento.atrasados > 0 ? '#ef4444' : '#10b981'}
          />
          <KPICard
            label="Contacto semanal"
            value={`${seguimiento.contactoHechos}/${seguimiento.contactoTotal}`}
            subtext="mensajes de esta semana"
            type="text" icon="🤝" iconBg="#fef3c7" accent="#f59e0b"
          />
          <KPICard
            label="Renuevan en 30 días"
            value={renuevanPronto}
            subtext={cobrosVencidos.total > 0 ? `${euro(cobrosVencidos.importe)} en plazos vencidos` : 'sin plazos vencidos'}
            type="number" icon="🔄" iconBg="#ede9fe" accent="#8b5cf6"
          />
        </div>

        <CalendarioAvisos clientes={clientes} ventas={ventas} recontactos={recontactos} />

        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">Próximas renovaciones</div>
              <div className="card-subtitle">Clientes activos que terminan antes, para preparar la renovación a tiempo</div>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Fecha fin</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {renovaciones.slice(0, 10).map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                    <td>{c.servicio}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                      {new Date(`${c.fechaFin}T00:00:00`).toLocaleDateString('es-ES')}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: diasColor(c.diasRestantes) }}>
                        {diasLabel(c.diasRestantes)}
                      </span>
                    </td>
                  </tr>
                ))}
                {renovaciones.length === 0 && (
                  <tr><td colSpan={4} className="lead-log-empty">No hay clientes activos con fecha de fin reconocible.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}
