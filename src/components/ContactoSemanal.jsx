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
          return (
            <div className="contacto-semanal-row" key={cliente.Nombre}>
              <span className="contacto-semanal-nombre">{cliente.Nombre}</span>
              {PUNTOS_CONTACTO.map((p) => {
                const punto = registro?.[p.id]
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
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
