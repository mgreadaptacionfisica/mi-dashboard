import { useMemo, useState } from 'react'
import {
  mondayOf,
  toISO,
  formatRangoSemana,
  contactoVacio,
  progresoContacto,
  PUNTOS_CONTACTO,
} from '../utils/seguimientoHelpers'
import { upsertContactoSemanalRemote } from '../lib/queries/contactosSemanales'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Tabla de contacto semanal (3 checks por cliente: inicio / mitad / fin de semana)
// para el equipo técnico. Se embebe en el detalle de cada técnico dentro de Equipo.jsx.
export default function ContactoSemanal({ clientes, contactos, setContactos }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [notaAbierta, setNotaAbierta] = useState(null) // { clienteNombre, puntoId } | null

  const mondayISO = useMemo(() => {
    const base = mondayOf(new Date())
    base.setDate(base.getDate() + weekOffset * 7)
    return toISO(base)
  }, [weekOffset])

  const registrosPorCliente = useMemo(() => {
    const map = {}
    clientes.forEach((cliente) => {
      map[cliente.Nombre] = contactos.find((c) => c.clienteNombre === cliente.Nombre && c.semana === mondayISO)
    })
    return map
  }, [clientes, contactos, mondayISO])

  const resumenSemana = useMemo(() => {
    let hechos = 0
    let total = 0
    clientes.forEach((cliente) => {
      const progreso = progresoContacto(registrosPorCliente[cliente.Nombre])
      hechos += progreso.hechos
      total += progreso.total
    })
    return { hechos, total, porcentaje: total > 0 ? Math.round((hechos / total) * 100) : 0 }
  }, [clientes, registrosPorCliente])

  const actualizarPunto = (clienteNombre, puntoId, patch) => {
    if (typeof setContactos !== 'function') return
    const existente = contactos.find((c) => c.clienteNombre === clienteNombre && c.semana === mondayISO)
    const base = existente ? { ...existente } : { clienteNombre, semana: mondayISO, ...contactoVacio() }
    const actualizado = { ...base, [puntoId]: { ...contactoVacio()[puntoId], ...base[puntoId], ...patch } }

    setContactos((prev) => {
      const existe = prev.some((c) => c.clienteNombre === clienteNombre && c.semana === mondayISO)
      if (existe) {
        return prev.map((c) => (c.clienteNombre === clienteNombre && c.semana === mondayISO) ? actualizado : c)
      }
      return [...prev, actualizado]
    })
    upsertContactoSemanalRemote(actualizado)
  }

  const togglePunto = (clienteNombre, puntoId, actual) => {
    actualizarPunto(clienteNombre, puntoId, { hecho: !actual, fecha: !actual ? todayISO() : null })
  }

  const setComentarioPunto = (clienteNombre, puntoId, comentario) => {
    actualizarPunto(clienteNombre, puntoId, { comentario })
  }

  const comentariosSemana = useMemo(() => {
    const lista = []
    clientes.forEach((cliente) => {
      const registro = registrosPorCliente[cliente.Nombre]
      PUNTOS_CONTACTO.forEach((p) => {
        const texto = registro?.[p.id]?.comentario?.trim()
        if (texto) lista.push({ cliente: cliente.Nombre, punto: p.label, texto })
      })
    })
    return lista
  }, [clientes, registrosPorCliente])

  if (clientes.length === 0) {
    return <p className="lead-log-empty">Todavía no tiene clientes asignados.</p>
  }

  return (
    <div className="contacto-semanal">
      <div className="contacto-leyenda">
        {PUNTOS_CONTACTO.map((p) => (
          <div key={p.id} className="contacto-leyenda-item">
            <strong>{p.label} · {p.dia}</strong>
            <span>{p.hint}</span>
          </div>
        ))}
      </div>

      <div className="seguimiento-week-nav">
        <button type="button" className="secondary-action" onClick={() => setWeekOffset((w) => w - 1)}>← Semana anterior</button>
        <strong>
          Semana del {formatRangoSemana(mondayISO)}{weekOffset === 0 ? ' (actual)' : ''}
          {resumenSemana.total > 0 && ` · ${resumenSemana.hechos}/${resumenSemana.total} contactos (${resumenSemana.porcentaje}%)`}
        </strong>
        <button type="button" className="secondary-action" onClick={() => setWeekOffset((w) => w + 1)}>Semana siguiente →</button>
      </div>

      <div className="contacto-semanal-table">
        <div className="contacto-semanal-row contacto-semanal-header">
          <span>Cliente</span>
          {PUNTOS_CONTACTO.map((p) => <span key={p.id} title={p.hint}>{p.label}</span>)}
        </div>
        {clientes.map((cliente) => {
          const registro = registrosPorCliente[cliente.Nombre]
          const notaAbiertaAqui = notaAbierta?.clienteNombre === cliente.Nombre ? notaAbierta.puntoId : null
          return (
            <div key={cliente.Nombre}>
              <div className="contacto-semanal-row">
                <span className="contacto-semanal-nombre">{cliente.Nombre}</span>
                {PUNTOS_CONTACTO.map((p) => {
                  const punto = registro?.[p.id]
                  const tieneComentario = Boolean(punto?.comentario?.trim())
                  return (
                    <div key={p.id} className="contacto-check-cell">
                      <label
                        className={`contacto-check ${punto?.hecho ? 'contacto-check-hecho' : ''}`}
                        title={punto?.hecho && punto.fecha ? `Contactado el ${punto.fecha}` : p.hint}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(punto?.hecho)}
                          onChange={() => togglePunto(cliente.Nombre, p.id, Boolean(punto?.hecho))}
                        />
                      </label>
                      <button
                        type="button"
                        className={`contacto-nota-btn ${tieneComentario ? 'contacto-nota-btn-activa' : ''}`}
                        title={tieneComentario ? 'Ver/editar comentario' : 'Añadir comentario'}
                        onClick={() => setNotaAbierta(
                          notaAbiertaAqui === p.id ? null : { clienteNombre: cliente.Nombre, puntoId: p.id }
                        )}
                      >
                        {tieneComentario ? '📝' : '💬'}
                      </button>
                    </div>
                  )
                })}
              </div>
              {notaAbiertaAqui && (() => {
                const punto = PUNTOS_CONTACTO.find((p) => p.id === notaAbiertaAqui)
                const valor = registro?.[notaAbiertaAqui]?.comentario || ''
                return (
                  <div className="contacto-nota-editor">
                    <label className="lead-detail-label">
                      Comentario — {cliente.Nombre} · {punto.label}
                    </label>
                    <textarea
                      rows={2}
                      autoFocus
                      placeholder="Si todo va bien no hace falta escribir nada. Si el cliente comenta algo que hay que cambiar o revisar, apúntalo aquí."
                      value={valor}
                      onChange={(e) => setComentarioPunto(cliente.Nombre, notaAbiertaAqui, e.target.value)}
                    />
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>

      {comentariosSemana.length > 0 && (
        <div className="contacto-comentarios-resumen">
          <h4 className="team-activity-subtitle">Comentarios de esta semana</h4>
          <ul className="lead-log-list">
            {comentariosSemana.map((item, i) => (
              <li key={i}><strong>{item.cliente}</strong> ({item.punto}): {item.texto}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
