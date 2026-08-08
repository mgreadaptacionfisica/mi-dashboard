import { useMemo, useState } from 'react'
import SeguimientoCliente from './SeguimientoCliente'
import ValoracionCliente from './ValoracionCliente'
import FasesObjetivos from './FasesObjetivos'
import ContactoSemanal from './ContactoSemanal'
import {
  semanaActualISO,
  formatRangoSemana,
  resumenRevisionesSemana,
  DIAS_SEMANA,
  mondayOf,
  toISO,
  semanaVacia,
  diaVacio,
  progresoSemana,
  ultimaRevisionCliente,
} from '../utils/seguimientoHelpers'
import { parseFechaFlexible, formatFechaISO } from '../utils/fechasEsp'
import { upsertSeguimientoRemote } from '../lib/queries/seguimientos'
import { seguimientoTecnico } from '../utils/equipoHelpers'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Profesionales asignados a un cliente. Hay fichas antiguas con el campo
// "Trabajador" (uno solo) y las nuevas con "Trabajadores" (lista), así que
// siempre se lee por aquí para no repetir el fallback en cada sitio.
function trabajadoresDe(cliente) {
  return cliente.Trabajadores || (cliente.Trabajador ? [cliente.Trabajador] : [])
}

// Valor del filtro de admin para "clientes activos que no tienen a nadie
// asignado" — no es un nombre de persona, por eso va como constante aparte.
const SIN_ASIGNAR = '__sin_asignar__'

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
// solo se gestionan desde ClientesAdmin (altas/bajas). Los que están
// EN PAUSA (comprado pero aún sin empezar, o parados temporalmente) tampoco
// entran en la rejilla —no hay nada que registrar todavía—, pero sí se
// listan en un aviso arriba con la fecha en la que toca retomarlos: el
// técnico no tiene acceso a Clientes, así que este es su único sitio para
// enterarse. Vuelven a la rejilla solos cuando pasan a ACTIVO.
//
// La sección tiene DOS pestañas, las dos semanales y las dos operativas:
// "⚡ Registro de sesiones" (el día a día, rejilla cliente × día) y
// "🤝 Contacto semanal". Antes había además una tabla de clientes con
// servicio, fase, email, fecha de inicio... — se quitó a petición de Raúl:
// eran datos de CONSULTA que el técnico tenía delante todos los días sin
// usarlos, y ahora viven en la cabecera del modal de Seguimiento, que es
// donde se miran cuando hacen falta.
export default function ClientesEquipo({ clientes = [], team, miEmail, rol, seguimientos = [], setSeguimientos, valoraciones = [], setValoraciones, objetivosClienteFase = [], setObjetivosClienteFase, revisionesSemanales = [], setRevisionesSemanales, contactosSemanales = [], setContactosSemanales, onRefrescar, refrescando, onNavigate }) {
  const [search, setSearch] = useState('')
  // Se entra directamente al registro de sesiones: es lo que el técnico
  // hace todos los días. El contacto semanal es la otra pestaña.
  const [vista, setVista] = useState('registro')
  const [seguimientoCliente, setSeguimientoCliente] = useState(null)
  // Con qué semana se abre el modal de Seguimiento: 0 = actual, -1 = la
  // anterior (para terminar de cerrar una semana pasada que quedó abierta).
  const [seguimientoOffset, setSeguimientoOffset] = useState(0)
  const abrirSeguimiento = (cliente, offset = 0) => {
    setSeguimientoOffset(offset)
    setSeguimientoCliente(cliente)
  }
  const [valoracionCliente, setValoracionCliente] = useState(null)
  const [fasesCliente, setFasesCliente] = useState(null)
  const [revisionForm, setRevisionForm] = useState({ clienteNombre: '', dia: 'lunes', horaH: '10', horaM: '00', ampm: 'AM' })
  // El formulario de "Registrar última revisión" empieza plegado: son 5
  // campos que se usan una vez por cliente y semana, y tenerlos siempre
  // abiertos encima de la rejilla es ruido para lo que se hace a diario.
  const [revisionAbierta, setRevisionAbierta] = useState(false)
  // Celda del "Registro rápido" que está mostrando ahora mismo el formulario
  // para añadir una sesión nueva (clave "NombreCliente|diaId") y el borrador
  // de texto — para no montar un formulario por cada celda de toda la
  // rejilla, solo por la que estás usando.
  // La sesión se escribe A MANO (a petición de Raúl): se probó con el
  // desplegable de bloques fijos que había en el modal de Seguimiento, pero
  // se queda corto porque hay cosas que añadir que no están en la lista.
  const [addCell, setAddCell] = useState(null)
  const [addTexto, setAddTexto] = useState('')

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

  // Nombre de Raúl (admin) como responsable de clientes, buscando su email en
  // cualquier categoría del equipo (técnico, ventas, contenido) — porque como
  // admin también lleva clientes propios y quiere poder filtrar "solo los
  // míos" sin dejar de tener acceso a todo.
  const miNombreAdmin = useMemo(() => {
    if (!esAdmin) return null
    const todos = [...(team?.tecnico || []), ...(team?.ventas || []), ...(team?.contenido || [])]
    const p = todos.find((x) => x.email && miEmail && x.email.toLowerCase() === miEmail.toLowerCase())
    return p?.nombre || null
  }, [team, miEmail, esAdmin])

  // Filtro del admin (a petición de Raúl): "todos" (todo el equipo, como
  // siempre), el nombre de UN trabajador concreto para revisar de golpe solo
  // sus clientes, o SIN_ASIGNAR para cazar activos que no tienen a nadie
  // detrás. Para el técnico no aplica: él solo ve los suyos.
  const [filtroAdmin, setFiltroAdmin] = useState('todos')

  // Los trabajadores entre los que puede filtrar el admin, con cuántos
  // clientes ACTIVOS lleva cada uno (los que salen en la rejilla). Se cruzan
  // dos fuentes: las fichas de Equipo (para que aparezca también quien tiene
  // 0 clientes ahora mismo, que es un dato en sí) y los nombres que hay
  // realmente asignados en clientes (por si alguien ya no está en Equipo pero
  // sigue apareciendo en fichas antiguas).
  const trabajadoresFiltro = useMemo(() => {
    if (!esAdmin) return []
    const activos = clientes.filter((c) => (c['Estado del cliente'] || '').toUpperCase() === 'ACTIVO')
    const conteo = new Map()
    for (const p of team?.tecnico || []) {
      if (p.nombre) conteo.set(p.nombre, 0)
    }
    for (const c of activos) {
      for (const nombre of trabajadoresDe(c)) {
        conteo.set(nombre, (conteo.get(nombre) || 0) + 1)
      }
    }
    return [...conteo.entries()]
      .map(([nombre, activos]) => ({ nombre, activos }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [clientes, team, esAdmin])

  const sinAsignarCount = useMemo(() => {
    if (!esAdmin) return 0
    return clientes.filter((c) => (c['Estado del cliente'] || '').toUpperCase() === 'ACTIVO' && trabajadoresDe(c).length === 0).length
  }, [clientes, esAdmin])

  const misClientesTodos = useMemo(() => {
    if (!esAdmin) {
      return miNombre ? clientes.filter((c) => trabajadoresDe(c).includes(miNombre)) : []
    }
    if (filtroAdmin === 'todos') return clientes
    if (filtroAdmin === SIN_ASIGNAR) return clientes.filter((c) => trabajadoresDe(c).length === 0)
    return clientes.filter((c) => trabajadoresDe(c).includes(filtroAdmin))
  }, [clientes, miNombre, esAdmin, filtroAdmin])

  // Solo activos: seguimiento/valoración no aplica a quien ya no es cliente,
  // ni a quien está EN PAUSA (todavía no ha empezado o está parado). Los de
  // la pausa vuelven aquí solos en cuanto se les pone ACTIVO en Clientes.
  const misClientes = useMemo(
    () => misClientesTodos.filter((c) => (c['Estado del cliente'] || '').toUpperCase() === 'ACTIVO'),
    [misClientesTodos]
  )

  // Los que están en pausa no entran en la rejilla, pero sí se avisan arriba:
  // así el técnico sabe que existen y qué día toca retomarlos, sin tener que
  // entrar en Clientes (a la que ni siquiera tiene acceso).
  const misClientesEnPausa = useMemo(
    () => misClientesTodos
      .filter((c) => (c['Estado del cliente'] || '').toUpperCase() === 'EN PAUSA')
      .map((c) => ({ cliente: c, fecha: parseFechaFlexible(c['Fecha fin de pausa']) }))
      .sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999')),
    [misClientesTodos]
  )

  // Clientes compartidos con otro entrenador: a petición de Raúl, para
  // distinguir de un vistazo cuáles reviso yo sí o sí y cuáles comparto (y
  // con quién) para no pisarnos con el otro entrenador. "otros" son los
  // profesionales asignados distintos a mí; si soy admin y estoy filtrando
  // por un trabajador concreto, el "yo" pasa a ser ese trabajador (estoy
  // mirando su lista, así que lo interesante es con quién la comparte él).
  // Sin filtro y sin ficha propia se muestran todos los asignados.
  const perspectiva = miNombre || ((esAdmin && filtroAdmin !== 'todos' && filtroAdmin !== SIN_ASIGNAR) ? filtroAdmin : null)
  const compartidoCon = (cliente) => {
    const trabajadores = trabajadoresDe(cliente)
    if (trabajadores.length < 2) return []
    return perspectiva ? trabajadores.filter((w) => w !== perspectiva) : trabajadores
  }

  // "Semana pasada sin cerrar" (opción A/C a petición de Raúl): cuando pasa
  // el lunes, la semana nueva se vacía y los avisos de lo que quedó pendiente
  // desaparecían. Esto busca CUALQUIER semana pasada (de las últimas ~6) de
  // un cliente que aún tenga tareas sin revisar o cambios sin hacer y que no
  // se haya cerrado (check final), para seguir avisando hasta cerrarla. No
  // se limita solo a la semana inmediatamente anterior, porque lo pendiente
  // puede venir de un poco más atrás. Devuelve el lunes (ISO) de la semana
  // pendiente más antigua, o null si no hay nada pendiente.
  const limitePasadas = (() => {
    const d = new Date(`${semanaActualISO()}T00:00:00`)
    d.setDate(d.getDate() - 7 * 6)
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  })()
  const semanaPasadaPendiente = (cliente) => {
    const actual = semanaActualISO()
    const pasadas = seguimientos
      .filter((s) => s.clienteNombre === cliente.Nombre && s.semana < actual && s.semana >= limitePasadas)
      .sort((a, b) => a.semana.localeCompare(b.semana))
    for (const seg of pasadas) {
      // Se avisa por la semana pasada si tuvo actividad (tareas o cambios) y
      // NO está cerrada (check final). Cubre las dos cosas que quiere Raúl:
      // que queden tareas por hacer/revisar, y que la semana no se haya
      // cerrado aunque las tareas ya estén revisadas.
      const tuvoActividad = progresoSemana(seg).total > 0 || (seg.cambiosPendientes || []).length > 0
      if (!tuvoActividad) continue
      const cerrada = revisionesSemanales.some((r) => r.clienteNombre === cliente.Nombre && r.semana === seg.semana && r.revisado)
      if (!cerrada) return seg.semana
    }
    return null
  }
  // Offset (número de semanas hacia atrás, negativo) para abrir el modal en
  // esa semana concreta.
  const offsetSemana = (weekISO) => {
    const a = new Date(`${semanaActualISO()}T00:00:00`)
    const b = new Date(`${weekISO}T00:00:00`)
    return Math.round((b - a) / (7 * 86400000))
  }
  const clientesSemanaAnterior = misClientes
    .map((c) => ({ cliente: c, semana: semanaPasadaPendiente(c) }))
    .filter((x) => x.semana)

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

  // El contacto semanal (3 checks: inicio/mitad/fin) ya NO se marca con
  // puntitos dentro de la tabla de clientes: tiene su propia pestaña, que
  // reutiliza el componente ContactoSemanal que ya existía para Equipo.
  // Importante: el rol "tecnico" no tiene acceso a la sección Equipo (ver
  // SECCIONES_POR_ROL en lib/auth.js), así que esta pestaña es su ÚNICA
  // forma de marcar el contacto — no se puede quitar sin dejarlo sin ella.

  // Semana que se está viendo/editando en el "Registro rápido": 0 = la
  // actual. Como el día a día solo se registra aquí (en el modal es un
  // resumen de solo lectura), hace falta poder ir a una semana pasada para
  // corregirla o terminarla antes de cerrarla.
  const [registroOffset, setRegistroOffset] = useState(0)
  const semanaRegistro = useMemo(() => {
    const base = mondayOf(new Date())
    base.setDate(base.getDate() + registroOffset * 7)
    return toISO(base)
  }, [registroOffset])

  // "Registro rápido": editar las tareas de la semana de un cliente sin
  // abrir su modal de Seguimiento. Es exactamente el mismo dato (dias ->
  // tareas -> { texto, revisado }) que se ve dentro de SeguimientoCliente,
  // solo que en una rejilla cliente × día para repasar en bloque. mutarDias
  // recibe el objeto de días actual y devuelve el nuevo. Escribe siempre en
  // semanaRegistro (la semana que se está viendo), no en la actual.
  const actualizarSeguimientoSemana = (clienteNombre, mutarDias) => {
    if (typeof setSeguimientos !== 'function') return
    const semana = semanaRegistro
    const existente = seguimientos.find((s) => s.clienteNombre === clienteNombre && s.semana === semana)
    const base = existente
      ? { ...existente, dias: { ...(existente.dias || semanaVacia()) } }
      : { clienteNombre, semana, dias: semanaVacia(), comentarios: '', cambiosPendientes: [], revisiones: [] }
    const actualizado = { ...base, dias: mutarDias(base.dias) }
    setSeguimientos((prev) => {
      const existe = prev.some((s) => s.clienteNombre === clienteNombre && s.semana === semana)
      if (existe) return prev.map((s) => (s.clienteNombre === clienteNombre && s.semana === semana ? actualizado : s))
      return [...prev, actualizado]
    })
    upsertSeguimientoRemote(actualizado)
  }

  const toggleTareaRapida = (clienteNombre, diaId, index) => {
    actualizarSeguimientoSemana(clienteNombre, (dias) => {
      const dia = dias[diaId] || diaVacio()
      const tareas = dia.tareas.map((t, i) => (
        i === index ? { ...t, revisado: !t.revisado, revisadoEn: !t.revisado ? new Date().toISOString() : null } : t
      ))
      return { ...dias, [diaId]: { tareas } }
    })
  }

  const addTareaRapida = (clienteNombre, diaId, texto) => {
    const limpio = (texto || '').trim()
    if (!limpio) return
    actualizarSeguimientoSemana(clienteNombre, (dias) => {
      const dia = dias[diaId] || diaVacio()
      return { ...dias, [diaId]: { tareas: [...dia.tareas, { texto: limpio, revisado: false, revisadoEn: null }] } }
    })
  }

  // Borrar una sesión mal puesta sin abrir el modal (antes solo se podía
  // desde el modal de Seguimiento, que ahora es de solo lectura).
  const removeTareaRapida = (clienteNombre, diaId, index) => {
    actualizarSeguimientoSemana(clienteNombre, (dias) => {
      const dia = dias[diaId] || diaVacio()
      return { ...dias, [diaId]: { tareas: dia.tareas.filter((_, i) => i !== index) } }
    })
  }

  const cerrarAddCell = () => {
    setAddCell(null)
    setAddTexto('')
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
    const nuevaRevision = { persona: miPersona?.nombre || miEmail || 'Admin', dia: revisionForm.dia, hora: hora24, fecha: todayISO(), registradoEn: new Date().toISOString() }

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

  // "Mi última revisión" se filtra a la persona que ha iniciado sesión —
  // si un cliente se comparte con otro técnico, aquí solo se ve lo que
  // has registrado tú, no lo suyo (para no liarse entre compañeros).
  // Texto de "aquí no hay nada": con el filtro por trabajador puesto, decir
  // "no hay clientes asignados" a secas despista (los hay, pero no de esa
  // persona), así que se nombra a quién se está mirando.
  const mensajeSinClientes = (() => {
    if (!esAdmin || filtroAdmin === 'todos') return 'No hay clientes activos asignados.'
    if (filtroAdmin === SIN_ASIGNAR) return 'No hay clientes activos sin asignar. 👌'
    return `${filtroAdmin} no tiene clientes activos asignados ahora mismo.`
  })()

  const miIdentidadRevision = miPersona?.nombre || miEmail || 'Admin'
  const seguimientoResumen = useMemo(
    () => seguimientoTecnico(misClientes, seguimientos, { semanaActualISO, progresoSemana, ultimaRevisionCliente }, miIdentidadRevision),
    [misClientes, seguimientos, miIdentidadRevision]
  )

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Seguimiento y Valoración</div>
          <div className="topbar-subtitle">
            {!esAdmin && 'Tus clientes activos'}
            {esAdmin && filtroAdmin === 'todos' && 'Clientes activos de todo el equipo'}
            {esAdmin && filtroAdmin === SIN_ASIGNAR && 'Clientes activos sin trabajador asignado'}
            {esAdmin && filtroAdmin !== 'todos' && filtroAdmin !== SIN_ASIGNAR && `Clientes activos de ${filtroAdmin}`}
          </div>
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
            {/* Filtro por trabajador (solo admin): al supervisar, lo rápido es
                repasar entrenador por entrenador en vez de la lista entera del
                equipo. Afecta a TODA la sección (rejilla de sesiones, avisos,
                contacto semanal y contadores), no solo a la tabla. */}
            {esAdmin && (
              <div className="seguimiento-filtro-trabajador">
                <span className="seguimiento-filtro-label">Ver clientes de:</span>
                <div className="seguimiento-filtro-chips">
                  <button type="button" className={`period-btn ${filtroAdmin === 'todos' ? 'active' : ''}`} onClick={() => setFiltroAdmin('todos')}>
                    👥 Todo el equipo
                  </button>
                  {trabajadoresFiltro.map((t) => (
                    <button
                      key={t.nombre}
                      type="button"
                      className={`period-btn ${filtroAdmin === t.nombre ? 'active' : ''}`}
                      onClick={() => setFiltroAdmin(t.nombre)}
                      title={`Revisar solo los clientes activos de ${t.nombre}`}
                    >
                      {t.nombre === miNombreAdmin ? '🙋' : '🧑'} {t.nombre} <span className="seguimiento-filtro-conteo">{t.activos}</span>
                    </button>
                  ))}
                  {sinAsignarCount > 0 && (
                    <button
                      type="button"
                      className={`period-btn ${filtroAdmin === SIN_ASIGNAR ? 'active' : ''}`}
                      onClick={() => setFiltroAdmin(SIN_ASIGNAR)}
                      title="Clientes activos que no tienen ningún profesional asignado"
                    >
                      ⚠️ Sin asignar <span className="seguimiento-filtro-conteo">{sinAsignarCount}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="tabs-bar">
              <button type="button" className={`tab-btn ${vista === 'registro' ? 'tab-btn-active' : ''}`} onClick={() => setVista('registro')}>
                ⚡ Registro de sesiones
              </button>
              <button type="button" className={`tab-btn ${vista === 'contacto' ? 'tab-btn-active' : ''}`} onClick={() => setVista('contacto')}>
                🤝 Contacto semanal
              </button>
            </div>

            {misClientesEnPausa.length > 0 && (
              <div className="clientes-pausa-banner">
                <strong>⏸️ {misClientesEnPausa.length} cliente{misClientesEnPausa.length === 1 ? '' : 's'} en pausa</strong>
                <span> — no {misClientesEnPausa.length === 1 ? 'aparece' : 'aparecen'} en el registro hasta que {misClientesEnPausa.length === 1 ? 'pase' : 'pasen'} a ACTIVO: </span>
                {misClientesEnPausa.map(({ cliente, fecha }, i) => (
                  <span key={cliente.Nombre}>
                    <strong>{cliente.Nombre}</strong>
                    {fecha ? ` (retomar el ${formatFechaISO(fecha)})` : ' (sin fecha)'}
                    {cliente['Motivo de la pausa'] ? ` · ${cliente['Motivo de la pausa']}` : ''}
                    {i < misClientesEnPausa.length - 1 ? ', ' : '.'}
                  </span>
                ))}
              </div>
            )}

            {clientesSemanaAnterior.length > 0 && (
              <div className="seguimiento-semana-pasada-banner">
                <strong>⚠️ Quedan tareas pendientes de la semana anterior y por cerrar la semana en {clientesSemanaAnterior.length} cliente{clientesSemanaAnterior.length === 1 ? '' : 's'}.</strong>
                <span> Recomendamos hacerlo antes de empezar esta semana. Ábrelos y termínalos tal cual quedaron: </span>
                {clientesSemanaAnterior.map((x, i) => (
                  <span key={x.cliente.Nombre}>
                    <button type="button" className="seguimiento-semana-pasada-link" onClick={() => abrirSeguimiento(x.cliente, offsetSemana(x.semana))}>
                      {x.cliente.Nombre}
                    </button>{i < clientesSemanaAnterior.length - 1 ? ', ' : '.'}
                  </span>
                ))}
              </div>
            )}
          </>
        )}


        {(esAdmin || miPersona) && vista === 'registro' && (
          <>
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
                  <div className="card-title">Registro de sesiones</div>
                  <div className="card-subtitle">
                    Aquí se registra el día a día: añade, marca y quita sesiones. En el "📋 Seguimiento" de cada cliente esto se ve como resumen (no se edita).
                  </div>
                </div>
                <div className="registro-rapido-header-acciones">
                  <input
                    className="filter-input"
                    placeholder="Buscar cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ maxWidth: 220 }}
                  />
                  {misClientes.length > 0 && (
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => setRevisionAbierta((v) => !v)}
                      title="Dejar constancia de cuándo revisaste a un cliente (aparte de marcar sus sesiones)"
                    >
                      {revisionAbierta ? '✕ Cerrar' : '🕒 Registrar revisión'}
                    </button>
                  )}
                </div>
              </div>

              {misClientes.length > 0 && revisionAbierta && (
                <div className="registro-rapido-revision-panel">
                  <p className="card-subtitle" style={{ margin: '0 0 8px' }}>
                    Deja constancia de cuándo revisaste a cada cliente (día y hora), aparte de marcar sus sesiones.
                  </p>
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

                  {seguimientoResumen?.revisionesRecientes?.[0] && (() => {
                    const r = seguimientoResumen.revisionesRecientes[0]
                    return (
                      <p className="valoracion-referencia" style={{ margin: '10px 0 0' }}>
                        🕒 Tu último registro: revisaste a <strong>{r.clienteNombre}</strong> — {DIAS_SEMANA.find((d) => d.id === r.dia)?.label} a las {formatHora12(r.hora) || r.hora} ({r.fecha})
                      </p>
                    )
                  })()}
                </div>
              )}

              <div className="seguimiento-week-nav registro-rapido-week-nav">
                <button type="button" className="secondary-action" onClick={() => setRegistroOffset((w) => w - 1)}>← Semana anterior</button>
                <strong>
                  Semana del {formatRangoSemana(semanaRegistro)}{registroOffset === 0 ? ' (actual)' : ''}
                </strong>
                {registroOffset === 0 ? (
                  <button type="button" className="secondary-action" onClick={() => setRegistroOffset((w) => w + 1)}>Semana siguiente →</button>
                ) : (
                  <button type="button" className="secondary-action" onClick={() => setRegistroOffset(0)}>Volver a esta semana →</button>
                )}
              </div>

              {registroOffset !== 0 && (
                <div className="seguimiento-cerrar-antes-banner" style={{ margin: '0 20px 12px' }}>
                  📅 Estás editando la semana del <strong>{formatRangoSemana(semanaRegistro)}</strong>, no la actual. Todo lo que marques aquí se guarda en esa semana.
                </div>
              )}

              <div className="registro-rapido-leyenda">
                <span><span className="registro-rapido-chip registro-rapido-chip-hecho" style={{ pointerEvents: 'none' }}>✅ Hecho</span></span>
                <span><span className="registro-rapido-chip" style={{ pointerEvents: 'none' }}>⬜ Pendiente</span></span>
                <span style={{ color: 'var(--color-text-secondary)' }}>Clic en una sesión para marcarla / desmarcarla · ✕ para quitarla</span>
              </div>

              <div className="table-wrapper">
                <table className="registro-rapido-tabla">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      {DIAS_SEMANA.map((d) => <th key={d.id}>{d.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((cliente, index) => {
                      const registroSemana = seguimientos.find((s) => s.clienteNombre === cliente.Nombre && s.semana === semanaRegistro)
                      const dias = registroSemana?.dias || {}
                      const otros = compartidoCon(cliente)
                      const semPend = semanaPasadaPendiente(cliente)
                      // Contadores de los badges de los botones y del ⏳: van
                      // siempre por la semana que se está VIENDO (semanaRegistro),
                      // no por la actual, para que cuadren con lo que hay en la
                      // rejilla cuando se navega a una semana pasada.
                      const progresoTareas = progresoSemana(registroSemana)
                      const tareasPendientes = progresoTareas.total - progresoTareas.revisadas
                      const cambiosSinHacer = (registroSemana?.cambiosPendientes || []).filter((c) => !c.hecho).length
                      const semanaCerrada = revisionesSemanales.some((r) => r.clienteNombre === cliente.Nombre && r.semana === semanaRegistro && r.revisado)
                      // Solo para admin: de quién es el cliente. El técnico no lo
                      // necesita (todos los que ve son suyos), pero al supervisar
                      // "👥 Todos del equipo" es el dato que dice quién responde.
                      const responsables = trabajadoresDe(cliente)
                      return (
                        <tr key={`reg-${cliente.id || cliente.Nombre}-${index}`}>
                          <td className={`registro-rapido-cliente ${otros.length ? 'registro-rapido-compartido' : ''}`}>
                            <button
                              type="button"
                              className="registro-rapido-nombre"
                              onClick={() => abrirSeguimiento(cliente, registroOffset)}
                              title="Abrir seguimiento completo (resumen, cambios y cierre de semana)"
                            >
                              {cliente.Nombre || '—'}
                            </button>
                            {!semanaCerrada && (
                              <span className="semana-pendiente-badge" title="Semana sin revisar y cerrar todavía">⏳</span>
                            )}
                            {semPend && (
                              <button
                                type="button"
                                className="semana-pasada-badge"
                                // Aquí el badge NO abre el modal (que ya no deja tocar el
                                // día a día): lleva la propia rejilla a esa semana para
                                // poder terminarla, y luego se cierra desde el modal.
                                title="Una semana pasada quedó sin cerrar — pulsa para traer esa semana a la rejilla y terminarla"
                                onClick={() => { setRegistroOffset(offsetSemana(semPend)); cerrarAddCell() }}
                              >
                                ⚠️ Semana pasada
                              </button>
                            )}
                            {esAdmin && responsables.length > 0 && (
                              <div className="registro-rapido-responsable">{responsables.join(', ')}</div>
                            )}
                            {otros.length > 0 && (
                              <div className="registro-compartido-badge" title={`Cliente compartido — coordina con ${otros.join(', ')} quién lo revisa`}>
                                🤝 Compartido con {otros.join(', ')}
                              </div>
                            )}
                            {/* Las tres herramientas del cliente, aquí mismo: antes
                                estaban en la columna "Acciones" de la tabla que se
                                quitó, y son el único motivo real para salir de esta
                                rejilla. */}
                            <div className="registro-rapido-acciones">
                              <button type="button" className="row-action-btn" onClick={() => abrirSeguimiento(cliente, registroOffset)} title="Resumen de la semana, cambios y cierre">
                                📋
                                {tareasPendientes > 0 && (
                                  <span className="tareas-pendientes-badge" title={`${tareasPendientes} sesión${tareasPendientes === 1 ? '' : 'es'} sin marcar esta semana`}>
                                    {tareasPendientes}
                                  </span>
                                )}
                                {cambiosSinHacer > 0 && (
                                  <span className="cambios-pendientes-badge" title={`${cambiosSinHacer} cambio${cambiosSinHacer === 1 ? '' : 's'} sin marcar como hecho`}>
                                    {cambiosSinHacer}
                                  </span>
                                )}
                              </button>
                              <button type="button" className="row-action-btn" onClick={() => setValoracionCliente(cliente)} title="Valoración">📈</button>
                              <button type="button" className="row-action-btn" onClick={() => setFasesCliente(cliente)} title="Fases y objetivos">🎯</button>
                            </div>
                          </td>
                          {DIAS_SEMANA.map((d) => {
                            const tareas = dias[d.id]?.tareas || []
                            const cellKey = `${cliente.Nombre}|${d.id}`
                            // Los clientes hacen 3 sesiones al día como mucho, así
                            // que no dejamos añadir más de 3 por día (a petición
                            // de Raúl): al llegar a 3 desaparece el "＋ sesión".
                            const lleno = tareas.length >= 3
                            return (
                              <td key={d.id} className="registro-rapido-celda">
                                <div className="registro-rapido-celda-inner">
                                  {tareas.map((t, i) => (
                                    // Chip + ✕ como botones hermanos (no anidados: un
                                    // <button> dentro de otro no es HTML válido).
                                    <div key={i} className="registro-rapido-chip-row">
                                      <button
                                        type="button"
                                        className={`registro-rapido-chip ${t.revisado ? 'registro-rapido-chip-hecho' : ''}`}
                                        onClick={() => toggleTareaRapida(cliente.Nombre, d.id, i)}
                                        title={t.revisado ? 'Hecho — clic para desmarcar' : 'Clic para marcar hecho'}
                                      >
                                        {t.revisado ? '✅' : '⬜'} {t.texto}
                                      </button>
                                      <button
                                        type="button"
                                        className="registro-rapido-chip-del"
                                        onClick={() => removeTareaRapida(cliente.Nombre, d.id, i)}
                                        title="Quitar esta sesión"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                  {!lleno && addCell === cellKey && (
                                    <form
                                      className="registro-rapido-addform"
                                      onSubmit={(e) => {
                                        e.preventDefault()
                                        // Sin texto no se añade nada (evita sesiones vacías
                                        // si se pulsa ＋ o Enter por error).
                                        if (!addTexto.trim()) return
                                        addTareaRapida(cliente.Nombre, d.id, addTexto.trim())
                                        // El formulario se queda abierto para poder encadenar
                                        // las 2-3 sesiones del día sin volver a pulsar "＋ sesión".
                                        setAddTexto('')
                                      }}
                                    >
                                      <input
                                        autoFocus
                                        type="text"
                                        value={addTexto}
                                        placeholder="Escribe la sesión…"
                                        onChange={(e) => setAddTexto(e.target.value)}
                                      />
                                      <div className="registro-rapido-addform-btns">
                                        <button type="submit" className="registro-rapido-add-ok" title="Añadir sesión">＋</button>
                                        <button type="button" className="registro-rapido-add-cancel" onClick={cerrarAddCell} title="Cerrar">✕</button>
                                      </div>
                                    </form>
                                  )}
                                  {!lleno && addCell !== cellKey && (
                                    <button
                                      type="button"
                                      className="registro-rapido-add"
                                      onClick={() => { setAddCell(cellKey); setAddTexto('') }}
                                    >
                                      ＋ sesión
                                    </button>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                    {filtrados.length === 0 && (
                      <tr><td colSpan={DIAS_SEMANA.length + 1} className="lead-log-empty">
                        {misClientes.length === 0 ? mensajeSinClientes : 'Sin resultados con ese filtro.'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {(esAdmin || miPersona) && vista === 'contacto' && (
          <div className="table-card">
            <div className="card-header">
              <div>
                <div className="card-title">Contacto semanal</div>
                <div className="card-subtitle">
                  Tres contactos por cliente y semana. Marca cada uno cuando lo hayas hecho; puedes moverte a semanas anteriores para completarlas.
                </div>
              </div>
            </div>
            <div className="contacto-semanal-panel">
              {misClientes.length === 0 ? (
                <p className="lead-log-empty">{mensajeSinClientes}</p>
              ) : (
                <ContactoSemanal
                  clientes={misClientes}
                  contactos={contactosSemanales}
                  setContactos={setContactosSemanales}
                />
              )}
            </div>
          </div>
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
          weekOffsetInicial={seguimientoOffset}
          onClose={() => { setSeguimientoCliente(null); setSeguimientoOffset(0) }}
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
