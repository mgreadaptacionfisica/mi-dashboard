import { useMemo, useState } from 'react'

const ETAPAS = [
  { id: 'agendada', label: 'Agendada', hint: 'Pre-llamada' },
  { id: 'realizada', label: 'Llamada realizada', hint: 'Pendiente de seguimiento' },
  { id: 'seguimiento', label: 'Seguimiento', hint: 'Objeciones / follow-up' },
  { id: 'ganada', label: 'Ganada', hint: 'Cerrada' },
  { id: 'perdida', label: 'Perdida', hint: 'Descartada' },
]

const ETAPA_ORDER = ['agendada', 'realizada', 'seguimiento', 'ganada']

const initialLeadForm = {
  nombre: '',
  telefono: '',
  email: '',
  closer: '',
  setter: '',
  interes: 'HIGH TICKET',
  fechaLlamada: '',
}

const initialVentaForm = {
  servicio: 'Trimestral',
  tipoCliente: 'HIGH TICKET',
  importe: '',
  formaPago: 'Stripe',
  plan: 'COMPLETO',
  fechaInicio: '',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function LeadCard({ lead, onOpen }) {
  return (
    <button type="button" className="lead-card" onClick={onOpen}>
      <div className="lead-card-top">
        <span className={`lead-tag ${lead.interes === 'HIGH TICKET' ? 'lead-tag-high' : 'lead-tag-low'}`}>
          {lead.interes === 'HIGH TICKET' ? 'High' : 'Low'}
        </span>
        {lead.fechaLlamada && <span className="lead-date">{lead.fechaLlamada}</span>}
      </div>
      <p className="lead-name">{lead.nombre}</p>
      <p className="lead-closer">👤 {lead.closer || 'Sin closer'}</p>
      {lead.objeciones?.length > 0 && (
        <p className="lead-objections">⚠️ {lead.objeciones.length} objeción{lead.objeciones.length === 1 ? '' : 'es'}</p>
      )}
    </button>
  )
}

export default function Ventas({ ventas, setVentas, team, setClientes }) {
  const [showNewLead, setShowNewLead] = useState(false)
  const [leadForm, setLeadForm] = useState(initialLeadForm)
  const [activeLeadId, setActiveLeadId] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [objectionDraft, setObjectionDraft] = useState('')
  const [showVentaForm, setShowVentaForm] = useState(false)
  const [ventaForm, setVentaForm] = useState(initialVentaForm)
  const [showLostForm, setShowLostForm] = useState(false)
  const [lostReason, setLostReason] = useState('')

  const closers = useMemo(() => (team?.ventas || []).filter((p) => p.rol === 'Closer'), [team])
  const setters = useMemo(() => (team?.ventas || []).filter((p) => p.rol === 'Setter'), [team])
  const activeLead = useMemo(() => ventas.find((l) => l.id === activeLeadId) || null, [ventas, activeLeadId])

  const stats = useMemo(() => {
    const activos = ventas.filter((l) => !['ganada', 'perdida'].includes(l.etapa)).length
    const ganadas = ventas.filter((l) => l.etapa === 'ganada').length
    const perdidas = ventas.filter((l) => l.etapa === 'perdida').length
    const cerradas = ganadas + perdidas
    const tasa = cerradas > 0 ? Math.round((ganadas / cerradas) * 100) : 0
    return { activos, ganadas, perdidas, tasa }
  }, [ventas])

  const updateLead = (id, patch) => {
    setVentas((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const closeDetail = () => {
    setActiveLeadId(null)
    setNoteDraft('')
    setObjectionDraft('')
    setShowVentaForm(false)
    setVentaForm(initialVentaForm)
    setShowLostForm(false)
    setLostReason('')
  }

  const handleCreateLead = (event) => {
    event.preventDefault()
    const nuevo = {
      id: `lead-${Date.now()}`,
      nombre: leadForm.nombre,
      telefono: leadForm.telefono,
      email: leadForm.email,
      closer: leadForm.closer,
      setter: leadForm.setter,
      interes: leadForm.interes,
      etapa: 'agendada',
      fechaLlamada: leadForm.fechaLlamada,
      objeciones: [],
      seguimientos: [],
      creadoEn: todayISO(),
    }
    setVentas((prev) => [nuevo, ...prev])
    setLeadForm(initialLeadForm)
    setShowNewLead(false)
  }

  const avanzarEtapa = (lead) => {
    const idx = ETAPA_ORDER.indexOf(lead.etapa)
    if (idx === -1 || idx === ETAPA_ORDER.length - 1) return
    if (lead.etapa === 'seguimiento') {
      // avanzar desde seguimiento hacia "ganada" pasa por el formulario de venta
      setShowVentaForm(true)
      return
    }
    updateLead(lead.id, { etapa: ETAPA_ORDER[idx + 1] })
  }

  const addObjection = () => {
    if (!objectionDraft.trim() || !activeLead) return
    updateLead(activeLead.id, {
      objeciones: [...(activeLead.objeciones || []), { fecha: todayISO(), texto: objectionDraft.trim() }],
    })
    setObjectionDraft('')
  }

  const addSeguimiento = () => {
    if (!noteDraft.trim() || !activeLead) return
    updateLead(activeLead.id, {
      seguimientos: [...(activeLead.seguimientos || []), { fecha: todayISO(), nota: noteDraft.trim() }],
    })
    setNoteDraft('')
  }

  const confirmarVenta = (event) => {
    event.preventDefault()
    if (!activeLead) return

    const nuevoCliente = {
      Nombre: activeLead.nombre,
      Email: activeLead.email,
      'Tipo de cliente': ventaForm.tipoCliente,
      'Servicio contratado': ventaForm.servicio,
      'Estado del cliente': 'ACTIVO',
      'Forma de pago': ventaForm.formaPago,
      Pago: ventaForm.plan,
      'Primer pago': ventaForm.importe,
      Trabajador: '',
      'Fecha inicio': ventaForm.fechaInicio || todayISO(),
      'Fecha fin': '',
      Teléfono: activeLead.telefono,
    }

    if (typeof setClientes === 'function') {
      setClientes((prev) => [nuevoCliente, ...prev])
    }

    updateLead(activeLead.id, {
      etapa: 'ganada',
      venta: { ...ventaForm, fechaCierre: todayISO() },
    })

    setShowVentaForm(false)
    setVentaForm(initialVentaForm)
  }

  const confirmarPerdida = (event) => {
    event.preventDefault()
    if (!activeLead) return
    updateLead(activeLead.id, { etapa: 'perdida', motivoPerdida: lostReason || 'Sin motivo especificado' })
    setShowLostForm(false)
    setLostReason('')
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Ventas</div>
          <div className="topbar-subtitle">Pipeline comercial: de la llamada al cliente</div>
        </div>
        <div className="topbar-right">
          <button className="add-client-btn" onClick={() => setShowNewLead(true)}>＋ Nuevo lead</button>
        </div>
      </header>

      <main className="page-content">
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">En proceso</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>📞</div>
            </div>
            <div className="kpi-card-value">{stats.activos}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Ganadas</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>✅</div>
            </div>
            <div className="kpi-card-value">{stats.ganadas}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Perdidas</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>✖️</div>
            </div>
            <div className="kpi-card-value">{stats.perdidas}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Tasa de cierre</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>📈</div>
            </div>
            <div className="kpi-card-value">{stats.tasa}%</div>
          </div>
        </div>

        <div className="pipeline-board">
          {ETAPAS.map((etapa) => (
            <div key={etapa.id} className="pipeline-column">
              <div className="pipeline-column-header">
                <span>{etapa.label}</span>
                <span className="pipeline-count">{ventas.filter((l) => l.etapa === etapa.id).length}</span>
              </div>
              <p className="pipeline-column-hint">{etapa.hint}</p>
              <div className="pipeline-column-body">
                {ventas.filter((l) => l.etapa === etapa.id).map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onOpen={() => setActiveLeadId(lead.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {showNewLead && (
        <div className="client-modal-overlay" onClick={() => setShowNewLead(false)}>
          <div className="client-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">Nuevo lead</div>
                <div className="card-subtitle">Añade una persona al pipeline de ventas</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowNewLead(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleCreateLead}>
              <input required placeholder="Nombre" value={leadForm.nombre}
                onChange={(e) => setLeadForm({ ...leadForm, nombre: e.target.value })} />
              <input placeholder="Teléfono" value={leadForm.telefono}
                onChange={(e) => setLeadForm({ ...leadForm, telefono: e.target.value })} />
              <input type="email" placeholder="Email" value={leadForm.email}
                onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} />
              <select value={leadForm.closer} onChange={(e) => setLeadForm({ ...leadForm, closer: e.target.value })}>
                <option value="">Closer sin asignar</option>
                {closers.map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
              </select>
              <select value={leadForm.setter} onChange={(e) => setLeadForm({ ...leadForm, setter: e.target.value })}>
                <option value="">Setter sin asignar</option>
                {setters.map((s) => <option key={s.nombre} value={s.nombre}>{s.nombre}</option>)}
              </select>
              <select value={leadForm.interes} onChange={(e) => setLeadForm({ ...leadForm, interes: e.target.value })}>
                <option value="HIGH TICKET">HIGH TICKET</option>
                <option value="LOW TICKET">LOW TICKET</option>
              </select>
              <input type="date" placeholder="Fecha de llamada" value={leadForm.fechaLlamada}
                onChange={(e) => setLeadForm({ ...leadForm, fechaLlamada: e.target.value })} />
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowNewLead(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Crear lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeLead && (
        <div className="client-modal-overlay" onClick={closeDetail}>
          <div className="client-modal lead-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{activeLead.nombre}</div>
                <div className="card-subtitle">
                  {activeLead.telefono || 'Sin teléfono'} · {activeLead.email || 'Sin email'}
                </div>
              </div>
              <button className="close-modal-btn" onClick={closeDetail}>✕</button>
            </div>

            <div className="lead-detail-body">
              <div className="lead-detail-row">
                <div>
                  <label className="lead-detail-label">Closer</label>
                  <select value={activeLead.closer} onChange={(e) => updateLead(activeLead.id, { closer: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {closers.map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lead-detail-label">Setter</label>
                  <select value={activeLead.setter} onChange={(e) => updateLead(activeLead.id, { setter: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {setters.map((s) => <option key={s.nombre} value={s.nombre}>{s.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lead-detail-label">Etapa actual</label>
                  <span className="status-pill status-activo">{ETAPAS.find((e) => e.id === activeLead.etapa)?.label}</span>
                </div>
              </div>

              {activeLead.etapa !== 'ganada' && activeLead.etapa !== 'perdida' && !showVentaForm && !showLostForm && (
                <div className="lead-detail-actions">
                  <button type="button" className="primary-action" onClick={() => avanzarEtapa(activeLead)}>
                    {activeLead.etapa === 'seguimiento' ? 'Marcar como ganada →' : 'Avanzar etapa →'}
                  </button>
                  <button type="button" className="danger-action" onClick={() => setShowLostForm(true)}>Marcar como perdida</button>
                </div>
              )}

              {showVentaForm && (
                <form className="modal-form lead-venta-form" onSubmit={confirmarVenta}>
                  <p className="plan-subtitle-inline">Datos de la venta</p>
                  <select value={ventaForm.tipoCliente} onChange={(e) => setVentaForm({ ...ventaForm, tipoCliente: e.target.value })}>
                    <option value="HIGH TICKET">HIGH TICKET</option>
                    <option value="LOW TICKET">LOW TICKET</option>
                  </select>
                  <select value={ventaForm.servicio} onChange={(e) => setVentaForm({ ...ventaForm, servicio: e.target.value })}>
                    <option>Mensual</option>
                    <option>Trimestral</option>
                    <option>Cuatrimestral</option>
                    <option>Semestral</option>
                    <option>Anual</option>
                  </select>
                  <input placeholder="Importe (€)" value={ventaForm.importe}
                    onChange={(e) => setVentaForm({ ...ventaForm, importe: e.target.value })} />
                  <select value={ventaForm.formaPago} onChange={(e) => setVentaForm({ ...ventaForm, formaPago: e.target.value })}>
                    <option>Stripe</option>
                    <option>Bizum</option>
                    <option>Transferencia</option>
                  </select>
                  <select value={ventaForm.plan} onChange={(e) => setVentaForm({ ...ventaForm, plan: e.target.value })}>
                    <option value="COMPLETO">Pago completo</option>
                    <option value="2 PLAZOS">2 plazos</option>
                    <option value="3 PLAZOS">3 plazos</option>
                  </select>
                  <input type="date" placeholder="Fecha de inicio" value={ventaForm.fechaInicio}
                    onChange={(e) => setVentaForm({ ...ventaForm, fechaInicio: e.target.value })} />
                  <div className="modal-actions">
                    <button type="button" className="secondary-action" onClick={() => setShowVentaForm(false)}>Cancelar</button>
                    <button type="submit" className="primary-action">Confirmar venta y crear cliente</button>
                  </div>
                </form>
              )}

              {showLostForm && (
                <form className="modal-form" onSubmit={confirmarPerdida}>
                  <p className="plan-subtitle-inline">Motivo de la pérdida</p>
                  <input placeholder="Ej: precio, timing, no es el momento..." value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)} />
                  <div className="modal-actions">
                    <button type="button" className="secondary-action" onClick={() => setShowLostForm(false)}>Cancelar</button>
                    <button type="submit" className="danger-action">Confirmar pérdida</button>
                  </div>
                </form>
              )}

              {activeLead.etapa === 'ganada' && activeLead.venta && (
                <div className="lead-venta-summary">
                  ✅ Vendido: {activeLead.venta.servicio} · {activeLead.venta.importe}€ · {activeLead.venta.plan} · cerrado el {activeLead.venta.fechaCierre}
                </div>
              )}
              {activeLead.etapa === 'perdida' && (
                <div className="lead-venta-summary lead-venta-summary-lost">
                  ✖️ Perdida: {activeLead.motivoPerdida}
                </div>
              )}

              <div className="lead-detail-columns">
                <div>
                  <label className="lead-detail-label">Objeciones</label>
                  <ul className="lead-log-list">
                    {(activeLead.objeciones || []).map((o, i) => (
                      <li key={i}><strong>{o.fecha}</strong> — {o.texto}</li>
                    ))}
                    {(activeLead.objeciones || []).length === 0 && <li className="lead-log-empty">Sin objeciones registradas.</li>}
                  </ul>
                  <div className="lead-log-add">
                    <input placeholder="Añadir objeción..." value={objectionDraft} onChange={(e) => setObjectionDraft(e.target.value)} />
                    <button type="button" className="secondary-action" onClick={addObjection}>Añadir</button>
                  </div>
                </div>
                <div>
                  <label className="lead-detail-label">Seguimiento</label>
                  <ul className="lead-log-list">
                    {(activeLead.seguimientos || []).map((s, i) => (
                      <li key={i}><strong>{s.fecha}</strong> — {s.nota}</li>
                    ))}
                    {(activeLead.seguimientos || []).length === 0 && <li className="lead-log-empty">Sin seguimiento registrado.</li>}
                  </ul>
                  <div className="lead-log-add">
                    <input placeholder="Añadir nota de seguimiento..." value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
                    <button type="button" className="secondary-action" onClick={addSeguimiento}>Añadir</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
