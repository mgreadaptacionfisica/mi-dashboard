import { useMemo, useState } from 'react'
import ContactoSemanal from './ContactoSemanal'
import SeguimientoCliente from './SeguimientoCliente'
import {
  actividadTecnico,
  seguimientoTecnico,
  contactoTecnico,
  mesActualISO,
  mesLabel,
} from '../utils/equipoHelpers'
import { semanaActualISO, progresoSemana, progresoContacto, ultimaRevisionCliente, semanaVacia, DIAS_SEMANA } from '../utils/seguimientoHelpers'
import { upsertSeguimientoRemote } from '../lib/queries/seguimientos'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const HORAS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTOS = ['00', '15', '30', '45']
const SEGUIMIENTO_HELPERS = { semanaActualISO, progresoSemana, progresoContacto, ultimaRevisionCliente }

// Vista de auto-servicio del equipo técnico: su propia ficha, su pago, su
// seguimiento semanal y su registro de contacto/revisiones — la misma
// información que antes solo veía Raúl desde Equipo.jsx (detalle de
// técnico), pero recortada a "lo mío" y sin las acciones de gestión
// (editar/eliminar miembro, marcar pago) que siguen siendo solo de admin.
// Se identifica quién ha iniciado sesión cruzando su email con su ficha en
// Equipo, mismo patrón que ClientesEquipo/MuroEquipo/VideosParaEditar.
export default function MiFicha({ team, clientes = [], seguimientos = [], setSeguimientos, contactosSemanales = [], setContactosSemanales, gastosEmpresa = [], miEmail }) {
  const [seguimientoClienteAbierto, setSeguimientoClienteAbierto] = useState(null)
  const [revisionForm, setRevisionForm] = useState({ clienteNombre: '', dia: 'lunes', hora: '10', minuto: '00', ampm: 'AM' })

  const miPersona = useMemo(
    () => (team?.tecnico || []).find((p) => p.email && miEmail && p.email.toLowerCase() === miEmail.toLowerCase()),
    [team, miEmail]
  )

  const actividad = useMemo(
    () => (miPersona ? actividadTecnico(miPersona, clientes) : null),
    [miPersona, clientes]
  )

  const seguimiento = useMemo(
    () => (actividad ? seguimientoTecnico(actividad.clientesAsignados, seguimientos, SEGUIMIENTO_HELPERS) : null),
    [actividad, seguimientos]
  )

  const contacto = useMemo(
    () => (actividad ? contactoTecnico(actividad.clientesAsignados, contactosSemanales, SEGUIMIENTO_HELPERS) : null),
    [actividad, contactosSemanales]
  )

  const mesKey = mesActualISO()
  const pagoRegistrado = miPersona && gastosEmpresa.find((g) => g.origen === 'equipo' && g.personaNombre === miPersona.nombre && g.mes === mesKey)

  const registrarRevisionPropia = (event) => {
    event.preventDefault()
    if (!revisionForm.clienteNombre || !miPersona) return
    const semanaActual = semanaActualISO()
    const horaTexto = `${revisionForm.hora}:${revisionForm.minuto} ${revisionForm.ampm}`
    const nuevaRevision = { persona: miPersona.nombre, dia: revisionForm.dia, hora: horaTexto, fecha: todayISO() }

    const existente = seguimientos.find((s) => s.clienteNombre === revisionForm.clienteNombre && s.semana === semanaActual)
    const actualizado = existente
      ? { ...existente, revisiones: [nuevaRevision, ...(existente.revisiones || [])] }
      : { clienteNombre: revisionForm.clienteNombre, semana: semanaActual, dias: semanaVacia(), comentarios: '', revisiones: [nuevaRevision] }

    setSeguimientos((prev) => {
      const existe = prev.some((s) => s.clienteNombre === revisionForm.clienteNombre && s.semana === semanaActual)
      if (existe) {
        return prev.map((s) =>
          (s.clienteNombre === revisionForm.clienteNombre && s.semana === semanaActual) ? actualizado : s
        )
      }
      return [...prev, actualizado]
    })
    upsertSeguimientoRemote(actualizado)
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Mi Ficha</div>
          <div className="topbar-subtitle">Tus datos, tu pago y tu seguimiento semanal</div>
        </div>
      </header>

      <main className="page-content">
        {!miPersona && (
          <p className="lead-log-empty">
            No encontramos tu ficha en Equipo con este email — pídele a Raúl que revise que el email de tu ficha coincida con el de tu cuenta.
          </p>
        )}

        {miPersona && actividad && (
          <>
            <div className="team-grid" style={{ marginBottom: 20 }}>
              <div className="team-card">
                <div className="team-card-header">
                  <div>
                    <h3>{miPersona.nombre}</h3>
                    <p className="team-role">{miPersona.rol}</p>
                  </div>
                </div>
                <div className="team-card-body">
                  <p><strong>Email:</strong> {miPersona.email}</p>
                  <p><strong>Teléfono:</strong> {miPersona.telefono}</p>
                  {miPersona.carpetaDrive && (
                    <p><strong>Carpeta Drive:</strong> <a href={miPersona.carpetaDrive} target="_blank" rel="noopener noreferrer">Abrir 📁</a></p>
                  )}
                </div>
              </div>
            </div>

            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-card-header"><span className="kpi-card-label">Clientes activos</span><div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>✅</div></div>
                <div className="kpi-card-value">{actividad.activos}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-card-header"><span className="kpi-card-label">Tarifa actual</span><div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>💶</div></div>
                <div className="kpi-card-value">{actividad.tarifaActual}€/cliente</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-card-header"><span className="kpi-card-label">Contacto semanal</span><div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>📞</div></div>
                <div className="kpi-card-value">{contacto?.total > 0 ? `${contacto.hechos}/${contacto.total}` : '—'}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-card-header"><span className="kpi-card-label">Progreso tareas semana</span><div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>🗓️</div></div>
                <div className="kpi-card-value">{seguimiento?.porcentajeGeneral != null ? `${seguimiento.porcentajeGeneral}%` : '—'}</div>
              </div>
            </div>

            <div className="team-payment-box" style={{ marginTop: 20 }}>
              <div>
                <p className="team-payment-label">Pago de {mesLabel(mesKey)}</p>
                <p className="team-payment-amount">{actividad.totalMes.toLocaleString('es-ES')}€</p>
              </div>
              {pagoRegistrado ? (
                <span className="status-pill status-activo">✅ Pagado el {pagoRegistrado.fecha}</span>
              ) : (
                <span className="status-pill status-pendiente">⏳ Pendiente de pago</span>
              )}
            </div>

            <div className="table-card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <div><div className="card-title">Historial mensual de pago</div></div>
              </div>
              <div className="team-history-table">
                <div className="team-history-row team-history-header" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <span>Mes</span><span>Clientes activos</span><span>Tarifa</span><span>Total</span>
                </div>
                {actividad.historial.length === 0 && <p className="lead-log-empty">Sin historial todavía.</p>}
                {actividad.historial.map((row) => (
                  <div className="team-history-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }} key={row.mes}>
                    <span>{row.mes}</span>
                    <span>{row.clientes}</span>
                    <span>{row.tarifa}€</span>
                    <strong>{row.total.toLocaleString('es-ES')}€</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="table-card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Contacto semanal por cliente (3x)</div>
                  <div className="card-subtitle">Lunes: inicio de semana · Miércoles/jueves: mitad de semana · Viernes/sábado: fin de semana.</div>
                </div>
              </div>
              <ContactoSemanal
                clientes={actividad.clientesAsignados}
                contactos={contactosSemanales}
                setContactos={setContactosSemanales}
              />
            </div>

            <div className="table-card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <div><div className="card-title">Seguimiento semanal por cliente</div></div>
              </div>
              <ul className="lead-log-list seguimiento-resumen-list">
                {seguimiento?.resumenClientes.map(({ cliente, progreso, ultimaRevision }, i) => (
                  <li key={i} className="seguimiento-resumen-item">
                    <div>
                      <strong>{cliente.Nombre}</strong> — {cliente['Servicio contratado'] || 'Sin servicio'}
                      <div className="seguimiento-resumen-meta">
                        {progreso.total > 0 ? (
                          <span className={`seguimiento-progreso-badge ${progreso.porcentaje === 100 ? 'seguimiento-progreso-completo' : progreso.porcentaje === 0 ? 'seguimiento-progreso-pendiente' : ''}`}>
                            {progreso.revisadas}/{progreso.total} ({progreso.porcentaje}%)
                          </span>
                        ) : (
                          <span className="seguimiento-progreso-badge seguimiento-progreso-vacio">Sin tareas esta semana</span>
                        )}
                        <span className="seguimiento-ultima-revision">Última revisión: {ultimaRevision || 'nunca'}</span>
                      </div>
                    </div>
                    <button type="button" className="secondary-action" onClick={() => setSeguimientoClienteAbierto(cliente)}>Ver semana</button>
                  </li>
                ))}
                {(!seguimiento || seguimiento.resumenClientes.length === 0) && (
                  <p className="lead-log-empty">Sin clientes activos asignados.</p>
                )}
              </ul>
            </div>

            <div className="table-card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <div><div className="card-title">Registrar última revisión</div></div>
              </div>
              <form className="seguimiento-revision-form" onSubmit={registrarRevisionPropia}>
                <select value={revisionForm.clienteNombre} onChange={(e) => setRevisionForm({ ...revisionForm, clienteNombre: e.target.value })}>
                  <option value="">Selecciona cliente</option>
                  {actividad.clientesAsignados.map((c) => <option key={c.Nombre} value={c.Nombre}>{c.Nombre}</option>)}
                </select>
                <select value={revisionForm.dia} onChange={(e) => setRevisionForm({ ...revisionForm, dia: e.target.value })}>
                  {DIAS_SEMANA.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
                <div className="seguimiento-hora-picker">
                  <select value={revisionForm.hora} onChange={(e) => setRevisionForm({ ...revisionForm, hora: e.target.value })}>
                    {HORAS_12.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span>:</span>
                  <select value={revisionForm.minuto} onChange={(e) => setRevisionForm({ ...revisionForm, minuto: e.target.value })}>
                    {MINUTOS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={revisionForm.ampm} onChange={(e) => setRevisionForm({ ...revisionForm, ampm: e.target.value })}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                <button type="submit" className="primary-action">Registrar</button>
              </form>

              {seguimiento?.revisionesRecientes?.length > 0 && (
                <ul className="lead-log-list" style={{ marginTop: 10 }}>
                  {seguimiento.revisionesRecientes.map((r, i) => (
                    <li key={i}>
                      Revisaste a <strong>{r.clienteNombre}</strong> — {DIAS_SEMANA.find((d) => d.id === r.dia)?.label} a las {r.hora} ({r.fecha})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>

      {seguimientoClienteAbierto && (
        <SeguimientoCliente
          cliente={seguimientoClienteAbierto}
          seguimientos={seguimientos}
          setSeguimientos={setSeguimientos}
          onClose={() => setSeguimientoClienteAbierto(null)}
        />
      )}
    </>
  )
}
