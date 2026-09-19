import { useEffect, useMemo, useState } from 'react'
import {
  DIAS_SEMANA,
  mondayOf,
  toISO,
  semanaActualISO,
  formatRangoSemana,
  diaVacio,
  semanaVacia,
  progresoSemana,
  ultimaRevisionCliente,
  motivosNoCierre,
  resumenSemanaCliente,
} from '../utils/seguimientoHelpers'
import ResumenSemanaCliente from './ResumenSemanaCliente'
import HistorialCliente from './HistorialCliente'
import { parseFechaFlexible, formatFechaISO } from '../utils/fechasEsp'
import { upsertSeguimientoRemote } from '../lib/queries/seguimientos'
import { upsertRevisionSemanalRemote } from '../lib/queries/revisionesSemanales'
import { faseAutomatica, faseInfo, faseTopeSpadi, ultimoSpadiCliente } from '../utils/valoracionHelpers'

// Datos "fríos" del cliente (servicio, fecha de inicio, contacto): antes
// eran columnas de la tabla de clientes de Seguimiento y Valoración, que se
// quitó porque el técnico las tenía delante a diario sin usarlas. Se miran
// de vez en cuando, así que viven aquí, en la ficha que ya abre para
// trabajar con ese cliente.
function formatDate(value) {
  if (!value) return '—'
  const iso = parseFechaFlexible(value)
  return iso ? formatFechaISO(iso) : value
}

