import { useState } from 'react'
import {
  FASES,
  faseInfo,
  faseAutomatica,
  faseTopeSpadi,
  ultimoSpadiCliente,
  objetivosDeFase,
} from '../utils/valoracionHelpers'
import {
  insertObjetivoClienteFaseRemote,
  updateObjetivoClienteFaseRemote,
  deleteObjetivoClienteFaseRemote,
} from '../lib/queries/objetivosClienteFase'

// Sección separada de Valoración (a petición de Raúl): cada cliente tiene
// su propia lista de objetivos, agrupados por fase (1-4), en vez de un
// catálogo compartido o un único texto libre por valoración. Se ven las 4
// fases a la vez porque en la práctica se puede ir trabajando ya en
// objetivos de una fase posterior aunque la anterior no esté cerrada del
// todo — lo que hace que la fase "oficial" avance sola es que TODOS los
// objetivos de una fase estén marcados como cumplidos (ver faseAutomatica
// en valoracionHelpers.js).
export default function FasesObjetivos({ cliente, objetivosClienteFase = [], setObjetivosClienteFase, valoraciones = [], onClose }) {
  const [nuevoTexto, setNuevoTexto] = useState({})

  const objetivosDelCliente = objetivosClienteFase.filter((o) => o.clienteNombre === cliente.Nombre)
  const spadiActual = ultimoSpadiCliente(valoraciones, cliente.Nombre)
  const spadiTope = faseTopeSpadi(spadiActual)
  const faseConfirmada = faseAutomatica(objetivosDelCliente, spadiTope)
  const faseConfirmadaInfo = faseInfo(faseConfirmada)
  // Fase a la que ya darían derecho solo los objetivos, sin el techo de
  // SPADI — se usa para avisar cuando es el SPADI el que está reteniendo el
  // avance, aunque los objetivos ya estén todos cumplidos.
  const faseSoloObjetivos = faseAutomatica(objetivosDelCliente)
  const spadiFrenando = faseSoloObjetivos > faseConfirmada

  const addObjetivo = (faseNumero) => {
    const texto = (nuevoTexto[faseNumero] || '').trim()
    if (!texto || typeof setObjetivosClienteFase !== 'function') return
    const ordenActual = objetivosDeFase(objetivosDelCliente, faseNumero).length
    const nuevo = {
      id: `objc-${Date.now()}`,
      clienteNombre: cliente.Nombre,
      fase: faseNumero,
      texto,
      cumplido: false,
      cumplidoEn: null,
      orden: ordenActual + 1,
      creadoEn: new Date().toISOString(),
    }
    setObjetivosClienteFase((prev) => [...prev, nuevo])
    insertObjetivoClienteFaseRemote(nuevo)
    setNuevoTexto((prev) => ({ ...prev, [faseNumero]: '' }))
  }

  const toggleCumplido = (objetivo) => {
    if (typeof setObjetivosClienteFase !== 'function') return
    const cumplido = !objetivo.cumplido
    const cumplidoEn = cumplido ? new Date().toISOString().slice(0, 10) : null
    setObjetivosClienteFase((prev) => prev.map((o) => (o.id === objetivo.id ? { ...o, cumplido, cumplidoEn } : o)))
    updateObjetivoClienteFaseRemote(objetivo.id, { cumplido, cumplidoEn })
  }

  const eliminarObjetivo = (id) => {
    if (typeof setObjetivosClienteFase !== 'function') return
    setObjetivosClienteFase((prev) => prev.filter((o) => o.id !== id))
    deleteObjetivoClienteFaseRemote(id)
  }

  return (
    <div className="client-modal-overlay" onClick={onClose}>
      <div className="client-modal seguimiento-modal fases-objetivos-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div>
            <div className="card-title">Fases y objetivos — {cliente.Nombre}</div>
            <div className="card-subtitle">Objetivos propios de este cliente; la fase confirmada avanza sola al completarlos</div>
          </div>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="valoracion-fase-banner">
          📍 <strong>Fase confirmada: {faseConfirmada}</strong> — {faseConfirmadaInfo?.criterio}
          {spadiFrenando && (
            <div style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
              🔒 Los objetivos ya permitirían Fase {faseSoloObjetivos}, pero el último SPADI ({spadiActual}) todavía no baja lo suficiente para confirmar ese salto.
            </div>
          )}
        </div>

        <div className="fases-objetivos-grid">
          {FASES.map((f) => {
            const items = objetivosDeFase(objetivosDelCliente, f.numero)
            const completa = items.length > 0 && items.every((o) => o.cumplido)
            return (
              <div key={f.numero} className={`fases-objetivos-columna${completa ? ' fases-objetivos-columna-completa' : ''}`}>
                <div className="fases-objetivos-columna-header">
                  <strong>{f.titulo}</strong>
                  {completa && <span className="status-pill status-activo">Completa</span>}
                </div>
                <p className="valoracion-referencia">{f.criterio}</p>
                <ul className="fases-objetivos-lista">
                  {items.length === 0 && <li className="lead-log-empty">Sin objetivos todavía.</li>}
                  {items.map((o) => (
                    <li key={o.id} className={o.cumplido ? 'fases-objetivo-cumplido' : ''}>
                      <label>
                        <input type="checkbox" checked={o.cumplido} onChange={() => toggleCumplido(o)} />
                        <span>{o.texto}</span>
                      </label>
                      <button type="button" className="row-action-btn" onClick={() => eliminarObjetivo(o.id)}>✕</button>
                    </li>
                  ))}
                </ul>
                <div className="fases-objetivos-add">
                  <input
                    type="text"
                    placeholder={`Nuevo objetivo para ${f.titulo}...`}
                    value={nuevoTexto[f.numero] || ''}
                    onChange={(e) => setNuevoTexto((prev) => ({ ...prev, [f.numero]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addObjetivo(f.numero)
                      }
                    }}
                  />
                  <button type="button" className="row-action-btn" onClick={() => addObjetivo(f.numero)}>Añadir</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
