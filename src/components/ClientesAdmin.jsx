import { useMemo, useState } from 'react'
import SERVICIOS from '../data/servicios'
import RENOVACIONES from '../data/renovaciones'
import SeguimientoCliente from './SeguimientoCliente'
import ValoracionCliente from './ValoracionCliente'
import FasesObjetivos from './FasesObjetivos'
import CobrosPendientes from './CobrosPendientes'
import { insertClienteRemote, updateClienteRemote, deleteClienteRemote } from '../lib/queries/clientes'
import { renombrarClienteEnHistorial } from '../lib/queries/renombrarCliente'
import { generarPlazosPorNumero, generarPlazosDesdeFecha } from '../lib/plazos'
import { parseFechaFlexible, formatFechaISO } from '../utils/fechasEsp'

// Tres estados posibles. "EN PAUSA" es para clientes que ya han comprado
// pero todavía no han empezado (o que paran temporalmente y volverán): ni
// están activos —no hay que hacerles seguimiento aún, así que no salen en
// Seguimiento y Valoración— ni son bajas, así que conservan su técnico
// asignado y una fecha para retomarlos.
// El filtro de estado del listado. Por defecto se ven los ACTIVO y los
// EN PAUSA juntos ('ACTIVO+PAUSA'): los pausados son clientes vivos que hay
// que tener delante para no olvidarse de retomarlos; si quedaran escondidos
// tras un filtro, la fecha de aviso no serviría de nada.
const estadoOptions = [
  { value: 'ACTIVO+PAUSA', label: 'ACTIVO + EN PAUSA' },
  { value: 'ACTIVO', label: 'Solo ACTIVO' },
  { value: 'EN PAUSA', label: 'Solo EN PAUSA' },
  { value: 'NO ACTIVO', label: 'NO ACTIVO' },
  { value: 'Todos', label: 'Todos' },
]