export default function SeguimientoCliente({ cliente, seguimientos, setSeguimientos, objetivosClienteFase = [], valoraciones = [], revisionesSemanales = [], setRevisionesSemanales, contactosSemanales = [], miEmail, weekOffsetInicial = 0, onClose }) {
  // weekOffsetInicial: 0 = semana actual (por defecto), -1 = abre en la
  // semana anterior (cuando se entra desde el aviso "semana pasada sin
  // cerrar" para terminarla tal cual quedó).
  const [weekOffset, setWeekOffset] = useState(weekOffsetInicial)
  const [cambioDraft, setCambioDraft] = useState('')
  // 'semana' = trabajar la semana; 'historial' = todo lo apuntado del cliente.
  const [vistaModal, setVistaModal] = useState('semana')

  // Desde el historial se salta a una semana concreta: offset en semanas
  // respecto a la actual (las dos claves salen de la misma función, así que
  // la diferencia es siempre un múltiplo de 7 días; el redondeo absorbe el
  // cambio de hora).
  const irASemana = (semanaISO) => {
    const dias = (new Date(`${semanaISO}T00:00:00`) - new Date(`${semanaActualISO()}T00:00:00`)) / 86400000
    setWeekOffset(Math.round(dias / 7))
    setVistaModal('semana')
  }

  const mondayISO = useMemo(() => {
    const base = mondayOf(new Date())
    base.setDate(base.getDate() + weekOffset * 7)
    return toISO(base)
  }, [weekOffset])

  const registro = useMemo(() => {
    return seguimientos.find((s) => s.clienteNombre === cliente.Nombre && s.semana === mondayISO)
  }, [seguimientos, cliente, mondayISO])

  const diasActuales = registro?.dias || semanaVacia()
  const cambiosPendientes = registro?.cambiosPendientes || []
  const progreso = progresoSemana(registro)
  const contacto = contactosSemanales.find((c) => c.clienteNombre === cliente.Nombre && c.semana === mondayISO)

  // Comentario semanal del trabajador (feedback para Raúl). Se edita en un
  // borrador local y se guarda al salir del cuadro, no en cada tecla (cada
  // guardado es un upsert de la semana entera). Al cambiar de semana se
  // recarga el de esa semana.
  const comentarioGuardado = registro?.comentarios || ''
  const [comentarioDraft, setComentarioDraft] = useState(comentarioGuardado)
  useEffect(() => { setComentarioDraft(comentarioGuardado) }, [mondayISO, comentarioGuardado])

  const actualizarSemana = (patch) => {
    const base = registro || { clienteNombre: cliente.Nombre, semana: mondayISO, dias: semanaVacia(), comentarios: '', cambiosPendientes: [], revisiones: [] }
    const actualizado = { ...base, ...patch }
    setSeguimientos((prev) => {
      const existe = prev.some((s) => s.clienteNombre === cliente.Nombre && s.semana === mondayISO)
      if (existe) {
        return prev.map((s) =>
          (s.clienteNombre === cliente.Nombre && s.semana === mondayISO) ? actualizado : s
        )
      }
      return [...prev, actualizado]
    })
    upsertSeguimientoRemote(actualizado)
  }

  // El día a día (dias -> tareas) ya NO se edita desde aquí: a petición de
  // Raúl, el único sitio donde se registra son las celdas del "Registro
  // rápido" (Seguimiento y Valoración → pestaña ⚡ Registro rápido), que
  // escriben este mismo dato. Aquí se muestra como resumen de lo hecho para
  // poder repasarlo antes de anotar los cambios y cerrar la semana, que es
  // lo único que sigue siendo editable en este modal.

  // Cambios/tareas de la semana con checkbox propio (independiente de las
  // tareas diarias de arriba) — a petición de Raúl, para poder tachar cada
  // cambio propuesto cuando ya se ha hecho, en vez de un solo texto libre.
  const addCambio = () => {
    const texto = cambioDraft.trim()
    if (!texto) return
    actualizarSemana({ cambiosPendientes: [...cambiosPendientes, { texto, hecho: false, hechoEn: null }] })
    setCambioDraft('')
  }

  const toggleCambio = (index) => {
    const actualizado = cambiosPendientes.map((c, i) =>
      i === index ? { ...c, hecho: !c.hecho, hechoEn: !c.hecho ? new Date().toISOString() : null } : c
    )
    actualizarSemana({ cambiosPendientes: actualizado })
  }

  const removeCambio = (index) => {
    actualizarSemana({ cambiosPendientes: cambiosPendientes.filter((_, i) => i !== index) })
  }

  const guardarComentario = () => {
    if (comentarioDraft === comentarioGuardado) return
    actualizarSemana({ comentarios: comentarioDraft })
  }

  // Lo que falta para poder cerrar la semana. Se calcula con el borrador del
  // comentario (no con el guardado) para que, al escribirlo, el bloqueo
  // desaparezca sin tener que salir antes del cuadro de texto.
  const semanaConBorrador = { ...(registro || {}), comentarios: comentarioDraft }
  const motivos = motivosNoCierre({ seguimiento: semanaConBorrador, contacto })
  const resumen = resumenSemanaCliente({ seguimiento: semanaConBorrador, contacto })

  const faseActual = useMemo(() => {
    const spadiTope = faseTopeSpadi(ultimoSpadiCliente(valoraciones, cliente.Nombre))
    return faseAutomatica(objetivosClienteFase.filter((o) => o.clienteNombre === cliente.Nombre), spadiTope)
  }, [objetivosClienteFase, valoraciones, cliente])
  const faseActualInfo = faseInfo(faseActual)

  // "Check final" del seguimiento semanal, POR CLIENTE (a petición de
  // Raúl): se marca a mano para la semana que se está viendo en este
  // modal (respeta la navegación de semanas de arriba) — NO se calcula
  // solo, es una confirmación explícita de que ya está todo hecho.
  const revisionSemana = revisionesSemanales.find((r) => r.clienteNombre === cliente.Nombre && r.semana === mondayISO)
  const semanaRevisada = revisionSemana?.revisado || false

  // Aviso "cierra esta semana antes de seguir" (opción C): si estás mirando
  // una semana PASADA que tuvo actividad y aún no está cerrada (check final),
  // se muestra un aviso empujando a cerrarla. No bloquea: puedes ir a la
  // semana siguiente con la flecha si de verdad lo necesitas.
  const esSemanaPasada = mondayISO < semanaActualISO()
  const tuvoActividad = progreso.total > 0 || cambiosPendientes.length > 0
  const avisarCerrarSemana = esSemanaPasada && tuvoActividad && !semanaRevisada

  const toggleRevisionSemana = () => {
    if (typeof setRevisionesSemanales !== 'function') return
    // Cerrar solo si no falta nada; reabrir, siempre.
    if (!semanaRevisada && motivos.length > 0) return
    guardarComentario()
    const actualizado = {
      clienteNombre: cliente.Nombre,
      semana: mondayISO,
      revisado: !semanaRevisada,
      revisadoEn: new Date().toISOString(),
      revisadoPor: miEmail || '',
    }
    setRevisionesSemanales((prev) => {
      const existe = prev.some((r) => r.clienteNombre === cliente.Nombre && r.semana === mondayISO)
      if (existe) return prev.map((r) => (r.clienteNombre === cliente.Nombre && r.semana === mondayISO ? { ...r, ...actualizado } : r))
      return [...prev, actualizado]
    })
    upsertRevisionSemanalRemote(actualizado)
  }

  return (
    <div className="client-modal-overlay" onClick={onClose}>
      <div className="client-modal seguimiento-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div>
            <div className="card-title">Seguimiento semanal — {cliente.Nombre}</div>
            <div className="card-subtitle">{(cliente.Trabajadores || []).join(', ') || 'Sin profesional asignado'}</div>
          </div>
          {cliente.Drive && (
            <a
              href={cliente.Drive}
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-action"
              style={{ marginRight: 8 }}
            >
              📁 Abrir Drive
            </a>
          )}
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="valoracion-fase-banner">
          📍 <strong>Fase actual: {faseActual}</strong> — {faseActualInfo?.criterio}
        </div>

        {/* Ficha rápida del cliente: lo que antes eran columnas de la tabla
            de clientes. Aquí no estorba y está donde se necesita. */}
        <dl className="seguimiento-ficha-datos">
          <div>
            <dt>Servicio</dt>
            <dd>{cliente['Servicio contratado'] || '—'}</dd>
          </div>
          <div>
            <dt>Inicio</dt>
            <dd>{formatDate(cliente['Fecha inicio'])}</dd>
          </div>
          <div>
            <dt>Contacto</dt>
            <dd>
              {cliente.Email || '—'}
              {cliente.Teléfono ? ` · ${cliente.Teléfono}` : ''}
            </dd>
          </div>
          <div>
            <dt>Última revisión</dt>
            <dd>{ultimaRevisionCliente(seguimientos, cliente.Nombre) || 'nunca'}</dd>
          </div>
        </dl>

        <div className="tabs-bar seguimiento-modal-tabs">
          <button type="button" className={`tab-btn ${vistaModal === 'semana' ? 'tab-btn-active' : ''}`} onClick={() => setVistaModal('semana')}>📅 Semana</button>
          <button type="button" className={`tab-btn ${vistaModal === 'historial' ? 'tab-btn-active' : ''}`} onClick={() => setVistaModal('historial')}>📜 Historial</button>
        </div>

        {vistaModal === 'historial' ? (
          <HistorialCliente
            clienteNombre={cliente.Nombre}
            seguimientos={seguimientos}
            contactos={contactosSemanales}
            revisionesSemanales={revisionesSemanales}
            onIrSemana={irASemana}
          />
        ) : (
        <>
        <div className="seguimiento-week-nav">
          <button type="button" className="secondary-action" onClick={() => setWeekOffset((w) => w - 1)}>← Semana anterior</button>
          <strong>
            Semana del {formatRangoSemana(mondayISO)}{weekOffset === 0 ? ' (actual)' : ''}
            {progreso.total > 0 && ` · ${progreso.revisadas}/${progreso.total} revisadas (${progreso.porcentaje}%)`}
          </strong>
          <button type="button" className="secondary-action" onClick={() => setWeekOffset((w) => w + 1)}>Semana siguiente →</button>
        </div>

        {avisarCerrarSemana && (
          <div className="seguimiento-cerrar-antes-banner">
            ⚠️ <strong>Esta semana quedó sin cerrar.</strong> Revísala, haz los cambios que falten y márcala como
            <strong> "Semana revisada y cerrada"</strong> (abajo) antes de seguir con la semana nueva.
          </div>
        )}

        <div className="seguimiento-resumen-dias-nota">
          📖 <strong>Resumen del día a día</strong> — esto es solo lectura: las sesiones se añaden, se marcan y se
          quitan desde <strong>⚡ Registro rápido</strong>. Aquí lo repasas antes de anotar los cambios y cerrar la semana.
        </div>

        <div className="seguimiento-dias-grid">
          {DIAS_SEMANA.map((dia) => {
            const info = diasActuales[dia.id] || diaVacio()
            return (
              <div key={dia.id} className="seguimiento-dia-card">
                <div className="seguimiento-dia-header">
                  <span>{dia.label}</span>
                  {info.tareas.length > 0 && (
                    <span className="seguimiento-dia-count">
                      {info.tareas.filter((t) => t.revisado).length}/{info.tareas.length}
                    </span>
                  )}
                </div>
                <div className="seguimiento-tareas-list">
                  {info.tareas.length === 0 && <span className="lead-log-empty">Sin sesiones registradas</span>}
                  {info.tareas.map((tarea, i) => (
                    <span key={i} className="seguimiento-tarea-con-nota">
                      <span
                        className={`seguimiento-tarea-chip seguimiento-tarea-solo-lectura ${tarea.revisado ? 'seguimiento-tarea-revisada' : ''}`}
                        title={tarea.revisado ? 'Hecha' : 'Pendiente de marcar en el Registro de sesiones'}
                      >
                        {tarea.revisado ? '✅' : '⬜'} {tarea.texto}
                      </span>
                      {tarea.nota && <span className="seguimiento-tarea-nota">💬 {tarea.nota}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div>
          <label className="lead-detail-label">🔧 Cambios de la semana</label>
          <div className="seguimiento-tareas-list" style={{ marginBottom: 8 }}>
            {cambiosPendientes.length === 0 && <span className="lead-log-empty">Sin cambios pendientes</span>}
            {cambiosPendientes.map((cambio, i) => (
              <label key={i} className={`seguimiento-tarea-chip ${cambio.hecho ? 'seguimiento-tarea-revisada' : ''}`}>
                <input type="checkbox" checked={cambio.hecho} onChange={() => toggleCambio(i)} />
                {cambio.texto}
                <button type="button" onClick={() => removeCambio(i)}>✕</button>
              </label>
            ))}
          </div>
          <div className="seguimiento-add-tarea" style={{ marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Añadir un cambio o tarea pendiente..."
              value={cambioDraft}
              onChange={(e) => setCambioDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCambio() } }}
            />
            <button type="button" className="secondary-action" onClick={addCambio}>＋</button>
          </div>
        </div>

        <div className="seguimiento-comentario-semanal">
          <label className="lead-detail-label" htmlFor="comentario-semanal">📝 Comentario semanal para Raúl</label>
          <textarea
            id="comentario-semanal"
            rows={3}
            placeholder="Cómo ha ido la semana, cómo lo ves, qué has cambiado y por qué, qué te preocupa, qué necesitas… Es tu feedback de la semana."
            value={comentarioDraft}
            onChange={(e) => setComentarioDraft(e.target.value)}
            onBlur={guardarComentario}
          />
        </div>

        <div className="seguimiento-resumen-semanal">
          <label className="lead-detail-label">📋 Resumen de la semana</label>
          <ResumenSemanaCliente resumen={resumen} mostrarComentario={false} />
        </div>

        {!semanaRevisada && motivos.length > 0 && (
          <div className="seguimiento-cierre-bloqueado">
            <strong>🔒 Todavía no se puede cerrar esta semana. Falta:</strong>
            <ul>
              {motivos.map((m, i) => <li key={i}>{m.texto}</li>)}
            </ul>
          </div>
        )}

        <div className={`seguimiento-check-final${semanaRevisada ? ' seguimiento-check-final-marcado' : ''}${!semanaRevisada && motivos.length > 0 ? ' seguimiento-check-final-bloqueado' : ''}`}>
          <label>
            <input
              type="checkbox"
              checked={semanaRevisada}
              disabled={!semanaRevisada && motivos.length > 0}
              onChange={toggleRevisionSemana}
            />
            <span>Semana revisada y cerrada para {cliente.Nombre}</span>
          </label>
          <p className="valoracion-referencia">
            ℹ️ Solo se puede cerrar con todas las sesiones marcadas, los cambios hechos, el contacto semanal completo (3/3) y el comentario semanal escrito. Márcalo cuando además tengas preparada la semana que viene.
          </p>
          {semanaRevisada && revisionSemana?.revisadoEn && (
            <p className="valoracion-referencia">
              ✅ Revisado el {new Date(revisionSemana.revisadoEn).toLocaleDateString('es-ES')}{revisionSemana.revisadoPor ? ` por ${revisionSemana.revisadoPor}` : ''}.
            </p>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  )
}
