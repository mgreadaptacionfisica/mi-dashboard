import { useMemo, useState } from 'react'
import SeguimientoCliente from './SeguimientoCliente'
import ContactoSemanal from './ContactoSemanal'
import { insertMiembroRemote, updateMiembroRemote, deleteMiembroRemote, deleteAllMiembrosRemote } from '../lib/queries/miembrosEquipo'
import { semanaActualISO, progresoSemana, progresoContacto, ultimaRevisionCliente, semanaVacia, DIAS_SEMANA } from '../utils/seguimientoHelpers'
import { upsertSeguimientoRemote } from '../lib/queries/seguimientos'
import { insertFinanzaRemote, deleteFinanzaRemote } from '../lib/queries/finanzas'
import { actividadTecnico, seguimientoTecnico, contactoTecnico, mesActualISO, mesLabel } from '../utils/equipoHelpers'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const HORAS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTOS = ['00', '15', '30', '45']

const esCloser = (persona) => (persona.rol || '').toLowerCase().includes('closer')

const ETAPA_LABELS = {
  agendada: 'Agendada',
  realizada: 'Llamada realizada',
  seguimiento: 'Seguimiento',
  ganada: 'Ganada',
  perdida: 'Perdida',
}

const SEGUIMIENTO_HELPERS = { semanaActualISO, progresoSemana, progresoContacto, ultimaRevisionCliente }

function PersonCard({ persona, assignedCount, comisionInfo, pagoInfo, onEdit, onDelete, onDetail }) {
  return (
    <div className="team-card">
      <div className="team-card-header">
        <div>
          <h3>{persona.nombre}</h3>
          <p className="team-role">{persona.rol}</p>
        </div>
      </div>
      <div className="team-card-body">
        <p><strong>Email:</strong> {persona.email}</p>
        <p><strong>Teléfono:</strong> {persona.telefono}</p>
        {persona.carpetaDrive && (
          <p>
            <strong>Carpeta Drive:</strong>{' '}
            <a href={persona.carpetaDrive} target="_blank" rel="noopener noreferrer">Abrir 📁</a>
          </p>
        )}
        {esCloser(persona) && (
          <>
            <p><strong>Comisión:</strong> {persona.comision != null ? `${persona.comision}%` : 'Sin definir'}</p>
            <p><strong>Fijo mensual:</strong> {persona.fijo ? `${persona.fijo}€` : 'Sin definir'}</p>
          </>
        )}
      </div>
      {comisionInfo && (
        <div className="team-commission-box">
          <div className="team-commission-row">
            <span>Ventas este mes</span>
            <strong>{comisionInfo.ventasMes}</strong>
          </div>
          <div className="team-commission-row">
            <span>Facturado este mes</span>
            <strong>{comisionInfo.facturadoMes.toLocaleString('es-ES')}€</strong>
          </div>
          <div className="team-commission-row">
            <span>Comisión</span>
            <strong>{comisionInfo.comisionMes.toLocaleString('es-ES', { maximumFractionDigits: 2 })}€</strong>
          </div>
          <div className="team-commission-row">
            <span>Fijo mensual</span>
            <strong>{comisionInfo.fijo.toLocaleString('es-ES')}€</strong>
          </div>
          <div className="team-commission-row team-commission-highlight">
            <span>Total a pagar este mes</span>
            <strong>{comisionInfo.totalMes.toLocaleString('es-ES', { maximumFractionDigits: 2 })}€</strong>
          </div>
        </div>
      )}
      {pagoInfo && (
        <div className="team-commission-box">
          <div className="team-commission-row">
            <span>Clientes activos</span>
            <strong>{pagoInfo.activos}</strong>
          </div>
          <div className="team-commission-row">
            <span>Tarifa aplicada</span>
            <strong>{pagoInfo.tarifaActual}€/cliente</strong>
          </div>
          <div className="team-commission-row team-commission-highlight">
            <span>Total a pagar este mes</span>
            <strong>{pagoInfo.totalMes.toLocaleString('es-ES')}€</strong>
          </div>
        </div>
      )}
      <div className="team-card-actions">
        {typeof onDetail === 'function' && (
          <button className="team-edit-btn" type="button" title="Ver actividad completa" onClick={onDetail}>📊 Ver actividad</button>
        )}
        {typeof onEdit === 'function' && (
          <button className="team-edit-btn" type="button" title="Editar miembro del equipo" onClick={onEdit}>✎ Editar</button>
        )}
        {typeof onDelete === 'function' && (
          <button className="team-delete-btn" type="button" title="Eliminar miembro del equipo" onClick={onDelete}>🗑️ Eliminar</button>
        )}
      </div>
      {typeof assignedCount === 'number' && (
        <div className="team-card-footer">
          <span>{assignedCount} cliente{assignedCount === 1 ? '' : 's'} asignado{assignedCount === 1 ? '' : 's'}</span>
        </div>
      )}
    </div>
  )
}

