import { useMemo, useState } from 'react'
import SeguimientoCliente from './SeguimientoCliente'
import ValoracionCliente from './ValoracionCliente'
import FasesObjetivos from './FasesObjetivos'
import { faseAutomatica, faseTopeSpadi, ultimoSpadiCliente } from '../utils/valoracionHelpers'
import { parseFechaFlexible, formatFechaISO } from '../utils/fechasEsp'
import {
  semanaActualISO,
  formatRangoSemana,
  resumenRevisionesSemana,
  PUNTOS_CONTACTO,
  contactoVacio,
  DIAS_SEMANA,
  semanaVacia,
  progresoSemana,
  ultimaRevisionCliente,
} from '../utils/seguimientoHelpers'
import { upsertContactoSemanalRemote } from '../lib/queries/contactosSemanales'
import { upsertSeguimientoRemote } from '../lib/queries/seguimientos'
import { seguimientoTecnico } from '../utils/equipoHelpers'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Hora en formato 12h con AM/PM seleccionable a mano (hora 1-12 + minuto
// libre, sin tramos) — coincide con el formato que muestran apps externas
// como Harbiz ("09:32am"), así se copia directo sin convertir a 24h.
const HORAS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

function horaA24h(horaH, horaM, ampm) {
  let h = Number(horaH) % 12
  if (ampm === 'PM') h += 12
  const m = String(horaM).padStart(2, '0').slice(0, 2)
  return `${String(h).padStart(2, '0')}:${m}`
}

function formatHora12(horaHHMM) {
  if (!horaHHMM) return ''
  const [h, m] = horaHHMM.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

// Vista de "Seguimiento y Valoración" para el equipo técnico: separada a
// propósito de ClientesAdmin.jsx (sidebar item "Clientes"), que lleva toda
// la parte de contabilidad/gestión (importes, plazos, cobros, altas/bajas,
// renovaciones). Un técnico no necesita ni debe ver esos datos — solo los
// suyos: quién es, qué programa tiene, y las dos herramientas de trabajo
// real con el cliente: Seguimiento y Valoración. Se identifica quién ha
// iniciado sesión cruzando su email con su ficha en Equipo, mismo patrón
// que MuroEquipo/VideosParaEditar.
//
// Solo se muestran clientes ACTIVOS aquí: no tiene sentido hacer
// seguimiento/valoración de alguien que ya no es cliente. Los no activos
// solo se gestionan desde ClientesAdmin (altas/bajas).
function formatDate(value) {
  if (!value) return '—'
  const iso = parseFechaFlexible(value)
  return iso ? formatFechaISO(iso) : value
}

export default function ClientesEquipo({ clientes = [], team, miEmail, rol, seguimientos = [], setSeguimientos, valoraciones = [], setValoraciones, objetivosClienteFase = [], setObjetivosClienteFase, revisionesSemanales = [], setRevisionesSemanales, contactosSemanales = [], setContactosSemanales, onRefrescar, refrescando, onNavigate }) {
  const [search, setSearch] = useState('')
  const [seguimientoCliente, setSeguimientoCliente] = useState(null)
  const [valoracionCliente, setValoracionCliente] = useState(null)
  const [fasesCliente, setFasesCliente] = useState(null)
  const [revisionForm, setRevisionForm] = useState({ clienteNombre: '', dia: 'lunes', horaH: '10', horaM: '00', ampm: 'AM' })

  // Admin: acceso a Seguimiento/Valoración de TODOS los clientes (no solo
  // los suyos), porque necesita poder supervisar el trabajo de cualquier
  // entrenador. Técnico: solo ve los suyos, cruzando su email de login con
  // su ficha en Equipo (team.tecnico) para saber su nombre real.
  const esAdmin = rol === 'admin'

  const miPersona = useMemo(
    () => (team?.tecnico || []).find((p) => p.email && miEmail && p.email.toLowerCase() === miEmail.toLowerCase()),
    [team, miEmail]
  )
  const miNombre = miPersona?.nombre || null

  const misClientes = useMemo(() => {
    const base = esAdmin
      ? clientes
      : (miNombre
        ? clientes.filter((c) => {
          const trabajadores = c.Trabajadores || (c.Trabajador ? [c.Trabajador] : [])
          return trabajadores.includes(miNombre)
        })
        : [])
    // Solo activos: seguimiento/valoración no aplica a quien ya no es cliente.
    return base.filter((c) => (c['Estado del cliente'] || '').toUpperCase() === 'ACTIVO')
  }, [clientes, miNombre, esAdmin])

  const filtrados = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) return misClientes
    return misClientes.filter((c) => [c.Nombre, c.Email, c['Servicio contratado']]
      .some((value) => (value || '').toLowerCase().includes(term)))
  }, [misClientes, search])

  // "Check final" del seguimiento semanal, POR CLIENTE (a petición de
  // Raúl): el check en sí se marca desde el modal de Seguimiento de cada
  // cliente (ver SeguimientoCliente.jsx) — aquí solo se lleva la cuenta de
  // cuántos de MIS clientes (los del técnico, o todos si es admin) ya
  // tienen ese check puesto para la semana actual, para saber de un
  // vistazo si queda alguien por revisar antes de cerrar la semana.
  const semanaActual = semanaActualISO()
  const resumen = useMemo(
    () => resumenRevisionesSemana(misClientes, revisionesSemanales, semanaActual),
    [misClientes, revisionesSemanales, semanaActual]
  )
  const todoRevisado = resumen.total > 0 && resumen.revisados === resumen.total

  // Contacto semanal (3 checks: inicio/mitad/fin) directamente en esta
  // misma tabla — a petición de Raúl, para que el técnico no tenga que ir
  // y venir entre Mi Ficha y Seguimiento y Valoración para su ronda
  // semanal: aquí ya ve y marca todo lo de cada cliente de un vistazo.
  const toggleContacto = (clienteNombre, puntoId, actual) => {
    if (typeof setContactosSemanales !== 'function') return
    const existente = contactosSemanales.find((c) => c.clienteNombre === clienteNombre && c.semana === semanaActual)
    const base = existente ? { ...existente } : { clienteNombre, semana: semanaActual, ...contactoVacio() }
    const actualizado = {
      ...base,
      [puntoId]: { ...contactoVacio()[puntoId], ...base[puntoId], hecho: !actual, fecha: !actual ? new Date().toISOString().slice(0, 10) : null },
    }
    setContactosSemanales((prev) => {
      const existe = prev.some((c) => c.clienteNombre === clienteNombre && c.semana === semanaActual)
      if (existe) return prev.map((c) => (c.clienteNombre === clienteNombre && c.semana === semanaActual ? actualizado : c))
      return [...prev, actualizado]
    })
    upsertContactoSemanalRemote(actualizado)
  }

  // "Registrar última revisión" (movido aquí desde Mi Ficha, a petición de
  // Raúl: toda la operatividad vive en Seguimiento y Valoración; Mi Ficha
  // se queda solo con los datos del técnico y un resumen). Deja constancia
  // de cuándo se revisó a un cliente (día/hora), aparte del check final y
  // de las tareas. Visible también para admin (antes se ocultaba del todo
  // si no tenía ficha de técnico) — si no hay miPersona se registra con su
  // email como identificador.
  const registrarRevisionPropia = (event) => {
    event.preventDefault()
    if (!revisionForm.clienteNombre) return
    const semana = semanaActualISO()
    const hora24 = horaA24h(revisionForm.horaH, revisionForm.horaM, revisionForm.ampm)
    const nuevaRevision = { persona: miPersona?.nombre || miEmail || 'Admin', dia: revisionForm.dia, hora: hora24, fecha: todayISO() }

    const existente = seguimientos.find((s) => s.clienteNombre === revisionForm.clienteNombre && s.semana === semana)
    const actualizado = existente
      ? { ...existente, revisiones: [nuevaRevision, ...(existente.revisiones || [])] }
      : { clienteNombre: revisionForm.clienteNombre, semana, dias: semanaVacia(), comentarios: '', revisiones: [nuevaRevision] }

    setSeguimientos((prev) => {
      const existe = prev.some((s) => s.clienteNombre === revisionForm.clienteNombre && s.semana === semana)
      if (existe) {
        return prev.map((s) => (s.clienteNombre === revisionForm.clienteNombre && s.semana === semana) ? actualizado : s)
      }
      return [...prev, actualizado]
    })
    upsertSeguimientoRemote(actualizado)
  }

  const seguimientoResumen = useMemo(
    () => seguimientoTecnico(misClientes, seguimientos, { semanaActualISO, progresoSemana, ultimaRevisionCliente }),
    [misClientes, seguimientos]
  )

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Seguimiento y Valoración</div>
          <div className="topbar-subtitle">{esAdmin ? 'Clientes activos de todo el equipo' : 'Tus clientes activos'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {typeof onNavigate === 'function' && (
            <button type="button" className="secondary-action" onClick={() => onNavigate('mi-ficha')}>🧑 Mi Ficha</button>
          )}
          {typeof onRefrescar === 'function' && (
            <button
              type="button"
              className="secondary-action"
              onClick={onRefrescar}
              disabled={refrescando}
              title="El panel no se actualiza solo: si un compañero acaba de marcar algo, pulsa aquí para verlo sin recargar la página."
            >
              {refrescando ? '⏳ Actualizando…' : '🔄 Actualizar'}
            </button>
          )}
        </div>
      </header>

      <main className="page-content">
        {!esAdmin && !miPersona && (
          <p className="lead-log-empty">
            No encontramos tu ficha en Equipo con este email — pídele a Raúl que revise que el email de tu ficha coincida con el de tu cuenta.
          </p>
        )}

        {(esAdmin || miPersona) && (
          <>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-label">{esAdmin ? 'Clientes activos (todos)' : 'Mis clientes activos'}</span>
                  <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>✅</div>
                </div>
                <div className="kpi-card-value">{misClientes.length}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-label">Seguimiento revisado esta semana</span>
                  <div className="kpi-icon" style={{ background: todoRevisado ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' : 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
                    {todoRevisado ? '✅' : '⏳'}
                  </div>
                </div>
                <div className="kpi-card-value">{resumen.revisados}/{resumen.total}</div>
              </div>
            </div>

            {misClientes.length > 0 && (
              <div className={`seguimiento-cierre-banner${todoRevisado ? ' seguimiento-cierre-banner-cerrado' : ''}`}>
                <div>
                  <strong>Semana del {formatRangoSemana(semanaActual)}</strong>
                  {todoRevisado ? (
                    <span> — ✅ Todos los clientes tienen el seguimiento de esta semana revisado.</span>
                  ) : (
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {' '}— faltan {resumen.total - resumen.revisados} de {resumen.total} clientes por revisar. El
                      aviso <span className="semana-pendiente-badge" style={{ verticalAlign: 'middle' }}>⏳</span> junto
                      al nombre marca quién falta; el check se marca desde el "📋 Seguimiento" de cada cliente.
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="table-card">
              <div className="card-header">
                <div>
                  <div className="card-title">{esAdmin ? 'Clientes activos' : 'Tus clientes activos'}</div>
                  <div className="card-subtitle">{filtrados.length} de {misClientes.length} mostrados</div>
                </div>
                <input
                  className="filter-input"
                  placeholder="Buscar por nombre, email o servicio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ maxWidth: 260 }}
                />
              </div>

              <div className="contacto-leyenda" style={{ margin: '0 20px 16px' }}>
                {PUNTOS_CONTACTO.map((p) => (
                  <div key={p.id} className="contacto-leyenda-item">
                    <strong>{p.label} · {p.dia}</strong>
                    <span>{p.hint}</span>
                  </div>
                ))}
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Servicio</th>
                      {esAdmin && <th>Entrenador</th>}
                      <th>Fase</th>
                      <th title="Inicio / mitad / fin de semana">Contacto semanal</th>
                      <th>Inicio</th>
                      <th>Contacto</th>
                      <th>Última revisión</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((cliente, index) => {
                      const trabajadores = cliente.Trabajadores || (cliente.Trabajador ? [cliente.Trabajador] : [])
                      const spadiTope = faseTopeSpadi(ultimoSpadiCliente(valoraciones, cliente.Nombre))
                      const fase = faseAutomatica(objetivosClienteFase.filter((o) => o.clienteNombre === cliente.Nombre), spadiTope)
                      const registroSemana = seguimientos.find((s) => s.clienteNombre === cliente.Nombre && s.semana === semanaActual)
                      const progresoTareas = progresoSemana(registroSemana)
                      const tareasPendientes = progresoTareas.total - progresoTareas.revisadas
                      const cambiosSinHacer = (registroSemana?.cambiosPendientes || []).filter((c) => !c.hecho).length
                      const semanaRevisadaCliente = revisionesSemanales.some((r) => r.clienteNombre === cliente.Nombre && r.semana === semanaActual && r.revisado)
                      return (
                        <tr key={`${cliente.id || cliente.Nombre}-${index}`}>
                          <td style={{ fontWeight: 600 }}>
                            {cliente.Nombre || '—'}
                            {!semanaRevisadaCliente && (
                              <span className="semana-pendiente-badge" title="Semana sin revisar y cerrar todavía">⏳</span>
                            )}
                          </td>
                          <td>{cliente['Servicio contratado'] || '—'}</td>
                          {esAdmin && <td>{trabajadores.length ? trabajadores.join(', ') : '—'}</td>}
                          <td>
                            <span className="status-pill status-activo">Fase {fase}</span>
                          </td>
                          <td>
                            <div className="contacto-semanal-inline">
                              {PUNTOS_CONTACTO.map((p) => {
                                const registroContacto = contactosSemanales.find((c) => c.clienteNombre === cliente.Nombre && c.semana === semanaActual)
                                const punto = registroContacto?.[p.id]
                                const hecho = Boolean(punto?.hecho)
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    className={`contacto-dot ${hecho ? 'contacto-dot-hecho' : ''}`}
                                    title={`${p.label} (${p.dia})${hecho && punto?.fecha ? ` — contactado el ${punto.fecha}` : ''}`}
                                    onClick={() => toggleContacto(cliente.Nombre, p.id, hecho)}
                                  >
                                    {hecho ? '●' : '○'}
                                  </button>
                                )
                              })}
                            </div>
                          </td>
                          <td>{formatDate(cliente['Fecha inicio'])}</td>
                          <td style={{ color: 'var(--color-text-secondary)' }}>
                            {cliente.Email || '—'}{cliente.Teléfono ? ` · ${cliente.Teléfono}` : ''}
                            {cliente.Drive && (
                              <> · <a href={cliente.Drive} target="_blank" rel="noopener noreferrer">Drive</a></>
                            )}
                          </td>
                          <td style={{ color: 'var(--color-text-secondary)' }}>{ultimaRevisionCliente(seguimientos, cliente.Nombre) || 'nunca'}</td>
                          <td>
                            <button type="button" className="row-action-btn" onClick={() => setSeguimientoCliente(cliente)}>
                              📋 Seguimiento
                              {tareasPendientes > 0 && (
                                <span className="tareas-pendientes-badge" title={`${tareasPendientes} tarea${tareasPendientes === 1 ? '' : 's'} sin revisar esta semana`}>
                                  {tareasPendientes}
                                </span>
                              )}
                              {cambiosSinHacer > 0 && (
                                <span className="cambios-pendientes-badge" title={`${cambiosSinHacer} cambio${cambiosSinHacer === 1 ? '' : 's'} sin marcar como hecho en "Cambios y revisado"`}>
                                  {cambiosSinHacer}
                                </span>
                              )}
                            </button>
                            <button type="button" className="row-action-btn" onClick={() => setValoracionCliente(cliente)}>📈 Valoración</button>
                            <button type="button" className="row-action-btn" onClick={() => setFasesCliente(cliente)}>🎯 Fases y objetivos</button>
                          </td>
                        </tr>
                      )
                    })}
                    {filtrados.length === 0 && (
                      <tr><td colSpan={esAdmin ? 9 : 8} className="lead-log-empty">
                        {misClientes.length === 0 ? 'No hay clientes activos asignados.' : 'Sin resultados con ese filtro.'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {misClientes.length > 0 && (
              <div className="table-card" style={{ marginTop: 20 }}>
                <div className="card-header">
                  <div><div className="card-title">Registrar última revisión</div></div>
                </div>
                <form className="seguimiento-revision-form" onSubmit={registrarRevisionPropia}>
                  <select value={revisionForm.clienteNombre} onChange={(e) => setRevisionForm({ ...revisionForm, clienteNombre: e.target.value })}>
                    <option value="">Selecciona cliente</option>
                    {misClientes.map((c) => <option key={c.Nombre} value={c.Nombre}>{c.Nombre}</option>)}
                  </select>
                  <select value={revisionForm.dia} onChange={(e) => setRevisionForm({ ...revisionForm, dia: e.target.value })}>
                    {DIAS_SEMANA.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                  <span className="seguimiento-hora-picker">
                    <select value={revisionForm.horaH} onChange={(e) => setRevisionForm({ ...revisionForm, horaH: e.target.value })}>
                      {HORAS_12.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span>:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      className="seguimiento-minuto-input"
                      value={revisionForm.horaM}
                      onChange={(e) => {
                        const raw = e.target.value.slice(0, 2)
                        const clamped = raw === '' ? '' : String(Math.min(59, Math.max(0, Number(raw))))
                        setRevisionForm({ ...revisionForm, horaM: clamped })
                      }}
                      onBlur={(e) => setRevisionForm({ ...revisionForm, horaM: String(e.target.value || '0').padStart(2, '0') })}
                    />
                    <select value={revisionForm.ampm} onChange={(e) => setRevisionForm({ ...revisionForm, ampm: e.target.value })}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </span>
                  <button type="submit" className="primary-action">Registrar</button>
                </form>

                {seguimientoResumen?.revisionesRecientes?.length > 0 && (
                  <ul className="lead-log-list" style={{ margin: '10px 20px 20px' }}>
                    {seguimientoResumen.revisionesRecientes.map((r, i) => (
                      <li key={i}>
                        Revisaste a <strong>{r.clienteNombre}</strong> — {DIAS_SEMANA.find((d) => d.id === r.dia)?.label} a las {formatHora12(r.hora) || r.hora} ({r.fecha})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {seguimientoCliente && (
        <SeguimientoCliente
          cliente={seguimientoCliente}
          seguimientos={seguimientos}
          setSeguimientos={setSeguimientos}
          valoraciones={valoraciones}
          objetivosClienteFase={objetivosClienteFase}
          revisionesSemanales={revisionesSemanales}
          setRevisionesSemanales={setRevisionesSemanales}
          miEmail={miEmail}
          onClose={() => setSeguimientoCliente(null)}
        />
      )}

      {valoracionCliente && (
        <ValoracionCliente
          cliente={valoracionCliente}
          valoraciones={valoraciones}
          setValoraciones={setValoraciones}
          objetivosClienteFase={objetivosClienteFase}
          onClose={() => setValoracionCliente(null)}
        />
      )}

      {fasesCliente && (
        <FasesObjetivos
          cliente={fasesCliente}
          objetivosClienteFase={objetivosClienteFase}
          setObjetivosClienteFase={setObjetivosClienteFase}
          valoraciones={valoraciones}
          onClose={() => setFasesCliente(null)}
        />
      )}
    </>
  )
}
