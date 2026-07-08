import { useMemo, useState } from 'react'
import SERVICIOS from '../data/servicios'
import SettingInstagram from './SettingInstagram'
import AdsKpi from './AdsKpi'
import Recontactar from './Recontactar'

const ETAPAS = [
  { id: 'agendada', label: 'Agendada', hint: 'Pre-llamada' },
  { id: 'realizada', label: 'Llamada realizada', hint: '¿Compró o no?' },
  { id: 'seguimiento', label: 'Seguimiento', hint: 'Objeciones / respuesta' },
  { id: 'ganada', label: 'Ganada', hint: 'Cerrada' },
  { id: 'perdida', label: 'Perdida', hint: 'Descartada' },
]

const RESULTADO_NO_REALIZADA = [
  { id: 'no_show', label: 'No show' },
  { id: 'cancelada', label: 'Cancelada' },
  { id: 'modificada', label: 'Modificada / reagendada' },
]

const initialLeadForm = {
  nombre: '',
  telefono: '',
  email: '',
  closer: '',
  fechaAgenda: '',
  horaAgenda: '',
}

const initialVentaForm = {
  servicioId: SERVICIOS[0].id,
  otroNombre: '',
  tipoCliente: 'HIGH TICKET',
  importe: SERVICIOS[0].precio,
  formaPago: 'Stripe',
  tipoPago: 'unico',
  numPlazos: '3',
  fechaInicio: '',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function addMonthsISO(fechaISO, meses) {
  if (!fechaISO || !meses) return ''
  const [y, m, d] = fechaISO.split('-').map(Number)
  const fecha = new Date(y, (m - 1) + meses, d)
  return fecha.toISOString().slice(0, 10)
}

function LeadCard({ lead, onOpen }) {
  return (
    <button type="button" className="lead-card" onClick={onOpen}>
      <div className="lead-card-top">
        {lead.fechaAgenda && <span className="lead-date">{lead.fechaAgenda}{lead.horaAgenda ? ` · ${lead.horaAgenda}` : ''}</span>}
      </div>
      <p className="lead-name">{lead.nombre}</p>
      <p className="lead-closer">👤 {lead.closer || 'Sin closer'}</p>
      {lead.etapa === 'agendada' && (
        <p className="lead-checks">
          {lead.preLlamada?.whatsapp ? '✅' : '⬜'} WhatsApp · {lead.preLlamada?.prellamada ? '✅' : '⬜'} Prellamada · {lead.preLlamada?.recordatorio ? '✅' : '⬜'} Recordatorio
        </p>
      )}
      {lead.objeciones?.length > 0 && (
        <p className="lead-objections">⚠️ {lead.objeciones.length} objeción{lead.objeciones.length === 1 ? '' : 'es'}</p>
      )}
      {lead.grabacionUrl && (
        <p className="lead-checks">🎥 Grabación disponible</p>
      )}
    </button>
  )
}

export default function Ventas({ ventas, setVentas, team, setClientes, setting, setSetting, adsKpi, setAdsKpi, adsNotas, setAdsNotas, anuncios, setAnuncios, recontactos, setRecontactos }) {
  const [activeTab, setActiveTab] = useState('pipeline')
  const [showNewLead, setShowNewLead] = useState(false)
  const [leadForm, setLeadForm] = useState(initialLeadForm)
  const [activeLeadId, setActiveLeadId] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [objectionDraft, setObjectionDraft] = useState('')
  const [showVentaForm, setShowVentaForm] = useState(false)
  const [ventaForm, setVentaForm] = useState(initialVentaForm)
  const [showLostForm, setShowLostForm] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [showReagendar, setShowReagendar] = useState(false)
  const [reagendarForm, setReagendarForm] = useState({ fecha: '', hora: '' })
  const [showResultadoNoRealizada, setShowResultadoNoRealizada] = useState(false)
  const [resultadoDraft, setResultadoDraft] = useState('no_show')

  const closers = useMemo(() => (team?.ventas || []).filter((p) => p.rol === 'Closer'), [team])
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

  const resetDetailUI = () => {
    setNoteDraft('')
    setObjectionDraft('')
    setShowVentaForm(false)
    setVentaForm(initialVentaForm)
    setShowLostForm(false)
    setLostReason('')
    setShowReagendar(false)
    setReagendarForm({ fecha: '', hora: '' })
    setShowResultadoNoRealizada(false)
    setResultadoDraft('no_show')
  }

  const closeDetail = () => {
    setActiveLeadId(null)
    resetDetailUI()
  }

  const handleCreateLead = (event) => {
    event.preventDefault()
    const nuevo = {
      id: `lead-${Date.now()}`,
      nombre: leadForm.nombre,
      telefono: leadForm.telefono,
      email: leadForm.email,
      closer: leadForm.closer,
      fechaAgenda: leadForm.fechaAgenda,
      horaAgenda: leadForm.horaAgenda,
      preLlamada: { whatsapp: false, prellamada: false, recordatorio: false },
      resultadoLlamada: null,
      compraEnLlamada: null,
      etapa: 'agendada',
      objeciones: [],
      seguimiento: { realizado: false, contesta: null, compraTrasSeguimiento: null },
      notasSeguimiento: [],
      grabacionUrl: '',
      creadoEn: todayISO(),
    }
    setVentas((prev) => [nuevo, ...prev])
    setLeadForm(initialLeadForm)
    setShowNewLead(false)
  }

  const toggleCheck = (key) => {
    if (!activeLead) return
    updateLead(activeLead.id, {
      preLlamada: { ...activeLead.preLlamada, [key]: !activeLead.preLlamada?.[key] },
    })
  }

  const marcarLlamadaRealizada = () => {
    if (!activeLead) return
    updateLead(activeLead.id, { etapa: 'realizada', resultadoLlamada: 'realizada' })
  }

  const confirmarNoRealizada = () => {
    if (!activeLead) return
    updateLead(activeLead.id, { resultadoLlamada: resultadoDraft })
    setShowResultadoNoRealizada(false)
    setShowReagendar(true)
  }

  const confirmarReagendar = (event) => {
    event.preventDefault()
    if (!activeLead) return
    updateLead(activeLead.id, {
      fechaAgenda: reagendarForm.fecha || activeLead.fechaAgenda,
      horaAgenda: reagendarForm.hora || activeLead.horaAgenda,
      resultadoLlamada: null,
      etapa: 'agendada',
    })
    setShowReagendar(false)
    setReagendarForm({ fecha: '', hora: '' })
  }

  const marcarCompraEnLlamada = (compro) => {
    if (!activeLead) return
    if (compro) {
      setShowVentaForm(true)
    } else {
      updateLead(activeLead.id, { compraEnLlamada: false, etapa: 'seguimiento' })
    }
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
      notasSeguimiento: [...(activeLead.notasSeguimiento || []), { fecha: todayISO(), nota: noteDraft.trim() }],
      seguimiento: { ...activeLead.seguimiento, realizado: true },
    })
    setNoteDraft('')
  }

  const setContesta = (valor) => {
    if (!activeLead) return
    updateLead(activeLead.id, { seguimiento: { ...activeLead.seguimiento, contesta: valor, compraTrasSeguimiento: valor ? activeLead.seguimiento?.compraTrasSeguimiento : null } })
  }

  const setCompraTrasSeguimiento = (compro) => {
    if (!activeLead) return
    if (compro) {
      setShowVentaForm(true)
    } else {
      updateLead(activeLead.id, {
        seguimiento: { ...activeLead.seguimiento, compraTrasSeguimiento: false },
        etapa: 'perdida',
        motivoPerdida: 'No compró tras seguimiento',
      })
    }
  }

  const handleServicioChange = (id) => {
    const encontrado = SERVICIOS.find((s) => s.id === id)
    setVentaForm((prev) => ({
      ...prev,
      servicioId: id,
      importe: encontrado ? encontrado.precio : prev.importe,
    }))
  }

  const confirmarVenta = (event) => {
    event.preventDefault()
    if (!activeLead) return

    const servicioSeleccionado = SERVICIOS.find((s) => s.id === ventaForm.servicioId)
    const servicioNombre = ventaForm.servicioId === 'otro'
      ? (ventaForm.otroNombre.trim() || 'Servicio personalizado')
      : (servicioSeleccionado?.nombre || '')
    const importeNum = Number(ventaForm.importe) || 0
    const pagoLabel = ventaForm.tipoPago === 'unico' ? 'PAGO ÚNICO' : `${ventaForm.numPlazos} PLAZOS`
    const fechaInicio = ventaForm.fechaInicio || todayISO()
    const meses = ventaForm.servicioId === 'otro' ? 0 : (servicioSeleccionado?.meses || 0)
    const fechaFin = addMonthsISO(fechaInicio, meses)
    const numPlazosNum = ventaForm.tipoPago === 'plazos' ? Number(ventaForm.numPlazos) : 1
    const importePorPlazo = numPlazosNum > 0 ? Math.round((importeNum / numPlazosNum) * 100) / 100 : importeNum

    const nuevoCliente = {
      Nombre: activeLead.nombre,
      Email: activeLead.email,
      'Tipo de cliente': ventaForm.tipoCliente,
      'Servicio contratado': servicioNombre,
      'Estado del cliente': 'ACTIVO',
      'Forma de pago': ventaForm.formaPago,
      Pago: pagoLabel,
      'Primer pago': importePorPlazo,
      'Segundo pago': ventaForm.tipoPago === 'plazos' && numPlazosNum >= 2 ? importePorPlazo : '',
      'Tercer pago': ventaForm.tipoPago === 'plazos' && numPlazosNum >= 3 ? importePorPlazo : '',
      'Fecha primer pago': fechaInicio,
      'Fecha segundo pago': ventaForm.tipoPago === 'plazos' && numPlazosNum >= 2 ? addMonthsISO(fechaInicio, 1) : '',
      'Fecha tercer pago': ventaForm.tipoPago === 'plazos' && numPlazosNum >= 3 ? addMonthsISO(fechaInicio, 2) : '',
      Renueva: 'No',
      Drive: '',
      Trabajadores: [],
      'Fecha inicio': fechaInicio,
      'Fecha fin': fechaFin,
      Teléfono: activeLead.telefono,
      // Trazabilidad del origen de la venta (no forma parte del CSV original de Notion).
      Closer: activeLead.closer || '',
      'Importe total': importeNum,
      'Nº de plazos': numPlazosNum,
      'Lead origen': activeLead.id,
    }

    if (typeof setClientes === 'function') {
      setClientes((prev) => [nuevoCliente, ...prev])
    }

    updateLead(activeLead.id, {
      etapa: 'ganada',
      compraEnLlamada: activeLead.etapa === 'realizada' ? true : activeLead.compraEnLlamada,
      venta: {
        servicio: servicioNombre,
        importe: importeNum,
        tipoPago: ventaForm.tipoPago,
        numPlazos: ventaForm.tipoPago === 'plazos' ? Number(ventaForm.numPlazos) : null,
        formaPago: ventaForm.formaPago,
        fechaCierre: todayISO(),
      },
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
          <div className="topbar-subtitle">
            {activeTab === 'pipeline' && 'Pipeline comercial: de la llamada al cliente'}
            {activeTab === 'setting' && 'Setting de Instagram: bienvenidas y follow-ups'}
            {activeTab === 'ads' && 'Inversión y resultados de Ads'}
            {activeTab === 'recontactar' && 'Personas a las que hay que volver a contactar'}
          </div>
        </div>
        <div className="topbar-right">
          {activeTab === 'pipeline' && (
            <button className="add-client-btn" onClick={() => setShowNewLead(true)}>＋ Nuevo lead</button>
          )}
        </div>
      </header>

      <main className="page-content">
        <div className="tabs-bar">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'pipeline' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            📞 Pipeline
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'setting' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('setting')}
          >
            👋 Setting Instagram
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'ads' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('ads')}
          >
            📊 KPI Ads
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'recontactar' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('recontactar')}
          >
            🔁 Recontactar
          </button>
        </div>

        {activeTab === 'setting' && (
          <SettingInstagram setting={setting} setSetting={setSetting} />
        )}

        {activeTab === 'ads' && (
          <AdsKpi
            adsKpi={adsKpi}
            setAdsKpi={setAdsKpi}
            adsNotas={adsNotas}
            setAdsNotas={setAdsNotas}
            anuncios={anuncios}
            setAnuncios={setAnuncios}
          />
        )}

        {activeTab === 'recontactar' && (
          <Recontactar
            ventas={ventas}
            setVentas={setVentas}
            recontactos={recontactos}
            setRecontactos={setRecontactos}
          />
        )}

        {activeTab === 'pipeline' && (
          <>
        <div className="closer-manual-banner">
          <div>
            <p className="closer-manual-title">📄 Manual del Closer</p>
            <p className="closer-manual-desc">Protocolo pre-llamada, casos de éxito, guion de la llamada, tarifas y manejo de objeciones.</p>
          </div>
          <a
            className="primary-action"
            href="/manual-closer-mg.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver / descargar PDF
          </a>
        </div>

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
        </>
        )}
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
              <div className="lead-detail-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <input type="date" value={leadForm.fechaAgenda}
                  onChange={(e) => setLeadForm({ ...leadForm, fechaAgenda: e.target.value })} />
                <input type="time" value={leadForm.horaAgenda}
                  onChange={(e) => setLeadForm({ ...leadForm, horaAgenda: e.target.value })} />
              </div>
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
                  <label className="lead-detail-label">Día de agenda</label>
                  <input type="date" value={activeLead.fechaAgenda || ''}
                    onChange={(e) => updateLead(activeLead.id, { fechaAgenda: e.target.value })} />
                </div>
                <div>
                  <label className="lead-detail-label">Hora de agenda</label>
                  <input type="time" value={activeLead.horaAgenda || ''}
                    onChange={(e) => updateLead(activeLead.id, { horaAgenda: e.target.value })} />
                </div>
              </div>

              <div className="lead-detail-row" style={{ gridTemplateColumns: '1fr' }}>
                <span className="status-pill status-activo">{ETAPAS.find((e) => e.id === activeLead.etapa)?.label}</span>
              </div>

              {activeLead.etapa !== 'agendada' && (
                <div>
                  <label className="lead-detail-label">🎥 Grabación de la llamada</label>
                  <input
                    type="url"
                    placeholder="Enlace a la grabación (Drive, Loom, Zoom...)"
                    value={activeLead.grabacionUrl || ''}
                    onChange={(e) => updateLead(activeLead.id, { grabacionUrl: e.target.value })}
                  />
                </div>
              )}

              {/* ---- Etapa: Agendada ---- */}
              {activeLead.etapa === 'agendada' && !showReagendar && !showResultadoNoRealizada && (
                <>
                  <div>
                    <label className="lead-detail-label">Checklist pre-llamada</label>
                    <div className="lead-checklist">
                      <label><input type="checkbox" checked={!!activeLead.preLlamada?.whatsapp} onChange={() => toggleCheck('whatsapp')} /> Contacto por WhatsApp</label>
                      <label><input type="checkbox" checked={!!activeLead.preLlamada?.prellamada} onChange={() => toggleCheck('prellamada')} /> Enviar prellamada</label>
                      <label><input type="checkbox" checked={!!activeLead.preLlamada?.recordatorio} onChange={() => toggleCheck('recordatorio')} /> Recordatorio de llamada</label>
                    </div>
                  </div>
                  <div className="lead-detail-actions">
                    <button type="button" className="primary-action" onClick={marcarLlamadaRealizada}>Llamada realizada →</button>
                    <button type="button" className="secondary-action" onClick={() => setShowResultadoNoRealizada(true)}>Llamada no realizada…</button>
                  </div>
                </>
              )}

              {showResultadoNoRealizada && (
                <div className="lead-venta-form">
                  <p className="plan-subtitle-inline">¿Qué pasó con la llamada?</p>
                  <select value={resultadoDraft} onChange={(e) => setResultadoDraft(e.target.value)}>
                    {RESULTADO_NO_REALIZADA.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <div className="modal-actions">
                    <button type="button" className="secondary-action" onClick={() => setShowResultadoNoRealizada(false)}>Cancelar</button>
                    <button type="button" className="primary-action" onClick={confirmarNoRealizada}>Confirmar</button>
                  </div>
                </div>
              )}

              {showReagendar && (
                <form className="lead-venta-form" onSubmit={confirmarReagendar}>
                  <p className="plan-subtitle-inline">Reagendar llamada</p>
                  <div className="lead-detail-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <input type="date" value={reagendarForm.fecha} onChange={(e) => setReagendarForm({ ...reagendarForm, fecha: e.target.value })} />
                    <input type="time" value={reagendarForm.hora} onChange={(e) => setReagendarForm({ ...reagendarForm, hora: e.target.value })} />
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="secondary-action" onClick={() => setShowReagendar(false)}>Ahora no</button>
                    <button type="submit" className="primary-action">Reagendar</button>
                  </div>
                </form>
              )}

              {/* ---- Etapa: Llamada realizada (pendiente de decisión) ---- */}
              {activeLead.etapa === 'realizada' && !showVentaForm && (
                <div>
                  <p className="plan-subtitle-inline">¿Compró en la propia llamada?</p>
                  <div className="lead-detail-actions">
                    <button type="button" className="primary-action" onClick={() => marcarCompraEnLlamada(true)}>Sí, compró ✅</button>
                    <button type="button" className="danger-action" onClick={() => marcarCompraEnLlamada(false)}>No compró</button>
                  </div>
                </div>
              )}

              {/* ---- Etapa: Seguimiento ---- */}
              {activeLead.etapa === 'seguimiento' && !showVentaForm && !showLostForm && (
                <div>
                  <p className="plan-subtitle-inline">Seguimiento</p>
                  <div className="lead-detail-actions" style={{ marginBottom: 8 }}>
                    <button type="button"
                      className={`secondary-action ${activeLead.seguimiento?.contesta === true ? 'active-toggle' : ''}`}
                      onClick={() => setContesta(true)}>Contesta ✅</button>
                    <button type="button"
                      className={`secondary-action ${activeLead.seguimiento?.contesta === false ? 'active-toggle' : ''}`}
                      onClick={() => setContesta(false)}>No contesta</button>
                  </div>
                  {activeLead.seguimiento?.contesta === true && (
                    <div className="lead-detail-actions">
                      <span className="lead-detail-label" style={{ alignSelf: 'center' }}>¿Compra?</span>
                      <button type="button" className="primary-action" onClick={() => setCompraTrasSeguimiento(true)}>Sí ✅</button>
                      <button type="button" className="danger-action" onClick={() => setCompraTrasSeguimiento(false)}>No</button>
                    </div>
                  )}
                </div>
              )}

              {showVentaForm && (
                <form className="modal-form lead-venta-form" onSubmit={confirmarVenta}>
                  <p className="plan-subtitle-inline">Datos de la venta</p>
                  <select value={ventaForm.tipoCliente} onChange={(e) => setVentaForm({ ...ventaForm, tipoCliente: e.target.value })}>
                    <option value="HIGH TICKET">HIGH TICKET</option>
                    <option value="LOW TICKET">LOW TICKET</option>
                  </select>

                  <label className="lead-detail-label">Programa</label>
                  <select value={ventaForm.servicioId} onChange={(e) => handleServicioChange(e.target.value)}>
                    {SERVICIOS.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre} — {s.precio}€</option>
                    ))}
                    <option value="otro">Otro (personalizado)</option>
                  </select>

                  {ventaForm.servicioId === 'otro' && (
                    <input placeholder="Nombre del servicio" value={ventaForm.otroNombre}
                      onChange={(e) => setVentaForm({ ...ventaForm, otroNombre: e.target.value })} />
                  )}

                  <label className="lead-detail-label">Importe (€)</label>
                  <input type="number" placeholder="Importe (€)" value={ventaForm.importe}
                    onChange={(e) => setVentaForm({ ...ventaForm, importe: e.target.value })} />

                  <select value={ventaForm.formaPago} onChange={(e) => setVentaForm({ ...ventaForm, formaPago: e.target.value })}>
                    <option>Stripe</option>
                    <option>Bizum</option>
                    <option>Transferencia</option>
                    <option value="HOTMART">HOTMART</option>
                  </select>

                  <label className="lead-detail-label">Forma de cobro</label>
                  <select value={ventaForm.tipoPago} onChange={(e) => setVentaForm({ ...ventaForm, tipoPago: e.target.value })}>
                    <option value="unico">Pago único</option>
                    <option value="plazos">Pago a plazos</option>
                  </select>

                  {ventaForm.tipoPago === 'plazos' && (
                    <select value={ventaForm.numPlazos} onChange={(e) => setVentaForm({ ...ventaForm, numPlazos: e.target.value })}>
                      <option value="3">3 plazos</option>
                      <option value="6">6 plazos</option>
                      <option value="9">9 plazos</option>
                      <option value="12">12 plazos</option>
                    </select>
                  )}

                  <input type="date" placeholder="Fecha de inicio" value={ventaForm.fechaInicio}
                    onChange={(e) => setVentaForm({ ...ventaForm, fechaInicio: e.target.value })} />
                  <div className="modal-actions">
                    <button type="button" className="secondary-action" onClick={() => setShowVentaForm(false)}>Cancelar</button>
                    <button type="submit" className="primary-action">Confirmar venta y crear cliente</button>
                  </div>
                </form>
              )}

              {activeLead.etapa !== 'ganada' && activeLead.etapa !== 'perdida' && !showLostForm && (
                <div className="lead-detail-actions">
                  <button type="button" className="danger-action" onClick={() => setShowLostForm(true)}>Marcar como perdida</button>
                </div>
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
                  ✅ Vendido: {activeLead.venta.servicio} · {activeLead.venta.importe}€ · {activeLead.venta.tipoPago === 'unico' ? 'pago único' : `${activeLead.venta.numPlazos} plazos`} · cerrado el {activeLead.venta.fechaCierre}
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
                  <label className="lead-detail-label">Notas de seguimiento</label>
                  <ul className="lead-log-list">
                    {(activeLead.notasSeguimiento || []).map((s, i) => (
                      <li key={i}><strong>{s.fecha}</strong> — {s.nota}</li>
                    ))}
                    {(activeLead.notasSeguimiento || []).length === 0 && <li className="lead-log-empty">Sin seguimiento registrado.</li>}
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