export default function Equipo({ team, setTeam, clientes, ventas = [], seguimientos = [], setSeguimientos, gastosEmpresa = [], setGastosEmpresa, contactosSemanales = [], setContactosSemanales, valoraciones = [], objetivosClienteFase = [], revisionesSemanales = [], setRevisionesSemanales, miEmail }) {
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [detailCloser, setDetailCloser] = useState(null)
  const [detailTecnico, setDetailTecnico] = useState(null)
  const [seguimientoClienteAbierto, setSeguimientoClienteAbierto] = useState(null)
  const [revisionForm, setRevisionForm] = useState({ clienteNombre: '', persona: '', dia: 'lunes', hora: '10', minuto: '00', ampm: 'AM' })
  const [formData, setFormData] = useState({
    nombre: '',
    rol: '',
    email: '',
    telefono: '',
    area: 'tecnico',
    comision: '',
    fijo: '',
    carpetaDrive: '',
  })
  const isEditing = Boolean(editingMember)

  const clienteCount = useMemo(() => {
    return team.tecnico.reduce((acc, persona) => {
      acc[persona.nombre] = clientes.filter(cliente => {
        const asignados = cliente.Trabajadores || (cliente.Trabajador ? [cliente.Trabajador] : [])
        return asignados.includes(persona.nombre)
      }).length
      return acc
    }, {})
  }, [team, clientes])

  const tecnicoCount = team.tecnico.length
  const ventasCount = team.ventas.length
  const contenidoCount = (team.contenido || []).length

  // Pagos al equipo (comisión+fijo de closers, tarifa de técnicos) registrados
  // como gasto profesional. Se identifican por persona + mes para poder marcar
  // o deshacer el pago de un mes concreto sin duplicar registros.
  const pagoRegistrado = (persona, mesKey) =>
    gastosEmpresa.find((g) => g.origen === 'equipo' && g.personaNombre === persona.nombre && g.mes === mesKey)

  const marcarPago = (persona, importe, mesKey) => {
    if (typeof setGastosEmpresa !== 'function') return
    const nuevo = {
      id: `gasto-equipo-${persona.nombre}-${mesKey}`,
      fecha: todayISO(),
      concepto: `Pago equipo - ${persona.nombre} (${mesLabel(mesKey)})`,
      importe: Number(importe) || 0,
      categoria: esCloser(persona) ? 'Comisión closer' : 'Pago técnico',
      notas: '',
      origen: 'equipo',
      personaNombre: persona.nombre,
      mes: mesKey,
    }
    setGastosEmpresa((prev) => [nuevo, ...prev])
    insertFinanzaRemote('gastos_empresa', nuevo)
  }

  const deshacerPago = (persona, mesKey) => {
    if (typeof setGastosEmpresa !== 'function') return
    setGastosEmpresa((prev) => prev.filter((g) => !(g.origen === 'equipo' && g.personaNombre === persona.nombre && g.mes === mesKey)))
    deleteFinanzaRemote('gastos_empresa', `gasto-equipo-${persona.nombre}-${mesKey}`)
  }

  const comisionPorCloser = useMemo(() => {
    const mesActual = new Date().toISOString().slice(0, 7) // YYYY-MM
    return team.ventas.reduce((acc, persona) => {
      if (!esCloser(persona)) return acc
      const ventasDelMes = ventas.filter((lead) =>
        lead.closer === persona.nombre &&
        lead.etapa === 'ganada' &&
        lead.venta?.fechaCierre?.startsWith(mesActual)
      )
      const facturadoMes = ventasDelMes.reduce((sum, lead) => sum + (Number(lead.venta?.importe) || 0), 0)
      const comisionMes = facturadoMes * ((Number(persona.comision) || 0) / 100)
      const fijo = Number(persona.fijo) || 0
      acc[persona.nombre] = { ventasMes: ventasDelMes.length, facturadoMes, comisionMes, fijo, totalMes: comisionMes + fijo }
      return acc
    }, {})
  }, [team, ventas])

  // Actividad completa por closer: leads asignados, llamadas, conversión,
  // cumplimiento de checklist e historial mensual de comisión + fijo.
  const actividadPorCloser = useMemo(() => {
    return team.ventas.reduce((acc, persona) => {
      if (!esCloser(persona)) return acc
      const leads = ventas.filter((lead) => lead.closer === persona.nombre)
      const llamadasRealizadas = leads.filter((lead) => lead.resultadoLlamada === 'realizada')
      const ganadas = leads.filter((lead) => lead.etapa === 'ganada')
      const perdidas = leads.filter((lead) => lead.etapa === 'perdida')
      const checklistCompleto = leads.filter((lead) =>
        lead.preLlamada?.whatsapp && lead.preLlamada?.prellamada && lead.preLlamada?.recordatorio
      )
      const tasaConversion = llamadasRealizadas.length > 0
        ? Math.round((ganadas.length / llamadasRealizadas.length) * 100)
        : 0

      const meses = {}
      leads.forEach((lead) => {
        const mesAgenda = (lead.fechaAgenda || lead.creadoEn || '').slice(0, 7)
        if (mesAgenda) {
          meses[mesAgenda] = meses[mesAgenda] || { leads: 0, llamadas: 0, ventas: 0, facturado: 0 }
          meses[mesAgenda].leads += 1
          if (lead.resultadoLlamada === 'realizada') meses[mesAgenda].llamadas += 1
        }
        if (lead.etapa === 'ganada' && lead.venta?.fechaCierre) {
          const mesCierre = lead.venta.fechaCierre.slice(0, 7)
          meses[mesCierre] = meses[mesCierre] || { leads: 0, llamadas: 0, ventas: 0, facturado: 0 }
          meses[mesCierre].ventas += 1
          meses[mesCierre].facturado += Number(lead.venta.importe) || 0
        }
      })

      const historial = Object.keys(meses)
        .sort((a, b) => b.localeCompare(a))
        .map((mes) => {
          const datos = meses[mes]
          const comision = datos.facturado * ((Number(persona.comision) || 0) / 100)
          const fijo = Number(persona.fijo) || 0
          return { mes, ...datos, comision, fijo, total: comision + fijo }
        })

      acc[persona.nombre] = {
        leads,
        totalLeads: leads.length,
        llamadasRealizadas: llamadasRealizadas.length,
        ganadas: ganadas.length,
        perdidas: perdidas.length,
        tasaConversion,
        checklistCompleto: checklistCompleto.length,
        historial,
      }
      return acc
    }, {})
  }, [team, ventas])

  // Actividad y pago del equipo técnico: clientes asignados (activos e históricos),
  // tarifa según volumen y desglose mensual de pago derivado de las fechas del cliente.
  // Al pasar un cliente a NO ACTIVO se le desasigna automáticamente (ver Clientes.jsx),
  // y al cambiar de servicio el pago se recalcula solo porque se deriva en vivo de los datos.
  // Lógica compartida con MiFicha.jsx (auto-servicio del técnico) — ver utils/equipoHelpers.js.
  const actividadPorTecnico = useMemo(() => {
    return team.tecnico.reduce((acc, persona) => {
      acc[persona.nombre] = actividadTecnico(persona, clientes)
      return acc
    }, {})
  }, [team, clientes])

  // Resumen del seguimiento semanal por técnico: progreso de tareas revisadas
  // de la semana actual (por cliente y agregado) y última revisión registrada.
  // Al agruparse por técnico, cada persona solo ve sus propios clientes aquí;
  // falta el login (ver Supabase pendiente) para que esto sea un acceso real
  // por persona en vez de una vista compartida.
  const seguimientoPorTecnico = useMemo(() => {
    return team.tecnico.reduce((acc, persona) => {
      const clientesAsignados = actividadPorTecnico[persona.nombre]?.clientesAsignados || []
      acc[persona.nombre] = seguimientoTecnico(clientesAsignados, seguimientos, SEGUIMIENTO_HELPERS)
      return acc
    }, {})
  }, [team, seguimientos, actividadPorTecnico])

  // Progreso agregado del contacto semanal (3 checks por cliente) de la semana actual.
  const contactoPorTecnico = useMemo(() => {
    return team.tecnico.reduce((acc, persona) => {
      const clientesAsignados = actividadPorTecnico[persona.nombre]?.clientesAsignados || []
      acc[persona.nombre] = contactoTecnico(clientesAsignados, contactosSemanales, SEGUIMIENTO_HELPERS)
      return acc
    }, {})
  }, [team, contactosSemanales, actividadPorTecnico])

  const registrarRevisionManual = (event) => {
    event.preventDefault()
    if (!revisionForm.clienteNombre || !revisionForm.persona) return
    const semanaActual = semanaActualISO()
    const horaTexto = `${revisionForm.hora}:${revisionForm.minuto} ${revisionForm.ampm}`
    const nuevaRevision = { persona: revisionForm.persona, dia: revisionForm.dia, hora: horaTexto, fecha: todayISO() }

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

  const abrirDetalleTecnico = (persona) => {
    const clientesDePersona = actividadPorTecnico[persona.nombre]?.clientesAsignados || []
    setRevisionForm({
      clienteNombre: clientesDePersona[0]?.Nombre || '',
      persona: persona.nombre,
      dia: 'lunes',
      hora: '10',
      minuto: '00',
      ampm: 'AM',
    })
    setDetailTecnico(persona)
  }

  const deleteMember = (area, index) => {
    const persona = team[area][index]
    setTeam(prev => ({
      ...prev,
      [area]: prev[area].filter((_, i) => i !== index),
    }))
    if (persona?.id) deleteMiembroRemote(persona.id)
  }

  const clearTeam = () => {
    if (window.confirm('¿Eliminar todo el equipo? Esta acción limpiará técnicos, comerciales y contenido.')) {
      setTeam({ tecnico: [], ventas: [], contenido: [] })
      deleteAllMiembrosRemote()
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const base = {
      nombre: formData.nombre || 'Nuevo miembro',
      rol: formData.rol || (formData.area === 'ventas' ? 'Closer' : 'Especialista'),
      email: formData.email || 'nuevo@mg-group.com',
      telefono: formData.telefono || '+34 600 000 000',
      ...(formData.area === 'ventas' ? {
        comision: formData.comision === '' ? undefined : Number(formData.comision),
        fijo: formData.fijo === '' ? undefined : Number(formData.fijo),
      } : {}),
      ...(formData.area === 'contenido' ? { carpetaDrive: formData.carpetaDrive || '' } : {}),
    }

    if (isEditing && editingMember) {
      const existente = team[editingMember.area][editingMember.index]
      const miembroActualizado = { ...base, id: existente?.id }
      setTeam(prev => ({
        ...prev,
        [editingMember.area]: prev[editingMember.area].map((item, index) =>
          index === editingMember.index ? miembroActualizado : item
        ),
      }))
      if (existente?.id) updateMiembroRemote(existente.id, miembroActualizado, editingMember.area)
    } else {
      const miembroActualizado = { ...base, id: `team-${formData.area}-${Date.now()}` }
      setTeam(prev => ({
        ...prev,
        [formData.area]: [miembroActualizado, ...prev[formData.area]],
      }))
      insertMiembroRemote(miembroActualizado, formData.area)
    }

    setFormData({ nombre: '', rol: '', email: '', telefono: '', area: 'tecnico', comision: '', fijo: '', carpetaDrive: '' })
    setEditingMember(null)
    setShowModal(false)
  }

  const openNewMemberModal = (area = 'tecnico') => {
    setFormData({ nombre: '', rol: '', email: '', telefono: '', area, comision: '', fijo: '', carpetaDrive: '' })
    setEditingMember(null)
    setShowModal(true)
  }

  const startEditMember = (area, index) => {
    const persona = team[area][index]
    setFormData({
      nombre: persona.nombre,
      rol: persona.rol,
      email: persona.email,
      telefono: persona.telefono,
      area,
      comision: persona.comision != null ? String(persona.comision) : '',
      fijo: persona.fijo != null ? String(persona.fijo) : '',
      carpetaDrive: persona.carpetaDrive || '',
    })
    setEditingMember({ area, index })
    setShowModal(true)
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Equipo</div>
          <div className="topbar-subtitle">Técnico, ventas y contenido</div>
        </div>
      </header>

      <main className="page-content">
        <div className="team-global-actions">
          <button className="danger-action" type="button" onClick={clearTeam}>🚮 Vaciar equipo</button>
        </div>
        <section className="team-section">
          <div className="team-section-header">
            <div>
              <h2>Equipo técnico</h2>
              <p>Entrenador, nutricionista, psicólogo y fisioterapeuta.</p>
            </div>
            <button className="add-team-btn" onClick={() => openNewMemberModal('tecnico')}>＋ Añadir técnico</button>
          </div>
          <div className="team-grid">
            {team.tecnico.map((persona, index) => (
              <PersonCard
                key={`${persona.nombre}-${index}`}
                persona={persona}
                assignedCount={clienteCount[persona.nombre] ?? 0}
                pagoInfo={actividadPorTecnico[persona.nombre]}
                onEdit={() => startEditMember('tecnico', index)}
                onDelete={() => deleteMember('tecnico', index)}
                onDetail={() => abrirDetalleTecnico(persona)}
              />
            ))}
          </div>
          <div className="team-summary-bar">
            <span>{tecnicoCount} técnicos activos</span>
            <span>{Object.values(clienteCount).reduce((sum, value) => sum + value, 0)} clientes asignados</span>
          </div>
        </section>

        <section className="team-section">
          <div className="team-section-header">
            <div>
              <h2>Equipo de ventas</h2>
              <p>Cierra clientes y gestiona el pipeline comercial.</p>
            </div>
          </div>
          <div className="team-grid">
            {team.ventas.map((persona, index) => (
              <PersonCard
                key={`${persona.nombre}-${index}`}
                persona={persona}
                comisionInfo={esCloser(persona) ? comisionPorCloser[persona.nombre] : null}
                onEdit={() => startEditMember('ventas', index)}
                onDelete={() => deleteMember('ventas', index)}
                onDetail={esCloser(persona) ? () => setDetailCloser(persona) : null}
              />
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="add-team-btn" onClick={() => openNewMemberModal('ventas')}>＋ Añadir comercial</button>
          </div>
          <div className="team-summary-bar">
            <span>{ventasCount} miembros de ventas</span>
          </div>
        </section>

        <section className="team-section">
          <div className="team-section-header">
            <div>
              <h2>Equipo de contenido</h2>
              <p>Editores de vídeo y encargados de redes sociales.</p>
            </div>
          </div>
          <div className="team-grid">
            {(team.contenido || []).map((persona, index) => (
              <PersonCard
                key={`${persona.nombre}-${index}`}
                persona={persona}
                onEdit={() => startEditMember('contenido', index)}
                onDelete={() => deleteMember('contenido', index)}
              />
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="add-team-btn" onClick={() => openNewMemberModal('contenido')}>＋ Añadir editor de contenido</button>
          </div>
          <div className="team-summary-bar">
            <span>{contenidoCount} miembros de contenido</span>
          </div>
        </section>
      </main>

      {showModal && (
        <div className="client-modal-overlay" onClick={() => { setShowModal(false); setEditingMember(null) }}>
          <div className="client-modal" onClick={event => event.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{isEditing ? 'Editar miembro del equipo' : 'Añadir miembro del equipo'}</div>
                <div className="card-subtitle">{isEditing ? 'Actualiza los datos del miembro' : 'Crea un técnico o comercial nuevo para el panel'}</div>
              </div>
              <button className="close-modal-btn" onClick={() => { setShowModal(false); setEditingMember(null) }}>✕</button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <input
                required
                placeholder="Nombre"
                value={formData.nombre}
                onChange={event => setFormData({ ...formData, nombre: event.target.value })}
              />
              <input
                placeholder="Rol"
                value={formData.rol}
                onChange={event => setFormData({ ...formData, rol: event.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={event => setFormData({ ...formData, email: event.target.value })}
              />
              <input
                placeholder="Teléfono"
                value={formData.telefono}
                onChange={event => setFormData({ ...formData, telefono: event.target.value })}
              />
              <select
                value={formData.area}
                onChange={event => setFormData({ ...formData, area: event.target.value })}
              >
                <option value="tecnico">Técnico</option>
                <option value="ventas">Ventas</option>
                <option value="contenido">Contenido</option>
              </select>
              {formData.area === 'ventas' && (
                <>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Comisión por venta (%) — solo Closer"
                    value={formData.comision}
                    onChange={event => setFormData({ ...formData, comision: event.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Fijo mensual (€) — solo Closer"
                    value={formData.fijo}
                    onChange={event => setFormData({ ...formData, fijo: event.target.value })}
                  />
                </>
              )}
              {formData.area === 'contenido' && (
                <input
                  type="url"
                  placeholder="Carpeta de Google Drive (enlace) — donde deja los vídeos en bruto"
                  value={formData.carpetaDrive}
                  onChange={event => setFormData({ ...formData, carpetaDrive: event.target.value })}
                />
              )}
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar miembro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailCloser && (
        <div className="client-modal-overlay" onClick={() => setDetailCloser(null)}>
          <div className="client-modal team-activity-modal" onClick={event => event.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{detailCloser.nombre}</div>
                <div className="card-subtitle">Actividad comercial completa</div>
              </div>
              <button className="close-modal-btn" onClick={() => setDetailCloser(null)}>✕</button>
            </div>

            {(() => {
              const act = actividadPorCloser[detailCloser.nombre]
              if (!act || act.totalLeads === 0) {
                return <p className="lead-log-empty" style={{ padding: '12px 4px' }}>Todavía no tiene leads asignados en el pipeline.</p>
              }
              return (
                <div className="team-activity-body">
                  <div className="team-activity-kpis">
                    <div className="team-activity-kpi"><span>Leads asignados</span><strong>{act.totalLeads}</strong></div>
                    <div className="team-activity-kpi"><span>Llamadas realizadas</span><strong>{act.llamadasRealizadas}</strong></div>
                    <div className="team-activity-kpi"><span>Ventas ganadas</span><strong>{act.ganadas}</strong></div>
                    <div className="team-activity-kpi"><span>Perdidas</span><strong>{act.perdidas}</strong></div>
                    <div className="team-activity-kpi"><span>Tasa de conversión</span><strong>{act.tasaConversion}%</strong></div>
                    <div className="team-activity-kpi"><span>Checklist completo</span><strong>{act.checklistCompleto}/{act.totalLeads}</strong></div>
                  </div>

                  {(() => {
                    const mesKey = mesActualISO()
                    const importe = comisionPorCloser[detailCloser.nombre]?.totalMes || 0
                    const pago = pagoRegistrado(detailCloser, mesKey)
                    return (
                      <div className="team-payment-box">
                        <div>
                          <p className="team-payment-label">Pago de {mesLabel(mesKey)}</p>
                          <p className="team-payment-amount">{importe.toLocaleString('es-ES', { maximumFractionDigits: 2 })}€</p>
                        </div>
                        {pago ? (
                          <div className="team-payment-actions">
                            <span className="status-pill status-activo">✅ Pagado el {pago.fecha}</span>
                            <button type="button" className="secondary-action" onClick={() => deshacerPago(detailCloser, mesKey)}>Deshacer</button>
                          </div>
                        ) : (
                          <button type="button" className="primary-action" onClick={() => marcarPago(detailCloser, importe, mesKey)}>
                            Marcar como pagado
                          </button>
                        )}
                      </div>
                    )
                  })()}

                  <h4 className="team-activity-subtitle">Historial mensual (comisión + fijo)</h4>
                  <div className="team-history-table">
                    <div className="team-history-row team-history-header">
                      <span>Mes</span><span>Leads</span><span>Llamadas</span><span>Ventas</span><span>Facturado</span><span>Comisión</span><span>Fijo</span><span>Total</span>
                    </div>
                    {act.historial.length === 0 && <p className="lead-log-empty">Sin historial todavía.</p>}
                    {act.historial.map((row) => (
                      <div className="team-history-row" key={row.mes}>
                        <span>{row.mes}</span>
                        <span>{row.leads}</span>
                        <span>{row.llamadas}</span>
                        <span>{row.ventas}</span>
                        <span>{row.facturado.toLocaleString('es-ES')}€</span>
                        <span>{row.comision.toLocaleString('es-ES', { maximumFractionDigits: 2 })}€</span>
                        <span>{row.fijo.toLocaleString('es-ES')}€</span>
                        <strong>{row.total.toLocaleString('es-ES', { maximumFractionDigits: 2 })}€</strong>
                      </div>
                    ))}
                  </div>

                  <h4 className="team-activity-subtitle">Leads asignados</h4>
                  <ul className="lead-log-list team-activity-leadlist">
                    {act.leads.map((lead) => (
                      <li key={lead.id}>
                        <strong>{lead.nombre}</strong> — {ETAPA_LABELS[lead.etapa] || lead.etapa}
                        {lead.fechaAgenda ? ` · ${lead.fechaAgenda}${lead.horaAgenda ? ` ${lead.horaAgenda}` : ''}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {detailTecnico && (
        <div className="client-modal-overlay" onClick={() => setDetailTecnico(null)}>
          <div className="client-modal team-activity-modal" onClick={event => event.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{detailTecnico.nombre}</div>
                <div className="card-subtitle">Actividad y pago</div>
              </div>
              <button className="close-modal-btn" onClick={() => setDetailTecnico(null)}>✕</button>
            </div>

            {(() => {
              const act = actividadPorTecnico[detailTecnico.nombre]
              const seg = seguimientoPorTecnico[detailTecnico.nombre]
              const contacto = contactoPorTecnico[detailTecnico.nombre]
              if (!act || act.totalAsignados === 0) {
                return <p className="lead-log-empty" style={{ padding: '12px 4px' }}>Todavía no tiene clientes asignados.</p>
              }
              return (
                <div className="team-activity-body">
                  <div className="team-activity-kpis">
                    <div className="team-activity-kpi"><span>Clientes asignados</span><strong>{act.totalAsignados}</strong></div>
                    <div className="team-activity-kpi"><span>Activos ahora</span><strong>{act.activos}</strong></div>
                    <div className="team-activity-kpi"><span>Tarifa actual</span><strong>{act.tarifaActual}€/cliente</strong></div>
                    <div className="team-activity-kpi"><span>Total a pagar este mes</span><strong>{act.totalMes.toLocaleString('es-ES')}€</strong></div>
                    <div className="team-activity-kpi"><span>Contacto semanal (3x)</span><strong>{contacto?.total > 0 ? `${contacto.hechos}/${contacto.total} (${contacto.porcentaje}%)` : '—'}</strong></div>
                    <div className="team-activity-kpi"><span>Progreso tareas semana</span><strong>{seg?.porcentajeGeneral != null ? `${seg.porcentajeGeneral}%` : '—'}</strong></div>
                    <div className="team-activity-kpi"><span>Última revisión</span><strong style={{ fontSize: 13 }}>{seg?.ultimaRevisionGeneral || 'Sin revisiones'}</strong></div>
                  </div>

                  {(() => {
                    const mesKey = mesActualISO()
                    const importe = act.totalMes || 0
                    const pago = pagoRegistrado(detailTecnico, mesKey)
                    return (
                      <div className="team-payment-box">
                        <div>
                          <p className="team-payment-label">Pago de {mesLabel(mesKey)}</p>
                          <p className="team-payment-amount">{importe.toLocaleString('es-ES')}€</p>
                        </div>
                        {pago ? (
                          <div className="team-payment-actions">
                            <span className="status-pill status-activo">✅ Pagado el {pago.fecha}</span>
                            <button type="button" className="secondary-action" onClick={() => deshacerPago(detailTecnico, mesKey)}>Deshacer</button>
                          </div>
                        ) : (
                          <button type="button" className="primary-action" onClick={() => marcarPago(detailTecnico, importe, mesKey)}>
                            Marcar como pagado
                          </button>
                        )}
                      </div>
                    )
                  })()}

                  <h4 className="team-activity-subtitle">Historial mensual de pago</h4>
                  <div className="team-history-table">
                    <div className="team-history-row team-history-header" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                      <span>Mes</span><span>Clientes activos</span><span>Tarifa</span><span>Total</span>
                    </div>
                    {act.historial.length === 0 && <p className="lead-log-empty">Sin historial calculable (revisa el formato de las fechas).</p>}
                    {act.historial.map((row) => (
                      <div className="team-history-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }} key={row.mes}>
                        <span>{row.mes}</span>
                        <span>{row.clientes}</span>
                        <span>{row.tarifa}€</span>
                        <strong>{row.total.toLocaleString('es-ES')}€</strong>
                      </div>
                    ))}
                  </div>

                  <h4 className="team-activity-subtitle">Contacto semanal por cliente (3x)</h4>
                  <p className="team-activity-hint">Lunes: inicio de semana · Miércoles/jueves: mitad de semana · Viernes/sábado: fin de semana.</p>
                  <ContactoSemanal
                    clientes={act.clientesAsignados}
                    contactos={contactosSemanales}
                    setContactos={setContactosSemanales}
                  />

                  <h4 className="team-activity-subtitle">Seguimiento semanal por cliente</h4>
                  <ul className="lead-log-list team-activity-leadlist seguimiento-resumen-list">
                    {seg?.resumenClientes.map(({ cliente, progreso, ultimaRevision }, i) => (
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
                        {typeof setSeguimientos === 'function' && (
                          <button type="button" className="secondary-action" onClick={() => setSeguimientoClienteAbierto(cliente)}>Ver semana</button>
                        )}
                      </li>
                    ))}
                  </ul>

                  {typeof setSeguimientos === 'function' && (
                    <>
                      <h4 className="team-activity-subtitle">Registrar última revisión</h4>
                      <form className="seguimiento-revision-form" onSubmit={registrarRevisionManual}>
                        <select value={revisionForm.clienteNombre} onChange={(e) => setRevisionForm({ ...revisionForm, clienteNombre: e.target.value })}>
                          <option value="">Selecciona cliente</option>
                          {(act.clientesAsignados || []).map((c) => <option key={c.Nombre} value={c.Nombre}>{c.Nombre}</option>)}
                        </select>
                        <select value={revisionForm.persona} onChange={(e) => setRevisionForm({ ...revisionForm, persona: e.target.value })}>
                          {team.tecnico.map((p) => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
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

                      {seg?.revisionesRecientes?.length > 0 && (
                        <ul className="lead-log-list" style={{ marginTop: 10 }}>
                          {seg.revisionesRecientes.map((r, i) => (
                            <li key={i}>
                              <strong>{r.persona}</strong> revisó a <strong>{r.clienteNombre}</strong> — {DIAS_SEMANA.find((d) => d.id === r.dia)?.label} a las {r.hora} ({r.fecha})
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {seguimientoClienteAbierto && typeof setSeguimientos === 'function' && (
        <SeguimientoCliente
          cliente={seguimientoClienteAbierto}
          seguimientos={seguimientos}
          setSeguimientos={setSeguimientos}
          valoraciones={valoraciones}
          objetivosClienteFase={objetivosClienteFase}
          revisionesSemanales={revisionesSemanales}
          setRevisionesSemanales={setRevisionesSemanales}
          miEmail={miEmail}
          onClose={() => setSeguimientoClienteAbierto(null)}
        />
      )}
    </>
  )
}