const initialForm = {
  nombre: '',
  email: '',
  servicioId: SERVICIOS[0]?.id ?? '',
  otroServicio: '',
  estado: 'ACTIVO',
  pausaHasta: '',
  pausaMotivo: '',
  formaPago: 'Stripe',
  drive: '',
  trabajadores: [],
  fechaInicio: '',
  fechaFin: '',
  renueva: 'No',
  renovacionId: RENOVACIONES[0]?.id ?? '',
  otraRenovacion: '',
  importeRenovacion: RENOVACIONES[0]?.precio ?? '',
  fechaRenovacion: '',
  pagoRenovacion: 'COMPLETO',
  pago: 'COMPLETO',
  importeTotal: '',
  plazosDetalle: [],
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Genera el plan de cobros: 1 pago único si es COMPLETO, o 2/3 plazos
// repartiendo el importe total a partes iguales, con fechas mensuales a
// partir de hoy. Todos empiezan como pendientes y se marcan como
// cobrados después desde "Cobros pendientes" (que es lo que crea el
// ingreso automático en Finanzas).
function generarPlazos(pago, importeTotal) {
  const n = pago === '3 PLAZOS' ? 3 : pago === '2 PLAZOS' ? 2 : 1
  return generarPlazosPorNumero(n, importeTotal)
}

// El valor "Renueva" de los clientes sincronizados de Notion venía en inglés
// (Yes/No); lo normalizamos para no duplicar lógica por todo el componente.
function normalizaRenueva(valor) {
  const v = (valor || '').toString().trim().toLowerCase()
  if (v === 'yes' || v === 'sí' || v === 'si' || v === 'true') return 'Sí'
  return 'No'
}

// Las fechas vienen de la sincronización con Notion en formatos distintos
// (ISO, texto largo en español, día-mes-año con guiones o barras). Se
// interpretan con parseFechaFlexible y se muestran siempre igual
// (DD/MM/AAAA); si no se puede interpretar se enseña el valor original en
// vez de ocultarlo, para no perder datos antiguos sin revisar.
function formatDate(value) {
  if (!value) return '—'
  const iso = parseFechaFlexible(value)
  return iso ? formatFechaISO(iso) : value
}

// ¿A este cliente en pausa ya le tocaba volver? (fecha de aviso hoy o pasada)
function pausaVencida(cliente) {
  const iso = parseFechaFlexible(cliente['Fecha fin de pausa'])
  return Boolean(iso) && iso <= todayISO()
}

// Ya no se pide "HIGH TICKET / LOW TICKET" a mano: la categoría se deduce
// del propio programa contratado (Readáptate = alto valor, Previene = low ticket).
function categoriaPrograma(nombreServicio) {
  const s = (nombreServicio || '').toUpperCase()
  if (s.includes('PREVIENE')) return 'Programa Previene'
  if (s.includes('READAPTATE')) return 'Programa Readáptate'
  return 'Otro'
}

// El estado "EN PAUSA" se pinta a propósito más llamativo que los otros dos
// (ámbar, con punto parpadeante): es un estado transitorio que hay que ver de
// un vistazo en el listado para no olvidarse de retomar al cliente.
function StatusPill({ estado }) {
  const normalized = (estado || '').toLowerCase()
  if (normalized === 'en pausa') {
    return <span className="status-pill status-pausa"><span className="status-pausa-dot" />⏸️ EN PAUSA</span>
  }
  const className = normalized === 'activo' ? 'status-activo' : 'status-inactivo'
  return <span className={`status-pill ${className}`}>{estado || 'Sin estado'}</span>
}

// Permite asignar varios profesionales a un mismo cliente
// (ej. fisioterapeuta + entrenador, o fisioterapeuta + nutricionista).
function MultiTrabajadorSelect({ options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const lista = selected || []

  const toggle = (name) => {
    if (lista.includes(name)) {
      onChange(lista.filter(n => n !== name))
    } else {
      onChange([...lista, name])
    }
  }

  return (
    <div className="multi-worker-select">
      <button type="button" className="multi-worker-trigger" onClick={() => setOpen(o => !o)}>
        <span>{lista.length === 0 ? 'Sin asignar' : lista.join(', ')}</span>
        <span className="multi-worker-caret">▾</span>
      </button>
      {open && (
        <div className="multi-worker-dropdown" onMouseLeave={() => setOpen(false)}>
          {options.length === 0 && <p className="lead-log-empty" style={{ padding: '6px 10px' }}>Sin técnicos en el equipo.</p>}
          {options.map(name => (
            <label key={name} className="multi-worker-option">
              <input type="checkbox" checked={lista.includes(name)} onChange={() => toggle(name)} />
              {name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ClientesAdmin({ clientes, setClientes, team, seguimientos = [], setSeguimientos, valoraciones = [], setValoraciones, contactosSemanales = [], setContactosSemanales, ingresosEmpresa = [], setIngresosEmpresa, gastosEmpresa = [], setGastosEmpresa, tarifasPasarela = [], objetivosClienteFase = [], setObjetivosClienteFase, revisionesSemanales = [], setRevisionesSemanales, miEmail }) {
  const [vista, setVista] = useState('listado')
  const [search, setSearch] = useState('')
  // Por defecto se ven los clientes en curso: ACTIVO y EN PAUSA (menos ruido
  // visual que "Todos"); desde el desplegable se puede cambiar a "NO ACTIVO",
  // a uno solo de los dos, o a "Todos".
  const [estado, setEstado] = useState('ACTIVO+PAUSA')
  const [servicio, setServicio] = useState('Todos')
  const [categoria, setCategoria] = useState('Todos')
  const [trabajador, setTrabajador] = useState('Todos')
  const [renuevaFiltro, setRenuevaFiltro] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [formData, setFormData] = useState(initialForm)
  const [seguimientoCliente, setSeguimientoCliente] = useState(null)
  const [valoracionCliente, setValoracionCliente] = useState(null)
  const [fasesCliente, setFasesCliente] = useState(null)

  const tecnicoNames = useMemo(
    () => team?.tecnico.map(persona => persona.nombre) ?? [],
    [team]
  )

  // Compatibilidad: clientes antiguos guardaban un único "Trabajador" (string);
  // los nuevos guardan "Trabajadores" (array), para poder asignar varios.
  const clientesConTrabajador = useMemo(() =>
    clientes.map(cliente => ({
      ...cliente,
      Trabajadores: cliente.Trabajadores || (cliente.Trabajador ? [cliente.Trabajador] : []),
    })),
    [clientes]
  )

  const trabajadorOptions = useMemo(() => {
    const opciones = new Set([
      ...tecnicoNames,
      ...clientesConTrabajador.flatMap(cliente => cliente.Trabajadores),
    ])
    return ['Todos', 'Sin asignar', ...Array.from(opciones)]
  }, [clientesConTrabajador, tecnicoNames])

  const servicioCounts = useMemo(() => {
    const counts = {}
    clientesConTrabajador.forEach(cliente => {
      const nombreServicio = cliente['Servicio contratado'] || 'Sin servicio'
      counts[nombreServicio] = (counts[nombreServicio] || 0) + 1
    })
    return counts
  }, [clientesConTrabajador])

  const filteredClientes = useMemo(() => {
    const term = search.toLowerCase().trim()
    return clientesConTrabajador
      .map((cliente, index) => ({ ...cliente, originalIndex: index }))
      .filter(cliente => {
        const matchesSearch = !term || [
          cliente.Nombre,
          cliente.Email,
          cliente['Servicio contratado'],
          cliente['Forma de pago'],
          cliente.Trabajadores.join(' '),
        ].some(value => (value || '').toLowerCase().includes(term))

        const estadoCliente = (cliente['Estado del cliente'] || '').toUpperCase()
        const matchesEstado = estado === 'Todos'
          || (estado === 'ACTIVO+PAUSA' ? (estadoCliente === 'ACTIVO' || estadoCliente === 'EN PAUSA') : estadoCliente === estado)
        const matchesServicio = servicio === 'Todos' || (cliente['Servicio contratado'] || '').toUpperCase() === servicio.toUpperCase()
        const matchesCategoria = categoria === 'Todos' || categoriaPrograma(cliente['Servicio contratado']) === categoria
        const matchesTrabajador = trabajador === 'Todos' ||
          (trabajador === 'Sin asignar' ? cliente.Trabajadores.length === 0 : cliente.Trabajadores.includes(trabajador))
        const matchesRenueva = renuevaFiltro === 'Todos' || normalizaRenueva(cliente.Renueva) === renuevaFiltro

        return matchesSearch && matchesEstado && matchesServicio && matchesCategoria && matchesTrabajador && matchesRenueva
      })
  }, [search, estado, servicio, categoria, trabajador, renuevaFiltro, clientesConTrabajador])

  const stats = useMemo(() => {
    const activos = clientesConTrabajador.filter(c => (c['Estado del cliente'] || '').toUpperCase() === 'ACTIVO').length
    const noActivos = clientesConTrabajador.filter(c => (c['Estado del cliente'] || '').toUpperCase() === 'NO ACTIVO').length
    const enPausa = clientesConTrabajador.filter(c => (c['Estado del cliente'] || '').toUpperCase() === 'EN PAUSA')
    // Pausas "vencidas": ya ha llegado (o pasado) el día en el que tocaba
    // retomar al cliente y sigue en pausa. Es el número que interesa vigilar.
    const hoy = todayISO()
    const pausasVencidas = enPausa.filter(c => {
      const iso = parseFechaFlexible(c['Fecha fin de pausa'])
      return iso && iso <= hoy
    }).length
    const readaptate = clientesConTrabajador.filter(c => categoriaPrograma(c['Servicio contratado']) === 'Programa Readáptate').length
    const previene = clientesConTrabajador.filter(c => categoriaPrograma(c['Servicio contratado']) === 'Programa Previene').length
    const renuevan = clientesConTrabajador.filter(c => normalizaRenueva(c.Renueva) === 'Sí').length
    return { activos, noActivos, enPausa: enPausa.length, pausasVencidas, readaptate, previene, renuevan }
  }, [clientesConTrabajador])

  const plazosPendientesCount = useMemo(
    () => clientes.reduce((sum, c) => sum + (c.Plazos || []).filter(p => !p.pagado).length, 0),
    [clientes]
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    const servicioSeleccionado = SERVICIOS.find(s => s.id === formData.servicioId)
    const nombreServicio = formData.servicioId === 'otro'
      ? (formData.otroServicio.trim() || 'Servicio personalizado')
      : (servicioSeleccionado?.nombre || '')

    const renovacionSeleccionada = RENOVACIONES.find(r => r.id === formData.renovacionId)
    const nombreRenovacion = formData.renovacionId === 'otro'
      ? (formData.otraRenovacion.trim() || 'Renovación personalizada')
      : (renovacionSeleccionada?.nombre || '')

    // Si el cliente pasa a NO ACTIVO, se le quita automáticamente
    // la asignación de profesionales del equipo técnico.
    const trabajadoresFinal = formData.estado === 'NO ACTIVO' ? [] : (formData.trabajadores || [])

    // El plan de plazos solo se genera la primera vez (cliente nuevo, o
    // cliente editado que todavía no tenía uno). Si ya existe un plan
    // (con plazos quizá ya cobrados), no se toca aquí para no perder ese
    // historial: las correcciones de importe/fecha se hacen desde
    // "Cobros pendientes".
    const planExistente = isEditing && editingIndex !== null ? (clientes[editingIndex].Plazos || []) : []
    const plazosContrato = planExistente.length > 0 ? planExistente : generarPlazos(formData.pago, formData.importeTotal)

    // Cobros de la RENOVACIÓN: antes se guardaban solo como campos sueltos
    // en la ficha ("Importe/Fecha renovación") y no llegaban nunca a Cobros
    // pendientes ni a contabilidad. Ahora, si el cliente renueva, se generan
    // como plazos extra dentro del mismo array Plazos (pueden ser 1 pago o
    // 2/3 plazos, según "pagoRenovacion"), marcados con origen:'renovacion'
    // y la fecha de esa renovación. Idempotente: si ya existen plazos de
    // renovación para esa misma fecha (p. ej. al reeditar el cliente), se
    // conservan tal cual —con su estado de cobro— y no se duplican; cuando
    // el cliente vuelva a renovar en OTRA fecha, se crean unos nuevos.
    let plazosFinal = plazosContrato
    const importeRenov = Number(formData.importeRenovacion) || 0
    const fechaRenovValida = /^\d{4}-\d{2}-\d{2}$/.test(formData.fechaRenovacion || '')
    if (formData.renueva === 'Sí' && importeRenov > 0 && fechaRenovValida) {
      const yaGenerada = plazosContrato.some((p) => p.origen === 'renovacion' && p.renovacionFecha === formData.fechaRenovacion)
      if (!yaGenerada) {
        const nRenov = formData.pagoRenovacion === '3 PLAZOS' ? 3 : formData.pagoRenovacion === '2 PLAZOS' ? 2 : 1
        const maxNumero = plazosContrato.reduce((m, p) => Math.max(m, p.numero || 0), 0)
        const plazosRenov = generarPlazosDesdeFecha(nRenov, importeRenov, formData.fechaRenovacion).map((p, i) => ({
          ...p,
          numero: maxNumero + i + 1,
          origen: 'renovacion',
          renovacionFecha: formData.fechaRenovacion,
          concepto: `Renovación${nombreRenovacion ? ' — ' + nombreRenovacion : ''}${nRenov > 1 ? ` (${i + 1}/${nRenov})` : ''}`,
        }))
        plazosFinal = [...plazosContrato, ...plazosRenov]
      }
    }

    // Los clientes nunca tuvieron id propio (ni en el CSV ni en el estado
    // en memoria); se genera uno estable al crear y se conserva al editar,
    // igual que se hizo con anuncios/miembros_equipo/recontactos.
    const idExistente = isEditing && editingIndex !== null ? clientes[editingIndex].id : null
    const id = idExistente || `cliente-${Date.now()}`

    const clienteActualizado = {
      id,
      Nombre: formData.nombre,
      Email: formData.email,
      'Servicio contratado': nombreServicio,
      'Estado del cliente': formData.estado,
      // Los datos de la pausa solo tienen sentido mientras el cliente está en
      // pausa: al reactivarlo (o darlo de baja) se limpian, para que no quede
      // una fecha vieja avisando en el Dashboard.
      'Fecha fin de pausa': formData.estado === 'EN PAUSA' ? formData.pausaHasta : '',
      'Motivo de la pausa': formData.estado === 'EN PAUSA' ? formData.pausaMotivo : '',
      'Forma de pago': formData.formaPago,
      Drive: formData.drive,
      Trabajadores: trabajadoresFinal,
      'Fecha inicio': formData.fechaInicio,
      'Fecha fin': formData.fechaFin,
      Renueva: formData.renueva,
      'Forma de renovación': formData.renueva === 'Sí' ? nombreRenovacion : '',
      'Importe renovación': formData.renueva === 'Sí' ? formData.importeRenovacion : '',
      'Fecha renovación': formData.renueva === 'Sí' ? formData.fechaRenovacion : '',
      Pago: formData.pago,
      'Importe total': formData.importeTotal,
      Plazos: plazosFinal,
    }

    if (isEditing && editingIndex !== null) {
      const nombreViejo = clientes[editingIndex]?.Nombre || ''
      const nombreNuevo = formData.nombre
      setClientes(prev => prev.map((item, index) => index === editingIndex ? clienteActualizado : item))
      updateClienteRemote(id, clienteActualizado)

      // Si se ha corregido el nombre, arrastra ese cambio a todo el
      // historial del cliente (seguimiento, contacto, valoración, fases,
      // revisiones): el panel enlaza por nombre, así que sin esto el
      // historial se quedaría colgando del nombre viejo. Se actualiza en
      // memoria (para verlo al instante, sin recargar) y en Supabase.
      if (nombreViejo && nombreNuevo && nombreViejo !== nombreNuevo) {
        const renombra = (arr) => arr.map((r) => (r.clienteNombre === nombreViejo ? { ...r, clienteNombre: nombreNuevo } : r))
        if (typeof setSeguimientos === 'function') setSeguimientos(renombra)
        if (typeof setContactosSemanales === 'function') setContactosSemanales(renombra)
        if (typeof setValoraciones === 'function') setValoraciones(renombra)
        if (typeof setObjetivosClienteFase === 'function') setObjetivosClienteFase(renombra)
        if (typeof setRevisionesSemanales === 'function') setRevisionesSemanales(renombra)
        renombrarClienteEnHistorial(nombreViejo, nombreNuevo)
      }
    } else {
      setClientes(prev => [clienteActualizado, ...prev])
      insertClienteRemote(clienteActualizado)
    }

    setFormData(initialForm)
    setShowModal(false)
    setIsEditing(false)
    setEditingIndex(null)
  }

  const openNewClientModal = () => {
    setFormData(initialForm)
    setIsEditing(false)
    setEditingIndex(null)
    setShowModal(true)
  }

  const startEditCliente = (index) => {
    const cliente = clientes[index]
    const servicioActual = cliente['Servicio contratado'] || ''
    const servicioEncontrado = SERVICIOS.find(s => s.nombre === servicioActual)
    const renovacionActual = cliente['Forma de renovación'] || ''
    const renovacionEncontrada = RENOVACIONES.find(r => r.nombre === renovacionActual)
    // Refleja el tipo de pago de la renovación a partir de cuántos plazos de
    // renovación ya tiene generados (1 = COMPLETO, 2/3 = a plazos). Si aún
    // no hay ninguno, por defecto COMPLETO.
    const nPlazosRenov = (cliente.Plazos || []).filter(p => p.origen === 'renovacion').length
    const pagoRenovActual = nPlazosRenov >= 3 ? '3 PLAZOS' : nPlazosRenov === 2 ? '2 PLAZOS' : 'COMPLETO'
    setFormData({
      nombre: cliente.Nombre || '',
      email: cliente.Email || '',
      servicioId: servicioEncontrado ? servicioEncontrado.id : 'otro',
      otroServicio: servicioEncontrado ? '' : servicioActual,
      estado: cliente['Estado del cliente'] || 'ACTIVO',
      pausaHasta: parseFechaFlexible(cliente['Fecha fin de pausa']) || cliente['Fecha fin de pausa'] || '',
      pausaMotivo: cliente['Motivo de la pausa'] || '',
      formaPago: cliente['Forma de pago'] || 'Stripe',
      drive: cliente.Drive || '',
      trabajadores: cliente.Trabajadores || (cliente.Trabajador ? [cliente.Trabajador] : []),
      // Se normaliza a ISO (para que el selector de calendario la muestre
      // bien); si viene en un formato que no reconocemos se deja el valor
      // original para no perderlo — el selector se verá vacío hasta que se
      // corrija a mano esa fecha concreta.
      fechaInicio: parseFechaFlexible(cliente['Fecha inicio']) || cliente['Fecha inicio'] || '',
      fechaFin: parseFechaFlexible(cliente['Fecha fin']) || cliente['Fecha fin'] || '',
      renueva: normalizaRenueva(cliente.Renueva),
      renovacionId: renovacionActual ? (renovacionEncontrada ? renovacionEncontrada.id : 'otro') : (RENOVACIONES[0]?.id ?? ''),
      otraRenovacion: renovacionActual && !renovacionEncontrada ? renovacionActual : '',
      importeRenovacion: cliente['Importe renovación'] || RENOVACIONES[0]?.precio || '',
      fechaRenovacion: parseFechaFlexible(cliente['Fecha renovación']) || cliente['Fecha renovación'] || '',
      pagoRenovacion: pagoRenovActual,
      pago: cliente.Pago || 'COMPLETO',
      importeTotal: cliente['Importe total'] || '',
      plazosDetalle: cliente.Plazos || [],
    })
    setIsEditing(true)
    setEditingIndex(index)
    setShowModal(true)
  }

  // Por si se crea un cliente de más (ej. explicando el proceso a alguien
  // y se guarda sin querer). No existía ninguna forma de borrar un
  // cliente, solo de crear/editar.
  const eliminarCliente = () => {
    if (editingIndex === null) return
    const cliente = clientes[editingIndex]
    if (!window.confirm(`¿Eliminar a "${cliente?.Nombre || 'este cliente'}"? Esta acción no se puede deshacer.`)) return
    setClientes(prev => prev.filter((_, index) => index !== editingIndex))
    if (cliente?.id) deleteClienteRemote(cliente.id)
    setShowModal(false)
    setIsEditing(false)
    setEditingIndex(null)
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Clientes</div>
          <div className="topbar-subtitle">Gestión y seguimiento de clientes</div>
        </div>
      </header>

      <main className="page-content">
        <div className="tabs-bar">
          <button
            type="button"
            className={`tab-btn ${vista === 'listado' ? 'tab-btn-active' : ''}`}
            onClick={() => setVista('listado')}
          >
            👥 Listado
          </button>
          <button
            type="button"
            className={`tab-btn ${vista === 'cobros' ? 'tab-btn-active' : ''}`}
            onClick={() => setVista('cobros')}
          >
            💳 Cobros pendientes{plazosPendientesCount > 0 ? ` (${plazosPendientesCount})` : ''}
          </button>
        </div>

        {vista === 'cobros' && (
          <CobrosPendientes
            clientes={clientes}
            setClientes={setClientes}
            setIngresosEmpresa={setIngresosEmpresa}
            setGastosEmpresa={setGastosEmpresa}
            tarifasPasarela={tarifasPasarela}
          />
        )}

        {vista === 'listado' && (
        <>
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Total clientes</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>👥</div>
            </div>
            <div className="kpi-card-value">{clientes.length}</div>
            <div className="kpi-card-footer">
              <span className="badge-up">▲ 100%</span>
              <span className="badge-text">base cargada</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Activos</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>✅</div>
            </div>
            <div className="kpi-card-value">{stats.activos}</div>
            <div className="kpi-card-footer">
              <span className="badge-up">▲ {Math.round((stats.activos / Math.max(clientes.length, 1)) * 100)}%</span>
              <span className="badge-text">del total</span>
            </div>
          </div>

          <div className={`kpi-card ${stats.pausasVencidas > 0 ? 'kpi-card-pausa' : ''}`}>
            <div className="kpi-card-header">
              <span className="kpi-card-label">En pausa</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ffedd5, #fed7aa)' }}>⏸️</div>
            </div>
            <div className="kpi-card-value">{stats.enPausa}</div>
            <div className="kpi-card-footer">
              {stats.pausasVencidas > 0
                ? <><span className="badge-down">⏰ {stats.pausasVencidas}</span><span className="badge-text">con la fecha ya cumplida</span></>
                : <span className="badge-text">aún no han empezado</span>}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">No activos</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>❌</div>
            </div>
            <div className="kpi-card-value">{stats.noActivos}</div>
            <div className="kpi-card-footer">
              <span className="badge-down">▼ {Math.round((stats.noActivos / Math.max(clientes.length, 1)) * 100)}%</span>
              <span className="badge-text">necesitan seguimiento</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Programa Readáptate</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>⭐</div>
            </div>
            <div className="kpi-card-value">{stats.readaptate}</div>
            <div className="kpi-card-footer">
              <span className="badge-up">▲ {Math.round((stats.readaptate / Math.max(clientes.length, 1)) * 100)}%</span>
              <span className="badge-text">del total</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Programa Previene</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>🛡️</div>
            </div>
            <div className="kpi-card-value">{stats.previene}</div>
            <div className="kpi-card-footer">
              <span className="badge-up">▲ {Math.round((stats.previene / Math.max(clientes.length, 1)) * 100)}%</span>
              <span className="badge-text">del total</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Renuevan</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>🔄</div>
            </div>
            <div className="kpi-card-value">{stats.renuevan}</div>
            <div className="kpi-card-footer">
              <span className="badge-up">▲ {Math.round((stats.renuevan / Math.max(clientes.length, 1)) * 100)}%</span>
              <span className="badge-text">del total</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Vista rápida</div>
              <div className="card-subtitle">Distribuye y visualiza clientes por servicio contratado</div>
            </div>
            <button className="add-client-btn" onClick={openNewClientModal}>＋ Añadir cliente</button>
          </div>

          <div className="quick-view-grid">
            <button
              className={`quick-view-pill ${categoria === 'Todos' ? 'active' : ''}`}
              onClick={() => setCategoria('Todos')}
            >
              <span>Todos</span>
              <strong>{clientesConTrabajador.length}</strong>
            </button>
            <button
              className={`quick-view-pill ${categoria === 'Programa Readáptate' ? 'active' : ''}`}
              onClick={() => setCategoria('Programa Readáptate')}
            >
              <span>Programa Readáptate</span>
              <strong>{stats.readaptate}</strong>
            </button>
            <button
              className={`quick-view-pill ${categoria === 'Programa Previene' ? 'active' : ''}`}
              onClick={() => setCategoria('Programa Previene')}
            >
              <span>Programa Previene</span>
              <strong>{stats.previene}</strong>
            </button>
          </div>

          <div className="filters-grid">
            <input
              className="filter-input"
              placeholder="Buscar por nombre, email, servicio o trabajador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="filter-select" value={estado} onChange={e => setEstado(e.target.value)}>
              {estadoOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select className="filter-select" value={servicio} onChange={e => setServicio(e.target.value)}>
              <option value="Todos">Todos los programas</option>
              {SERVICIOS.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
              {Object.keys(servicioCounts).filter(nombre => !SERVICIOS.some(s => s.nombre === nombre)).map(nombre => (
                <option key={nombre} value={nombre}>{nombre}</option>
              ))}
            </select>
            <select className="filter-select" value={trabajador} onChange={e => setTrabajador(e.target.value)}>
              {trabajadorOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <select className="filter-select" value={renuevaFiltro} onChange={e => setRenuevaFiltro(e.target.value)}>
              <option value="Todos">Renueva: Todos</option>
              <option value="Sí">Renueva: Sí</option>
              <option value="No">Renueva: No</option>
            </select>
          </div>
        </div>

        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">Listado de clientes</div>
              <div className="card-subtitle">{filteredClientes.length} resultados</div>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Servicio</th>
                  <th>Estado</th>
                  <th>Profesionales</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Renueva</th>
                  <th>Forma de pago</th>
                  <th>Email</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((cliente, index) => (
                  <tr key={`${cliente.Nombre}-${index}`}>
                    <td style={{ fontWeight: 600 }}>{cliente.Nombre || '—'}</td>
                    <td>{categoriaPrograma(cliente['Servicio contratado'])}</td>
                    <td>{cliente['Servicio contratado'] || '—'}</td>
                    <td>
                      <StatusPill estado={cliente['Estado del cliente']} />
                      {(cliente['Estado del cliente'] || '').toUpperCase() === 'EN PAUSA' && (
                        <div className="cliente-pausa-info">
                          {cliente['Fecha fin de pausa'] ? (
                            <span className={pausaVencida(cliente) ? 'cliente-pausa-vencida' : ''}>
                              {pausaVencida(cliente) ? '⏰ tocaba el' : '📅 retomar el'} {formatDate(cliente['Fecha fin de pausa'])}
                            </span>
                          ) : (
                            <span>Sin fecha de aviso</span>
                          )}
                          {cliente['Motivo de la pausa'] && <div>{cliente['Motivo de la pausa']}</div>}
                          {/* Atajo para reactivar sin abrir la ficha: es lo que hace
                              que el cliente vuelva a Seguimiento y Valoración. */}
                          <button
                            type="button"
                            className="row-action-btn"
                            style={{ marginTop: 4 }}
                            onClick={() => {
                              const patch = { 'Estado del cliente': 'ACTIVO', 'Fecha fin de pausa': '', 'Motivo de la pausa': '' }
                              setClientes(prev => prev.map((item, i) => i === cliente.originalIndex ? { ...item, ...patch } : item))
                              if (cliente.id) updateClienteRemote(cliente.id, patch)
                            }}
                          >
                            ▶ Activar
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <MultiTrabajadorSelect
                        options={tecnicoNames}
                        selected={cliente.Trabajadores}
                        onChange={(nuevos) => {
                          setClientes(prev => prev.map((item, i) => i === cliente.originalIndex ? { ...item, Trabajadores: nuevos } : item))
                          if (cliente.id) updateClienteRemote(cliente.id, { Trabajadores: nuevos })
                        }}
                      />
                    </td>
                    <td>{formatDate(cliente['Fecha inicio'])}</td>
                    <td>{formatDate(cliente['Fecha fin'])}</td>
                    <td>
                      <span className={`status-pill ${normalizaRenueva(cliente.Renueva) === 'Sí' ? 'status-activo' : 'status-inactivo'}`}>
                        {normalizaRenueva(cliente.Renueva)}
                      </span>
                      {normalizaRenueva(cliente.Renueva) === 'Sí' && cliente['Forma de renovación'] && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 3 }}>
                          {cliente['Forma de renovación']}{cliente['Importe renovación'] ? ` · ${cliente['Importe renovación']}€` : ''}
                        </div>
                      )}
                    </td>
                    <td>{cliente['Forma de pago'] || '—'}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      {cliente.Email || '—'}
                      {cliente.Drive && (
                        <> · <a href={cliente.Drive} target="_blank" rel="noopener noreferrer">Drive</a></>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="row-action-btn"
                        onClick={() => startEditCliente(cliente.originalIndex)}
                      >
                        Editar
                      </button>
                      {typeof setSeguimientos === 'function' && (
                        <button
                          type="button"
                          className="row-action-btn"
                          onClick={() => setSeguimientoCliente(cliente)}
                        >
                          📋 Seguimiento
                        </button>
                      )}
                      {typeof setValoraciones === 'function' && (
                        <button
                          type="button"
                          className="row-action-btn"
                          onClick={() => setValoracionCliente(cliente)}
                        >
                          📈 Valoración
                        </button>
                      )}
                      <button
                        type="button"
                        className="row-action-btn"
                        onClick={() => setFasesCliente(cliente)}
                      >
                        🎯 Fases y objetivos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </main>

      {showModal && (
        <div className="client-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="client-modal" onClick={event => event.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{isEditing ? 'Editar cliente' : 'Añadir cliente'}</div>
                <div className="card-subtitle">{isEditing ? 'Actualiza los datos del cliente' : 'Registra un nuevo cliente desde aquí'}</div>
              </div>
              <div className="lead-detail-actions" style={{ gap: 8 }}>
                {isEditing && (
                  <button type="button" className="danger-action" onClick={eliminarCliente}>🗑 Eliminar cliente</button>
                )}
                <button className="close-modal-btn" onClick={() => { setShowModal(false); setIsEditing(false); setEditingIndex(null) }}>✕</button>
              </div>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <input
                required
                placeholder="Nombre del cliente"
                value={formData.nombre}
                onChange={event => setFormData({ ...formData, nombre: event.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={event => setFormData({ ...formData, email: event.target.value })}
              />
              <label className="lead-detail-label">Programa contratado</label>
              <select
                value={formData.servicioId}
                onChange={event => {
                  const nuevoId = event.target.value
                  const servicioElegido = SERVICIOS.find(s => s.id === nuevoId)
                  setFormData({
                    ...formData,
                    servicioId: nuevoId,
                    importeTotal: servicioElegido ? servicioElegido.precio : formData.importeTotal,
                  })
                }}
              >
                {SERVICIOS.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre} — {s.precio}€</option>
                ))}
                <option value="otro">Otro (personalizado)</option>
              </select>
              {formData.servicioId === 'otro' && (
                <input
                  placeholder="Nombre del servicio"
                  value={formData.otroServicio}
                  onChange={event => setFormData({ ...formData, otroServicio: event.target.value })}
                />
              )}
              <label className="lead-detail-label">Importe total del servicio (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Importe total (€)"
                value={formData.importeTotal}
                onChange={event => setFormData({ ...formData, importeTotal: event.target.value })}
              />
              <label className="lead-detail-label">Tipo de pago</label>
              <select value={formData.pago} onChange={event => setFormData({ ...formData, pago: event.target.value })}>
                <option value="COMPLETO">COMPLETO (pago único)</option>
                <option value="2 PLAZOS">2 PLAZOS</option>
                <option value="3 PLAZOS">3 PLAZOS</option>
              </select>
              {formData.plazosDetalle.length > 0 ? (
                <p className="plan-subtitle-inline" style={{ fontSize: 12 }}>
                  Ya existe un plan de cobro para este cliente ({formData.plazosDetalle.filter(p => p.pagado).length}/{formData.plazosDetalle.length} cobrados).
                  Para corregir importes o fechas pendientes, ve a Clientes → Cobros pendientes.
                </p>
              ) : (
                formData.pago !== 'COMPLETO' && Number(formData.importeTotal) > 0 && (
                  <p className="plan-subtitle-inline" style={{ fontSize: 12 }}>
                    Al guardar se creará un plan de {formData.pago === '3 PLAZOS' ? 3 : 2} pagos de aprox. {Math.round((Number(formData.importeTotal) / (formData.pago === '3 PLAZOS' ? 3 : 2)) * 100) / 100}€ cada uno, visible en "Cobros pendientes".
                  </p>
                )
              )}
              <label className="lead-detail-label">Estado del cliente</label>
              <select
                value={formData.estado}
                onChange={event => {
                  const nuevoEstado = event.target.value
                  // Al pasar a NO ACTIVO se desasignan automáticamente los
                  // profesionales. En pausa NO: el cliente volverá y se queda
                  // con el mismo técnico (solo deja de aparecer en Seguimiento
                  // y Valoración mientras esté parado).
                  setFormData({
                    ...formData,
                    estado: nuevoEstado,
                    trabajadores: nuevoEstado === 'NO ACTIVO' ? [] : formData.trabajadores,
                  })
                }}
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="EN PAUSA">EN PAUSA (aún no empieza / parado temporalmente)</option>
                <option value="NO ACTIVO">NO ACTIVO</option>
              </select>
              {formData.estado === 'EN PAUSA' && (
                <div className="lead-venta-form">
                  <p className="plan-subtitle-inline">Datos de la pausa</p>
                  <label className="lead-detail-label">¿Cuándo hay que retomarlo? (fecha de aviso)</label>
                  <input
                    type="date"
                    value={/^\d{4}-\d{2}-\d{2}$/.test(formData.pausaHasta) ? formData.pausaHasta : ''}
                    onChange={event => setFormData({ ...formData, pausaHasta: event.target.value })}
                  />
                  <input
                    placeholder="Motivo de la pausa (opcional): aún no ha empezado, lesionado, de viaje..."
                    value={formData.pausaMotivo}
                    onChange={event => setFormData({ ...formData, pausaMotivo: event.target.value })}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Mientras esté en pausa no aparece en Seguimiento y Valoración (vuelve solo al ponerlo en ACTIVO).
                    Ese día saltará el aviso en el Dashboard y en el Calendario de avisos.
                  </p>
                </div>
              )}
              <select value={formData.formaPago} onChange={event => setFormData({ ...formData, formaPago: event.target.value })}>
                <option value="Stripe">Stripe</option>
                <option value="Bizum">Bizum</option>
                <option value="Transferencia">Transferencia</option>
                <option value="HOTMART">HOTMART</option>
              </select>
              <label className="lead-detail-label">Carpeta de Google Drive (opcional)</label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={formData.drive}
                onChange={event => setFormData({ ...formData, drive: event.target.value })}
              />
              <div>
                <label className="lead-detail-label">Profesionales asignados</label>
                <MultiTrabajadorSelect
                  options={tecnicoNames}
                  selected={formData.trabajadores}
                  onChange={(nuevos) => setFormData({ ...formData, trabajadores: nuevos })}
                />
              </div>
              <label className="lead-detail-label">Fecha inicio</label>
              <input
                type="date"
                value={/^\d{4}-\d{2}-\d{2}$/.test(formData.fechaInicio) ? formData.fechaInicio : ''}
                onChange={event => setFormData({ ...formData, fechaInicio: event.target.value })}
              />
              {formData.fechaInicio && !/^\d{4}-\d{2}-\d{2}$/.test(formData.fechaInicio) && (
                <p style={{ margin: '-6px 0 6px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Fecha guardada sin interpretar: "{formData.fechaInicio}". Selecciónala de nuevo en el calendario.
                </p>
              )}
              <label className="lead-detail-label">Fecha fin</label>
              <input
                type="date"
                value={/^\d{4}-\d{2}-\d{2}$/.test(formData.fechaFin) ? formData.fechaFin : ''}
                onChange={event => setFormData({ ...formData, fechaFin: event.target.value })}
              />
              {formData.fechaFin && !/^\d{4}-\d{2}-\d{2}$/.test(formData.fechaFin) && (
                <p style={{ margin: '-6px 0 6px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Fecha guardada sin interpretar: "{formData.fechaFin}". Selecciónala de nuevo en el calendario.
                </p>
              )}
              <label className="lead-detail-label">¿Renueva?</label>
              <select
                value={formData.renueva}
                onChange={event => setFormData({ ...formData, renueva: event.target.value })}
              >
                <option value="No">No</option>
                <option value="Sí">Sí</option>
              </select>
              {formData.renueva === 'Sí' && (
                <div className="lead-venta-form">
                  <p className="plan-subtitle-inline">Datos de la renovación</p>
                  <select
                    value={formData.renovacionId}
                    onChange={event => {
                      const nuevoId = event.target.value
                      const renovacionElegida = RENOVACIONES.find(r => r.id === nuevoId)
                      setFormData({
                        ...formData,
                        renovacionId: nuevoId,
                        importeRenovacion: renovacionElegida ? renovacionElegida.precio : formData.importeRenovacion,
                      })
                    }}
                  >
                    {RENOVACIONES.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre} — {r.precio}€</option>
                    ))}
                    <option value="otro">Otro (personalizado)</option>
                  </select>
                  {formData.renovacionId === 'otro' && (
                    <input
                      placeholder="Forma de renovación (personalizada)"
                      value={formData.otraRenovacion}
                      onChange={event => setFormData({ ...formData, otraRenovacion: event.target.value })}
                    />
                  )}
                  <input
                    type="number"
                    placeholder="Importe de la renovación (€)"
                    value={formData.importeRenovacion}
                    onChange={event => setFormData({ ...formData, importeRenovacion: event.target.value })}
                  />
                  <label className="lead-detail-label">Fecha de renovación (fecha del primer cobro)</label>
                  <input
                    type="date"
                    value={/^\d{4}-\d{2}-\d{2}$/.test(formData.fechaRenovacion) ? formData.fechaRenovacion : ''}
                    onChange={event => setFormData({ ...formData, fechaRenovacion: event.target.value })}
                  />
                  {formData.fechaRenovacion && !/^\d{4}-\d{2}-\d{2}$/.test(formData.fechaRenovacion) && (
                    <p style={{ margin: '-6px 0 6px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      Fecha guardada sin interpretar: "{formData.fechaRenovacion}". Selecciónala de nuevo en el calendario.
                    </p>
                  )}
                  <label className="lead-detail-label">Tipo de pago de la renovación</label>
                  <select value={formData.pagoRenovacion} onChange={event => setFormData({ ...formData, pagoRenovacion: event.target.value })}>
                    <option value="COMPLETO">COMPLETO (pago único)</option>
                    <option value="2 PLAZOS">2 PLAZOS</option>
                    <option value="3 PLAZOS">3 PLAZOS</option>
                  </select>
                  <p style={{ margin: '-2px 0 4px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {(clientes[editingIndex]?.Plazos || []).some(p => p.origen === 'renovacion' && p.renovacionFecha === formData.fechaRenovacion)
                      ? 'Esta renovación ya tiene su cobro creado en "Cobros pendientes". Para corregir importes o fechas, edítalo allí.'
                      : 'Al guardar se creará el cobro (o los plazos) de la renovación en "Cobros pendientes", con el primer pago en la fecha de renovación.'}
                  </p>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {seguimientoCliente && typeof setSeguimientos === 'function' && (
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

      {valoracionCliente && typeof setValoraciones === 'function' && (
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
